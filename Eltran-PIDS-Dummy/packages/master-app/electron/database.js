/*
 * database.js — Master App database layer
 *
 * Responsibilities:
 * - Schema creation, migrations & renames
 * - Seeding initial data
 * - Backup/restore (JSON snapshots)
 * - Query helpers exported for API (getState, updateState, getRoutes, etc.)
 *
 * Notes:
 * - Requires DATABASE_URL environment variable.
 * - startAutoSave(intervalMs) starts periodic backups (PIDS_AUTOSAVE_INTERVAL_MS).
 * - saveDb() triggers immediate backup.
 * - For production: secure pg_hba and use a central session/cache (Redis).
 */

import { fileURLToPath } from "url";
import path from "path";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from the root of master-app package
dotenv.config({ path: path.join(__dirname, "..", ".env") });

import pg from "pg";
const { Pool } = pg;
import crypto from "crypto";
import fs from "fs";

const QUERY_TIMEOUT_MS = 15000;
const POOL_CONFIG = {
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle: true,
};

const RUNTIME_DIR = path.resolve(__dirname, "..", "runtime");
const AUDIT_DIR = path.join(RUNTIME_DIR, "audit");
const AUDIT_LOG_FILE = path.join(AUDIT_DIR, "audit-log.jsonl");
const BACKUP_DIR = path.join(RUNTIME_DIR, "backups");

function normalizeName(name) {
  return String(name || "")
    .toUpperCase()
    .trim()
    .replace(/STASIUN\s+/g, "");
}

function mergeAndOptimizeGeoJSON(geojsonText, masterStations) {
  try {
    const geojson = JSON.parse(geojsonText);
    const stationMap = new Map();
    const coordFixMap = new Map(); // Store [oldLng, oldLat] -> [newLng, newLat]

    masterStations.forEach((s) => {
      stationMap.set(normalizeName(s.name), s);
      stationMap.set(s.code, s);
    });

    if (geojson.features) {
      // Phase 1: Update Points and collect coordinate fixes
      geojson.features = geojson.features.map((f) => {
        if (f.geometry?.type === "Point") {
          const name = normalizeName(f.properties?.name || f.properties?.Name);
          const master = stationMap.get(name);
          if (master) {
            const oldCoordKey = JSON.stringify(f.geometry.coordinates);
            const newCoord = [master.lng, master.lat];
            coordFixMap.set(oldCoordKey, newCoord);
            f.geometry.coordinates = newCoord;
          }
          const cleanProps = {};
          const essentials = ["name", "isCheckpoint", "role"];
          essentials.forEach((p) => {
            if (f.properties[p] !== undefined) cleanProps[p] = f.properties[p];
          });
          Object.keys(f.properties).forEach((p) => {
            if (p.startsWith("schedule_") || p.startsWith("is_origin_")) {
              cleanProps[p] = f.properties[p];
            }
          });
          f.properties = cleanProps;
        }
        return f;
      });

      // Phase 2: Update LineStrings using the collected fixes
      geojson.features = geojson.features.map((f) => {
        if (f.geometry?.type === "LineString") {
          f.geometry.coordinates = f.geometry.coordinates.map(coord => {
            const key = JSON.stringify(coord);
            if (coordFixMap.has(key)) {
              return coordFixMap.get(key);
            }
            return coord;
          });
        }
        return f;
      });
    }
    return JSON.stringify(geojson);
  } catch (e) {
    console.error("[PIDS-DB] Error optimizing GeoJSON:", e.message);
    return geojsonText;
  }
}
const SALT_LENGTH = 16;
const KEY_LENGTH = 64;

function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LENGTH).toString("hex");
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  if (!storedHash.includes(":")) {
    const expected = crypto
      .createHash("sha256")
      .update(String(storedHash))
      .digest();
    const actual = crypto
      .createHash("sha256")
      .update(String(password || ""))
      .digest();
    return (
      expected.length === actual.length &&
      crypto.timingSafeEqual(expected, actual)
    );
  }
  const [salt, hash] = storedHash.split(":");
  try {
    const derivedHash = crypto
      .scryptSync(String(password || ""), salt, KEY_LENGTH)
      .toString("hex");
    const left = Buffer.from(hash, "hex");
    const right = Buffer.from(derivedHash, "hex");
    return left.length === right.length && crypto.timingSafeEqual(left, right);
  } catch (e) {
    console.error("[PIDS-DB] Password verification error:", e.message);
    return false;
  }
}

let pool = null;

