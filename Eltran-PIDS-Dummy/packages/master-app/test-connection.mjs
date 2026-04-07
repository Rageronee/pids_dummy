import { Pool } from 'pg';
import 'dotenv/config';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/eltran_pids';
console.log('Testing connection to:', connectionString.replace(/:([^@]+)@/, ':***@'));

const pool = new Pool({ connectionString, connectionTimeoutMillis: 5000 });

try {
    const res = await pool.query('SELECT NOW() as now, current_user');
    console.log('✅ CONNECTION SUCCESS!');
    console.log('   User:', res.rows[0].current_user);
    console.log('   Time:', res.rows[0].now);
    
    // Check tables
    const tables = await pool.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name"
    );
    console.log(`   Tables: ${tables.rows.length} found`);
    
    // Check users
    try {
        const users = await pool.query('SELECT username, role, full_name FROM users');
        console.log(`   Users: ${users.rows.length} found`);
        users.rows.forEach(u => console.log(`      - ${u.username} (${u.role}): ${u.full_name}`));
    } catch (e) {
        console.log('   Users table: not found or empty (need to seed)');
    }
} catch (e) {
    console.error('❌ CONNECTION FAILED:', e.message);
} finally {
    await pool.end();
}
