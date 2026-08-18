const { Client } = require('pg');
const bcrypt = require('bcryptjs');

const users = [
  { cid: '11101001001', email: 'system.admin@dzongjuk.test', name: 'System Admin', password: 'password', role: 'admin' },
  { cid: '11102002002', email: 'dcdd.admin@dzongjuk.test', name: 'DCDD Admin', password: 'password', role: 'dcdd' },
  { cid: '11103003003', email: 'exam.head@dzongjuk.test', name: 'Exam Head', password: 'password', role: 'exam_head' },
  { cid: '11104004004', email: 'committee.head@dzongjuk.test', name: 'Committee Head', password: 'password', role: 'committee_head' },
  { cid: '11105005005', email: 'chief.executive@dzongjuk.test', name: 'Chief Executive', password: 'password', role: 'chief_executive' },
  { cid: '11106006006', email: 'test.taker@dzongjuk.test', name: 'Test Taker', password: 'password', role: 'test_taker' },
  { cid: 'LOCALCID2026', email: 'local.acceptance@dzongjuk.test', name: 'Local acceptance test taker', password: 'LocalTestOnly!2026', role: 'test_taker' },
];

async function seed() {
  const client = new Client({ connectionString: 'postgresql://dzongjuk:development-only@localhost:5432/dzongjuk_identity' });
  await client.connect();

  for (const user of users) {
    const hash = bcrypt.hashSync(user.password, 10);
    
    // Check if user already exists
    const res = await client.query('SELECT id FROM identity.users WHERE email = $1', [user.email]);
    let userId;
    
    if (res.rows.length === 0) {
      console.log(`Inserting ${user.email}...`);
      const insertRes = await client.query(
        'INSERT INTO identity.users (email, cid, "fullName", "passwordHash", status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
        [user.email, user.cid, user.name, hash, 'ACTIVE']
      );
      userId = insertRes.rows[0].id;
    } else {
      console.log(`Updating ${user.email}...`);
      userId = res.rows[0].id;
      await client.query(
        'UPDATE identity.users SET cid = $2, "fullName" = $3, "passwordHash" = $4 WHERE id = $1',
        [userId, user.cid, user.name, hash]
      );
    }
    
    // Link role
    const roleRes = await client.query('SELECT id FROM identity.roles WHERE code = $1', [user.role]);
    if (roleRes.rows.length > 0) {
      const roleId = roleRes.rows[0].id;
      await client.query(
        'INSERT INTO identity.user_roles ("usersId", "rolesId") VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, roleId]
      );
    }
  }
  
  await client.end();
  console.log('Done!');
}

seed().catch(console.error);
