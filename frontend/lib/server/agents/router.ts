export type AgentRoute = 'fast' | 'tools' | 'rag';

export function classifyRoute(message: string): AgentRoute {
  const m = message.trim().toLowerCase();

  if (
    m.length < 48 &&
    /^(hi|hello|hey|namaste|thanks|thank you|ok|okay|bye|good morning|good evening)\b/.test(
      m
    )
  ) {
    return 'fast';
  }

  if (/^(what is krashaq|who are you|help me|how do you work)\b/.test(m)) {
    return 'fast';
  }

  if (
    /scheme|pm-kisan|pm kisan|subsidy|eligibility|yojana|government|msp|mandi|policy|loan/i.test(
      m
    )
  ) {
    return 'rag';
  }

  if (
    /pest|disease|fertilizer|khad|खाद|urea|dap|nutrient|weather|mausam|irrigation|paani|sinchai|crop|fasal|wheat|soybean|rice|cotton|maize/i.test(
      m
    )
  ) {
    return 'tools';
  }

  if (/\band\b|,/.test(m) && m.length > 30) {
    return 'tools';
  }

  return 'tools';
}
