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
            media TEXT DEFAULT '',
            stasiun_awal TEXT DEFAULT '',
            stasiun_akhir TEXT DEFAULT '',
            keterangan TEXT DEFAULT ''
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
            nama_pic TEXT DEFAULT '',
            kontak_pic TEXT DEFAULT '',
            CONSTRAINT fk_route FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
            CONSTRAINT fk_station FOREIGN KEY (station_id) REFERENCES stations(id)
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS schedules (
            id SERIAL PRIMARY KEY,
            route_id INTEGER,
            schedule_date TEXT NOT NULL DEFAULT (CURRENT_DATE::text),
            status TEXT NOT NULL DEFAULT 'ON_TIME',
            notes TEXT DEFAULT '',
            catatan TEXT DEFAULT '',
            media TEXT DEFAULT '',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            stasiun_keberangkatan TEXT DEFAULT '',
            kode_kota_keberangkatan TEXT DEFAULT '',
            stasiun_tujuan TEXT DEFAULT '',
            kode_kota_tujuan TEXT DEFAULT '',
            waktu_keberangkatan_penjadwalan TEXT DEFAULT '',
            waktu_keberangkatan_realisasi TEXT DEFAULT '',
            selisih_waktu_keberangkatan TEXT DEFAULT '0',
            status_keberangkatan TEXT DEFAULT 'Tepat Waktu',
            waktu_kedatangan_penjadwalan TEXT DEFAULT '',
            waktu_kedatangan_realisasi TEXT DEFAULT '',
            selisih_waktu_kedatangan TEXT DEFAULT '0',
            status_kedatangan TEXT DEFAULT 'Tepat Waktu',
            train_name TEXT DEFAULT '',
            ka_number TEXT DEFAULT '',
            CONSTRAINT fk_route_sched FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE
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
            media TEXT DEFAULT '',
            log_maintenance TEXT DEFAULT '',
            log_operasional TEXT DEFAULT '',
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

    // Migration for new columns in case they exist
    try { await pool.query("ALTER TABLE train_services ADD COLUMN IF NOT EXISTS stasiun_awal TEXT DEFAULT '';"); } catch (e) { }
    try { await pool.query("ALTER TABLE train_services ADD COLUMN IF NOT EXISTS stasiun_akhir TEXT DEFAULT '';"); } catch (e) { }
    try { await pool.query("ALTER TABLE train_services ADD COLUMN IF NOT EXISTS keterangan TEXT DEFAULT '';"); } catch (e) { }
    try { await pool.query("ALTER TABLE route_stations ADD COLUMN IF NOT EXISTS nama_pic TEXT DEFAULT '';"); } catch (e) { }
    try { await pool.query("ALTER TABLE route_stations ADD COLUMN IF NOT EXISTS kontak_pic TEXT DEFAULT '';"); } catch (e) { }
    try { await pool.query("ALTER TABLE schedules ADD COLUMN IF NOT EXISTS stasiun_keberangkatan TEXT DEFAULT '';"); } catch (e) { }
    try { await pool.query("ALTER TABLE schedules ADD COLUMN IF NOT EXISTS kode_kota_keberangkatan TEXT DEFAULT '';"); } catch (e) { }
    try { await pool.query("ALTER TABLE schedules ADD COLUMN IF NOT EXISTS stasiun_tujuan TEXT DEFAULT '';"); } catch (e) { }
    try { await pool.query("ALTER TABLE schedules ADD COLUMN IF NOT EXISTS kode_kota_tujuan TEXT DEFAULT '';"); } catch (e) { }
    try { await pool.query("ALTER TABLE gerbong ADD COLUMN IF NOT EXISTS media TEXT DEFAULT '';"); } catch (e) { }
    try { await pool.query("ALTER TABLE gerbong ADD COLUMN IF NOT EXISTS log_maintenance TEXT DEFAULT '';"); } catch (e) { }
    try { await pool.query("ALTER TABLE gerbong ADD COLUMN IF NOT EXISTS log_operasional TEXT DEFAULT '';"); } catch (e) { }
}

