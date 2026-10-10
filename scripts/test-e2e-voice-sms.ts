/**
 * scripts/test-e2e-voice-sms.ts
 *
 * Comprehensive End-to-End Verification of:
 * 1. Indian Phone number normalization (+91...) and safety
 * 2. Real PostgreSQL Menu Retrieval via searchMenu
 * 3. Two-Step Draft Order Lifecycle (addToOrder)
 * 4. Confirmation Guard: prevents confirmation of empty order
 * 5. Atomic PostgreSQL Commit with Real Transaction (confirmOrder)
 * 6. Database Verification (orders and order_items tables)
 * 7. Mock SMS Notification Verification (notifications table with status 'simulated' and SIMULATED - NOT SENT label)
 * 8. Non-fatal SMS Isolation (order is preserved even if SMS fails)
 */

import * as fs from 'fs';
import * as path from 'path';

// ─── Environment Loader ───────────────────────────────────────────────────────
const envLocalPath = path.resolve(__dirname, '..', '.env.local');
const envPath = path.resolve(__dirname, '..', '.env');
const targetEnv = fs.existsSync(envLocalPath) ? envLocalPath : envPath;

if (fs.existsSync(targetEnv)) {
  const lines = fs.readFileSync(targetEnv, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^([^#=\s]+)\s*=\s*(.*)/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].trim();
    }
  }
}

const PROPERTY_ID = process.env.VAANI_PROPERTY_ID || '62e1b115-9382-40f8-853a-0a773735d034';

import { query, getDbPool } from '../lib/server-db';
import { addToOrder, confirmOrder, getDraft, searchMenu } from '../lib/agent/tools';
import { normalizeIndianPhoneNumber } from '../lib/sms';

async function runE2ETests() {
  console.log('\n======================================================');
  console.log('🚀 RUNNING VAANI E2E VOICE & MOCK SMS INTEGRATION SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
      failed++;
    }
  }

  try {
    const testSessionId = `e2e-session-${Date.now()}`;
    const testPhone = '9876543210';
    const testCustomer = 'Rohan Sharma';

    // TEST 1: Phone Normalization
    console.log('[Test 1: Indian Phone Number Normalization]');
    const res1 = normalizeIndianPhoneNumber('9876543210');
    const res2 = normalizeIndianPhoneNumber('+91 98765 43210');
    const res3 = normalizeIndianPhoneNumber('09876543210');
    const resInvalid = normalizeIndianPhoneNumber('12345');

    assert(Boolean(res1.valid && res1.normalized === '+919876543210'), 'Normalizes 10-digit number to +919876543210');
    assert(Boolean(res2.valid && res2.normalized === '+919876543210'), 'Normalizes formatted number to +919876543210');
    assert(Boolean(res3.valid && res3.normalized === '+919876543210'), 'Normalizes 11-digit leading 0 to +919876543210');
    assert(!resInvalid.valid, 'Rejects invalid phone numbers without guessing');

    // TEST 2: PostgreSQL Real Menu Item Retrieval
    console.log('\n[Test 2: PostgreSQL Menu Retrieval]');
    const menuResult = await searchMenu({ property_id: PROPERTY_ID, query: 'coffee' });
    assert(menuResult.found === true, 'Successfully queried menu items');
    assert(Boolean(menuResult.items && menuResult.items.length > 0), `Found ${menuResult.items?.length} coffee items`);
    const coffeeItem = menuResult.items![0];
    console.log(`  Selected item for test order: ${coffeeItem.name} @ ₹${coffeeItem.price}`);

    // TEST 3: Confirmation Guard: Prevents Confirmation on Empty Cart
    console.log('\n[Test 3: Confirmation Guard on Empty Cart]');
    const emptySessionId = `empty-session-${Date.now()}`;
    const unconfirmedAttempt = await confirmOrder({
      session_id: emptySessionId,
      property_id: PROPERTY_ID,
      customer_name: testCustomer,
      customer_phone: testPhone,
    });
    assert(unconfirmedAttempt.success === false, 'Blocked confirmation on empty cart');
    assert(unconfirmedAttempt.error?.includes('Cannot confirm empty order') === true, 'Returned empty order error');

    // TEST 4: Draft Session Creation (Two-Step Safety Protocol)
    console.log('\n[Test 4: Draft Order Lifecycle]');
    const addResult = await addToOrder({
      session_id: testSessionId,
      property_id: PROPERTY_ID,
      item_id: coffeeItem.id,
      quantity: 2,
      notes: 'hot and strong',
    });
    assert(addResult.success === true, 'Added 2 items to draft order session');
    assert(addResult.total_amount === coffeeItem.price * 2, `Total calculated as ₹${coffeeItem.price * 2}`);

    const draft = getDraft(testSessionId);
    assert(draft !== undefined, 'Draft stored in session memory');
    assert(draft?.items.length === 1, 'Draft contains 1 item entry');

    // TEST 5: Atomic PostgreSQL Commit with Real Transaction
    console.log('\n[Test 5: Real PostgreSQL Order Persistence]');
    const confirmResult = await confirmOrder({
      session_id: testSessionId,
      property_id: PROPERTY_ID,
      customer_name: testCustomer,
      customer_phone: testPhone,
    });

    assert(confirmResult.success === true, 'confirmOrder succeeded');
    assert(Boolean(confirmResult.order_id), `Created real database order_id: ${confirmResult.order_id}`);
    assert(Boolean(confirmResult.order_number), `Generated sequential order number: ${confirmResult.order_number}`);

    // TEST 6: Verify Database Records in PostgreSQL
    console.log('\n[Test 6: Database Verification]');
    if (process.env.DATABASE_URL) {
      const orderDbCheck = await query<{ id: string; status: string; total_amount: string; customer_phone: string }>(
        'SELECT id, status, total_amount, customer_phone FROM orders WHERE id = $1',
        [confirmResult.order_id!]
      );
      assert(orderDbCheck.rows.length === 1, 'Order row exists in PostgreSQL orders table');
      assert(orderDbCheck.rows[0].status === 'received', 'Order status is received (in kitchen queue)');
      assert(Number(orderDbCheck.rows[0].total_amount) === coffeeItem.price * 2, 'Total amount matches exactly in database');

      const itemsDbCheck = await query<{ id: string; name: string; quantity: number }>(
        'SELECT id, name, quantity FROM order_items WHERE order_id = $1',
        [confirmResult.order_id!]
      );
      assert(itemsDbCheck.rows.length === 1, 'order_items row exists in PostgreSQL');
      assert(itemsDbCheck.rows[0].quantity === 2, 'Item quantity matches 2 in database');
    } else {
      assert(Boolean(confirmResult.order_id), 'Order ID generated successfully');
      assert(confirmResult.total_amount === coffeeItem.price * 2, 'Total amount calculated accurately');
      assert(Boolean(confirmResult.items && confirmResult.items.length === 1), 'Order items verified');
    }

    // TEST 7: Mock SMS Trigger & PostgreSQL Persistence
    console.log('\n[Test 7: Mock SMS Notification Verification]');
    assert(Boolean(confirmResult.mock_sms), 'confirmOrder returned mock_sms payload');
    assert(confirmResult.mock_sms?.status === 'simulated', 'Mock SMS status is explicitly "simulated"');
    assert(confirmResult.mock_sms?.recipient === '+919876543210', 'Mock SMS recipient phone normalized to +919876543210');
    assert(Boolean(confirmResult.mock_sms?.label === 'SIMULATED — NOT SENT'), 'Mock SMS bears label "SIMULATED — NOT SENT"');
    assert(Boolean(confirmResult.mock_sms?.message.includes(confirmResult.order_number!)), 'Message text contains real order number');

    if (process.env.DATABASE_URL) {
      const notifDbCheck = await query<{ id: string; channel: string; recipient: string; status: string }>(
        'SELECT id, channel, recipient, status FROM notifications WHERE related_entity_id = $1',
        [confirmResult.order_id!]
      );
      assert(notifDbCheck.rows.length === 1, 'Mock SMS persisted to notifications table in PostgreSQL');
      assert(notifDbCheck.rows[0].status === 'simulated', 'Notification database status is "simulated"');
      assert(notifDbCheck.rows[0].channel === 'sms', 'Notification channel is "sms"');
    } else {
      assert(Boolean(confirmResult.mock_sms?.label), 'Mock SMS has explicit safety label');
    }

    // TEST 8: Non-fatal SMS Isolation (Order is preserved even if SMS fails)
    console.log('\n[Test 8: SMS Failure Isolation]');
    const session2 = `e2e-session-sms-fail-${Date.now()}`;
    await addToOrder({
      session_id: session2,
      property_id: PROPERTY_ID,
      item_id: coffeeItem.id,
      quantity: 1,
    });
    // Confirm with invalid phone that cannot receive SMS
    const confirm2 = await confirmOrder({
      session_id: session2,
      property_id: PROPERTY_ID,
      customer_name: 'No Phone Guest',
      customer_phone: 'invalid-phone',
    });
    assert(confirm2.success === true, 'Order still successfully committed despite unnormalizable phone');
    assert(Boolean(confirm2.order_id), 'Order ID created in database');
    assert(confirm2.mock_sms?.status === 'failed', 'Mock SMS safely flagged as status: "failed"');

    console.log('\n======================================================');
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');
  } catch (err) {
    console.error('Fatal error during E2E verification:', err);
    failed++;
  } finally {
    if (process.env.DATABASE_URL) {
      try {
        const pool = getDbPool();
        await pool.end();
      } catch (_) {}
    }
    process.exit(failed > 0 ? 1 : 0);
  }
}

runE2ETests();
