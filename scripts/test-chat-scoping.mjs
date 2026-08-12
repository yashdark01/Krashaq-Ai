#!/usr/bin/env node
/**
 * Smoke test: user-scoped chat sessions (Chat-1)
 * Requires: npm run db:reset && dev server NOT required (uses route handlers via fetch to localhost if running)
 * Run against running dev server: node scripts/test-chat-scoping.mjs
 */
import fs from 'fs';
import path from 'path';

function loadEnvFile(filename) {
  const envPath = path.join(process.cwd(), filename);
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile('.env');
loadEnvFile('.env.local');

const BASE = process.env.APP_URL ?? 'http://localhost:3000';

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(`Login failed for ${email}: ${res.status}`);
  return res.json();
}

async function listSessions(token) {
  const res = await fetch(`${BASE}/api/messages/sessions`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Sessions failed: ${res.status}`);
  return res.json();
}

async function main() {
  console.log(`Testing chat scoping against ${BASE}...`);

  const farmer = await login('farmer@krashaq.dev', 'Farmer@12345');
  const supplier = await login('supplier@krashaq.dev', 'Supplier@12345');

  const farmerSessions = await listSessions(farmer.access_token);
  const supplierSessions = await listSessions(supplier.access_token);

  if (!farmerSessions.items?.length) throw new Error('Farmer should have seed sessions');
  if (!supplierSessions.items?.length) throw new Error('Supplier should have seed sessions');

  const farmerIds = new Set(farmerSessions.items.map((s) => s.session_id));
  const supplierIds = new Set(supplierSessions.items.map((s) => s.session_id));
  const overlap = [...farmerIds].filter((id) => supplierIds.has(id));

  if (overlap.length > 0) {
    throw new Error(`Session leak: shared ids ${overlap.join(', ')}`);
  }

  // Unauthenticated should 401
  const anon = await fetch(`${BASE}/api/messages/sessions`);
  if (anon.status !== 401) throw new Error(`Expected 401 for anon, got ${anon.status}`);

  console.log('✓ Farmer sessions:', farmerSessions.items.length);
  console.log('✓ Supplier sessions:', supplierSessions.items.length);
  console.log('✓ No shared session IDs between users');
  console.log('✓ Unauthenticated access blocked (401)');
}

main().catch((err) => {
  console.error('✗', err.message);
  process.exit(1);
});