export async function initDatabase(retries = 5) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  while (retries > 0) {
    pool = new Pool({ connectionString, ...POOL_CONFIG });
    try {
      await pool.query("SELECT NOW()");
      console.log("[PIDS-DB] PostgreSQL connected successfully");
      await createTables();
      await seedData();
      console.log("[PIDS-DB] Database schema is ready (English).");
      return pool;
    } catch (err) {
      console.error(`[PIDS-DB] Connection failed. Retries left: ${retries - 1}. Error: ${err.message}`);
      if (pool) {
        await pool.end().catch(() => {});
        pool = null;
      }
      retries--;
      if (retries === 0) throw err;
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  return pool;
}

let _autoSaveTimer = null;
export function startAutoSave(intervalMs = parseInt(process.env.PIDS_AUTOSAVE_INTERVAL_MS || process.env.AUTOSAVE_INTERVAL || "300000", 10)) {
  try {
    // Modified to run only 1x as per user request to save storage/cache
    setTimeout(async () => {
      try {
        const backup = await createBackup();
        console.log(`[PIDS-DB] Initial session backup created: ${backup.filename}`);
      } catch (e) {
        console.error("[PIDS-DB] Initial backup error:", e.message);
      }
    }, 5000); // Run once after 5 seconds
    return () => {};
  } catch (e) {
    console.error('[PIDS-DB] startAutoSave failed:', e.message);
  }
}

export async function saveDb() {
  try {
    const backup = await createBackup();
    console.log(`[PIDS-DB] Manual save created: ${backup.filename}`);
    return backup;
  } catch (e) {
    console.error("[PIDS-DB] saveDb error:", e.message);
    throw e;
  }
}

async function query(sql, params = []) {
  if (!pool) {
    throw new Error("Database pool is not initialized");
  }
  let pgSql = sql;
  let index = 1;
  while (pgSql.includes("?")) {
    pgSql = pgSql.replace("?", `$${index++}`);
  }
  return await pool.query({
    text: pgSql,
    values: params,
    query_timeout: QUERY_TIMEOUT_MS,
  });
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
            pic_name TEXT DEFAULT '',
            pic_contact TEXT DEFAULT '',
            city_code TEXT DEFAULT '',
            address TEXT DEFAULT '',
            province TEXT DEFAULT '',
            regency TEXT DEFAULT '',
            district TEXT DEFAULT '',
            village TEXT DEFAULT '',
            postal_code TEXT DEFAULT '',
            poi TEXT DEFAULT '',
            media TEXT DEFAULT ''
        )
    `);
  await pool.query(`
        CREATE TABLE IF NOT EXISTS train_services (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL UNIQUE,
            class TEXT NOT NULL DEFAULT 'EKSEKUTIF',
            train_number TEXT NOT NULL DEFAULT '',
            coach_count INTEGER DEFAULT 10,
            ip_address TEXT DEFAULT '',
            pic_name TEXT DEFAULT '',
            pic_contact TEXT DEFAULT '',
            media TEXT DEFAULT '',
            origin_station_id TEXT DEFAULT '',
            destination_station_id TEXT DEFAULT '',
            notes TEXT DEFAULT ''
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
            stop_type TEXT DEFAULT 'intermediate',
            pic_name TEXT DEFAULT '',
            pic_contact TEXT DEFAULT '',
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
            media TEXT DEFAULT '',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            departure_station TEXT DEFAULT '',
            departure_city_code TEXT DEFAULT '',
            arrival_station TEXT DEFAULT '',
            arrival_city_code TEXT DEFAULT '',
            scheduled_departure TEXT DEFAULT '',
            actual_departure TEXT DEFAULT '',
            departure_delay TEXT DEFAULT '0',
            departure_status TEXT DEFAULT 'On Time',
            scheduled_arrival TEXT DEFAULT '',
            actual_arrival TEXT DEFAULT '',
            arrival_delay TEXT DEFAULT '0',
            arrival_status TEXT DEFAULT 'On Time',
            service_name TEXT DEFAULT '',
            train_number TEXT DEFAULT '',
            CONSTRAINT fk_route_sched FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
            CONSTRAINT uq_schedule_trip UNIQUE (service_name, train_number, schedule_date, scheduled_departure)
        )
    `);
  await pool.query(`
        CREATE TABLE IF NOT EXISTS schedule_stops (
            id SERIAL PRIMARY KEY,
            schedule_id INTEGER NOT NULL,
            route_station_id INTEGER NOT NULL,
            arrival_time TEXT DEFAULT '',
            departure_time TEXT DEFAULT '',
            actual_arrival TEXT DEFAULT '',
            actual_departure TEXT DEFAULT '',
            arrival_delay INTEGER DEFAULT 0,
            departure_delay INTEGER DEFAULT 0,
            arrival_status TEXT DEFAULT 'On Time',
            departure_status TEXT DEFAULT 'On Time',
            platform INTEGER DEFAULT 1,
            stop_status TEXT NOT NULL DEFAULT 'SCHEDULED',
            CONSTRAINT fk_schedule FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE CASCADE,
            CONSTRAINT fk_route_station FOREIGN KEY (route_station_id) REFERENCES route_stations(id) ON DELETE CASCADE
        )
    `);
  await pool.query(
    `ALTER TABLE schedule_stops DROP CONSTRAINT IF EXISTS fk_route_station`,
  );
  await pool.query(`
        ALTER TABLE schedule_stops
        ADD CONSTRAINT fk_route_station
        FOREIGN KEY (route_station_id) REFERENCES route_stations(id) ON DELETE CASCADE
    `);
  await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'Operator',
            full_name TEXT NOT NULL,
            contact TEXT DEFAULT '',
            email TEXT DEFAULT '',
            media TEXT DEFAULT '',
            train_service_id TEXT DEFAULT '',
            station_id TEXT DEFAULT ''
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
            sim_gps_json TEXT DEFAULT '{"lng": 107.6098, "lat": -6.9147, "heading": 0}',
            sim_distance REAL DEFAULT 0,
            last_sim_time BIGINT DEFAULT 0,
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
            coach_count INTEGER DEFAULT 10
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
        CREATE TABLE IF NOT EXISTS coaches (
            id TEXT PRIMARY KEY,
            ip_address TEXT DEFAULT '',
            name TEXT NOT NULL,
            sequence_number INTEGER NOT NULL DEFAULT 1,
            train_service_id INTEGER NOT NULL,
            media TEXT DEFAULT '',
            maintenance_log TEXT DEFAULT '',
            operational_log TEXT DEFAULT '',
            CONSTRAINT fk_train_service_coach FOREIGN KEY (train_service_id) REFERENCES train_services(id) ON DELETE CASCADE
        )
    `);
  await pool.query(`
        CREATE TABLE IF NOT EXISTS sensors (
            id TEXT PRIMARY KEY,
            ip_address TEXT DEFAULT '',
            device_name TEXT NOT NULL,
            sensor_type TEXT NOT NULL DEFAULT 'GPS',
            status TEXT NOT NULL DEFAULT 'Active',
            is_primary INTEGER NOT NULL DEFAULT 0,
            coach_id TEXT NOT NULL,
            CONSTRAINT fk_coach FOREIGN KEY (coach_id) REFERENCES coaches(id) ON DELETE CASCADE
        )
    `);
  await pool.query(`
        CREATE TABLE IF NOT EXISTS sensor_readings (
            id TEXT PRIMARY KEY,
            latitude REAL DEFAULT 0,
            longitude REAL DEFAULT 0,
            altitude REAL DEFAULT 0,
            speed REAL DEFAULT 0,
            temperature REAL DEFAULT 0,
            poi TEXT DEFAULT '',
            recorded_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text),
            sensor_id TEXT NOT NULL,
            CONSTRAINT fk_sensor FOREIGN KEY (sensor_id) REFERENCES sensors(id) ON DELETE CASCADE
        )
    `);
  await pool.query(`
        CREATE TABLE IF NOT EXISTS maintenance_logs (
            id TEXT PRIMARY KEY,
            started_at TEXT NOT NULL,
            finished_at TEXT DEFAULT '',
            status TEXT NOT NULL DEFAULT 'Open',
            priority TEXT NOT NULL DEFAULT 'Medium',
            description TEXT DEFAULT '',
            train_service_id INTEGER NOT NULL,
            CONSTRAINT fk_train_maint FOREIGN KEY (train_service_id) REFERENCES train_services(id) ON DELETE CASCADE
        )
    `);
  await pool.query(`
        CREATE TABLE IF NOT EXISTS operational_logs (
            id TEXT PRIMARY KEY,
            logged_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::text),
            notes TEXT DEFAULT '',
            train_service_id INTEGER NOT NULL,
            schedule_id INTEGER DEFAULT NULL,
            CONSTRAINT fk_train_ops FOREIGN KEY (train_service_id) REFERENCES train_services(id) ON DELETE CASCADE,
            CONSTRAINT fk_sched_ops FOREIGN KEY (schedule_id) REFERENCES schedules(id) ON DELETE SET NULL
        )
    `);
  const renames = [
    ["stations", "nama_pic", "pic_name"],
    ["stations", "kontak_pic", "pic_contact"],
    ["stations", "kode_kota", "city_code"],
    ["stations", "alamat", "address"],
    ["stations", "provinsi", "province"],
    ["stations", "kabupaten_kota", "regency"],
    ["stations", "kecamatan", "district"],
    ["stations", "kelurahan_desa", "village"],
    ["stations", "kode_pos", "postal_code"],
    ["train_services", "nama_pic", "pic_name"],
    ["train_services", "kontak_pic", "pic_contact"],
    ["train_services", "ka_number", "train_number"],
    ["train_services", "gerbong_count", "coach_count"],
    ["train_services", "stasiun_awal", "origin_station_id"],
    ["train_services", "stasiun_akhir", "destination_station_id"],
    ["train_services", "keterangan", "notes"],
    ["route_stations", "nama_pic", "pic_name"],
    ["route_stations", "kontak_pic", "pic_contact"],
    ["route_stations", "keterangan", "stop_type"],
    ["schedules", "train_name", "service_name"],
    ["schedules", "ka_number", "train_number"],
    ["schedules", "stasiun_keberangkatan", "departure_station"],
    ["schedules", "kode_kota_keberangkatan", "departure_city_code"],
    ["schedules", "stasiun_tujuan", "arrival_station"],
    ["schedules", "kode_kota_tujuan", "arrival_city_code"],
    ["schedules", "waktu_keberangkatan_penjadwalan", "scheduled_departure"],
    ["schedules", "waktu_keberangkatan_realisasi", "actual_departure"],
    ["schedules", "selisih_waktu_keberangkatan", "departure_delay"],
    ["schedules", "status_keberangkatan", "departure_status"],
    ["schedules", "waktu_kedatangan_penjadwalan", "scheduled_arrival"],
    ["schedules", "waktu_kedatangan_realisasi", "actual_arrival"],
    ["schedules", "selisih_waktu_kedatangan", "arrival_delay"],
    ["schedules", "status_kedatangan", "arrival_status"],
    ["schedules", "catatan", "notes"],
    ["schedule_stops", "realisasi_datang", "actual_arrival"],
    ["schedule_stops", "realisasi_berangkat", "actual_departure"],
    ["schedule_stops", "selisih_datang", "arrival_delay"],
    ["schedule_stops", "selisih_berangkat", "departure_delay"],
    ["schedule_stops", "status_datang", "arrival_status"],
    ["schedule_stops", "status_berangkat", "departure_status"],
    ["pids_state", "jumlah_kereta", "coach_count"],
    ["users", "nama", "full_name"],
    ["users", "kontak", "contact"],
    ["users", "id_kereta", "train_service_id"],
    ["users", "id_stasiun", "station_id"],
  ];

  for (const [table, oldCol, newCol] of renames) {
    try {
      await pool.query(`
                DO $$ BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name='${table}' AND column_name='${oldCol}'
                    ) THEN
                        ALTER TABLE "${table}" RENAME COLUMN "${oldCol}" TO "${newCol}";
                    END IF;
                END $$;
            `);
    } catch (e) {
      console.warn(
        `[PIDS-DB] Rename note (${table}.${oldCol}→${newCol}):`,
        e.message,
      );
    }
  }
  const tableRenames = [
    ["gerbong", "coaches"],
    ["sensor", "sensors"],
    ["sensor_data", "sensor_readings"],
    ["log_maintenance", "maintenance_logs"],
    ["log_operasional", "operational_logs"],
  ];

  for (const [oldTable, newTable] of tableRenames) {
    try {
      await pool.query(`
                DO $$ BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='${oldTable}')
                    AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='${newTable}') THEN
                        ALTER TABLE "${oldTable}" RENAME TO "${newTable}";
                    END IF;
                END $$;
            `);
    } catch (e) {
      console.warn(
        `[PIDS-DB] Table rename note (${oldTable}→${newTable}):`,
        e.message,
      );
    }
  }
  const indexes = [
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_train_services_name ON train_services(name)",
    "CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(schedule_date)",
    "CREATE INDEX IF NOT EXISTS idx_schedules_service ON schedules(service_name)",
    "CREATE INDEX IF NOT EXISTS idx_sensor_readings_sensor ON sensor_readings(sensor_id)",
    "CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp DESC)",
    "CREATE INDEX IF NOT EXISTS idx_route_stations_route ON route_stations(route_id)",
  ];

  for (const idx of indexes) {
    try {
      await pool.query(idx);
    } catch (e) {
      console.warn("[PIDS-DB] Index note:", e.message);
    }
  }

  // Ensure unique constraint for schedules exists (Migration)
  try {
    await pool.query(`
      DO $$ BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uq_schedule_trip'
        ) THEN
          ALTER TABLE schedules ADD CONSTRAINT uq_schedule_trip UNIQUE (service_name, train_number, schedule_date, scheduled_departure);
        END IF;
      END $$;
    `);
  } catch (e) {
    console.warn("[PIDS-DB] Migration note (schedules constraint):", e.message);
  }

  // Telemetry migrations for existing databases
  try {
    await pool.query(`ALTER TABLE pids_state ADD COLUMN IF NOT EXISTS sim_gps_json TEXT DEFAULT '{"lng": 107.6098, "lat": -6.9147, "heading": 0}'`);
    await pool.query(`ALTER TABLE pids_state ADD COLUMN IF NOT EXISTS sim_distance REAL DEFAULT 0`);
    await pool.query(`ALTER TABLE pids_state ADD COLUMN IF NOT EXISTS last_sim_time BIGINT DEFAULT 0`);
  } catch (e) {
    console.warn("[PIDS-DB] Migration note (telemetry columns):", e.message);
  }
}

