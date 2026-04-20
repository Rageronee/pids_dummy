# Eltran PIDS Dummy 🚆

Proyek micro-frontend Passenger Information Display System (PIDS) menggunakan React, Electron, dan PostgreSQL. Dirancang untuk simulasi dan scaffolding sistem informasi kereta api.

## 🚀 Quick Start (Untuk Developer)

Ikuti langkah-langkah berikut untuk menjalankan proyek di komputer lokal Anda:

### 1. Persiapan

Pastikan Anda sudah menginstal:

- **Node.js** (v18+)
- **Docker Desktop**
- **Git**

### 2. Instalasi

Clone repositori dan instal dependensi:

```bash
git clone https://github.com/Rageronee/pids_dummy.git
cd Eltran-PIDS-Dummy
npm install
```

### 3. Jalankan Database (Docker)

Proyek ini membutuhkan PostgreSQL. Jalankan perintah ini untuk menyalakan database di background:

```bash
docker-compose up -d
```

> [!TIP]
> Anda bisa mengakses **Adminer** (Database UI) di `http://localhost:8080` untuk melihat data secara langsung.

### 4. Menjalankan Aplikasi

Untuk menjalankan semua aplikasi sekaligus (Master, Selector, Command Center):

```bash
npm run dev:all
```

### 5. Operasional & Keamanan

- Login memakai session berbasis role `Admin` dan `Operator`.
- Endpoint audit dan backup dilindungi admin-only:
  - `GET /api/logs`
  - `GET /api/admin/backups`
  - `POST /api/admin/backups`
  - `POST /api/admin/backups/restore`
- Audit trail ditulis ke database dan dimirror ke `Eltran-PIDS-Dummy/packages/master-app/runtime/audit/`.
- Backup snapshot disimpan ke `Eltran-PIDS-Dummy/packages/master-app/runtime/backups/`.
- Health check tersedia di `GET /api/health`.
- Jika backend tidak berjalan di `localhost:3001`, set `VITE_API_URL` pada environment aplikasi frontend.

## 🏗️ Arsitektur Proyek

- `packages/master-app`: Hub sentral dan API Gateway (Port 3001).
- `packages/selector-app`: Interface untuk operatur/konduktor (Port 5174).
- `packages/command-center-app`: Admin panel untuk rute dan monitoring (Port 5176).
- `packages/shared`: Komponen dan logic Hardware Abstraction Layer (HAL) yang digunakan bersama.

## 🛠️ Hardware Abstraction Layer (HAL)

Sistem ini menggunakan HAL untuk memisahkan logic aplikasi dari hardware fisik.

- **Dummy Mode**: Default. Menggunakan simulasi data sensor dan display.
- **Hardware Mode**: Siap dikonfigurasi untuk koneksi serial/GPIO ke LED P10, TV, dan sensor GNSS asli.

---
**Status**: Development / Scaffolding
**Author**: Muhammad Afnan Risandi
