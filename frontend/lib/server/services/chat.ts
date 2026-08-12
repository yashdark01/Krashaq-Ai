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

export interface ChatRequest {
  message: string;
  location?: string;
  phone?: string;
  session_id?: string;
  language?: string;
  /** LLM provider: groq | openai | anthropic | gemini | xai | deepseek | mistral | ollama */
  provider?: string;
  /** Model id for the selected provider */
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

async function invokeWithFallback(
  messages: (SystemMessage | HumanMessage | AIMessage)[],
  selection: { provider?: string; model?: string }
) {
  const chain = getProviderChain(selection);

  for (const providerId of chain) {
    try {
      const instance =
        providerId === chain[0]
          ? resolveLLM(selection) ?? createLLM(providerId, selection.model)
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

export async function processChat(request: ChatRequest): Promise<ChatResponse> {
  const location = request.location ?? 'Delhi';
  const sessionId = await getOrCreateSession(request.phone, request.session_id);
  const language = request.language ?? detectLanguage(request.message);
  const toolsUsed: string[] = [];
  const contextBlocks: string[] = [];
  let weatherData;

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

  let reply: string;
  let llmProvider = 'none';
  let llmModel = 'none';

  const llmResult = await invokeWithFallback(
    [
      new SystemMessage(buildSystemPrompt(language)),
      ...history.map((m) =>
        m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
      ),
      ...(contextBlocks.length
        ? [new SystemMessage(`Context from tools:\n${contextBlocks.join('\n\n')}`)]
        : []),
      new HumanMessage(request.message),
    ],
    { provider: request.provider, model: request.model }
  );

  if (llmResult) {
    reply = llmResult.reply;
    llmProvider = llmResult.provider;
    llmModel = llmResult.model;
  } else {
    reply =
      contextBlocks.join('\n\n') ||
      'Krashaq AI is not configured. Add GROQ_API_KEY (default) or another provider key in environment variables.';
  }

  await appendConversation(sessionId, 'user', request.message);
  await appendConversation(sessionId, 'assistant', reply);

  return {
    reply,
    session_id: sessionId,
    language,
    tools_used: toolsUsed,
    detected_crop: detectedCrop,
    llm_provider: llmProvider,
    llm_model: llmModel,
    weather: weatherData,
  };
}
