/*
 * seed-database.mjs — Initialize and seed the development database
 *
 * - Uses initDatabase() from electron/database.js
 * - Prints progress and exits when done
 * - Ensure DATABASE_URL is set in .env before running
 */
import 'dotenv/config';
import { initDatabase } from './electron/database.js';

console.log('🌱 Starting database initialization and seeding...');
console.log('DATABASE_URL:', process.env.DATABASE_URL?.replace(/:([^@]+)@/, ':***@'));

try {
    const pool = await initDatabase();
    console.log('✅ Database initialized and seeded successfully!');
    console.log('');
    console.log('Default login credentials:');
    console.log('  Admin:    admin / admin123');
    console.log('  Operator: operator / operator123');
    console.log('');
    process.exit(0);
} catch (e) {
    console.error('❌ Database initialization failed:', e.message);
    console.error(e.stack);
    process.exit(1);
}
