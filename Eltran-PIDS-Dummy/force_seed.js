import { seedData, initDatabase } from './packages/master-app/electron/database.js';

async function forceSeed() {
    try {
        await initDatabase();
        console.log('Database initialized. Forcing seed...');
        await seedData();
        console.log('Seed completed successfully!');
    } catch (e) {
        console.error('Seed failed:', e);
    } finally {
        process.exit();
    }
}
forceSeed();
