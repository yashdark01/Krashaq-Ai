import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { resolveLLM, getProviderChain, createLLM } from '@/lib/server/llm/factory';
import {
  appendConversation,
  getOrCreateSessionForUser,
  loadConversationHistory,
} from '@/lib/server/services/chat-memory';
import { detectCrop, detectLanguage, getIrrigationAdvice } from '@/lib/server/services/irrigation';
import {
  formatWeatherForFarmer,
  getWeather,
  type WeatherData,
} from '@/lib/server/services/weather';
import {
  formatWebSearchForPrompt,
  isTavilyConfigured,
  searchWeb,
  webSearchCitations,
} from '@/lib/server/services/tavily-search';
import { shouldUseWebSearch } from '@/lib/server/services/web-search-query';
import { getConfig } from '@/lib/server/config';
import { runKrashaqAgent, useAgentRuntime } from '@/lib/server/agents/graph';
import { AgentEventQueue } from '@/lib/server/agents/event-queue';
import type { StreamEvent } from '@/modules/conversation/types/message';

export interface ChatRequest {
  message: string;
  user_id: string;
  user_role?: string;
  location?: string;
  session_id?: string;
  language?: string;
  provider?: string;
  model?: string;
}

export interface ChatResponse {
  reply: string;
  session_id: string;
  language: string;
  tools_used: string[];
  detected_crop: string | null;
  llm_provider: string;
  llm_model: string;
  weather?: WeatherData;
}

function ensureLangSmithEnv() {
  const cfg = getConfig();
  if (cfg.langsmithTracing && cfg.langsmithApiKey) {
    process.env.LANGCHAIN_TRACING_V2 = 'true';
    process.env.LANGCHAIN_API_KEY = cfg.langsmithApiKey;
    process.env.LANGCHAIN_PROJECT = cfg.langsmithProject;
    if (cfg.langsmithEndpoint) {
      process.env.LANGCHAIN_ENDPOINT = cfg.langsmithEndpoint;
    }
  }
}

function buildSystemPrompt(language: string) {
  return `You are Krashaq, a multilingual AI farming assistant for Indian farmers.
Respond in ${language === 'hi' ? 'Hindi' : language === 'hinglish' ? 'Hinglish (mix of Hindi and English)' : 'English'}.
Be practical, concise, and actionable. Use emojis sparingly.
If weather, irrigation, or web search context is provided, use it in your answer.
Cite web sources by number when web search results are included.
Never invent government schemes, prices, or helpline numbers. If unsure, say so.`;
}

function isWeatherQuery(message: string) {
  return /weather|mausam|temperature|barish|rain|humidity|garmi/i.test(message);
}

function isIrrigationQuery(message: string) {
  return /irrigation|paani|water|sinchai|watering|sprinkler|drip/i.test(message);
}

async function buildChatContext(request: ChatRequest) {
  ensureLangSmithEnv();

  const location = request.location ?? 'Delhi';
  const sessionId = await getOrCreateSessionForUser(request.user_id, request.session_id);
  const language = request.language ?? detectLanguage(request.message);
  const toolsUsed: string[] = [];
  const contextBlocks: string[] = [];
  let weatherData: WeatherData | undefined;

  if (isWeatherQuery(request.message) || isIrrigationQuery(request.message)) {
    weatherData = await getWeather(location);
    if (weatherData.success) {
      toolsUsed.push('fetch_weather');
      contextBlocks.push(formatWeatherForFarmer(weatherData));
    }
  }

  if (isIrrigationQuery(request.message) && weatherData) {
    toolsUsed.push('fetch_irrigation_advice');
    contextBlocks.push(getIrrigationAdvice(weatherData));
  }

  const detectedCrop = detectCrop(request.message);
  const history = await loadConversationHistory(request.user_id, sessionId);

  let webCitations: ReturnType<typeof webSearchCitations> = [];

  if (isTavilyConfigured() && shouldUseWebSearch(request.message)) {
    const web = await searchWeb({
      message: request.message,
      location,
      crop: detectedCrop,
      language,
    });
    if (web.success) {
      toolsUsed.push('web_search');
      contextBlocks.push(formatWebSearchForPrompt(web));
      webCitations = webSearchCitations(web);
    }
  }

  const messages: (SystemMessage | HumanMessage | AIMessage)[] = [
    new SystemMessage(buildSystemPrompt(language)),
    ...history.map((m) =>
      m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
    ),
    ...(contextBlocks.length
      ? [new SystemMessage(`Context from tools:\n${contextBlocks.join('\n\n')}`)]
      : []),
    new HumanMessage(request.message),
  ];

  return {
    location,
    sessionId,
    language,
    toolsUsed,
    detectedCrop,
    weatherData,
    messages,
    webCitations,
  };
}

