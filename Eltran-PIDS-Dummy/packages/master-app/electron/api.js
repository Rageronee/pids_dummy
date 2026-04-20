/*
 * api.js — Express + Socket.IO API Gateway for PIDS
 *
 * Responsibilities:
 * - Authentication (token sessions), state updates, admin CRUD, media streaming, backups.
 * - Exports startApiServer() / stopApiServer().
 *
 * Important:
 * - In-memory sessions are used for prototype (replace with Redis or JWT in prod).
 * - CORS origins can be configured via ALLOWED_ORIGINS env (comma-separated).
 * - Media upload endpoint (/api/media/upload) accepts base64 payloads (authenticated).
 */

import express from "express";
import cors from "cors";
import crypto from "crypto";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import {
  initDatabase,
  startAutoSave,
  getState,
  updateState,
  getLogs,
  writeLog,
  findUser,
  getUsers as dbGetUsers,
  addUser,
  deleteUser,
  getTrainNames,
  getTrains,
  addTrain,
  deleteTrain,
  getRoutes,
  saveRoute,
  deleteRoute,
  getUnits,
  addUnit,
  updateUnit,
  deleteUnit,
  getStations,
  addStation,
  updateStation,
  deleteStation,
  getSchedules,
  addSchedule,
  updateSchedule,
  deleteSchedule,
  getGerbong,
  addGerbong,
  deleteGerbong,
  getSensors,
  getSensorData,
  getLogMaintenance,
  addLogMaintenance,
  updateLogMaintenance,
  getLogOperasional,
  addLogOperasional,
  getGpsFleet,
  getGpsGerbong,
  getDbDump,
  listBackups,
  createBackup,
  restoreBackup,
  closeDatabase,
  updateRouteGeoJSON,
  importStationsFromGeoJSON,
} from "./database.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.resolve(__dirname, "..", "public");

let httpServerInstance = null;
let ioInstance = null;
const cleanupTimers = [];

function trackInterval(fn, delay) {
  const timer = setInterval(fn, delay);
  if (typeof timer.unref === "function") timer.unref();
  cleanupTimers.push(timer);
  return timer;
}

export async function stopApiServer() {
  while (cleanupTimers.length > 0) {
    clearInterval(cleanupTimers.pop());
  }

  if (ioInstance) {
    ioInstance.close();
    ioInstance = null;
  }

  if (httpServerInstance) {
    await new Promise((resolve) => {
      httpServerInstance.close(() => resolve());
    }).catch(() => {});
    httpServerInstance = null;
  }
}

