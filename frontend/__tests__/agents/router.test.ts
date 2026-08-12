import { classifyRoute } from '@/lib/server/agents/router';

describe('classifyRoute', () => {
  it('routes greetings to fast path', () => {
    expect(classifyRoute('Hello')).toBe('fast');
    expect(classifyRoute('Namaste')).toBe('fast');
  });

  it('routes scheme questions to rag', () => {
    expect(classifyRoute('What is PM-KISAN eligibility?')).toBe('rag');
    expect(classifyRoute('Tell me about government subsidy for farmers')).toBe('rag');
  });

  it('routes weather and crop questions to tools', () => {
    expect(classifyRoute('Weather in Bhopal today')).toBe('tools');
    expect(classifyRoute('How much urea for wheat?')).toBe('tools');
  });
});
