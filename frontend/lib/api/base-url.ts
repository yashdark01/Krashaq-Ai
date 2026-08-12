/**
 * Browser: same-origin Next.js API routes (monolith).
 * Optional NEXT_PUBLIC_API_URL override for split deployment during migration.
 */
export function getBrowserApiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? '';
}
