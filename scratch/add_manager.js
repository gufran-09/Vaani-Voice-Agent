const { Client } = require('pg');

async function addManagerMembership() {
  const c = new Client({
    host: 'vaani-postgres.cmdkou44ychs.us-east-1.rds.amazonaws.com',
    port: 5432,
    user: 'vaani_app',
    password: 'Qjw9CTgRHrbQXncKPnBonaB4',
    database: 'vaani',
    ssl: { rejectUnauthorized: false },
  });

  await c.connect();
  const userId = '62e1b115-0000-4000-8000-000000000001';

  await c.query(
    "INSERT INTO profiles (id, email, full_name) VALUES ($1, 'manager@cafevaani.in', 'Cafe Vaani Manager') ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email, full_name = EXCLUDED.full_name",
    [userId]
  );

  const orgIds = ['520b6e9c-3b13-449f-b891-16535622eb6b', '835cde82-1de8-4bc7-acd8-6142d3733a60'];
  for (const orgId of orgIds) {
    await c.query(
      "INSERT INTO memberships (organization_id, user_id, role) VALUES ($1, $2, 'owner') ON CONFLICT (organization_id, user_id) DO NOTHING",
      [orgId, userId]
    );
  }

  console.log('✅ Added manager profile and owner memberships.');
  await c.end();
}

addManagerMembership().catch(console.error);