export async function seedData() {
  console.log(
    "[PIDS-DB] Seeding integrated KAI data to PostgreSQL (Single Source of Truth)...",
  );
  await query(`INSERT INTO pids_state (id, service_name, current_station, train_number, next_station, status, led_speed, speed, altitude, temperature, air_quality, display_mode, active_route_json, coach_count, sim_gps_json, sim_distance, last_sim_time)
                 VALUES (1, 'MALABAR', 'MALANG', '67', 'MALANG KOTA LAMA', 'STANDBY', 60, 0, 0, 0, '-', 'pids', '{}', 12, '{"lng": 112.6371, "lat": -7.9772, "heading": 0}', 0, 0)
                 ON CONFLICT (id) DO NOTHING`);
  const hashedAdminPw = hashPassword("admin123");
  const hashedOpPw = hashPassword("operator123");
  await query(
    "INSERT INTO users (id, username, password, role, full_name, contact, email) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING",
    [
      "USR001",
      "admin",
      hashedAdminPw,
      "Admin",
      "Administrator",
      "081100000001",
      "admin@eltran.co.id",
    ],
  );
  await query(
    "INSERT INTO users (id, username, password, role, full_name, contact, email) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING",
    [
      "USR002",
      "operator",
      hashedOpPw,
      "Operator",
      "Operator PIDS",
      "081100000002",
      "operator@eltran.co.id",
    ],
  );
  const stationsPath = path.join(
    __dirname,
    "..",
    "..",
    "shared",
    "data",
    "stations_master.json",
  );
  const masterStations = JSON.parse(fs.readFileSync(stationsPath, "utf8"));

  for (const s of masterStations) {
    await query(
      `INSERT INTO stations (id, name, city, latitude, longitude, city_code, province, regency, district, address, postal_code, media)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                     ON CONFLICT (id) DO UPDATE SET
                        name=EXCLUDED.name, city=EXCLUDED.city,
                        latitude=EXCLUDED.latitude, longitude=EXCLUDED.longitude,
                        city_code=EXCLUDED.city_code, province=EXCLUDED.province,
                        regency=EXCLUDED.regency, district=EXCLUDED.district,
                        address=EXCLUDED.address, postal_code=EXCLUDED.postal_code,
                        media=EXCLUDED.media`,
      [
        s.code,
        s.name,
        s.city,
        s.lat,
        s.lng,
        s.region_code,
        s.province,
        s.regency,
        s.district,
        s.address,
        s.postal_code,
        s.image_url,
      ],
    );
  }
  console.log(`[PIDS-DB] ✓ ${masterStations.length} stations seeded from JSON`);
  const kaiTrains = [["MALABAR", "EKSEKUTIF/EKONOMI", "67", 12, "ML", "BD"]];

  for (const [name, cls, num, coachCount, start, end] of kaiTrains) {
    await query(
      `INSERT INTO train_services (name, class, train_number, coach_count, origin_station_id, destination_station_id)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     ON CONFLICT (name) DO UPDATE SET
                        class=EXCLUDED.class, train_number=EXCLUDED.train_number,
                        coach_count=EXCLUDED.coach_count,
                        origin_station_id=EXCLUDED.origin_station_id, destination_station_id=EXCLUDED.destination_station_id`,
      [name, cls, num, coachCount, start, end],
    );
  }
  console.log("[PIDS-DB] ✓ Train services seeded");
  const routeDefinitions = {
    MALABAR: {
      direction: "Malang - Bandung",
      stations: [
        "ML", "MLK", "KPN", "BL", "KD", "MN", "SLO", "YK", "KTA", "BTH", "PRB", "KWN", "WNS", "KM", "SRW", "KA", "GB", "IJO", "TBK", "SPH", "KJN", "KYA", "SKP", "MA", "KH", "LBG", "JRL", "KWG", "GDM", "SDR", "CPI", "MLW", "LGN", "BJR", "KNP", "BJG", "CI", "MNJ", "AWP", "TSM", "IDH", "RJP", "CAW", "CHY", "CPD", "BMW", "WNB", "CB", "LWG", "KRA", "C26", "LBJ", "NG", "CCL", "HRP", "RCK", "CMK", "GDB", "KAC", "CTH", "BD"
      ],
    },
  };

  for (const [trainName, routeDef] of Object.entries(routeDefinitions)) {
    const train = await getOne(
      "SELECT id FROM train_services WHERE name = $1",
      [trainName],
    );
    if (!train) {
      console.warn(`[PIDS-DB] Train not found for route: ${trainName}`);
      continue;
    }
    const existingRoute = await getOne(
      "SELECT id FROM routes WHERE train_service_id = $1",
      [train.id],
    );
    let routeId;
    if (existingRoute) {
      routeId = existingRoute.id;
      await query("UPDATE routes SET direction=$1 WHERE id=$2", [
        routeDef.direction,
        routeId,
      ]);
      // Skip re-seeding if count matches to avoid race conditions/FK errors
      const stnCount = await getOne("SELECT COUNT(*) FROM route_stations WHERE route_id = $1", [routeId]);
      if (parseInt(stnCount.count) === routeDef.stations.length) {
        console.log(`[PIDS-DB] Route stations for ${trainName} already seeded, skipping.`);
        continue;
      }
      await query("DELETE FROM route_stations WHERE route_id = $1", [routeId]);
    } else {
      const res = await query(
        "INSERT INTO routes (train_service_id, direction) VALUES ($1, $2) RETURNING id",
        [train.id, routeDef.direction],
      );
      routeId = res.rows[0].id;
    }
    for (let i = 0; i < routeDef.stations.length; i++) {
      const stationId = routeDef.stations[i];
      const stExists = await getOne("SELECT id FROM stations WHERE id = $1", [
        stationId,
      ]);
      if (!stExists) {
        console.warn(`[PIDS-DB] Station ID '${stationId}' not found, skipping`);
        continue;
      }
      await query(
        "INSERT INTO route_stations (route_id, station_id, sequence_order) VALUES ($1, $2, $3)",
        [routeId, stationId, i],
      );
    }
    console.log(
      `[PIDS-DB] ✓ Route ${trainName}: ${routeDef.stations.length} stops`,
    );
  }
  try {
    const { readFileSync, existsSync } = await import("fs");
    const { join, dirname } = await import("path");
    const { fileURLToPath } = await import("url");
    const __dir = dirname(fileURLToPath(import.meta.url));

    const geojsonMap = {
      MALABAR: join(
        __dir,
        "..",
        "public",
        "geojson",
        "Malabar",
        "Malabar.geojson",
      ),
    };

    for (const [trainName, filePath] of Object.entries(geojsonMap)) {
      if (!existsSync(filePath)) {
        console.warn(`[PIDS-DB] GeoJSON not found: ${filePath}`);
        continue;
      }
      const geojsonText = readFileSync(filePath, "utf-8");
      const train = await getOne(
        "SELECT id FROM train_services WHERE name = $1",
        [trainName],
      );
      if (!train) continue;
      const route = await getOne(
        "SELECT id FROM routes WHERE train_service_id = $1",
        [train.id],
      );
      if (!route) continue;
      const optimizedGeoJSON = mergeAndOptimizeGeoJSON(
        geojsonText,
        masterStations,
      );

      await query(
        "UPDATE routes SET geojson = $1, geojson_filename = $2 WHERE id = $3",
        [optimizedGeoJSON, filePath.split(/[\\/]/).pop(), route.id],
      );
      console.log(
        `[PIDS-DB] ✓ Optimized GeoJSON attached for ${trainName} (${optimizedGeoJSON.length} bytes)`,
      );
    }
  } catch (e) {
    console.warn("[PIDS-DB] GeoJSON auto-attach skipped:", e.message);
  }
  const today = new Date().toISOString().split("T")[0];
  // Note: Redundant DELETE removed to prevent foreign key violations during concurrent seeding.
  // The INSERT ... ON CONFLICT below handles updates correctly.

  const scheduleDefinitions = [
    ["MALABAR", "67", "MALANG", "MLG", "BANDUNG", "BDG", "16:50", "05:44"],
    ["MALABAR", "68", "BANDUNG", "BDG", "MALANG", "MLG", "18:09", "06:51"],
    ["MALABAR", "69", "MALANG", "MLG", "BANDUNG", "BDG", "05:24", "18:04"],
    ["MALABAR", "70", "BANDUNG", "BDG", "MALANG", "MLG", "09:29", "22:36"],
  ];

  for (const [
    serviceName,
    trainNum,
    dep,
    depCode,
    arr,
    arrCode,
    depTime,
    arrTime,
  ] of scheduleDefinitions) {
    const existingSched = await getAll(
      "SELECT id FROM schedules WHERE service_name = $1 AND schedule_date = $2 AND scheduled_departure = $3",
      [serviceName, today, depTime],
    );
    if (existingSched && existingSched.length > 0) continue;

    const train = await getOne(
      "SELECT id FROM train_services WHERE name = $1",
      [serviceName],
    );
    let routeId = null;
    if (train) {
      const route = await getOne(
        "SELECT id FROM routes WHERE train_service_id = $1",
        [train.id],
      );
      if (route) routeId = route.id;
    }

    const res = await query(
      `INSERT INTO schedules (
                route_id, service_name, train_number, schedule_date, status,
                departure_station, departure_city_code, scheduled_departure,
                arrival_station, arrival_city_code, scheduled_arrival
            ) VALUES ($1, $2, $3, $4, 'ON_TIME', $5, $6, $7, $8, $9, $10)
            ON CONFLICT (service_name, train_number, schedule_date, scheduled_departure)
            DO UPDATE SET route_id = EXCLUDED.route_id
            RETURNING id`,
      [
        routeId,
        serviceName,
        trainNum,
        today,
        dep,
        depCode,
        depTime,
        arr,
        arrCode,
        arrTime,
      ],
    );

    const schedId = res.rows[0].id;

    if (routeId) {
      const routeStations = await getAll(
        `
                SELECT rs.id as rs_id, s.name, rs.sequence_order
                FROM route_stations rs
                JOIN stations s ON rs.station_id = s.id
                WHERE rs.route_id = $1
                ORDER BY rs.sequence_order
            `,
        [routeId],
      );

      const [depH, depM] = depTime.split(":").map(Number);
      const [arrH, arrM] = arrTime.split(":").map(Number);
      let totalMinutes = arrH * 60 + arrM - (depH * 60 + depM);
      if (totalMinutes <= 0) totalMinutes += 24 * 60;
      const intervalPerStop =
        routeStations.length > 1
          ? Math.floor(totalMinutes / (routeStations.length - 1))
          : 0;

      for (let i = 0; i < routeStations.length; i++) {
        const rs = routeStations[i];
        const stopMinutes = depH * 60 + depM + i * intervalPerStop;
        const stopH = Math.floor(stopMinutes / 60) % 24;
        const stopM = stopMinutes % 60;
        const timeStr = `${String(stopH).padStart(2, "0")}:${String(stopM).padStart(2, "0")}`;
        const arrivalStr = i === 0 ? "" : timeStr;
        const departureStr = i === routeStations.length - 1 ? "" : timeStr;
        const stopStatus = i === 0 ? "DEPARTED" : "SCHEDULED";
        await query(
          `INSERT INTO schedule_stops (schedule_id, route_station_id, arrival_time, departure_time, platform, stop_status)
                    VALUES ($1, $2, $3, $4, $5, $6)`,
          [schedId, rs.rs_id, arrivalStr, departureStr, 1, stopStatus],
        );
      }
    }
  }
  console.log("[PIDS-DB] ✓ Schedules + schedule_stops seeded");
  const coachDefinitions = {
    MALABAR: [
      ["MB-L", "LOCOMOTIVE CC206", 1, "10"],
      ["MB-K1", "EXECUTIVE COACH 1", 2, "11"],
      ["MB-K2", "EXECUTIVE COACH 2", 3, "12"],
      ["MB-M", "DINING COACH", 4, "13"],
      ["MB-E1", "ECONOMY COACH 1", 5, "14"],
      ["MB-E2", "ECONOMY COACH 2", 6, "15"],
      ["MB-E3", "ECONOMY COACH 3", 7, "16"],
      ["MB-B", "BAGGAGE COACH", 8, "17"],
    ],
  };

  for (const [trainName, coaches] of Object.entries(coachDefinitions)) {
    const train = await getOne(
      "SELECT id FROM train_services WHERE name = $1",
      [trainName],
    );
    if (!train) continue;

    for (const [coachId, coachName, seqNum, ipSuffix] of coaches) {
      await query(
        `INSERT INTO coaches (id, ip_address, name, sequence_number, train_service_id)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (id) DO UPDATE SET
                    ip_address=EXCLUDED.ip_address, name=EXCLUDED.name,
                    sequence_number=EXCLUDED.sequence_number, train_service_id=EXCLUDED.train_service_id`,
        [
          coachId,
          `192.168.${train.id}.${ipSuffix}`,
          coachName,
          seqNum,
          train.id,
        ],
      );
    }
    console.log(
      `[PIDS-DB] ✓ Coaches seeded for ${trainName}: ${coaches.length} cars`,
    );
  }
  const lokomotifIds = ["MB-L"];
  for (const gId of lokomotifIds) {
    const coach = await getOne("SELECT id FROM coaches WHERE id = $1", [gId]);
    if (!coach) continue;
    const sensorId = `SEN-GPS-${gId}`;
    await query(
      `INSERT INTO sensors (id, ip_address, device_name, sensor_type, status, is_primary, coach_id)
            VALUES ($1, $2, $3, 'GPS', 'Active', 1, $4)
            ON CONFLICT (id) DO NOTHING`,
      [sensorId, "", `GPS Sensor ${gId}`, gId],
    );
  }
  console.log("[PIDS-DB] ✓ GPS sensors seeded");
  const existingAnnouncement = await getOne(
    "SELECT id FROM announcements WHERE type = 'INFO' AND active = 1 LIMIT 1",
  );
  if (!existingAnnouncement) {
    await query(`INSERT INTO announcements (type, message, priority, active)
            VALUES ('INFO', 'Selamat datang di sistem PIDS Eltran. Sistem berjalan normal.', 5, 1)`);
    console.log("[PIDS-DB] ✓ Default announcement seeded");
  }

  console.log("[PIDS-DB] ✅ All seed data verified and complete (A-L)");
}

