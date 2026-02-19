import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function startApiServer() {
    const apiApp = express();
    apiApp.use(cors());
    apiApp.use(express.json());

    // Setup UserData state path
    const statePath = path.join(app.getPath('userData'), 'eltran-pids-state.json');
    const dbPath = process.env.NODE_ENV === 'development'
        ? path.join(__dirname, '../src/data/eltran-pids-db.json')
        : path.join(app.getPath('userData'), 'eltran-pids-db.json');

    // --- SEED DATA ---
    const TRAIN_NAMES = ['ARGO BROMO ANGGREK', 'ARGO WILIS', 'TURANGGA', 'LODAYA', 'MALABAR', 'ARGO PARAHYANGAN'];
    const TRAIN_NUMBERS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];
    const ROUTES = {
        'ARGO BROMO ANGGREK': {
            name: 'ARGO BROMO ANGGREK',
            stations: ['GAMBIR', 'CIREBON', 'SEMARANG TAWANG', 'SURABAYA PASARTURI']
        },
        'ARGO WILIS': {
            name: 'ARGO WILIS',
            stations: ['BANDUNG', 'TASIKMALAYA', 'YOGYAKARTA', 'SOLO BALAPAN', 'MADIUN', 'SURABAYA GUBENG']
        },
        'TURANGGA': {
            name: 'TURANGGA',
            stations: ['SURABAYA GUBENG', 'MADIUN', 'SOLO BALAPAN', 'YOGYAKARTA', 'TASIKMALAYA', 'BANDUNG']
        },
        'LODAYA': {
            name: 'LODAYA',
            stations: ['SOLO BALAPAN', 'YOGYAKARTA', 'KUTOARJO', 'TASIKMALAYA', 'BANDUNG']
        },
        'MALABAR': {
            name: 'MALABAR',
            stations: ['MALANG', 'BLITAR', 'KEDIRI', 'MADIUN', 'SOLO BALAPAN', 'YOGYAKARTA', 'TASIKMALAYA', 'BANDUNG']
        },
        'ARGO PARAHYANGAN': {
            name: 'ARGO PARAHYANGAN',
            stations: ['GAMBIR', 'BEKASI', 'CIMAHI', 'BANDUNG']
        }
    };

    // Default PIDS State
    let pidsState = {
        stationName: 'ARGO WILIS',
        trainNumber: '05',
        nextStation: 'TASIKMALAYA',
        status: 'ON TIME',
        ledSpeed: 60,
        speed: 15,
        altitude: 694,
        temperature: 25.1,
        airQuality: 'GOOD NOMINAL',
        displayMode: 'pids',
        stations: ROUTES['ARGO WILIS'].stations,
        activeRoute: ROUTES['ARGO WILIS']
    };

    // Load initial state if exists
    if (fs.existsSync(statePath)) {
        try {
            const raw = fs.readFileSync(statePath, 'utf-8');
            const saved = JSON.parse(raw);

            // Only merge if the saved state looks valid (has stations)
            // This prevents "Initializing Sync" loops if a bad file was saved.
            if (saved.stations && saved.stations.length > 0) {
                pidsState = { ...pidsState, ...saved };
            } else {
                console.log('[PIDS-API] Persisted state was invalid/empty. Resetting to seed data.');
                fs.writeFileSync(statePath, JSON.stringify(pidsState));
            }
        } catch (e) {
            console.error('Failed to load initial state:', e);
        }
    } else {
        fs.writeFileSync(statePath, JSON.stringify(pidsState));
    }

    // --- ENDPOINTS ---

    // 1. Get current PIDS State
    apiApp.get('/api/state', (req, res) => {
        res.json(pidsState);
    });

    // 2. Update PIDS State
    apiApp.post('/api/state', (req, res) => {
        // Validation: Never allow an update to wipe stations or activeRoute 
        // unless it's explicitly providing a new valid one.
        const updates = { ...req.body };

        if (updates.stations && (!Array.isArray(updates.stations) || updates.stations.length === 0)) {
            delete updates.stations; // Reject empty stations update
        }

        pidsState = { ...pidsState, ...updates };

        // Persist
        try {
            fs.writeFileSync(statePath, JSON.stringify(pidsState));
        } catch (e) {
            console.error('Failed to save state:', e);
        }
        res.json({ success: true, state: pidsState });
    });

    // 3. Get Database Data (Trains, Routes)
    apiApp.get('/api/db', (req, res) => {
        try {
            let dbData = null;
            if (fs.existsSync(dbPath)) {
                const raw = fs.readFileSync(dbPath, 'utf8');
                dbData = JSON.parse(raw);
            }

            // Validation: Use seed data if file data is empty or invalid
            if (!dbData || !dbData.trainNames || dbData.trainNames.length === 0) {
                return res.json({
                    success: true,
                    data: {
                        trainNames: TRAIN_NAMES,
                        trainNumbers: TRAIN_NUMBERS,
                        routes: ROUTES
                    }
                });
            }

            res.json({ success: true, data: dbData });
        } catch (e) {
            console.error('Failed to read db:', e);
            res.status(500).json({ success: false, error: 'Database read failed' });
        }
    });

    // Start Server
    const port = 3001; // Can be configurable
    apiApp.listen(port, () => {
        console.log(`[PIDS-CORE] Local Core API Gateway running on http://localhost:${port}`);
    });
}
