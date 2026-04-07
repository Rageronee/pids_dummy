import pg from 'pg';
const { Pool } = pg;

// Test both connection strings
const configs = [
  {
    name: 'Connection String',
    pool: new Pool({ 
      connectionString: 'postgresql://postgres:postgres@localhost:5432/eltran_pids'
    })
  },
  {
    name: 'Individual Params',
    pool: new Pool({
      host: 'localhost',
      port: 5432,
      database: 'eltran_pids',
      user: 'postgres',
      password: 'postgres'
    })
  }
];

async function testConfig(config) {
  console.log(`\nTesting: ${config.name}`);
  try {
    const res = await config.pool.query('SELECT NOW() as current_time, current_user');
    console.log(`✓ Connected! Time: ${res.rows[0].current_time}, User: ${res.rows[0].current_user}`);
    
    // Check if tables exist
    const tableRes = await config.pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log(`Tables: ${tableRes.rows.length > 0 ? tableRes.rows.map(r => r.table_name).join(', ') : 'No tables yet'}`);
    
    // Check users
    try {
      const userRes = await config.pool.query('SELECT username, role, full_name FROM users');
      console.log(`Users: ${userRes.rows.length}`);
      userRes.rows.forEach(u => console.log(`  - ${u.username} (${u.role}): ${u.full_name}`));
    } catch (e) {
      console.log(`  Users table: ${e.message}`);
    }
    
    await config.pool.end();
    return true;
  } catch (e) {
    console.error(`✗ Failed: ${e.message}`);
    await config.pool.end().catch(() => {});
    return false;
  }
}

async function main() {
  for (const config of configs) {
    await testConfig(config);
  }
}

main();
