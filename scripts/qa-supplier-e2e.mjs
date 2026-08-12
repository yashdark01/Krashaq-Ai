#!/usr/bin/env node
/** E2E API checks for supplier license + onboarding flows */
const BASE = process.argv[2] ?? 'http://localhost:3001';

async function login(email, password) {
  const res = await fetch(`${BASE}/api/auth/login/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`${email}: ${data.detail || res.status}`);
  return data.access_token;
}

async function main() {
  const results = [];
  const pass = (name, detail = 'OK') => {
    results.push({ name, ok: true, detail });
    console.log(`✓ ${name} — ${detail}`);
  };
  const fail = (name, detail) => {
    results.push({ name, ok: false, detail });
    console.log(`✗ ${name} — ${detail}`);
  };

  console.log(`\nSupplier E2E — ${BASE}\n`);

  let adminToken;
  try {
    adminToken = await login('admin@krashaq.dev', 'Admin@12345');
    pass('Admin login');
  } catch (e) {
    fail('Admin login', e.message);
    process.exit(1);
  }

  const listRes = await fetch(`${BASE}/api/admin/suppliers`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  if (listRes.ok) {
    const d = await listRes.json();
    pass('List suppliers', `${d.items?.length ?? 0} suppliers`);
  } else fail('List suppliers', String(listRes.status));

  const testEmail = `supplier-test-${Date.now()}@krashaq.dev`;
  const onboardRes = await fetch(`${BASE}/api/admin/suppliers`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: testEmail,
      password: 'TestSupplier@123',
      name: 'Test Supplier',
      company_name: 'Test Agro Co',
      plan: 'starter',
    }),
  });
  let newSupplierId;
  if (onboardRes.ok) {
    const s = await onboardRes.json();
    newSupplierId = s.id;
    pass('Onboard supplier', `${s.email} plan=${s.license?.plan}`);
  } else {
    const d = await onboardRes.json();
    fail('Onboard supplier', d.detail || String(onboardRes.status));
  }

  if (newSupplierId) {
    const detailRes = await fetch(`${BASE}/api/admin/suppliers/${newSupplierId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (detailRes.ok) pass('Supplier detail');
    else fail('Supplier detail', String(detailRes.status));

    let supplierToken;
    try {
      supplierToken = await login(testEmail, 'TestSupplier@123');
      pass('New supplier login');
    } catch (e) {
      fail('New supplier login', e.message);
    }

    if (supplierToken) {
      const lic = await fetch(`${BASE}/api/supplier/license`, {
        headers: { Authorization: `Bearer ${supplierToken}` },
      });
      if (lic.ok) {
        const d = await lic.json();
        pass('Supplier license API', `${d.seats_used}/${d.license?.max_farmers} seats`);
      } else fail('Supplier license API', String(lic.status));

      const alertRes = await fetch(`${BASE}/api/supplier/alerts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supplierToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'Morning weather',
          alert_type: 'weather',
          schedule: { frequency: 'daily', hour: 7, minute: 0, timezone: 'Asia/Kolkata' },
          target: { mode: 'all_farmers' },
        }),
      });
      if (alertRes.ok) pass('Create farmer alert');
      else fail('Create farmer alert', String(alertRes.status));
    }

    const suspendRes = await fetch(`${BASE}/api/admin/suppliers/${newSupplierId}/suspend`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ reason: 'E2E test suspend' }),
    });
    if (suspendRes.ok) pass('Suspend supplier');
    else fail('Suspend supplier', String(suspendRes.status));

    try {
      await login(testEmail, 'TestSupplier@123');
      fail('Suspended supplier login', 'should have been blocked');
    } catch (e) {
      pass('Suspended supplier blocked', e.message);
    }

    await fetch(`${BASE}/api/admin/suppliers/${newSupplierId}/suspend`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
  }

  const failures = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failures}/${results.length} passed\n`);
  process.exit(failures ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
