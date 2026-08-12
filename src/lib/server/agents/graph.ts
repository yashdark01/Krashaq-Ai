import { ChatGroq } from '@langchain/groq';
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
import { getConfig } from '@/lib/server/config';
import { buildKrashaqTools } from '@/lib/server/agents/tools';
import { classifyRoute, shouldRetrieveKb } from '@/lib/server/agents/router';
import { loadSkillSnippet } from '@/lib/server/skills/loader';
import { seedKbDocumentsIfEmpty, retrieveKbContext } from '@/lib/server/services/rag-service';
import { detectCrop, detectLanguage } from '@/lib/server/services/irrigation';
import {
  KrashaqStateAnnotation,
  type AgentRunCallbacks,
  type KrashaqState,
} from '@/lib/server/agents/state';

const DEFAULT_MAX_ITERATIONS = Number(process.env.AGENT_MAX_ITERATIONS ?? 4);

function getCallbacks(config?: RunnableConfig): AgentRunCallbacks {
  return (config?.configurable?.callbacks as AgentRunCallbacks | undefined) ?? {};
}

function buildSystemPrompt(language: string) {
  return `You are Krashaq, a multilingual AI farming assistant for Indian farmers.
Respond in ${language === 'hi' ? 'Hindi' : language === 'hinglish' ? 'Hinglish' : 'English'}.
Be practical, concise, and actionable. Use emojis sparingly.
Use tools when you need live weather, irrigation, fertilizer, or web search.
If verified knowledge base context is already in the conversation, use it — do NOT call search_knowledge_base again for the same topic.
Cite knowledge base sources as [KB1], [KB2] when provided.
Never invent government schemes, prices, or helpline numbers. If unsure, say so.`;
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

async function emitKbRetrieval(
  query: string,
  callbacks: AgentRunCallbacks,
  state: KrashaqState
): Promise<{ output: string; citationsEmitted: boolean }> {
  const started = Date.now();
  const retrieval = await retrieveKbContext(query, 5);

  if (!state.kb_events_emitted) {
    callbacks.onToolStart?.('search_knowledge_base', { query });
    for (let i = 0; i < retrieval.citations.length; i++) {
      const cite = retrieval.citations[i];
      callbacks.onCitation?.({
        index: i + 1,
        title: cite.title,
        snippet: cite.snippet,
        doc_id: cite.doc_id,
        source: 'kb',
      });
    }
    const output = retrieval.hasRelevant
      ? retrieval.context
      : 'No matching verified documents in knowledge base.';
    callbacks.onToolEnd?.('search_knowledge_base', output.slice(0, 800), Date.now() - started);
    return { output, citationsEmitted: true };
  }

  return {
    output: retrieval.hasRelevant
      ? retrieval.context
      : 'No matching verified documents in knowledge base.',
    citationsEmitted: false,
  };
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
      let kbEventsEmitted = state.kb_events_emitted;

      if (call.name === 'search_knowledge_base') {
        const query = String(args.query ?? lastUserText(state));
        const result = await emitKbRetrieval(query, callbacks, state);
        output = result.output;
        if (result.citationsEmitted) kbEventsEmitted = true;
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
      kb_events_emitted: state.kb_events_emitted || toolsUsed.includes('search_knowledge_base'),
    };
  };
}

