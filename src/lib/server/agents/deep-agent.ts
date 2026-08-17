import {
  AIMessage,
  HumanMessage,
  type BaseMessage,
} from '@langchain/core/messages';
import {
  createDeepAgent,
  createHarnessProfile,
  registerHarnessProfile,
  StateBackend,
} from 'deepagents';
import { friendlyLlmErrorMessage, isTechnicalLlmError } from '@/lib/server/agents/llm-errors';
import type { ChatRequest } from '@/lib/server/services/chat';
import { buildKrashaqTools } from '@/lib/server/agents/tools';
import { classifyRoute, shouldRetrieveKb } from '@/lib/server/agents/router';
import {
  retrievalPromptFromKb,
  runKbRetrieval,
} from '@/lib/server/agents/kb-retrieval';
import { loadSkillSnippet } from '@/lib/server/skills/loader';
import { clearRagRequestCache, seedKbDocumentsIfEmpty } from '@/lib/server/services/rag-service';
import { detectCrop, detectLanguage } from '@/lib/server/services/irrigation';
import { resolveLLM } from '@/lib/server/llm/factory';
import type { AgentRunCallbacks } from '@/lib/server/agents/state';
import { buildSystemPrompt } from '@/lib/server/agents/prompts';

/** DeepAgents built-in tools use JSON Schema fields Gemini rejects (e.g. exclusiveMinimum on grep). */
const GEMINI_EXCLUDED_DEEPAGENT_TOOLS = [
  'ls',
  'read_file',
  'write_file',
  'edit_file',
  'glob',
  'grep',
  'execute',
  'task',
  'write_todos',
  'start_async_task',
  'check_async_task',
  'update_async_task',
  'cancel_async_task',
  'list_async_tasks',
];

let geminiHarnessRegistered = false;

function ensureGeminiHarnessProfile() {
  if (geminiHarnessRegistered) return;
  geminiHarnessRegistered = true;

  const profile = createHarnessProfile({
    excludedTools: GEMINI_EXCLUDED_DEEPAGENT_TOOLS,
    generalPurposeSubagent: { enabled: false },
  });

  registerHarnessProfile('google', profile);
}

function extractTextContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part) {
          return String((part as { text?: string }).text ?? '');
        }
        return '';
      })
      .join('');
  }
  if (content) return JSON.stringify(content);
  return '';
}

async function streamDeepAgent(params: {
  agent: ReturnType<typeof createDeepAgent>;
  messages: BaseMessage[];
  callbacks?: AgentRunCallbacks;
}): Promise<{ content: string; toolsUsed: string[] }> {
  const toolsUsed: string[] = [];
  const toolStarts = new Map<string, number>();
  let content = '';

  const eventStream = params.agent.streamEvents(
    { messages: params.messages },
    { version: 'v2' }
  );

  for await (const event of eventStream) {
    if (event.event === 'on_chat_model_stream') {
      const chunk = event.data?.chunk as { content?: unknown } | undefined;
      const delta = extractTextContent(chunk?.content);
      if (delta) {
        content += delta;
        params.callbacks?.onToken?.(delta);
      }
    }

    if (event.event === 'on_tool_start') {
      const tool = String(event.name ?? 'tool');
      if (!toolsUsed.includes(tool)) toolsUsed.push(tool);
      toolStarts.set(tool, Date.now());
      params.callbacks?.onToolStart?.(tool, event.data?.input);
    }

    if (event.event === 'on_tool_end') {
      const tool = String(event.name ?? 'tool');
      const started = toolStarts.get(tool) ?? Date.now();
      const output = extractTextContent(event.data?.output);
      params.callbacks?.onToolEnd?.(tool, output.slice(0, 800), Date.now() - started);
    }
  }

  return { content, toolsUsed };
}

export async function runDeepKrashaqAgent(params: {
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
      route: 'deepagents',
      detected_crop: null,
    };
  }

  const location = params.request.location ?? 'Delhi';
  const language = params.request.language ?? detectLanguage(params.request.message);
  const skill = loadSkillSnippet(params.request.message);
  const route = classifyRoute(params.request.message);
  const detectedCrop = detectCrop(params.request.message);

  const tools = buildKrashaqTools({
    location,
    language,
    message: params.request.message,
    user_id: params.request.user_id,
    user_role: params.request.user_role,
  });

  let kbSection = '';
  if (route === 'rag' || shouldRetrieveKb(params.request.message)) {
    const retrieval = await runKbRetrieval(
      params.request.message,
      5,
      params.callbacks ?? {},
      true
    );
    if (retrieval.rag_relevant) {
      kbSection = `\n\n${retrievalPromptFromKb(retrieval.rag_context)}`;
    }
  }

  const system = `${params.systemBase ?? buildSystemPrompt(language)}\n\n${skill}${kbSection}`.trim();

  if (llmInstance.provider === 'gemini') {
    ensureGeminiHarnessProfile();
  }

  const agent = createDeepAgent({
    model: llmInstance.llm,
    tools,
    systemPrompt: system,
    name: 'krashaq-farming-agent',
    backend: () => new StateBackend(),
  });

  const messages = [
    ...params.history.map((m) =>
      m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
    ),
    new HumanMessage(params.request.message),
  ];

  try {
    const { content, toolsUsed } = await streamDeepAgent({
      agent,
      messages,
      callbacks: params.callbacks,
    });

    if (isTechnicalLlmError(content)) {
      return {
        content: friendlyLlmErrorMessage(content),
        tools_used: [...new Set(toolsUsed)],
        route: `deepagents:${route}:error`,
        detected_crop: detectedCrop,
      };
    }

    return {
      content: content || 'I could not generate a response. Please try again.',
      tools_used: [...new Set(toolsUsed)],
      route: `deepagents:${route}`,
      detected_crop: detectedCrop,
    };
  } catch (error) {
    const raw = error instanceof Error ? error.message : 'Agent request failed';
    console.warn('Deep agent failed:', error);
    return {
      content: friendlyLlmErrorMessage(raw),
      tools_used: [],
      route: `deepagents:${route}:error`,
      detected_crop: detectedCrop,
    };
  }
}
