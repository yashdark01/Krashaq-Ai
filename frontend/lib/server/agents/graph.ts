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
import { classifyRoute } from '@/lib/server/agents/router';
import { loadSkillSnippet } from '@/lib/server/skills/loader';
import { seedKbDocumentsIfEmpty, retrieveKbContext } from '@/lib/server/services/rag-service';
import { detectCrop, detectLanguage } from '@/lib/server/services/irrigation';
import {
  KrashaqStateAnnotation,
  type AgentGraphConfig,
  type AgentRunCallbacks,
  type KrashaqState,
} from '@/lib/server/agents/state';

const DEFAULT_MAX_ITERATIONS = Number(process.env.AGENT_MAX_ITERATIONS ?? 5);

function getCallbacks(config?: RunnableConfig): AgentRunCallbacks {
  return (config?.configurable?.callbacks as AgentRunCallbacks | undefined) ?? {};
}

function buildSystemPrompt(language: string) {
  return `You are Krashaq, a multilingual AI farming assistant for Indian farmers.
Respond in ${language === 'hi' ? 'Hindi' : language === 'hinglish' ? 'Hinglish' : 'English'}.
Be practical, concise, and actionable. Use emojis sparingly.
Use tools when you need live weather, irrigation, fertilizer, web search, or knowledge base data.
Cite knowledge base and web sources when provided in tool results.
Never invent government schemes, prices, or helpline numbers. If unsure, say so.`;
}

function lastAiMessage(state: KrashaqState): AIMessage | null {
  for (let i = state.messages.length - 1; i >= 0; i--) {
    const m = state.messages[i];
    if (m._getType() === 'ai') return m as AIMessage;
  }
  return null;
}

function createToolNode(tools: ReturnType<typeof buildKrashaqTools>) {
  const toolMap = Object.fromEntries(tools.map((t) => [t.name, t]));

  return async (state: KrashaqState, config?: RunnableConfig) => {
    const callbacks = getCallbacks(config);
    const last = lastAiMessage(state);
    const toolMessages: BaseMessage[] = [];
    const toolsUsed: string[] = [];

    for (const call of last?.tool_calls ?? []) {
      const started = Date.now();
      callbacks.onToolStart?.(call.name, (call.args as Record<string, unknown>) ?? {});
      toolsUsed.push(call.name);

      const tool = toolMap[call.name];
      let output = 'Tool not found';

      if (call.name === 'search_knowledge_base') {
        const query = String((call.args as { query?: string })?.query ?? '');
        const retrieval = await retrieveKbContext(query, 5);
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
        output = retrieval.hasRelevant
          ? retrieval.context
          : 'No matching verified documents in knowledge base.';
      } else if (tool) {
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
      iteration: state.iteration + 1,
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
    const lastUser = [...state.messages].reverse().find((m) => m._getType() === 'human');
    const text =
      typeof lastUser?.content === 'string' ? lastUser.content : state.messages.at(-1)?.content;
    const message = typeof text === 'string' ? text : '';
    const route = classifyRoute(message);
    const detected_crop = detectCrop(message);

    return {
      route,
      detected_crop,
      iteration: 0,
      tools_used: [],
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
    const lastUser = [...state.messages].reverse().find((m) => m._getType() === 'human');
    const query = typeof lastUser?.content === 'string' ? lastUser.content : '';

    callbacks.onToolStart?.('search_knowledge_base', { query });
    const started = Date.now();
    const retrieval = await retrieveKbContext(query, 5);

    for (const cite of retrieval.citations) {
      callbacks.onCitation?.({
        index: retrieval.citations.indexOf(cite) + 1,
        title: cite.title,
        snippet: cite.snippet,
        doc_id: cite.doc_id,
        source: 'kb',
      });
    }

    const kbOutput = retrieval.hasRelevant
      ? `${retrieval.context}\n\nAnswer using only the sources above. Cite as [KB1], [KB2], etc. If information is insufficient, say you cannot verify and suggest consulting the local KVK.`
      : 'No verified knowledge base documents matched this query. Do not invent scheme details, amounts, or helpline numbers. Tell the farmer to verify with the official government portal or Krishi Vigyan Kendra.';

    callbacks.onToolEnd?.('search_knowledge_base', kbOutput.slice(0, 800), Date.now() - started);

    const ragMessages: BaseMessage[] = [
      ...state.messages.slice(0, -1),
      new SystemMessage(`Verified knowledge base context:\n${kbOutput}`),
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
    };
  };

  const agentNode = async (state: KrashaqState, config?: RunnableConfig) => {
    const callbacks = getCallbacks(config);
    const response = await llm.invoke(state.messages);

    const toolCalls = response.tool_calls ?? [];
    if (!toolCalls.length) {
      const content =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

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
    return 'agent';
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
    .addNode('agent', agentNode)
    .addNode('tools', toolNode)
    .addEdge(START, 'prepare')
    .addConditionalEdges('prepare', routeAfterPrepare, {
      fast: 'fast',
      rag: 'rag',
      agent: 'agent',
    })
    .addEdge('fast', END)
    .addEdge('rag', END)
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
}): Promise<{ content: string; tools_used: string[]; route: string; detected_crop: string | null }> {
  await seedKbDocumentsIfEmpty();
  const cfg = getConfig();

  if (!cfg.groqApiKey) {
    return {
      content:
        'Krashaq AI agent requires GROQ_API_KEY. Configure it in environment variables.',
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

  return {
    content,
    tools_used: result.tools_used ?? [],
    route: result.route ?? 'tools',
    detected_crop: result.detected_crop ?? null,
  };
}

export function useAgentRuntime() {
  return process.env.AGENT_RUNTIME === 'langgraph' || process.env.USE_LANGGRAPH_AGENT === 'true';
}
