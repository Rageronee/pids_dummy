/**
 * add_progo_route.js
 * Script to add KA Progo schedule and GeoJSON to the PIDS Dummy system.
 */

import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env
dotenv.config({ path: path.join(__dirname, '..', 'Eltran-PIDS-Dummy', 'packages', 'master-app', '.env') });

const { Pool } = pg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL
});

const STATIONS_COORDINATES = {
    "LEMPUYANGAN": { lat: -7.790278, lng: 110.375556 },
    "YOGYAKARTA": { lat: -7.789167, lng: 110.363611 },
    "PATUKAN": { lat: -7.788333, lng: 110.325278 },
    "REWULU": { lat: -7.792778, lng: 110.291389 },
    "SENTOLO": { lat: -7.828056, lng: 110.220556 },
    "WATES": { lat: -7.859444, lng: 110.157778 },
    "KEDUNDANG": { lat: -7.880833, lng: 110.094167 },
    "WOJO": { lat: -7.888333, lng: 110.060556 },
    "JENAR": { lat: -7.895556, lng: 109.98 },
    "KUTOARJO": { lat: -7.726111, lng: 109.907222 },
    "BUTUH": { lat: -7.755556, lng: 109.855833 },
    "PREMBUN": { lat: -7.724444, lng: 109.776944 },
    "KUTOWINANGUN": { lat: -7.709444, lng: 109.724444 },
    "WONOSARI": { lat: -7.674444, lng: 109.654167 },
    "KEBUMEN": { lat: -7.681944, lng: 109.661944 },
    "SRUWENG": { lat: -7.664444, lng: 109.626944 },
    "KARANGANYAR": { lat: -7.633333, lng: 109.583333 },
    "GOMBONG": { lat: -7.608333, lng: 109.516667 },
    "IJO": { lat: -7.631667, lng: 109.444444 },
    "TAMBAK": { lat: -7.603889, lng: 109.402778 },
    "SUMPIUH": { lat: -7.61, lng: 109.358889 },
    "KEMRANJEN": { lat: -7.61, lng: 109.311111 },
    "KROYA": { lat: -7.63, lng: 109.245556 },
    "RANDEGAN": { lat: -7.575556, lng: 109.273611 },
    "KEBASEN": { lat: -7.525556, lng: 109.223889 },
    "NOTOG": { lat: -7.47, lng: 109.213611 },
    "PURWOKERTO": { lat: -7.419167, lng: 109.221944 },
    "KARANGGANDUL": { lat: -7.420, lng: 109.130 },
    "KARANGSARI (BANYUMAS)": { lat: -7.3, lng: 109.15 },
    "LEGOK": { lat: -7.25, lng: 109.1 },
    "PATUGURAN": { lat: -7.2, lng: 109.05 },
    "KRETEK": { lat: -7.153611, lng: 109.013611 },
    "BUMIAYU": { lat: -7.235, lng: 109.008 },
    "LINGGAPURA": { lat: -7.15, lng: 108.983611 },
    "PRUPUK": { lat: -7.125, lng: 108.989 },
    "SONGGOM": { lat: -7.02, lng: 108.983611 },
    "LARANGAN (BREBES)": { lat: -6.98, lng: 108.95 },
    "KETANGGUNGAN": { lat: -6.938, lng: 108.884 },
    "CILEDUG": { lat: -6.953, lng: 108.777 },
    "SINDANGLAUT": { lat: -6.815, lng: 108.583 },
    "LUWUNG": { lat: -6.78, lng: 108.6 },
    "CIREBON PRUJAKAN": { lat: -6.719444, lng: 108.558611 },
    "CIREBON": { lat: -6.705556, lng: 108.555556 },
    "CANGKRING": { lat: -6.68, lng: 108.52 },
    "BANGODUWA": { lat: -6.65, lng: 108.48 },
    "ARJAWINANGUN": { lat: -6.641, lng: 108.411 },
    "KERTASEMAYA": { lat: -6.55, lng: 108.35 },
    "JATIBARANG": { lat: -6.473, lng: 108.306 },
    "TELAGASARI": { lat: -6.45, lng: 108.28 },
    "TERISI": { lat: -6.444, lng: 108.213 },
    "KADOKANGABUS": { lat: -6.43, lng: 108.18 },
    "CILEGEH": { lat: -6.42, lng: 108.12 },
    "HAURGEULIS": { lat: -6.471, lng: 107.953 },
    "CIPUNEGARA": { lat: -6.41, lng: 107.9 },
    "PEGADEN BARU": { lat: -6.406, lng: 107.843 },
    "CIKAUM": { lat: -6.39, lng: 107.8 },
    "PASIRBUNGUR": { lat: -6.38, lng: 107.75 },
    "PRINGKASAP": { lat: -6.37, lng: 107.7 },
    "PABUARAN": { lat: -6.36, lng: 107.65 },
    "TANJUNGRASA": { lat: -6.35, lng: 107.6 },
    "CIKAMPEK": { lat: -6.406, lng: 107.459 },
    "DAWUAN": { lat: -6.38, lng: 107.4 },
    "KOSAMBI": { lat: -6.37, lng: 107.35 },
    "KLARI": { lat: -6.36, lng: 107.32 },
    "KARAWANG": { lat: -6.305, lng: 107.3 },
    "KEDUNGGEDEH": { lat: -6.28, lng: 107.25 },
    "LEMAHABANG": { lat: -6.273, lng: 107.173 },
    "CIKARANG": { lat: -6.255, lng: 107.145 },
    "METLAND TELAGA MURNI": { lat: -6.26, lng: 107.1 },
    "CIBITUNG": { lat: -6.25, lng: 107.08 },
    "TAMBUN": { lat: -6.243, lng: 107.05 },
    "BEKASI TIMUR": { lat: -6.24, lng: 107.02 },
    "BEKASI": { lat: -6.236, lng: 107.0 },
    "JATINEGARA": { lat: -6.215, lng: 106.87 },
    "PONDOK JATI": { lat: -6.21, lng: 106.86 },
    "KRAMAT": { lat: -6.19, lng: 106.85 },
    "GANG SENTIONG": { lat: -6.18, lng: 106.845 },
    "PASAR SENEN": { lat: -6.174, lng: 106.844 }
};

