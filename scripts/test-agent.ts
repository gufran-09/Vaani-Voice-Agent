/**
 * scripts/test-agent.ts
 * End-to-end test for the /api/agent/chat endpoint.
 * Run AFTER the daily Bedrock token quota resets (5:30 AM IST).
 *
 * Usage:
 *   npx ts-node --project tsconfig.seed.json scripts/test-agent.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

// Load .env
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^([^#=\s]+)\s*=\s*(.*)/);
    if (match) {
      const [, key, val] = match;
      if (!process.env[key]) process.env[key] = val.trim();
    }
  }
}

const BASE_URL = 'http://localhost:3000';
const SESSION_ID = `test-session-${Date.now()}`;

// ─── HTTP helper ─────────────────────────────────────────────────────────────

function post(path: string, body: object): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { resolve(raw); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// ─── Test helpers ─────────────────────────────────────────────────────────────

function log(label: string, data: unknown) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`  ${label}`);
  console.log(`${'─'.repeat(60)}`);
  console.log(JSON.stringify(data, null, 2));
}

async function say(transcript: string) {
  const result = await post('/api/agent/chat', {
    callId: 'test-call-001',
    sessionId: SESSION_ID,
    transcript,
    callerPhone: '+919876543210',
  });
  log(`👤 "${transcript}"`, result);
  return result as { reply: string; orderCreated?: object };
}

// ─── Test sequence ─────────────────────────────────────────────────────────────

async function runTests() {
  console.log('\n🚀 VAANI AGENT END-TO-END TEST');
  console.log(`   Session: ${SESSION_ID}`);
  console.log(`   Base URL: ${BASE_URL}\n`);

  // Test 1: Health check
  const health = await new Promise<string>((resolve, reject) => {
    http.get('http://localhost:3000/api/agent/chat', (res) => {
      let raw = '';
      res.on('data', (d) => { raw += d; });
      res.on('end', () => resolve(raw));
    }).on('error', reject);
  });
  log('🟢 Health Check GET /api/agent/chat', JSON.parse(health));

  // Test 2: Order masala chai (code-mix)
  await say('Ek masala chai dena');

  // Test 3: Add more items
  await say('And 2 Gulab Jamun as well');

  // Test 4: Ask for total (get_eta will fire)
  await say('Kitna total hai and how long will it take?');

  // Test 5: Confirm order
  const result = await say('Haan confirm karo');

  if (result.orderCreated) {
    console.log('\n✅ ORDER CREATED IN DATABASE!');
    console.log('   Order number:', (result.orderCreated as { orderNumber: string }).orderNumber);
    console.log('   Total:', (result.orderCreated as { totalAmount: number }).totalAmount);
    console.log('   ETA:', (result.orderCreated as { etaMinutes: number }).etaMinutes, 'minutes');
  } else {
    console.log('\n⚠️  Order not yet confirmed — check reply above.');
  }

  // Test 6: New session — test cancel flow
  const cancelSession = `cancel-session-${Date.now()}`;
  console.log('\n\n--- Cancel Flow Test ---');
  const r1 = await post('/api/agent/chat', { callId: 'test-2', sessionId: cancelSession, transcript: 'I want a cappuccino' });
  log('👤 "I want a cappuccino"', r1);
  const r2 = await post('/api/agent/chat', { callId: 'test-2', sessionId: cancelSession, transcript: 'Nahi cancel karo' });
  log('👤 "Nahi cancel karo"', r2);

  console.log('\n\n✅ ALL TESTS COMPLETE');
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err.message ?? err);
  process.exit(1);
});
