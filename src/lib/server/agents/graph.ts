import type { BaseChatModel } from '@langchain/core/language_models/chat_models';
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  ToolMessage,
  type BaseMessage,
} from '@langchain/core/messages';
import { END, START, StateGraph } from '@langchain/langgraph';
import type { RunnableConfig } from '@langchain/core/runnables';
import type { ChatRequest } from '@/lib/server/services/chat';
import { buildKrashaqTools } from '@/lib/server/agents/tools';
import { classifyRoute, shouldRetrieveKb } from '@/lib/server/agents/router';
import {
  kbToolKey,
  retrievalPromptFromKb,
  runKbRetrieval,
} from '@/lib/server/agents/kb-retrieval';
import { loadSkillSnippet } from '@/lib/server/skills/loader';
import { seedKbDocumentsIfEmpty, clearRagRequestCache } from '@/lib/server/services/rag-service';
import { detectCrop, detectLanguage } from '@/lib/server/services/irrigation';
import { createLLM, resolveLLM, type LLMInstance } from '@/lib/server/llm/factory';
import {
  KrashaqStateAnnotation,
  type AgentRunCallbacks,
  type KrashaqState,
} from '@/lib/server/agents/state';
import { buildSystemPrompt } from '@/lib/server/agents/prompts';
const DEFAULT_MAX_ITERATIONS = Number(process.env.AGENT_MAX_ITERATIONS ?? 4);

function getCallbacks(config?: RunnableConfig): AgentRunCallbacks {
  return (config?.configurable?.callbacks as AgentRunCallbacks | undefined) ?? {};
}

function lastUserText(state: KrashaqState): string {
  const lastUser = [...state.messages].reverse().find((m) => m._getType() === 'human');
  return typeof lastUser?.content === 'string' ? lastUser.content : '';
}

function lastAiMessage(state: KrashaqState): AIMessage | null {
  for (let i = state.messages.length - 1; i >= 0; i--) {
    const m = state.messages[i];
    if (m._getType() === 'ai') return m as AIMessage;
  }
  return null;
}

function toolCallKey(name: string, args: unknown): string {
  return `${name}:${JSON.stringify(args ?? {})}`;
}

async function streamLlmReply(
  messages: BaseMessage[],
  llm: BaseChatModel,
  callbacks: AgentRunCallbacks,
  fallback: string
): Promise<string> {
  let content = '';
  const stream = await llm.stream(messages);
  for await (const chunk of stream) {
    const delta = typeof chunk.content === 'string' ? chunk.content : '';
    if (delta) {
      content += delta;
      callbacks.onToken?.(delta);
    }
  }

  return content || fallback;
}

function createToolNode(tools: ReturnType<typeof buildKrashaqTools>) {
  const toolMap = Object.fromEntries(tools.map((t) => [t.name, t]));

  return async (state: KrashaqState, config?: RunnableConfig) => {
    const callbacks = getCallbacks(config);
    const last = lastAiMessage(state);
    const toolMessages: BaseMessage[] = [];
    const toolsUsed: string[] = [];
    const executedKeys: string[] = [];
    const seenInBatch = new Set<string>();

    for (const call of last?.tool_calls ?? []) {
      const args = (call.args as Record<string, unknown>) ?? {};
      const key = toolCallKey(call.name, args);

      if (seenInBatch.has(key) || state.executed_tool_keys.includes(key)) {
        toolMessages.push(
          new ToolMessage({
            content: 'Already retrieved for this question — use the prior tool result.',
            tool_call_id: call.id ?? call.name,
          }) as BaseMessage
        );
        continue;
      }
      seenInBatch.add(key);
      executedKeys.push(key);

      const tool = toolMap[call.name];
      let output = 'Tool not found';

      if (call.name === 'search_knowledge_base') {
        const query = String(args.query ?? lastUserText(state));
        const kbKey = kbToolKey(query);

        if (
          state.rag_relevant &&
          state.rag_context &&
          state.rag_query &&
          kbToolKey(state.rag_query) === kbKey
        ) {
          output = state.rag_context;
        } else if (state.executed_tool_keys.includes(kbKey)) {
          output = state.rag_relevant
            ? state.rag_context
            : 'No matching verified documents in knowledge base.';
        } else {
          const retrieval = await runKbRetrieval(query, 5, callbacks, !state.kb_events_emitted);
          output = retrieval.rag_relevant
            ? retrieval.rag_context
            : 'No matching verified documents in knowledge base.';
        }

        toolsUsed.push(call.name);
        toolMessages.push(
          new ToolMessage({ content: output, tool_call_id: call.id ?? call.name }) as BaseMessage
        );
        continue;
      }

      const started = Date.now();
      callbacks.onToolStart?.(call.name, args);
      toolsUsed.push(call.name);

      if (tool) {
        try {
          output = String(
            await (tool as { invoke: (input: unknown) => Promise<unknown> }).invoke(call.args)
          );
        } catch (e) {
          output = e instanceof Error ? e.message : 'Tool failed';
        }
      }

      callbacks.onToolEnd?.(call.name, output.slice(0, 800), Date.now() - started);
      toolMessages.push(
        new ToolMessage({ content: output, tool_call_id: call.id ?? call.name }) as BaseMessage
      );
    }

    return {
      messages: toolMessages,
      tools_used: toolsUsed,
      executed_tool_keys: executedKeys,
      iteration: state.iteration + 1,
    };
  };
}

