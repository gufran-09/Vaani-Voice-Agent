/**
 * scripts/test-db-tools.ts
 * Tests search_menu + confirm_order WITHOUT needing the LLM.
 * Run: npx ts-node --project tsconfig.seed.json scripts/test-db-tools.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';

// Load .env
const envPath = path.resolve(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^([^#=\s]+)\s*=\s*(.*)/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const DB_URL = process.env.DATABASE_URL!;
const PROPERTY_ID = process.env.VAANI_PROPERTY_ID!;

const pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  console.log('\n🔬 DB TOOLS TEST (no LLM needed)\n');

  // 1. Search menu
  const r1 = await pool.query(
    `SELECT id, name, price, availability, spoken_aliases FROM menu_items
     WHERE property_id = $1 AND (name ILIKE $2 OR $3 = ANY(spoken_aliases))
     LIMIT 3`,
    [PROPERTY_ID, '%chai%', 'chai'],
  );
  console.log('✅ search_menu("chai"):', r1.rows);

  // 2. Check all menu items exist
  const r2 = await pool.query(
    `SELECT COUNT(*)::int as total, 
     SUM(CASE WHEN availability='available' THEN 1 ELSE 0 END)::int as available
     FROM menu_items WHERE property_id = $1`,
    [PROPERTY_ID],
  );
  console.log(`\n✅ Menu items: ${r2.rows[0].total} total, ${r2.rows[0].available} available`);

  // 3. Simulate confirm_order — write a test order
  const conn = await pool.connect();
  try {
    await conn.query('BEGIN');
    const numRes = await conn.query(
      `SELECT COUNT(*)::text as count FROM orders WHERE property_id = $1`, [PROPERTY_ID],
    );
    const orderNum = `ORD-${String(parseInt(numRes.rows[0].count) + 101).padStart(3, '0')}`;

    const orderRes = await conn.query<{ id: string }>(
      `INSERT INTO orders (property_id, order_number, status, channel, customer_name, customer_phone, total_amount, prep_eta_minutes)
       VALUES ($1, $2, 'received', 'voice', $3, $4, $5, $6) RETURNING id`,
      [PROPERTY_ID, orderNum, 'Test Customer', '+919999999999', 150, 7],
    );
    const orderId = orderRes.rows[0].id;

    // Get a real item ID to insert
    const itemRes = await pool.query<{ id: string; name: string; price: number }>(
      `SELECT id, name, price FROM menu_items WHERE property_id = $1 LIMIT 1`, [PROPERTY_ID],
    );
    const item = itemRes.rows[0];

    await conn.query(
      `INSERT INTO order_items (order_id, menu_item_id, name, price, quantity) VALUES ($1, $2, $3, $4, $5)`,
      [orderId, item.id, item.name, item.price, 1],
    );

    await conn.query('COMMIT');
    console.log(`\n✅ confirm_order wrote: ${orderNum} (id: ${orderId})`);
    console.log(`   Item: 1x ${item.name} @ ₹${item.price}`);
    console.log('\n✅ All DB tools working — ready for LLM integration!');
  } catch (e) {
    await conn.query('ROLLBACK');
    console.error('❌ DB write failed:', e);
  } finally {
    conn.release();
    await pool.end();
  }
}

run().catch((e) => { console.error(e); process.exit(1); });