export async function startApiServer() {
  await initDatabase();
  startAutoSave();

  const apiApp = express();
  const httpServer = createServer(apiApp);
  httpServerInstance = httpServer;

  const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.VITE_ALLOWED_ORIGINS || "http://localhost:5173,http://localhost:5174,http://localhost:5176").split(",").map((s) => s.trim()).filter(Boolean);

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
  });
  ioInstance = io;

  apiApp.use(cors({ origin: allowedOrigins }));
  apiApp.use(express.json({ limit: "10mb" }));
  const loginAttempts = new Map(); // ip -> { count, resetAt }
  const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
  const RATE_LIMIT_MAX = 5;

  const loginRateLimiter = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || "unknown";
    const now = Date.now();
    const record = loginAttempts.get(ip);
    if (record && now < record.resetAt) {
      if (record.count >= RATE_LIMIT_MAX) {
        return res.status(429).json({
          success: false,
          error: "Terlalu banyak percobaan login. Coba lagi dalam 1 menit.",
        });
      }
      record.count++;
    } else {
      loginAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    }
    next();
  };
  trackInterval(
    () => {
      const now = Date.now();
      for (const [ip, record] of loginAttempts) {
        if (now >= record.resetAt) loginAttempts.delete(ip);
      }
    },
    5 * 60 * 1000,
  );

  let currentVideoDir = path.join(PUBLIC_DIR, "media", "videos");
  let currentAudioDir = path.join(PUBLIC_DIR, "media", "audio");

  const SESSION_TTL = 8 * 60 * 60 * 1000; // 8 hours
  const sessions = new Map(); // token -> { user, expiresAt }
  trackInterval(
    () => {
      const now = Date.now();
      for (const [token, session] of sessions) {
        if (now >= session.expiresAt) sessions.delete(token);
      }
    },
    30 * 60 * 1000,
  );

  const getSessionUser = (req) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7);
    const session = sessions.get(token);
    if (!session) return null;
    if (Date.now() >= session.expiresAt) {
      sessions.delete(token);
      return null;
    }
    return session.user;
  };

  const requireAuth = (req, res, next) => {
    const user = getSessionUser(req);
    if (!user)
      return res.status(401).json({ success: false, error: "Unauthorized" });
    req.user = user;
    next();
  };

  const normalizeRole = (role) => {
    const value = String(role || "")
      .trim()
      .toLowerCase();
    if (value === "admin") return "Admin";
    if (value === "operator") return "Operator";
    return "Operator";
  };

  const ROLE_PERMISSIONS = {
    Admin: new Set(["admin"]),
    Operator: new Set([]),
  };

  const hasPermission = (user, permission) => {
    const role = normalizeRole(user?.role);
    return role === "Admin" || ROLE_PERMISSIONS[role]?.has(permission) === true;
  };

  const requirePermission = (permission) => async (req, res, next) => {
    const user = getSessionUser(req);
    if (!user)
      return res.status(401).json({ success: false, error: "Unauthorized" });
    if (!hasPermission(user, permission)) {
      await writeLog({
        action: "ACCESS_DENIED",
        user: user.username || "unknown",
        role: normalizeRole(user.role),
        details: `Denied ${permission} on ${req.method} ${req.originalUrl}`,
      });
      return res.status(403).json({ success: false, error: "Forbidden" });
    }
    req.user = { ...user, role: normalizeRole(user.role) };
    next();
  };

  const requireAdmin = requirePermission("admin");

  io.on("connection", async (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);
    socket.emit("state:update", await getState());
    socket.on("disconnect", () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  const broadcastState = async () => {
    io.emit("state:update", await getState());
  };

  const broadcastDbUpdate = async () => {
    io.emit("db:update", {
      trainNames: await getTrainNames(),
      routes: await getRoutes(),
    });
  };
  apiApp.post("/api/auth/login", loginRateLimiter, async (req, res) => {
    try {
      const { username, password } = req.body || {};
      if (!username || !password) {
        return res.status(400).json({
          success: false,
          error: "Username and password are required",
        });
      }

      const user = await findUser(username, password);
      if (!user) {
        await writeLog({
          action: "LOGIN_FAILED",
          user: username || "unknown",
          role: "-",
          details: `Percobaan login gagal untuk username: ${username}`,
        });
        return res
          .status(401)
          .json({ success: false, error: "Username atau password salah" });
      }
      const token = crypto.randomUUID();
      const sessionUser = {
        id: user.id,
        username: user.username,
        role: normalizeRole(user.role),
        full_name: user.full_name,
      };
      sessions.set(token, {
        user: sessionUser,
        expiresAt: Date.now() + SESSION_TTL,
      });
      await writeLog({
        action: "LOGIN",
        user: user.username,
        role: user.role,
        details: `${user.full_name} (${user.role}) berhasil login`,
      });
      res.json({ success: true, token, user: sessionUser });
    } catch (err) {
      console.error("[API] Login error:", err);
      res.status(500).json({ success: false, error: "Login failed" });
    }
  });

  apiApp.get("/api/auth/verify", (req, res) => {
    const user = getSessionUser(req);
    if (!user)
      return res
        .status(401)
        .json({ success: false, error: "Token tidak valid" });
    res.json({ success: true, user });
  });

  apiApp.post("/api/auth/logout", requireAuth, async (req, res) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader.slice(7);
    await writeLog({
      action: "LOGOUT",
      user: req.user.username,
      role: req.user.role,
      details: `${req.user.full_name} logout`,
    });
    sessions.delete(token);
    res.json({ success: true });
  });
  apiApp.get("/api/state", async (req, res) => {
    res.json(await getState());
  });

  apiApp.post("/api/state", requireAuth, async (req, res) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {};
      const updates = { ...body };

      const ALLOWED_KEYS = new Set([
        "serviceName",
        "currentStation",
        "trainNumber",
        "nextStation",
        "status",
        "ledSpeed",
        "speed",
        "altitude",
        "temperature",
        "airQuality",
        "displayMode",
        "stations",
        "activeRoute",
        "geofencingInnerRadius",
        "geofencingOuterRadius",
        "showTrainNumber",
        "ledActive",
        "videoPlaylist",
        "activeVideoIndex",
        "isPlaying",
        "playbackProgress",
        "playbackMode",
        "volume",
        "tvStandby",
        "isSyncing",
        "coachCount",
        "jumlahKereta",
        "muteVideo",
        "showTelemetry",
        "showClock",
        "ledType",
      ]);
      for (const key of Object.keys(updates)) {
        if (!ALLOWED_KEYS.has(key)) delete updates[key];
      }
      const prevState = await getState();
      const newState = await updateState(updates);

      const user = getSessionUser(req);
      const username = user?.username || "system";
      const role = user?.role || "System";

      if (
        updates.serviceName &&
        updates.serviceName !== prevState.serviceName
      ) {
        await writeLog({
          action: "STATE_UPDATE",
          user: username,
          role,
          details: `Service diubah: ${updates.serviceName}`,
        });
      }

      await broadcastState();
      res.json({ success: true, state: newState });
    } catch (err) {
      console.error("[API] State update error:", err);
      res.status(500).json({ success: false, error: "State update failed" });
    }
  });

  apiApp.get("/api/db", async (req, res) => {
    try {
      res.json({ success: true, data: await getDbDump() });
    } catch (e) {
      res.status(500).json({ success: false, error: "Database read failed" });
    }
  });

  apiApp.get("/api/health", async (req, res) => {
    res.json({
      success: true,
      status: "ok",
      timestamp: new Date().toISOString(),
    });
  });
  apiApp.get("/api/stations", async (req, res) => {
    const result = await getStations(req.query);
    res.json({ success: true, ...result });
  });
  apiApp.get("/api/stations-master", async (req, res) => {
    try {
      const result = await getStations({});
      const stations = result.stations || [];

      const geojson = {
        type: "FeatureCollection",
        features: stations
          .filter((s) => s.latitude && s.longitude)
          .map((s) => ({
            type: "Feature",
            id: s.id,
            geometry: {
              type: "Point",
              coordinates: [parseFloat(s.longitude), parseFloat(s.latitude)],
            },
            properties: {
              name: s.name,
              city: s.city,
              railway_ref: s.id,
              city_code: s.city_code || "",
              ip_address: s.ip_address || "",
              pic_name: s.pic_name || "",
              pic_contact: s.pic_contact || "",
              address: s.address || "",
              province: s.province || "",
              regency: s.regency || "",
              district: s.district || "",
              village: s.village || "",
              postal_code: s.postal_code || "",
              media: s.media || "",
            },
          })),
      };

      res.json({ success: true, data: geojson });
    } catch (e) {
      console.error("[API] stations-master error:", e);
      try {
        const { readFile } = await import("fs/promises");
        const masterPath = path.join(
          PUBLIC_DIR,
          "geojson",
          "stations_master.geojson",
        );
        const data = await readFile(masterPath, "utf8");
        res.json({
          success: true,
          data: JSON.parse(data),
          source: "static-fallback",
        });
      } catch {
        res.status(500).json({
          success: false,
          error: "Gagal mengambil data master stasiun",
        });
      }
    }
  });

  apiApp.get("/api/admin/stations", requireAdmin, async (req, res) => {
    const result = await getStations(req.query);
    res.json({ success: true, ...result });
  });

  apiApp.post("/api/admin/stations", requireAdmin, async (req, res) => {
    const result = await addStation(req.body);
    if (result.error)
      return res.status(409).json({ success: false, error: result.error });
    await writeLog({
      action: "ADMIN_CRUD",
      user: req.user.username,
      role: req.user.role,
      details: `Stasiun baru: ${req.body.name}`,
    });
    res.json({ success: true, station: result.station });
  });

  apiApp.put("/api/admin/stations/:id", requireAdmin, async (req, res) => {
    const result = await updateStation(req.params.id, req.body);
    if (result.error)
      return res.status(500).json({ success: false, error: result.error });
    await writeLog({
      action: "ADMIN_CRUD",
      user: req.user.username,
      role: req.user.role,
      details: `Stasiun diperbarui: ${req.body.name} (${req.params.id})`,
    });
    res.json({ success: true });
  });

  apiApp.delete("/api/admin/stations/:id", requireAdmin, async (req, res) => {
    const result = await deleteStation(req.params.id);
    if (result.error)
      return res.status(404).json({ success: false, error: result.error });
    await writeLog({
      action: "ADMIN_CRUD",
      user: req.user.username,
      role: req.user.role,
      details: `Stasiun hapus: ${req.params.id}`,
    });
    res.json({ success: true });
  });

  apiApp.post("/api/admin/seed-stations", requireAdmin, async (req, res) => {
    try {
      const { seedData } = await import("./database.js");
      await seedData();
      res.json({ success: true, message: "Seeding completed" });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  apiApp.post("/api/admin/stations/import", requireAdmin, async (req, res) => {
    const { geojson } = req.body;
    if (!geojson)
      return res
        .status(400)
        .json({ success: false, error: "GeoJSON data required" });

    const result = await importStationsFromGeoJSON(geojson);
    if (result.error)
      return res.status(500).json({ success: false, error: result.error });

    await writeLog({
      action: "ADMIN_CRUD",
      user: req.user.username,
      role: req.user.role,
      details: `Import stasiun via GeoJSON: ${result.count} stasiun berhasil`,
    });
    res.json(result);
  });
  apiApp.get("/api/schedules", async (req, res) => {
    const result = await getSchedules(req.query);
    res.json({ success: true, ...result });
  });

  apiApp.post("/api/admin/schedules", requireAdmin, async (req, res) => {
    const result = await addSchedule(req.body);
    if (result.error)
      return res.status(500).json({ success: false, error: result.error });
    await writeLog({
      action: "ADMIN_CRUD",
      user: req.user.username,
      role: req.user.role,
      details: `Jadwal ditambahkan`,
    });
    res.json({ success: true, id: result.id });
  });

  apiApp.delete("/api/admin/schedules/:id", requireAdmin, async (req, res) => {
    const result = await deleteSchedule(req.params.id);
    if (result.error)
      return res.status(404).json({ success: false, error: result.error });
    await writeLog({
      action: "ADMIN_CRUD",
      user: req.user.username,
      role: req.user.role,
      details: `Jadwal dihapus: ${req.params.id}`,
    });
    res.json({ success: true });
  });
  apiApp.get("/api/admin/trains", requireAdmin, async (req, res) => {
    res.json({ success: true, trains: await getTrains() });
  });

  apiApp.post("/api/admin/trains", requireAdmin, async (req, res) => {
    const result = await addTrain(req.body);
    if (result.error)
      return res.status(500).json({ success: false, error: result.error });
    await writeLog({
      action: "ADMIN_CRUD",
      user: req.user.username,
      role: req.user.role,
      details: `Kereta diperbarui: ${req.body.name}`,
    });
    res.json({ success: true, trains: result.trains });
  });

  apiApp.delete("/api/admin/trains/:name", requireAdmin, async (req, res) => {
    const result = await deleteTrain(req.params.name);
    if (result.error)
      return res.status(404).json({ success: false, error: result.error });
    await writeLog({
      action: "ADMIN_CRUD",
      user: req.user.username,
      role: req.user.role,
      details: `Kereta dihapus: ${req.params.name}`,
    });
    await broadcastDbUpdate();
    res.json({ success: true, trains: result.trains });
  });
  apiApp.get(
    "/api/admin/trains/:name/gerbongs",
    requireAdmin,
    async (req, res) => {
      const trains = await getTrains();
      const train = trains.find((t) => t.name === req.params.name);
      if (!train)
        return res
          .status(404)
          .json({ success: false, error: "Train not found" });
      res.json({ success: true, coaches: await getGerbong(train.id) });
    },
  );

  apiApp.post(
    "/api/admin/trains/:name/gerbongs",
    requireAdmin,
    async (req, res) => {
      const { name } = req.params;
      const { coaches, gerbongs } = req.body; // allow both for transition
      const coachesToSave = coaches || gerbongs;
      if (!coachesToSave)
        return res
          .status(400)
          .json({ success: false, error: "Coaches data required" });

      const trains = await getTrains();
      const train = trains.find((t) => t.name === name);
      if (!train)
        return res
          .status(404)
          .json({ success: false, error: "Train not found" });

      try {
        const existing = await getGerbong(train.id);
        for (const c of existing) {
          await deleteGerbong(c.id);
        }

        for (const c of coachesToSave) {
          await addGerbong({
            ...c,
            train_service_id: train.id,
            id: c.id || crypto.randomUUID(),
          });
        }
        res.json({ success: true });
      } catch (e) {
        res.status(500).json({ success: false, error: e.message });
      }
    },
  );
  apiApp.get("/api/admin/routes", requireAdmin, async (req, res) => {
    res.json({ success: true, routes: await getRoutes() });
  });

  apiApp.post("/api/admin/routes", requireAdmin, async (req, res) => {
    const { name, stations } = req.body;
    if (!name || !stations)
      return res
        .status(400)
        .json({ success: false, error: "Name and stations required" });
    const result = await saveRoute(name, stations);
    if (result.error)
      return res.status(500).json({ success: false, error: result.error });
    await writeLog({
      action: "ADMIN_CRUD",
      user: req.user.username,
      role: req.user.role,
      details: `Rute diperbarui: ${name}`,
    });
    await broadcastDbUpdate();
    res.json({ success: true, route: result });
  });

  apiApp.delete("/api/admin/routes/:name", requireAdmin, async (req, res) => {
    const result = await deleteRoute(req.params.name);
    if (result.error)
      return res.status(404).json({ success: false, error: result.error });
    await writeLog({
      action: "ADMIN_CRUD",
      user: req.user.username,
      role: req.user.role,
      details: `Rute dihapus: ${req.params.name}`,
    });
    await broadcastDbUpdate();
    await broadcastState();
    res.json({ success: true });
  });
  apiApp.get("/api/admin/users", requireAdmin, async (req, res) => {
    res.json({ success: true, users: await dbGetUsers() });
  });

  apiApp.post("/api/admin/users", requireAdmin, async (req, res) => {
    const { username, password, role, full_name, nama } = req.body;
    if (!username || !password || (!full_name && !nama))
      return res.status(400).json({ success: false, error: "Missing fields" });
    const result = await addUser({
      username,
      password,
      role,
      full_name: full_name || nama,
    });
    if (result.error)
      return res.status(500).json({ success: false, error: result.error });
    await writeLog({
      action: "ADMIN_CRUD",
      user: req.user.username,
      role: req.user.role,
      details: `User baru ditambahkan: ${username}`,
    });
    res.json({ success: true });
  });

  apiApp.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    const result = await deleteUser(req.params.id);
    if (result.error)
      return res.status(404).json({ success: false, error: result.error });
    await writeLog({
      action: "ADMIN_CRUD",
      user: req.user.username,
      role: req.user.role,
      details: `User dihapus: ${req.params.id}`,
    });
    res.json({ success: true });
  });
  apiApp.post(
    "/api/admin/routes/:name/geojson",
    requireAdmin,
    async (req, res) => {
      const { name } = req.params;
      const { geojson, filename } = req.body;
      const result = await updateRouteGeoJSON(name, geojson, filename);
      if (result.error)
        return res.status(404).json({ success: false, error: result.error });
      await writeLog({
        action: "ADMIN_CRUD",
        user: req.user.username,
        role: req.user.role,
        details: `GeoJSON diunggah untuk rute: ${name}`,
      });
      await broadcastDbUpdate();
      await broadcastState();
      res.json({ success: true });
    },
  );

  apiApp.delete(
    "/api/admin/routes/:name/geojson",
    requireAdmin,
    async (req, res) => {
      const { name } = req.params;
      const result = await deleteRoute(name);
      if (result.error)
        return res.status(404).json({ success: false, error: result.error });
      await writeLog({
        action: "ADMIN_CRUD",
        user: req.user.username,
        role: req.user.role,
        details: `GeoJSON dihapus untuk rute: ${name}`,
      });
      await broadcastDbUpdate();
      await broadcastState();
      res.json({ success: true });
    },
  );

  apiApp.get("/api/media/videos", async (req, res) => {
    try {
      const fs = await import("fs/promises");
      try {
        await fs.access(currentVideoDir);
      } catch {
        await fs.mkdir(currentVideoDir, { recursive: true });
      }

      const files = await fs.readdir(currentVideoDir);
      const videos = files.filter((f) => /\.(mp4|avi|mkv|mov)$/i.test(f));
      res.json({ success: true, videos, directory: currentVideoDir });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  apiApp.post("/api/media/directory", requireAuth, async (req, res) => {
    const { directory } = req.body;
    if (!directory)
      return res
        .status(400)
        .json({ success: false, error: "Directory required" });
    currentVideoDir = directory;
    res.json({ success: true, directory: currentVideoDir });
  });
  apiApp.get("/media/video/:filename", async (req, res) => {
    try {
      const path = await import("path");
      const fs = await import("fs");
      const filePath = path.join(currentVideoDir, req.params.filename);
      if (!filePath.startsWith(currentVideoDir)) {
        return res.status(403).json({ success: false, error: "Forbidden" });
      }

      if (!fs.existsSync(filePath)) {
        return res
          .status(404)
          .json({ success: false, error: "Video not found" });
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        ".mp4": "video/mp4",
        ".avi": "video/x-msvideo",
        ".mkv": "video/x-matroska",
        ".mov": "video/quicktime",
      };
      const contentType = mimeTypes[ext] || "video/mp4";

      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = end - start + 1;
        const file = fs.createReadStream(filePath, { start, end });
        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize,
          "Content-Type": contentType,
        });
        file.pipe(res);
      } else {
        res.writeHead(200, {
          "Content-Length": fileSize,
          "Content-Type": contentType,
        });
        fs.createReadStream(filePath).pipe(res);
      }
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  apiApp.get("/api/media/audios", async (req, res) => {
    try {
      const fs = await import("fs/promises");
      try {
        await fs.access(currentAudioDir);
      } catch {
        await fs.mkdir(currentAudioDir, { recursive: true });
      }

      const files = await fs.readdir(currentAudioDir);
      const audios = files.filter((f) => /\.(mp3|wav|ogg|m4a)$/i.test(f));
      res.json({ success: true, audios, directory: currentAudioDir });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  apiApp.post("/api/media/audio-directory", requireAuth, async (req, res) => {
    const { directory } = req.body;
    if (!directory)
      return res
        .status(400)
        .json({ success: false, error: "Directory required" });
    currentAudioDir = directory;
    res.json({ success: true, directory: currentAudioDir });
  });

  let currentStationDir = path.join(PUBLIC_DIR, "media", "stations");
  apiApp.get("/media/station/:filename", async (req, res) => {
    try {
      const path = await import("path");
      const fs = await import("fs");
      if (!fs.existsSync(currentStationDir)) {
        fs.mkdirSync(currentStationDir, { recursive: true });
      }

      const filePath = path.join(currentStationDir, req.params.filename);
      if (!filePath.startsWith(currentStationDir)) {
        return res.status(403).json({ success: false, error: "Forbidden" });
      }

      if (!fs.existsSync(filePath)) {
        return res
          .status(404)
          .json({ success: false, error: "Station photo not found" });
      }

      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".webp": "image/webp",
        ".gif": "image/gif",
      };
      const contentType = mimeTypes[ext] || "image/jpeg";

      res.setHeader("Content-Type", contentType);
      fs.createReadStream(filePath).pipe(res);
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });
  apiApp.get("/media/audio/:filename", async (req, res) => {
    try {
      const path = await import("path");
      const fs = await import("fs");
      const filePath = path.join(currentAudioDir, req.params.filename);
      if (!filePath.startsWith(currentAudioDir)) {
        return res.status(403).json({ success: false, error: "Forbidden" });
      }

      if (!fs.existsSync(filePath)) {
        return res
          .status(404)
          .json({ success: false, error: "Audio not found" });
      }

      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const ext = path.extname(filePath).toLowerCase();
      const mimeTypes = {
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".ogg": "audio/ogg",
        ".m4a": "audio/mp4",
      };
      const contentType = mimeTypes[ext] || "audio/mpeg";

      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = end - start + 1;
        const file = fs.createReadStream(filePath, { start, end });
        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize,
          "Content-Type": contentType,
        });
        file.pipe(res);
      } else {
        res.writeHead(200, {
          "Content-Length": fileSize,
          "Content-Type": contentType,
        });
        fs.createReadStream(filePath).pipe(res);
      }
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  // New: simple base64 upload endpoint (authenticated)
  apiApp.post("/api/media/upload", requireAuth, async (req, res) => {
    try {
      const { type = "station", filename, data } = req.body || {};
      if (!filename || !data)
        return res.status(400).json({ success: false, error: "filename & base64 data required" });
      const safeName = String(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
      if (!safeName) return res.status(400).json({ success: false, error: "Invalid filename" });
      let targetDir;
      if (type === "station") targetDir = currentStationDir;
      else if (type === "audio") targetDir = currentAudioDir;
      else if (type === "video") targetDir = currentVideoDir;
      else targetDir = path.join(PUBLIC_DIR, "media", "uploads");
      await fs.promises.mkdir(targetDir, { recursive: true });
      const filePath = path.join(targetDir, safeName);
      if (!filePath.startsWith(targetDir)) return res.status(403).json({ success: false, error: "Forbidden" });
      const buffer = Buffer.from(String(data), "base64");
      await fs.promises.writeFile(filePath, buffer);
      await writeLog({ action: "MEDIA_UPLOAD", user: req.user.username, role: req.user.role, details: `Uploaded ${safeName} (${type})` });
      const url = type === "video" ? `/media/video/${encodeURIComponent(safeName)}` : type === "audio" ? `/media/audio/${encodeURIComponent(safeName)}` : `/media/station/${encodeURIComponent(safeName)}`;
      res.json({ success: true, filename: safeName, url });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  apiApp.get("/api/gps/fleet", async (req, res) => {
    try {
      const fleet = await getGpsFleet();
      res.json({ success: true, fleet });
    } catch (err) {
      res
        .status(500)
        .json({ success: false, error: "Failed to load GPS fleet" });
    }
  });

  apiApp.get("/api/gps/gerbong/:id", async (req, res) => {
    try {
      const gerbong = await getGpsGerbong(req.params.id);
      res.json({ success: true, gerbong });
    } catch (err) {
      res
        .status(500)
        .json({ success: false, error: "Failed to load coach GPS data" });
    }
  });

  apiApp.get("/api/logs", requireAdmin, async (req, res) => {
    try {
      const result = await getLogs(req.query);
      res.json({ success: true, ...result });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to load logs" });
    }
  });

  apiApp.get("/api/admin/backups", requireAdmin, async (req, res) => {
    try {
      const backups = await listBackups();
      res.json({ success: true, backups });
    } catch (err) {
      res.status(500).json({ success: false, error: "Failed to list backups" });
    }
  });

  apiApp.post("/api/admin/backups", requireAdmin, async (req, res) => {
    try {
      const backup = await createBackup();
      await writeLog({
        action: "BACKUP_CREATE",
        user: req.user.username,
        role: req.user.role,
        details: `Backup created: ${backup.filename}`,
      });
      res.json({ success: true, backup });
    } catch (err) {
      console.error("[API] Backup create error:", err);
      res
        .status(500)
        .json({ success: false, error: "Failed to create backup" });
    }
  });

  apiApp.post("/api/admin/backups/restore", requireAdmin, async (req, res) => {
    try {
      const { filename } = req.body || {};
      if (!filename) {
        return res
          .status(400)
          .json({ success: false, error: "Backup filename is required" });
      }

      const result = await restoreBackup(filename);
      await writeLog({
        action: "BACKUP_RESTORE",
        user: req.user.username,
        role: req.user.role,
        details: `Backup restored: ${result.filename}`,
      });
      await broadcastDbUpdate();
      await broadcastState();
      res.json({ success: true, restore: result });
    } catch (err) {
      console.error("[API] Backup restore error:", err);
      res.status(500).json({
        success: false,
        error: err.message || "Failed to restore backup",
      });
    }
  });

  apiApp.use((err, req, res, next) => {
    console.error("[API] Unhandled route error:", err);
    if (res.headersSent) return next(err);
    res.status(500).json({ success: false, error: "Internal server error" });
  });

  const port = 3001;
  httpServer
    .listen(port, () => {
      console.log(
        `[PIDS-CORE] PostgreSQL API Gateway running on http://localhost:${port}`,
      );
    })
    .on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`\x1b[31m[ERROR] Port ${port} is already in use!\x1b[0m`);
        console.error(
          `\x1b[33m[TIP] This usually happens because a previous 'npm run dev:all' is still running in the background.\x1b[0m`,
        );
        console.error(
          `\x1b[33m[FIX] Run 'npm run stop:all' to kill background processes before restarting.\x1b[0m`,
        );
        process.exit(1);
      } else {
        console.error(`[ERROR] Server failed to start:`, err);
      }
    });

  return httpServer;
}