function compileGraph(params: {
  tools: ReturnType<typeof buildKrashaqTools>;
  llm: LLMInstance;
  maxIterations: number;
}) {
  const baseLlm = params.llm.llm;
  if (!('bindTools' in baseLlm) || typeof baseLlm.bindTools !== 'function') {
    throw new Error(`Provider ${params.llm.provider} does not support tool calling`);
  }
  const llm = baseLlm.bindTools(params.tools);

  const toolNode = createToolNode(params.tools);

  const prepareNode = async (state: KrashaqState) => {
    await seedKbDocumentsIfEmpty();
    const message = lastUserText(state) || state.messages.at(-1)?.content?.toString() || '';
    const route = classifyRoute(message);

    return {
      route,
      detected_crop: detectCrop(message),
      iteration: 0,
      tools_used: [],
      kb_ready: false,
      kb_events_emitted: false,
      executed_tool_keys: [],
      rag_query: '',
      rag_chunks: [],
      rag_citations: [],
      rag_score: 0,
      rag_relevant: false,
      rag_context: '',
    };
  };

  const retrieveNode = async (state: KrashaqState, config?: RunnableConfig) => {
    const callbacks = getCallbacks(config);
    const query = lastUserText(state);
    const emitEvents = state.route === 'rag' || !state.kb_events_emitted;
    const retrieval = await runKbRetrieval(query, 5, callbacks, emitEvents);

    return {
      ...retrieval,
      executed_tool_keys: retrieval.rag_relevant ? [kbToolKey(query)] : [],
    };
  };

  const gradeNode = async (state: KrashaqState) => ({
    rag_relevant: state.rag_relevant,
    rag_score: state.rag_score,
  });

  const injectKbNode = async (state: KrashaqState) => {
    if (state.route !== 'tools' || !state.rag_relevant || !state.rag_context) {
      return {};
    }

    const query = state.rag_query || lastUserText(state);
    return {
      messages: [
        new SystemMessage(
          `Verified knowledge base (already retrieved — do NOT call search_knowledge_base again):\n${state.rag_context}\n\nCite as [KB1], [KB2], etc.`
        ),
      ],
      executed_tool_keys: [kbToolKey(query)],
      kb_ready: true,
    };
  };

  const fastNode = async (state: KrashaqState, config?: RunnableConfig) => {
    const callbacks = getCallbacks(config);
    const content = await streamLlmReply(
      state.messages,
      createLLM(params.llm.provider, params.llm.model).llm,
      callbacks,
      'Hello! How can I help with your farm today?'
    );

    return { messages: [new AIMessage(content)] };
  };

  const synthesizeNode = async (state: KrashaqState, config?: RunnableConfig) => {
    const callbacks = getCallbacks(config);
    const ragMessages: BaseMessage[] = [
      ...state.messages.slice(0, -1),
      new SystemMessage(retrievalPromptFromKb(state.rag_context)),
      state.messages[state.messages.length - 1],
    ];

    const content = await streamLlmReply(
      ragMessages,
      createLLM(params.llm.provider, params.llm.model).llm,
      callbacks,
      'I could not generate a response from the knowledge base. Please try again.'
    );

    return {
      messages: [new AIMessage(content)],
      tools_used: ['search_knowledge_base'],
      kb_events_emitted: true,
    };
  };

  const noKbNode = async (state: KrashaqState, config?: RunnableConfig) => {
    const callbacks = getCallbacks(config);
    const ragMessages: BaseMessage[] = [
      ...state.messages.slice(0, -1),
      new SystemMessage(retrievalPromptFromKb('')),
      state.messages[state.messages.length - 1],
    ];

    const content = await streamLlmReply(
      ragMessages,
      createLLM(params.llm.provider, params.llm.model).llm,
      callbacks,
      'I do not have verified information on this in our knowledge base. Please check the official government portal or your local Krishi Vigyan Kendra.'
    );

    return { messages: [new AIMessage(content)] };
  };

  const agentNode = async (state: KrashaqState, config?: RunnableConfig) => {
    const callbacks = getCallbacks(config);
    const response = await llm.invoke(state.messages);

    const toolCalls = response.tool_calls ?? [];
    if (!toolCalls.length) {
      const content =
        typeof response.content === 'string' ? response.content : JSON.stringify(response.content);

      if (content) {
        const chunkSize = 20;
        for (let i = 0; i < content.length; i += chunkSize) {
          callbacks.onToken?.(content.slice(i, i + chunkSize));
        }
      }
    }

    return { messages: [response] };
  };

  const routeAfterPrepare = (state: KrashaqState) => {
    if (state.route === 'fast') return 'fast';
    if (state.route === 'rag') return 'retrieve';
    if (shouldRetrieveKb(lastUserText(state))) return 'retrieve';
    return 'agent';
  };

  const routeAfterRetrieve = (state: KrashaqState) => {
    if (state.route === 'tools') return 'injectKb';
    return 'grade';
  };

  const routeAfterGrade = (state: KrashaqState) => {
    return state.rag_relevant ? 'synthesize' : 'noKb';
  };

  const shouldContinue = (state: KrashaqState) => {
    if (state.iteration >= params.maxIterations) return END;
    const last = lastAiMessage(state);
    const toolCalls = last?.tool_calls ?? [];
    if (toolCalls.length > 0) return 'tools';
    return END;
  };

  return new StateGraph(KrashaqStateAnnotation)
    .addNode('prepare', prepareNode)
    .addNode('fast', fastNode)
    .addNode('retrieve', retrieveNode)
    .addNode('grade', gradeNode)
    .addNode('synthesize', synthesizeNode)
    .addNode('noKb', noKbNode)
    .addNode('injectKb', injectKbNode)
    .addNode('agent', agentNode)
    .addNode('tools', toolNode)
    .addEdge(START, 'prepare')
    .addConditionalEdges('prepare', routeAfterPrepare, {
      fast: 'fast',
      retrieve: 'retrieve',
      agent: 'agent',
    })
    .addConditionalEdges('retrieve', routeAfterRetrieve, {
      injectKb: 'injectKb',
      grade: 'grade',
    })
    .addConditionalEdges('grade', routeAfterGrade, {
      synthesize: 'synthesize',
      noKb: 'noKb',
    })
    .addEdge('fast', END)
    .addEdge('synthesize', END)
    .addEdge('noKb', END)
    .addEdge('injectKb', 'agent')
    .addConditionalEdges('agent', shouldContinue, {
      tools: 'tools',
      [END]: END,
    })
    .addEdge('tools', 'agent')
    .compile();
}