async function seedData() {
    console.log('[PIDS-DB] Seeding authentic KAI data to PostgreSQL...');

    await query(`INSERT INTO pids_state (id, service_name, current_station, train_number, next_station, status, led_speed, speed, altitude, temperature, air_quality, display_mode, active_route_json, jumlah_kereta) 
                 VALUES (1, '', '', '', '', 'STANDBY', 60, 0, 0, 0, '-', 'pids', '{}', 10)
                 ON CONFLICT (id) DO NOTHING`);

    const hashedAdminPw = hashPassword('admin123');
    await query('INSERT INTO users (id, username, password, role, nama, kontak, email) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING',
        ['USR001', 'admin', hashedAdminPw, 'Admin', 'Administrator', '081100000001', 'admin@eltran.co.id']);
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
// CRUD OPERATIONS
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

export async function addTrain(train) {
    try {
        const { name, class: className, ka_number, gerbong_count, ip_address, nama_pic, kontak_pic, media, stasiun_awal, stasiun_akhir, keterangan } = train;
        await query(
            `INSERT INTO train_services (name, class, ka_number, gerbong_count, ip_address, nama_pic, kontak_pic, media, stasiun_awal, stasiun_akhir, keterangan)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (name) DO UPDATE SET
             class = EXCLUDED.class, ka_number = EXCLUDED.ka_number, gerbong_count = EXCLUDED.gerbong_count,
             ip_address = EXCLUDED.ip_address, nama_pic = EXCLUDED.nama_pic, kontak_pic = EXCLUDED.kontak_pic, media = EXCLUDED.media,
             stasiun_awal = EXCLUDED.stasiun_awal, stasiun_akhir = EXCLUDED.stasiun_akhir, keterangan = EXCLUDED.keterangan`,
            [name, className || 'EKSEKUTIF', ka_number || '', gerbong_count || 10, ip_address || '', nama_pic || '', kontak_pic || '', media || '', stasiun_awal || '', stasiun_akhir || '', keterangan || '']
        );
        return { success: true, trains: await getTrains() };
    } catch (e) {
        console.error('Error adding train:', e);
        return { error: e.message };
    }
}

export async function deleteTrain(name) {
    try {
        await query('DELETE FROM train_services WHERE name = $1', [name]);
        return { success: true, trains: await getTrains() };
    } catch (e) { return { error: e.message }; }
}

export async function getStations() { return await getAll('SELECT * FROM stations ORDER BY name'); }

export async function addStation(data) {
    try {
        const { id, name, city, latitude, longitude, ip_address, nama_pic, kontak_pic, kode_kota, alamat, provinsi, kabupaten_kota, kecamatan, kelurahan_desa, kode_pos, poi, media } = data;
        await query(
            `INSERT INTO stations (id, name, city, latitude, longitude, ip_address, nama_pic, kontak_pic, kode_kota, alamat, provinsi, kabupaten_kota, kecamatan, kelurahan_desa, kode_pos, poi, media)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
             ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name, city = EXCLUDED.city, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
             ip_address = EXCLUDED.ip_address, nama_pic = EXCLUDED.nama_pic, kontak_pic = EXCLUDED.kontak_pic,
             kode_kota = EXCLUDED.kode_kota, alamat = EXCLUDED.alamat, provinsi = EXCLUDED.provinsi,
             kabupaten_kota = EXCLUDED.kabupaten_kota, kecamatan = EXCLUDED.kecamatan,
             kelurahan_desa = EXCLUDED.kelurahan_desa, kode_pos = EXCLUDED.kode_pos, poi = EXCLUDED.poi, media = EXCLUDED.media`,
            [id, name, city, latitude || 0, longitude || 0, ip_address || '', nama_pic || '', kontak_pic || '', kode_kota || '', alamat || '', provinsi || '', kabupaten_kota || '', kecamatan || '', kelurahan_desa || '', kode_pos || '', poi || '', media || '']
        );
        return { success: true, station: data };
    } catch (e) { return { error: e.message }; }
}

export async function updateStation(id, data) { return await addStation({ ...data, id }); }
export async function deleteStation(id) {
    try {
        await query('DELETE FROM stations WHERE id = $1', [id]);
        return { success: true };
    } catch (e) { return { error: e.message }; }
}

export async function getRoutes() {
    const services = await getAll('SELECT * FROM train_services ORDER BY id');
    const routes = {};
    for (const service of services) {
        const dbRoute = await getOne('SELECT * FROM routes WHERE train_service_id = $1', [service.id]);
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
            routes[service.name] = { name: service.name, stations: stations, path: '', nodes: [] };
        }
    }
    return routes;
}

