/**
 * Builds agriculture-aware Tavily queries from user messages.
 */
export interface WebSearchQueryContext {
  message: string;
  location?: string;
  crop?: string | null;
  language?: string;
}

export function shouldUseWebSearch(message: string): boolean {
  const m = message.toLowerCase();

  // Prefer dedicated weather API for local forecast-only questions
  const weatherOnly =
    /^(what('s| is) the )?weather|mausam kaisa|aaj ka mausam|temperature today|barish hogi\?*$/i.test(
      message.trim()
    );
  if (weatherOnly) return false;

  const webTriggers =
    /latest|recent|news|update|2024|2025|2026|today|current|abhi|nayi|scheme|yojana|subsidy|subsidi|msp|minimum support|pm-kisan|pm kisan|government|sarkar|policy|market price|mandi|rate|bhav|₹|rs\.|rupee|outbreak|alert|advisory|notification|research|study|report|compare|vs\.|versus|best variety|new seed|fertilizer price|urea price|drip subsidy|kcc loan|crop insurance|pmfby|fpo|export|import|global|international/i;

  const knowledgeGap =
    /what is|kya hai|tell me about|explain|how to apply|kaise apply|eligibility|patrata|documents needed|official website|helpline|contact/i;

  return webTriggers.test(m) || knowledgeGap.test(m);
}

export function buildWebSearchQuery(ctx: WebSearchQueryContext): string {
  const parts: string[] = [];
  const msg = ctx.message.trim();

  parts.push(msg);

  if (ctx.location?.trim()) {
    parts.push(`location: ${ctx.location.trim()}`);
  }

  if (ctx.crop?.trim()) {
    parts.push(`crop: ${ctx.crop.trim()}`);
  }

  // Bias toward trusted Indian agritech sources
  parts.push('India agriculture farmer advisory');

  if (ctx.language === 'hi' || ctx.language === 'hinglish') {
    parts.push('Hindi India');
  }

  return parts.join(' | ').slice(0, 400);
}

export function pickSearchDepth(message: string): 'basic' | 'advanced' {
  const complex =
    /compare|vs|analysis|research|scheme|policy|subsidy|eligibility|market trend|forecast report/i.test(
      message
    );
  return complex ? 'advanced' : 'basic';
}

export function pickSearchTopic(message: string): 'general' | 'news' {
  return /news|latest|today|update|alert|outbreak|notification|abhi|recent/i.test(message)
    ? 'news'
    : 'general';
}
