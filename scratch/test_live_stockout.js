const { Client } = require('pg');

async function testStockOut() {
  const c = new Client({
    host: 'vaani-postgres.cmdkou44ychs.us-east-1.rds.amazonaws.com',
    port: 5432,
    user: 'vaani_app',
    password: 'Qjw9CTgRHrbQXncKPnBonaB4',
    database: 'vaani',
    ssl: { rejectUnauthorized: false },
  });

  await c.connect();
  const propId = '62e1b115-9382-40f8-853a-0a773735d034';

  console.log('1. Setting South Indian Filter Coffee to out_of_stock in RDS...');
  await c.query(
    "UPDATE menu_items SET availability = 'out_of_stock' WHERE property_id = $1 AND name ILIKE '%Filter Coffee%'",
    [propId]
  );

  console.log('2. Asking agent: "Can I get one filter coffee please?"');
  const res = await fetch('http://localhost:3000/api/agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript: 'Can I get one filter coffee please?',
      sessionId: 'test-oos-' + Date.now(),
      propertyId: propId,
    }),
  });

  const data = await res.json();
  console.log('\n--- AGENT RESPONSE TO OUT-OF-STOCK ITEM ---');
  console.log('Reply:', data.reply);
  console.log('Stock-out flag:', data.stockOut);

  // Restore back to available
  console.log('\n3. Restoring Filter Coffee to available in RDS...');
  await c.query(
    "UPDATE menu_items SET availability = 'available' WHERE property_id = $1 AND name ILIKE '%Filter Coffee%'",
    [propId]
  );
  console.log('✅ Restored successfully.');
  await c.end();
}

testStockOut().catch(console.error);
