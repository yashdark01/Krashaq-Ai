import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { resolveLLM, getProviderChain, createLLM } from '@/lib/server/llm/factory';
import {
  appendConversation,
  getOrCreateSession,
  loadConversationHistory,
} from '@/lib/server/services/chat-memory';
import {
  detectCrop,
  detectLanguage,
  getIrrigationAdvice,
} from '@/lib/server/services/irrigation';
import { formatWeatherForFarmer, getWeather, type WeatherData } from '@/lib/server/services/weather';
import type { StreamEvent } from '@/modules/conversation/types/message';

export interface ChatRequest {
  message: string;
  location?: string;
  phone?: string;
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

function buildSystemPrompt(language: string) {
  return `You are Krashaq, a multilingual AI farming assistant for Indian farmers.
Respond in ${language === 'hi' ? 'Hindi' : language === 'hinglish' ? 'Hinglish (mix of Hindi and English)' : 'English'}.
Be practical, concise, and actionable. Use emojis sparingly.
If weather or irrigation context is provided, use it in your answer.
Never invent government schemes or prices. If unsure, say so.`;
}

function isWeatherQuery(message: string) {
  return /weather|mausam|temperature|barish|rain|humidity|garmi/i.test(message);
}

function isIrrigationQuery(message: string) {
  return /irrigation|paani|water|sinchai|watering|sprinkler|drip/i.test(message);
}

async function buildChatContext(request: ChatRequest) {
  const location = request.location ?? 'Delhi';
  const sessionId = await getOrCreateSession(request.phone, request.session_id);
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
  const history = await loadConversationHistory(sessionId);

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
  };
}

async function invokeWithFallback(
  messages: (SystemMessage | HumanMessage | AIMessage)[],
  selection: { provider?: string; model?: string }
) {
  const chain = getProviderChain(selection);

  for (const providerId of chain) {
    try {
      const instance =
        providerId === chain[0]
          ? (resolveLLM(selection) ?? createLLM(providerId, selection.model))
          : createLLM(providerId);

      const result = await instance.llm.invoke(messages);
      const reply =
        typeof result.content === 'string'
          ? result.content
          : JSON.stringify(result.content);

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
  signal?: AbortSignal
): AsyncGenerator<{ delta: string } | { done: true; full: string; provider: string; model: string }> {
  const chain = getProviderChain(selection);

  for (const providerId of chain) {
    try {
      const instance =
        providerId === chain[0]
          ? (resolveLLM(selection) ?? createLLM(providerId, selection.model))
          : createLLM(providerId);

      const stream = await instance.llm.stream(messages, { signal });
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

  let reply: string;
  let llmProvider = 'none';
  let llmModel = 'none';

  const llmResult = await invokeWithFallback(ctx.messages, {
    provider: request.provider,
    model: request.model,
  });

  if (llmResult) {
    reply = llmResult.reply;
    llmProvider = llmResult.provider;
    llmModel = llmResult.model;
  } else {
    reply =
      'Krashaq AI is not configured. Add GROQ_API_KEY (default) or another provider key in environment variables.';
  }

  await appendConversation(ctx.sessionId, 'user', request.message);
  await appendConversation(ctx.sessionId, 'assistant', reply, {
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
  const ctx = await buildChatContext(request);

  yield { type: 'session', session_id: ctx.sessionId };

  yield {
    type: 'meta',
    language: ctx.language,
    tools_used: ctx.toolsUsed,
    llm_provider: request.provider ?? 'groq',
    llm_model: request.model ?? '',
    detected_crop: ctx.detectedCrop,
  };

  await appendConversation(ctx.sessionId, 'user', request.message);

  let fullContent = '';
  let llmProvider = 'none';
  let llmModel = 'none';

  const streamGen = streamWithFallback(ctx.messages, {
    provider: request.provider,
    model: request.model,
  }, signal);

  for await (const chunk of streamGen) {
    if (signal?.aborted) {
      if (fullContent) {
        await appendConversation(ctx.sessionId, 'assistant', fullContent, {
          tools_used: ctx.toolsUsed,
          llm_provider: llmProvider,
          llm_model: llmModel,
          detected_crop: ctx.detectedCrop,
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

  if (!fullContent) {
    fullContent =
      'Krashaq AI is not configured. Add GROQ_API_KEY (default) or another provider key in environment variables.';
    yield { type: 'token', delta: fullContent };
  }

  const messageId = await appendConversation(ctx.sessionId, 'assistant', fullContent, {
    tools_used: ctx.toolsUsed,
    llm_provider: llmProvider,
    llm_model: llmModel,
    detected_crop: ctx.detectedCrop,
    language: ctx.language,
  });

  yield { type: 'done', message_id: messageId, full_content: fullContent };
}
