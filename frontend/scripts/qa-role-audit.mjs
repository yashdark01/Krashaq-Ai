#!/usr/bin/env node
/**
 * Role-based QA audit: login as admin/supplier/farmer and probe pages + APIs.
 * Usage: node scripts/qa-role-audit.mjs [baseUrl]
 */
const BASE = process.argv[2] ?? 'http://localhost:3001';

const USERS = [
  { role: 'admin', email: 'admin@krashaq.dev', password: 'Admin@12345' },
  { role: 'supplier', email: 'supplier@krashaq.dev', password: 'Supplier@12345' },
  { role: 'farmer', email: 'farmer@krashaq.dev', password: 'Farmer@12345' },
];

const PAGES = [
  '/',
  '/chat',
  '/farmers',
  '/profile',
  '/profile/settings',
  '/auth/login',
  '/admin',
  '/admin/analytics',
  '/admin/audit',
  '/admin/config',
  '/admin/health',
  '/admin/scheduler',
  '/admin/users',
];

/** [method, path, expectedByRole: { admin, supplier, farmer }] */
const APIS = [
  ['GET', '/api/auth/me', { admin: 200, supplier: 200, farmer: 200 }],
  ['GET', '/api/farmers', { admin: 200, supplier: 200, farmer: 403 }],
  ['GET', '/api/suppliers/me/farmers', { admin: 403, supplier: 200, farmer: 403 }],
  ['GET', '/api/admin/dashboard', { admin: 200, supplier: 403, farmer: 403 }],
  ['GET', '/api/admin/users', { admin: 200, supplier: 403, farmer: 403 }],
  ['GET', '/api/admin/health', { admin: 200, supplier: 403, farmer: 403 }],
  ['GET', '/api/admin/analytics/llm', { admin: 200, supplier: 403, farmer: 403 }],
  ['GET', '/api/admin/analytics/llm/runs', { admin: 200, supplier: 403, farmer: 403 }],
  ['GET', '/api/admin/config', { admin: 200, supplier: 403, farmer: 403 }],
  ['GET', '/api/admin/audit-logs', { admin: 200, supplier: 403, farmer: 403 }],
  ['GET', '/api/messages/sessions', { admin: 200, supplier: 200, farmer: 200 }],
  ['GET', '/api/messages/starred', { admin: 200, supplier: 200, farmer: 200 }],
  ['GET', '/api/weather?city=Delhi', { admin: 200, supplier: 200, farmer: 200 }],
  ['GET', '/api/locations/states', { admin: 200, supplier: 200, farmer: 200 }],
];

const results = [];
let failures = 0;

function record(role, category, name, ok, detail) {
  results.push({ role, category, name, ok, detail });
  if (!ok) failures++;
}

async function fetchWithTimeout(url, options = {}, ms = 15000) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(ms) });
}

async function login(email, password) {
  const res = await fetchWithTimeout(`${BASE}/api/auth/login/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(data)}`);
  }
  if (data.requires_2fa) {
    throw new Error(`Login requires 2FA for ${email} — disable MFA on demo users first`);
  }
  return data.access_token;
}

