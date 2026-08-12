import { rangeToDates } from '@/lib/server/services/langsmith-service';

describe('rangeToDates', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-12T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns a 24h window', () => {
    const { start, end } = rangeToDates('24h');
    expect(end.toISOString()).toBe('2026-08-12T12:00:00.000Z');
    expect(start.toISOString()).toBe('2026-08-11T12:00:00.000Z');
  });

  it('returns a 7d window by default', () => {
    const { start, end } = rangeToDates('7d');
    expect(end.toISOString()).toBe('2026-08-12T12:00:00.000Z');
    expect(start.toISOString()).toBe('2026-08-05T12:00:00.000Z');
  });

  it('returns a 30d window', () => {
    const { start } = rangeToDates('30d');
    expect(start.toISOString()).toBe('2026-07-13T12:00:00.000Z');
  });
});
