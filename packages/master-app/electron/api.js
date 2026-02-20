import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function startApiServer() {
    const apiApp = express();
    apiApp.use(cors());
    apiApp.use(express.json());

    // --- FILE PATHS ---
    const statePath = path.join(app.getPath('userData'), 'eltran-pids-state.json');
    const logsPath = path.join(app.getPath('userData'), 'eltran-pids-logs.json');
    const dbPath = process.env.NODE_ENV === 'development'
        ? path.join(__dirname, '../src/data/eltran-pids-db.json')
        : path.join(app.getPath('userData'), 'eltran-pids-db.json');

    // --- IN-MEMORY SESSIONS: token -> user ---
    const sessions = new Map();

    // --- SEED: USERS ---
    const USERS = [
        { id: 'USR001', username: 'admin', password: 'admin123', role: 'Admin', nama: 'Administrator' },
        { id: 'USR002', username: 'operator', password: 'operator123', role: 'Operator', nama: 'Operator Kereta' },
    ];

    // --- SEED: TRAIN DATA ---
    const TRAIN_NAMES = ['ARGO BROMO ANGGREK', 'ARGO WILIS', 'TURANGGA', 'LODAYA', 'MALABAR', 'ARGO PARAHYANGAN'];
    const TRAIN_NUMBERS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'];
    const ROUTES = {
        'ARGO BROMO ANGGREK': {
            name: 'ARGO BROMO ANGGREK',
            stations: ['GAMBIR', 'CIREBON', 'SEMARANG TAWANG', 'SURABAYA PASARTURI'],
            path: "M 80 150 L 250 150 L 500 200 L 750 200",
            nodes: [
                { pos: "M 80 150", label: "GMR", name: "GAMBIR" },
                { pos: "M 250 150", label: "CN", name: "CIREBON" },
                { pos: "M 500 200", label: "SMT", name: "SEMARANG TAWANG" },
                { pos: "M 750 200", label: "SBI", name: "SURABAYA PASARTURI" }
            ]
        },
        'ARGO WILIS': {
            name: 'ARGO WILIS',
            stations: ['BANDUNG', 'TASIKMALAYA', 'YOGYAKARTA', 'SOLO BALAPAN', 'MADIUN', 'SURABAYA GUBENG'],
            path: "M 80 220 C 150 220, 180 180, 220 180 S 350 220, 400 220 S 480 180, 520 180 S 580 220, 620 220 S 720 150, 750 150",
            nodes: [
                { pos: "M 80 220", label: "BD", name: "BANDUNG" },
                { pos: "M 220 180", label: "TSM", name: "TASIKMALAYA" },
                { pos: "M 400 220", label: "YK", name: "YOGYAKARTA" },
                { pos: "M 520 180", label: "SLO", name: "SOLO BALAPAN" },
                { pos: "M 620 220", label: "MN", name: "MADIUN" },
                { pos: "M 750 150", label: "SGU", name: "SURABAYA GUBENG" }
            ],
        },
        'TURANGGA': {
            name: 'TURANGGA',
            stations: ['SURABAYA GUBENG', 'MADIUN', 'SOLO BALAPAN', 'YOGYAKARTA', 'TASIKMALAYA', 'BANDUNG'],
            path: "M 750 150 C 720 150, 620 220, 580 220 S 520 180, 480 180 S 400 220, 350 220 S 220 180, 180 180 S 150 220, 80 220",
            nodes: [
                { pos: "M 750 150", label: "SGU", name: "SURABAYA GUBENG" },
                { pos: "M 620 220", label: "MN", name: "MADIUN" },
                { pos: "M 520 180", label: "SLO", name: "SOLO BALAPAN" },
                { pos: "M 400 220", label: "YK", name: "YOGYAKARTA" },
                { pos: "M 220 180", label: "TSM", name: "TASIKMALAYA" },
                { pos: "M 80 220", label: "BD", name: "BANDUNG" }
            ]
        },
        'LODAYA': {
            name: 'LODAYA',
            stations: ['SOLO BALAPAN', 'YOGYAKARTA', 'KUTOARJO', 'TASIKMALAYA', 'BANDUNG'],
            path: "M 520 180 L 400 220 L 300 200 L 220 180 L 80 220",
            nodes: [
                { pos: "M 520 180", label: "SLO", name: "SOLO BALAPAN" },
                { pos: "M 400 220", label: "YK", name: "YOGYAKARTA" },
                { pos: "M 300 200", label: "KTA", name: "KUTOARJO" },
                { pos: "M 220 180", label: "TSM", name: "TASIKMALAYA" },
                { pos: "M 80 220", label: "BD", name: "BANDUNG" }
            ]
        },
        'MALABAR': {
            name: 'MALABAR',
            stations: ['MALANG', 'BLITAR', 'KEDIRI', 'MADIUN', 'SOLO BALAPAN', 'YOGYAKARTA', 'TASIKMALAYA', 'BANDUNG'],
            path: "M 750 250 L 680 250 L 620 250 L 580 220 L 520 180 L 400 220 L 220 180 L 80 220",
            nodes: [
                { pos: "M 750 250", label: "ML", name: "MALANG" },
                { pos: "M 680 250", label: "BL", name: "BLITAR" },
                { pos: "M 620 250", label: "KD", name: "KEDIRI" },
                { pos: "M 580 220", label: "MN", name: "MADIUN" },
                { pos: "M 520 180", label: "SLO", name: "SOLO BALAPAN" },
                { pos: "M 400 220", label: "YK", name: "YOGYAKARTA" },
                { pos: "M 220 180", label: "TSM", name: "TASIKMALAYA" },
                { pos: "M 80 220", label: "BD", name: "BANDUNG" }
            ]
        },
        'ARGO PARAHYANGAN': {
            name: 'ARGO PARAHYANGAN',
            stations: ['GAMBIR', 'BEKASI', 'CIMAHI', 'BANDUNG'],
            path: "M 80 100 L 150 100 L 250 180 L 300 220",
            nodes: [
                { pos: "M 80 100", label: "GMR", name: "GAMBIR" },
                { pos: "M 150 100", label: "BKS", name: "BEKASI" },
                { pos: "M 250 180", label: "CMI", name: "CIMAHI" },
                { pos: "M 300 220", label: "BD", name: "BANDUNG" }
            ]
        }
    };

    // --- DEFAULT PIDS STATE ---
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

    // Load persisted PIDS state
    if (fs.existsSync(statePath)) {
        try {
            const raw = fs.readFileSync(statePath, 'utf-8');
            const saved = JSON.parse(raw);
            if (saved.stations && saved.stations.length > 0) {
                pidsState = { ...pidsState, ...saved };
            } else {
                fs.writeFileSync(statePath, JSON.stringify(pidsState));
            }
        } catch (e) {
            console.error('[PIDS-API] Failed to load state:', e);
        }
    } else {
        fs.writeFileSync(statePath, JSON.stringify(pidsState));
    }

    // --- LOGS HELPERS ---
    const readLogs = () => {
        try {
            if (fs.existsSync(logsPath)) {
                return JSON.parse(fs.readFileSync(logsPath, 'utf-8'));
            }
        } catch (e) { }
        return [];
    };

    const writeLog = (entry) => {
        try {
            const logs = readLogs();
            logs.unshift({ id: crypto.randomUUID(), timestamp: new Date().toISOString(), ...entry });
            // Keep max 1000 log entries
            if (logs.length > 1000) logs.splice(1000);
            fs.writeFileSync(logsPath, JSON.stringify(logs));
        } catch (e) {
            console.error('[PIDS-API] Failed to write log:', e);
        }
    };

    // --- AUTH HELPERS ---
    const getSessionUser = (req) => {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
        const token = authHeader.slice(7);
        return sessions.get(token) || null;
    };

    const requireAuth = (req, res, next) => {
        const user = getSessionUser(req);
        if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
        req.user = user;
        next();
    };

    const requireAdmin = (req, res, next) => {
        const user = getSessionUser(req);
        if (!user) return res.status(401).json({ success: false, error: 'Unauthorized' });
        if (user.role !== 'Admin') return res.status(403).json({ success: false, error: 'Forbidden: Admin only' });
        req.user = user;
        next();
    };

    // --- DB HELPERS ---
    const readDb = () => {
        try {
            if (fs.existsSync(dbPath)) {
                const raw = fs.readFileSync(dbPath, 'utf8');
                const data = JSON.parse(raw);
                if (data && data.trainNames && data.trainNames.length > 0) return data;
            }
        } catch (e) { }
        return { trainNames: TRAIN_NAMES, trainNumbers: TRAIN_NUMBERS, routes: ROUTES };
    };

    const writeDb = (data) => {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
    };

    // Ensure DB file exists
    if (!fs.existsSync(dbPath)) {
        writeDb({ trainNames: TRAIN_NAMES, trainNumbers: TRAIN_NUMBERS, routes: ROUTES });
    }

    // ========================================
    // AUTH ENDPOINTS
    // ========================================

    // POST /api/auth/login
    apiApp.post('/api/auth/login', (req, res) => {
        const { username, password } = req.body;
        const user = USERS.find(u => u.username === username && u.password === password);
        if (!user) {
            writeLog({ action: 'LOGIN_FAILED', user: username || 'unknown', role: '-', details: `Percobaan login gagal untuk username: ${username}` });
            return res.status(401).json({ success: false, error: 'Username atau password salah' });
        }
        const token = crypto.randomUUID();
        const sessionUser = { id: user.id, username: user.username, role: user.role, nama: user.nama };
        sessions.set(token, sessionUser);
        writeLog({ action: 'LOGIN', user: user.username, role: user.role, details: `${user.nama} (${user.role}) berhasil login` });
        res.json({ success: true, token, user: sessionUser });
    });

    // GET /api/auth/verify
    apiApp.get('/api/auth/verify', (req, res) => {
        const user = getSessionUser(req);
        if (!user) return res.status(401).json({ success: false, error: 'Token tidak valid atau sudah expired' });
        res.json({ success: true, user });
    });

    // POST /api/auth/logout
    apiApp.post('/api/auth/logout', requireAuth, (req, res) => {
        const authHeader = req.headers['authorization'];
        const token = authHeader.slice(7);
        writeLog({ action: 'LOGOUT', user: req.user.username, role: req.user.role, details: `${req.user.nama} logout dari sistem` });
        sessions.delete(token);
        res.json({ success: true });
    });

    // ========================================
    // PIDS STATE ENDPOINTS
    // ========================================

    // GET /api/state
    apiApp.get('/api/state', (req, res) => {
        res.json(pidsState);
    });

    // POST /api/state
    apiApp.post('/api/state', (req, res) => {
        const updates = { ...req.body };
        if (updates.stations && (!Array.isArray(updates.stations) || updates.stations.length === 0)) {
            delete updates.stations;
        }
        const prevState = { ...pidsState };
        pidsState = { ...pidsState, ...updates };
        try { fs.writeFileSync(statePath, JSON.stringify(pidsState)); } catch (e) { }

        // Log meaningful state changes (not telemetry noise like speed/altitude)
        const user = getSessionUser(req);
        const username = user?.username || 'system';
        const role = user?.role || 'System';

        if (updates.stationName && updates.stationName !== prevState.stationName) {
            writeLog({ action: 'STATE_UPDATE', user: username, role, details: `Nama kereta diubah: ${prevState.stationName} → ${updates.stationName}` });
        }
        if (updates.trainNumber && updates.trainNumber !== prevState.trainNumber) {
            writeLog({ action: 'STATE_UPDATE', user: username, role, details: `Nomor kereta diubah: ${prevState.trainNumber} → ${updates.trainNumber}` });
        }
        if (updates.nextStation && updates.nextStation !== prevState.nextStation) {
            writeLog({ action: 'STATE_UPDATE', user: username, role, details: `Stasiun berikutnya diperbarui: ${updates.nextStation}`, data: { stationName: pidsState.stationName } });
        }
        if (updates.displayMode && updates.displayMode !== prevState.displayMode) {
            writeLog({ action: 'DISPLAY_MODE', user: username, role, details: `Mode display diubah ke: ${updates.displayMode?.toUpperCase()}` });
        }
        if (updates.ledSpeed !== undefined && updates.ledSpeed !== prevState.ledSpeed) {
            writeLog({ action: 'LED_CONFIG', user: username, role, details: `Kecepatan LED diubah: ${prevState.ledSpeed}ms → ${updates.ledSpeed}ms` });
        }

        res.json({ success: true, state: pidsState });
    });

    // GET /api/db
    apiApp.get('/api/db', (req, res) => {
        try {
            res.json({ success: true, data: readDb() });
        } catch (e) {
            res.status(500).json({ success: false, error: 'Database read failed' });
        }
    });

    // ========================================
    // LOGGING ENDPOINTS
    // ========================================

    // GET /api/logs
    apiApp.get('/api/logs', (req, res) => {
        const logs = readLogs();
        const { limit, action } = req.query;
        let filtered = logs;
        if (action) filtered = filtered.filter(l => l.action === action);
        if (limit) filtered = filtered.slice(0, parseInt(limit));
        res.json({ success: true, logs: filtered, total: filtered.length });
    });

    // POST /api/logs (manual log entry from frontend)
    apiApp.post('/api/logs', (req, res) => {
        const { action, user, role, details, data } = req.body;
        if (!action || !user) return res.status(400).json({ success: false, error: 'action and user are required' });
        writeLog({ action, user, role: role || 'System', details: details || '', data });
        res.json({ success: true });
    });

    // ========================================
    // ADMIN ENDPOINTS (Admin role only)
    // ========================================

    // GET /api/admin/status
    apiApp.get('/api/admin/status', requireAuth, (req, res) => {
        const logs = readLogs();
        res.json({
            success: true,
            status: {
                uptime: process.uptime(),
                currentState: pidsState,
                totalLogs: logs.length,
                lastLog: logs[0] || null,
                activeSessions: sessions.size,
                serverTime: new Date().toISOString()
            }
        });
    });

    // GET /api/admin/users
    apiApp.get('/api/admin/users', requireAdmin, (req, res) => {
        const safeUsers = USERS.map(({ password: _p, ...u }) => u);
        res.json({ success: true, users: safeUsers });
    });

    // GET /api/admin/trains
    apiApp.get('/api/admin/trains', requireAdmin, (req, res) => {
        const db = readDb();
        res.json({ success: true, trains: db.trainNames, trainNumbers: db.trainNumbers });
    });

    // POST /api/admin/trains — Add new train name
    apiApp.post('/api/admin/trains', requireAdmin, (req, res) => {
        const { name } = req.body;
        if (!name || typeof name !== 'string') return res.status(400).json({ success: false, error: 'name required' });
        const db = readDb();
        const normalized = name.trim().toUpperCase();
        if (db.trainNames.includes(normalized)) return res.status(409).json({ success: false, error: 'Kereta sudah ada' });
        db.trainNames.push(normalized);
        writeDb(db);
        writeLog({ action: 'ADMIN_CRUD', user: req.user.username, role: req.user.role, details: `Kereta baru ditambahkan: ${normalized}` });
        res.json({ success: true, trains: db.trainNames });
    });

    // DELETE /api/admin/trains/:name
    apiApp.delete('/api/admin/trains/:name', requireAdmin, (req, res) => {
        const name = decodeURIComponent(req.params.name).toUpperCase();
        const db = readDb();
        if (!db.trainNames.includes(name)) return res.status(404).json({ success: false, error: 'Kereta tidak ditemukan' });
        db.trainNames = db.trainNames.filter(t => t !== name);
        delete db.routes[name];
        writeDb(db);
        writeLog({ action: 'ADMIN_CRUD', user: req.user.username, role: req.user.role, details: `Kereta dihapus: ${name}` });
        res.json({ success: true, trains: db.trainNames });
    });

    // GET /api/admin/routes
    apiApp.get('/api/admin/routes', requireAdmin, (req, res) => {
        const db = readDb();
        res.json({ success: true, routes: db.routes });
    });

    // POST /api/admin/routes — Add/update route
    apiApp.post('/api/admin/routes', requireAdmin, (req, res) => {
        const { name, stations } = req.body;
        if (!name || !Array.isArray(stations) || stations.length < 2) {
            return res.status(400).json({ success: false, error: 'name dan stations (min 2) diperlukan' });
        }
        const db = readDb();
        const normalized = name.trim().toUpperCase();
        const isNew = !db.routes[normalized];

        // Auto-generate simple SVG path for new routes
        const nodeCount = stations.length;
        const spacing = 700 / (nodeCount - 1);
        const nodes = stations.map((s, i) => ({
            pos: `M ${80 + Math.round(i * spacing)} ${i % 2 === 0 ? 200 : 150}`,
            label: s.substring(0, 3).toUpperCase(),
            name: s.toUpperCase()
        }));
        const pathPoints = nodes.map(n => n.pos.replace('M ', '')).join(' L ');

        db.routes[normalized] = {
            name: normalized,
            stations: stations.map(s => s.toUpperCase()),
            path: `M ${pathPoints}`,
            nodes
        };
        if (!db.trainNames.includes(normalized)) db.trainNames.push(normalized);
        writeDb(db);
        writeLog({ action: 'ADMIN_CRUD', user: req.user.username, role: req.user.role, details: `Rute ${isNew ? 'ditambahkan' : 'diperbarui'}: ${normalized} (${stations.length} stasiun)` });
        res.json({ success: true, route: db.routes[normalized] });
    });

    // DELETE /api/admin/routes/:name
    apiApp.delete('/api/admin/routes/:name', requireAdmin, (req, res) => {
        const name = decodeURIComponent(req.params.name).toUpperCase();
        const db = readDb();
        if (!db.routes[name]) return res.status(404).json({ success: false, error: 'Rute tidak ditemukan' });
        delete db.routes[name];
        db.trainNames = db.trainNames.filter(t => t !== name);
        writeDb(db);
        writeLog({ action: 'ADMIN_CRUD', user: req.user.username, role: req.user.role, details: `Rute dihapus: ${name}` });
        res.json({ success: true });
    });

    // Start Server
    const port = 3001;
    apiApp.listen(port, () => {
        console.log(`[PIDS-CORE] Local Core API Gateway running on http://localhost:${port}`);
        writeLog({ action: 'SYSTEM', user: 'system', role: 'System', details: 'PIDS API Server started' });
    });
}