export async function saveRoute(name, stations) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const train = await getOne('SELECT id FROM train_services WHERE name = $1', [name]);
        if (!train) throw new Error(`Train ${name} not found`);

        const res = await client.query('INSERT INTO routes (train_service_id) VALUES ($1) ON CONFLICT (train_service_id) DO UPDATE SET train_service_id = EXCLUDED.train_service_id RETURNING id', [train.id]);
        const routeId = res.rows[0].id;

        await client.query('DELETE FROM route_stations WHERE route_id = $1', [routeId]);
        for (let i = 0; i < stations.length; i++) {
            const s = stations[i];
            const station = await getOne('SELECT id FROM stations WHERE name = $1', [typeof s === 'string' ? s : s.name]);
            if (!station) continue;
            await client.query(
                `INSERT INTO route_stations (route_id, station_id, sequence_order, svg_position, svg_label, keterangan, nama_pic, kontak_pic)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [routeId, station.id, i, s.svg_position || '', s.svg_label || '', s.keterangan || 'antara', s.nama_pic || '', s.kontak_pic || '']
            );
        }
        await client.query('COMMIT');
        return { success: true, name, stations };
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error saving route:', e);
        return { error: e.message };
    } finally { client.release(); }
}
export async function deleteRoute(name) {
    try {
        const train = await getOne('SELECT id FROM train_services WHERE name = $1', [name]);
        if (!train) throw new Error(`Train ${name} not found`);
        await query('DELETE FROM routes WHERE train_service_id = $1', [train.id]);
        return { success: true };
    } catch (e) { return { error: e.message }; }
}

export async function getSchedules() {
    try {
        const schedules = await getAll(`
            SELECT s.*, r.direction, 
                   COALESCE(t.name, s.train_name) as display_train_name,
                   COALESCE(t.ka_number, s.ka_number) as display_ka_number
            FROM schedules s
            LEFT JOIN routes r ON s.route_id = r.id
            LEFT JOIN train_services t ON r.train_service_id = t.id
            ORDER BY s.schedule_date DESC
        `);
        return schedules || [];
    } catch (e) { return []; }
}

export async function addSchedule(schedule) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { 
            route_id, schedule_date, status, notes, stops, catatan, media, 
            stasiun_keberangkatan, kode_kota_keberangkatan, stasiun_tujuan, kode_kota_tujuan,
            waktu_keberangkatan_penjadwalan, waktu_keberangkatan_realisasi, selisih_waktu_keberangkatan, status_keberangkatan,
            waktu_kedatangan_penjadwalan, waktu_kedatangan_realisasi, selisih_waktu_kedatangan, status_kedatangan,
            train_name, ka_number
        } = schedule;

        const res = await client.query(
            `INSERT INTO schedules (
                route_id, schedule_date, status, notes, catatan, media, 
                stasiun_keberangkatan, kode_kota_keberangkatan, stasiun_tujuan, kode_kota_tujuan,
                waktu_keberangkatan_penjadwalan, waktu_keberangkatan_realisasi, selisih_waktu_keberangkatan, status_keberangkatan,
                waktu_kedatangan_penjadwalan, waktu_kedatangan_realisasi, selisih_waktu_kedatangan, status_kedatangan,
                train_name, ka_number
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
             RETURNING id`,
            [
                route_id || null, schedule_date || new Date().toISOString().split('T')[0], status || 'ON_TIME', notes || '', catatan || '', media || '', 
                stasiun_keberangkatan || '', kode_kota_keberangkatan || '', stasiun_tujuan || '', kode_kota_tujuan || '',
                waktu_keberangkatan_penjadwalan || '', waktu_keberangkatan_realisasi || '', selisih_waktu_keberangkatan || '0', status_keberangkatan || 'Tepat Waktu',
                waktu_kedatangan_penjadwalan || '', waktu_kedatangan_realisasi || '', selisih_waktu_kedatangan || '0', status_kedatangan || 'Tepat Waktu',
                train_name || '', ka_number || ''
            ]
        );
        const scheduleId = res.rows[0].id;

        for (const stop of stops) {
            await client.query(
                `INSERT INTO schedule_stops (schedule_id, route_station_id, arrival_time, departure_time, platform, stop_status)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [scheduleId, stop.route_station_id, stop.arrival_time, stop.departure_time, stop.platform || 1, stop.stop_status || 'SCHEDULED']
            );
        }

        await client.query('COMMIT');
        return { success: true, id: scheduleId };
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error adding schedule:', e);
        return { error: e.message };
    } finally { client.release(); }
}

