/**
 * PIDS KAI — API Server with Socket.IO Real-time Sync
 * Refactored from JSON flat-file to SQLite database.
 * Socket.IO replaces HTTP polling for instant state synchronization.
 */
import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import {
    initDatabase, startAutoSave,
    getState, updateState,
    getLogs, writeLog,
    findUser, getUsers as dbGetUsers, addUser, deleteUser,
    getTrainNames, getTrainNumbers, addTrainName, deleteTrainName,
    getRoutes, saveRoute, deleteRoute,
    getUnits, addUnit, updateUnit, deleteUnit,
    getStations, addStation, updateStation, deleteStation,
    getSchedules, addSchedule, updateSchedule, deleteSchedule,
    getGerbong, addGerbong, deleteGerbong,
    getSensors, getSensorData,
    getLogMaintenance, addLogMaintenance, updateLogMaintenance,
    getLogOperasional, addLogOperasional,
    getGpsFleet, getGpsGerbong,
    getDbDump,
    closeDatabase,
    updateRouteGeoJSON
} from './database.js';

export async function startApiServer() {
    // --- Initialize Database (async for sql.js) ---
    await initDatabase();
    startAutoSave();

    const apiApp = express();
    const httpServer = createServer(apiApp);

    // --- Socket.IO Server ---
    const io = new SocketIOServer(httpServer, {
        cors: { origin: '*', methods: ['GET', 'POST'] },
    });

    apiApp.use(cors());
    apiApp.use(express.json({ limit: '50mb' }));

    // --- IN-MEMORY SESSIONS: token -> user ---
    const sessions = new Map();

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

    // ========================================
    // Socket.IO CONNECTION HANDLING
    // ========================================

    io.on('connection', (socket) => {
        console.log(`[Socket.IO] Client connected: ${socket.id}`);

        // Send current state on connect
        socket.emit('state:update', getState());

        socket.on('disconnect', () => {
            console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
        });
    });

    // Helper: broadcast state to all connected clients
    const broadcastState = () => {
        io.emit('state:update', getState());
    };

    const broadcastDbUpdate = () => {
        io.emit('db:update', { trainNames: getTrainNames(), routes: getRoutes() });
    };

    // ========================================
    // AUTH ENDPOINTS
    // ========================================

    // POST /api/auth/login
    apiApp.post('/api/auth/login', (req, res) => {
        const { username, password } = req.body;
        const user = findUser(username, password);
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
        res.json(getState());
    });

    // POST /api/state
    apiApp.post('/api/state', (req, res) => {
        const updates = { ...req.body };
        if (updates.stations && (!Array.isArray(updates.stations) || updates.stations.length === 0)) {
            delete updates.stations;
        }

        const prevState = getState();
        const newState = updateState(updates);

        // Log meaningful state changes (not telemetry noise)
        const user = getSessionUser(req);
        const username = user?.username || 'system';
        const role = user?.role || 'System';

        if (updates.serviceName && updates.serviceName !== prevState.serviceName) {
            writeLog({ action: 'STATE_UPDATE', user: username, role, details: `Nama Kereta (Service) diubah: ${prevState.serviceName} → ${updates.serviceName}` });
        }
        if (updates.currentStation && updates.currentStation !== prevState.currentStation) {
            writeLog({ action: 'STATE_UPDATE', user: username, role, details: `Posisi stasiun diperbarui: ${prevState.currentStation} → ${updates.currentStation}` });
        }
        if (updates.trainNumber && updates.trainNumber !== prevState.trainNumber) {
            writeLog({ action: 'STATE_UPDATE', user: username, role, details: `Nomor kereta diubah: ${prevState.trainNumber} → ${updates.trainNumber}` });
        }
        if (updates.nextStation && updates.nextStation !== prevState.nextStation) {
            writeLog({ action: 'STATE_UPDATE', user: username, role, details: `Stasiun berikutnya diperbarui: ${updates.nextStation}` });
        }
        if (updates.displayMode && updates.displayMode !== prevState.displayMode) {
            writeLog({ action: 'DISPLAY_MODE', user: username, role, details: `Mode display diubah ke: ${updates.displayMode?.toUpperCase()}` });
        }
        if (updates.ledSpeed !== undefined && updates.ledSpeed !== prevState.ledSpeed) {
            writeLog({ action: 'LED_CONFIG', user: username, role, details: `Kecepatan LED diubah: ${prevState.ledSpeed}ms → ${updates.ledSpeed}ms` });
        }

        // Broadcast to all connected clients via Socket.IO
        broadcastState();

        res.json({ success: true, state: newState });
    });

    // GET /api/db (backward compatible — returns full DB dump)
    apiApp.get('/api/db', (req, res) => {
        try {
            res.json({ success: true, data: getDbDump() });
        } catch (e) {
            res.status(500).json({ success: false, error: 'Database read failed' });
        }
    });

    // ========================================
    // STATIONS CRUD (expanded per SRS)
    // ========================================

    apiApp.get('/api/stations', (req, res) => {
        res.json({ success: true, stations: getStations() });
    });

    apiApp.post('/api/admin/stations', requireAdmin, (req, res) => {
        const { id, name, city, latitude, longitude, ip_address, nama_pic, kontak_pic, kode_kota, alamat, provinsi, kabupaten_kota, kecamatan, kelurahan_desa, kode_pos } = req.body;
        if (!id || !name || !city) return res.status(400).json({ success: false, error: 'id, name, dan city wajib diisi' });
        const result = addStation({ id, name, city, latitude, longitude, ip_address, nama_pic, kontak_pic, kode_kota, alamat, provinsi, kabupaten_kota, kecamatan, kelurahan_desa, kode_pos });
        if (result.error) return res.status(409).json({ success: false, error: result.error });
        writeLog({ action: 'ADMIN_CRUD', user: req.user.username, role: req.user.role, details: `Stasiun baru ditambahkan: ${name} (${id})` });
        res.json({ success: true, station: result.station });
    });

    apiApp.put('/api/admin/stations/:id', requireAdmin, (req, res) => {
        const result = updateStation(req.params.id, req.body);
        if (result.error) return res.status(404).json({ success: false, error: result.error });
        writeLog({ action: 'ADMIN_CRUD', user: req.user.username, role: req.user.role, details: `Stasiun diperbarui: ${req.params.id}` });
        res.json({ success: true, station: result.station });
    });

    apiApp.delete('/api/admin/stations/:id', requireAdmin, (req, res) => {
        const result = deleteStation(req.params.id);
        if (result.error) return res.status(404).json({ success: false, error: result.error });
        writeLog({ action: 'ADMIN_CRUD', user: req.user.username, role: req.user.role, details: `Stasiun dihapus: ${result.station.name} (${req.params.id})` });
        res.json({ success: true });
    });

    // ========================================
    // SCHEDULES CRUD
    // ========================================

    apiApp.get('/api/schedules', (req, res) => {
        res.json({ success: true, schedules: getSchedules() });
    });

    apiApp.post('/api/admin/schedules', requireAdmin, (req, res) => {
        const { route_id, schedule_date, status, notes, stops } = req.body;
        if (!route_id) return res.status(400).json({ success: false, error: 'route_id wajib diisi' });
        const result = addSchedule({ route_id, schedule_date, status, notes, stops });
        writeLog({ action: 'ADMIN_CRUD', user: req.user.username, role: req.user.role, details: `Jadwal baru ditambahkan untuk route ${route_id}` });
        res.json({ success: true, id: result.id });
    });

    apiApp.put('/api/admin/schedules/:id', requireAdmin, (req, res) => {
        const result = updateSchedule(parseInt(req.params.id), req.body);
        if (result.error) return res.status(404).json({ success: false, error: result.error });
        writeLog({ action: 'ADMIN_CRUD', user: req.user.username, role: req.user.role, details: `Jadwal diperbarui: ID ${req.params.id}` });
        res.json({ success: true });
    });

    apiApp.delete('/api/admin/schedules/:id', requireAdmin, (req, res) => {
        const result = deleteSchedule(parseInt(req.params.id));
        if (result.error) return res.status(404).json({ success: false, error: result.error });
        writeLog({ action: 'ADMIN_CRUD', user: req.user.username, role: req.user.role, details: `Jadwal dihapus: ID ${req.params.id}` });
        res.json({ success: true });
    });

    // ========================================
    // GPS FLEET & PER-GERBONG
    // ========================================

    apiApp.get('/api/gps/fleet', (req, res) => {
        res.json({ success: true, fleet: getGpsFleet() });
    });

    apiApp.get('/api/gps/gerbong/:keretaId', (req, res) => {
        res.json({ success: true, gerbong: getGpsGerbong(parseInt(req.params.keretaId)) });
    });

    // ========================================
    // GERBONG, SENSOR, MAINTENANCE, OPERASIONAL
    // ========================================

    apiApp.get('/api/gerbong', (req, res) => {
        const { kereta_id } = req.query;
        res.json({ success: true, gerbong: getGerbong(kereta_id ? parseInt(kereta_id) : null) });
    });

    apiApp.get('/api/sensor', (req, res) => {
        const { gerbong_id } = req.query;
        res.json({ success: true, sensors: getSensors(gerbong_id || null) });
    });

    apiApp.get('/api/maintenance', (req, res) => {
        res.json({ success: true, maintenance: getLogMaintenance() });
    });

    apiApp.post('/api/admin/maintenance', requireAdmin, (req, res) => {
        const result = addLogMaintenance(req.body);
        writeLog({ action: 'ADMIN_CRUD', user: req.user.username, role: req.user.role, details: `Log maintenance ditambahkan: ${req.body.deskripsi || '-'}` });
        res.json(result);
    });

    apiApp.get('/api/operasional', (req, res) => {
        res.json({ success: true, operasional: getLogOperasional() });
    });

    // ========================================
    // LOGGING ENDPOINTS
    // ========================================

    // GET /api/logs
    apiApp.get('/api/logs', (req, res) => {
        const { limit, action } = req.query;
        const filter = {};
        if (action) filter.action = action;
        if (limit) filter.limit = parseInt(limit);
        const logs = getLogs(filter);
        res.json({ success: true, logs, total: logs.length });
    });

    // POST /api/logs
    apiApp.post('/api/logs', (req, res) => {
        const { action, user, role, details, data } = req.body;
        if (!action || !user) return res.status(400).json({ success: false, error: 'action and user are required' });
        writeLog({ action, user, role: role || 'System', details: details || '', data });
        res.json({ success: true });
    });

    // ========================================
    // ADMIN ENDPOINTS
    // ========================================

    // GET /api/admin/status
    apiApp.get('/api/admin/status', requireAuth, (req, res) => {
        const logs = getLogs({ limit: 1 });
        res.json({
            success: true,
            status: {
                uptime: process.uptime(),
                currentState: getState(),
                totalLogs: getLogs({}).length,
                lastLog: logs[0] || null,
                activeSessions: sessions.size,
                serverTime: new Date().toISOString(),
            },
        });
    });

    // --- USER MANAGEMENT ---
    apiApp.get('/api/admin/users', requireAdmin, (req, res) => {
        res.json({ success: true, users: dbGetUsers() });
    });

    apiApp.post('/api/admin/users', requireAdmin, (req, res) => {
        const { username, password, role, nama } = req.body;
        if (!username || !password || !role || !nama) return res.status(400).json({ success: false, error: 'All fields required (username, password, role, nama)' });
        const result = addUser({ username, password, role, nama });
        if (result.error) return res.status(409).json({ success: false, error: result.error });
        writeLog({ action: 'ADMIN_CRUD', user: req.user.username, role: req.user.role, details: `User baru ditambahkan: ${nama} (${role})` });
        res.json({ success: true, user: result });
    });

    apiApp.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
        const id = req.params.id;
        if (id === req.user.id) return res.status(400).json({ success: false, error: 'Cannot delete yourself' });
        const result = deleteUser(id);
        if (result.error) return res.status(404).json({ success: false, error: result.error });
        // Invalidate sessions for deleted user
        for (const [token, sessionUser] of sessions.entries()) {
            if (sessionUser.id === id) sessions.delete(token);
        }
        writeLog({ action: 'ADMIN_CRUD', user: req.user.username, role: req.user.role, details: `User dihapus: ${result.user.nama} (${result.user.role})` });
        res.json({ success: true });
    });

    // --- TRAIN MANAGEMENT ---
    apiApp.get('/api/admin/trains', requireAdmin, (req, res) => {
        res.json({ success: true, trains: getTrainNames(), trainNumbers: getTrainNumbers() });
    });

    apiApp.post('/api/admin/trains', requireAdmin, (req, res) => {
        const { name } = req.body;
        if (!name || typeof name !== 'string') return res.status(400).json({ success: false, error: 'name required' });
        const result = addTrainName(name);
        if (result.error) return res.status(409).json({ success: false, error: result.error });
        writeLog({ action: 'ADMIN_CRUD', user: req.user.username, role: req.user.role, details: `Kereta baru ditambahkan: ${name.trim().toUpperCase()}` });
        broadcastDbUpdate();
        res.json({ success: true, trains: result.trains });
    });

    apiApp.delete('/api/admin/trains/:name', requireAdmin, (req, res) => {
        const name = decodeURIComponent(req.params.name).toUpperCase();
        const result = deleteTrainName(name);
        if (result.error) return res.status(404).json({ success: false, error: result.error });
        writeLog({ action: 'ADMIN_CRUD', user: req.user.username, role: req.user.role, details: `Kereta dihapus: ${name}` });
        broadcastDbUpdate();
        res.json({ success: true, trains: result.trains });
    });

    // --- ROUTE MANAGEMENT ---
    apiApp.get('/api/admin/routes', requireAdmin, (req, res) => {
        res.json({ success: true, routes: getRoutes() });
    });

    apiApp.post('/api/admin/routes', requireAdmin, (req, res) => {
        const { name, stations } = req.body;
        if (!name || !Array.isArray(stations) || stations.length < 2) {
            return res.status(400).json({ success: false, error: 'name dan stations (min 2) diperlukan' });
        }
        const route = saveRoute(name, stations);
        const isNew = !getRoutes()[name.trim().toUpperCase()];
        writeLog({ action: 'ADMIN_CRUD', user: req.user.username, role: req.user.role, details: `Rute ${isNew ? 'ditambahkan' : 'diperbarui'}: ${name.trim().toUpperCase()} (${stations.length} stasiun)` });
        broadcastDbUpdate();
        res.json({ success: true, route });
    });

    apiApp.delete('/api/admin/routes/:name', requireAdmin, (req, res) => {
        const name = decodeURIComponent(req.params.name).toUpperCase();
        const result = deleteRoute(name);
        if (result.error) return res.status(404).json({ success: false, error: result.error });
        writeLog({ action: 'ADMIN_CRUD', user: req.user.username, role: req.user.role, details: `Rute dihapus: ${name}` });
        broadcastDbUpdate();
        res.json({ success: true });
    });

    apiApp.post('/api/admin/routes/:name/geojson', requireAuth, (req, res) => {
        const name = decodeURIComponent(req.params.name).toUpperCase();
        const { geojson } = req.body;
        if (!geojson) return res.status(400).json({ success: false, error: 'geojson required' });

        const geojsonString = typeof geojson === 'string' ? geojson : JSON.stringify(geojson);

        const result = updateRouteGeoJSON(name, geojsonString);
        if (result.error) return res.status(404).json({ success: false, error: result.error });
        writeLog({ action: 'ADMIN_CRUD', user: req.user.username, role: req.user.role, details: `GeoJSON di-update untuk rute: ${name}` });
        broadcastDbUpdate();
        broadcastState(); // Also broadcast state so map + navigation update immediately
        res.json({ success: true });
    });

    // --- UNIT (STAMPFORMASI) MANAGEMENT ---
    apiApp.get('/api/admin/units', requireAuth, (req, res) => {
        res.json({ success: true, units: getUnits() });
    });

    apiApp.post('/api/admin/units', requireAdmin, (req, res) => {
        const { id, name, type, active } = req.body;
        if (!name || !type) return res.status(400).json({ success: false, error: 'name and type required' });

        let units;
        if (id) {
            units = updateUnit(id, { name, type, active });
            writeLog({ action: 'ADMIN_CRUD', user: req.user.username, role: req.user.role, details: `Unit diperbarui: ${name.trim().toUpperCase()}` });
        } else {
            units = addUnit({ name, type, active: active !== undefined ? active : true });
            writeLog({ action: 'ADMIN_CRUD', user: req.user.username, role: req.user.role, details: `Unit baru ditambahkan: ${name.trim().toUpperCase()}` });
        }

        res.json({ success: true, units });
    });

    apiApp.delete('/api/admin/units/:id', requireAdmin, (req, res) => {
        const unitId = req.params.id;
        const result = deleteUnit(unitId);
        if (result.error) return res.status(404).json({ success: false, error: result.error });
        writeLog({ action: 'ADMIN_CRUD', user: req.user.username, role: req.user.role, details: `Unit dihapus: ${unitId}` });
        res.json({ success: true });
    });

    // ========================================
    // DUMMY GPS & TELEMETRY API
    // ========================================

    apiApp.get('/api/gps/fleet', (req, res) => {
        // Return dummy fleet data
        res.json({
            success: true,
            fleet: [
                { kereta_id: 1, kereta_name: "ARGO WILIS", ka_number: "05" },
                { kereta_id: 2, kereta_name: "PARAHYANGAN", ka_number: "31" }
            ]
        });
    });

    apiApp.get('/api/gps/gerbong/:kereta_id', (req, res) => {
        // Return dummy gerbong data
        const id = parseInt(req.params.kereta_id);
        const name = id === 1 ? "ARGO WILIS" : "PARAHYANGAN";

        const dummyList = [
            { gerbong_id: 1, nama_gerbong: "EKSEKUTIF 1", no_urut_gerbong: 1, latitude: -6.9147, longitude: 107.6098, altitude: 700.5, kecepatan: 45.3, suhu: 22.1, poi: "Gedung Sate", sensor_status: "Aktif" },
            { gerbong_id: 2, nama_gerbong: "EKSEKUTIF 2", no_urut_gerbong: 2, latitude: -6.9148, longitude: 107.6097, altitude: 700.5, kecepatan: 45.3, suhu: 22.3, poi: "Gedung Sate", sensor_status: "Aktif" },
            { gerbong_id: 3, nama_gerbong: "KERETA MAKAN", no_urut_gerbong: 3, latitude: -6.9149, longitude: 107.6096, altitude: 700.5, kecepatan: 45.3, suhu: 24.5, poi: "Gedung Sate", sensor_status: "Aktif" }
        ];

        res.json({
            success: true,
            kereta_id: id,
            kereta_name: name,
            gerbong: dummyList
        });
    });

    // ========================================
    // GLOBAL ERROR HANDLER (always return JSON, never HTML)
    // ========================================
    apiApp.use((err, req, res, next) => {
        console.error('[PIDS-API] Unhandled error:', err.message || err);
        const status = err.status || err.statusCode || 500;
        res.status(status).json({
            success: false,
            error: err.type === 'entity.too.large'
                ? 'Request body terlalu besar. Kurangi ukuran file GeoJSON.'
                : (err.message || 'Internal server error')
        });
    });

    // ========================================
    // START SERVER
    // ========================================

    const port = 3001;
    httpServer.listen(port, () => {
        console.log(`[PIDS-CORE] Local Core API Gateway running on http://localhost:${port}`);
        console.log(`[PIDS-CORE] Socket.IO real-time sync enabled`);
        writeLog({ action: 'SYSTEM', user: 'system', role: 'System', details: 'PIDS API Server started (SQLite + Socket.IO)' });
    });

    return httpServer;
}
