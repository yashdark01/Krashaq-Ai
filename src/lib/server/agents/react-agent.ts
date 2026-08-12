export { runKrashaqAgent, useAgentRuntime } from '@/lib/server/agents/graph';

/** @deprecated Use runKrashaqAgent from graph.ts */
export async function runReactAgent(params: {
  request: import('@/lib/server/services/chat').ChatRequest;
  systemBase: string;
  history: Array<{ role: string; content: string }>;
  onToolStart?: (tool: string, input: unknown) => void;
  onToolEnd?: (tool: string, output: string) => void;
}) {
  const { runKrashaqAgent } = await import('@/lib/server/agents/graph');
  return runKrashaqAgent({
    request: params.request,
    systemBase: params.systemBase,
    history: params.history,
    callbacks: {
      onToolStart: (tool, input) => params.onToolStart?.(tool, input),
      onToolEnd: (tool, output) => params.onToolEnd?.(tool, output),
    },
  }).then((r) => ({ content: r.content, tools_used: r.tools_used }));
}
