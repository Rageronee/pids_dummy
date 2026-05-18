# Eltran PIDS — Comprehensive Application Analysis

> **Date**: 9 April 2026
> **Scope**: Master App, Selector App, Command Center App, Shared/HAL, pids-core, Backend API & Database
> **Purpose**: Identify all empty views, stub implementations, missing prototypes, incomplete features, and areas requiring improvement across the entire application.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Master App Analysis](#1-master-app-analysis)
3. [Selector App Analysis](#2-selector-app-analysis)
4. [Command Center App Analysis](#3-command-center-app-analysis)
5. [Shared / HAL (Hardware Abstraction Layer)](#4-shared--hal-hardware-abstraction-layer)
6. [pids-core Type Package](#5-pids-core-type-package)
7. [Backend API & Database](#6-backend-api--database)
8. [Cross-Cutting Concerns](#7-cross-cutting-concerns)
9. [Summary Matrix — All Empty/Stub/Incomplete Items](#8-summary-matrix--all-emptystubincomplete-items)
10. [Priority Recommendations](#9-priority-recommendations)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Eltran PIDS Monorepo                      │
├─────────────────┬──────────────────┬────────────────────────┤
│   master-app    │  selector-app    │  command-center-app    │
│   (Port 3001)   │  (Port 5174)     │  (Port 5176)           │
│   Hub + API GW  │  Thin Client     │  Admin Panel           │
├─────────────────┴──────────────────┴────────────────────────┤
│                    shared (HAL + UI)                         │
│                    pids-core (types)                         │
├─────────────────────────────────────────────────────────────┤
│              PostgreSQL (Docker) + Socket.IO                 │
└─────────────────────────────────────────────────────────────┘
```

The project is a **monorepo** with 5 packages:
- `master-app` — Central PIDS controller with Socket.IO hub, API server, and dashboard UI
- `selector-app` — Thin client for Raspberry Pi touchscreens (station/selector interface)
- `command-center-app` — Admin panel for managing trains, stations, routes, schedules, users, and logs
- `shared` — Reusable components and Hardware Abstraction Layer (HAL)
- `pids-core` — Core type definitions and domain constants

---

## 1. Master App Analysis

### 1.1 Stampformasi Tab — Entirely Fake Data

| Aspect | Detail |
|--------|--------|
| **Location** | `master-app/src/App.tsx` (~line 730) |
| **What's shown** | Table of coaches with IP addresses, asset numbers, last report time, status |
| **Problem** | All data is **hardcoded and generated on-the-fly**: IPs are `192.168.1.{100+idx}`, asset numbers are `K1{idx}{800+idx}`, status is always "Active" with green pulse dot, last report is always current time |
| **Root cause** | No API call fetches actual coach/asset data from backend |
| **Impact** | Users see meaningless fake data; cannot monitor real coach status |
| **Fix needed** | Connect to `/api/trains` and `/api/coaches` endpoints; render real data |

### 1.2 Toolbar Buttons — All Stub (Toast Only)

| Button | File | Current Behavior | Missing Functionality |
|--------|------|------------------|----------------------|
| **Cek GPS** | `MasterToolbar.tsx` | Shows toast `"Memeriksa status GPS"` | No actual GPS status check, no display of GPS coordinates/signal quality |
| **Warna** | `MasterToolbar.tsx` | Shows toast `"Menyesuaikan warna tema LED"` | No LED color configuration panel or API call |
| **Outdoor** | `MasterToolbar.tsx` | Shows toast `"Beralih ke tampilan Outdoor"` | No actual display mode switch (indoor↔outdoor) |
| **Arah** | `MasterToolbar.tsx` | Shows toast `"Arah perjalanan dibalik"` | No actual route reversal logic |
| **Simpan Konfigurasi** | `MasterToolbar.tsx` | **Functional** — sends `jumlahKereta`, `geofencingInnerRadius`, `geofencingOuterRadius` | ✅ Only working button |

### 1.3 CCTV Monitor — Static Images, No Real Streaming

| Aspect | Detail |
|--------|--------|
| **Location** | `master-app/src/App.tsx` `MonitorCCTV` component + `useCCTVStream.ts` |
| **What's shown** | 4 external internet images cycled every 5 seconds as "camera feeds" |
| **Problem** | The `useCCTVStream` hook returns a static `fallbackImageUrl` after an 800ms simulated delay. Comment in code: `"In future: establish WebRTC peer connection or setup RTSP proxy here"` |
| **Impact** | No real RTSP/WebRTC camera streaming; purely decorative |
| **Fix needed** | Implement RTSP-to-WebRTC proxy server; integrate real camera URLs from config |

### 1.4 GPS Tracking — Dummy Simulation Only

| Aspect | Detail |
|--------|--------|
| **Location** | `master-app/src/hooks/useGPSStream.ts` |
| **What's shown** | Speed and altitude displayed on UI |
| **Problem** | Parses speed/altitude from PIDS State which is itself dummy-simulated. Comments: `"For dummy simulation..."`, `"// Setup real local polling here in the future"` |
| **Impact** | No actual GNSS/NMEA hardware integration |
| **Fix needed** | Connect to real GPS serial port or local API for NMEA sentences |

### 1.5 useMapboxSystem Hook — Defined But Never Used

| Aspect | Detail |
|--------|--------|
| **Location** | `master-app/src/hooks/useMapboxSystem.ts` |
| **Problem** | This hook is a complete MapLibre map initialization and sync system, but **it is not imported or used anywhere**. `MasterConsolePanel` implements its own inline map logic with `maplibregl.Map` instead |
| **Impact** | ~200 lines of dead code; duplicated map logic; missed opportunity for clean separation |
| **Fix needed** | Either integrate this hook into `MasterConsolePanel` or remove it |

### 1.6 DatabaseService — Limited & Uses Temp Directory

| Aspect | Detail |
|--------|--------|
| **Location** | `master-app/src/services/DatabaseService.ts` |
| **Problem** | Uses `window.require('fs')` to write to `os.tmpdir()`. Data stored in **temporary directory** — lost on reboot. Only 3 methods implemented: `init`, `getAll`, `saveRoute` |
| **Impact** | Non-persistent storage; limited CRUD coverage |
| **Fix needed** | Use the PostgreSQL backend layer (`electron/database.js`) instead; remove client-side fs usage |

### 1.7 Map — Partial Implementation

| Aspect | Detail |
|--------|--------|
| **Location** | `MasterConsolePanel.tsx` |
| **What works** | MapLibre renders, GeoJSON routes display, train position marker moves, zoom controls work |
| **What's missing** | No satellite view toggle; no traffic layer; no station clustering; no geofencing visualization (inner/outer radius circles not drawn on map) |

### 1.8 Audio & Video Settings Modals — Minimal

| Aspect | Detail |
|--------|--------|
| **Location** | `MasterModals.tsx` |
| **What's shown** | Basic modal for audio/video settings |
| **Problem** | Settings are superficial; no volume slider, no playback speed control, no audio device selection, no video source configuration |
| **Fix needed** | Expand settings modal with full configuration options wired to backend |

---

## 2. Selector App Analysis

### 2.1 Dead / Orphaned Component Files

| File | Lines | Status | Detail |
|------|-------|--------|--------|
| `src/components/ServiceConfig.tsx` | ~140 | **DEAD CODE** | Fully implemented service config with train name dropdown, search, gerbong selection. Never imported anywhere. Superseded by `ServiceConfigModal.tsx` |
| `src/components/StationControl.tsx` | ~70 | **DEAD CODE** | Station carousel with prev/next/sync buttons and AnimatePresence animations. Never imported. App.tsx inlines all this functionality directly |

### 2.2 Cosmetic-Only States (No Backend Sync)

| State | File | Problem |
|-------|------|---------|
| `ledType` | `App.tsx` line 47 | Initialized as `'indoor'`, passed to `SystemSettingsModal`, handler only updates local state. **Never sent to backend** via `sendData()`, not read from master sync state. Changing LED type has no observable effect beyond local preview |
| `trainCategory` | `App.tsx` line 45 | Toggle between `'EKSEKUTIF'` and `'EKONOMI PREMIUM'`. Displayed in header but **not synced with master, not persisted, not derived from route/service data**. Purely cosmetic |

### 2.3 Telemetry — Simulated Data

| Aspect | Detail |
|--------|--------|
| **Location** | `useSelectorSync.ts` lines 89-97 |
| **What's shown** | Speed, altitude, temperature displayed in UI |
| **Problem** | Generated via `Math.random()` simulation. Not connected to real GPS/temperature sensors |
| **Impact** | Acceptable for dummy/development, but must be replaced for production |

### 2.4 No Test Files

Zero test files exist (`*.test.ts`, `*.test.tsx`, `*.spec.ts`) anywhere in the selector-app package.

---

## 3. Command Center App Analysis

### 3.1 Dashboard Page — Simulated Data & Dead Code

| Element | Location | Problem |
|---------|----------|---------|
| **Occupancy/Load %** | `DashboardPage.tsx` line 93 | `Math.floor(Math.random() * 40) + 20` — fake data on every render. Not from API |
| **StatCard component** | `DashboardPage.tsx` lines 157-185 | **Defined but never rendered** in JSX. Dead code |
| **MapComponent** | `components/MapComponent.tsx` | Shows **single static marker** at Jakarta coordinates (-6.2088, 106.8456). Does not pull live train positions or station locations. Decorative only |

### 3.2 Trains Page — Missing Edit Functionality

| Aspect | Detail |
|--------|--------|
| **Location** | `TrainsPage.tsx` (427 lines) |
| **What works** | Full CRUD concept with complex form: gerbong management, intermediate station routing with drag reorder, PIC info, IP address. Delete with confirmation |
| **Missing** | **No edit functionality** for existing trains. `editingId` state concept exists but is never wired up — page only has "Add" and "Delete". Form always creates new entries |
| **Missing** | No train detail view — just a table list |

### 3.3 Stations Page — Stubs, Fake Data, Hardcoded Fallbacks

| Element | Location | Problem |
|---------|----------|---------|
| **Status / Displays Active / Next Sync** | `StationsPage.tsx` lines 242-244 | Randomly generated: `status: Math.random() > 0.3 ? 'ONLINE' : 'UPDATING'`, `displays_active: Math.floor(Math.random() * 40) + 10`, `next_sync: random timer string` |
| **"Message PIC" button** | `StationsPage.tsx` ~line 790 | **No onClick handler** — stub button |
| **"Upload New File" button** | `StationsPage.tsx` ~line 830 | **No onClick handler** — stub button |
| **Media & Attachments section** | `StationsPage.tsx` ~lines 835-855 | **4 hardcoded fake files**: "Facade_Vi...", "Station_S...", "Floor_Pla...", "Staff_List..." with fake sizes. Not connected to any real data |
| **Detail view fallbacks** | Various | Hardcoded names: `'Arya Wiguna'` (Station Manager), `'+62 811-2345-6789'` (PIC Contact), `'DKI Jakarta'` (province), `'Gambir'` (district/village) |
| **Image fallback** | Grid view line 1272 | Uses `https://via.placeholder.com/150` — inconsistent with `${API}/media/station/station_fallback.png` used elsewhere |

### 3.4 Routes Page — Hardcoded Stats & Missing Satellite Map

| Element | Location | Problem |
|---------|----------|---------|
| **Satellite map style** | `RoutesPage.tsx` line 352 | URL: `'https://api.maptiler.com/maps/satellite/style.json?key=get_your_own_key'` — literal placeholder string. Falls back to CartoDB dark-matter |
| **Speed / Est. Arrival / Temperature** | `RoutesPage.tsx` ~lines 930-950 | **Hardcoded static values**: Speed `74` or `0` km/h, Est. Arrival `14:45`, Temperature `28 C`. Not from API |
| **Route type** | Throughout | Defaults to `'Intercity'` with no actual type detection logic |
| **units / distance / occupancy** | Displayed from route data | Only shown if backend provides them; no fallback or calculation |

### 3.5 Schedules Page — Missing Edit & Multi-Stop Support

| Aspect | Detail |
|--------|--------|
| **Location** | `SchedulesPage.tsx` (457 lines) |
| **Missing** | **No edit functionality** for existing schedules. Only add and delete |
| **Missing** | `route_id` hardcoded to `null` and `stops` hardcoded to `[]` in save payload. Schedules are always point-to-point with no intermediate stops linkage |
| **Missing** | No multi-stop schedule creation — form only handles direct origin-to-destination |

### 3.6 Users Page — Basic, No Edit

| Aspect | Detail |
|--------|--------|
| **What works** | List users, add user (nama, username, password, role), delete with confirmation |
| **Missing** | No edit-user functionality (cannot change role, reset password, update name) |
| **Missing** | No role-based route protection — all pages accessible to any logged-in Admin; no Operator role gating |

### 3.7 Logs Page — Complete

| Aspect | Detail |
|--------|--------|
| **Status** | ✅ Fully implemented |
| **Features** | Log table with action-type filter chips, pagination (load-more), socket.io live refresh |

---

## 4. Shared / HAL (Hardware Abstraction Layer)

### 4.1 Hardware Mode — Entirely Dummy

| File | Problem |
|------|---------|
| `PidsServiceFactory.ts` line 28 | `// TODO: Import and instantiate HardwarePidsService when hardware is ready` — when `mode: 'hardware'` requested, falls back to `DummyPidsService` with `console.warn` |
| `DummyAdapter.ts` — `DummyDisplayAdapter` | All methods only `console.log()`. No real serial/GPIO output to P10 LED displays |
| `DummyAdapter.ts` — `DummyTvAdapter` | All methods only `console.log()`. No HDMI-CEC or serial TV control |
| `DummyAdapter.ts` — `DummySensorAdapter` | Generates random GPS coordinates around Bandung (-6.9175, 107.6191), random speed (0-120 km/h), random temperature. No real GNSS/sensor hardware |

### 4.2 Missing HardwareAdapter.ts

The factory comments reference a `HardwareAdapter.ts` file that **does not exist**. The migration guide says to create:
- `HardwareDisplayAdapter` — sends serial commands to P10 via USB/UART
- `HardwareTvAdapter` — sends HDMI-CEC commands or serial to TV controller
- `HardwareSensorAdapter` — reads from GNSS/GPS module via UART, I2C for temp on RPi

### 4.3 HAL Types Live in `shared`, Not `pids-core`

The HAL types (`IPidsService`, `IDisplayAdapter`, `ITvAdapter`, `ISensorAdapter`, `HalConfig`, `SensorReading`) are defined in `packages/shared/src/lib/hal/types.ts`, not in `pids-core`. If `pids-core` is meant to be the central type hub, these should be re-exported or moved.

---

## 5. pids-core Type Package

### 5.1 17 of 20 Types Are Never Imported

| Defined but Never Used | Impact |
|------------------------|--------|
| `PidsPacket`, `Station`, `RouteData`, `DisplayMode` | Forward planning or dead weight |
| `TrainService`, `Schedule`, `ScheduleStop`, `Coach`, `Sensor`, `SensorData` | Backend entities not typed for consumers |
| `LogMaintenance`, `LogOperasional` | Maintenance/ops logs not typed |
| `GpsFleetEntry`, `GpsGerbongEntry` | GPS fleet tracking not typed |
| `SocketEvents` | Socket event typing not used by consumers |
| `TRAIN_STATUS`, `SENSOR_TYPE` constants | Domain constants not referenced |

### 5.2 Duplicated Type Literals

| Issue | Detail |
|-------|--------|
| `TRAIN_STATUS` not used by `Schedule.status` | `TRAIN_STATUS` defines `'ON_TIME' \| 'LATE' \| 'CANCELLED' \| 'STANDBY'` but `Schedule.status` is hardcoded `'ON_TIME' \| 'LATE' \| 'CANCELLED'` (omits `STANDBY`) |
| `TRAIN_STATUS` not used by `PidsState.status` | `PidsState.status` is typed as plain `string` instead of the union |
| `SENSOR_TYPE` not used by `Sensor.sensor_type` | `SENSOR_TYPE` defines `'GPS' \| 'TEMPERATURE' \| 'AQ'` but `Sensor.sensor_type` is a separate hardcoded union |
| `GpsGerbongEntry.sensor_type` is just `string` | No enum/union typing |

### 5.3 Type Escape Hatches

| Location | Problem |
|----------|---------|
| `LogEntry.data?: any` | Loses all type safety for log payloads |
| `SocketEvents.db:update` routes as `any[]` | Should reference `RouteData` or a dedicated route DTO |

### 5.4 Station Field Name Mismatch

| pids-core `Station` Interface | Actual UI Field Names (StationsPage) |
|-------------------------------|--------------------------------------|
| `city_code` | `kode_kota` |
| `address` | `alamat` |
| `district` | `kecamatan` |
| `village` | `kelurahan_desa` |
| `postal_code` | `kode_pos` |
| (missing) | `email`, `fixed_line` |

The UI uses Indonesian field names from the API/DB that don't match the English field names in the `Station` interface.

### 5.5 Missing `tsconfig.json`

The package has no TypeScript configuration. It relies on consumers' tsconfigs to resolve it, which works but means no isolated compilation checks, no lint rules, and no build output configuration.

### 5.6 No Runtime Type Guards

All types are compile-time only. No `isPidsState()`, `isAuthUser()`, or Zod/io-ts validators for runtime checking of API responses or socket payloads.

---

## 6. Backend API & Database

### 6.1 DatabaseService (Client-Side) — Temp Directory Storage

| Aspect | Detail |
|--------|--------|
| **Location** | `master-app/src/services/DatabaseService.ts` |
| **Problem** | Uses `window.require('fs')` to write to `os.tmpdir()`. Data is lost on reboot. This is a **separate layer** from the PostgreSQL backend in `electron/database.js` |
| **Conflict** | The backend has a full PostgreSQL layer, but this client-side service duplicates and conflicts with it |

### 6.2 Database Specialized Functions — Partial

| Location | Detail |
|----------|--------|
| `database.js` line ~1522 | Comment: `// Placeholder for remaining specialized functions` |
| **Impact** | Some CRUD operations for certain entities may be incomplete or missing |

### 6.3 API Endpoints — What Exists vs What's Missing

#### Existing Endpoints (Implemented)
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/login` | Authentication with rate limiting |
| POST | `/api/auth/logout` | Session termination |
| GET | `/api/auth/me` | Session validation |
| GET/POST/PUT/DELETE | `/api/state` | PIDS state management |
| GET | `/api/logs` | System logs |
| GET/POST/PUT/DELETE | `/api/trains` | Train CRUD |
| GET/POST/PUT/DELETE | `/api/routes` | Route CRUD + GeoJSON |
| GET/POST/PUT/DELETE | `/api/stations` | Station CRUD |
| GET/POST/PUT/DELETE | `/api/schedules` | Schedule CRUD |
| GET/POST/PUT/DELETE | `/api/users` | User management |
| GET/POST/DELETE | `/api/gerbongs` | Coach management |
| GET/POST | `/api/sensors` | Sensor registration |
| GET | `/api/sensor-data` | Sensor readings |
| GET/POST | `/api/maintenance` | Maintenance logs |
| GET | `/api/operasional` | Operational logs |
| GET | `/api/gps-fleet` | GPS fleet tracking |
| POST | `/api/import-stations-geojson` | GeoJSON station import |
| GET | `/api/video-dir` | Video directory config |
| GET | `/api/media/videos` | Video file listing |
| GET | `/api/media/audio` | Audio file listing |

#### Missing Endpoints (Not Implemented)
| Needed Endpoint | Purpose |
|-----------------|---------|
| `PUT /api/trains/:id` | **Edit existing train** (needed by TrainsPage) |
| `PUT /api/schedules/:id` | **Edit existing schedule** (needed by SchedulesPage) |
| `PUT /api/users/:id` | **Edit existing user** (change role, reset password) |
| `POST /api/media/upload` | **File upload** for station media (needed by StationsPage "Upload New File" stub) |
| `DELETE /api/media/:id` | **Delete media file** |
| `POST /api/messages/pic` | **Message PIC** endpoint (needed by StationsPage "Message PIC" stub) |
| `GET /api/coaches` | **List all coaches** with real data (needed by Stampformasi tab) |
| `PUT /api/led-config` | **LED color/type configuration** (needed by "Warna" toolbar button) |
| `POST /api/route/reverse` | **Reverse route direction** (needed by "Arah" toolbar button) |
| `GET /api/gps/status` | **GPS signal status** (needed by "Cek GPS" toolbar button) |

---

## 7. Cross-Cutting Concerns

### 7.1 No Tests Anywhere

| Package | Test Status |
|---------|-------------|
| `master-app` | Zero tests |
| `selector-app` | Zero tests |
| `command-center-app` | Zero tests |
| `shared` | Zero tests |
| `pids-core` | Zero tests |

### 7.2 Simulated/Random Data Scattered Throughout

| Location | Simulated Data |
|----------|---------------|
| Master — Stampformasi tab | IPs, asset numbers, status |
| Master — GPS hook | Speed, altitude from PIDS state |
| Master — CCTV hook | Static external images |
| Selector — Telemetry | `Math.random()` speed/altitude/temp |
| CC — Dashboard | Occupancy load `Math.random()` |
| CC — Stations | Status, displays_active, next_sync all random |
| CC — Routes fullscreen map | Speed 74/0, arrival 14:45, temp 28°C hardcoded |
| CC — Station detail fallbacks | Hardcoded names, addresses, phone numbers |

### 7.3 No Role-Based Access Control (RBAC) Enforcement

- Login rejects non-Admin users, but `UsersPage` allows creating `Operator` accounts that can never log in to Command Center
- All CC pages are accessible to any logged-in Admin; no fine-grained permissions
- No route guards based on role in any app

### 7.4 No Loading States or Error Boundaries (Command Center)

- Command Center has no loading spinners during data fetches
- No error fallback UI when API calls fail
- Master App has `ErrorBoundary`; Command Center does not

### 7.5 Inconsistent Fallback Strategies

| Location | Fallback | Issue |
|----------|----------|-------|
| StationsPage grid view | `https://via.placeholder.com/150` | External URL, may be blocked |
| StationsPage detail view | `${API}/media/station/station_fallback.png` | Internal, consistent |
| CCTV monitor | Hardcoded external URLs | External, unreliable |

### 7.6 No API Response Validation

- All API calls trust the backend to return correctly shaped data
- No `try/catch` with user-friendly error messages on most fetches
- No response schema validation (Zod, io-ts, etc.)

---

## 8. Summary Matrix — All Empty/Stub/Incomplete Items

### 🔴 Critical (Functional Gaps)

| # | Component | Feature | Status | Impact |
|---|-----------|---------|--------|--------|
| 1 | Master | Stampformasi tab | Fake data | Users see meaningless data |
| 2 | Master | Toolbar: Cek GPS | Stub (toast only) | No GPS status info |
| 3 | Master | Toolbar: Warna | Stub (toast only) | No LED config |
| 4 | Master | Toolbar: Outdoor | Stub (toast only) | No mode switch |
| 5 | Master | Toolbar: Arah | Stub (toast only) | No route reversal |
| 6 | Master | CCTV streaming | Static images | No real camera feeds |
| 7 | Master | GPS tracking | Dummy simulation | No real GPS hardware |
| 8 | Master | DatabaseService | Temp dir storage | Data lost on reboot |
| 9 | Master | useMapboxSystem hook | Dead code | Duplicated map logic |
| 10 | CC | TrainsPage edit | Missing | Cannot edit existing trains |
| 11 | CC | SchedulesPage edit | Missing | Cannot edit existing schedules |
| 12 | CC | Schedules multi-stop | Missing (`route_id: null`, `stops: []`) | Point-to-point only |
| 13 | CC | "Message PIC" button | No onClick handler | Stub |
| 14 | CC | "Upload New File" button | No onClick handler | Stub |
| 15 | CC | Media attachments | 4 hardcoded fake files | Purely decorative |
| 16 | CC | Dashboard map | Static single marker | No live train tracking |
| 17 | HAL | Hardware mode | Falls back to dummy | No real hardware support |
| 18 | Backend | PUT /api/trains/:id | Missing endpoint | Cannot edit trains |
| 19 | Backend | PUT /api/schedules/:id | Missing endpoint | Cannot edit schedules |
| 20 | Backend | PUT /api/users/:id | Missing endpoint | Cannot edit users |
| 21 | Backend | POST /api/media/upload | Missing endpoint | Cannot upload files |
| 22 | Backend | GET /api/coaches | Missing endpoint | Stampformasi has no data source |

### 🟡 Moderate (Quality/UX Issues)

| # | Component | Feature | Status | Impact |
|---|-----------|---------|--------|--------|
| 23 | Selector | ServiceConfig.tsx | Dead code (orphaned) | Package bloat |
| 24 | Selector | StationControl.tsx | Dead code (orphaned) | Package bloat |
| 25 | Selector | ledType state | Local-only, no sync | Changes have no effect |
| 26 | Selector | trainCategory state | Cosmetic only | Displayed but meaningless |
| 27 | CC | Dashboard StatCard | Dead code (defined, not rendered) | Package bloat |
| 28 | CC | Station status | Math.random() simulation | Misleading status display |
| 29 | CC | Satellite map | `get_your_own_key` placeholder | Satellite view broken |
| 30 | CC | Fullscreen map stats | Hardcoded (speed 74, arrival 14:45, temp 28) | Misleading info |
| 31 | CC | Station detail fallbacks | Hardcoded names/addresses | Confusing when real data missing |
| 32 | pids-core | TRAIN_STATUS duplication | Not used by Schedule.status/PidsState.status | Type drift risk |
| 33 | pids-core | SENSOR_TYPE duplication | Not used by Sensor.sensor_type | Type drift risk |
| 34 | pids-core | LogEntry.data: any | No type safety | Runtime errors possible |
| 35 | pids-core | Station field mismatch | English interface vs Indonesian API fields | Confusion, mapping bugs |
| 36 | All | No tests | Zero test coverage | Regression risk |
| 37 | All | No API response validation | No Zod/io-ts | Silent data corruption |
| 38 | All | No RBAC enforcement | Operator accounts created but can't login | UX confusion |
| 39 | CC | No loading/error states | No spinners or fallback UI | Poor UX on slow/failing API |
| 40 | All | Inconsistent image fallbacks | External vs internal URLs | Broken images possible |

### 🟢 Minor (Polish/Architecture)

| # | Component | Feature | Status | Impact |
|---|-----------|---------|--------|--------|
| 41 | pids-core | No tsconfig.json | Relies on consumer configs | No isolated type checking |
| 42 | pids-core | 17 of 20 types unused | Forward planning or dead weight | Package bloat |
| 43 | pids-core | No runtime type guards | Compile-time only | No defense against malformed API data |
| 44 | HAL | HAL types in shared, not pids-core | Architectural inconsistency | Confusing import paths |
| 45 | Master | Audio/video settings | Minimal configuration options | Limited control |
| 46 | database.js | Placeholder comment | `// Placeholder for remaining specialized functions` | Incomplete CRUD coverage |

---

## 9. Priority Recommendations

### Phase 1 — Quick Wins (Remove Dead Code, Fix Obvious Bugs)

1. **Delete orphaned files**: `ServiceConfig.tsx`, `StationControl.tsx` (Selector), unused `StatCard` (CC Dashboard)
2. **Remove `useMapboxSystem.ts`** or integrate it into `MasterConsolePanel`
3. **Remove `DatabaseService.ts`** (client-side temp storage) — use PostgreSQL backend exclusively
4. **Fix pids-core type unification**: Make `Schedule.status` and `PidsState.status` derive from `TRAIN_STATUS`; same for `SENSOR_TYPE`
5. **Add `tsconfig.json`** to `pids-core` for isolated type checking

### Phase 2 — Stub Implementation (Wire Up Toolbar, Add Missing Endpoints)

6. **Implement missing backend endpoints**:
   - `PUT /api/trains/:id` — edit train
   - `PUT /api/schedules/:id` — edit schedule
   - `PUT /api/users/:id` — edit user
   - `GET /api/coaches` — real coach data for Stampformasi
   - `POST /api/media/upload` — file upload
   - `GET /api/gps/status` — GPS status

7. **Wire up Master toolbar buttons** to real API calls or remove them
8. **Connect Stampformasi tab** to `/api/coaches` endpoint
9. **Add edit functionality** to TrainsPage and SchedulesPage
10. **Add multi-stop schedule support** (link to routes, populate stops array)

### Phase 3 — Replace Simulated Data

11. **Replace random station status** with real API data (or remove the columns if backend doesn't provide them)
12. **Replace hardcoded fullscreen map stats** with API data or remove them
13. **Replace hardcoded station detail fallbacks** with "N/A" or hide empty fields
14. **Replace hardcoded media attachments** with real file listing from `/api/media` or remove the section
15. **Get a real Maptiler API key** or remove satellite view option entirely

### Phase 4 — Hardware & Real-Time

16. **Create `HardwareAdapter.ts`** with real serial/GPIO implementations
17. **Implement RTSP/WebRTC proxy** for CCTV streaming
18. **Integrate real GPS NMEA parsing** from serial port
19. **Add Socket.IO connection status indicator** in all three apps

### Phase 5 — Quality & Testing

20. **Add unit tests** for pids-core types (runtime validators)
21. **Add component tests** for shared UI components
22. **Add integration tests** for API endpoints
23. **Add API response validation** (Zod schemas for request/response)
24. **Add loading states and error boundaries** to Command Center
25. **Implement RBAC** — Operator role gating, route guards

### Phase 6 — Polish

26. **Standardize image fallbacks** — use internal static assets only
27. **Expand audio/video settings** with full configuration options
28. **Add "Message PIC" integration** (email/SMS/notification system)
29. **Add geofencing visualization** on Master map (inner/outer radius circles)
30. **Add export functionality** — export logs, schedules, routes to CSV/PDF

---

## Appendix: ConsoleServer Clarification

**No `consoleserver` or `console-server` package exists in this project.** The monorepo contains exactly 5 packages:
- `master-app`
- `selector-app`
- `command-center-app`
- `shared`
- `pids-core`

If "consoleserver" refers to the backend API server, it is located at `master-app/electron/api.js` (Express + Socket.IO on port 3001), which serves as the central API gateway for all three apps.

---

*Analysis complete. Total items identified: **46** (21 Critical, 18 Moderate, 7 Minor).*
