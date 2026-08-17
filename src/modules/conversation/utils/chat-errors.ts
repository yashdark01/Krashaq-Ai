export function looksLikeTechnicalError(content: string): boolean {
  return /\[GoogleGenerativeAI Error\]|exclusiveMinimum|Invalid JSON payload received/i.test(
    content
  );
}

export function friendlyErrorContent(content: string): string {
  if (/exclusiveMinimum|Invalid JSON payload/i.test(content)) {
    return "I ran into a compatibility issue with this AI model. Please try again — if it keeps happening, switch models using the dropdown above.";
  }
  if (/401|API key|authentication|Unauthorized/i.test(content)) {
    return 'Authentication error. Please check your API key configuration or log in again.';
  }
  if (/429|rate limit|Too Many Requests/i.test(content)) {
    return 'Rate limit exceeded. Please wait a moment and try again.';
  }
  return "Sorry, I couldn't process your request. Please try again.";
}
