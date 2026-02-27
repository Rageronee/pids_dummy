/**
 * PIDS KAI — SQLite Database Layer (sql.js — Pure JavaScript)
 * Replaces all JSON flat-file operations with a proper relational database.
 * Uses sql.js for Electron-compatible embedded SQL (no native compilation needed).
 */
import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import crypto from 'crypto';

let db = null;
let dbPath = '';

// ============================================================
// INITIALIZATION
// ============================================================

export async function initDatabase() {
    const SQL = await initSqlJs();
    dbPath = path.join(app.getPath('userData'), 'eltran-pids.db');

    // Load existing DB or create new
    if (fs.existsSync(dbPath)) {
        const buffer = fs.readFileSync(dbPath);
        db = new SQL.Database(buffer);
    } else {
        db = new SQL.Database();
    }

    // Performance
    db.run('PRAGMA foreign_keys = ON');

    createTables();
    seedData();
    saveDb(); // Persist after seeding

    console.log('[PIDS-DB] SQLite database initialized at:', dbPath);
    return db;
}

function saveDb() {
    if (!db) return;
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
}

// Auto-save every 10 seconds to avoid data loss
let _saveInterval = null;
export function startAutoSave() {
    if (_saveInterval) return;
    _saveInterval = setInterval(saveDb, 10000);
}

// Helper: run and save
function runAndSave(sql, params = []) {
    db.run(sql, params);
    saveDb();
}

// Helper: get single row
function getOne(sql, params = []) {
    const stmt = db.prepare(sql);
    if (params.length) stmt.bind(params);
    const result = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return result;
}

// Helper: get all rows
function getAll(sql, params = []) {
    const stmt = db.prepare(sql);
    if (params.length) stmt.bind(params);
    const results = [];
    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
}

// Helper: run insert and return last ID
function insertAndGetId(sql, params = []) {
    db.run(sql, params);
    const row = getOne('SELECT last_insert_rowid() as id');
    return row ? row.id : 0;
}

function createTables() {
    db.run(`
        -- Master Data: Stasiun
        CREATE TABLE IF NOT EXISTS stations (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            city TEXT NOT NULL,
            latitude REAL DEFAULT 0,
            longitude REAL DEFAULT 0
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS train_services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            class TEXT NOT NULL DEFAULT 'EKSEKUTIF',
            ka_number TEXT NOT NULL DEFAULT ''
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS routes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            train_service_id INTEGER NOT NULL,
            direction TEXT NOT NULL DEFAULT '',
            svg_path TEXT DEFAULT '',
            FOREIGN KEY (train_service_id) REFERENCES train_services(id) ON DELETE CASCADE
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS route_stations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            route_id INTEGER NOT NULL,
            station_id TEXT NOT NULL,
            sequence_order INTEGER NOT NULL,
            svg_position TEXT DEFAULT '',
            svg_label TEXT DEFAULT '',
            FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
            FOREIGN KEY (station_id) REFERENCES stations(id)
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            route_id INTEGER NOT NULL,
            schedule_date TEXT NOT NULL DEFAULT (date('now')),
            status TEXT NOT NULL DEFAULT 'ON_TIME',
            notes TEXT DEFAULT '',
            FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS schedule_stops (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            schedule_id INTEGER NOT NULL,
            route_station_id INTEGER NOT NULL,
            arrival_time TEXT DEFAULT '',
            departure_time TEXT DEFAULT '',
            platform INTEGER DEFAULT 1,
            stop_status TEXT NOT NULL DEFAULT 'SCHEDULED',
            FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
            FOREIGN KEY (route_station_id) REFERENCES route_stations(id)
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'Operator',
            nama TEXT NOT NULL
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS units (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            active INTEGER NOT NULL DEFAULT 1
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS pids_state (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            service_name TEXT NOT NULL DEFAULT 'ARGO WILIS',
            current_station TEXT NOT NULL DEFAULT 'BANDUNG',
            train_number TEXT NOT NULL DEFAULT '05',
            next_station TEXT NOT NULL DEFAULT 'TASIKMALAYA',
            status TEXT NOT NULL DEFAULT 'ON TIME',
            led_speed INTEGER NOT NULL DEFAULT 60,
            speed REAL NOT NULL DEFAULT 15,
            altitude REAL NOT NULL DEFAULT 694,
            temperature REAL NOT NULL DEFAULT 25.1,
            air_quality TEXT NOT NULL DEFAULT 'GOOD NOMINAL',
            display_mode TEXT NOT NULL DEFAULT 'pids',
            active_route_json TEXT DEFAULT '{}'
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS system_logs (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            action TEXT NOT NULL,
            user TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'System',
            details TEXT DEFAULT '',
            data_json TEXT DEFAULT ''
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS announcements (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            type TEXT NOT NULL DEFAULT 'INFO',
            message TEXT NOT NULL,
            priority INTEGER NOT NULL DEFAULT 5,
            active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    `);
}

