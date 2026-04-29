# Panduan Menjalankan Development PIDS (Passenger Information Display System)

Dokumen ini menjelaskan langkah-langkah teknis untuk menjalankan lingkungan pengembangan (development environment) project PIDS secara lengkap.

---

## Prasyarat Sistem

Sebelum memulai, pastikan sistem Anda sudah terinstal:

1. **Node.js**: Versi 18.x atau 20.x (LTS).
2. **Docker & Docker Compose**: Untuk menjalankan database PostgreSQL.
3. **NPM**: Biasanya sudah sepaket dengan Node.js.

---

## Langkah-Langkah Menjalankan (Step-by-Step)

### 1. Persiapan Database (Docker)

Aplikasi ini membutuhkan PostgreSQL. Kita akan menjalankannya menggunakan Docker agar tidak mengotori OS lokal.

* Buka terminal/CMD di root folder project.
* Jalankan perintah berikut:

    ```bash
    docker-compose up -d
    ```

* **Cek Status**: Pastikan container berjalan dengan perintah `docker ps`. Anda seharusnya melihat `pids-postgres` dan `pids-adminer` aktif.

### 2. Instalasi Dependency

Project ini menggunakan struktur **Monorepo**. Anda hanya perlu menjalankan install satu kali di root folder.

* Jalankan perintah:

    ```bash
    npm install
    ```

    *(Ini akan menginstall semua library untuk Master App, Selector App, dan Command Center secara otomatis).*

### 3. Konfigurasi Environment (`.env`)

Aplikasi perlu tahu di mana database berada.

* Copy file `.env.example` menjadi `.env`:

    ```bash
    # Jika di Windows (PowerShell):
    cp Eltran-PIDS-Dummy/.env.example Eltran-PIDS-Dummy/.env
    ```

* Buka file `.env` dan pastikan `DATABASE_URL` sesuai dengan setting Docker:

    ```env
    DATABASE_URL=postgresql://postgres:postgres@localhost:5432/eltran_pids
    ```

### 4. Menjalankan Aplikasi (Mode Development)

Ini adalah langkah utama. Kita akan menyalakan semua aplikasi (Vite + Electron) sekaligus.

* Masuk ke folder project utama:

    ```bash
    cd Eltran-PIDS-Dummy
    ```

* Jalankan perintah sakti:

    ```bash
    npm run dev:all
    ```

**Apa yang terjadi setelah menjalankan command ini?**
Terminal akan membuka 6 proses secara paralel:

1. **3x Vite Servers**: Menghandle Hot Reload untuk frontend (React).
2. **3x Electron Apps**: Membuka 3 window aplikasi (Master, Selector, Command Center).

---

## 🖥️ Akses Aplikasi & Database

| Aplikasi | Alamat Dev (Browser) | Keterangan |
| :--- | :--- | :--- |
| **Master App** | `http://localhost:5173` | Display utama PIDS. |
| **Selector App** | `http://localhost:5174` | Panel kontrol operator. |
| **Command Center**| `http://localhost:5176` | Monitoring fleet & rute. |
| **Adminer (DB UI)**| `http://localhost:8080` | Untuk melihat isi database via browser. |

---

## 🛑 Cara Mematikan & Reset

### Mematikan Aplikasi

Jika ingin berhenti, tekan `Ctrl + C` di terminal yang menjalankan `npm run dev:all`.
*Khusus pengguna Windows*, jika proses tidak tertutup sempurna, gunakan:

```bash
npm run stop:all
```

### Mematikan Database

Jika ingin mematikan database Docker:

```bash
docker-compose down
```

---

## ❓ Troubleshooting (Masalah Umum)

1. **Error: "Database connection failed"**
    * Pastikan Docker sudah menyala (`docker ps`).
    * Cek apakah port `5432` sudah dipakai aplikasi lain (misal Postgres lokal). Jika iya, matikan dulu Postgres lokal Anda.
2. **Window Electron Putih/Blank**
    * Biasanya karena Vite belum selesai loading. Tunggu beberapa detik, atau tutup aplikasi dan jalankan kembali.
3. **Port 5173/5174/5176 busy**
    * Artinya ada proses lama yang belum mati. Gunakan `npm run stop:all` atau restart terminal Anda.

---
*Dokumen ini dibuat untuk kebutuhan internal magang Eltran PIDS.*
