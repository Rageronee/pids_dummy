import pg from "pg";
const { Pool } = pg;
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { initDatabase } from "../electron/database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function reseed() {
    console.log("Connecting to Postgres...");
const fallbacks = [
        process.env.DATABASE_URL,
        "postgresql://postgres:eltran123@localhost:5433/eltran_pids",
        "postgresql://postgres:eltran123@localhost:5432/eltran_pids",
        "postgresql://postgres:postgres@localhost:5432/eltran_pids"
    ].filter(Boolean);

    let pool = null;
    for (const url of fallbacks) {
        try {
            console.log(`Trying ${url}...`);
            const tempPool = new Pool({ connectionString: url, connectionTimeoutMillis: 2000 });
            await tempPool.query("SELECT 1");
            pool = tempPool;
            console.log(`Connected to ${url}`);
            break;
        } catch (e) {
            console.log(`Failed to connect to ${url}`);
        }
    }

    if (!pool) {
        console.error("Failed to connect to any database!");
        process.exit(1);
    }
    
    try {
        console.log("Truncating corrupted routes and cascading schedules...");
        await pool.query("TRUNCATE routes CASCADE;");
        console.log("Routes table truncated successfully.");
        await pool.end();

        console.log("Re-initializing database to force new seed data...");
        await initDatabase();

        console.log("SUCCESS: Database successfully reseeded with perfect chronological sequences and schedules!");
        process.exit(0);
    } catch (e) {
        console.error("Error during reseeding:", e);
        process.exit(1);
    }
}

reseed();
