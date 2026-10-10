const { Pool } = require('pg');

const pool = new Pool({
  connectionString: 'postgresql://vaani_app:Qjw9CTgRHrbQXncKPnBonaB4@vaani-postgres.cmdkou44ychs.us-east-1.rds.amazonaws.com:5432/vaani',
  ssl: { rejectUnauthorized: false },
});

async function check() {
  const o = await pool.query('SELECT id, order_number, total_amount, status, prep_eta_minutes, created_at FROM orders WHERE order_number = $1', ['ORD-125']);
  console.log('AWS RDS Order ORD-125:', o.rows[0]);
  
  if (o.rows[0]) {
    const items = await pool.query('SELECT name, price, quantity FROM order_items WHERE order_id = $1', [o.rows[0].id]);
    console.log('AWS RDS Line Items:', items.rows);
    
    const notif = await pool.query('SELECT id, recipient, message, status FROM notifications WHERE related_entity_id = $1', [o.rows[0].id]);
    console.log('AWS RDS Notification Record:', notif.rows[0]);
  }
}

check()
  .then(() => pool.end())
  .catch((e) => {
    console.error(e);
    pool.end();
  });
