const { Client } = require('pg');

const c = new Client({
  host: 'vaani-postgres.cmdkou44ychs.us-east-1.rds.amazonaws.com',
  port: 5432,
  user: 'vaani_app',
  password: 'Qjw9CTgRHrbQXncKPnBonaB4',
  database: 'vaani',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await c.connect();
  const o = await c.query("SELECT id, order_number, status, total_amount, customer_name FROM orders WHERE order_number = 'ORD-119'");
  console.log('Order:', o.rows[0]);
  if (o.rows[0]) {
    const i = await c.query("SELECT quantity, unit_price, subtotal FROM order_items WHERE order_id = $1", [o.rows[0].id]);
    console.log('Items:', i.rows);
  }
  await c.end();
}

run().catch(console.error);
