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
import { createClient } from "redis";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import * as turf from "@turf/turf";

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load .env from the root of master-app package
dotenv.config({ path: path.join(__dirname, "..", ".env") });
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
  const port = 3001;

  // First, check if already running with a bit more patience
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const healthCheck = await fetch(`http://localhost:${port}/api/health`, {
        signal: AbortSignal.timeout(1500),
      });
      if (healthCheck.ok) {
        const data = await healthCheck.json();
        if (data && data.status === "ok") {
          console.log(`[PIDS-CORE] API is already running and healthy.`);
          return null;
        }
      }
    } catch (e) {
      // If error is NOT 'fetch failed' (like connection refused), it might be warming up
      if (e.name !== 'TypeError' && e.name !== 'AbortError') {
         await new Promise(r => setTimeout(r, 1000));
         continue;
      }
    }
  }

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

  const REDIS_URL = process.env.REDIS_URL || process.env.REDIS_URI || null;
  let redisClient = null;
  let usingRedis = false;
  const redisKeyPrefix = process.env.REDIS_SESSION_PREFIX || "pids:session:";

  const sessions = new Map(); // fallback in-memory

  const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || crypto.randomBytes(64).toString('hex');
  const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m';
  const REFRESH_TOKEN_TTL_DAYS = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || '7', 10);
  const REFRESH_TOKEN_TTL_MS = REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000;
  const redisRefreshPrefix = process.env.REDIS_REFRESH_PREFIX || 'pids:refresh:';
  const refreshTokens = new Map(); // fallback for refresh tokens

  if (REDIS_URL) {
    try {
      redisClient = createClient({ url: REDIS_URL });
      await redisClient.connect();
      usingRedis = true;
      console.log("[API] Connected to Redis for session storage");
    } catch (err) {
      console.error("[API] Redis connection failed, falling back to in-memory sessions", err);
      usingRedis = false;
    }
  }

  const setSessionAsync = async (token, session) => {
    if (usingRedis && redisClient) {
      try {
        await redisClient.set(`${redisKeyPrefix}${token}`, JSON.stringify(session), { PX: SESSION_TTL });
      } catch (e) {
        console.error("[API] Redis set session error:", e);
      }
    } else {
      sessions.set(token, session);
    }
  };

  const getSessionAsync = async (token) => {
    if (usingRedis && redisClient) {
      try {
        const raw = await redisClient.get(`${redisKeyPrefix}${token}`);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (e) {
        console.error("[API] Redis get session error:", e);
        return null;
      }
    } else {
      return sessions.get(token);
    }
  };

  const deleteSessionAsync = async (token) => {
    if (usingRedis && redisClient) {
      try {
        await redisClient.del(`${redisKeyPrefix}${token}`);
      } catch (e) {
        console.error("[API] Redis delete session error:", e);
      }
    } else {
      sessions.delete(token);
    }
  };

  // Refresh token helpers
  const setRefreshTokenAsync = async (token, payload, ttlMs) => {
    if (usingRedis && redisClient) {
      try {
        await redisClient.set(`${redisRefreshPrefix}${token}`, JSON.stringify(payload), { PX: ttlMs });
      } catch (e) {
        console.error('[API] Redis set refresh token error:', e);
      }
    } else {
      refreshTokens.set(token, { payload, expiresAt: Date.now() + ttlMs });
    }
  };

  const getRefreshTokenAsync = async (token) => {
    if (usingRedis && redisClient) {
      try {
        const raw = await redisClient.get(`${redisRefreshPrefix}${token}`);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (e) {
        console.error('[API] Redis get refresh token error:', e);
        return null;
      }
    } else {
      const v = refreshTokens.get(token);
      if (!v) return null;
      if (Date.now() >= v.expiresAt) { refreshTokens.delete(token); return null; }
      return v.payload;
    }
  };

  const deleteRefreshTokenAsync = async (token) => {
    if (usingRedis && redisClient) {
      try {
        await redisClient.del(`${redisRefreshPrefix}${token}`);
      } catch (e) {
        console.error('[API] Redis delete refresh token error:', e);
      }
    } else {
      refreshTokens.delete(token);
    }
  };

  if (!usingRedis) {
    trackInterval(
      () => {
        const now = Date.now();
        for (const [token, session] of sessions) {
          if (now >= session.expiresAt) sessions.delete(token);
        }
      },
      30 * 60 * 1000,
    );
  }

  const getSessionUser = async (req) => {
    const authHeader = req.headers["authorization"];
    if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
    const token = authHeader.slice(7);

    // If token looks like JWT, verify and ensure server-side session exists (allows logout invalidation)
    if (token.split('.') .length === 3) {
      try {
        const payload = jwt.verify(token, ACCESS_TOKEN_SECRET);
        const storedSession = await getSessionAsync(token);
        if (!storedSession) return null;
        if (Date.now() >= storedSession.expiresAt) {
          await deleteSessionAsync(token);
          return null;
        }
        // Prefer authoritative stored user object when available
        return storedSession.user || {
          id: payload.sub,
          username: payload.username,
          role: payload.role,
          full_name: payload.full_name,
        };
      } catch (e) {
        // invalid JWT, fall back to legacy session lookup
      }
    }

    // Legacy token fallback (redis or in-memory session store)
    const session = await getSessionAsync(token);
    if (!session) return null;
    if (Date.now() >= session.expiresAt) {
      await deleteSessionAsync(token);
      return null;
    }
    return session.user;
  };

  const requireAuth = async (req, res, next) => {
    try {
      const user = await getSessionUser(req);
      if (!user)
        return res.status(401).json({ success: false, error: "Unauthorized" });
      req.user = user;
      next();
    } catch (err) {
      next(err);
    }
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
    const user = await getSessionUser(req);
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
      const sessionUser = {
        id: user.id,
        username: user.username,
        role: normalizeRole(user.role),
        full_name: user.full_name,
      };

      // Create JWT access token
      const accessToken = jwt.sign({ sub: sessionUser.id, username: sessionUser.username, role: sessionUser.role, full_name: sessionUser.full_name }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });

      // Create refresh token (opaque) and store it server-side
      const refreshToken = crypto.randomUUID();
      await setRefreshTokenAsync(refreshToken, { userId: sessionUser.id, username: sessionUser.username, role: sessionUser.role, full_name: sessionUser.full_name }, REFRESH_TOKEN_TTL_MS);

      // For backward compatibility, also store a session keyed by accessToken (optional)
      await setSessionAsync(accessToken, { user: sessionUser, expiresAt: Date.now() + SESSION_TTL });

      await writeLog({
        action: "LOGIN",
        user: user.username,
        role: user.role,
        details: `${user.full_name} (${user.role}) berhasil login`,
      });

      res.json({ success: true, token: accessToken, refreshToken, user: sessionUser });
    } catch (err) {
      console.error("[API] Login error:", err);
      res.status(500).json({ success: false, error: "Login failed" });
    }
  });

  apiApp.get("/api/auth/verify", async (req, res) => {
    const user = await getSessionUser(req);
    if (!user)
      return res
        .status(401)
        .json({ success: false, error: "Token tidak valid" });
    res.json({ success: true, user });
  });

  apiApp.post("/api/auth/refresh", async (req, res) => {
    try {
      const { refreshToken } = req.body || {};
      if (!refreshToken)
        return res.status(400).json({ success: false, error: "refreshToken required" });

      const stored = await getRefreshTokenAsync(refreshToken);
      if (!stored) return res.status(401).json({ success: false, error: "Invalid refresh token" });

      // rotate refresh token
      await deleteRefreshTokenAsync(refreshToken);
      const userId = stored.userId || stored.user_id || stored.id;
      const username = stored.username || stored.user || "";
      // You may fetch full user details from DB if needed. Here we reconstruct minimal claims.
      const payload = { sub: userId, username, role: stored.role || "Operator", full_name: stored.full_name || "" };
      const newAccessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
      const newRefreshToken = crypto.randomUUID();
      await setRefreshTokenAsync(newRefreshToken, { userId, username, role: payload.role, full_name: payload.full_name }, REFRESH_TOKEN_TTL_MS);
      await setSessionAsync(newAccessToken, { user: { id: payload.sub, username: payload.username, role: payload.role, full_name: payload.full_name }, expiresAt: Date.now() + SESSION_TTL });
      res.json({ success: true, token: newAccessToken, refreshToken: newRefreshToken });
    } catch (e) {
      console.error('[API] Refresh token error:', e);
      res.status(500).json({ success: false, error: e.message });
    }
  });

  apiApp.post("/api/auth/logout", requireAuth, async (req, res) => {
    try {
      const authHeader = req.headers["authorization"];
      const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      const { refreshToken } = req.body || {};

      await writeLog({
        action: "LOGOUT",
        user: req.user.username,
        role: req.user.role,
        details: `${req.user.full_name} logout`,
      });

      if (token) await deleteSessionAsync(token);
      if (refreshToken) await deleteRefreshTokenAsync(refreshToken);
      res.json({ success: true });
    } catch (e) {
      res.status(500).json({ success: false, error: e.message });
    }
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
        "simGps",
        "simDistance",
        "lastSimTime",
      ]);
      for (const key of Object.keys(updates)) {
        if (!ALLOWED_KEYS.has(key)) delete updates[key];
      }
      const prevState = await getState();

      // --- ATOMIC SNAPPING LOGIC ---
      // If currentStation changed, calculate snap BEFORE updating state
      const prevStationName = getStationName(prevState.currentStation).toUpperCase().trim();
      const currentStationName = updates.currentStation ? getStationName(updates.currentStation).toUpperCase().trim() : "";

      if (updates.currentStation && (currentStationName !== prevStationName || !prevState.simGps || updates.isSyncing)) {
        const activeRoute = updates.activeRoute || prevState.activeRoute;
        const currentStations = updates.stations || prevState.stations;

        if (activeRoute && (activeRoute.features || activeRoute.geojson || activeRoute.type === 'FeatureCollection')) {
          try {
            const geojson = activeRoute.features ? activeRoute : (
              typeof activeRoute.geojson === 'string' ? JSON.parse(activeRoute.geojson) : activeRoute.geojson
            );
            
            const features = geojson.features || [];
            const lineFeature = features.find(f => f.geometry?.type === 'LineString');
            const stationFeatures = features.filter(f => f.geometry?.type === 'Point');
            
            if (lineFeature && stationFeatures.length > 0) {
              const targetStation = stationFeatures.find(f => {
                const stationName = String(f.properties?.name || f.properties?.Name || "").toUpperCase().trim();
                return stationName === currentStationName;
              });

              if (targetStation && targetStation.geometry?.coordinates) {
                const coords = targetStation.geometry.coordinates;
                const pt = turf.point(coords);
                let lineCoords = [...lineFeature.geometry.coordinates];

                // Ensure line orientation matches current station list direction
                if (currentStations && currentStations.length >= 2) {
                  const firstStationName = getStationName(currentStations[0]).toUpperCase().trim();
                  const startCoord = lineCoords[0];
                  const endCoord = lineCoords[lineCoords.length - 1];
                  
                  const startPt = turf.point(startCoord);
                  const endPt = turf.point(endCoord);
                  
                  const firstStationFeature = stationFeatures.find(f => 
                    String(f.properties?.name || f.properties?.Name || "").toUpperCase().trim() === firstStationName
                  );
                  
                  if (firstStationFeature) {
                    const firstStnPt = turf.point(firstStationFeature.geometry.coordinates);
                    const distToStart = turf.distance(firstStnPt, startPt);
                    const distToEnd = turf.distance(firstStnPt, endPt);
                    if (distToEnd < distToStart) lineCoords.reverse();
                  }
                }

                const line = turf.lineString(lineCoords);
                const snapped = turf.nearestPointOnLine(line, pt);
                
                // CRITICAL: Use 'location' (distance along line) instead of 'dist' (distance to line)
                const distanceInMeters = (snapped.properties?.location || 0) * 1000;

                console.log(`[PIDS-API] Atomic Snap: ${currentStationName} @ ${distanceInMeters.toFixed(2)}m`);

                // Merge snapping results into the updates object before DB write
                updates.simDistance = distanceInMeters;
                updates.simGps = {
                  lng: coords[0],
                  lat: coords[1],
                  heading: updates.simGps?.heading || prevState.simGps?.heading || 0
                };
              }
            }
          } catch (e) {
            console.error("[PIDS-API] Atomic Snap error:", e.message);
          }
        }
      }

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
      const finalState = await getState();
      res.json({ success: true, state: finalState });
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
    try {
      const filter = {
        search: req.query.search,
        division: req.query.division,
        limit: req.query.limit,
        offset: req.query.offset,
      };
      const result = await getStations(filter);
      res.json({ success: true, ...result });
    } catch (e) {
      res.json({ success: false, error: e.message });
    }
  });

  apiApp.get("/api/divisions", async (req, res) => {
    try {
      const divisions = await getAll("SELECT * FROM divisions ORDER BY name");
      res.json({ success: true, data: divisions });
    } catch (e) {
      res.json({ success: false, error: e.message });
    }
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
      res.json({ success: false, error: "Database error: " + e.message });
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

  apiApp.get("/api/admin/schedules", requireAdmin, async (req, res) => {
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
      const state = await getState();
      const gerbong = await getGpsGerbong(req.params.id);
      
      // Override with simulated GPS if it's the active service
      const updatedGerbong = gerbong.map((g, idx) => {
        if (state.simGps) {
          // Add a tiny offset based on index to separate coaches slightly if desired
          // but for now, just matching the train position for "accuracy"
          return {
            ...g,
            latitude: state.simGps.lat,
            longitude: state.simGps.lng,
            heading: state.simGps.heading,
            speed: state.speed || 0
          };
        }
        return g;
      });

      res.json({ success: true, gerbong: updatedGerbong });
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

  // GPS Simulation Loop
  trackInterval(async () => {
    try {
      const state = await getState();
      if (!state.serviceName || state.serviceName === "Belum Dikonfigurasi") return;
      if (!state.activeRoute || !state.activeRoute.geojson) return;

      const geojson = typeof state.activeRoute.geojson === 'string' 
        ? JSON.parse(state.activeRoute.geojson) 
        : state.activeRoute.geojson;
      
      const features = geojson.features || (geojson.type === 'FeatureCollection' ? [] : [geojson]);
      const lineFeature = features.find(f => f.geometry?.type === 'LineString');
      const stationFeatures = features.filter(f => f.geometry?.type === 'Point');
      if (!lineFeature) return;

      const now = Date.now();
      const lastTime = state.lastSimTime || now;
      let dt = (now - lastTime) / 1000; // seconds
      
      // Cap dt to prevent massive jumps after sleep/hang
      if (dt > 2.0) dt = 1.0; 
      if (dt <= 0) dt = 1.0;

      let currentDist = state.simDistance || 0;
      const speedMPS = (state.speed || 0) / 3.6; // km/h to m/s
      
      const lineCoords = [...lineFeature.geometry.coordinates];
      let line = turf.lineString(lineCoords);

      // Perfection: Auto-reverse simulation line if the current station list is reversed
      // This ensures KA 68 (BD-ML) moves in the correct direction on the map
      if (state.stations && state.stations.length >= 2) {
        const firstStnName = String(typeof state.stations[0] === 'object' ? state.stations[0].name : state.stations[0]).toUpperCase().trim();
        const startPoint = turf.point(lineCoords[0]);
        const endPoint = turf.point(lineCoords[lineCoords.length - 1]);
        
        const firstStnFeature = stationFeatures.find(f => 
          String(f.properties?.name || f.properties?.Name || "").toUpperCase().trim() === firstStnName
        );

        if (firstStnFeature) {
          const distToStart = turf.distance(turf.point(firstStnFeature.geometry.coordinates), startPoint);
          const distToEnd = turf.distance(turf.point(firstStnFeature.geometry.coordinates), endPoint);
          if (distToEnd < distToStart) {
            line = turf.lineString(lineCoords.reverse());
          }
        }
      }

      const totalLength = turf.length(line, { units: "kilometers" }) * 1000;
      let lng, lat, bearing;

      if (speedMPS <= 0) {
        // Snap to current station if speed is 0
        const normalizedCurrent = getStationName(state.currentStation).toUpperCase().trim();
        const currentStation = stationFeatures.find(f => {
            const name = String(f.properties?.name || f.properties?.Name || "").toUpperCase().trim();
            return name === normalizedCurrent;
        });

        if (currentStation) {
          [lng, lat] = currentStation.geometry.coordinates;
          bearing = state.simGps?.heading || 0;
          
          // Recalculate distance to be exactly at station
          const pt = turf.point([lng, lat]);
          const snapped = turf.nearestPointOnLine(line, pt);
          currentDist = (snapped.properties.location || 0) * 1000;
        } else {
          // Keep current position if station not found
          lng = state.simGps?.lng;
          lat = state.simGps?.lat;
          bearing = state.simGps?.heading || 0;
        }
      } else {
        currentDist += speedMPS * dt;
        if (currentDist > totalLength) {
          currentDist = 0; // Loop back
        }

        const point = turf.along(line, currentDist / 1000, { units: 'kilometers' });
        const nextDist = Math.min(currentDist + 50, totalLength);
        const nextPoint = turf.along(line, nextDist / 1000, { units: 'kilometers' });
        bearing = turf.bearing(point, nextPoint);
        [lng, lat] = point.geometry.coordinates;
      }

      if (lng !== undefined && lat !== undefined) {
        await updateState({
          simGps: { lng, lat, heading: bearing },
          simDistance: currentDist,
          lastSimTime: now
        });
        
        // Broadcast the full updated state
        io.emit("state:update", await getState());
      }
    } catch (e) {
      console.error("[Simulation] Error:", e.message);
    }
  }, 1000);

  return new Promise((resolve, reject) => {
    httpServer
      .listen(port, () => {
        console.log(
          `[PIDS-CORE] PostgreSQL API Gateway running on http://localhost:${port}`,
        );
        resolve(httpServer);
      })
      .on("error", (err) => {
        if (err.code === "EADDRINUSE") {
          console.log(`[PIDS-CORE] Port ${port} was taken between check and listen. Assuming success.`);
          resolve(null);
        } else {
          console.error(`[ERROR] Server failed to start:`, err);
          reject(err);
        }
      });
  });
}