function compileGraph(params: {
  tools: ReturnType<typeof buildKrashaqTools>;
  model: string;
  apiKey: string;
  maxIterations: number;
}) {
  const llm = new ChatGroq({
    apiKey: params.apiKey,
    model: params.model,
    temperature: 0.3,
  }).bindTools(params.tools);

  const toolNode = createToolNode(params.tools);

  const prepareNode = async (state: KrashaqState) => {
    await seedKbDocumentsIfEmpty();
    const message = lastUserText(state) || state.messages.at(-1)?.content?.toString() || '';
    const route = classifyRoute(message);
    const detected_crop = detectCrop(message);
    let kb_ready = false;

    if (shouldRetrieveKb(message)) {
      await retrieveKbContext(message, 5);
      kb_ready = true;
    }

    return {
      route,
      detected_crop,
      iteration: 0,
      tools_used: [],
      kb_ready,
      kb_events_emitted: false,
      executed_tool_keys: [],
    };
  };

  const injectKbNode = async (state: KrashaqState) => {
    if (!state.kb_ready || state.route !== 'tools') return {};

    const query = lastUserText(state);
    const retrieval = await retrieveKbContext(query, 5);
    if (!retrieval.hasRelevant) return {};

    return {
      messages: [
        new SystemMessage(
          `Verified knowledge base (already retrieved — do NOT call search_knowledge_base again):\n${retrieval.context}\n\nCite as [KB1], [KB2], etc.`
        ),
      ],
      executed_tool_keys: [toolCallKey('search_knowledge_base', { query })],
    };
  };

  const fastNode = async (state: KrashaqState, config?: RunnableConfig) => {
    const callbacks = getCallbacks(config);
    const llmPlain = new ChatGroq({
      apiKey: params.apiKey,
      model: params.model,
      temperature: 0.4,
    });

    let content = '';
    const stream = await llmPlain.stream(state.messages);
    for await (const chunk of stream) {
      const delta = typeof chunk.content === 'string' ? chunk.content : '';
      if (delta) {
        content += delta;
        callbacks.onToken?.(delta);
      }
    }

    return { messages: [new AIMessage(content || 'Hello! How can I help with your farm today?')] };
  };

  const ragNode = async (state: KrashaqState, config?: RunnableConfig) => {
    const callbacks = getCallbacks(config);
    const query = lastUserText(state);

    const { output: kbOutput } = await emitKbRetrieval(query, callbacks, state);

    const ragMessages: BaseMessage[] = [
      ...state.messages.slice(0, -1),
      new SystemMessage(retrievalPromptFromKb(kbOutput)),
      state.messages[state.messages.length - 1],
    ];

    let content = '';
    const llmPlain = new ChatGroq({
      apiKey: params.apiKey,
      model: params.model,
      temperature: 0.3,
    });
    const stream = await llmPlain.stream(ragMessages);
    for await (const chunk of stream) {
      const delta = typeof chunk.content === 'string' ? chunk.content : '';
      if (delta) {
        content += delta;
        callbacks.onToken?.(delta);
      }
    }

    return {
      messages: [new AIMessage(content)],
      tools_used: ['search_knowledge_base'],
      kb_events_emitted: true,
    };
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

    return {
      messages: [response],
    };
  };

  const routeAfterPrepare = (state: KrashaqState) => {
    if (state.route === 'fast') return 'fast';
    if (state.route === 'rag') return 'rag';
    return 'injectKb';
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
    .addNode('rag', ragNode)
    .addNode('injectKb', injectKbNode)
    .addNode('agent', agentNode)
    .addNode('tools', toolNode)
    .addEdge(START, 'prepare')
    .addConditionalEdges('prepare', routeAfterPrepare, {
      fast: 'fast',
      rag: 'rag',
      injectKb: 'injectKb',
    })
    .addEdge('fast', END)
    .addEdge('rag', END)
    .addEdge('injectKb', 'agent')
    .addConditionalEdges('agent', shouldContinue, {
      tools: 'tools',
      [END]: END,
    })
    .addEdge('tools', 'agent')
    .compile();
}

function retrievalPromptFromKb(kbOutput: string) {
  if (kbOutput && !kbOutput.startsWith('No matching') && !kbOutput.startsWith('No verified')) {
    return `Verified knowledge base context:\n${kbOutput}\n\nAnswer using only the sources above. Cite as [KB1], [KB2], etc. If information is insufficient, say you cannot verify and suggest consulting the local KVK.`;
  }
  return `No verified knowledge base documents matched this query. Do not invent scheme details, amounts, or helpline numbers. Tell the farmer to verify with the official government portal or Krishi Vigyan Kendra.`;
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
  const { clearRagRequestCache } = await import('@/lib/server/services/rag-service');
  clearRagRequestCache();

  await seedKbDocumentsIfEmpty();
  const cfg = getConfig();

  if (!cfg.groqApiKey) {
    return {
      content: 'Krashaq AI agent requires GROQ_API_KEY. Configure it in environment variables.',
      tools_used: [],
      route: 'tools',
      detected_crop: null,
    };
  }

  const model = params.request.model ?? cfg.groqModel;
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
    model,
    apiKey: cfg.groqApiKey,
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
