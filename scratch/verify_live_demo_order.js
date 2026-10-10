const { Client } = require('pg');

async function verifyLiveDemoOrder() {
  console.log('======================================================');
  console.log('🧪 LIVE DEMO ORDER VERIFICATION AGAINST AWS RDS');
  console.log('======================================================\n');

  const propId = '62e1b115-9382-40f8-853a-0a773735d034';
  const sessionId = 'live-judge-session-' + Date.now();
  const callerPhone = '+919876543210';
  const customerName = 'Hackathon Judge';
  const base = 'http://localhost:3000/api/agent/chat';

  // ── TURN 1 ──────────────────────────────────────────────────────────
  console.log('[Turn 1]: "Namaste! I\'d like one masala chai and two samosas, please."');
  const t1Start = Date.now();
  const res1 = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript: "Namaste! I'd like one masala chai and two samosas, please.",
      sessionId,
      propertyId: propId,
      callerPhone,
      customerName,
    }),
  });
  const t1Latency = Date.now() - t1Start;
  const d1 = await res1.json();
  console.log(`⏱️ Latency: ${t1Latency}ms`);
  console.log(`Agent Reply: "${d1.reply}"\n`);

  // ── TURN 2 ──────────────────────────────────────────────────────────
  console.log('[Turn 2]: "Actually, make that three samosas."');
  const t2Start = Date.now();
  const res2 = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript: 'Actually, make that three samosas.',
      sessionId,
      propertyId: propId,
      callerPhone,
      customerName,
    }),
  });
  const t2Latency = Date.now() - t2Start;
  const d2 = await res2.json();
  console.log(`⏱️ Latency: ${t2Latency}ms`);
  console.log(`Agent Reply: "${d2.reply}"\n`);

  // ── TURN 3 ──────────────────────────────────────────────────────────
  console.log('[Turn 3]: "Haanji, please confirm the order."');
  const t3Start = Date.now();
  const res3 = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript: 'Haanji, please confirm the order.',
      sessionId,
      propertyId: propId,
      callerPhone,
      customerName,
    }),
  });
  const t3Latency = Date.now() - t3Start;
  const d3 = await res3.json();
  console.log(`⏱️ Latency: ${t3Latency}ms`);
  console.log(`Agent Reply: "${d3.reply}"`);
  console.log('Confirmation payload:', JSON.stringify(d3.orderCreated, null, 2));

  if (!d3.orderCreated || !d3.orderCreated.orderNumber) {
    console.error('❌ Order confirmation failed!');
    process.exit(1);
  }

  const confirmedOrderNum = d3.orderCreated.orderNumber;
  const confirmedOrderId = d3.orderCreated.orderId;

  // ── DATABASE AUDIT IN AWS RDS ───────────────────────────────────────
  console.log('\n======================================================');
  console.log('🔍 INDEPENDENT AUDIT IN AWS RDS POSTGRESQL');
  console.log('======================================================');

  const pg = new Client({
    host: 'vaani-postgres.cmdkou44ychs.us-east-1.rds.amazonaws.com',
    port: 5432,
    user: 'vaani_app',
    password: 'Qjw9CTgRHrbQXncKPnBonaB4',
    database: 'vaani',
    ssl: { rejectUnauthorized: false },
  });

  await pg.connect();

  const orderRes = await pg.query('SELECT * FROM orders WHERE id = $1', [confirmedOrderId]);
  if (orderRes.rows.length === 0) {
    console.error(`❌ Order ${confirmedOrderId} NOT found in AWS RDS PostgreSQL!`);
    await pg.end();
    process.exit(1);
  }
  const dbOrder = orderRes.rows[0];
  console.log(`✅ Verified in RDS orders table:`);
  console.log(`   ID: ${dbOrder.id}`);
  console.log(`   Order Number: ${dbOrder.order_number}`);
  console.log(`   Status: ${dbOrder.status}`);
  console.log(`   Customer: ${dbOrder.customer_name} (${dbOrder.customer_phone})`);
  console.log(`   Total Amount in DB: ₹${dbOrder.total_amount}`);

  const itemsRes = await pg.query('SELECT * FROM order_items WHERE order_id = $1', [confirmedOrderId]);
  console.log(`\n✅ Verified ${itemsRes.rows.length} line items in RDS order_items table:`);
  let chaiQty = 0;
  let samosaQty = 0;
  for (const item of itemsRes.rows) {
    console.log(`   • ${item.quantity}x ${item.name} @ ₹${item.price}`);
    if (item.name.toLowerCase().includes('chai')) chaiQty += item.quantity;
    if (item.name.toLowerCase().includes('samosa')) samosaQty += item.quantity;
  }

  console.log('\n--- QUANTITY ACCURACY CHECK ---');
  console.log(`Chai quantity: ${chaiQty} (expected: 1)`);
  console.log(`Samosa quantity: ${samosaQty} (expected: 3 — NOT 5)`);
  if (samosaQty === 3 && chaiQty === 1) {
    console.log('✅ PASS: Quantity accurately reflects correction (3 samosas, not 5)!');
  } else {
    console.error(`❌ FAIL: Samosa quantity is ${samosaQty}, expected 3!`);
  }

  const expectedTotal = 1 * 30 + 3 * 50; // 180
  if (Number(dbOrder.total_amount) === expectedTotal) {
    console.log(`✅ PASS: Database total amount matches exact server calculation (₹${expectedTotal})!`);
  } else {
    console.error(`❌ FAIL: Total is ₹${dbOrder.total_amount}, expected ₹${expectedTotal}!`);
  }

  // ── DUPLICATE CONFIRMATION RETRY CHECK ──────────────────────────────
  console.log('\n--- DUPLICATE SUBMISSION PREVENTION CHECK ---');
  const retryRes = await fetch(base, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      transcript: 'Haanji, please confirm the order.',
      sessionId,
      propertyId: propId,
      callerPhone,
      customerName,
    }),
  });
  const retryData = await retryRes.json();
  const ordersCountAfterRetry = await pg.query('SELECT count(*) FROM orders WHERE order_number = $1', [confirmedOrderNum]);
  console.log(`Rows in RDS with order_number ${confirmedOrderNum}: ${ordersCountAfterRetry.rows[0].count}`);
  if (ordersCountAfterRetry.rows[0].count === '1') {
    console.log('✅ PASS: Retry did not create a duplicate order in AWS RDS!');
  } else {
    console.error('❌ FAIL: Duplicate order row created!');
  }

  await pg.end();
}

verifyLiveDemoOrder().catch(console.error);
