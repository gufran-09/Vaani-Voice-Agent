const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://vaani_app:Qjw9CTgRHrbQXncKPnBonaB4@vaani-postgres.cmdkou44ychs.us-east-1.rds.amazonaws.com:5432/vaani',
  ssl: { rejectUnauthorized: false },
});

async function run() {
  const propId = '62e1b115-9382-40f8-853a-0a773735d034';
  const items = await pool.query('SELECT count(*) as count FROM menu_items WHERE property_id = $1', [propId]);
  const totalItems = await pool.query('SELECT count(*) as count FROM menu_items');
  const orders = await pool.query('SELECT count(*) as count FROM orders WHERE property_id = $1', [propId]);
  const notifs = await pool.query('SELECT count(*) as count FROM notifications WHERE property_id = $1', [propId]);
  const calls = await pool.query('SELECT count(*) as count FROM calls WHERE property_id = $1', [propId]);
  
  console.log('AWS RDS Main Property Menu Items:', items.rows[0].count);
  console.log('AWS RDS Total Menu Items:', totalItems.rows[0].count);
  console.log('AWS RDS Main Property Orders:', orders.rows[0].count);
  console.log('AWS RDS Main Property Notifications:', notifs.rows[0].count);
  console.log('AWS RDS Main Property Calls:', calls.rows[0].count);
  
  // Sample 5 menu items
  const sampleItems = await pool.query('SELECT id, name, price, availability FROM menu_items WHERE property_id = $1 LIMIT 5', [propId]);
  console.log('Sample Items:', sampleItems.rows);
  
  // Sample latest 3 orders
  const latestOrders = await pool.query('SELECT id, order_number, customer_name, total_amount, status, created_at FROM orders WHERE property_id = $1 ORDER BY created_at DESC LIMIT 3', [propId]);
  console.log('Latest Orders:', latestOrders.rows);
}

run()
  .then(() => pool.end())
  .catch((err) => {
    console.error(err);
    pool.end();
  });
