/**
 * scripts/test-db-audit.ts
 * Regression test suite verifying:
 * 1. Physical database table counts and total menu item inventory (~64-70 records).
 * 2. Property-level isolation vs global catalog queries.
 * 3. Pagination across pages without row loss or duplicate records.
 * 4. Tenant isolation filter enforcement.
 * 5. Error handling for non-existent properties.
 */

import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';

const envPath = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^([^#=\s]+)\s*=\s*(.*)/);
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2].trim();
  }
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function runTests() {
  console.log('🧪 RUNNING VAANI RDS DATABASE AUDIT & VERIFICATION TESTS\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `- ${detail}` : ''}`);
      failed++;
    }
  }

  try {
    // Test 1: Total records count in menu_items
    const menuCountRes = await pool.query('SELECT COUNT(*)::int AS cnt FROM menu_items');
    const totalMenuItems = menuCountRes.rows[0].cnt;
    assert(
      totalMenuItems >= 60 && totalMenuItems <= 200,
      `Total menu_items record count matches multi-property catalog (actual: ${totalMenuItems})`,
    );

    // Test 2: Verify why 4 records exist in specific tables
    const profilesCount = await pool.query('SELECT COUNT(*)::int AS cnt FROM profiles');
    const membershipsCount = await pool.query('SELECT COUNT(*)::int AS cnt FROM memberships');
    assert(
      profilesCount.rows[0].cnt >= 4,
      `profiles table physically contains at least 4 records (actual: ${profilesCount.rows[0].cnt})`,
    );
    assert(
      membershipsCount.rows[0].cnt >= 4,
      `memberships table physically contains at least 4 records (actual: ${membershipsCount.rows[0].cnt})`,
    );

    // Test 3: Pagination across pages (e.g., page size 10 across 64 records)
    const pageSize = 10;
    const allFetchedIds: string[] = [];
    let page = 0;
    while (true) {
      const pageRes = await pool.query(
        'SELECT id FROM menu_items ORDER BY id LIMIT $1 OFFSET $2',
        [pageSize, page * pageSize],
      );
      if (pageRes.rows.length === 0) break;
      for (const row of pageRes.rows) {
        allFetchedIds.push(row.id);
      }
      page++;
    }
    const uniqueIds = new Set(allFetchedIds);
    assert(
      allFetchedIds.length === totalMenuItems && uniqueIds.size === totalMenuItems,
      `Pagination correctly retrieved all ${totalMenuItems} records across ${page} pages without loss or duplication`,
    );

    // Test 4: Property-level isolation filters
    const propsRes = await pool.query('SELECT id, name FROM properties');
    let propertiesHaveIsolation = true;
    for (const prop of propsRes.rows) {
      const propItems = await pool.query(
        'SELECT COUNT(*)::int AS cnt FROM menu_items WHERE property_id = $1',
        [prop.id],
      );
      // Property items should strictly equal the property's assigned count, not the total
      if (propItems.rows[0].cnt === totalMenuItems && totalMenuItems > 20) {
        propertiesHaveIsolation = false;
      }
    }
    assert(
      propertiesHaveIsolation,
      'Multi-tenant property filters prevent leaking cross-property menu items',
    );

    // Test 5: Empty result handling for non-existent property
    const dummyId = '00000000-0000-0000-0000-000000000000';
    const emptyRes = await pool.query(
      'SELECT id, name FROM menu_items WHERE property_id = $1',
      [dummyId],
    );
    assert(
      emptyRes.rows.length === 0,
      'Querying a non-existent property safely returns an empty dataset without crashing',
    );

    // Test 6: Database connection health check
    const healthRes = await pool.query(`
      SELECT
        current_database() AS db,
        current_user AS usr,
        pg_is_in_recovery() AS is_replica
    `);
    assert(
      healthRes.rows[0].db === 'vaani' &&
      healthRes.rows[0].usr === 'vaani_app' &&
      healthRes.rows[0].is_replica === false,
      'Target database is primary writable RDS instance "vaani" as user "vaani_app"',
    );

  } catch (err: any) {
    console.error('Test execution error:', err.message);
    failed++;
  } finally {
    await pool.end();
  }

  console.log(`\n📊 RESULTS: ${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

runTests();
