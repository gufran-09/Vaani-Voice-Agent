import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';

// Safely load .env or .env.local without exposing secrets
const envLocalPath = path.resolve(__dirname, '..', '.env.local');
const envPath = fs.existsSync(envLocalPath) ? envLocalPath : path.resolve(__dirname, '..', '.env');
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

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not found in .env.local');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function runAudit() {
  console.log('=== 1. DATABASE CONNECTION AUDIT ===');
  const connInfo = await pool.query(`
    SELECT
      current_database() AS database_name,
      current_schema() AS current_schema,
      current_user AS database_user,
      version() AS postgres_version
  `);
  console.log('Connection Info:', connInfo.rows[0]);

  const searchPath = await pool.query('SHOW search_path');
  console.log('Search Path:', searchPath.rows[0]);

  console.log('\n=== 2. TABLE NAMES & ROW COUNTS ===');
  const tablesRes = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);

  const counts: Record<string, number> = {};
  for (const row of tablesRes.rows) {
    const tName = row.table_name;
    const cRes = await pool.query(`SELECT COUNT(*)::int AS cnt FROM public."${tName}"`);
    counts[tName] = cRes.rows[0].cnt;
    console.log(`  ${tName.padEnd(25)} : ${cRes.rows[0].cnt}`);
  }

  console.log('\n=== 3. PROPERTIES & ORGANIZATIONS ===');
  const orgs = await pool.query('SELECT id, name, slug FROM organizations');
  console.log('Organizations:', orgs.rows);

  const props = await pool.query('SELECT id, organization_id, name, property_type FROM properties');
  console.log('Properties:', props.rows);

  console.log('\n=== 4. MENU ITEMS & CATEGORIES BY PROPERTY ===');
  for (const prop of props.rows) {
    const catCount = await pool.query('SELECT COUNT(*)::int AS cnt FROM menu_categories WHERE property_id = $1', [prop.id]);
    const itemCount = await pool.query('SELECT COUNT(*)::int AS cnt FROM menu_items WHERE property_id = $1', [prop.id]);
    console.log(`  Property "${prop.name}" (${prop.id}):`);
    console.log(`    Categories: ${catCount.rows[0].cnt}, Menu Items: ${itemCount.rows[0].cnt}`);

    const items = await pool.query('SELECT name, price, availability, prep_time_minutes FROM menu_items WHERE property_id = $1', [prop.id]);
    console.log(`    Items list (${items.rows.length}):`);
    for (const item of items.rows) {
      console.log(`      - ${item.name} (Rs. ${item.price}, ${item.availability}, ${item.prep_time_minutes}m)`);
    }
  }

  console.log('\n=== 5. CHECK FOR ANY TABLE WITH ~70 OR 4 RECORDS ===');
  for (const [tbl, cnt] of Object.entries(counts)) {
    if (cnt === 4 || cnt >= 60 && cnt <= 80 || cnt > 0) {
      console.log(`  >> Table "${tbl}" has count = ${cnt}`);
    }
  }

  await pool.end();
}

runAudit().catch((err) => {
  console.error('Audit failed:', err);
  process.exit(1);
});
