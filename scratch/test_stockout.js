const { Client } = require('pg');

async function testStockOut() {
  const c = new Client({
    connectionString: 'postgresql://vaani_app:Qjw9CTgRHrbQXncKPnBonaB4@vaani-postgres.cmdkou44ychs.us-east-1.rds.amazonaws.com:5432/vaani',
    ssl: { rejectUnauthorized: false },
  });

  await c.connect();
  console.log('Connected to RDS. Marking Samosa out_of_stock...');
  await c.query("UPDATE menu_items SET availability = 'out_of_stock' WHERE name LIKE '%Samosa%'");

  console.log('Calling /api/agent/chat with: "I want one samosa"...');
  const res = await fetch('http://localhost:3000/api/agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'I want one samosa' }),
  });

  const data = await res.json();
  console.log('\n--- AGENT STOCK-OUT REPLANNING RESPONSE ---');
  console.log(data);

  // Restore back to available
  await c.query("UPDATE menu_items SET availability = 'available' WHERE name LIKE '%Samosa%'");
  console.log('\nRestored Samosa back to available.');
  await c.end();
}

testStockOut().catch(console.error);