async function buildMinimalAgentContext(request: ChatRequest) {
  ensureLangSmithEnv();
  const location = request.location ?? 'Delhi';
  const sessionId = await getOrCreateSessionForUser(request.user_id, request.session_id);
  const language = request.language ?? detectLanguage(request.message);
  const detectedCrop = detectCrop(request.message);
  return { location, sessionId, language, detectedCrop };
}

function llmInvokeConfig(request: ChatRequest, sessionId: string) {
  return {
    runName: 'krashaq-chat',
    tags: [
      'krashaq',
      'chat',
      request.provider ?? 'groq',
      request.model ? 'custom-model' : 'default',
    ],
    metadata: {
      user_id: request.user_id,
      session_id: sessionId,
      role: request.user_role ?? 'farmer',
      provider: request.provider ?? 'groq',
      model: request.model ?? '',
    },
  };
}

async function invokeWithFallback(
  messages: (SystemMessage | HumanMessage | AIMessage)[],
  selection: { provider?: string; model?: string },
  invokeConfig?: ReturnType<typeof llmInvokeConfig>
) {
  const chain = getProviderChain(selection);

  for (const providerId of chain) {
    try {
      const instance =
        providerId === chain[0]
          ? (resolveLLM(selection) ?? createLLM(providerId, selection.model))
          : createLLM(providerId);

      const result = await instance.llm.invoke(messages, invokeConfig);
      const reply =
        typeof result.content === 'string' ? result.content : JSON.stringify(result.content);

      return {
        reply,
        provider: instance.provider,
        model: instance.model,
      };
    } catch (error) {
      console.warn(`LLM provider ${providerId} failed:`, error);
    }
  }

  return null;
}

async function* streamWithFallback(
  messages: (SystemMessage | HumanMessage | AIMessage)[],
  selection: { provider?: string; model?: string },
  signal?: AbortSignal,
  invokeConfig?: ReturnType<typeof llmInvokeConfig>
): AsyncGenerator<
  { delta: string } | { done: true; full: string; provider: string; model: string }
> {
  const chain = getProviderChain(selection);

  for (const providerId of chain) {
    try {
      const instance =
        providerId === chain[0]
          ? (resolveLLM(selection) ?? createLLM(providerId, selection.model))
          : createLLM(providerId);

      const stream = await instance.llm.stream(messages, { ...invokeConfig, signal });
      let full = '';

      for await (const chunk of stream) {
        if (signal?.aborted) {
          yield { done: true, full, provider: instance.provider, model: instance.model };
          return;
        }
        const delta = typeof chunk.content === 'string' ? chunk.content : '';
        if (delta) {
          full += delta;
          yield { delta };
        }
      }

      yield { done: true, full, provider: instance.provider, model: instance.model };
      return;
    } catch (error) {
      if (signal?.aborted) return;
      console.warn(`LLM stream provider ${providerId} failed:`, error);
    }
  }
}

export async function processChat(request: ChatRequest): Promise<ChatResponse> {
  const ctx = await buildChatContext(request);
  const traceConfig = llmInvokeConfig(request, ctx.sessionId);

  let reply: string;
  let llmProvider = 'none';
  let llmModel = 'none';

  const llmResult = await invokeWithFallback(
    ctx.messages,
    { provider: request.provider, model: request.model },
    traceConfig
  );

  if (llmResult) {
    reply = llmResult.reply;
    llmProvider = llmResult.provider;
    llmModel = llmResult.model;
  } else {
    reply =
      'Krashaq AI is not configured. Add GROQ_API_KEY (default) or another provider key in environment variables.';
  }

  await appendConversation(request.user_id, ctx.sessionId, 'user', request.message);
  await appendConversation(request.user_id, ctx.sessionId, 'assistant', reply, {
    tools_used: ctx.toolsUsed,
    llm_provider: llmProvider,
    llm_model: llmModel,
    detected_crop: ctx.detectedCrop,
    language: ctx.language,
  });

  return {
    reply,
    session_id: ctx.sessionId,
    language: ctx.language,
    tools_used: ctx.toolsUsed,
    detected_crop: ctx.detectedCrop,
    llm_provider: llmProvider,
    llm_model: llmModel,
    weather: ctx.weatherData,
  };
}

