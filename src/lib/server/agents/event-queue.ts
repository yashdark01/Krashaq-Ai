import type { StreamEvent } from '@/modules/conversation/types/message';

type AgentStreamEvent = Extract<
  StreamEvent,
  { type: 'tool_start' | 'tool_result' | 'token' | 'citation' }
>;

/** Async queue for real-time agent → SSE streaming */
export class AgentEventQueue {
  private queue: AgentStreamEvent[] = [];
  private waiters: Array<() => void> = [];
  private closed = false;

  push(event: AgentStreamEvent) {
    this.queue.push(event);
    const next = this.waiters.shift();
    next?.();
  }

  close() {
    this.closed = true;
    for (const w of this.waiters) w();
    this.waiters = [];
  }

  async *consume(): AsyncGenerator<AgentStreamEvent> {
    while (true) {
      const event = this.queue.shift();
      if (event) {
        yield event;
        continue;
      }
      if (this.closed) break;
      await new Promise<void>((resolve) => this.waiters.push(resolve));
    }
  }
}
