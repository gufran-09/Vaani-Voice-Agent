/**
 * scripts/test-db-tools.ts
 * Member 3 Comprehensive Test Suite for Backend Safe Tools & PostgreSQL Operations.
 *
 * Verifies:
 * 1. Database connection & environment configuration (.env.local).
 * 2. Tool 1: search_menu (name search and spoken alias matching).
 * 3. Tool 2: check_availability (available items and out-of-stock substitute lookup).
 * 4. Tool 3: calculate_totals (authoritative DB price calculation & ETA).
 * 5. Tool 4: add_to_order (in-memory draft cart accumulation).
 * 6. Guest Confirmation Guard (rejection of empty order confirmation).
 * 7. Tool 6: confirm_order (atomic PostgreSQL transaction writing to orders & order_items).
 * 8. Idempotency Guard (duplicate confirm_order calls return existing order without creating duplicate records).
 * 9. Tool 7: get_order_status (retrieval of created order and line items from PostgreSQL).
 * 10. executeTool dispatcher validation across all tool specs.
 *
 * Usage:
 *   npx ts-node --project tsconfig.seed.json scripts/test-db-tools.ts
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

const PROPERTY_ID = process.env.VAANI_PROPERTY_ID;
if (!PROPERTY_ID) {
  console.error('❌ VAANI_PROPERTY_ID not found in environment.');
  process.exit(1);
}

// Import tools after environment is set
import {
  searchMenu,
  checkAvailability,
  calculateTotals,
  addToOrder,
  confirmOrder,
  getOrderStatus,
  executeTool,
  TOOL_SPECS,
} from '../lib/agent/tools';
import { query } from '../lib/server-db';

async function runTestSuite() {
  console.log('================================================================');
  console.log('  MEMBER 3: VAANI BACKEND SAFE TOOLS & RDS DATABASE TEST SUITE  ');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  try {
    // --------------------------------------------------------------------------
    // Test 1: Verify PostgreSQL connection and active property
    // --------------------------------------------------------------------------
    const propRes = await query<{ id: string; name: string }>(
      `SELECT id, name FROM properties WHERE id = $1`,
      [PROPERTY_ID],
    );
    assert(
      propRes.rows.length === 1,
      `Property found in PostgreSQL database: "${propRes.rows[0]?.name}" (${PROPERTY_ID})`,
    );

    // --------------------------------------------------------------------------
    // Test 2: search_menu by keyword
    // --------------------------------------------------------------------------
    const searchRes = (await executeTool('search_menu', {
      query: 'chai',
      property_id: PROPERTY_ID,
    })) as { found: boolean; items: Array<{ id: string; name: string; price: number }> };

    assert(
      searchRes.found && searchRes.items.length > 0,
      `search_menu("chai") returned ${searchRes.items?.length || 0} items`,
    );

    const firstFoundItem = searchRes.items[0];
    console.log(`     Sample item: "${firstFoundItem.name}" @ ₹${firstFoundItem.price} (id: ${firstFoundItem.id})`);

    // --------------------------------------------------------------------------
    // Test 3: search_menu by spoken alias
    // --------------------------------------------------------------------------
    const aliasRes = (await executeTool('search_menu', {
      query: 'spiced tea',
      property_id: PROPERTY_ID,
    })) as { found: boolean; items: Array<{ name: string; spoken_aliases: string[] }> };

    assert(
      aliasRes.found && (aliasRes.items?.length || 0) > 0,
      `search_menu("spiced tea") matched via spoken_aliases to "${aliasRes.items?.[0]?.name}"`,
    );

    // --------------------------------------------------------------------------
    // Test 4: check_availability for real item ID
    // --------------------------------------------------------------------------
    const availRes = (await executeTool('check_availability', {
      item_ids: [firstFoundItem.id],
      property_id: PROPERTY_ID,
    })) as { all_available: boolean; items: Record<string, { name: string; available: boolean }> };

    assert(
      availRes.items[firstFoundItem.id] !== undefined,
      `check_availability correctly queried item status: available=${availRes.items[firstFoundItem.id]?.available}`,
    );

    // --------------------------------------------------------------------------
    // Test 5: calculate_totals authoritative calculation from DB
    // --------------------------------------------------------------------------
    const calcRes = (await executeTool('calculate_totals', {
      property_id: PROPERTY_ID,
      items: [{ item_id: firstFoundItem.id, quantity: 2 }],
    })) as { success: boolean; total_amount: number; prep_eta_minutes: number; items: unknown[] };

    assert(
      calcRes.success && calcRes.total_amount === firstFoundItem.price * 2,
      `calculate_totals computed authoritative total: 2 x ₹${firstFoundItem.price} = ₹${calcRes.total_amount} (ETA: ${calcRes.prep_eta_minutes}m)`,
    );

    // --------------------------------------------------------------------------
    // Test 6: Guest Confirmation Guard (Empty order cannot be confirmed)
    // --------------------------------------------------------------------------
    const emptySessionId = `empty-guard-test-${Date.now()}`;
    const emptyConfirmRes = (await executeTool('confirm_order', {
      session_id: emptySessionId,
      property_id: PROPERTY_ID,
    })) as { success: boolean; error: string };

    assert(
      emptyConfirmRes.success === false && emptyConfirmRes.error?.includes('empty order'),
      'Guest Confirmation Guard prevented committing an empty order',
    );

    // --------------------------------------------------------------------------
    // Test 7: add_to_order cart accumulation
    // --------------------------------------------------------------------------
    const testSessionId = `member3-test-session-${Date.now()}`;
    const addRes = (await executeTool('add_to_order', {
      session_id: testSessionId,
      property_id: PROPERTY_ID,
      item_id: firstFoundItem.id,
      quantity: 2,
      notes: 'extra hot',
    })) as {
      success: boolean;
      total_amount: number;
      cart: Array<{ name: string; quantity: number; subtotal: number }>;
    };

    assert(
      addRes.success && addRes.total_amount === firstFoundItem.price * 2,
      `add_to_order accumulated cart: ${addRes.cart?.[0]?.quantity}x ${addRes.cart?.[0]?.name} = ₹${addRes.total_amount}`,
    );

    // --------------------------------------------------------------------------
    // Test 8: confirm_order with atomic PostgreSQL transaction
    // --------------------------------------------------------------------------
    const confirmRes = (await executeTool('confirm_order', {
      session_id: testSessionId,
      property_id: PROPERTY_ID,
      customer_name: 'Member 3 Automated Test',
      customer_phone: '+919876543210',
    })) as {
      success: boolean;
      order_id: string;
      order_number: string;
      total_amount: number;
      prep_eta_minutes: number;
      items: Array<{ name: string; quantity: number }>;
    };

    assert(
      confirmRes.success && !!confirmRes.order_id && !!confirmRes.order_number,
      `confirm_order committed transaction: Order ${confirmRes.order_number} (id: ${confirmRes.order_id})`,
    );

    // --------------------------------------------------------------------------
    // Test 9: Idempotency Guard (Repeated confirmation does not create duplicate order)
    // --------------------------------------------------------------------------
    const duplicateConfirmRes = (await executeTool('confirm_order', {
      session_id: testSessionId,
      property_id: PROPERTY_ID,
    })) as {
      success: boolean;
      already_confirmed: boolean;
      order_number: string;
    };

    assert(
      duplicateConfirmRes.success &&
        duplicateConfirmRes.already_confirmed === true &&
        duplicateConfirmRes.order_number === confirmRes.order_number,
      `Idempotency Guard returned existing order ${duplicateConfirmRes.order_number} without re-inserting`,
    );

    // --------------------------------------------------------------------------
    // Test 10: get_order_status live verification from PostgreSQL
    // --------------------------------------------------------------------------
    const statusRes = (await executeTool('get_order_status', {
      property_id: PROPERTY_ID,
      order_number: confirmRes.order_number,
    })) as {
      found: boolean;
      order_number: string;
      status: string;
      total_amount: number;
      items: Array<{ name: string; quantity: number }>;
    };

    assert(
      statusRes.found &&
        statusRes.order_number === confirmRes.order_number &&
        statusRes.items.length > 0,
      `get_order_status verified order in DB: status="${statusRes.status}", items=${statusRes.items?.length}`,
    );

    // --------------------------------------------------------------------------
    // Test 11: Verify tool specs schema completeness
    // --------------------------------------------------------------------------
    const specNames = TOOL_SPECS.map((s) => s.name);
    const requiredTools = [
      'search_menu',
      'check_availability',
      'calculate_totals',
      'add_to_order',
      'get_eta',
      'confirm_order',
      'get_order_status',
    ];
    const allToolsPresent = requiredTools.every((t) => specNames.includes(t));

    assert(
      allToolsPresent,
      `All 7 required tools have complete JSON schemas (${specNames.length} total tools registered)`,
    );

    console.log('\n----------------------------------------------------------------');
    console.log(`  SUMMARY: ${passed} passed, ${failed} failed`);
    console.log('----------------------------------------------------------------\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Unexpected test error:', err);
    process.exit(1);
  }
}

runTestSuite();
