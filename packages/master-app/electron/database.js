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
        -- Master Data: Stasiun (expanded per SRS)
        CREATE TABLE IF NOT EXISTS stations (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            city TEXT NOT NULL,
            latitude REAL DEFAULT 0,
            longitude REAL DEFAULT 0,
            ip_address TEXT DEFAULT '',
            nama_pic TEXT DEFAULT '',
            kontak_pic TEXT DEFAULT '',
            kode_kota TEXT DEFAULT '',
            alamat TEXT DEFAULT '',
            provinsi TEXT DEFAULT '',
            kabupaten_kota TEXT DEFAULT '',
            kecamatan TEXT DEFAULT '',
            kelurahan_desa TEXT DEFAULT '',
            kode_pos TEXT DEFAULT '',
            poi TEXT DEFAULT '',
            media TEXT DEFAULT ''
        )
    `);
    db.run(`
        -- Kereta / Train Services (expanded per SRS)
        CREATE TABLE IF NOT EXISTS train_services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            class TEXT NOT NULL DEFAULT 'EKSEKUTIF',
            ka_number TEXT NOT NULL DEFAULT '',
            ip_address TEXT DEFAULT '',
            nama_pic TEXT DEFAULT '',
            kontak_pic TEXT DEFAULT '',
            media TEXT DEFAULT ''
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS routes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            train_service_id INTEGER NOT NULL,
            direction TEXT NOT NULL DEFAULT '',
            svg_path TEXT DEFAULT '',
            geojson TEXT DEFAULT '',
            FOREIGN KEY (train_service_id) REFERENCES train_services(id) ON DELETE CASCADE
        )
    `);

    // Migration: add geojson column to existing routes table (new DBs already have it)
    try {
        const cols = getAll(`PRAGMA table_info(routes)`);
        const hasGeojson = cols.some(c => c.name === 'geojson');
        if (!hasGeojson) {
            db.run(`ALTER TABLE routes ADD COLUMN geojson TEXT DEFAULT ''`);
            saveDb(); // Force persist the schema change immediately
            console.log('[PIDS-DB] Migration: geojson column added to routes table');
        }
    } catch (e) {
        console.error('[PIDS-DB] Migration error:', e.message);
    }

    db.run(`
        CREATE TABLE IF NOT EXISTS route_stations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            route_id INTEGER NOT NULL,
            station_id TEXT NOT NULL,
            sequence_order INTEGER NOT NULL,
            svg_position TEXT DEFAULT '',
            svg_label TEXT DEFAULT '',
            keterangan TEXT DEFAULT 'antara',
            FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
            FOREIGN KEY (station_id) REFERENCES stations(id)
        )
    `);
    db.run(`
        -- Jadwal (expanded per SRS)
        CREATE TABLE IF NOT EXISTS schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            route_id INTEGER NOT NULL,
            schedule_date TEXT NOT NULL DEFAULT (date('now')),
            status TEXT NOT NULL DEFAULT 'ON_TIME',
            notes TEXT DEFAULT '',
            catatan TEXT DEFAULT '',
            media TEXT DEFAULT '',
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
            realisasi_datang TEXT DEFAULT '',
            realisasi_berangkat TEXT DEFAULT '',
            selisih_datang INTEGER DEFAULT 0,
            selisih_berangkat INTEGER DEFAULT 0,
            status_datang TEXT DEFAULT 'Tepat Waktu',
            status_berangkat TEXT DEFAULT 'Tepat Waktu',
            platform INTEGER DEFAULT 1,
            stop_status TEXT NOT NULL DEFAULT 'SCHEDULED',
            FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
            FOREIGN KEY (route_station_id) REFERENCES route_stations(id)
        )
    `);
    db.run(`
        -- Users (expanded per SRS)
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'Operator',
            nama TEXT NOT NULL,
            kontak TEXT DEFAULT '',
            email TEXT DEFAULT '',
            media TEXT DEFAULT '',
            id_kereta TEXT DEFAULT '',
            id_stasiun TEXT DEFAULT ''
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

    // ============================================================
    // NEW TABLES per SRS
    // ============================================================
    db.run(`
        CREATE TABLE IF NOT EXISTS gerbong (
            id TEXT PRIMARY KEY,
            ip_address TEXT DEFAULT '',
            nama_gerbong TEXT NOT NULL,
            no_urut_gerbong INTEGER NOT NULL DEFAULT 1,
            id_kereta INTEGER NOT NULL,
            FOREIGN KEY (id_kereta) REFERENCES train_services(id) ON DELETE CASCADE
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS sensor (
            id TEXT PRIMARY KEY,
            ip_address TEXT DEFAULT '',
            nama_device TEXT NOT NULL,
            tipe_sensor TEXT NOT NULL DEFAULT 'GPS',
            status TEXT NOT NULL DEFAULT 'Aktif',
            is_main INTEGER NOT NULL DEFAULT 0,
            id_gerbong TEXT NOT NULL,
            FOREIGN KEY (id_gerbong) REFERENCES gerbong(id) ON DELETE CASCADE
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS sensor_data (
            id TEXT PRIMARY KEY,
            latitude REAL DEFAULT 0,
            longitude REAL DEFAULT 0,
            altitude REAL DEFAULT 0,
            kecepatan REAL DEFAULT 0,
            suhu REAL DEFAULT 0,
            poi TEXT DEFAULT '',
            waktu_rekam TEXT NOT NULL DEFAULT (datetime('now')),
            id_sensor TEXT NOT NULL,
            FOREIGN KEY (id_sensor) REFERENCES sensor(id) ON DELETE CASCADE
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS log_maintenance (
            id TEXT PRIMARY KEY,
            mulai TEXT NOT NULL,
            selesai TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'Open',
            prioritas TEXT NOT NULL DEFAULT 'Medium',
            deskripsi TEXT DEFAULT '',
            id_kereta INTEGER NOT NULL,
            FOREIGN KEY (id_kereta) REFERENCES train_services(id) ON DELETE CASCADE
        )
    `);
    db.run(`
        CREATE TABLE IF NOT EXISTS log_operasional (
            id TEXT PRIMARY KEY,
            waktu TEXT NOT NULL DEFAULT (datetime('now')),
            catatan TEXT DEFAULT '',
            id_kereta INTEGER NOT NULL,
            id_jadwal INTEGER DEFAULT NULL,
            FOREIGN KEY (id_kereta) REFERENCES train_services(id) ON DELETE CASCADE,
            FOREIGN KEY (id_jadwal) REFERENCES schedules(id) ON DELETE SET NULL
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

    // ---- STATIONS (18 stasiun utama Pulau Jawa — expanded per SRS) ----
    const stations = [
        ['GMR', 'GAMBIR', 'JAKARTA', -6.1762, 106.8308, '192.168.5.1', 'Ahmad Surya', '081200001001', 'JKT', 'Jl. Medan Merdeka Timur', 'DKI Jakarta', 'Jakarta Pusat', 'Gambir', 'Gambir', '10110'],
        ['JAKK', 'JAKARTA KOTA', 'JAKARTA', -6.1376, 106.8125, '192.168.5.2', 'Budi Hartono', '081200001002', 'JKT', 'Jl. Stasiun Kota No.1', 'DKI Jakarta', 'Jakarta Barat', 'Taman Sari', 'Pinangsia', '11110'],
        ['BKS', 'BEKASI', 'BEKASI', -6.2361, 106.9994, '192.168.5.3', 'Cahya Putra', '081200001003', 'BKS', 'Jl. Ir. H. Juanda No.1', 'Jawa Barat', 'Kota Bekasi', 'Bekasi Timur', 'Margahayu', '17113'],
        ['KAG', 'KARAWANG', 'KARAWANG', -6.3235, 107.3019, '192.168.5.4', 'Deni Firmansyah', '081200001004', 'KRW', 'Jl. Arif Rahman Hakim', 'Jawa Barat', 'Karawang', 'Karawang Barat', 'Karawang', '41311'],
        ['CN', 'CIREBON', 'CIREBON', -6.7069, 108.5567, '192.168.5.5', 'Eka Wijaya', '081200001005', 'CRB', 'Jl. Siliwangi No.82', 'Jawa Barat', 'Kota Cirebon', 'Kejaksan', 'Kejaksan', '45123'],
        ['CMI', 'CIMAHI', 'CIMAHI', -6.8842, 107.5421, '192.168.5.6', 'Fajar Nugroho', '081200001006', 'CMI', 'Jl. Stasiun Cimahi', 'Jawa Barat', 'Kota Cimahi', 'Cimahi Tengah', 'Cimahi', '40511'],
        ['BD', 'BANDUNG', 'BANDUNG', -6.9125, 107.6036, '192.168.5.7', 'Gilang Permana', '081200001007', 'BDG', 'Jl. Stasiun Selatan No.1', 'Jawa Barat', 'Kota Bandung', 'Regol', 'Kebon Kalapa', '40253'],
        ['TSM', 'TASIKMALAYA', 'TASIKMALAYA', -7.3278, 108.2207, '192.168.5.8', 'Hendra Kusuma', '081200001008', 'TSM', 'Jl. Stasiun No.1', 'Jawa Barat', 'Kota Tasikmalaya', 'Cipedes', 'Nagarasari', '46133'],
        ['KTA', 'KUTOARJO', 'KUTOARJO', -7.7258, 109.9117, '192.168.5.9', 'Irfan Maulana', '081200001009', 'KTA', 'Jl. Stasiun Kutoarjo', 'Jawa Tengah', 'Purworejo', 'Kutoarjo', 'Kutoarjo', '54213'],
        ['YK', 'YOGYAKARTA', 'YOGYAKARTA', -7.7891, 110.3633, '192.168.5.10', 'Joko Susilo', '081200001010', 'YOG', 'Jl. Mangkubumi No.1', 'DIY', 'Kota Yogyakarta', 'Jetis', 'Bumijo', '55232'],
        ['SLO', 'SOLO BALAPAN', 'SURAKARTA', -7.5579, 110.8213, '192.168.5.11', 'Krisna Adi', '081200001011', 'SLO', 'Jl. Wolter Monginsidi No.112', 'Jawa Tengah', 'Surakarta', 'Banjarsari', 'Kestalan', '57133'],
        ['MN', 'MADIUN', 'MADIUN', -7.6188, 111.5238, '192.168.5.12', 'Lukman Hakim', '081200001012', 'MDN', 'Jl. Kompol Sunaryo', 'Jawa Timur', 'Kota Madiun', 'Manguharjo', 'Madiun Lor', '63121'],
        ['KD', 'KEDIRI', 'KEDIRI', -7.8116, 112.0133, '192.168.5.13', 'Muhammad Rizki', '081200001013', 'KDR', 'Jl. Stasiun Kediri', 'Jawa Timur', 'Kota Kediri', 'Kota', 'Pocanan', '64129'],
        ['BL', 'BLITAR', 'BLITAR', -8.0996, 112.1617, '192.168.5.14', 'Naufal Akbar', '081200001014', 'BLT', 'Jl. Stasiun Blitar', 'Jawa Timur', 'Kota Blitar', 'Sananwetan', 'Sananwetan', '66137'],
        ['ML', 'MALANG', 'MALANG', -7.9771, 112.6360, '192.168.5.15', 'Oscar Pratama', '081200001015', 'MLG', 'Jl. Trunojoyo No.10', 'Jawa Timur', 'Kota Malang', 'Klojen', 'Klojen', '65111'],
        ['SMT', 'SEMARANG TAWANG', 'SEMARANG', -6.9644, 110.4267, '192.168.5.16', 'Putra Aditya', '081200001016', 'SMG', 'Jl. Taman Tawang No.1', 'Jawa Tengah', 'Kota Semarang', 'Semarang Utara', 'Tanjung Mas', '50174'],
        ['SBI', 'SURABAYA PASARTURI', 'SURABAYA', -7.2466, 112.7321, '192.168.5.17', 'Qori Ramadhan', '081200001017', 'SBY', 'Jl. Stasiun Pasar Turi', 'Jawa Timur', 'Kota Surabaya', 'Bubutan', 'Bubutan', '60174'],
        ['SGU', 'SURABAYA GUBENG', 'SURABAYA', -7.2647, 112.7517, '192.168.5.18', 'Reza Fahlevi', '081200001018', 'SBY', 'Jl. Gubeng Masjid No.1', 'Jawa Timur', 'Kota Surabaya', 'Gubeng', 'Gubeng', '60281'],
    ];
    for (const s of stations) {
        db.run('INSERT OR IGNORE INTO stations (id, name, city, latitude, longitude, ip_address, nama_pic, kontak_pic, kode_kota, alamat, provinsi, kabupaten_kota, kecamatan, kelurahan_desa, kode_pos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', s);
    }

    // ---- TRAIN SERVICES (expanded per SRS) ----
    const trainServices = [
        ['ARGO BROMO ANGGREK', 'EKSEKUTIF', 'KA 1', '192.168.3.1', 'Budi Santoso', '081300001001'],
        ['ARGO PARAHYANGAN', 'EKSEKUTIF', 'KA 34', '192.168.3.2', 'Siti Rahma', '081300001002'],
        ['ARGO WILIS', 'EKSEKUTIF', 'KA 5', '192.168.3.3', 'Edi Suryanto', '081300001003'],
        ['TURANGGA', 'EKSEKUTIF', 'KA 65', '192.168.3.4', 'Wawan Kurniawan', '081300001004'],
        ['LODAYA', 'EKSEKUTIF/EKONOMI', 'KA 91', '192.168.3.5', 'Hasan Basri', '081300001005'],
        ['MALABAR', 'EKSEKUTIF/EKONOMI', 'KA 121', '192.168.3.6', 'Dewi Kartika', '081300001006'],
    ];
    const serviceIds = {};
    for (const ts of trainServices) {
        db.run('INSERT INTO train_services (name, class, ka_number, ip_address, nama_pic, kontak_pic) VALUES (?, ?, ?, ?, ?, ?)', ts);
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

    // ---- USERS (expanded per SRS) ----
    db.run('INSERT OR IGNORE INTO users (id, username, password, role, nama, kontak, email) VALUES (?, ?, ?, ?, ?, ?, ?)', ['USR001', 'admin', 'admin123', 'Admin', 'Administrator', '081100000001', 'admin@eltran.co.id']);
    db.run('INSERT OR IGNORE INTO users (id, username, password, role, nama, kontak, email, id_kereta) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['USR002', 'operator', 'operator123', 'Operator', 'Operator Kereta', '081100000002', 'operator@eltran.co.id', String(serviceIds['ARGO WILIS'])]);
    db.run('INSERT OR IGNORE INTO users (id, username, password, role, nama, kontak, email, id_stasiun) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', ['USR003', 'supervisor', 'super123', 'Admin', 'Supervisor Pusat', '081100000003', 'supervisor@eltran.co.id', 'BD']);

    // ---- UNITS ----
    db.run('INSERT OR IGNORE INTO units (id, name, type, active) VALUES (?, ?, ?, ?)', ['U001', 'K1-01', 'Eksekutif', 1]);
    db.run('INSERT OR IGNORE INTO units (id, name, type, active) VALUES (?, ?, ?, ?)', ['U002', 'K1-02', 'Eksekutif', 1]);
    db.run('INSERT OR IGNORE INTO units (id, name, type, active) VALUES (?, ?, ?, ?)', ['U003', 'K1-03', 'Eksekutif', 1]);
    db.run('INSERT OR IGNORE INTO units (id, name, type, active) VALUES (?, ?, ?, ?)', ['U004', 'M1-01', 'Makan', 1]);
    db.run('INSERT OR IGNORE INTO units (id, name, type, active) VALUES (?, ?, ?, ?)', ['U005', 'P-01', 'Pembangkit', 1]);

    // ---- GERBONG (SRS: setiap kereta punya gerbong) ----
    const gerbongData = [];
    for (const [serviceName, svcId] of Object.entries(serviceIds)) {
        const count = serviceName.includes('ARGO') ? 8 : 6;
        for (let i = 1; i <= count; i++) {
            const gId = `GRB-${svcId}-${String(i).padStart(2, '0')}`;
            const tipe = i === 1 ? 'Lokomotif' : i === Math.ceil(count / 2) ? 'Makan' : 'Penumpang';
            const nama = i === 1 ? `LOK-${svcId}` : `${tipe.charAt(0)}${svcId}-${String(i).padStart(2, '0')}`;
            db.run('INSERT OR IGNORE INTO gerbong (id, ip_address, nama_gerbong, no_urut_gerbong, id_kereta) VALUES (?, ?, ?, ?, ?)',
                [gId, `192.168.4.${svcId}${String(i).padStart(2, '0')}`, nama, i, svcId]);
            gerbongData.push({ id: gId, serviceId: svcId, serviceName, seq: i });
        }
    }

    // ---- SENSOR (SRS: sensor per gerbong — GPS + Suhu + AQ) ----
    const sensorIds = [];
    for (const g of gerbongData) {
        // GPS sensor on each gerbong
        const gpsId = `SNS-GPS-${g.id}`;
        db.run('INSERT OR IGNORE INTO sensor (id, ip_address, nama_device, tipe_sensor, status, is_main, id_gerbong) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [gpsId, `192.168.6.${g.serviceId}${String(g.seq).padStart(2, '0')}`, `GPS ${g.id}`, 'GPS', 'Aktif', g.seq === 1 ? 1 : 0, g.id]);
        sensorIds.push({ id: gpsId, gerbong: g });
        // Temperature sensor on passenger carriages
        if (g.seq > 1) {
            const tempId = `SNS-TEMP-${g.id}`;
            db.run('INSERT OR IGNORE INTO sensor (id, ip_address, nama_device, tipe_sensor, status, is_main, id_gerbong) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [tempId, `192.168.7.${g.serviceId}${String(g.seq).padStart(2, '0')}`, `Suhu ${g.id}`, 'Suhu', 'Aktif', 0, g.id]);
        }
    }

    // ---- SENSOR_DATA (simulated recent GPS data for each GPS sensor) ----
    for (const s of sensorIds) {
        // Simulate a few recent GPS readings near the route stations
        const stationRows = getAll('SELECT st.latitude, st.longitude, st.name FROM route_stations rs JOIN stations st ON rs.station_id = st.id JOIN routes r ON rs.route_id = r.id WHERE r.train_service_id = ? ORDER BY rs.sequence_order LIMIT 3', [s.gerbong.serviceId]);
        if (stationRows.length > 0) {
            const base = stationRows[0];
            const jitter = (s.gerbong.seq - 1) * 0.001; // slight offset per gerbong
            db.run('INSERT OR IGNORE INTO sensor_data (id, latitude, longitude, altitude, kecepatan, suhu, poi, waktu_rekam, id_sensor) VALUES (?, ?, ?, ?, ?, ?, ?, datetime("now"), ?)',
                [`SD-${s.id}-1`, base.latitude + jitter, base.longitude + jitter, 694 + Math.random() * 10, 15 + Math.random() * 5, 24 + Math.random() * 3, base.name, s.id]);
        }
    }

    // ---- LOG_MAINTENANCE (SRS: maintenance records) ----
    const maintenanceSeeds = [
        ['LM001', '2025-01-15 08:00', '2025-01-15 16:00', 'Closed', 'High', 'Penggantian bantalan roda gerbong K1-02', serviceIds['ARGO BROMO ANGGREK']],
        ['LM002', '2025-02-01 09:00', '2025-02-02 12:00', 'Closed', 'Medium', 'Kalibrasi sensor GPS lokomotif', serviceIds['ARGO WILIS']],
        ['LM003', '2025-03-10 07:00', '', 'On Going', 'Medium', 'Pemeriksaan berkala AC gerbong penumpang', serviceIds['TURANGGA']],
        ['LM004', '2025-03-15 10:00', '', 'Open', 'Low', 'Pengecekan sistem pengereman rutin', serviceIds['LODAYA']],
    ];
    for (const m of maintenanceSeeds) {
        db.run('INSERT OR IGNORE INTO log_maintenance (id, mulai, selesai, status, prioritas, deskripsi, id_kereta) VALUES (?, ?, ?, ?, ?, ?, ?)', m);
    }

    // ---- LOG_OPERASIONAL (SRS: daily ops log) ----
    const operasionalSeeds = [
        ['LO001', '2025-03-01 05:30', 'Keberangkatan pagi sesuai jadwal', serviceIds['ARGO BROMO ANGGREK']],
        ['LO002', '2025-03-01 06:30', 'Keberangkatan pagi sesuai jadwal', serviceIds['ARGO PARAHYANGAN']],
        ['LO003', '2025-03-01 08:00', 'Keberangkatan pagi terlambat 5 menit', serviceIds['ARGO WILIS']],
        ['LO004', '2025-03-02 05:00', 'Kereta beroperasi normal', serviceIds['TURANGGA']],
    ];
    for (const o of operasionalSeeds) {
        db.run('INSERT OR IGNORE INTO log_operasional (id, waktu, catatan, id_kereta) VALUES (?, ?, ?, ?)', o);
    }

    // ---- PIDS STATE (default) ----
    const argoWilisRoute = buildRouteJson('ARGO WILIS');
    db.run(`INSERT OR IGNORE INTO pids_state (id, service_name, current_station, train_number, next_station, status, led_speed, speed, altitude, temperature, air_quality, display_mode, active_route_json) VALUES (1, 'ARGO WILIS', 'BANDUNG', '05', 'TASIKMALAYA', 'ON TIME', 60, 15, 694, 25.1, 'GOOD NOMINAL', 'pids', ?)`,
        [JSON.stringify(argoWilisRoute)]);

    // ---- INITIAL LOG ----
    db.run('INSERT INTO system_logs (id, timestamp, action, user, role, details) VALUES (?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), new Date().toISOString(), 'SYSTEM', 'system', 'System', 'Database initialized with authentic KAI data (SRS-compliant schema)']);

    console.log('[PIDS-DB] Seed data complete (SRS-compliant).');
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
        geojson: route.geojson || '',
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

export function updateRouteGeoJSON(name, geojsonString) {
    const normalized = name.toUpperCase();
    const service = getOne('SELECT id FROM train_services WHERE name = ?', [normalized]);
    if (!service) return { error: 'Rute tidak ditemukan' };

    let route = getOne('SELECT id FROM routes WHERE train_service_id = ?', [service.id]);
    if (!route) {
        db.run('INSERT INTO routes (train_service_id, direction) VALUES (?, ?)', [service.id, '']);
        route = getOne('SELECT id FROM routes WHERE train_service_id = ?', [service.id]);
    }

    // Save GeoJSON string
    const stringified = (geojsonString === "" || geojsonString === null) ? "" : (typeof geojsonString === 'string' ? geojsonString : JSON.stringify(geojsonString));
    db.run('UPDATE routes SET geojson = ? WHERE id = ?', [stringified, route.id]);

    if (stringified === "") {
        // Clear stations if GeoJSON is cleared
        db.run('DELETE FROM route_stations WHERE route_id = ?', [route.id]);
        db.run('UPDATE routes SET svg_path = "" WHERE id = ?', [route.id]);
    } else {
        // Parse GeoJSON and automatically populate route_stations
        try {
            const geojson = typeof geojsonString === 'string' ? JSON.parse(geojsonString) : geojsonString;
            const features = geojson.features || (geojson.type === 'FeatureCollection' ? [] : [geojson]);

            // Find all points to act as stations
            const stations = features.filter(f => f.geometry?.type === 'Point' || f.properties?.type === 'station');

            if (stations.length > 0) {
                // Clear existing stations for this route
                db.run('DELETE FROM route_stations WHERE route_id = ?', [route.id]);

                stations.forEach((stnFeature, i) => {
                    const stnName = (stnFeature.properties?.name || `Station ${i + 1}`).toUpperCase();
                    const coords = stnFeature.geometry?.coordinates || [0, 0];

                    // create an ID for the station (short code or uppercase name)
                    const stnIdArr = stnName.split(' ');
                    let stnLabel = stnIdArr.length === 1 ? stnName.substring(0, 3) : stnIdArr.map(w => w[0]).join('');
                    if (stnLabel.length < 2) stnLabel = stnName.substring(0, 3);
                    stnLabel = stnLabel.toUpperCase();

                    // Insert or ignore into master stations
                    db.run('INSERT OR IGNORE INTO stations (id, name, city, longitude, latitude) VALUES (?, ?, ?, ?, ?)',
                        [stnLabel, stnName, stnName, coords[0], coords[1]]);

                    // Update coordinates in case they shifted
                    db.run('UPDATE stations SET longitude = ?, latitude = ? WHERE id = ?', [coords[0], coords[1], stnLabel]);

                    // Generate a dummy SVG position for UI backward compatibility
                    const svgPos = `M ${80 + Math.round(i * 100)} 200`;

                    // Add to route_stations
                    db.run('INSERT INTO route_stations (route_id, station_id, sequence_order, svg_position, svg_label) VALUES (?, ?, ?, ?, ?)',
                        [route.id, stnLabel, i + 1, svgPos, stnLabel]);
                });

                // Also generate a basic SVG path for compatibility
                if (stations.length > 1) {
                    const pathPoints = stations.map((_, i) => `${80 + Math.round(i * 100)} 200`).join(' L ');
                    db.run('UPDATE routes SET svg_path = ? WHERE id = ?', [`M ${pathPoints}`, route.id]);
                }
            }
        } catch (e) {
            console.error("[PIDS-DB] Error parsing GeoJSON for stations extraction:", e);
        }
    }

    saveDb();

    // Refresh pids_state.active_route_json so the frontend picks up the new GeoJSON + stations
    try {
        const currentState = getOne('SELECT * FROM pids_state WHERE id = 1');
        if (currentState && currentState.service_name.toUpperCase() === normalized) {
            const freshRoute = buildRouteJson(normalized);
            if (freshRoute) {
                const firstStation = freshRoute.stations[0] || '-';
                const secondStation = freshRoute.stations[1] || '-';
                db.run(`UPDATE pids_state SET active_route_json = ?, current_station = ?, next_station = ? WHERE id = 1`,
                    [JSON.stringify(freshRoute), firstStation, secondStation]);
                saveDb();
                console.log(`[PIDS-DB] Active state refreshed with GeoJSON data for ${normalized}`);
            }
        }
    } catch (e) {
        console.error('[PIDS-DB] Error refreshing state after GeoJSON upload:', e);
    }

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

export function addStation({ id, name, city, latitude, longitude, ip_address, nama_pic, kontak_pic, kode_kota, alamat, provinsi, kabupaten_kota, kecamatan, kelurahan_desa, kode_pos }) {
    const existing = getOne('SELECT id FROM stations WHERE id = ?', [id]);
    if (existing) return { error: 'Station ID already exists' };
    db.run(
        'INSERT INTO stations (id, name, city, latitude, longitude, ip_address, nama_pic, kontak_pic, kode_kota, alamat, provinsi, kabupaten_kota, kecamatan, kelurahan_desa, kode_pos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id.toUpperCase(), name.toUpperCase(), city.toUpperCase(), latitude || 0, longitude || 0, ip_address || '', nama_pic || '', kontak_pic || '', kode_kota || '', alamat || '', provinsi || '', kabupaten_kota || '', kecamatan || '', kelurahan_desa || '', kode_pos || '']
    );
    saveDb();
    return { success: true, station: getOne('SELECT * FROM stations WHERE id = ?', [id.toUpperCase()]) };
}

export function updateStation(id, data) {
    const existing = getOne('SELECT id FROM stations WHERE id = ?', [id]);
    if (!existing) return { error: 'Station not found' };
    const fields = ['name', 'city', 'latitude', 'longitude', 'ip_address', 'nama_pic', 'kontak_pic', 'kode_kota', 'alamat', 'provinsi', 'kabupaten_kota', 'kecamatan', 'kelurahan_desa', 'kode_pos', 'poi', 'media'];
    const sets = [];
    const vals = [];
    for (const f of fields) {
        if (data[f] !== undefined) {
            sets.push(`${f} = ?`);
            vals.push(typeof data[f] === 'string' && ['name', 'city'].includes(f) ? data[f].toUpperCase() : data[f]);
        }
    }
    if (sets.length === 0) return { error: 'No fields to update' };
    vals.push(id);
    db.run(`UPDATE stations SET ${sets.join(', ')} WHERE id = ?`, vals);
    saveDb();
    return { success: true, station: getOne('SELECT * FROM stations WHERE id = ?', [id]) };
}

export function deleteStation(id) {
    const station = getOne('SELECT * FROM stations WHERE id = ?', [id]);
    if (!station) return { error: 'Station not found' };
    db.run('DELETE FROM stations WHERE id = ?', [id]);
    saveDb();
    return { success: true, station };
}

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

export function addSchedule({ route_id, schedule_date, status, notes, stops }) {
    db.run('INSERT INTO schedules (route_id, schedule_date, status, notes) VALUES (?, ?, ?, ?)',
        [route_id, schedule_date || new Date().toISOString().slice(0, 10), status || 'ON_TIME', notes || '']);
    const schedId = getOne('SELECT last_insert_rowid() as id').id;
    if (Array.isArray(stops)) {
        for (const stop of stops) {
            db.run('INSERT INTO schedule_stops (schedule_id, route_station_id, arrival_time, departure_time, platform, stop_status) VALUES (?, ?, ?, ?, ?, ?)',
                [schedId, stop.route_station_id, stop.arrival_time || '', stop.departure_time || '', stop.platform || 1, stop.stop_status || 'SCHEDULED']);
        }
    }
    saveDb();
    return { success: true, id: schedId };
}

export function updateSchedule(id, data) {
    const existing = getOne('SELECT id FROM schedules WHERE id = ?', [id]);
    if (!existing) return { error: 'Schedule not found' };
    if (data.status !== undefined || data.notes !== undefined || data.schedule_date !== undefined) {
        const sets = [];
        const vals = [];
        if (data.status !== undefined) { sets.push('status = ?'); vals.push(data.status); }
        if (data.notes !== undefined) { sets.push('notes = ?'); vals.push(data.notes); }
        if (data.schedule_date !== undefined) { sets.push('schedule_date = ?'); vals.push(data.schedule_date); }
        vals.push(id);
        db.run(`UPDATE schedules SET ${sets.join(', ')} WHERE id = ?`, vals);
    }
    saveDb();
    return { success: true };
}

export function deleteSchedule(id) {
    const sched = getOne('SELECT * FROM schedules WHERE id = ?', [id]);
    if (!sched) return { error: 'Schedule not found' };
    db.run('DELETE FROM schedule_stops WHERE schedule_id = ?', [id]);
    db.run('DELETE FROM schedules WHERE id = ?', [id]);
    saveDb();
    return { success: true };
}

// ============================================================
// GERBONG OPERATIONS
// ============================================================

export function getGerbong(keretaId) {
    if (keretaId) {
        return getAll('SELECT g.*, ts.name as kereta_name FROM gerbong g JOIN train_services ts ON g.id_kereta = ts.id WHERE g.id_kereta = ? ORDER BY g.no_urut_gerbong', [keretaId]);
    }
    return getAll('SELECT g.*, ts.name as kereta_name FROM gerbong g JOIN train_services ts ON g.id_kereta = ts.id ORDER BY g.id_kereta, g.no_urut_gerbong');
}

export function addGerbong({ nama_gerbong, no_urut_gerbong, id_kereta, ip_address }) {
    const id = `GRB-${id_kereta}-${String(no_urut_gerbong).padStart(2, '0')}`;
    db.run('INSERT OR IGNORE INTO gerbong (id, ip_address, nama_gerbong, no_urut_gerbong, id_kereta) VALUES (?, ?, ?, ?, ?)',
        [id, ip_address || '', nama_gerbong, no_urut_gerbong, id_kereta]);
    saveDb();
    return { success: true, id };
}

export function deleteGerbong(id) {
    const g = getOne('SELECT * FROM gerbong WHERE id = ?', [id]);
    if (!g) return { error: 'Gerbong not found' };
    db.run('DELETE FROM gerbong WHERE id = ?', [id]);
    saveDb();
    return { success: true };
}

// ============================================================
// SENSOR OPERATIONS
// ============================================================

export function getSensors(gerbongId) {
    if (gerbongId) {
        return getAll('SELECT * FROM sensor WHERE id_gerbong = ? ORDER BY tipe_sensor', [gerbongId]);
    }
    return getAll('SELECT s.*, g.nama_gerbong, g.id_kereta FROM sensor s JOIN gerbong g ON s.id_gerbong = g.id ORDER BY g.id_kereta, g.no_urut_gerbong');
}

export function getSensorData(sensorId, limit = 50) {
    return getAll('SELECT * FROM sensor_data WHERE id_sensor = ? ORDER BY waktu_rekam DESC LIMIT ?', [sensorId, limit]);
}

// ============================================================
// LOG MAINTENANCE OPERATIONS
// ============================================================

export function getLogMaintenance() {
    return getAll('SELECT lm.*, ts.name as kereta_name FROM log_maintenance lm JOIN train_services ts ON lm.id_kereta = ts.id ORDER BY lm.mulai DESC');
}

export function addLogMaintenance({ mulai, selesai, status, prioritas, deskripsi, id_kereta }) {
    const id = `LM${String(Date.now()).slice(-6)}`;
    db.run('INSERT INTO log_maintenance (id, mulai, selesai, status, prioritas, deskripsi, id_kereta) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, mulai, selesai || '', status || 'Open', prioritas || 'Medium', deskripsi || '', id_kereta]);
    saveDb();
    return { success: true, id };
}

export function updateLogMaintenance(id, data) {
    const existing = getOne('SELECT id FROM log_maintenance WHERE id = ?', [id]);
    if (!existing) return { error: 'Maintenance log not found' };
    const sets = [];
    const vals = [];
    for (const f of ['selesai', 'status', 'prioritas', 'deskripsi']) {
        if (data[f] !== undefined) { sets.push(`${f} = ?`); vals.push(data[f]); }
    }
    if (sets.length === 0) return { error: 'No fields to update' };
    vals.push(id);
    db.run(`UPDATE log_maintenance SET ${sets.join(', ')} WHERE id = ?`, vals);
    saveDb();
    return { success: true };
}

// ============================================================
// LOG OPERASIONAL OPERATIONS
// ============================================================

export function getLogOperasional() {
    return getAll('SELECT lo.*, ts.name as kereta_name FROM log_operasional lo JOIN train_services ts ON lo.id_kereta = ts.id ORDER BY lo.waktu DESC');
}

export function addLogOperasional({ catatan, id_kereta, id_jadwal }) {
    const id = `LO${String(Date.now()).slice(-6)}`;
    db.run('INSERT INTO log_operasional (id, waktu, catatan, id_kereta, id_jadwal) VALUES (?, datetime("now"), ?, ?, ?)',
        [id, catatan || '', id_kereta, id_jadwal || null]);
    saveDb();
    return { success: true, id };
}

// ============================================================
// GPS FLEET — aggregate latest GPS data per train
// ============================================================

export function getGpsFleet() {
    // Get latest GPS sensor reading for each train's main (first) gerbong
    return getAll(`
        SELECT ts.id as kereta_id, ts.name as kereta_name, ts.ka_number,
               g.id as gerbong_id, g.nama_gerbong,
               sd.latitude, sd.longitude, sd.altitude, sd.kecepatan, sd.suhu, sd.poi, sd.waktu_rekam
        FROM train_services ts
        JOIN gerbong g ON g.id_kereta = ts.id AND g.no_urut_gerbong = 1
        JOIN sensor s ON s.id_gerbong = g.id AND s.tipe_sensor = 'GPS' AND s.is_main = 1
        LEFT JOIN sensor_data sd ON sd.id_sensor = s.id
        ORDER BY ts.name
    `);
}

export function getGpsGerbong(keretaId) {
    return getAll(`
        SELECT g.id as gerbong_id, g.nama_gerbong, g.no_urut_gerbong,
               s.id as sensor_id, s.tipe_sensor, s.status as sensor_status,
               sd.latitude, sd.longitude, sd.altitude, sd.kecepatan, sd.suhu, sd.poi, sd.waktu_rekam
        FROM gerbong g
        JOIN sensor s ON s.id_gerbong = g.id AND s.tipe_sensor = 'GPS'
        LEFT JOIN sensor_data sd ON sd.id_sensor = s.id
        WHERE g.id_kereta = ?
        ORDER BY g.no_urut_gerbong
    `, [keretaId]);
}

// ============================================================
// DB DUMP (backward-compatible with GET /api/db)
// ============================================================

export function getDbDump() {
    // Calculate gerbong counts per train service
    const gerbongCountsRaw = getAll(`
        SELECT ts.name, COUNT(g.id) as count
        FROM train_services ts
        LEFT JOIN gerbong g ON ts.id = g.id_kereta
        GROUP BY ts.id, ts.name
    `);

    const gerbongCounts = {};
    gerbongCountsRaw.forEach(row => {
        gerbongCounts[row.name] = row.count;
    });

    return {
        trainNames: getTrainNames(),
        trainNumbers: getTrainNumbers(),
        routes: getRoutes(),
        users: getUsersWithPassword(),
        units: getUnits(),
        gerbongCounts: gerbongCounts
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
