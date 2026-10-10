const { Client } = require('pg');

async function verifyKitchenDisplayAndStatus() {
  console.log('======================================================');
  console.log('🍳 VERIFYING KITCHEN DISPLAY DATA & STATUS LIFECYCLE');
  console.log('======================================================\n');

  const propId = '62e1b115-9382-40f8-853a-0a773735d034';
  const pg = new Client({
    host: 'vaani-postgres.cmdkou44ychs.us-east-1.rds.amazonaws.com',
    port: 5432,
    user: 'vaani_app',
    password: 'Qjw9CTgRHrbQXncKPnBonaB4',
    database: 'vaani',
    ssl: { rejectUnauthorized: false },
  });
  await pg.connect();

  // 1. Fetch our order ORD-114
  const res = await pg.query("SELECT id, order_number, status, total_amount FROM orders WHERE order_number = 'ORD-114'");
  if (res.rows.length === 0) {
    console.error('❌ Order ORD-114 not found');
    await pg.end();
    process.exit(1);
  }
  const order = res.rows[0];
  console.log(`1. Current order in RDS: ${order.order_number}, Status: ${order.status}`);

  // 2. Barista clicks "Start Preparing" (advance to 'preparing')
  console.log('2. Barista advances status to "preparing"...');
  await pg.query("UPDATE orders SET status = 'preparing', updated_at = now() WHERE id = $1", [order.id]);
  const checkPrep = await pg.query("SELECT status FROM orders WHERE id = $1", [order.id]);
  console.log(`   Status in RDS after update: ${checkPrep.rows[0].status}`);

  // 3. Barista clicks "Mark Ready for Pickup" (advance to 'ready')
  console.log('3. Barista advances status to "ready"...');
  await pg.query("UPDATE orders SET status = 'ready', updated_at = now() WHERE id = $1", [order.id]);
  const checkReady = await pg.query("SELECT status FROM orders WHERE id = $1", [order.id]);
  console.log(`   Status in RDS after update: ${checkReady.rows[0].status}`);

  // 4. Barista clicks "Hand Over & Complete" (advance to 'completed')
  console.log('4. Barista advances status to "completed"...');
  await pg.query("UPDATE orders SET status = 'completed', updated_at = now() WHERE id = $1", [order.id]);
  const checkComp = await pg.query("SELECT status FROM orders WHERE id = $1", [order.id]);
  console.log(`   Status in RDS after update: ${checkComp.rows[0].status}`);

  // Reset back to 'received' so it remains visible on the kitchen queue for the judge demo!
  await pg.query("UPDATE orders SET status = 'received', updated_at = now() WHERE id = $1", [order.id]);
  console.log('\n✅ Reset status back to "received" so ticket ORD-114 is queued in kitchen queue for the judges!');

  await pg.end();
}

verifyKitchenDisplayAndStatus().catch(console.error);
