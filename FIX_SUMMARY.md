# PIDS - Fix Summary & Running Guide

## Masalah yang Ditemukan

Ketika kamu tidak bisa login dengan pesan **"Tidak dapat terhubung ke Master. Pastikan Master App aktif."**, ada 3 masalah utama:

### 1. ⚠️ Konflik PostgreSQL (Penyebab Utama)
- **PostgreSQL lokal** (versi 18 terinstall di Windows) dan **PostgreSQL Docker** sama-sama jalan di port 5432
- Aplikasi connect ke localhost:5432 tapi malah kena PostgreSQL lokal yang authentication-nya berbeda
- **Solusi**: Stop PostgreSQL lokal → `net stop postgresql-x64-18` (run as Administrator)

### 2. ⚠️ Database Belum Dibuat
- Docker container PostgreSQL sudah running tapi database `eltran_pids` belum dibuat
- **Solusi**: `docker exec -i pids-postgres createdb -U postgres eltran_pids`

### 3. ⚠️ Path File Stations Salah
- `database.js` mencari `stations_master.json` di path yang salah (`../../shared/data/` seharusnya `../../shared/data/`)
- **Solusi**: Fixed path di `packages/master-app/electron/database.js` line 545

### 4. ⚠️ Tabel Lama (gerbong/sensor) vs Tabel Baru (coaches/sensors)
- Code seeding masih pakai nama tabel lama untuk sensor seeding
- **Solusi**: Updated query ke `coaches` dan `sensors` (bukan `gerbong` dan `sensor`)

### 5. ⚠️ Master App Tidak Start API Server
- `npm run dev:master` hanya menjalankan Vite (frontend), BUKAN API server backend
- API server (Express + Socket.IO di port 3001) hanya start saat Electron jalan
- **Solusi**: Gunakan `node start-api.mjs` untuk start API tanpa Electron

---

## Cara Menjalankan PIDS (Step by Step)

### Prerequisites
1. **Docker Desktop** - Harus running
2. **Node.js** - Sudah terinstall
3. **PostgreSQL lokal di-stop** - Jangan sampai konflik port 5432

### Step 1: Start Database (Docker)
```powershell
cd "F:\Muhammad Afnan Risandi\02_Projects\Learning\Magang\Eltran\PIDS\Dummy"
docker compose up -d
```

Tunggu sampai PostgreSQL healthy (sekitar 10 detik).

### Step 2: Seed Database (Pertama Kali Saja)
```powershell
cd "F:\Muhammad Afnan Risandi\02_Projects\Learning\Magang\Eltran\PIDS\Dummy\Eltran-PIDS-Dummy\packages\master-app"
node seed-database.mjs
```

Output yang diharapkan:
```
[PIDS-DB] ✓ 44 stations seeded from JSON
[PIDS-DB] ✓ Train services seeded
[PIDS-DB] ✓ Route MALABAR: 29 stops
[PIDS-DB] ✓ Coaches seeded for MALABAR: 8 cars
[PIDS-DB] ✓ GPS sensors seeded
[PIDS-DB] ✅ All seed data verified and complete
```

### Step 3: Start API Server (Backend)
```powershell
cd "F:\Muhammad Afnan Risandi\02_Projects\Learning\Magang\Eltran\PIDS\Dummy\Eltran-PIDS-Dummy\packages\master-app"
node start-api.mjs
```

API akan running di:
- REST API: `http://localhost:3001`
- Socket.IO: `ws://localhost:3001`

### Step 4: Start Frontend Apps

Di terminal **baru**, start frontend yang kamu butuhkan:

**Master App:**
```powershell
cd "F:\Muhammad Afnan Risandi\02_Projects\Learning\Magang\Eltran\PIDS\Dummy"
npm run dev:master
```
Buka: `http://localhost:5173`

**Selector App:**
```powershell
npm run dev:selector
```
Buka: `http://localhost:5174`

**Command Center App:**
```powershell
npm run dev:cc
```
Buka: `http://localhost:5176`

### Step 5: Login
Buka browser ke salah satu frontend app (misal `http://localhost:5173`)

**Default Credentials:**
| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | Admin |
| `operator` | `operator123` | Operator |

---

## File yang Diperbaiki

| File | Perubahan |
|------|-----------|
| `docker-compose.yml` | Tambah `POSTGRES_HOST_AUTH_METHOD: md5`, custom pg_hba.conf mount |
| `pg_hba_custom.conf` | Baru - set trust authentication untuk development |
| `Eltran-PIDS-Dummy/packages/master-app/.env` | Baru - DATABASE_URL untuk backend |
| `Eltran-PIDS-Dummy/packages/master-app/electron/database.js` | Fix path stations_master.json + fix sensor seeding |
| `Eltran-PIDS-Dummy/check_db.js` | Update password dari `greget371` ke `postgres` |

## Helper Scripts yang Dibuat

| Script | Fungsi |
|--------|--------|
| `seed-database.mjs` | Initialize & seed database tanpa Electron |
| `start-api.mjs` | Start API server (Express + Socket.IO) tanpa Electron |
| `test-connection.mjs` | Test koneksi database |
| `diagnose.ps1` | Diagnostic tool untuk cek semua komponen |

---

## Troubleshooting

### Port 5432 masih dipakai PostgreSQL lokal?
```powershell
# Cek process yang pakai port 5432
netstat -ano | findstr ":5432"

# Stop PostgreSQL lokal (run as Administrator)
net stop postgresql-x64-18

# Atau disable service supaya tidak auto-start
sc config postgresql-x64-18 start= disabled
```

### Docker container tidak mau start?
```powershell
# Stop semua container
docker compose down -v

# Start ulang
docker compose up -d

# Cek logs
docker logs pids-postgres
```

### Database error setelah code update?
```powershell
# Drop semua tabel
docker exec -i pids-postgres psql -U postgres -d eltran_pids -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Re-seed
node seed-database.mjs
```

### API server tidak bisa connect ke database?
```powershell
# Test koneksi
node test-connection.mjs

# Pastikan .env ada dan benar
cat .env
# DATABASE_URL=postgres://postgres:postgres@localhost:5432/eltran_pids
```

---

## Arsitektur Singkat

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (React)                   │
│  Master App :5173 │ Selector :5174 │ CC App :5176   │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP + Socket.IO
                       ▼
┌─────────────────────────────────────────────────────┐
│              API Server (Express) :3001              │
│         + Socket.IO for real-time updates            │
└──────────────────────┬──────────────────────────────┘
                       │ pg driver
                       ▼
┌─────────────────────────────────────────────────────┐
│          PostgreSQL Docker :5432                     │
│  Database: eltran_pids                               │
│  Tables: stations, users, schedules, coaches, etc.   │
└─────────────────────────────────────────────────────┘
```

---

**Last Updated**: 7 April 2026
**Status**: ✅ Working
