export type AgentRoute = 'fast' | 'tools' | 'rag';

/** Whether this message should trigger a knowledge-base retrieval (once per turn). */
export function shouldRetrieveKb(message: string): boolean {
  return /scheme|pm-kisan|pm kisan|subsidy|eligibility|yojana|government|msp|mandi|policy|pest|disease|symptom|fertilizer|khad|खाद|urea|dap|nutrient|crop|fasal|wheat|soybean|rice|cotton|maize|drip|irrigation|sinchai|paani|sowing|harvest|seed|beej/i.test(
    message
  );
}

function needsLiveTools(message: string): boolean {
  return /weather|mausam|temperature|rain|barish|humidity|garmi|today|now|current|forecast/i.test(
    message
  );
}

export function classifyRoute(message: string): AgentRoute {
  const m = message.trim().toLowerCase();

  if (
    m.length < 48 &&
    /^(hi|hello|hey|namaste|thanks|thank you|ok|okay|bye|good morning|good evening)\b/.test(m)
  ) {
    return 'fast';
  }

  if (/^(what is krashaq|who are you|help me|how do you work)\b/.test(m)) {
    return 'fast';
  }

  const kb = shouldRetrieveKb(message);
  const live = needsLiveTools(message);

  // Pure knowledge questions → dedicated RAG path (single retrieval + answer)
  if (kb && !live) {
    return 'rag';
  }

  // Scheme/government questions even with extra words → RAG unless live weather is required
  if (
    /scheme|pm-kisan|pm kisan|subsidy|eligibility|yojana|government|msp|mandi|policy|loan/i.test(
      m
    ) &&
    !live
  ) {
    return 'rag';
  }

  if (
    /pest|disease|fertilizer|khad|weather|mausam|irrigation|paani|sinchai|crop|fasal|wheat|soybean|rice|cotton|maize/i.test(
      m
    )
  ) {
    return 'tools';
  }

  if (/\band\b|,/.test(m) && m.length > 30) {
    return 'tools';
  }

  return kb ? 'rag' : 'tools';
}
