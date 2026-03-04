/**
 * PIDS KAI — PostgreSQL Database Layer
 * Replaces SQLite with a proper relational database.
 */
import pg from 'pg';
const { Pool } = pg;
import crypto from 'crypto';

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
            video_playback_progress REAL DEFAULT 0
        )
    `);

    try { await pool.query("ALTER TABLE pids_state ADD COLUMN IF NOT EXISTS show_train_number BOOLEAN DEFAULT TRUE;"); } catch (e) { }
    try { await pool.query("ALTER TABLE pids_state ADD COLUMN IF NOT EXISTS led_active BOOLEAN DEFAULT TRUE;"); } catch (e) { }
    try { await pool.query("ALTER TABLE pids_state ADD COLUMN IF NOT EXISTS video_playlist_json TEXT DEFAULT '[]';"); } catch (e) { }
    try { await pool.query("ALTER TABLE pids_state ADD COLUMN IF NOT EXISTS active_video_index INTEGER DEFAULT 0;"); } catch (e) { }
    try { await pool.query("ALTER TABLE pids_state ADD COLUMN IF NOT EXISTS video_is_playing BOOLEAN DEFAULT FALSE;"); } catch (e) { }
    try { await pool.query("ALTER TABLE pids_state ADD COLUMN IF NOT EXISTS video_playback_mode TEXT DEFAULT 'normal';"); } catch (e) { }
    try { await pool.query("ALTER TABLE pids_state ADD COLUMN IF NOT EXISTS video_volume INTEGER DEFAULT 50;"); } catch (e) { }
    try { await pool.query("ALTER TABLE pids_state ADD COLUMN IF NOT EXISTS video_tv_standby BOOLEAN DEFAULT TRUE;"); } catch (e) { }
    try { await pool.query("ALTER TABLE pids_state ADD COLUMN IF NOT EXISTS video_playback_progress REAL DEFAULT 0;"); } catch (e) { }

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
}

async function seedData() {
    const { count: stationCount } = await getOne('SELECT COUNT(*) as count FROM stations');
    if (parseInt(stationCount) > 0) return;

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
        await query('INSERT INTO train_services (name, class, ka_number, ip_address, nama_pic, kontak_pic) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT (name) DO NOTHING', ts);
        const row = await getOne('SELECT id FROM train_services WHERE name = ?', [ts[0]]);
        serviceIds[ts[0]] = row.id;
    }

    const defaultRoutes = {
        'ARGO BROMO ANGGREK': ['GMR', 'CN', 'SMT', 'SBI'],
        'ARGO PARAHYANGAN': ['GMR', 'BKS', 'CMI', 'BD'],
        'ARGO WILIS': ['BD', 'TSM', 'YK', 'SLO', 'MN', 'SGU'],
        'TURANGGA': ['BD', 'TSM', 'YK', 'SLO', 'MN', 'SGU'],
        'LODAYA': ['BD', 'TSM', 'YK', 'SLO'],
        'MALABAR': ['BD', 'TSM', 'YK', 'SLO', 'MN', 'KD', 'BL', 'ML']
    };

    for (const [sName, sList] of Object.entries(defaultRoutes)) {
        const sId = serviceIds[sName];
        if (!sId) continue;
        await query('INSERT INTO routes (train_service_id) VALUES (?) ON CONFLICT (train_service_id) DO NOTHING', [sId]);
        const rRow = await getOne('SELECT id FROM routes WHERE train_service_id = ?', [sId]);
        for (let i = 0; i < sList.length; i++) {
            await query('INSERT INTO route_stations (route_id, station_id, sequence_order) VALUES (?, ?, ?) ON CONFLICT DO NOTHING', [rRow.id, sList[i], i + 1]);
        }
    }

    const argoWilisRoute = { name: 'ARGO WILIS', number: '05', stations: defaultRoutes['ARGO WILIS'] };
    await query(`INSERT INTO pids_state (id, service_name, current_station, train_number, next_station, status, led_speed, speed, altitude, temperature, air_quality, display_mode, active_route_json) 
                 VALUES (1, 'ARGO WILIS', 'BANDUNG', '05', 'TASIKMALAYA', 'ON TIME', 60, 15, 694, 25.1, 'GOOD NOMINAL', 'pids', ?)
                 ON CONFLICT (id) DO UPDATE SET active_route_json = EXCLUDED.active_route_json`, [JSON.stringify(argoWilisRoute)]);

    await query('INSERT INTO users (id, username, password, role, nama, kontak, email) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING',
        ['USR001', 'admin', 'admin123', 'Admin', 'Administrator', '081100000001', 'admin@eltran.co.id']);
}

function extractStationsFromGeoJSON(geojson) {
    if (!geojson || !geojson.features) return [];
    const stations = geojson.features
        .filter(f => f.geometry && f.geometry.type === 'Point' && f.properties && f.properties.name)
        .map(f => f.properties.name.toUpperCase());
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
    };
}

function getDefaultState() {
    return {
        serviceName: 'ARGO WILIS', currentStation: 'BANDUNG', trainNumber: '05',
        nextStation: 'TASIKMALAYA', status: 'ON TIME', ledSpeed: 60, speed: 15,
        altitude: 694, temperature: 25.1, airQuality: 'GOOD NOMINAL', displayMode: 'pids',
        stations: ['BANDUNG', 'TASIKMALAYA', 'YOGYAKARTA', 'SOLO BALAPAN', 'MADIUN', 'SURABAYA GUBENG'],
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
    if (updates.activeRoute) activeRouteJson = JSON.stringify(updates.activeRoute);

    await query(`INSERT INTO pids_state (id, service_name, current_station, train_number, next_station, status, led_speed, speed, altitude, temperature, air_quality, display_mode, active_route_json, geofencing_inner_radius, geofencing_outer_radius, show_train_number, led_active, video_playlist_json, active_video_index, video_is_playing, video_playback_progress, video_playback_mode, video_volume, video_tv_standby) 
                 VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                    video_tv_standby = EXCLUDED.video_tv_standby`,
        [
            merged.serviceName, merged.currentStation, merged.trainNumber, merged.nextStation, merged.status, merged.ledSpeed, merged.speed, merged.altitude, merged.temperature, merged.airQuality, merged.displayMode, activeRouteJson,
            merged.geofencingInnerRadius || 250, merged.geofencingOuterRadius || 750, merged.showTrainNumber !== false, merged.ledActive !== false,
            JSON.stringify(merged.videoPlaylist || []), merged.activeVideoIndex ?? 0, merged.isPlaying ?? false, merged.playbackProgress ?? 0, merged.playbackMode || 'normal',
            merged.volume ?? 50, merged.tvStandby ?? true
        ]);
    return await getState();
}

// ============================================================
// LOG OPERATIONS
// ============================================================

export async function getLogs(filter = {}) {
    let sql = 'SELECT * FROM system_logs';
    const params = [];
    if (filter.action) { sql += ' WHERE action = ?'; params.push(filter.action); }
    sql += ' ORDER BY timestamp DESC';
    sql += filter.limit ? ` LIMIT ${parseInt(filter.limit)}` : ' LIMIT 1000';
    return await getAll(sql, params);
}

export async function writeLog(entry) {
    await query('INSERT INTO system_logs (id, timestamp, action, "user", role, details, data_json) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [crypto.randomUUID(), new Date().toISOString(), entry.action, entry.user, entry.role || 'System', entry.details || '', entry.data ? JSON.stringify(entry.data) : '']);
}

// ============================================================
// CRUD OPERATIONS (Async versions)
// ============================================================

export async function getUsers() { return await getAll('SELECT id, username, role, nama FROM users'); }
export async function getUsersWithPassword() { return await getAll('SELECT * FROM users'); }
export async function findUser(username, password) { return await getOne('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]); }
export async function getTrainNames() {
    const rows = await getAll('SELECT name FROM train_services ORDER BY id');
    return rows.map(r => r.name);
}
export async function getStations() { return await getAll('SELECT * FROM stations ORDER BY name'); }
export async function getRoutes() {
    const services = await getAll('SELECT * FROM train_services ORDER BY id');
    const routes = {};
    for (const service of services) {
        const route = await getOne('SELECT * FROM routes WHERE train_service_id = ?', [service.id]);
        if (route) {
            const parsed = JSON.parse(route.geojson || '{}');
            routes[service.name] = {
                ...parsed,
                name: service.name,
                geojson: route.geojson,
                geojson_filename: route.geojson_filename
            };
        } else {
            routes[service.name] = { name: service.name, stations: [], path: '', nodes: [] };
        }
    }
    return routes;
}
export async function getUnits() { return await getAll('SELECT * FROM units'); }
export async function getDbDump() {
    return {
        trainNames: await getTrainNames(),
        trainNumbers: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10'],
        routes: await getRoutes(),
        users: await getUsersWithPassword(),
        units: await getUnits()
    };
}
export async function closeDatabase() { if (pool) { await pool.end(); pool = null; } }

export async function addStation(data) { return { success: true }; }
export async function updateStation(id, data) { return { success: true }; }
export async function deleteStation(id) { return { success: true }; }
export async function addSchedule(data) { return { success: true }; }
export async function updateSchedule(id, data) { return { success: true }; }
export async function deleteSchedule(id) { return { success: true }; }
export async function getSchedules() { return []; }
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
    const service = await getOne('SELECT id FROM train_services WHERE name = ?', [name]);
    if (!service) return { error: `Train service "${name}" not found` };
    const extractedStations = extractStationsFromGeoJSON(geojson);
    await query('INSERT INTO routes (train_service_id, geojson, geojson_filename) VALUES (?, ?, ?) ON CONFLICT (train_service_id) DO UPDATE SET geojson = EXCLUDED.geojson, geojson_filename = EXCLUDED.geojson_filename', [service.id, JSON.stringify(geojson), filename]);
    const currentState = await getOne('SELECT service_name, active_route_json, train_number FROM pids_state WHERE id = 1');
    if (currentState && currentState.service_name === name) {
        let activeRoute = {};
        try { activeRoute = JSON.parse(currentState.active_route_json || '{}'); } catch { }
        activeRoute.name = name;
        activeRoute.number = currentState.train_number;
        activeRoute.geojson = geojson;
        activeRoute.geojson_filename = filename;
        if (extractedStations.length > 0) activeRoute.stations = extractedStations;
        await query('UPDATE pids_state SET active_route_json = ? WHERE id = 1', [JSON.stringify(activeRoute)]);
    }
    return { success: true };
}

export async function deleteRoute(name) {
    const service = await getOne('SELECT id FROM train_services WHERE name = ?', [name]);
    if (!service) return { error: `Train service "${name}" not found` };
    await query('UPDATE routes SET geojson = NULL WHERE train_service_id = ?', [service.id]);
    const currentState = await getOne('SELECT service_name, active_route_json, train_number FROM pids_state WHERE id = 1');
    if (currentState && currentState.service_name === name) {
        const defaultStations = await getRouteStations(name);
        const activeRoute = { name: name, number: currentState.train_number, stations: defaultStations };
        await query('UPDATE pids_state SET active_route_json = ? WHERE id = 1', [JSON.stringify(activeRoute)]);
    }
    return { success: true };
}

export async function addTrainName(name) { return { success: true, trains: await getTrainNames() }; }
export async function deleteTrainName(name) { return { success: true, trains: await getTrainNames() }; }
export async function saveRoute(name, stations) { return { name, stations }; }
export async function addUnit(data) { return await getUnits(); }
export async function updateUnit(id, data) { return await getUnits(); }
export async function deleteUnit(id) { return { success: true }; }
export async function addUser(data) { return { success: true }; }
export async function deleteUser(id) { return { success: true }; }
export function getTrainNumbers() { return ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10']; }