export async function updateSchedule(id, schedule) {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const { 
            route_id, schedule_date, status, notes, stops, catatan, media, 
            stasiun_keberangkatan, kode_kota_keberangkatan, stasiun_tujuan, kode_kota_tujuan,
            waktu_keberangkatan_penjadwalan, waktu_keberangkatan_realisasi, selisih_waktu_keberangkatan, status_keberangkatan,
            waktu_kedatangan_penjadwalan, waktu_kedatangan_realisasi, selisih_waktu_kedatangan, status_kedatangan,
            train_name, ka_number
        } = schedule;

        await client.query(
            `UPDATE schedules SET
                route_id = $1, schedule_date = $2, status = $3, notes = $4, catatan = $5, media = $6, 
                stasiun_keberangkatan = $7, kode_kota_keberangkatan = $8, stasiun_tujuan = $9, kode_kota_tujuan = $10,
                waktu_keberangkatan_penjadwalan = $11, waktu_keberangkatan_realisasi = $12, selisih_waktu_keberangkatan = $13, status_keberangkatan = $14,
                waktu_kedatangan_penjadwalan = $15, waktu_kedatangan_realisasi = $16, selisih_waktu_kedatangan = $17, status_kedatangan = $18,
                train_name = $19, ka_number = $20, updated_at = CURRENT_TIMESTAMP
             WHERE id = $21`,
            [
                route_id || null, schedule_date, status || 'ON_TIME', notes || '', catatan || '', media || '', 
                stasiun_keberangkatan || '', kode_kota_keberangkatan || '', stasiun_tujuan || '', kode_kota_tujuan || '',
                waktu_keberangkatan_penjadwalan || '', waktu_keberangkatan_realisasi || '', selisih_waktu_keberangkatan || '0', status_keberangkatan || 'Tepat Waktu',
                waktu_kedatangan_penjadwalan || '', waktu_kedatangan_realisasi || '', selisih_waktu_kedatangan || '0', status_kedatangan || 'Tepat Waktu',
                train_name || '', ka_number || '', id
            ]
        );

        if (stops && stops.length > 0) {
            await client.query('DELETE FROM schedule_stops WHERE schedule_id = $1', [id]);
            for (const stop of stops) {
                await client.query(
                    `INSERT INTO schedule_stops (schedule_id, route_station_id, arrival_time, departure_time, platform, stop_status)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
                    [id, stop.route_station_id, stop.arrival_time, stop.departure_time, stop.platform || 1, stop.stop_status || 'SCHEDULED']
                );
            }
        }

        await client.query('COMMIT');
        return { success: true };
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Error updating schedule:', e);
        return { error: e.message };
    } finally { client.release(); }
}

export async function deleteSchedule(id) {
    try {
        await query('DELETE FROM schedules WHERE id = $1', [id]);
        return { success: true };
    } catch (e) { return { error: e.message }; }
}

export async function getGerbong(keretaId) {
    return await getAll('SELECT * FROM gerbong WHERE id_kereta = $1 ORDER BY no_urut_gerbong', [keretaId]);
}

export async function addGerbong(gerbong) {
    try {
        const { id, ip_address, nama_gerbong, no_urut_gerbong, id_kereta, media, log_maintenance, log_operasional } = gerbong;
        await query(
            `INSERT INTO gerbong (id, ip_address, nama_gerbong, no_urut_gerbong, id_kereta, media, log_maintenance, log_operasional)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO UPDATE SET
             ip_address = EXCLUDED.ip_address, nama_gerbong = EXCLUDED.nama_gerbong,
             no_urut_gerbong = EXCLUDED.no_urut_gerbong, id_kereta = EXCLUDED.id_kereta,
             media = EXCLUDED.media, log_maintenance = EXCLUDED.log_maintenance, log_operasional = EXCLUDED.log_operasional`,
            [id, ip_address || '', nama_gerbong, no_urut_gerbong || 1, id_kereta, media || '', log_maintenance || '', log_operasional || '']
        );
        return { success: true };
    } catch (e) { return { error: e.message }; }
}

export async function deleteGerbong(id) {
    try {
        await query('DELETE FROM gerbong WHERE id = $1', [id]);
        return { success: true };
    } catch (e) { return { error: e.message }; }
}

// ============================================================
// LOG & UTILS
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

export async function getDbDump() {
    return {
        trainNames: await getTrainNames(),
        trainNumbers: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'],
        routes: await getRoutes(),
        users: await getUsers(),
        stations: await getStations()
    };
}

export async function closeDatabase() { if (pool) { await pool.end(); pool = null; } }

function extractStationsFromGeoJSON(geojson) {
    if (!geojson || !geojson.features) return [];
    const stations = geojson.features
        .filter(f => f.geometry && f.geometry.type === 'Point' && f.properties)
        .map(f => {
            const p = f.properties;
            const name = p.name || p.Name || p.STATION || p.Station || p.nama || p.Nama || p.label || '';
            return name.toString().toUpperCase().trim();
        })
        .filter(name => name.length > 0);
    return [...new Set(stations)];
}

export async function updateRouteGeoJSON(name, geojson, filename = '') {
    try {
        let service = await getOne('SELECT id FROM train_services WHERE name = $1', [name]);
        if (!service) {
            const result = await query('INSERT INTO train_services (name) VALUES ($1) RETURNING id', [name]);
            service = result.rows[0];
        }

        const extractedStations = extractStationsFromGeoJSON(geojson);
        let route = await getOne('SELECT id FROM routes WHERE train_service_id = $1', [service.id]);
        if (!route) {
            await query('INSERT INTO routes (train_service_id, geojson, geojson_filename) VALUES ($1, $2, $3)', [service.id, JSON.stringify(geojson), filename]);
            route = await getOne('SELECT id FROM routes WHERE train_service_id = $1', [service.id]);
        } else {
            await query('UPDATE routes SET geojson = $1, geojson_filename = $2 WHERE id = $3', [JSON.stringify(geojson), filename, route.id]);
            await query('DELETE FROM route_stations WHERE route_id = $1', [route.id]);
        }

        let seq = 1;
        for (const stationName of extractedStations) {
            let st = await getOne('SELECT id FROM stations WHERE name = $1', [stationName]);
            if (!st) {
                const newId = stationName.substring(0, 3).toUpperCase() + Math.random().toString(36).substring(2, 5).toUpperCase();
                await query('INSERT INTO stations (id, name, city) VALUES ($1, $2, $3)', [newId, stationName, 'AUTO-GEN']);
                st = { id: newId };
            }
            await query('INSERT INTO route_stations (route_id, station_id, sequence_order) VALUES ($1, $2, $3)', [route.id, st.id, seq++]);
        }
        return { success: true, stationCount: extractedStations.length };
    } catch (e) { return { error: e.message }; }
}

export async function importStationsFromGeoJSON(geojson) {
    if (!geojson || !geojson.features) return { error: 'Invalid GeoJSON' };
    let count = 0;
    for (const feature of geojson.features) {
        if (feature.geometry?.type === 'Point' && feature.properties) {
            const p = feature.properties;
            const name = p.name || p.Name || p.nama || '';
            if (!name) continue;
            let id = p['railway:ref'] || p.ref || p.id || name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 5);
            const [lon, lat] = feature.geometry.coordinates;
            await addStation({ id, name, city: p.city || name, latitude: lat, longitude: lon, ...p });
            count++;
        }
    }
    return { success: true, count };
}

export async function seedStationsFromGeoJSON() {
    try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const masterPath = path.join(process.cwd(), 'public', 'geojson', 'stations_master.geojson');
        const data = await fs.readFile(masterPath, 'utf8');
        return await importStationsFromGeoJSON(JSON.parse(data));
    } catch (e) { return { error: e.message }; }
}

// Placeholder for remaining specialized functions
export async function getUnits() { return await getAll('SELECT * FROM units'); }
export async function addUnit(data) { return await getUnits(); }
export async function updateUnit(id, data) { return await getUnits(); }
export async function deleteUnit(id) { return { success: true }; }
export async function addUser(data) {
    try {
        const id = crypto.randomUUID();
        const hashedPw = hashPassword(data.password);
        await query('INSERT INTO users (id, username, password, role, nama) VALUES ($1, $2, $3, $4, $5)', [id, data.username, hashedPw, data.role || 'Operator', data.nama]);
        return { success: true };
    } catch (e) { return { error: e.message }; }
}
export async function deleteUser(id) { try { await query('DELETE FROM users WHERE id = $1', [id]); return { success: true }; } catch (e) { return { error: e.message }; } }
export function getTrainNumbers() { return ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10']; }
export async function getSensors(id) { return []; }
export async function getSensorData(id) { return []; }
export async function getLogMaintenance() { return []; }
export async function addLogMaintenance(data) { return { success: true }; }
export async function updateLogMaintenance(id, data) { return { success: true }; }
export async function getLogOperasional() { return []; }
export async function addLogOperasional(data) { return { success: true }; }
export async function getGpsFleet() { return []; }
export async function getGpsGerbong(id) { return []; }