export async function runKrashaqAgent(params: {
  request: ChatRequest;
  systemBase?: string;
  history: Array<{ role: string; content: string }>;
  callbacks?: AgentRunCallbacks;
}): Promise<{
  content: string;
  tools_used: string[];
  route: string;
  detected_crop: string | null;
}> {
  if (useDeepAgentsRuntime()) {
    const { runDeepKrashaqAgent } = await import('@/lib/server/agents/deep-agent');
    return runDeepKrashaqAgent(params);
  }

  clearRagRequestCache();

  await seedKbDocumentsIfEmpty();

  const llmInstance = resolveLLM({
    provider: params.request.provider,
    model: params.request.model,
  });

  if (!llmInstance) {
    return {
      content:
        'Krashaq AI is not configured. Add GOOGLE_API_KEY, GROQ_API_KEY, or another provider key in environment variables.',
      tools_used: [],
      route: 'tools',
      detected_crop: null,
    };
  }

  const location = params.request.location ?? 'Delhi';
  const language = params.request.language ?? detectLanguage(params.request.message);
  const skill = loadSkillSnippet(params.request.message);

  const tools = buildKrashaqTools({
    location,
    language,
    message: params.request.message,
    user_id: params.request.user_id,
    user_role: params.request.user_role,
  });

  const graph = compileGraph({
    tools,
    llm: llmInstance,
    maxIterations: DEFAULT_MAX_ITERATIONS,
  });

  const system = `${params.systemBase ?? buildSystemPrompt(language)}\n\n${skill}`.trim();
  const messages: BaseMessage[] = [
    new SystemMessage(system),
    ...params.history.map((m) =>
      m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
    ),
    new HumanMessage(params.request.message),
  ];

  const result = await graph.invoke(
    {
      messages,
      location,
      language,
      user_id: params.request.user_id,
      user_role: params.request.user_role ?? 'farmer',
      detected_crop: detectCrop(params.request.message),
    },
    {
      configurable: {
        callbacks: params.callbacks,
      },
    }
  );

  const finalMessages = result.messages as BaseMessage[];
  const lastAi = [...finalMessages].reverse().find((m) => m._getType() === 'ai');
  const content =
    typeof lastAi?.content === 'string'
      ? lastAi.content
      : lastAi?.content
        ? JSON.stringify(lastAi.content)
        : 'I could not generate a response. Please try again.';

  const toolsUsed = [...new Set(result.tools_used ?? [])];

  return {
    content,
    tools_used: toolsUsed,
    route: result.route ?? 'tools',
    detected_crop: result.detected_crop ?? null,
  };
}

export function useAgentRuntime() {
  return process.env.AGENT_RUNTIME === 'langgraph' || process.env.USE_LANGGRAPH_AGENT === 'true';
}

export function useDeepAgentsRuntime() {
  return process.env.USE_DEEPAGENTS === 'true' || process.env.AGENT_RUNTIME === 'deepagents';
}
