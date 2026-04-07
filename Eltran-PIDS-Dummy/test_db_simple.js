import pg from 'pg';
const { Pool } = pg;

// With trust authentication, password shouldn't matter
// But let's try various approaches

async function testWithConfig(label, config) {
  console.log(`\n${label}:`);
  const pool = new Pool(config);
  try {
    const res = await pool.query('SELECT NOW() as now, current_user');
    console.log(`✓ SUCCESS - Connected as ${res.rows[0].current_user} at ${res.rows[0].now}`);
    
    // Check tables
    const tables = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    console.log(`  Tables: ${tables.rows.length}`);
    
    // Check users table
    const users = await pool.query('SELECT username, role FROM users').catch(() => ({rows: []}));
    if (users.rows.length > 0) {
      console.log(`  Users: ${users.rows.map(u => `${u.username}(${u.role})`).join(', ')}`);
    } else {
      console.log(`  Users table: empty or doesn't exist`);
    }
    
    await pool.end();
    return true;
  } catch (e) {
    console.log(`✗ FAILED - ${e.message}`);
    await pool.end().catch(() => {});
    return false;
  }
}

async function main() {
  // Try with no password (trust auth)
  await testWithConfig('1. No password (trust)', {
    host: 'localhost',
    port: 5432,
    database: 'eltran_pids',
    user: 'postgres'
  });

  // Try with password
  await testWithConfig('2. With password "postgres"', {
    host: 'localhost',
    port: 5432,
    database: 'eltran_pids',
    user: 'postgres',
    password: 'postgres'
  });

  // Try with empty password
  await testWithConfig('3. Empty password', {
    host: 'localhost',
    port: 5432,
    database: 'eltran_pids',
    user: 'postgres',
    password: ''
  });

  // Try connection string
  await testWithConfig('4. Connection string (postgresql://)', {
    connectionString: 'postgresql://postgres@localhost:5432/eltran_pids'
  });
}

main();