export async function* processChatStream(
  request: ChatRequest,
  signal?: AbortSignal
): AsyncGenerator<StreamEvent> {
  const agentMode = useAgentRuntime();
  const ctx = agentMode ? await buildMinimalAgentContext(request) : await buildChatContext(request);

  yield { type: 'session', session_id: ctx.sessionId };

  yield {
    type: 'meta',
    language: ctx.language,
    tools_used: agentMode ? [] : (ctx as Awaited<ReturnType<typeof buildChatContext>>).toolsUsed,
    llm_provider: request.provider ?? 'groq',
    llm_model: request.model ?? '',
    detected_crop: ctx.detectedCrop,
  };

  if (!agentMode) {
    const legacyCtx = ctx as Awaited<ReturnType<typeof buildChatContext>>;
    if (legacyCtx.toolsUsed.includes('web_search')) {
      yield { type: 'tool_start', tool: 'web_search', input: { query: request.message } };
      for (const cite of legacyCtx.webCitations) {
        yield {
          type: 'citation',
          index: cite.index,
          title: cite.title,
          url: cite.url,
          snippet: cite.snippet,
        };
      }
      yield {
        type: 'tool_result',
        tool: 'web_search',
        output: `${legacyCtx.webCitations.length} sources`,
      };
    }
  }

  await appendConversation(request.user_id, ctx.sessionId, 'user', request.message);

  let fullContent = '';
  let llmProvider = request.provider ?? 'groq';
  let llmModel = request.model ?? '';
  const toolsUsed: string[] = agentMode
    ? []
    : [...(ctx as Awaited<ReturnType<typeof buildChatContext>>).toolsUsed];
  let detectedCrop = ctx.detectedCrop;

  if (agentMode) {
    const eventQueue = new AgentEventQueue();
    let streamedViaCallback = false;

    const agentTask = runKrashaqAgent({
      request: {
        ...request,
        language: ctx.language,
        location: ctx.location,
      },
      systemBase: buildSystemPrompt(ctx.language),
      history: (await loadConversationHistory(request.user_id, ctx.sessionId, 10)).map((m) => ({
        role: m.role,
        content: m.content,
      })),
      callbacks: {
        onToolStart: (tool, input) => {
          if (!toolsUsed.includes(tool)) toolsUsed.push(tool);
          eventQueue.push({ type: 'tool_start', tool, input });
        },
        onToolEnd: (tool, output, durationMs) => {
          eventQueue.push({
            type: 'tool_result',
            tool,
            output: output.slice(0, 500),
            duration_ms: durationMs,
          });
        },
        onToken: (delta) => {
          streamedViaCallback = true;
          fullContent += delta;
          eventQueue.push({ type: 'token', delta });
        },
        onCitation: (citation) => {
          eventQueue.push({ type: 'citation', ...citation });
        },
      },
    }).finally(() => eventQueue.close());

    for await (const event of eventQueue.consume()) {
      if (signal?.aborted) break;
      yield event;
    }

    const agentResult = await agentTask;
    fullContent = agentResult.content || fullContent;
    detectedCrop = agentResult.detected_crop ?? detectedCrop;
    for (const tool of agentResult.tools_used) {
      if (!toolsUsed.includes(tool)) toolsUsed.push(tool);
    }

    if (!streamedViaCallback && fullContent) {
      const chunkSize = 24;
      for (let i = 0; i < fullContent.length; i += chunkSize) {
        if (signal?.aborted) break;
        yield { type: 'token', delta: fullContent.slice(i, i + chunkSize) };
      }
    }
  } else {
    const legacyCtx = ctx as Awaited<ReturnType<typeof buildChatContext>>;
    const traceConfig = llmInvokeConfig(request, ctx.sessionId);

    const streamGen = streamWithFallback(
      legacyCtx.messages,
      { provider: request.provider, model: request.model },
      signal,
      traceConfig
    );

    for await (const chunk of streamGen) {
      if (signal?.aborted) {
        if (fullContent) {
          await appendConversation(request.user_id, ctx.sessionId, 'assistant', fullContent, {
            tools_used: toolsUsed,
            llm_provider: llmProvider,
            llm_model: llmModel,
            detected_crop: detectedCrop,
            language: ctx.language,
          });
        }
        return;
      }

      if ('delta' in chunk) {
        fullContent += chunk.delta;
        yield { type: 'token', delta: chunk.delta };
      } else if ('done' in chunk && chunk.done) {
        fullContent = chunk.full || fullContent;
        llmProvider = chunk.provider;
        llmModel = chunk.model;
      }
    }
  }

  if (!fullContent) {
    fullContent =
      'Krashaq AI is not configured. Add GROQ_API_KEY (default) or another provider key in environment variables.';
    yield { type: 'token', delta: fullContent };
  }

  const messageId = await appendConversation(
    request.user_id,
    ctx.sessionId,
    'assistant',
    fullContent,
    {
      tools_used: toolsUsed,
      llm_provider: llmProvider,
      llm_model: llmModel,
      detected_crop: detectedCrop,
      language: ctx.language,
    }
  );

  yield { type: 'done', message_id: messageId, full_content: fullContent };
}
