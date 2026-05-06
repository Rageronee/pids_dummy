
import { initDatabase, seedData } from './packages/master-app/electron/database.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, 'packages/master-app/.env') });

async function run() {
    console.log("Starting administrative database seeding...");
    try {
        await initDatabase();
        // Since initDatabase already calls seedData, and I want to be 100% sure, 
        // I'll call it again which now uses Transactions and DELETE properly.
        await seedData(); 
        console.log("Database seeding completed successfully.");
        process.exit(0);
    } catch (err) {
        console.error("Database seeding failed:", err);
        process.exit(1);
    }
}

run();