export async function getState() {
  try {
    const row = await getOne("SELECT * FROM pids_state WHERE id = 1");
    if (!row) return getDefaultState();
    let activeRoute = null;
    try {
      activeRoute = JSON.parse(row.active_route_json || "{}");
    } catch {}
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
      videoPlaylist: JSON.parse(row.video_playlist_json || "[]"),
      activeVideoIndex: row.active_video_index ?? 0,
      isPlaying: row.video_is_playing ?? false,
      playbackMode: row.video_playback_mode || "normal",
      volume: row.video_volume ?? 50,
      tvStandby: row.video_tv_standby ?? true,
      playbackProgress: row.video_playback_progress ?? 0,
      coachCount: row.coach_count ?? 10,
      simGps: JSON.parse(row.sim_gps_json || '{"lng": 107.6098, "lat": -6.9147, "heading": 0}'),
      simDistance: row.sim_distance ?? 0,
      lastSimTime: row.last_sim_time ?? 0
    };
  } catch (e) {
    console.error("[PIDS-DB] getState error:", e.message);
    return getDefaultState();
  }
}

function getDefaultState() {
  return {
    serviceName: "",
    currentStation: "-",
    trainNumber: "",
    nextStation: "-",
    status: "STANDBY",
    ledSpeed: 60,
    speed: 0,
    altitude: 0,
    temperature: 0,
    airQuality: "-",
    displayMode: "pids",
    stations: [],
    activeRoute: null,
    geofencingInnerRadius: 250,
    geofencingOuterRadius: 750,
    showTrainNumber: true,
    ledActive: true,
    simDistance: 0,
    lastSimTime: 0
  };
}

// Helper to robustly extract station name from string, JSON string, or object
function getStationName(s) {
  if (!s || s === "-") return "-";
  if (typeof s === "string") {
    try {
      if (s.startsWith("{") && s.endsWith("}")) {
        const parsed = JSON.parse(s);
        if (parsed && parsed.name) return parsed.name;
      }
    } catch (e) { }
    return s;
  }
  return s.name || s.id || "-";
}

export async function updateState(updates) {
  const current = await getState();
  const merged = { ...current, ...updates };

  const currentStnName = getStationName(merged.currentStation);
  const nextStnName = getStationName(merged.nextStation);

  let activeRouteJson = current.activeRoute
    ? JSON.stringify(current.activeRoute)
    : "{}";
  if (updates.activeRoute !== undefined) {
    activeRouteJson = updates.activeRoute
      ? JSON.stringify(updates.activeRoute)
      : "{}";
  }

  await query(
    `INSERT INTO pids_state (id, service_name, current_station, train_number, next_station, status, led_speed, speed, altitude, temperature, air_quality, display_mode, active_route_json, geofencing_inner_radius, geofencing_outer_radius, show_train_number, led_active, video_playlist_json, active_video_index, video_is_playing, video_playback_progress, video_playback_mode, video_volume, video_tv_standby, coach_count, sim_gps_json, sim_distance, last_sim_time)
                 VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27)
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
                    coach_count = EXCLUDED.coach_count,
                    sim_gps_json = EXCLUDED.sim_gps_json,
                    sim_distance = EXCLUDED.sim_distance,
                    last_sim_time = EXCLUDED.last_sim_time`,
    [
      merged.serviceName,
      currentStnName,
      merged.trainNumber,
      nextStnName,
      merged.status,
      merged.ledSpeed,
      merged.speed,
      merged.altitude,
      merged.temperature,
      merged.airQuality,
      merged.displayMode,
      activeRouteJson,
      merged.geofencingInnerRadius || 250,
      merged.geofencingOuterRadius || 750,
      merged.showTrainNumber !== false,
      merged.ledActive !== false,
      JSON.stringify(merged.videoPlaylist || []),
      merged.activeVideoIndex ?? 0,
      merged.isPlaying ?? false,
      merged.playbackProgress ?? 0,
      merged.playbackMode || "normal",
      merged.volume ?? 50,
      merged.tvStandby ?? true,
      merged.coachCount ?? merged.jumlahKereta ?? 10,
      JSON.stringify(merged.simGps || { lng: 107.6098, lat: -6.9147, heading: 0 }),
      merged.simDistance ?? 0,
      merged.lastSimTime ?? 0
    ],
  );
  return await getState();
}

export async function getUsers() {
  try {
    return await getAll(
      "SELECT id, username, role, full_name, contact, email FROM users",
    );
  } catch (e) {
    console.error("[PIDS-DB] getUsers error:", e.message);
    return [];
  }
}
export async function getUsersWithPassword() {
  return await getAll("SELECT * FROM users");
}
export async function findUser(username, password) {
  const user = await getOne("SELECT * FROM users WHERE username = $1", [
    username,
  ]);
  if (!user) return null;
  if (!verifyPassword(password, user.password)) return null;
  return user;
}

export async function getTrains() {
  try {
    return await getAll("SELECT * FROM train_services ORDER BY id");
  } catch (e) {
    console.error("[PIDS-DB] getTrains error:", e.message);
    return [];
  }
}

export async function getTrainNames() {
  try {
    const rows = await getAll("SELECT name FROM train_services ORDER BY id");
    return rows.map((r) => r.name);
  } catch (e) {
    console.error("[PIDS-DB] getTrainNames error:", e.message);
    return [];
  }
}

export async function addTrain(train) {
  try {
    const {
      name,
      class: className,
      train_number,
      coach_count,
      ip_address,
      pic_name,
      pic_contact,
      media,
      origin_station_id,
      destination_station_id,
      notes,
    } = train;
    await query(
      `INSERT INTO train_services (name, class, train_number, coach_count, ip_address, pic_name, pic_contact, media, origin_station_id, destination_station_id, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (name) DO UPDATE SET
             class = EXCLUDED.class, train_number = EXCLUDED.train_number, coach_count = EXCLUDED.coach_count,
             ip_address = EXCLUDED.ip_address, pic_name = EXCLUDED.pic_name, pic_contact = EXCLUDED.pic_contact, media = EXCLUDED.media,
             origin_station_id = EXCLUDED.origin_station_id, destination_station_id = EXCLUDED.destination_station_id, notes = EXCLUDED.notes`,
      [
        name,
        className || "EKSEKUTIF",
        train_number || "",
        coach_count ?? 10,
        ip_address || "",
        pic_name || "",
        pic_contact || "",
        media || "",
        origin_station_id || "",
        destination_station_id || "",
        notes || "",
      ],
    );
    return { success: true, trains: await getTrains() };
  } catch (e) {
    console.error("Error adding train:", e);
    return { error: e.message };
  }
}

export async function deleteTrain(name) {
  try {
    await query("DELETE FROM train_services WHERE name = $1", [name]);
    return { success: true, trains: await getTrains() };
  } catch (e) {
    return { error: e.message };
  }
}

