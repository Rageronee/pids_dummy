/**
 * PIDS KAI — PostgreSQL Database Layer
 * Replaces SQLite with a proper relational database.
 */
import pg from 'pg';
const { Pool } = pg;
import crypto from 'crypto';

// ---- Password Hashing Utilities (scrypt, built-in Node.js) ----
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

function hashPassword(password) {
    const salt = crypto.randomBytes(SALT_LENGTH).toString('hex');
    const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
    // Support legacy plaintext passwords during migration
    if (!storedHash.includes(':')) {
        return password === storedHash;
    }
    const [salt, hash] = storedHash.split(':');
    const derivedHash = crypto.scryptSync(password, salt, KEY_LENGTH).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(derivedHash, 'hex'));
}

let pool = null;

// ============================================================
// INITIALIZATION
// ============================================================

export async function initDatabase() {
    const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:greget371@localhost:5432/eltran_pids';
    pool = new Pool({ connectionString });

    try {
        await pool.query('SELECT NOW()');
        console.log('[PIDS-DB] PostgreSQL connected successfully');
        await createTables();
        // Migration: Add geojson_filename to routes if it doesn't exist
        try {
            await pool.query('ALTER TABLE routes ADD COLUMN IF NOT EXISTS geojson_filename TEXT DEFAULT \'\'');
        } catch (e) { console.error('[PIDS-DB] Migration failed (geojson_filename):', e.message); }
        try {
            await pool.query('ALTER TABLE schedules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
        } catch (e) { console.error('[PIDS-DB] Migration failed (updated_at):', e.message); }
        await seedData();
        console.log('[PIDS-DB] Database schema and seed data verified');
    } catch (err) {
        console.error('[PIDS-DB] Database initialization error:', err.message);
    }
    return pool;
}

export function startAutoSave() { }
export function saveDb() { }

async function query(sql, params = []) {
    let pgSql = sql;
    let index = 1;
    while (pgSql.includes('?')) {
        pgSql = pgSql.replace('?', `$${index++}`);
    }
    return await pool.query(pgSql, params);
}

async function getOne(sql, params = []) {
    const res = await query(sql, params);
    return res.rows[0] || null;
}

async function getAll(sql, params = []) {
    const res = await query(sql, params);
    return res.rows;
}

async function createTables() {
    await pool.query(`
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

    await pool.query(`
        CREATE TABLE IF NOT EXISTS train_services (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            class TEXT NOT NULL DEFAULT 'EKSEKUTIF',
            ka_number TEXT NOT NULL DEFAULT '',
            gerbong_count INTEGER DEFAULT 10,
            ip_address TEXT DEFAULT '',
            nama_pic TEXT DEFAULT '',
            kontak_pic TEXT DEFAULT '',
            media TEXT DEFAULT ''
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS routes (
            id SERIAL PRIMARY KEY,
            train_service_id INTEGER NOT NULL UNIQUE,
            direction TEXT NOT NULL DEFAULT '',
            svg_path TEXT DEFAULT '',
            geojson TEXT DEFAULT '',
            geojson_filename TEXT DEFAULT '',
            CONSTRAINT fk_train_service FOREIGN KEY (train_service_id) REFERENCES train_services(id) ON DELETE CASCADE
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS route_stations (
            id SERIAL PRIMARY KEY,
            route_id INTEGER NOT NULL,
            station_id TEXT NOT NULL,
            sequence_order INTEGER NOT NULL,
            svg_position TEXT DEFAULT '',
            svg_label TEXT DEFAULT '',
            keterangan TEXT DEFAULT 'antara',
            CONSTRAINT fk_route FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
            CONSTRAINT fk_station FOREIGN KEY (station_id) REFERENCES stations(id)
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS schedules (
            id SERIAL PRIMARY KEY,
            route_id INTEGER NOT NULL,
            schedule_date TEXT NOT NULL DEFAULT (CURRENT_DATE::text),
            status TEXT NOT NULL DEFAULT 'ON_TIME',
            notes TEXT DEFAULT '',
            catatan TEXT DEFAULT '',
            media TEXT DEFAULT '',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_route_sched FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
            CONSTRAINT uq_route_date UNIQUE (route_id, schedule_date)
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS schedule_stops (
            id SERIAL PRIMARY KEY,
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
            CONSTRAINT fk_schedule FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
            CONSTRAINT fk_route_station FOREIGN KEY (route_station_id) REFERENCES route_stations(id)
        )
    `);

    await pool.query(`
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

    await pool.query(`
        CREATE TABLE IF NOT EXISTS units (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            type TEXT NOT NULL,
            active INTEGER NOT NULL DEFAULT 1
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS pids_state (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            service_name TEXT NOT NULL DEFAULT '',
            current_station TEXT NOT NULL DEFAULT '',
            train_number TEXT NOT NULL DEFAULT '',
            next_station TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'ON TIME',
            led_speed INTEGER NOT NULL DEFAULT 60,
            speed REAL NOT NULL DEFAULT 15,
            altitude REAL NOT NULL DEFAULT 694,
            temperature REAL NOT NULL DEFAULT 25.1,
            air_quality TEXT NOT NULL DEFAULT 'GOOD NOMINAL',
            display_mode TEXT NOT NULL DEFAULT 'pids',
            active_route_json TEXT DEFAULT '{}',
            geofencing_inner_radius INTEGER DEFAULT 250,
            geofencing_outer_radius INTEGER DEFAULT 750,
            show_train_number BOOLEAN DEFAULT TRUE,
            led_active BOOLEAN DEFAULT TRUE,
            video_playlist_json TEXT DEFAULT '[]',
            active_video_index INTEGER DEFAULT 0,
            video_is_playing BOOLEAN DEFAULT FALSE,
            video_playback_mode TEXT DEFAULT 'normal',
            video_volume INTEGER DEFAULT 50,
            video_tv_standby BOOLEAN DEFAULT TRUE,
            video_playback_progress REAL DEFAULT 0,
            jumlah_kereta INTEGER DEFAULT 10
        )
    `);

    try { await pool.query("ALTER TABLE pids_state ADD COLUMN IF NOT EXISTS show_train_number BOOLEAN DEFAULT TRUE;"); } catch (e) { }
    try { await pool.query("ALTER TABLE train_services ADD COLUMN IF NOT EXISTS gerbong_count INTEGER DEFAULT 10;"); } catch (e) { }
    try { await pool.query("ALTER TABLE pids_state ADD COLUMN IF NOT EXISTS led_active BOOLEAN DEFAULT TRUE;"); } catch (e) { }
    try { await pool.query("ALTER TABLE pids_state ADD COLUMN IF NOT EXISTS video_playlist_json TEXT DEFAULT '[]';"); } catch (e) { }
    try { await pool.query("ALTER TABLE pids_state ADD COLUMN IF NOT EXISTS active_video_index INTEGER DEFAULT 0;"); } catch (e) { }
    try { await pool.query("ALTER TABLE pids_state ADD COLUMN IF NOT EXISTS video_is_playing BOOLEAN DEFAULT FALSE;"); } catch (e) { }
    try { await pool.query("ALTER TABLE pids_state ADD COLUMN IF NOT EXISTS video_playback_mode TEXT DEFAULT 'normal';"); } catch (e) { }
    try { await pool.query("ALTER TABLE pids_state ADD COLUMN IF NOT EXISTS video_volume INTEGER DEFAULT 50;"); } catch (e) { }
    try { await pool.query("ALTER TABLE pids_state ADD COLUMN IF NOT EXISTS video_tv_standby BOOLEAN DEFAULT TRUE;"); } catch (e) { }
    try { await pool.query("ALTER TABLE pids_state ADD COLUMN IF NOT EXISTS video_playback_progress REAL DEFAULT 0;"); } catch (e) { }
    try { await pool.query("ALTER TABLE pids_state ADD COLUMN IF NOT EXISTS jumlah_kereta INTEGER DEFAULT 10;"); } catch (e) { }

    await pool.query(`
        CREATE TABLE IF NOT EXISTS system_logs (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            action TEXT NOT NULL,
            "user" TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'System',
            details TEXT DEFAULT '',
            data_json TEXT DEFAULT ''
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS announcements (
            id SERIAL PRIMARY KEY,
            type TEXT NOT NULL DEFAULT 'INFO',
            message TEXT NOT NULL,
            priority INTEGER NOT NULL DEFAULT 5,
            active INTEGER NOT NULL DEFAULT 1,
            created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text)
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS gerbong (
            id TEXT PRIMARY KEY,
            ip_address TEXT DEFAULT '',
            nama_gerbong TEXT NOT NULL,
            no_urut_gerbong INTEGER NOT NULL DEFAULT 1,
            id_kereta INTEGER NOT NULL,
            CONSTRAINT fk_kereta FOREIGN KEY (id_kereta) REFERENCES train_services(id) ON DELETE CASCADE
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS sensor (
            id TEXT PRIMARY KEY,
            ip_address TEXT DEFAULT '',
            nama_device TEXT NOT NULL,
            tipe_sensor TEXT NOT NULL DEFAULT 'GPS',
            status TEXT NOT NULL DEFAULT 'Aktif',
            is_main INTEGER NOT NULL DEFAULT 0,
            id_gerbong TEXT NOT NULL,
            CONSTRAINT fk_gerbong FOREIGN KEY (id_gerbong) REFERENCES gerbong(id) ON DELETE CASCADE
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS sensor_data (
            id TEXT PRIMARY KEY,
            latitude REAL DEFAULT 0,
            longitude REAL DEFAULT 0,
            altitude REAL DEFAULT 0,
            kecepatan REAL DEFAULT 0,
            suhu REAL DEFAULT 0,
            poi TEXT DEFAULT '',
            waktu_rekam TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text),
            id_sensor TEXT NOT NULL,
            CONSTRAINT fk_sensor FOREIGN KEY (id_sensor) REFERENCES sensor(id) ON DELETE CASCADE
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS log_maintenance (
            id TEXT PRIMARY KEY,
            mulai TEXT NOT NULL,
            selesai TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'Open',
            prioritas TEXT NOT NULL DEFAULT 'Medium',
            deskripsi TEXT DEFAULT '',
            id_kereta INTEGER NOT NULL,
            CONSTRAINT fk_kereta_mnt FOREIGN KEY (id_kereta) REFERENCES train_services(id) ON DELETE CASCADE
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS log_operasional (
            id TEXT PRIMARY KEY,
            waktu TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text),
            catatan TEXT DEFAULT '',
            id_kereta INTEGER NOT NULL,
            id_jadwal INTEGER DEFAULT NULL,
            CONSTRAINT fk_kereta_ops FOREIGN KEY (id_kereta) REFERENCES train_services(id) ON DELETE CASCADE,
            CONSTRAINT fk_sched_ops FOREIGN KEY (id_jadwal) REFERENCES schedules(id) ON DELETE SET NULL
        )
    `);

    await seedData();
}

async function seedData() {
    console.log('[PIDS-DB] Seeding authentic KAI data to PostgreSQL...');

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
        await query('INSERT INTO stations (id, name, city, latitude, longitude, ip_address, nama_pic, kontak_pic, kode_kota, alamat, provinsi, kabupaten_kota, kecamatan, kelurahan_desa, kode_pos) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING', s);
    }

    const trainServices = [];
    const serviceIds = {};

    const defaultRoutes = {};

    // Initialize empty or generic state instead of hardcoded 'ARGO WILIS'
    await query(`INSERT INTO pids_state (id, service_name, current_station, train_number, next_station, status, led_speed, speed, altitude, temperature, air_quality, display_mode, active_route_json, jumlah_kereta) 
                 VALUES (1, '', '', '', '', 'STANDBY', 60, 0, 0, 0, '-', 'pids', '{}', 10)
                 ON CONFLICT (id) DO NOTHING`);

    const hashedAdminPw = hashPassword('admin123');
    await query('INSERT INTO users (id, username, password, role, nama, kontak, email) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING',
        ['USR001', 'admin', hashedAdminPw, 'Admin', 'Administrator', '081100000001', 'admin@eltran.co.id']);
}

function extractStationsFromGeoJSON(geojson) {
    if (!geojson || !geojson.features) return [];
    const stations = geojson.features
        .filter(f => f.geometry && f.geometry.type === 'Point' && f.properties)
        .map(f => {
            const p = f.properties;
            // Try common name property variants
            const name = p.name || p.Name || p.STATION || p.Station || p.nama || p.Nama || p.label || '';
            return name.toString().toUpperCase().trim();
        })
        .filter(name => name.length > 0);
    return [...new Set(stations)];
}

async function getRouteStations(serviceName) {
    const service = await getOne('SELECT id FROM train_services WHERE name = ?', [serviceName]);
    if (!service) return [];
    const route = await getOne('SELECT id FROM routes WHERE train_service_id = ?', [service.id]);
    if (!route) return [];
    const stations = await getAll(`
        SELECT s.name 
        FROM route_stations rs
        JOIN stations s ON rs.station_id = s.id
        WHERE rs.route_id = ?
        ORDER BY rs.sequence_order
    `, [route.id]);
    return stations.map(s => s.name.toUpperCase());
}

// ============================================================
// STATE OPERATIONS
// ============================================================

export async function getState() {
    const row = await getOne('SELECT * FROM pids_state WHERE id = 1');
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
        geofencingInnerRadius: row.geofencing_inner_radius,
        geofencingOuterRadius: row.geofencing_outer_radius,
        showTrainNumber: row.show_train_number !== false,
        ledActive: row.led_active !== false,
        videoPlaylist: JSON.parse(row.video_playlist_json || '[]'),
        activeVideoIndex: row.active_video_index ?? 0,
        isPlaying: row.video_is_playing ?? false,
        playbackMode: row.video_playback_mode || 'normal',
        volume: row.video_volume ?? 50,
        tvStandby: row.video_tv_standby ?? true,
        playbackProgress: row.video_playback_progress ?? 0,
        jumlahKereta: row.jumlah_kereta ?? 10,
    };
}

function getDefaultState() {
    return {
        serviceName: '', currentStation: '-', trainNumber: '',
        nextStation: '-', status: 'STANDBY', ledSpeed: 60, speed: 0,
        altitude: 0, temperature: 0, airQuality: '-', displayMode: 'pids',
        stations: [],
        activeRoute: null,
        geofencingInnerRadius: 250,
        geofencingOuterRadius: 750,
        showTrainNumber: true,
        ledActive: true,
    };
}

export async function updateState(updates) {
    const current = await getState();
    const merged = { ...current, ...updates };
    let activeRouteJson = current.activeRoute ? JSON.stringify(current.activeRoute) : '{}';
    if (updates.activeRoute !== undefined) {
        activeRouteJson = updates.activeRoute ? JSON.stringify(updates.activeRoute) : '{}';
    }

    await query(`INSERT INTO pids_state (id, service_name, current_station, train_number, next_station, status, led_speed, speed, altitude, temperature, air_quality, display_mode, active_route_json, geofencing_inner_radius, geofencing_outer_radius, show_train_number, led_active, video_playlist_json, active_video_index, video_is_playing, video_playback_progress, video_playback_mode, video_volume, video_tv_standby, jumlah_kereta) 
                 VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
                 ON CONFLICT (id) DO UPDATE SET 
                    service_name = EXCLUDED.service_name,
                    current_station = EXCLUDED.current_station,
                    train_number = EXCLUDED.train_number,
                    next_station = EXCLUDED.next_station,
                    status = EXCLUDED.status,
                    led_speed = EXCLUDED.led_speed,
                    speed = EXCLUDED.speed,
                    altitude = EXCLUDED.altitude,
                    temperature = EXCLUDED.temperature,
                    air_quality = EXCLUDED.air_quality,
                    display_mode = EXCLUDED.display_mode,
                    active_route_json = EXCLUDED.active_route_json,
                    geofencing_inner_radius = EXCLUDED.geofencing_inner_radius,
                    geofencing_outer_radius = EXCLUDED.geofencing_outer_radius,
                    show_train_number = EXCLUDED.show_train_number,
                    led_active = EXCLUDED.led_active,
                    video_playlist_json = EXCLUDED.video_playlist_json,
                    active_video_index = EXCLUDED.active_video_index,
                    video_is_playing = EXCLUDED.video_is_playing,
                    video_playback_progress = EXCLUDED.video_playback_progress,
                    video_playback_mode = EXCLUDED.video_playback_mode,
                    video_volume = EXCLUDED.video_volume,
                    video_tv_standby = EXCLUDED.video_tv_standby,
                    jumlah_kereta = EXCLUDED.jumlah_kereta`,
        [
            merged.serviceName, merged.currentStation, merged.trainNumber, merged.nextStation, merged.status, merged.ledSpeed, merged.speed, merged.altitude, merged.temperature, merged.airQuality, merged.displayMode, activeRouteJson,
            merged.geofencingInnerRadius || 250, merged.geofencingOuterRadius || 750, merged.showTrainNumber !== false, merged.ledActive !== false,
            JSON.stringify(merged.videoPlaylist || []), merged.activeVideoIndex ?? 0, merged.isPlaying ?? false, merged.playbackProgress ?? 0, merged.playbackMode || 'normal',
            merged.volume ?? 50, merged.tvStandby ?? true, merged.jumlahKereta ?? 10
        ]);
    return await getState();
}

// ============================================================
// LOG OPERATIONS
// ============================================================

export async function getLogs(filter = {}) {
    let sql = 'SELECT * FROM system_logs';
    const params = [];
    let paramIdx = 1;
    if (filter.action) { sql += ` WHERE action = $${paramIdx++}`; params.push(filter.action); }
    sql += ' ORDER BY timestamp DESC';
    const limit = Math.min(Math.max(parseInt(filter.limit) || 1000, 1), 5000);
    sql += ` LIMIT $${paramIdx++}`;
    params.push(limit);
    return await getAll(sql, params);
}

export async function writeLog(entry) {
    await query('INSERT INTO system_logs (id, timestamp, action, "user", role, details, data_json) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [crypto.randomUUID(), new Date().toISOString(), entry.action, entry.user, entry.role || 'System', entry.details || '', entry.data ? JSON.stringify(entry.data) : '']);
}

// ============================================================
// CRUD OPERATIONS (Async versions)
// ============================================================

export async function getUsers() { return await getAll('SELECT id, username, role, nama FROM users'); }
export async function getUsersWithPassword() { return await getAll('SELECT * FROM users'); }
export async function findUser(username, password) {
    const user = await getOne('SELECT * FROM users WHERE username = $1', [username]);
    if (!user) return null;
    if (!verifyPassword(password, user.password)) return null;
    return user;
}
export async function getTrains() {
    return await getAll('SELECT * FROM train_services ORDER BY id');
}

export async function getTrainNames() {
    const rows = await getAll('SELECT name FROM train_services ORDER BY id');
    return rows.map(r => r.name);
}
export async function getStations() { return await getAll('SELECT * FROM stations ORDER BY name'); }
export async function getRoutes() {
    const services = await getAll('SELECT * FROM train_services ORDER BY id');
    const routes = {};
    for (const service of services) {
        const dbRoute = await getOne('SELECT * FROM routes WHERE train_service_id = $1', [service.id]);

        // Always try to fetch stations from route_stations table as source of truth
        let stations = [];
        if (dbRoute) {
            const stationRows = await getAll(`
                SELECT s.name 
                FROM route_stations rs
                JOIN stations s ON rs.station_id = s.id
                WHERE rs.route_id = $1
                ORDER BY rs.sequence_order
            `, [dbRoute.id]);
            stations = stationRows.map(r => r.name);
        }

        if (dbRoute) {
            const parsed = JSON.parse(dbRoute.geojson || '{}');
            routes[service.name] = {
                ...parsed,
                name: service.name,
                stations: stations.length > 0 ? stations : (parsed.stations || []),
                geojson: dbRoute.geojson,
                geojson_filename: dbRoute.geojson_filename
            };
        } else {
            routes[service.name] = {
                name: service.name,
                stations: stations,
                path: '',
                nodes: []
            };
        }
    }
    return routes;
}
export async function getUnits() { return await getAll('SELECT * FROM units'); }
export async function getDbDump() {
    const services = await getAll('SELECT name, gerbong_count FROM train_services');
    const gerbongCounts = {};
    services.forEach(s => {
        gerbongCounts[s.name] = s.gerbong_count;
    });

    return {
        trainNames: await getTrainNames(),
        trainNumbers: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'],
        routes: await getRoutes(),
        users: await getUsersWithPassword(),
        units: await getUnits(),
        gerbongCounts
    };
}
export async function closeDatabase() { if (pool) { await pool.end(); pool = null; } }

export async function addStation(data) {
    try {
        await query('INSERT INTO stations (id, name, city, latitude, longitude, ip_address, nama_pic, kontak_pic, kode_kota, alamat, provinsi, kabupaten_kota, kecamatan, kelurahan_desa, kode_pos) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, city = EXCLUDED.city, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, ip_address = EXCLUDED.ip_address, nama_pic = EXCLUDED.nama_pic, kontak_pic = EXCLUDED.kontak_pic, kode_kota = EXCLUDED.kode_kota, alamat = EXCLUDED.alamat, provinsi = EXCLUDED.provinsi, kabupaten_kota = EXCLUDED.kabupaten_kota, kecamatan = EXCLUDED.kecamatan, kelurahan_desa = EXCLUDED.kelurahan_desa, kode_pos = EXCLUDED.kode_pos',
            [data.id, data.name, data.city, data.latitude, data.longitude, data.ip_address, data.nama_pic, data.kontak_pic, data.kode_kota, data.alamat, data.provinsi, data.kabupaten_kota, data.kecamatan, data.kelurahan_desa, data.kode_pos]);
        return { success: true, station: data };
    } catch (e) { return { error: e.message }; }
}

export async function updateStation(id, data) {
    return await addStation({ ...data, id });
}

export async function deleteStation(id) {
    try {
        await query('DELETE FROM stations WHERE id = $1', [id]);
        return { success: true };
    } catch (e) { return { error: e.message }; }
}

export async function addSchedule(data) {
    // Basic schedule implementation for now, expecting proper route mapping later
    try {
        const id = crypto.randomUUID(); // just return a dummy id or string id if not using SERIAL properly in POST yet
        return { success: true, id };
    } catch (e) { return { error: e.message }; }
}

export async function updateSchedule(id, data) { return { success: true }; }
export async function deleteSchedule(id) {
    try {
        await query('DELETE FROM schedules WHERE id = $1', [id]);
        return { success: true };
    } catch (e) { return { error: e.message }; }
}

export async function getSchedules() {
    try {
        const schedules = await getAll(`
            SELECT s.*, r.direction, t.name as train_name, t.ka_number
            FROM schedules s
            LEFT JOIN routes r ON s.route_id = r.id
            LEFT JOIN train_services t ON r.train_service_id = t.id
            ORDER BY s.schedule_date DESC
        `);
        return schedules || [];
    } catch (e) { return []; }
}

export async function importStationsFromGeoJSON(geojson) {
    if (!geojson || !geojson.features) return { error: 'Invalid GeoJSON: FeatureCollection expected' };

    let count = 0;
    const errors = [];

    for (const feature of geojson.features) {
        if (feature.geometry?.type === 'Point' && feature.properties) {
            const p = feature.properties;
            const name = p.name || p.Name || p.nama || p.Nama || '';
            if (!name) continue;

            // Extract a clean ID: railway:ref or ref or slugify name
            let id = p['railway:ref'] || p.ref || p.id || '';
            if (!id) {
                id = String(name || '').toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 5);
                // Add a small random suffix if ID might collide
                id += Math.random().toString(36).substring(2, 4).toUpperCase();
            }

            const city = p.city || p.City || p.kota || p.Kota || name;
            const [lon, lat] = feature.geometry.coordinates;

            const stationData = {
                id: id.toString().toUpperCase(),
                name: name.toString(),
                city: city.toString(),
                latitude: lat || 0,
                longitude: lon || 0,
                ip_address: p.ip_address || '',
                nama_pic: p.nama_pic || '',
                kontak_pic: p.kontak_pic || '',
                kode_kota: p.kode_kota || p.ref || '',
                alamat: p.alamat || p.address || ''
            };

            const result = await addStation(stationData);
            if (result.success) {
                count++;
            } else {
                errors.push(`${name}: ${result.error}`);
            }
        }
    }

    return { success: true, count, errors: errors.length > 0 ? errors : null };
}

export async function getGerbong(id) { return []; }
export async function addGerbong(data) { return { success: true }; }
export async function deleteGerbong(id) { return { success: true }; }
export async function getSensors(id) { return []; }
export async function getSensorData(id) { return []; }
export async function getLogMaintenance() { return []; }
export async function addLogMaintenance(data) { return { success: true }; }
export async function updateLogMaintenance(id, data) { return { success: true }; }
export async function getLogOperasional() { return []; }
export async function addLogOperasional(data) { return { success: true }; }
export async function getGpsFleet() { return []; }
export async function getGpsGerbong(id) { return []; }

export async function updateRouteGeoJSON(name, geojson, filename = '') {
    try {
        let service = await getOne('SELECT id FROM train_services WHERE name = ?', [name]);
        if (!service) {
            const result = await query('INSERT INTO train_services (name) VALUES (?) RETURNING id', [name]);
            service = result.rows[0];
        }

        const extractedStations = extractStationsFromGeoJSON(geojson);

        let route = await getOne('SELECT id FROM routes WHERE train_service_id = ?', [service.id]);
        if (!route) {
            const result = await query('INSERT INTO routes (train_service_id, geojson, geojson_filename) VALUES (?, ?, ?)', [service.id, JSON.stringify(geojson), filename]);
            // Re-fetch to get ID or use RETURNING
            route = await getOne('SELECT id FROM routes WHERE train_service_id = ?', [service.id]);
        } else {
            await query('UPDATE routes SET geojson = ?, geojson_filename = ? WHERE id = ?', [JSON.stringify(geojson), filename, route.id]);
            // Clear old mapping
            await query('DELETE FROM route_stations WHERE route_id = ?', [route.id]);
        }

        // Populate route_stations mapping automatically from GeoJSON points
        let seq = 1;
        for (const stationName of extractedStations) {
            let st = await getOne('SELECT id FROM stations WHERE name = ?', [stationName]);
            if (!st) {
                // Create dummy station entry if not exists in master station list
                const sName = String(stationName || 'STN');
                const newId = sName.substring(0, 3).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
                await query('INSERT INTO stations (id, name, city) VALUES (?, ?, ?)', [newId, stationName, 'AUTO-GEN']);
                st = { id: newId };
            }
            await query('INSERT INTO route_stations (route_id, station_id, sequence_order) VALUES (?, ?, ?)', [route.id, st.id, seq++]);
        }

        return { success: true, stationCount: extractedStations.length };
    } catch (e) {
        console.error('[PIDS-DB] Error in updateRouteGeoJSON:', e);
        return { error: e.message };
    }
}

export async function deleteRoute(name) {
    const service = await getOne('SELECT id FROM train_services WHERE name = ?', [name]);
    if (!service) return { error: `Train service "${name}" not found` };

    await query('DELETE FROM train_services WHERE id = ?', [service.id]);

    const currentState = await getOne('SELECT service_name FROM pids_state WHERE id = 1');
    if (currentState && currentState.service_name === name) {
        await query('UPDATE pids_state SET service_name = \'\', active_route_json = \'{}\' WHERE id = 1');
    }
    return { success: true };
}

export async function addTrain(data) {
    try {
        await query('INSERT INTO train_services (name, ka_number, ip_address) VALUES ($1, $2, $3) ON CONFLICT (name) DO UPDATE SET ka_number = EXCLUDED.ka_number, ip_address = EXCLUDED.ip_address', [data.name, data.ka_number || '', data.ip_address || '']);
        return { success: true, trains: await getTrains() };
    } catch (e) { return { error: e.message }; }
}

export async function deleteTrain(name) {
    try {
        await query('DELETE FROM train_services WHERE name = $1', [name]);
        return { success: true, trains: await getTrains() };
    } catch (e) { return { error: e.message }; }
}

export async function saveRoute(name, stations) {
    try {
        let service = await getOne('SELECT id FROM train_services WHERE name = ?', [name]);
        if (!service) {
            const result = await query('INSERT INTO train_services (name) VALUES (?) RETURNING id', [name]);
            service = result.rows[0];
        }

        let route = await getOne('SELECT id FROM routes WHERE train_service_id = $1', [service.id]);
        if (!route) {
            const result = await query('INSERT INTO routes (train_service_id) VALUES ($1) RETURNING id', [service.id]);
            route = result.rows[0];
        } else {
            // Cleanup existing stops and stations to prevent FK errors and duplicates
            await query('DELETE FROM schedule_stops WHERE schedule_id IN (SELECT id FROM schedules WHERE route_id = $1)', [route.id]);
            await query('DELETE FROM route_stations WHERE route_id = $1', [route.id]);
        }

        const geojsonFeatures = [];
        const coordinates = [];
        let seq = 1;

        // UPSERT a default schedule for this route on current date
        const schedRes = await query(`
            INSERT INTO schedules (route_id, schedule_date) 
            VALUES ($1, CURRENT_DATE::text) 
            ON CONFLICT (route_id, schedule_date) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
            RETURNING id
        `, [route.id]);
        const scheduleId = schedRes.rows[0].id;

        for (const stObj of stations) {
            if (!stObj) continue;
            const stationName = typeof stObj === 'string' ? stObj : (stObj.name || '');
            const stationTime = typeof stObj === 'string' ? '' : (stObj.time || '');

            let st = await getOne('SELECT * FROM stations WHERE name = $1', [stationName]);
            if (!st) {
                const sName = String(stationName || 'STN');
                const newId = sName.substring(0, 3).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
                await query('INSERT INTO stations (id, name, city) VALUES ($1, $2, $3)', [newId, stationName, stationName]);
                st = { id: newId, name: stationName, latitude: 0, longitude: 0, city: stationName };
            }

            const rsRes = await query('INSERT INTO route_stations (route_id, station_id, sequence_order) VALUES ($1, $2, $3) RETURNING id', [route.id, st.id, seq++]);
            const routeStationId = rsRes.rows[0].id;

            // Add to schedule_stops
            await query('INSERT INTO schedule_stops (schedule_id, route_station_id, arrival_time) VALUES ($1, $2, $3)', [scheduleId, routeStationId, stationTime]);

            // Add to GeoJSON
            geojsonFeatures.push({
                type: "Feature",
                geometry: { type: "Point", coordinates: [st.longitude || 0, st.latitude || 0] },
                properties: { name: st.name, city: st.city, time: stationTime }
            });
            if (st.longitude && st.latitude) {
                coordinates.push([st.longitude, st.latitude]);
            }
        }

        // Add LineString if we have coordinates
        if (coordinates.length > 1) {
            geojsonFeatures.push({
                type: "Feature",
                geometry: { type: "LineString", coordinates },
                properties: { name: `Path for ${name}` }
            });
        }

        const finalGeoJSON = { type: "FeatureCollection", features: geojsonFeatures };
        const geojsonString = JSON.stringify(finalGeoJSON, null, 2);
        const filename = `${name.toLowerCase().replace(/\s+/g, '_')}_autogen.geojson`;

        // Save metadata to DB
        await query('UPDATE routes SET geojson = ?, geojson_filename = ? WHERE id = ?', [geojsonString, filename, route.id]);

        // Attempt to write to file system
        try {
            const fs = await import('fs/promises');
            const path = await import('path');
            const geojsonDir = path.join(process.cwd(), 'public', 'geojson');
            await fs.mkdir(geojsonDir, { recursive: true });
            await fs.writeFile(path.join(geojsonDir, filename), geojsonString);
        } catch (e) {
            console.error('[PIDS-DB] File write failed:', e);
        }

        return { success: true, name, stations, filename };
    } catch (e) {
        console.error('[PIDS-DB] Error in saveRoute:', e);
        return { error: e.message };
    }
}

export async function addUnit(data) { return await getUnits(); }
export async function updateUnit(id, data) { return await getUnits(); }
export async function deleteUnit(id) { return { success: true }; }

export async function addUser(data) {
    try {
        const id = crypto.randomUUID();
        const hashedPw = hashPassword(data.password);
        await query('INSERT INTO users (id, username, password, role, nama) VALUES (?, ?, ?, ?, ?)',
            [id, data.username, hashedPw, data.role || 'Operator', data.nama]);
        return { success: true };
    } catch (e) { return { error: e.message }; }
}

export async function deleteUser(id) {
    try {
        await query('DELETE FROM users WHERE id = ?', [id]);
        return { success: true };
    } catch (e) { return { error: e.message }; }
}

export function getTrainNumbers() { return ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10']; }

export async function seedStationsFromGeoJSON() {
    try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const masterPath = path.join(process.cwd(), 'public', 'geojson', 'stations_master.geojson');
        const data = await fs.readFile(masterPath, 'utf8');
        const geojson = JSON.parse(data);

        let count = 0;
        for (const feature of geojson.features) {
            const p = feature.properties;
            const [lng, lat] = feature.geometry.coordinates;

            await query(`
                INSERT INTO stations (
                    id, name, city, latitude, longitude, ip_address, 
                    nama_pic, kontak_pic, kode_kota, alamat, provinsi, 
                    kabupaten_kota, kecamatan, kelurahan_desa, kode_pos
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    city = EXCLUDED.city,
                    latitude = EXCLUDED.latitude,
                    longitude = EXCLUDED.longitude,
                    ip_address = EXCLUDED.ip_address,
                    nama_pic = EXCLUDED.nama_pic,
                    kontak_pic = EXCLUDED.kontak_pic,
                    kode_kota = EXCLUDED.kode_kota,
                    alamat = EXCLUDED.alamat,
                    provinsi = EXCLUDED.provinsi,
                    kabupaten_kota = EXCLUDED.kabupaten_kota,
                    kecamatan = EXCLUDED.kecamatan,
                    kelurahan_desa = EXCLUDED.kelurahan_desa,
                    kode_pos = EXCLUDED.kode_pos
            `, [
                p.id, p.name, p.city, lat, lng, p.ip_address || '',
                p.nama_pic || '', p.kontak_pic || '', p.kode_kota || '', p.alamat || '',
                p.provinsi || '', p.kabupaten_kota || '', p.kecamatan || '', p.kelurahan_desa || '', p.kode_pos || ''
            ]);
            count++;
        }
        return { success: true, count };
    } catch (e) {
        console.error('Seeding error:', e);
        return { error: e.message };
    }
}
