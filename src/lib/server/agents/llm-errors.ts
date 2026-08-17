const TECHNICAL_ERROR_PATTERNS = [
  /\[GoogleGenerativeAI Error\]/i,
  /exclusiveMinimum/i,
  /Invalid JSON payload received/i,
  /\[400 Bad Request\]/i,
  /\[401 Unauthorized\]/i,
  /\[429 Too Many Requests\]/i,
];

export function isTechnicalLlmError(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;
  return TECHNICAL_ERROR_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function friendlyLlmErrorMessage(raw: string): string {
  if (/exclusiveMinimum|Invalid JSON payload/i.test(raw)) {
    return "I ran into a compatibility issue with this AI model. Please try again — if it keeps happening, switch models using the dropdown above.";
  }
  if (/401|API key|authentication|Unauthorized/i.test(raw)) {
    return 'Authentication error. Please check your API key configuration or log in again.';
  }
  if (/429|rate limit|Too Many Requests/i.test(raw)) {
    return 'Rate limit exceeded. Please wait a moment and try again.';
  }
  return "Sorry, I couldn't process your request. Please try again.";
}