export async function getStations(filter = {}) {
  try {
    let sql = "SELECT * FROM stations";
    const params = [];

    if (filter.search) {
      const search = `%${filter.search}%`;
      sql += ` WHERE name ILIKE $1 OR city ILIKE $1`;
      params.push(search);
    }

    sql += " ORDER BY name";

    let stations = await getAll(sql, params);

    if (filter.division && filter.division !== "All Stations") {
      const javaCities = [
        "malang",
        "bandung",
        "surakarta",
        "solo",
        "yogya",
        "semarang",
        "cirebon",
        "jakarta",
        "blitar",
        "kediri",
        "nganjuk",
        "madiun",
        "ngawi",
        "sragen",
        "klaten",
        "purworejo",
        "kebumen",
        "cilacap",
        "banjar",
        "ciamis",
        "tasikmalaya",
        "garut",
        "purwakarta",
        "subang",
        "karawang",
        "bekasi",
        "tangerang",
        "serang",
        "cilegon",
        "banyuwangi",
        "jember",
        "probolinggo",
        "pasuruan",
        "sidoarjo",
        "surabaya",
        "mojokerto",
        "jombang",
        "bojonegoro",
        "lamongan",
        "gresik",
        "tuban",
        "brebes",
        "tegal",
        "pemalang",
        "pekalongan",
        "batang",
        "kendal",
        "demak",
        "kudus",
        "pati",
        "rembang",
        "wonogiri",
        "sukoharjo",
        "boyolali",
        "magelang",
        "temanggung",
        "wonosobo",
        "purworejo",
        "kebumen",
        "banjarnegara",
        "purbalingga",
        "banyumas",
        "cilacap",
      ];

      stations = stations.filter((s) => {
        const isJava =
          javaCities.some(
            (city) =>
              (s.city || "").toLowerCase().includes(city) ||
              (s.name || "").toLowerCase().includes(city),
          ) ||
          (s.provinsi || "").toLowerCase().includes("jawa") ||
          (s.provinsi || "").toLowerCase().includes("dki") ||
          (s.id || "").startsWith("JR");

        const div = isJava ? "Java Division" : "Sumatra Division";
        return div === filter.division;
      });
    }

    const total = stations.length;
    const limit = filter.limit ? parseInt(filter.limit) : total;
    const offset = filter.offset ? parseInt(filter.offset) : 0;

    const paginatedStations = stations.slice(offset, offset + limit);

    return {
      stations: paginatedStations,
      total,
      limit,
      offset,
    };
  } catch (e) {
    console.error("[PIDS-DB] getStations error:", e.message);
    return { stations: [], total: 0, limit: 0, offset: 0 };
  }
}
export async function addStation(data) {
  try {
    const {
      id,
      name,
      city,
      latitude,
      longitude,
      ip_address,
      pic_name,
      pic_contact,
      city_code,
      address,
      province,
      regency,
      district,
      village,
      postal_code,
      poi,
      media,
    } = data;
    const legacyPicName = data.nama_pic;
    const legacyPicContact = data.kontak_pic;
    const legacyCityCode = data.kode_kota;
    const legacyAddress = data.alamat;
    const legacyProvince = data.provinsi;
    const legacyRegency = data.kabupaten_kota;
    const legacyDistrict = data.kecamatan;
    const legacyVillage = data.kelurahan_desa;
    const legacyPostalCode = data.kode_pos;
    await query(
      `INSERT INTO stations (id, name, city, latitude, longitude, ip_address, pic_name, pic_contact, city_code, address, province, regency, district, village, postal_code, poi, media)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
             ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name, city = EXCLUDED.city, latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
             ip_address = EXCLUDED.ip_address, pic_name = EXCLUDED.pic_name, pic_contact = EXCLUDED.pic_contact,
             city_code = EXCLUDED.city_code, address = EXCLUDED.address, province = EXCLUDED.province,
             regency = EXCLUDED.regency, district = EXCLUDED.district,
             village = EXCLUDED.village, postal_code = EXCLUDED.postal_code, poi = EXCLUDED.poi, media = EXCLUDED.media`,
      [
        id,
        name,
        city,
        latitude || 0,
        longitude || 0,
        ip_address || "",
        pic_name || legacyPicName || "",
        pic_contact || legacyPicContact || "",
        city_code || legacyCityCode || "",
        address || legacyAddress || "",
        province || legacyProvince || "",
        regency || legacyRegency || "",
        district || legacyDistrict || "",
        village || legacyVillage || "",
        postal_code || legacyPostalCode || "",
        poi || "",
        media || "",
      ],
    );
    return { success: true, station: data };
  } catch (e) {
    return { error: e.message };
  }
}