async function probe(method, path, token, ms = 15000) {
  const res = await fetchWithTimeout(
    `${BASE}${path}`,
    {
      method,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    },
    ms
  );
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

async function main() {
  console.log(`\n🔍 Krashaq QA audit — ${BASE}\n`);

  // Unauthenticated page loads
  for (const page of PAGES) {
    const res = await fetchWithTimeout(`${BASE}${page}`, {}, 10000);
    record('anon', 'page', page, res.status === 200, `HTTP ${res.status}`);
  }

  for (const user of USERS) {
    console.log(`Testing role: ${user.role} (${user.email})`);
    let token;
    try {
      token = await login(user.email, user.password);
      record(user.role, 'auth', 'login', true, 'OK');
    } catch (e) {
      record(user.role, 'auth', 'login', false, e.message);
      continue;
    }

    const me = await probe('GET', '/api/auth/me', token);
    record(
      user.role,
      'auth',
      'GET /api/auth/me',
      me.status === 200 && me.body?.role === user.role,
      me.status === 200 ? `role=${me.body?.role}` : `HTTP ${me.status}`
    );

    for (const page of PAGES) {
      const res = await fetchWithTimeout(`${BASE}${page}`, {}, 10000);
      record(user.role, 'page', page, res.status === 200, `HTTP ${res.status}`);
    }

    for (const [method, path, expected] of APIS) {
      const exp = expected[user.role];
      const { status, body } = await probe(method, path, token);
      const ok = status === exp;
      record(
        user.role,
        'api',
        `${method} ${path}`,
        ok,
        ok ? `HTTP ${status}` : `expected ${exp}, got ${status}${body?.detail ? ` — ${body.detail}` : ''}`
      );
    }

    // Chat session create + list (functional)
    const sessionsBefore = await probe('GET', '/api/messages/sessions', token);
    if (sessionsBefore.status === 200) {
      record(user.role, 'feature', 'list chat sessions', true, `${sessionsBefore.body?.length ?? 0} sessions`);
    } else {
      record(user.role, 'feature', 'list chat sessions', false, `HTTP ${sessionsBefore.status}`);
    }

    const chatRes = await fetchWithTimeout(
      `${BASE}/api/chat`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: 'Hi' }),
      },
      60000
    );
    const chatBody = await chatRes.json().catch(() => ({}));
    record(
      user.role,
      'feature',
      'POST /api/chat',
      chatRes.status === 200 && Boolean(chatBody.reply ?? chatBody.response),
      chatRes.status === 200 ? 'reply received' : `HTTP ${chatRes.status} ${chatBody.detail ?? ''}`
    );

    // Profile PATCH
    const patchRes = await fetch(`${BASE}/api/auth/me`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: user.role === 'admin' ? 'Krashaq Admin' : undefined }),
    });
    if (user.role === 'admin') {
      record(
        user.role,
        'feature',
        'PATCH /api/auth/me',
        patchRes.status === 200,
        `HTTP ${patchRes.status}`
      );
    }

    // MFA endpoints reachable (should not 401)
    const mfaGet = await probe('GET', '/api/auth/2fa/backup-codes/generate', token);
    const mfaExpected = 200; // or 400 if MFA not enabled
    record(
      user.role,
      'feature',
      'GET backup codes status',
      mfaGet.status === 200 || mfaGet.status === 400,
      `HTTP ${mfaGet.status}`
    );

    // Farmers page API scoping for supplier
    if (user.role === 'supplier' && sessionsBefore.status === 200) {
      const farmers = await probe('GET', '/api/farmers', token);
      if (farmers.status === 200 && Array.isArray(farmers.body)) {
        const allScoped = farmers.body.every(
          (f) => !f.supplier_id || f.supplier_id === me.body?.id
        );
        record(user.role, 'feature', 'supplier farmer scope', allScoped, `${farmers.body.length} farmers`);
      }
    }
  }

  console.log('\n═══════════════════════════════════════════════════');
  console.log('SUMMARY');
  console.log('═══════════════════════════════════════════════════\n');

  const byRole = {};
  for (const r of results) {
    byRole[r.role] ??= { pass: 0, fail: 0, failed: [] };
    if (r.ok) byRole[r.role].pass++;
    else {
      byRole[r.role].fail++;
      byRole[r.role].failed.push(r);
    }
  }

  for (const [role, stats] of Object.entries(byRole)) {
    console.log(`${role.toUpperCase()}: ${stats.pass} pass, ${stats.fail} fail`);
    for (const f of stats.failed) {
      console.log(`  ✗ [${f.category}] ${f.name} — ${f.detail}`);
    }
  }

  console.log(`\nTotal: ${results.length - failures} passed, ${failures} failed\n`);
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
