#!/usr/bin/env node
/** Run due farmer alerts locally. Usage: npm run alerts:run [baseUrl] */
const BASE = process.argv[2] ?? 'http://localhost:3000';
const secret = process.env.CRON_SECRET ?? '';

async function main() {
  const headers = { 'Content-Type': 'application/json' };
  if (secret) headers['x-cron-secret'] = secret;

  const res = await fetch(`${BASE}/api/cron/alerts`, { method: 'POST', headers });
  const data = await res.json();
  if (!res.ok) {
    console.error('Failed:', data);
    process.exit(1);
  }
  console.log('Alert run complete:', data);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
