#!/usr/bin/env node
/**
 * Wipe dev MongoDB collections and seed 3 demo users (admin, supplier, farmer).
 * Usage: npm run db:reset [-- --force]
 */
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

const DEMO_USERS = [
  {
    email: 'admin@krashaq.dev',
    password: 'Admin@12345',
    name: 'Krashaq Admin',
    role: 'admin',
  },
  {
    email: 'supplier@krashaq.dev',
    password: 'Supplier@12345',
    name: 'Agro Supply Co',
    role: 'supplier',
  },
  {
    email: 'farmer@krashaq.dev',
    password: 'Farmer@12345',
    name: 'Ram Kumar',
    role: 'farmer',
  },
];

const LOCATION = {
  state: 'Madhya Pradesh',
  district: 'Bhopal',
  tehsil: 'Huzur',
  locality: 'Arera Colony',
  pincode: '462016',
};

const COLLECTIONS_TO_DROP = ['users', 'refresh_tokens', 'chat_sessions', 'email_logs', 'supplier_licenses', 'farmer_subscriptions', 'farmer_alerts', 'audit_logs', 'notifications', 'alert_runs', 'platform_jobs'];

async function main() {
  if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
    console.error('Refusing to reset database in production. Pass --force to override.');
    process.exit(1);
  }

  const url = process.env.MONGODB_URL ?? 'mongodb://localhost:27017';
  const dbName = process.env.MONGODB_DB ?? 'krashaq';

  console.log(`Connecting to ${url} (db: ${dbName})...`);
  const client = new MongoClient(url, { serverSelectionTimeoutMS: 10000 });
  await client.connect();
  const db = client.db(dbName);

  for (const name of COLLECTIONS_TO_DROP) {
    const exists = await db.listCollections({ name }).hasNext();
    if (exists) {
      await db.collection(name).drop();
      console.log(`  dropped: ${name}`);
    }
  }

  const users = db.collection('users');
  const chatSessions = db.collection('chat_sessions');

  await users.createIndex({ email: 1 }, { unique: true });
  await chatSessions.createIndex({ user_id: 1, updated_at: -1 });
  await db.collection('refresh_tokens').createIndex({ token: 1 });

  const ids = {
    admin: randomUUID(),
    supplier: randomUUID(),
    farmer: randomUUID(),
  };

  const now = new Date();

  for (const demo of DEMO_USERS) {
    const id =
      demo.role === 'admin' ? ids.admin : demo.role === 'supplier' ? ids.supplier : ids.farmer;
    const passwordHash = await bcrypt.hash(demo.password, 12);
    await users.insertOne({
      _id: id,
      email: demo.email,
      name: demo.name,
      company_name: demo.role === 'supplier' ? demo.name : undefined,
      password_hash: passwordHash,
      role: demo.role,
      supplier_id: demo.role === 'farmer' ? ids.supplier : null,
      location: LOCATION,
      language: 'hi',
      is_active: true,
      email_verified: true,
      two_factor_enabled: false,
      phone_verified: false,
      onboarded_by: demo.role === 'supplier' ? ids.admin : undefined,
      created_at: now,
      updated_at: now,
    });
  }

  const licenses = db.collection('supplier_licenses');
  const validUntil = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  await licenses.insertOne({
    _id: randomUUID(),
    supplier_id: ids.supplier,
    plan: 'growth',
    max_farmers: 100,
    status: 'active',
    valid_from: now,
    valid_until: validUntil,
    features: { alerts: true, whatsapp: true, advanced_analytics: false },
    created_at: now,
    updated_by: ids.admin,
  });

  const subs = db.collection('farmer_subscriptions');
  const farmerValidUntil = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  await subs.insertOne({
    _id: randomUUID(),
    farmer_id: ids.farmer,
    supplier_id: ids.supplier,
    plan: 'standard',
    status: 'active',
    price_inr: 249,
    valid_from: now,
    valid_until: farmerValidUntil,
    features: { chat: true, weather: true, alerts: true, advanced_advisory: false },
    created_at: now,
    updated_by: ids.supplier,
  });

  // Farmer user record linked to supplier (for supplier farmer list via users collection)
  await users.updateOne(
    { _id: ids.farmer },
    { $set: { phone: '+919876543210', updated_at: now } }
  );

  // One demo chat per user
  for (const [role, userId] of Object.entries(ids)) {
    const sessionId = `sess_${randomUUID()}`;
    await chatSessions.insertOne({
      session_id: sessionId,
      user_id: userId,
      title: `Welcome ${role} chat`,
      messages: [
        {
          id: randomUUID(),
          role: 'user',
          content: 'What crops grow well in Bhopal?',
          timestamp: now,
        },
        {
          id: randomUUID(),
          role: 'assistant',
          content:
            'In Bhopal (Madhya Pradesh), wheat, soybean, and pulses do well in rabi season. For kharif, consider paddy and maize based on your soil and water availability.',
          timestamp: now,
        },
      ],
      created_at: now,
      updated_at: now,
    });
  }

  await client.close();

  console.log('\n✓ Database reset complete.\n');
  console.log('Demo accounts:');
  console.log('  Admin:    admin@krashaq.dev    / Admin@12345');
  console.log('  Supplier: supplier@krashaq.dev / Supplier@12345');
  console.log('  Farmer:   farmer@krashaq.dev   / Farmer@12345');
  console.log('\nEach user has 1 sample chat session.');

  console.log('\nIngesting knowledge base (content/kb)…');
  const ingest = spawnSync('node', ['scripts/kb-ingest.mjs', '--force'], {
    cwd: process.cwd(),
    stdio: 'inherit',
  });
  if (ingest.status !== 0) {
    console.warn('kb:ingest failed — run manually: npm run kb:ingest');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