async function addProgo() {
    console.log("Starting Progo data addition...");
    try {
        const content = fs.readFileSync('KA Progo.txt', 'utf8');
        const lines = content.split('\n');

        const trainSchedules = {
            "257B": { name: "Progo: Lempuyangan - Pasar Senen", stops: [] },
            "258B": { name: "Progo: Pasar Senen - Lempuyangan", stops: [] }
        };

        let currentKA = "";

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.includes("KA 257B")) currentKA = "257B";
            if (line.includes("KA 258B")) currentKA = "258B";
            if (!currentKA) continue;

            const arrMatch = line.match(/Arr (\d{2}:\d{2}:\d{2})/);
            const depMatch = line.match(/Dep (\d{2}:\d{2}:\d{2})/);

            if (arrMatch || depMatch) {
                const time = arrMatch ? arrMatch[1] : depMatch[1];
                const type = arrMatch ? "arrival" : "departure";
                
                let stnName = "";
                for (let j = i - 1; j > i - 5; j--) {
                    if (j < 0) break;
                    const prevLine = lines[j].trim();
                    if (prevLine && !prevLine.match(/Arr|Dep|Transit|Origin|Destination|Train Number|OPERATIONAL|PSE-LPN|LPN-PSE/)) {
                        stnName = prevLine;
                        break;
                    }
                }

                if (stnName) {
                    let stop = trainSchedules[currentKA].stops.find(s => s.name === stnName);
                    if (!stop) {
                        stop = { name: stnName, arrival: "", departure: "" };
                        trainSchedules[currentKA].stops.push(stop);
                    }
                    stop[type] = time;
                }
            }
        }

        // 1. Upsert Stations
        console.log("Upserting stations...");
        const allStations = new Set();
        Object.values(trainSchedules).forEach(ts => ts.stops.forEach(s => allStations.add(s.name)));

        for (const stnName of allStations) {
            const upperName = stnName.toUpperCase();
            const coord = STATIONS_COORDINATES[upperName] || { lat: 0, lng: 0 };
            const id = upperName.replace(/\s+/g, '_');

            await pool.query(
                `INSERT INTO stations (id, name, city, latitude, longitude)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (id) DO UPDATE SET
                 latitude = EXCLUDED.latitude,
                 longitude = EXCLUDED.longitude`,
                [id, stnName, "", coord.lat, coord.lng]
            );
        }

        // 2. Insert Unified Train Service
        console.log("Inserting unified train service...");
        const resService = await pool.query(
            `INSERT INTO train_services (name, train_number, class, coach_count)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (name) DO UPDATE SET train_number = EXCLUDED.train_number
             RETURNING id`,
            ["KA Progo", "257B", "Ekonomi", 8]
        );
        const serviceId = resService.rows[0].id;

        // 3. Insert Routes & Route Stations
        console.log("Inserting routes...");
        await pool.query(`ALTER TABLE routes ADD COLUMN IF NOT EXISTS name TEXT`);
        await pool.query(`ALTER TABLE routes ADD CONSTRAINT uq_route_name UNIQUE (name)`).catch(() => { });

        const scheduleIds = {};
        for (const [num, data] of Object.entries(trainSchedules)) {
            const direction = num === "257B" ? "GO" : "BACK";
            const resRoute = await pool.query(
                `INSERT INTO routes (name, train_service_id, direction, geojson_filename)
                 VALUES ($1, $2, $3, $4)
                 ON CONFLICT (name) DO UPDATE SET direction = EXCLUDED.direction
                 RETURNING id`,
                [data.name, serviceId, direction, "Progo/Progo.geojson"]
            );
            const routeId = resRoute.rows[0].id;

            await pool.query(`DELETE FROM route_stations WHERE route_id = $1`, [routeId]);

            for (let i = 0; i < data.stops.length; i++) {
                const stop = data.stops[i];
                const stationId = stop.name.toUpperCase().replace(/\s+/g, '_');
                await pool.query(
                    `INSERT INTO route_stations (route_id, station_id, sequence_order, stop_type)
                     VALUES ($1, $2, $3, $4)`,
                    [routeId, stationId, i + 1, i === 0 ? 'origin' : (i === data.stops.length - 1 ? 'destination' : 'intermediate')]
                );
            }

            // Create a default schedule
            await pool.query(`ALTER TABLE schedules ADD COLUMN IF NOT EXISTS train_service_id INTEGER`);
            await pool.query(`ALTER TABLE schedules ADD COLUMN IF NOT EXISTS trainset_id INTEGER`);
            
            const firstStop = data.stops[0];
            const lastStop = data.stops[data.stops.length - 1];
            const today = new Date().toISOString().split('T')[0];

            const resSched = await pool.query(
                `INSERT INTO schedules (
                    route_id, train_service_id, service_name, train_number, 
                    status, schedule_date, scheduled_departure,
                    departure_station, arrival_station, departure_city_code, arrival_city_code
                 )
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                 ON CONFLICT (service_name, train_number, schedule_date, scheduled_departure) 
                 DO UPDATE SET 
                    route_id = EXCLUDED.route_id,
                    train_service_id = EXCLUDED.train_service_id,
                    status = EXCLUDED.status
                 RETURNING id`,
                [
                    routeId, serviceId, "KA Progo", num, 
                    "ON_TIME", today, firstStop ? (firstStop.departure || firstStop.arrival) : "",
                    firstStop?.name || "", lastStop?.name || "",
                    (firstStop?.name || "").substring(0, 3).toUpperCase(), (lastStop?.name || "").substring(0, 3).toUpperCase()
                ]
            );
            scheduleIds[num] = resSched.rows[0].id;
        }

        // 4. Create GeoJSON
        console.log("Creating GeoJSON...");
        const geojsonDir = path.join(__dirname, '..', 'Eltran-PIDS-Dummy', 'packages', 'master-app', 'public', 'geojson', 'Progo');
        if (!fs.existsSync(geojsonDir)) fs.mkdirSync(geojsonDir, { recursive: true });

        const routeStops = trainSchedules["257B"].stops;
        const stationsList = routeStops.map(s => s.name);
        const features = [];

        const coords = routeStops.map(s => {
            const c = STATIONS_COORDINATES[s.name.toUpperCase()] || { lat: 0, lng: 0 };
            return [c.lng, c.lat];
        }).filter(c => c[0] !== 0);

        features.push({
            type: "Feature",
            properties: {
                name: "Progo Route",
                ref: "Progo",
                from: stationsList[0],
                to: stationsList[stationsList.length - 1],
                colour: "blue",
                available_directions: [
                    { num: "257B", label: "KA 257B (LPN -> PSE)" },
                    { num: "258B", label: "KA 258B (PSE -> LPN)" }
                ],
                ka257b_active: true,
                ka258b_active: true
            },
            geometry: {
                type: "LineString",
                coordinates: coords
            }
        });

        routeStops.forEach(s => {
            const c = STATIONS_COORDINATES[s.name.toUpperCase()] || { lat: 0, lng: 0 };
            const stop258 = trainSchedules["258B"].stops.find(st => st.name === s.name);
            
            features.push({
                type: "Feature",
                properties: {
                    name: s.name,
                    railway: "stop",
                    isCheckpoint: true,
                    role: "stop",
                    schedule_ka257b: s.departure || s.arrival,
                    schedule_ka258b: stop258 ? (stop258.departure || stop258.arrival) : ""
                },
                geometry: {
                    type: "Point",
                    coordinates: [c.lng, c.lat]
                }
            });
        });

        const geojson = {
            type: "FeatureCollection",
            stations: stationsList,
            features: features
        };

        fs.writeFileSync(path.join(geojsonDir, 'Progo.geojson'), JSON.stringify(geojson, null, 2));

        console.log("Progo data addition completed successfully!");
    } catch (err) {
        console.error("Error adding Progo data:", err);
    } finally {
        await pool.end();
    }
}

addProgo();