export async function updateStation(id, data) {
  return await addStation({ ...data, id });
}
export async function deleteStation(id) {
  try {
    await query("DELETE FROM stations WHERE id = $1", [id]);
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

function isNameMatch(a, b) {
  if (!a || !b) return false;
  const clean = (s) =>
    s
      .toString()
      .toUpperCase()
      .replace(/\(.*\)/g, "") // Remove parentheticals like (BDG)
      .replace(/[^A-Z0-9]/g, " ") // Replace non-alphanum with space
      .replace(/\s+/g, " ") // Collapse spaces
      .trim();
  return (
    clean(a) === clean(b) ||
    clean(a).includes(clean(b)) ||
    clean(b).includes(clean(a))
  );
}

export async function getRoutes() {
  try {
    const services = await getAll("SELECT * FROM train_services ORDER BY id");
    const liveState = await getState();
    const routes = {};
    for (const service of services) {
      const dbRoute = await getOne(
        "SELECT * FROM routes WHERE train_service_id = $1",
        [service.id],
      );
      let stations = [];
      if (dbRoute) {
        const stationRows = await getAll(
          `
                    SELECT s.name, s.media
                    FROM route_stations rs
                    JOIN stations s ON rs.station_id = s.id
                    WHERE rs.route_id = $1
                    ORDER BY rs.sequence_order
                `,
          [dbRoute.id],
        );
        stations = stationRows.map((r) => ({ name: r.name, media: r.media }));
      }

      const isLive = isNameMatch(service.name, liveState.serviceName);
      const currentStationName = isLive ? liveState.currentStation : "";

      if (dbRoute) {
        const parsed = JSON.parse(dbRoute.geojson || "{}");
        const routeStations =
          stations.length > 0 ? stations : parsed.stations || [];

        let currentIdx = parsed.current_station_index;
        if (isLive && currentStationName) {
          const found = routeStations.findIndex((s) =>
            isNameMatch(typeof s === "string" ? s : s.name, currentStationName),
          );
          if (found !== -1) currentIdx = found;
        }

        routes[service.name] = {
          ...parsed,
          name: service.name,
          stations: routeStations,
          geojson: dbRoute.geojson,
          geojson_filename: dbRoute.geojson_filename,
          is_active: isLive,
          current_station: currentStationName,
          current_station_index: currentIdx,
          status: isLive ? liveState.status : parsed.status || "ON TRACK",
          train_number: isLive
            ? liveState.trainNumber
            : service.ka_number || parsed.train_number || "",
        };
      } else {
        let currentIdx = 0;
        if (isLive && currentStationName) {
          const found = stations.findIndex((s) =>
            isNameMatch(typeof s === "string" ? s : s.name, currentStationName),
          );
          if (found !== -1) currentIdx = found;
        }

        routes[service.name] = {
          name: service.name,
          stations: stations,
          path: "",
          nodes: [],
          is_active: isLive,
          current_station: currentStationName,
          current_station_index: currentIdx,
          status: isLive ? liveState.status : "STANDBY",
        };
      }
    }
    return routes;
  } catch (e) {
    console.error("[PIDS-DB] getRoutes error:", e.message);
    return {};
  }
}

export async function saveRoute(name, stations) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const train = await getOne(
      "SELECT id FROM train_services WHERE name = $1",
      [name],
    );
    if (!train) throw new Error(`Train ${name} not found`);

    const res = await client.query(
      "INSERT INTO routes (train_service_id) VALUES ($1) ON CONFLICT (train_service_id) DO UPDATE SET train_service_id = EXCLUDED.train_service_id RETURNING id",
      [train.id],
    );
    const routeId = res.rows[0].id;

    await client.query("DELETE FROM route_stations WHERE route_id = $1", [
      routeId,
    ]);
    for (let i = 0; i < stations.length; i++) {
      const s = stations[i];
      const stationName =
        typeof s === "string"
          ? s
          : s?.name || s?.station_name || s?.station || "";
      const stationId =
        typeof s === "object" && s ? s.id || s.station_id || "" : "";
      const station = stationId
        ? await client.query("SELECT id FROM stations WHERE id = $1", [
            stationId,
          ])
        : await client.query("SELECT id FROM stations WHERE name = $1", [
            stationName,
          ]);
      const resolvedStation = station.rows[0];
      if (!resolvedStation) {
        throw new Error(
          `Station not found in route: ${stationName || stationId || `index ${i}`}`,
        );
      }
      await client.query(
        `INSERT INTO route_stations (route_id, station_id, sequence_order, svg_position, svg_label, keterangan, nama_pic, kontak_pic)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          routeId,
          resolvedStation.id,
          i,
          s?.svg_position || "",
          s?.svg_label || "",
          s?.keterangan || "antara",
          s?.nama_pic || s?.pic_name || "",
          s?.kontak_pic || s?.pic_contact || "",
        ],
      );
    }
    await client.query("COMMIT");
    return { success: true, name, stations };
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("Error saving route:", e);
    return { error: e.message };
  } finally {
    client.release();
  }
}
export async function deleteRoute(name) {
  try {
    const train = await getOne(
      "SELECT id FROM train_services WHERE name = $1",
      [name],
    );
    if (!train) throw new Error(`Train ${name} not found`);
    await query("DELETE FROM routes WHERE train_service_id = $1", [train.id]);
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

export async function getSchedules(filter = {}) {
  try {
    let sql = `
            SELECT s.*, r.direction,
                   COALESCE(t.name, s.service_name) as display_service_name,
                   COALESCE(t.train_number, s.train_number) as display_train_number
            FROM schedules s
            LEFT JOIN routes r ON s.route_id = r.id
            LEFT JOIN train_services t ON r.train_service_id = t.id
        `;
    let countSql = "SELECT COUNT(*) as total FROM schedules s";
    const params = [];
    let paramIdx = 1;

    if (filter.search) {
      const search = `%${filter.search}%`;
      const where = ` WHERE s.service_name ILIKE $${paramIdx} OR s.train_number ILIKE $${paramIdx} OR s.departure_station ILIKE $${paramIdx} OR s.arrival_station ILIKE $${paramIdx}`;
      sql += where;
      countSql += where;
      params.push(search);
      paramIdx++;
    }

    sql += " ORDER BY s.schedule_date DESC";

    if (filter.limit !== undefined) {
      const limit = parseInt(filter.limit) || 50;
      const offset = parseInt(filter.offset) || 0;
      sql += ` LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
      params.push(limit, offset);
    }

    const [schedules, countRes] = await Promise.all([
      getAll(sql, params),
      getOne(countSql, params.slice(0, filter.search ? 1 : 0)),
    ]);

    if (schedules && schedules.length > 0) {
      for (const s of schedules) {
        s.stops = await getAll(
          `
                    SELECT ss.*, s.name as station_name, s.id as station_id
                    FROM schedule_stops ss
                    JOIN route_stations rs ON ss.route_station_id = rs.id
                    JOIN stations s ON rs.station_id = s.id
                    WHERE ss.schedule_id = $1
                    ORDER BY rs.sequence_order
                `,
          [s.id],
        );
      }
    }

    return {
      schedules: schedules || [],
      total: parseInt(countRes?.total || 0),
      limit: filter.limit ? parseInt(filter.limit) : schedules?.length || 0,
      offset: filter.offset ? parseInt(filter.offset) : 0,
    };
  } catch (e) {
    console.error("getSchedules error:", e);
    return { schedules: [], total: 0 };
  }
}

export async function addSchedule(schedule) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const {
      route_id,
      schedule_date,
      status,
      notes,
      stops,
      media,
      service_name,
      train_name,
      train_number,
      ka_number,
      departure_station,
      stasiun_keberangkatan,
      departure_city_code,
      kode_kota_keberangkatan,
      arrival_station,
      stasiun_tujuan,
      arrival_city_code,
      kode_kota_tujuan,
      scheduled_departure,
      waktu_keberangkatan_penjadwalan,
      actual_departure,
      waktu_keberangkatan_realisasi,
      departure_delay,
      selisih_waktu_keberangkatan,
      departure_status,
      status_keberangkatan,
      scheduled_arrival,
      waktu_kedatangan_penjadwalan,
      actual_arrival,
      waktu_kedatangan_realisasi,
      arrival_delay,
      selisih_waktu_kedatangan,
      arrival_status,
      status_kedatangan,
    } = schedule;

    const res = await client.query(
      `INSERT INTO schedules (
                route_id, schedule_date, status, notes, media,
                service_name, train_number,
                departure_station, departure_city_code, arrival_station, arrival_city_code,
                scheduled_departure, actual_departure, departure_delay, departure_status,
                scheduled_arrival, actual_arrival, arrival_delay, arrival_status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
             RETURNING id`,
      [
        route_id || null,
        schedule_date || new Date().toISOString().split("T")[0],
        status || "ON_TIME",
        notes || "",
        media || "",
        service_name || train_name || "",
        train_number || ka_number || "",
        departure_station || stasiun_keberangkatan || "",
        departure_city_code || kode_kota_keberangkatan || "",
        arrival_station || stasiun_tujuan || "",
        arrival_city_code || kode_kota_tujuan || "",
        scheduled_departure || waktu_keberangkatan_penjadwalan || "",
        actual_departure || waktu_keberangkatan_realisasi || "",
        departure_delay || selisih_waktu_keberangkatan || "0",
        departure_status || status_keberangkatan || "On Time",
        scheduled_arrival || waktu_kedatangan_penjadwalan || "",
        actual_arrival || waktu_kedatangan_realisasi || "",
        arrival_delay || selisih_waktu_kedatangan || "0",
        arrival_status || status_kedatangan || "On Time",
      ],
    );
    const scheduleId = res.rows[0].id;

    for (const stop of stops) {
      await client.query(
        `INSERT INTO schedule_stops (schedule_id, route_station_id, arrival_time, departure_time, platform, stop_status)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          scheduleId,
          stop.route_station_id,
          stop.arrival_time,
          stop.departure_time,
          stop.platform || 1,
          stop.stop_status || "SCHEDULED",
        ],
      );
    }

    await client.query("COMMIT");
    return { success: true, id: scheduleId };
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Error adding schedule:", e);
    return { error: e.message };
  } finally {
    client.release();
  }
}

export async function updateSchedule(id, schedule) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const {
      route_id,
      schedule_date,
      status,
      notes,
      stops,
      media,
      service_name,
      train_name,
      train_number,
      ka_number,
      departure_station,
      stasiun_keberangkatan,
      departure_city_code,
      kode_kota_keberangkatan,
      arrival_station,
      stasiun_tujuan,
      arrival_city_code,
      kode_kota_tujuan,
      scheduled_departure,
      waktu_keberangkatan_penjadwalan,
      actual_departure,
      waktu_keberangkatan_realisasi,
      departure_delay,
      selisih_waktu_keberangkatan,
      departure_status,
      status_keberangkatan,
      scheduled_arrival,
      waktu_kedatangan_penjadwalan,
      actual_arrival,
      waktu_kedatangan_realisasi,
      arrival_delay,
      selisih_waktu_kedatangan,
      arrival_status,
      status_kedatangan,
    } = schedule;

    await client.query(
      `UPDATE schedules SET
                route_id = $1, schedule_date = $2, status = $3, notes = $4, media = $5,
                service_name = $6, train_number = $7,
                departure_station = $8, departure_city_code = $9, arrival_station = $10, arrival_city_code = $11,
                scheduled_departure = $12, actual_departure = $13, departure_delay = $14, departure_status = $15,
                scheduled_arrival = $16, actual_arrival = $17, arrival_delay = $18, arrival_status = $19,
                updated_at = CURRENT_TIMESTAMP
             WHERE id = $20`,
      [
        route_id || null,
        schedule_date,
        status || "ON_TIME",
        notes || "",
        media || "",
        service_name || train_name || "",
        train_number || ka_number || "",
        departure_station || stasiun_keberangkatan || "",
        departure_city_code || kode_kota_keberangkatan || "",
        arrival_station || stasiun_tujuan || "",
        arrival_city_code || kode_kota_tujuan || "",
        scheduled_departure || waktu_keberangkatan_penjadwalan || "",
        actual_departure || waktu_keberangkatan_realisasi || "",
        departure_delay || selisih_waktu_keberangkatan || "0",
        departure_status || status_keberangkatan || "On Time",
        scheduled_arrival || waktu_kedatangan_penjadwalan || "",
        actual_arrival || waktu_kedatangan_realisasi || "",
        arrival_delay || selisih_waktu_kedatangan || "0",
        arrival_status || status_kedatangan || "On Time",
        id,
      ],
    );

    if (stops && stops.length > 0) {
      await client.query("DELETE FROM schedule_stops WHERE schedule_id = $1", [
        id,
      ]);
      for (const stop of stops) {
        await client.query(
          `INSERT INTO schedule_stops (schedule_id, route_station_id, arrival_time, departure_time, platform, stop_status)
                     VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            id,
            stop.route_station_id,
            stop.arrival_time,
            stop.departure_time,
            stop.platform || 1,
            stop.stop_status || "SCHEDULED",
          ],
        );
      }
    }

    await client.query("COMMIT");
    return { success: true };
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("Error updating schedule:", e);
    return { error: e.message };
  } finally {
    client.release();
  }
}