// ============================================================
// SEED DATA — Authentic KAI Data
// ============================================================

function seedData() {
    const count = getOne('SELECT COUNT(*) as count FROM stations');
    if (count && count.count > 0) return;

    console.log('[PIDS-DB] Seeding authentic KAI data...');

    // ---- STATIONS (18 stasiun utama Pulau Jawa) ----
    const stations = [
        ['GMR', 'GAMBIR', 'JAKARTA', -6.1762, 106.8308],
        ['JAKK', 'JAKARTA KOTA', 'JAKARTA', -6.1376, 106.8125],
        ['BKS', 'BEKASI', 'BEKASI', -6.2361, 106.9994],
        ['KAG', 'KARAWANG', 'KARAWANG', -6.3235, 107.3019],
        ['CN', 'CIREBON', 'CIREBON', -6.7069, 108.5567],
        ['CMI', 'CIMAHI', 'CIMAHI', -6.8842, 107.5421],
        ['BD', 'BANDUNG', 'BANDUNG', -6.9125, 107.6036],
        ['TSM', 'TASIKMALAYA', 'TASIKMALAYA', -7.3278, 108.2207],
        ['KTA', 'KUTOARJO', 'KUTOARJO', -7.7258, 109.9117],
        ['YK', 'YOGYAKARTA', 'YOGYAKARTA', -7.7891, 110.3633],
        ['SLO', 'SOLO BALAPAN', 'SURAKARTA', -7.5579, 110.8213],
        ['MN', 'MADIUN', 'MADIUN', -7.6188, 111.5238],
        ['KD', 'KEDIRI', 'KEDIRI', -7.8116, 112.0133],
        ['BL', 'BLITAR', 'BLITAR', -8.0996, 112.1617],
        ['ML', 'MALANG', 'MALANG', -7.9771, 112.6360],
        ['SMT', 'SEMARANG TAWANG', 'SEMARANG', -6.9644, 110.4267],
        ['SBI', 'SURABAYA PASARTURI', 'SURABAYA', -7.2466, 112.7321],
        ['SGU', 'SURABAYA GUBENG', 'SURABAYA', -7.2647, 112.7517],
    ];
    for (const s of stations) {
        db.run('INSERT OR IGNORE INTO stations (id, name, city, latitude, longitude) VALUES (?, ?, ?, ?, ?)', s);
    }

    // ---- TRAIN SERVICES ----
    const trainServices = [
        ['ARGO BROMO ANGGREK', 'EKSEKUTIF', 'KA 1'],
        ['ARGO PARAHYANGAN', 'EKSEKUTIF', 'KA 34'],
        ['ARGO WILIS', 'EKSEKUTIF', 'KA 5'],
        ['TURANGGA', 'EKSEKUTIF', 'KA 65'],
        ['LODAYA', 'EKSEKUTIF/EKONOMI', 'KA 91'],
        ['MALABAR', 'EKSEKUTIF/EKONOMI', 'KA 121'],
    ];
    const serviceIds = {};
    for (const ts of trainServices) {
        db.run('INSERT INTO train_services (name, class, ka_number) VALUES (?, ?, ?)', ts);
        const row = getOne('SELECT id FROM train_services WHERE name = ?', [ts[0]]);
        serviceIds[ts[0]] = row.id;
    }

    // ---- ROUTES with SVG paths and nodes ----
    const routesData = {
        'ARGO BROMO ANGGREK': {
            direction: 'GMR-SBI',
            svg_path: 'M 80 150 L 250 150 L 500 200 L 750 200',
            stops: [
                { id: 'GMR', seq: 1, pos: 'M 80 150', label: 'GMR' },
                { id: 'CN', seq: 2, pos: 'M 250 150', label: 'CN' },
                { id: 'SMT', seq: 3, pos: 'M 500 200', label: 'SMT' },
                { id: 'SBI', seq: 4, pos: 'M 750 200', label: 'SBI' },
            ],
        },
        'ARGO PARAHYANGAN': {
            direction: 'GMR-BD',
            svg_path: 'M 80 100 L 150 100 L 250 180 L 300 220',
            stops: [
                { id: 'GMR', seq: 1, pos: 'M 80 100', label: 'GMR' },
                { id: 'BKS', seq: 2, pos: 'M 150 100', label: 'BKS' },
                { id: 'CMI', seq: 3, pos: 'M 250 180', label: 'CMI' },
                { id: 'BD', seq: 4, pos: 'M 300 220', label: 'BD' },
            ],
        },
        'ARGO WILIS': {
            direction: 'BD-SGU',
            svg_path: 'M 80 220 C 150 220, 180 180, 220 180 S 350 220, 400 220 S 480 180, 520 180 S 580 220, 620 220 S 720 150, 750 150',
            stops: [
                { id: 'BD', seq: 1, pos: 'M 80 220', label: 'BD' },
                { id: 'TSM', seq: 2, pos: 'M 220 180', label: 'TSM' },
                { id: 'YK', seq: 3, pos: 'M 400 220', label: 'YK' },
                { id: 'SLO', seq: 4, pos: 'M 520 180', label: 'SLO' },
                { id: 'MN', seq: 5, pos: 'M 620 220', label: 'MN' },
                { id: 'SGU', seq: 6, pos: 'M 750 150', label: 'SGU' },
            ],
        },
        'TURANGGA': {
            direction: 'SGU-BD',
            svg_path: 'M 750 150 C 720 150, 620 220, 580 220 S 520 180, 480 180 S 400 220, 350 220 S 220 180, 180 180 S 150 220, 80 220',
            stops: [
                { id: 'SGU', seq: 1, pos: 'M 750 150', label: 'SGU' },
                { id: 'MN', seq: 2, pos: 'M 620 220', label: 'MN' },
                { id: 'SLO', seq: 3, pos: 'M 520 180', label: 'SLO' },
                { id: 'YK', seq: 4, pos: 'M 400 220', label: 'YK' },
                { id: 'TSM', seq: 5, pos: 'M 220 180', label: 'TSM' },
                { id: 'BD', seq: 6, pos: 'M 80 220', label: 'BD' },
            ],
        },
        'LODAYA': {
            direction: 'SLO-BD',
            svg_path: 'M 520 180 L 400 220 L 300 200 L 220 180 L 80 220',
            stops: [
                { id: 'SLO', seq: 1, pos: 'M 520 180', label: 'SLO' },
                { id: 'YK', seq: 2, pos: 'M 400 220', label: 'YK' },
                { id: 'KTA', seq: 3, pos: 'M 300 200', label: 'KTA' },
                { id: 'TSM', seq: 4, pos: 'M 220 180', label: 'TSM' },
                { id: 'BD', seq: 5, pos: 'M 80 220', label: 'BD' },
            ],
        },
        'MALABAR': {
            direction: 'ML-BD',
            svg_path: 'M 750 250 L 680 250 L 620 250 L 580 220 L 520 180 L 400 220 L 220 180 L 80 220',
            stops: [
                { id: 'ML', seq: 1, pos: 'M 750 250', label: 'ML' },
                { id: 'BL', seq: 2, pos: 'M 680 250', label: 'BL' },
                { id: 'KD', seq: 3, pos: 'M 620 250', label: 'KD' },
                { id: 'MN', seq: 4, pos: 'M 580 220', label: 'MN' },
                { id: 'SLO', seq: 5, pos: 'M 520 180', label: 'SLO' },
                { id: 'YK', seq: 6, pos: 'M 400 220', label: 'YK' },
                { id: 'TSM', seq: 7, pos: 'M 220 180', label: 'TSM' },
                { id: 'BD', seq: 8, pos: 'M 80 220', label: 'BD' },
            ],
        },
    };

    const routeIdMap = {};
    const routeStationIdMap = {};

    for (const [serviceName, routeData] of Object.entries(routesData)) {
        const serviceId = serviceIds[serviceName];
        db.run('INSERT INTO routes (train_service_id, direction, svg_path) VALUES (?, ?, ?)',
            [serviceId, routeData.direction, routeData.svg_path]);
        const routeId = getOne('SELECT last_insert_rowid() as id').id;
        routeIdMap[serviceName] = routeId;
        routeStationIdMap[serviceName] = {};

        for (const stop of routeData.stops) {
            db.run('INSERT INTO route_stations (route_id, station_id, sequence_order, svg_position, svg_label) VALUES (?, ?, ?, ?, ?)',
                [routeId, stop.id, stop.seq, stop.pos, stop.label]);
            const rsId = getOne('SELECT last_insert_rowid() as id').id;
            routeStationIdMap[serviceName][stop.id] = rsId;
        }
    }

    // ---- SCHEDULES ----
    const scheduleSeeds = [
        {
            service: 'ARGO BROMO ANGGREK', stops: [
                ['GMR', '', '08:00', 3], ['CN', '10:48', '10:53', 1], ['SMT', '14:00', '14:10', 2], ['SBI', '17:40', '', 1]
            ]
        },
        {
            service: 'ARGO PARAHYANGAN', stops: [
                ['GMR', '', '06:30', 2], ['BKS', '06:58', '07:00', 1], ['CMI', '09:15', '09:17', 1], ['BD', '09:30', '', 4]
            ]
        },
        {
            service: 'ARGO WILIS', stops: [
                ['BD', '', '08:00', 3], ['TSM', '10:20', '10:25', 1], ['YK', '15:10', '15:20', 2],
                ['SLO', '16:25', '16:30', 1], ['MN', '18:05', '18:10', 1], ['SGU', '20:30', '', 3]
            ]
        },
        {
            service: 'TURANGGA', stops: [
                ['SGU', '', '05:00', 2], ['MN', '07:20', '07:25', 1], ['SLO', '09:00', '09:05', 1],
                ['YK', '10:10', '10:20', 2], ['TSM', '15:00', '15:05', 1], ['BD', '17:15', '', 5]
            ]
        },
        {
            service: 'LODAYA', stops: [
                ['SLO', '', '07:00', 1], ['YK', '08:05', '08:15', 2], ['KTA', '09:30', '09:35', 1],
                ['TSM', '13:00', '13:05', 1], ['BD', '15:20', '', 3]
            ]
        },
        {
            service: 'MALABAR', stops: [
                ['ML', '', '05:30', 1], ['BL', '06:45', '06:50', 1], ['KD', '07:40', '07:45', 1],
                ['MN', '09:00', '09:10', 1], ['SLO', '10:30', '10:35', 1], ['YK', '11:35', '11:45', 2],
                ['TSM', '16:00', '16:05', 1], ['BD', '18:15', '', 4]
            ]
        },
    ];

    for (const sched of scheduleSeeds) {
        db.run("INSERT INTO schedules (route_id, schedule_date, status) VALUES (?, date('now'), 'ON_TIME')",
            [routeIdMap[sched.service]]);
        const schedId = getOne('SELECT last_insert_rowid() as id').id;
        const rsMap = routeStationIdMap[sched.service];
        for (const [stationCode, arrival, departure, platform] of sched.stops) {
            db.run('INSERT INTO schedule_stops (schedule_id, route_station_id, arrival_time, departure_time, platform, stop_status) VALUES (?, ?, ?, ?, ?, ?)',
                [schedId, rsMap[stationCode], arrival, departure, platform, 'SCHEDULED']);
        }
    }

    // ---- USERS ----
    db.run('INSERT OR IGNORE INTO users (id, username, password, role, nama) VALUES (?, ?, ?, ?, ?)', ['USR001', 'admin', 'admin123', 'Admin', 'Administrator']);
    db.run('INSERT OR IGNORE INTO users (id, username, password, role, nama) VALUES (?, ?, ?, ?, ?)', ['USR002', 'operator', 'operator123', 'Operator', 'Operator Kereta']);

    // ---- UNITS ----
    db.run('INSERT OR IGNORE INTO units (id, name, type, active) VALUES (?, ?, ?, ?)', ['U001', 'K1-01', 'Eksekutif', 1]);
    db.run('INSERT OR IGNORE INTO units (id, name, type, active) VALUES (?, ?, ?, ?)', ['U002', 'K1-02', 'Eksekutif', 1]);
    db.run('INSERT OR IGNORE INTO units (id, name, type, active) VALUES (?, ?, ?, ?)', ['U003', 'K1-03', 'Eksekutif', 1]);
    db.run('INSERT OR IGNORE INTO units (id, name, type, active) VALUES (?, ?, ?, ?)', ['U004', 'M1-01', 'Makan', 1]);
    db.run('INSERT OR IGNORE INTO units (id, name, type, active) VALUES (?, ?, ?, ?)', ['U005', 'P-01', 'Pembangkit', 1]);

    // ---- PIDS STATE (default) ----
    const argoWilisRoute = buildRouteJson('ARGO WILIS');
    db.run(`INSERT OR IGNORE INTO pids_state (id, service_name, current_station, train_number, next_station, status, led_speed, speed, altitude, temperature, air_quality, display_mode, active_route_json) VALUES (1, 'ARGO WILIS', 'BANDUNG', '05', 'TASIKMALAYA', 'ON TIME', 60, 15, 694, 25.1, 'GOOD NOMINAL', 'pids', ?)`,
        [JSON.stringify(argoWilisRoute)]);

    // ---- INITIAL LOG ----
    db.run('INSERT INTO system_logs (id, timestamp, action, user, role, details) VALUES (?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), new Date().toISOString(), 'SYSTEM', 'system', 'System', 'Database initialized with authentic KAI data']);

    console.log('[PIDS-DB] Seed data complete.');
}

// ============================================================
// ROUTE HELPERS — Build route JSON for backward compatibility
// ============================================================

function buildRouteJson(serviceName) {
    const service = getOne('SELECT id, name FROM train_services WHERE name = ?', [serviceName]);
    if (!service) return null;

    const route = getOne('SELECT * FROM routes WHERE train_service_id = ?', [service.id]);
    if (!route) return null;

    const routeStations = getAll(`
        SELECT rs.*, s.name as station_name
        FROM route_stations rs
        JOIN stations s ON rs.station_id = s.id
        WHERE rs.route_id = ?
        ORDER BY rs.sequence_order
    `, [route.id]);

    const kaNum = getOne('SELECT ka_number FROM train_services WHERE id = ?', [service.id]);

    return {
        name: service.name,
        number: kaNum?.ka_number || '',
        stations: routeStations.map(rs => rs.station_name),
        path: route.svg_path,
        nodes: routeStations.map(rs => ({
            pos: rs.svg_position,
            label: rs.svg_label,
            name: rs.station_name,
        })),
    };
}

// ============================================================
// STATE OPERATIONS
// ============================================================

export function getState() {
    const row = getOne('SELECT * FROM pids_state WHERE id = 1');
    if (!row) return getDefaultState();

    let activeRoute = null;
    try { activeRoute = JSON.parse(row.active_route_json || '{}'); } catch { }

    return {
        serviceName: row.service_name,
        currentStation: row.current_station,
        trainNumber: row.train_number,
        nextStation: row.next_station,
        status: row.status,
        ledSpeed: row.led_speed,
        speed: row.speed,
        altitude: row.altitude,
        temperature: row.temperature,
        airQuality: row.air_quality,
        displayMode: row.display_mode,
        stations: activeRoute?.stations || [],
        activeRoute,
    };
}

function getDefaultState() {
    return {
        serviceName: 'ARGO WILIS', currentStation: 'BANDUNG', trainNumber: '05',
        nextStation: 'TASIKMALAYA', status: 'ON TIME', ledSpeed: 60, speed: 15,
        altitude: 694, temperature: 25.1, airQuality: 'GOOD NOMINAL', displayMode: 'pids',
        stations: ['BANDUNG', 'TASIKMALAYA', 'YOGYAKARTA', 'SOLO BALAPAN', 'MADIUN', 'SURABAYA GUBENG'],
        activeRoute: null,
    };
}

export function updateState(updates) {
    const current = getState();
    const merged = { ...current, ...updates };

    if (updates.stations && (!Array.isArray(updates.stations) || updates.stations.length === 0)) {
        merged.stations = current.stations;
    }

    let activeRouteJson = current.activeRoute ? JSON.stringify(current.activeRoute) : '{}';
    if (updates.activeRoute) {
        activeRouteJson = JSON.stringify(updates.activeRoute);
    } else if (updates.serviceName && updates.serviceName !== current.serviceName) {
        const route = buildRouteJson(updates.serviceName);
        if (route) {
            activeRouteJson = JSON.stringify(route);
            if (!updates.stations || updates.stations.length === 0) {
                merged.stations = route.stations;
            }
        }
    }

    db.run(`INSERT OR REPLACE INTO pids_state (id, service_name, current_station, train_number, next_station, status, led_speed, speed, altitude, temperature, air_quality, display_mode, active_route_json) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [merged.serviceName, merged.currentStation, merged.trainNumber,
        merged.nextStation, merged.status, merged.ledSpeed, merged.speed,
        merged.altitude, merged.temperature, merged.airQuality,
        merged.displayMode, activeRouteJson]);

    // Don't save to disk on every telemetry update (auto-save handles periodic persistence)
    return getState();
}

// ============================================================
// LOG OPERATIONS
// ============================================================

export function getLogs(filter = {}) {
    if (filter.action && filter.limit) {
        return getAll('SELECT * FROM system_logs WHERE action = ? ORDER BY timestamp DESC LIMIT ?', [filter.action, filter.limit]);
    } else if (filter.action) {
        return getAll('SELECT * FROM system_logs WHERE action = ? ORDER BY timestamp DESC LIMIT 1000', [filter.action]);
    } else if (filter.limit) {
        return getAll('SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT ?', [filter.limit]);
    }
    return getAll('SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT 1000');
}

export function writeLog(entry) {
    db.run('INSERT INTO system_logs (id, timestamp, action, user, role, details, data_json) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), new Date().toISOString(), entry.action, entry.user, entry.role || 'System',
        entry.details || '', entry.data ? JSON.stringify(entry.data) : '']);
    saveDb(); // Persist logs immediately
}

// ============================================================
// USER OPERATIONS
// ============================================================

export function getUsers() { return getAll('SELECT id, username, role, nama FROM users'); }
export function getUsersWithPassword() { return getAll('SELECT * FROM users'); }
export function findUser(username, password) { return getOne('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]); }

export function addUser({ username, password, role, nama }) {
    const c = getOne('SELECT COUNT(*) as c FROM users');
    const nextId = `USR${String((c?.c || 0) + 1).padStart(3, '0')}`;
    const existing = getOne('SELECT id FROM users WHERE username = ?', [username]);
    if (existing) return { error: 'Username already exists' };
    db.run('INSERT INTO users (id, username, password, role, nama) VALUES (?, ?, ?, ?, ?)', [nextId, username, password, role, nama]);
    saveDb();
    return { id: nextId, username, role, nama };
}

export function deleteUser(id) {
    const user = getOne('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) return { error: 'User not found' };
    db.run('DELETE FROM users WHERE id = ?', [id]);
    saveDb();
    return { success: true, user };
}

// ============================================================
// TRAIN SERVICE OPERATIONS
// ============================================================

export function getTrainNames() { return getAll('SELECT name FROM train_services ORDER BY id').map(r => r.name); }
export function getTrainNumbers() { return ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10']; }

export function addTrainName(name) {
    const normalized = name.trim().toUpperCase();
    if (getOne('SELECT id FROM train_services WHERE name = ?', [normalized])) return { error: 'Kereta sudah ada' };
    db.run('INSERT INTO train_services (name, class, ka_number) VALUES (?, ?, ?)', [normalized, 'EKSEKUTIF', '']);
    saveDb();
    return { success: true, trains: getTrainNames() };
}

export function deleteTrainName(name) {
    const normalized = name.toUpperCase();
    const service = getOne('SELECT id FROM train_services WHERE name = ?', [normalized]);
    if (!service) return { error: 'Kereta tidak ditemukan' };
    // Cascade: delete routes → route_stations → schedules → schedule_stops
    const routes = getAll('SELECT id FROM routes WHERE train_service_id = ?', [service.id]);
    for (const route of routes) {
        const rsIds = getAll('SELECT id FROM route_stations WHERE route_id = ?', [route.id]);
        const schedIds = getAll('SELECT id FROM schedules WHERE route_id = ?', [route.id]);
        for (const sched of schedIds) db.run('DELETE FROM schedule_stops WHERE schedule_id = ?', [sched.id]);
        db.run('DELETE FROM schedules WHERE route_id = ?', [route.id]);
        db.run('DELETE FROM route_stations WHERE route_id = ?', [route.id]);
    }
    db.run('DELETE FROM routes WHERE train_service_id = ?', [service.id]);
    db.run('DELETE FROM train_services WHERE id = ?', [service.id]);
    saveDb();
    return { success: true, trains: getTrainNames() };
}

// ============================================================
// ROUTE OPERATIONS
// ============================================================

export function getRoutes() {
    const services = getAll('SELECT * FROM train_services ORDER BY id');
    const routes = {};
    for (const service of services) {
        const route = getOne('SELECT * FROM routes WHERE train_service_id = ?', [service.id]);
        routes[service.name] = route ? buildRouteJson(service.name) : { name: service.name, stations: [], path: '', nodes: [] };
    }
    return routes;
}

export function saveRoute(name, stations) {
    const normalized = name.trim().toUpperCase();

    let service = getOne('SELECT id FROM train_services WHERE name = ?', [normalized]);
    if (!service) {
        db.run('INSERT INTO train_services (name, class, ka_number) VALUES (?, ?, ?)', [normalized, 'EKSEKUTIF', '']);
        service = getOne('SELECT id FROM train_services WHERE name = ?', [normalized]);
    }

    // Delete existing route
    const existingRoute = getOne('SELECT id FROM routes WHERE train_service_id = ?', [service.id]);
    if (existingRoute) {
        db.run('DELETE FROM route_stations WHERE route_id = ?', [existingRoute.id]);
        db.run('DELETE FROM routes WHERE id = ?', [existingRoute.id]);
    }

    // Auto-generate SVG path and nodes
    const nodeCount = stations.length;
    const spacing = 700 / Math.max(nodeCount - 1, 1);
    const stationEntries = stations.map((s, i) => ({
        name: s.toUpperCase(),
        pos: `M ${80 + Math.round(i * spacing)} ${i % 2 === 0 ? 200 : 150}`,
        label: s.substring(0, 3).toUpperCase(),
    }));
    const pathPoints = stationEntries.map(n => n.pos.replace('M ', '')).join(' L ');

    db.run('INSERT INTO routes (train_service_id, direction, svg_path) VALUES (?, ?, ?)',
        [service.id, `${stationEntries[0].label}-${stationEntries[stationEntries.length - 1].label}`, `M ${pathPoints}`]);
    const routeId = getOne('SELECT last_insert_rowid() as id').id;

    for (let i = 0; i < stationEntries.length; i++) {
        const stn = stationEntries[i];
        db.run('INSERT OR IGNORE INTO stations (id, name, city) VALUES (?, ?, ?)', [stn.label, stn.name, stn.name]);
        db.run('INSERT INTO route_stations (route_id, station_id, sequence_order, svg_position, svg_label) VALUES (?, ?, ?, ?, ?)',
            [routeId, stn.label, i + 1, stn.pos, stn.label]);
    }

    saveDb();
    return buildRouteJson(normalized);
}

export function deleteRoute(name) {
    const normalized = name.toUpperCase();
    const service = getOne('SELECT id FROM train_services WHERE name = ?', [normalized]);
    if (!service) return { error: 'Rute tidak ditemukan' };
    // Manual cascade
    const routes = getAll('SELECT id FROM routes WHERE train_service_id = ?', [service.id]);
    for (const r of routes) {
        db.run('DELETE FROM route_stations WHERE route_id = ?', [r.id]);
        db.run('DELETE FROM schedules WHERE route_id = ?', [r.id]);
    }
    db.run('DELETE FROM routes WHERE train_service_id = ?', [service.id]);
    db.run('DELETE FROM train_services WHERE id = ?', [service.id]);
    saveDb();
    return { success: true };
}

// ============================================================
// UNIT OPERATIONS
// ============================================================

export function getUnits() { return getAll('SELECT * FROM units'); }

export function addUnit({ name, type, active }) {
    const c = getOne('SELECT COUNT(*) as c FROM units');
    const nextId = `U${String((c?.c || 0) + 1).padStart(3, '0')}`;
    db.run('INSERT INTO units (id, name, type, active) VALUES (?, ?, ?, ?)', [nextId, name.trim().toUpperCase(), type, active ? 1 : 0]);
    saveDb();
    return getUnits();
}

export function updateUnit(id, { name, type, active }) {
    db.run('UPDATE units SET name = ?, type = ?, active = ? WHERE id = ?', [name.trim().toUpperCase(), type, active !== undefined ? (active ? 1 : 0) : 1, id]);
    saveDb();
    return getUnits();
}

export function deleteUnit(id) {
    const unit = getOne('SELECT * FROM units WHERE id = ?', [id]);
    if (!unit) return { error: 'Unit not found' };
    db.run('DELETE FROM units WHERE id = ?', [id]);
    saveDb();
    return { success: true };
}

// ============================================================
// STATION & SCHEDULE OPERATIONS
// ============================================================

export function getStations() { return getAll('SELECT * FROM stations ORDER BY name'); }

export function getSchedules() {
    const schedules = getAll(`
        SELECT s.*, ts.name as train_name, ts.class as train_class, ts.ka_number, r.direction
        FROM schedules s
        JOIN routes r ON s.route_id = r.id
        JOIN train_services ts ON r.train_service_id = ts.id
        ORDER BY s.id
    `);
    return schedules.map(sched => {
        const stops = getAll(`
            SELECT ss.*, rs.sequence_order, st.name as station_name, st.id as station_code
            FROM schedule_stops ss
            JOIN route_stations rs ON ss.route_station_id = rs.id
            JOIN stations st ON rs.station_id = st.id
            WHERE ss.schedule_id = ?
            ORDER BY rs.sequence_order
        `, [sched.id]);
        return { ...sched, stops };
    });
}

// ============================================================
// DB DUMP (backward-compatible with GET /api/db)
// ============================================================

export function getDbDump() {
    return {
        trainNames: getTrainNames(),
        trainNumbers: getTrainNumbers(),
        routes: getRoutes(),
        users: getUsersWithPassword(),
        units: getUnits(),
    };
}

// ============================================================
// CLOSE
// ============================================================

export function closeDatabase() {
    if (_saveInterval) { clearInterval(_saveInterval); _saveInterval = null; }
    if (db) {
        saveDb(); // Final save
        db.close();
        db = null;
    }
}
