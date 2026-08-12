import { AgentEventQueue } from '@/lib/server/agents/event-queue';

describe('AgentEventQueue', () => {
  it('yields events in order as they are pushed', async () => {
    const q = new AgentEventQueue();
    q.push({ type: 'tool_start', tool: 'fetch_weather', input: { location: 'Bhopal' } });
    q.push({ type: 'token', delta: 'Hello' });
    q.close();

    const events = [];
    for await (const e of q.consume()) events.push(e);

    expect(events).toHaveLength(2);
    expect(events[0].type).toBe('tool_start');
    expect(events[1].type).toBe('token');
  });

  it('streams events pushed after consume starts', async () => {
    const q = new AgentEventQueue();
    const collected: string[] = [];

    const consumeTask = (async () => {
      for await (const e of q.consume()) {
        if (e.type === 'token') collected.push(e.delta);
      }
    })();

    q.push({ type: 'token', delta: 'a' });
    q.push({ type: 'token', delta: 'b' });
    q.close();

    await consumeTask;
    expect(collected.join('')).toBe('ab');
  });
});