export async function deleteSchedule(id) {
  try {
    await query("DELETE FROM schedules WHERE id = $1", [id]);
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}
export async function getGerbong(trainServiceId) {
  try {
    return await getAll(
      "SELECT * FROM coaches WHERE train_service_id = $1 ORDER BY sequence_number",
      [trainServiceId],
    );
  } catch (e) {
    console.error("[PIDS-DB] getGerbong error:", e.message);
    return [];
  }
}

export async function addGerbong(coach) {
  try {
    const {
      id,
      ip_address,
      name,
      nama_gerbong,
      sequence_number,
      no_urut_gerbong,
      train_service_id,
      id_kereta,
      media,
      maintenance_log,
      log_maintenance,
      operational_log,
      log_operasional,
    } = coach;
    await query(
      `INSERT INTO coaches (id, ip_address, name, sequence_number, train_service_id, media, maintenance_log, operational_log)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (id) DO UPDATE SET
             ip_address = EXCLUDED.ip_address, name = EXCLUDED.name,
             sequence_number = EXCLUDED.sequence_number, train_service_id = EXCLUDED.train_service_id,
             media = EXCLUDED.media, maintenance_log = EXCLUDED.maintenance_log, operational_log = EXCLUDED.operational_log`,
      [
        id,
        ip_address || "",
        name || nama_gerbong,
        sequence_number ?? no_urut_gerbong ?? 1,
        train_service_id ?? id_kereta,
        media || "",
        maintenance_log || log_maintenance || "",
        operational_log || log_operasional || "",
      ],
    );
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

export async function deleteGerbong(id) {
  try {
    await query("DELETE FROM coaches WHERE id = $1", [id]);
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}

export async function getLogs(filter = {}) {
  try {
    let sql = "SELECT * FROM system_logs";
    let countSql = "SELECT COUNT(*) as total FROM system_logs";
    const params = [];
    const countParams = [];
    let paramIdx = 1;

    if (filter.action && filter.action !== "ALL") {
      sql += ` WHERE action = $${paramIdx}`;
      countSql += ` WHERE action = $${paramIdx}`;
      params.push(filter.action);
      countParams.push(filter.action);
      paramIdx++;
    }

    sql += " ORDER BY timestamp DESC";

    const limit = parseInt(filter.limit) || 50;
    const offset = parseInt(filter.offset) || 0;

    sql += ` LIMIT $${paramIdx++} OFFSET $${paramIdx++}`;
    params.push(limit, offset);

    const [logs, countRes] = await Promise.all([
      getAll(sql, params),
      getOne(countSql, countParams),
    ]);

    return {
      logs,
      total: parseInt(countRes?.total || 0),
      limit,
      offset,
    };
  } catch (e) {
    console.error("[PIDS-DB] getLogs error:", e.message);
    return { logs: [], total: 0, limit: 0, offset: 0 };
  }
}

export async function writeLog(entry) {
  const auditRecord = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    action: entry.action,
    user: entry.user,
    role: entry.role || "System",
    details: entry.details || "",
    data: entry.data ?? null,
  };

  let dbSuccess = false;
  try {
    await query(
      'INSERT INTO system_logs (id, timestamp, action, "user", role, details, data_json) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [
        auditRecord.id,
        auditRecord.timestamp,
        auditRecord.action,
        auditRecord.user,
        auditRecord.role,
        auditRecord.details,
        auditRecord.data ? JSON.stringify(auditRecord.data) : "",
      ],
    );
    dbSuccess = true;
  } catch (e) {
    console.error("[PIDS-DB] Failed to write log:", e.message);
  }

  try {
    await fs.promises.mkdir(AUDIT_DIR, { recursive: true });
    await fs.promises.appendFile(
      AUDIT_LOG_FILE,
      `${JSON.stringify(auditRecord)}\n`,
      "utf8",
    );
  } catch (e) {
    console.error("[PIDS-DB] Failed to mirror audit log:", e.message);
  }

  return dbSuccess;
}

function quoteIdent(name) {
  return `"${String(name).replace(/"/g, '""')}"`;
}

async function ensureDirectory(directory) {
  await fs.promises.mkdir(directory, { recursive: true });
}

const BACKUP_TABLES = [
  {
    name: "stations",
    columns: [
      "id",
      "name",
      "city",
      "latitude",
      "longitude",
      "ip_address",
      "pic_name",
      "pic_contact",
      "city_code",
      "address",
      "province",
      "regency",
      "district",
      "village",
      "postal_code",
      "poi",
      "media",
    ],
    orderBySql: '"id"',
  },
  {
    name: "train_services",
    columns: [
      "id",
      "name",
      "class",
      "train_number",
      "coach_count",
      "ip_address",
      "pic_name",
      "pic_contact",
      "media",
      "origin_station_id",
      "destination_station_id",
      "notes",
    ],
    orderBySql: '"id"',
  },
  {
    name: "routes",
    columns: [
      "id",
      "train_service_id",
      "direction",
      "svg_path",
      "geojson",
      "geojson_filename",
    ],
    orderBySql: '"id"',
  },
  {
    name: "route_stations",
    columns: [
      "id",
      "route_id",
      "station_id",
      "sequence_order",
      "svg_position",
      "svg_label",
      "stop_type",
      "pic_name",
      "pic_contact",
    ],
    orderBySql: '"route_id", "sequence_order", "id"',
  },
  {
    name: "schedules",
    columns: [
      "id",
      "route_id",
      "schedule_date",
      "status",
      "notes",
      "media",
      "updated_at",
      "departure_station",
      "departure_city_code",
      "arrival_station",
      "arrival_city_code",
      "scheduled_departure",
      "actual_departure",
      "departure_delay",
      "departure_status",
      "scheduled_arrival",
      "actual_arrival",
      "arrival_delay",
      "arrival_status",
      "service_name",
      "train_number",
    ],
    orderBySql: '"id"',
  },
  {
    name: "schedule_stops",
    columns: [
      "id",
      "schedule_id",
      "route_station_id",
      "arrival_time",
      "departure_time",
      "actual_arrival",
      "actual_departure",
      "arrival_delay",
      "departure_delay",
      "arrival_status",
      "departure_status",
      "platform",
      "stop_status",
    ],
    orderBySql: '"schedule_id", "id"',
  },
  {
    name: "users",
    columns: [
      "id",
      "username",
      "password",
      "role",
      "full_name",
      "contact",
      "email",
      "media",
      "train_service_id",
      "station_id",
    ],
    orderBySql: '"id"',
  },
  {
    name: "units",
    columns: ["id", "name", "type", "active"],
    orderBySql: '"name"',
  },
  {
    name: "pids_state",
    columns: [
      "id",
      "service_name",
      "current_station",
      "train_number",
      "next_station",
      "status",
      "led_speed",
      "speed",
      "altitude",
      "temperature",
      "air_quality",
      "display_mode",
      "active_route_json",
      "geofencing_inner_radius",
      "geofencing_outer_radius",
      "show_train_number",
      "led_active",
      "video_playlist_json",
      "active_video_index",
      "video_is_playing",
      "video_playback_mode",
      "video_volume",
      "video_tv_standby",
      "video_playback_progress",
      "coach_count",
      "sim_distance",
      "last_sim_time",
    ],
    orderBySql: '"id"',
  },
  {
    name: "system_logs",
    columns: [
      "id",
      "timestamp",
      "action",
      "user",
      "role",
      "details",
      "data_json",
    ],
    orderBySql: '"timestamp" DESC, "id" DESC',
  },
  {
    name: "announcements",
    columns: ["id", "type", "message", "priority", "active", "created_at"],
    orderBySql: '"id"',
  },
  {
    name: "coaches",
    columns: [
      "id",
      "ip_address",
      "name",
      "sequence_number",
      "train_service_id",
      "media",
      "maintenance_log",
      "operational_log",
    ],
    orderBySql: '"train_service_id", "sequence_number", "id"',
  },
  {
    name: "sensors",
    columns: [
      "id",
      "ip_address",
      "device_name",
      "sensor_type",
      "status",
      "is_primary",
      "coach_id",
    ],
    orderBySql: '"coach_id", "device_name", "id"',
  },
  {
    name: "sensor_readings",
    columns: [
      "id",
      "latitude",
      "longitude",
      "altitude",
      "speed",
      "temperature",
      "poi",
      "recorded_at",
      "sensor_id",
    ],
    orderBySql: '"recorded_at" DESC, "id" DESC',
  },
  {
    name: "maintenance_logs",
    columns: [
      "id",
      "started_at",
      "finished_at",
      "status",
      "priority",
      "description",
      "train_service_id",
    ],
    orderBySql: '"started_at" DESC, "id" DESC',
  },
  {
    name: "operational_logs",
    columns: ["id", "logged_at", "notes", "train_service_id", "schedule_id"],
    orderBySql: '"logged_at" DESC, "id" DESC',
  },
];

const BACKUP_RESTORE_ORDER = [
  "stations",
  "train_services",
  "routes",
  "route_stations",
  "schedules",
  "schedule_stops",
  "users",
  "units",
  "pids_state",
  "system_logs",
  "announcements",
  "coaches",
  "sensors",
  "sensor_readings",
  "maintenance_logs",
  "operational_logs",
];

const SERIAL_TABLES = new Set([
  "train_services",
  "routes",
  "route_stations",
  "schedules",
  "schedule_stops",
  "announcements",
]);

async function readBackupTable(table) {
  const selectSql = `SELECT ${table.columns.map(quoteIdent).join(", ")} FROM ${quoteIdent(table.name)} ORDER BY ${table.orderBySql}`;
  return await getAll(selectSql);
}

async function insertBackupRows(client, table, rows) {
  if (!rows || rows.length === 0) return;

  const columns = table.columns.map(quoteIdent).join(", ");
  const placeholders = table.columns
    .map((_, index) => `$${index + 1}`)
    .join(", ");
  const sqlText = `INSERT INTO ${quoteIdent(table.name)} (${columns}) VALUES (${placeholders})`;

  for (const row of rows) {
    const values = table.columns.map((column) => row[column] ?? null);
    await client.query(sqlText, values);
  }
}

async function resetSerialSequence(client, tableName) {
  if (!SERIAL_TABLES.has(tableName)) return;
  const columnSql = quoteIdent("id");
  const tableSql = quoteIdent(tableName);
  await client.query(`
        SELECT setval(
            pg_get_serial_sequence('${tableName}', 'id'),
            COALESCE(MAX(${columnSql}), 1),
            MAX(${columnSql}) IS NOT NULL
        )
        FROM ${tableSql}
    `);
}

async function snapshotDatabase() {
  const tables = {};
  for (const table of BACKUP_TABLES) {
    tables[table.name] = await readBackupTable(table);
  }
  return {
    meta: {
      version: 1,
      createdAt: new Date().toISOString(),
    },
    tables,
  };
}

async function writeBackupFile(snapshot) {
  await ensureDirectory(BACKUP_DIR);
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `pids-backup-${stamp}.json`;
  const filePath = path.join(BACKUP_DIR, filename);
  await fs.promises.writeFile(
    filePath,
    JSON.stringify(snapshot, null, 2),
    "utf8",
  );
  return { filename, filePath };
}

async function readBackupFile(filename) {
  const safeFilename = path.basename(String(filename || ""));
  if (!safeFilename) {
    throw new Error("Backup filename is required");
  }

  await ensureDirectory(BACKUP_DIR);
  const filePath = path.join(BACKUP_DIR, safeFilename);
  if (!filePath.startsWith(BACKUP_DIR)) {
    throw new Error("Invalid backup path");
  }

  const raw = await fs.promises.readFile(filePath, "utf8");
  return { filePath, snapshot: JSON.parse(raw) };
}

export async function listBackups() {
  try {
    await ensureDirectory(BACKUP_DIR);
    const files = await fs.promises.readdir(BACKUP_DIR);
    const backups = [];

    for (const file of files.filter((name) => name.endsWith(".json"))) {
      const filePath = path.join(BACKUP_DIR, file);
      const stat = await fs.promises.stat(filePath);
      backups.push({
        filename: file,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      });
    }

    return backups.sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
  } catch (e) {
    console.error("[PIDS-DB] listBackups error:", e.message);
    return [];
  }
}

export async function createBackup() {
  const snapshot = await snapshotDatabase();
  const { filename, filePath } = await writeBackupFile(snapshot);
  return {
    filename,
    filePath,
    createdAt: snapshot.meta.createdAt,
    tables: Object.fromEntries(
      Object.entries(snapshot.tables).map(([name, rows]) => [
        name,
        rows.length,
      ]),
    ),
  };
}

export async function restoreBackup(filename) {
  const { snapshot } = await readBackupFile(filename);
  if (!snapshot || typeof snapshot !== "object" || !snapshot.tables) {
    throw new Error("Invalid backup snapshot");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
            TRUNCATE
                schedule_stops,
                schedules,
                route_stations,
                routes,
                sensor_readings,
                sensors,
                coaches,
                maintenance_logs,
                operational_logs,
                system_logs,
                announcements,
                users,
                units,
                pids_state,
                train_services,
                stations
            RESTART IDENTITY CASCADE
        `);

    for (const tableName of BACKUP_RESTORE_ORDER) {
      const table = BACKUP_TABLES.find((item) => item.name === tableName);
      await insertBackupRows(client, table, snapshot.tables[tableName] || []);
    }

    for (const tableName of SERIAL_TABLES) {
      await resetSerialSequence(client, tableName);
    }

    await client.query("COMMIT");
    return {
      success: true,
      restoredAt: new Date().toISOString(),
      filename: path.basename(String(filename || "")),
    };
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

export async function getDbDump() {
  try {
    return {
      trainNames: await getTrainNames(),
      trainNumbers: [
        "01",
        "02",
        "03",
        "04",
        "05",
        "06",
        "07",
        "08",
        "09",
        "10",
      ],
      routes: await getRoutes(),
      users: await getUsers(),
      stations: await getStations(),
    };
  } catch (e) {
    console.error("[PIDS-DB] getDbDump error:", e.message);
    return {
      trainNames: [],
      trainNumbers: [],
      routes: {},
      users: [],
      stations: [],
    };
  }
}

export async function closeDatabase() {
  if (!pool) return;
  await pool.end().catch((e) => {
    console.error("[PIDS-DB] Error closing database pool:", e.message);
  });
  pool = null;
}

function extractStationsFromGeoJSON(geojson) {
  if (!geojson || !geojson.features) return [];
  const stations = geojson.features
    .filter((f) => f.geometry && f.geometry.type === "Point" && f.properties)
    .map((f) => {
      const p = f.properties;
      const name =
        p.name ||
        p.Name ||
        p.STATION ||
        p.Station ||
        p.nama ||
        p.Nama ||
        p.label ||
        "";
      return name.toString().toUpperCase().trim();
    })
    .filter((name) => name.length > 0);
  return [...new Set(stations)];
}

export async function updateRouteGeoJSON(name, geojson, filename = "") {
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      let service = await getOne(
        "SELECT id FROM train_services WHERE name = $1",
        [name],
      );
      if (!service) {
        const result = await client.query(
          "INSERT INTO train_services (name) VALUES ($1) RETURNING id",
          [name],
        );
        service = result.rows[0];
      }

      const extractedStations = extractStationsFromGeoJSON(geojson);
      let routeRes = await client.query(
        "SELECT id FROM routes WHERE train_service_id = $1",
        [service.id],
      );
      let route = routeRes.rows[0] || null;
      if (!route) {
        const routeResult = await client.query(
          "INSERT INTO routes (train_service_id, geojson, geojson_filename) VALUES ($1, $2, $3) RETURNING id",
          [service.id, JSON.stringify(geojson), filename],
        );
        route = routeResult.rows[0];
      } else {
        await client.query(
          "UPDATE routes SET geojson = $1, geojson_filename = $2 WHERE id = $3",
          [JSON.stringify(geojson), filename, route.id],
        );
        await client.query("DELETE FROM route_stations WHERE route_id = $1", [
          route.id,
        ]);
      }

      let seq = 1;
      for (const stationName of extractedStations) {
        let st = await client.query("SELECT id FROM stations WHERE name = $1", [
          stationName,
        ]);
        let stationRow = st.rows[0];
        if (!stationRow) {
          const newId =
            stationName.substring(0, 3).toUpperCase() +
            Math.random().toString(36).substring(2, 5).toUpperCase();
          await client.query(
            "INSERT INTO stations (id, name, city) VALUES ($1, $2, $3)",
            [newId, stationName, "AUTO-GEN"],
          );
          stationRow = { id: newId };
        }
        await client.query(
          "INSERT INTO route_stations (route_id, station_id, sequence_order) VALUES ($1, $2, $3)",
          [route.id, stationRow.id, seq++],
        );
      }
      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      client.release();
    }
    return { success: true, stationCount: extractedStations.length };
  } catch (e) {
    return { error: e.message };
  }
}

export async function importStationsFromGeoJSON(geojson) {
  if (!geojson || !geojson.features) return { error: "Invalid GeoJSON" };
  let count = 0;
  for (const feature of geojson.features) {
    if (feature.geometry?.type === "Point" && feature.properties) {
      const p = feature.properties;
      const name = p.name || p.Name || p.nama || "";
      if (!name) continue;
      let id =
        p["railway:ref"] ||
        p.ref ||
        p.id ||
        name
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, "")
          .substring(0, 5);
      const [lon, lat] = feature.geometry.coordinates;
      await addStation({
        id,
        name,
        city: p.city || name,
        latitude: lat,
        longitude: lon,
        ...p,
      });
      count++;
    }
  }
  return { success: true, count };
}

export async function seedStationsFromGeoJSON() {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const masterPath = path.join(
      process.cwd(),
      "public",
      "geojson",
      "stations_master.geojson",
    );
    const data = await fs.readFile(masterPath, "utf8");
    return await importStationsFromGeoJSON(JSON.parse(data));
  } catch (e) {
    return { error: e.message };
  }
}
export async function getUnits() {
  try {
    return await getAll("SELECT * FROM units ORDER BY name");
  } catch (e) {
    console.error("[PIDS-DB] getUnits error:", e.message);
    return [];
  }
}

export async function addUnit(data) {
  try {
    const { id, name, type, active } = data;
    if (!id || !name || !type)
      throw new Error("Unit id, name, and type are required");
    await query(
      `INSERT INTO units (id, name, type, active)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             type = EXCLUDED.type,
             active = EXCLUDED.active`,
      [id, name, type, active !== false ? 1 : 0],
    );
    return { success: true, units: await getUnits() };
  } catch (e) {
    return { error: e.message };
  }
}

export async function updateUnit(id, data) {
  return await addUnit({ ...data, id: data.id || id });
}

export async function deleteUnit(id) {
  try {
    await query("DELETE FROM units WHERE id = $1", [id]);
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}
export async function addUser(data) {
  try {
    const id = crypto.randomUUID();
    const hashedPw = hashPassword(data.password);
    await query(
      "INSERT INTO users (id, username, password, role, full_name) VALUES ($1, $2, $3, $4, $5)",
      [
        id,
        data.username,
        hashedPw,
        data.role || "Operator",
        data.full_name || data.nama || "",
      ],
    );
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}
export async function deleteUser(id) {
  try {
    await query("DELETE FROM users WHERE id = $1", [id]);
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}
export function getTrainNumbers() {
  return ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10"];
}
export async function getSensors(id) {
  try {
    if (id) {
      return await getAll(
        "SELECT * FROM sensors WHERE coach_id = $1 ORDER BY device_name",
        [id],
      );
    }
    return await getAll("SELECT * FROM sensors ORDER BY device_name");
  } catch (e) {
    console.error("[PIDS-DB] getSensors error:", e.message);
    return [];
  }
}

export async function getSensorData(id) {
  try {
    if (!id)
      return await getAll(
        "SELECT * FROM sensor_readings ORDER BY recorded_at DESC LIMIT 100",
      );
    return await getAll(
      `SELECT sr.*
             FROM sensor_readings sr
             WHERE sr.sensor_id = $1
             ORDER BY sr.recorded_at DESC
             LIMIT 100`,
      [id],
    );
  } catch (e) {
    console.error("[PIDS-DB] getSensorData error:", e.message);
    return [];
  }
}

export async function getLogMaintenance() {
  try {
    return await getAll(
      "SELECT * FROM maintenance_logs ORDER BY started_at DESC",
    );
  } catch (e) {
    console.error("[PIDS-DB] getLogMaintenance error:", e.message);
    return [];
  }
}

export async function addLogMaintenance(data) {
  try {
    const id = data.id || crypto.randomUUID();
    await query(
      `INSERT INTO maintenance_logs (id, started_at, finished_at, status, priority, description, train_service_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             ON CONFLICT (id) DO UPDATE SET
             started_at = EXCLUDED.started_at,
             finished_at = EXCLUDED.finished_at,
             status = EXCLUDED.status,
             priority = EXCLUDED.priority,
             description = EXCLUDED.description,
             train_service_id = EXCLUDED.train_service_id`,
      [
        id,
        data.started_at || new Date().toISOString(),
        data.finished_at || "",
        data.status || "Open",
        data.priority || "Medium",
        data.description || "",
        data.train_service_id || 0,
      ],
    );
    return { success: true, logs: await getLogMaintenance() };
  } catch (e) {
    return { error: e.message };
  }
}

export async function updateLogMaintenance(id, data) {
  return await addLogMaintenance({ ...data, id: data.id || id });
}

export async function getLogOperasional() {
  try {
    return await getAll(
      "SELECT * FROM operational_logs ORDER BY logged_at DESC",
    );
  } catch (e) {
    console.error("[PIDS-DB] getLogOperasional error:", e.message);
    return [];
  }
}

export async function addLogOperasional(data) {
  try {
    const id = data.id || crypto.randomUUID();
    await query(
      `INSERT INTO operational_logs (id, logged_at, notes, train_service_id, schedule_id)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO UPDATE SET
             logged_at = EXCLUDED.logged_at,
             notes = EXCLUDED.notes,
             train_service_id = EXCLUDED.train_service_id,
             schedule_id = EXCLUDED.schedule_id`,
      [
        id,
        data.logged_at || new Date().toISOString(),
        data.notes || "",
        data.train_service_id || 0,
        data.schedule_id ?? null,
      ],
    );
    return { success: true };
  } catch (e) {
    return { error: e.message };
  }
}
export async function getGpsFleet() {
  try {
    return await getAll(
      "SELECT id as train_service_id, name as service_name, train_number, class, coach_count FROM train_services ORDER BY train_number",
    );
  } catch (e) {
    console.error("[PIDS-DB] getGpsFleet error:", e.message);
    return [];
  }
}
export async function getGpsGerbong(trainServiceId) {
  try {
    const state = await getState();
    const simGps = state.simGps || { lng: 107.6098, lat: -6.9147, heading: 0 };
    
    const coaches = await getAll(
      "SELECT id, name, sequence_number, ip_address FROM coaches WHERE train_service_id = $1 ORDER BY sequence_number",
      [trainServiceId],
    );
    return coaches.map((c) => ({
      coach_id: c.id,
      coach_name: c.name,
      sequence_number: c.sequence_number,
      ip_address: c.ip_address,
      latitude: simGps.lat,
      longitude: simGps.lng,
      speed: state.speed || 0,
      temperature: state.temperature || 24,
      poi: getStationName(state.currentStation),
      sensor_status: "Active",
      heading: simGps.heading
    }));
  } catch (e) {
    console.error("[PIDS-DB] getGpsGerbong error:", e.message);
    return [];
  }
}
