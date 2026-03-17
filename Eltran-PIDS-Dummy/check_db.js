import pg from 'pg';
const { Pool } = pg;
const connectionString = 'postgresql://postgres:greget371@localhost:5432/eltran_pids';
const pool = new Pool({ connectionString });

async function check() {
    try {
        const res = await pool.query('SELECT count(*) FROM stations');
        console.log(`Total stations: ${res.rows[0].count}`);
        const malabar = await pool.query("SELECT id, name, media FROM stations WHERE id IN ('ML', 'MLK', 'MN', 'BD')");
        console.log('Malabar Sample:', JSON.stringify(malabar.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}
check();
