# PANDUAN PENGGUNA & OPERASIONAL LENGKAP PIDS V2.0

## Passenger Information Display System - Integrated Digital Solution

---

## 1. PENDAHULUAN & PENINGKATAN PARADIGMA PIDS V2.0

Sistem Informasi Informasi Penumpang (PIDS) Versi 2.0 merupakan rekayasa ulang total dari sistem PIDS V1 (Legacy ERKA). PIDS V2.0 bertransformasi dari prototipe berbasis perangkat keras kaku menjadi **Software-Defined Solution** terintegrasi berstandar industri perkeretaapian modern.

### Perbandingan Komprehensif Dimensi Teknis

| Dimensi Fitur | PIDS V1 (Legacy ERKA) | PIDS V2.0 (Modern Suite) |
| :--- | :--- | :--- |
| **Teknologi Utama** | HTML/JS Statis & Firmware Keras | React 18, TypeScript, & Electron Framework |
| **Penyimpanan Data** | Flat JSON / Excel (Risiko data duplikat tinggi) | PostgreSQL (Relational Integrity) & Redis Cache |
| **Komunikasi Data** | Refresh Manual / Polling Statis | WebSockets Real-Time (Socket.io) dengan latensi <50ms |
| **Keamanan Sesi** | Tanpa Autentikasi | JWT (JSON Web Token) Gateway Security |
| **Antarmuka (UI)** | Klasik, Padat Bayangan, Kaku | Industrial Minimalism & Layout Bento Grid |
| **Sistem Navigasi** | Peta Gambar Statis / Leaflet Dasar | MapLibre GL Vector Engine & Live Fleet Tracking |
| **Resiliensi** | Tanpa Backup Otomatis | Automatic Disaster Recovery & Structured Audit Logs |

---

## 2. ARSITEKTUR MONOREPO & ALIRAN DATA REAL-TIME

Ekosistem PIDS V2.0 dibangun di atas satu repositori terpusat (*monorepo*) dengan pembagian tugas yang ketat untuk menjamin konsistensi data di seluruh rangkaian kereta dan pusat kendali:

```mermaid
graph TD
    CC[Command Center App] <-->|Socket.io / REST API| Server[PIDS Core REST / WebSockets]
    PM[PIDS Master App - Kereta Makan] <-->|Socket.io / REST API| Server
    PS[PIDS Selector App - Conductor Panel] <-->|Socket.io / REST API| Server
    Server <--> Database[(PostgreSQL & Redis)]
```

* **PIDS Core Server**: Mengatur pertukaran data (koordinat GPS, status stasiun, sensor suhu, kecepatan) menggunakan WebSocket (Socket.io). Latensi sinkronisasi antar-aplikasi terjamin di bawah 50ms.
* **Keamanan Token (JWT)**: Setiap pertukaran data API dilindungi oleh kunci JWT. Jika sesi token kedaluwarsa, aplikasi akan otomatis mengarahkan pengguna kembali ke halaman Login.

---

## 3. PANDUAN INSTALASI & MENJALANKAN APLIKASI

Panduan ini menjelaskan langkah demi langkah untuk melakukan kloning repositori, instalasi dependensi, konfigurasi basis data, hingga menjalankan seluruh ekosistem PIDS V2.0 dalam lingkungan pengembangan lokal.

### 3.1. Prasyarat Sistem (Prerequisites)

Sebelum memulai instalasi, pastikan sistem Anda telah terpasang perangkat lunak berikut:

* **Node.js** (Versi LTS direkomendasikan, minimal v18.x atau lebih baru)
* **npm** (Bawaan dari instalasi Node.js)
* **PostgreSQL Database Server** (Berjalan secara lokal di port default 5432)
* **Docker Desktop & Docker Compose** (Opsional, jika ingin menjalankan aplikasi via kontainer)
* **Git** (Untuk mengambil kode sumber dari repositori)
* *Catatan*: Aplikasi ini menggunakan arsitektur monorepo dengan fitur **npm workspaces** bawaan Node.js/npm.

### 3.2. Langkah 1: Kloning Repositori

Buka terminal/command prompt/PowerShell di komputer Anda, lalu jalankan perintah berikut untuk mengunduh kode sumber:

```bash
git clone <URL_REPOSITORI_PIDS_DUMMY>
cd Eltran-PIDS-Dummy
```

*(Ganti `<URL_REPOSITORI_PIDS_DUMMY>` dengan tautan Git repositori resmi Anda)*

### 3.3. Langkah 2: Instalasi Dependensi Monorepo

Ekosistem PIDS V2.0 menggunakan npm workspaces sehingga semua dependensi untuk `packages/master-app`, `packages/selector-app`, `packages/command-center-app`, dan paket penunjang lainnya dapat dipasang sekaligus secara otomatis dari root direktori.
Jalankan perintah berikut di root folder proyek (`Eltran-PIDS-Dummy`):

```bash
npm install
```

Perintah ini akan membaca berkas `package.json` di root dan mengonfigurasi tautan dependensi lokal antar-paket (`packages/shared`, `packages/pids-core`, dll.) secara otomatis.

### 3.4. Menjalankan Aplikasi Menggunakan Docker (Docker Compose)
Selain menjalankan aplikasi secara lokal dengan Node.js dan mengompilasi `.exe`, Anda juga dapat mendeploy seluruh ekosistem PIDS V2.0 ke dalam kontainer **Docker** menggunakan **Docker Compose** yang sudah disediakan.

Mekanisme ini sangat cocok untuk pengujian rilis produksi berbasis web di server lokal/uji.

#### Langkah A: Pastikan Docker Desktop Telah Aktif
Pastikan Docker Daemon/Docker Desktop sudah berjalan di komputer Anda.

#### Langkah B: Bangun & Jalankan Kontainer
Buka terminal di root direktori proyek (`Eltran-PIDS-Dummy`), lalu jalankan perintah berikut:
```bash
docker-compose up -d --build
```
Perintah ini akan secara otomatis:
1. Membangun image backend menggunakan target `backend` dari `Dockerfile`.
2. Membangun image frontend (React) dan menempatkannya di server Nginx web container menggunakan target `frontend`.
3. Menjalankan kontainer basis data PostgreSQL (`postgres:15-alpine`) dan Redis Cache secara otomatis dengan konfigurasi volume persisten.
4. Menjalankan adminer pada port `8081` untuk manajemen basis data.

#### Langkah C: Akses Layanan Aplikasi
Setelah semua kontainer berstatus `Up` (Running), Anda dapat mengakses ketiga aplikasi PIDS secara bersamaan melalui browser dengan port HTTP default (`80`):
*   **PIDS Master App (Kereta Makan)**: [http://localhost/master/](http://localhost/master/) (atau diarahkan langsung dari root [http://localhost/](http://localhost/))
*   **PIDS Selector App (Conductor Console)**: [http://localhost/selector/](http://localhost/selector/)
*   **PIDS Command Center App**: [http://localhost/cc/](http://localhost/cc/)
*   **Database Management (Adminer)**: [http://localhost:8081](http://localhost:8081)
    *   *System*: `PostgreSQL`
    *   *Server*: `db`
    *   *Username*: `postgres`
    *   *Password*: `eltran123`
    *   *Database*: `eltran_pids`

#### Langkah D: Menghentikan Kontainer
*   **Menghentikan semua kontainer (data database tetap tersimpan)**:
    ```bash
    docker-compose down
    ```
*   **Menghentikan semua kontainer sekaligus menghapus data database (reset total)**:
    ```bash
    docker-compose down -v
    ```

### 3.5. Langkah 3: Konfigurasi Environment Variables (`.env`)

Salin berkas template konfigurasi lingkungan `.env.example` menjadi berkas `.env` baru:

* **Di Windows (CMD):**

    ```cmd
    copy .env.example .env
    ```

* **Di Windows (PowerShell) / Linux / macOS:**

    ```bash
    cp .env.example .env
    ```

Buka berkas `.env` yang baru dibuat menggunakan teks editor Anda (seperti VS Code atau Notepad), lalu isi parameter berikut sesuai dengan pengaturan PostgreSQL lokal Anda:

```env
# PostgreSQL Connection (REQUIRED)
# Format: postgresql://<user>:<password>@<host>:<port>/<database>
DATABASE_URL=postgresql://postgres:KATA_SANDI_POSTGRES_ANDA@localhost:5432/eltran_pids

# API Server Port (default: 3001)
API_PORT=3001

# Vite Dev Server Ports (default ports)
VITE_MASTER_PORT=5173
VITE_SELECTOR_PORT=5174
VITE_CC_PORT=5176
```

> [!IMPORTANT]
> Pastikan Anda telah membuat basis data baru bernama `eltran_pids` di PostgreSQL server Anda sebelum menjalankan aplikasi. Anda dapat membuatnya melalui PGAdmin atau terminal psql dengan perintah: `CREATE DATABASE eltran_pids;`.

### 3.6. Langkah 4: Migrasi & Inisialisasi Basis Data (Database)

Aplikasi PIDS V2.0 telah dirancang untuk mendeteksi ketersediaan skema basis data secara otomatis saat pertama kali dijalankan.

* **Skema Otomatis**: Server utama (`master-app` backend) akan mendeteksi apakah tabel-tabel data sudah ada di PostgreSQL.
* **Migrasi & Seed Otomatis**: Jika tabel belum terbentuk, sistem secara otomatis akan menjalankan proses migrasi pembuatan tabel (termasuk relasi `stations`, `routes`, `schedules`, `users`, dll.) dan melakukan pengisian data awal (*seeding* otomatis) dari berkas data `seed_data.json`.
* **Autosave/Backup**: Setelah database siap, sistem akan otomatis melakukan backup berkas JSON lokal yang terstruktur ke dalam folder `runtime/backups/`.

### 3.7. Langkah 5: Menjalankan Aplikasi Secara Simultan

Untuk menjalankan seluruh ekosistem PIDS V2.0 sekaligus (Master App, Selector App, dan Command Center App) baik di sisi Vite web dev server maupun jendela desktop Electron, Anda cukup menjalankan satu perintah pemersatu dari root direktori:

```bash
npm run dev:all
```

Perintah ini akan memanfaatkan modul `concurrently` untuk mengeksekusi proses-proses berikut secara paralel:

1. **Vite Dev Server**:
    * `vite:master` (Master App) di `http://localhost:5173`
    * `vite:selector` (Selector App) di `http://localhost:5174`
    * `vite:cc` (Command Center) di `http://localhost:5176`
2. **Electron Instance**:
    * `electron:master` (Membuka jendela desktop Master App)
    * `electron:selector` (Membuka jendela desktop Selector App)
    * `electron:cc` (Membuka jendela desktop Command Center App)

### 3.8. Perintah Tambahan yang Berguna

* **Menghentikan Seluruh Aplikasi (Windows)**:
    Jika Anda mengalami kendala port bentrok atau ingin menutup paksa semua proses latar belakang Node dan Electron yang masih aktif, jalankan:

    ```bash
    npm run stop:all
    ```

* **Menghidupkan Ulang Bersih (Clean restart)**:
    Melakukan pemberhentian paksa seluruh server dan langsung menyalakannya kembali secara berurutan:

    ```bash
    npm run clean:dev
    ```

* **Melakukan Build Produksi**:
    Untuk memaketkan semua aplikasi ke dalam bundle produksi siap rilis:

    ```bash
    npm run build
    ```

### 3.9. Pemaketan Aplikasi ke Format Executable (.exe)

Untuk mendistribusikan aplikasi PIDS V2.0 ke lingkungan produksi riil di atas kereta, Anda dapat memaketkan masing-masing aplikasi (`master-app`, `selector-app`, dan `command-center-app`) menjadi berkas installer mandiri (`.exe`) menggunakan **electron-builder**.

Berikut adalah panduan konfigurasinya:

#### Langkah A: Pasang `electron-builder` di Root Proyek

Jalankan perintah ini di root direktori proyek (`Eltran-PIDS-Dummy`) untuk memasang `electron-builder` sebagai dependensi pengembangan di monorepo:

```bash
npm install --save-dev electron-builder
```

#### Langkah B: Tambahkan Konfigurasi Build pada `package.json` Aplikasi

Tambahkan blok konfigurasi `"build"` ke dalam berkas `package.json` di masing-masing sub-aplikasi yang ingin dipaketkan.

##### 1. Master App (`packages/master-app/package.json`)

Buka berkas tersebut dan tambahkan properti berikut di tingkat utama (root JSON sub-aplikasi):

```json
  "build": {
    "appId": "com.eltran.pids.master",
    "productName": "PIDS Master App",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      "dist/**/*",
      "electron/**/*",
      "package.json"
    ],
    "win": {
      "target": "nsis"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
```

##### 2. Selector App (`packages/selector-app/package.json`)

Buka berkas tersebut dan tambahkan properti berikut:

```json
  "build": {
    "appId": "com.eltran.pids.selector",
    "productName": "PIDS Selector App",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      "dist/**/*",
      "electron/**/*",
      "package.json"
    ],
    "win": {
      "target": "nsis"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
```

##### 3. Command Center App (`packages/command-center-app/package.json`)

Buka berkas tersebut dan tambahkan properti berikut:

```json
  "build": {
    "appId": "com.eltran.pids.cc",
    "productName": "PIDS Command Center App",
    "directories": {
      "output": "dist-electron"
    },
    "files": [
      "dist/**/*",
      "electron/**/*",
      "package.json"
    ],
    "win": {
      "target": "nsis"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true
    }
  }
```

#### Langkah C: Tambahkan Script Pemaketan di Root `package.json`

Buka berkas `package.json` di root direktori proyek (`Eltran-PIDS-Dummy`), kemudian tambahkan perintah-perintah pemaketan di bawah properti `"scripts"` agar proses build dapat dijalankan langsung secara terpusat:

```json
    "package:master": "electron-builder build --project packages/master-app --win",
    "package:selector": "electron-builder build --project packages/selector-app --win",
    "package:cc": "electron-builder build --project packages/command-center-app --win",
    "package:all": "npm run build && npm run package:master && npm run package:selector && npm run package:cc"
```

#### Langkah D: Jalankan Pemaketan

Kini Anda dapat memicu kompilasi dan pemaketan seluruh aplikasi sekaligus menjadi file installer `.exe` dengan menjalankan perintah tunggal di root direktori:

```bash
npm run package:all
```

Proses ini akan:

1. Mengompilasi seluruh frontend React dengan Vite ke folder `/dist` masing-masing workspace.
2. Membundel kode server node backend (`api.js`), database (`database.js`), file seeder, dan berkas index.html statis ke dalam format binary yang aman.
3. Menghasilkan berkas installer `.exe` di folder `/dist-electron` masing-masing sub-aplikasi (misal: `packages/master-app/dist-electron/PIDS Master App Setup 0.0.1.exe`).

> [!TIP]
> **Pemuatan Environment Variables pada Aplikasi Terpaket:**
> Ketika aplikasi berjalan dari hasil instalasi `.exe`, sistem backend akan memuat berkas `.env` yang berada di dalam folder instalasi (atau direktori kerja *resources/app/*). Pastikan Anda menyalin berkas `.env` berisi `DATABASE_URL` ke dalam direktori aplikasi tersebut agar server lokal tetap terhubung ke PostgreSQL.

---

## 4. PANDUAN PENGGUNAAN A-Z: COMMAND CENTER APP

Aplikasi Command Center berfungsi sebagai pusat pemantauan seluruh rangkaian kereta yang aktif serta administrasi data master (stasiun, rute, jadwal, dan pengguna).

### 4.1. Halaman Login

* **Fungsi**: Membatasi hak akses aplikasi hanya untuk operator resmi.
* **Kolom Isian**:
  * *Username*: Nama pengguna terdaftar.
  * *Password*: Kata sandi akun.
* **Aksi**:
  * Tombol **Login**: Memvalidasi kredensial ke server pusat, menerbitkan JWT Token, dan mengarahkan ke Dasbor Utama jika sukses.

> **[TEMPAT FOTO: Laman Login Command Center App]**

### 4.2. Menu Dashboard (Live Fleet Tracking)

* **Fungsi**: Menampilkan visualisasi pergerakan kereta di atas peta digital.
* **Komponen Layar**:
  * **Peta Vektor MapLibre GL**: Peta interaktif yang merender jalur kereta dan stasiun.
  * **Marker Kereta Aktif**: Ikon lokomotif yang bergerak real-time berdasarkan data GPS rangkaian.
  * **Fleet Operational Status Grid**: Panel daftar kartu kereta di bawah peta yang menampilkan ringkasan telemetri aktif.
* **Aksi**:
  * *Klik Marker/Kartu Kereta*: Melakukan auto-focus kamera peta ke koordinat GPS kereta tersebut, memunculkan popup rute yang dilewati, stasiun asal, stasiun tujuan, stasiun berikutnya, ETA, kecepatan saat ini, arah laju (heading), dan status operasional.

> **[TEMPAT FOTO: Laman Dashboard Utama - Peta Vektor & Live Fleet Tracking]**

### 4.3. Menu Manajemen Kereta (Trains)

* **Fungsi**: Mengonfigurasi properti fisik rangkaian kereta api.
* **Kolom Isian Form Tambah/Edit**:
  * *Nama Kereta*: Contoh: "Malabar", "Argo Wilis".
  * *Nomor Kereta (KA Number)*: Kode identifikasi unik kereta (misal: "KA 67").
  * *Kategori*: Pilihan dropdown antara "EKSEKUTIF" atau "EKONOMI PREMIUM".
  * *Rute Aktif*: Dropdown memilih rute perjalanan yang akan ditugaskan.
  * *Jumlah Gerbong*: Jumlah unit kereta dalam satu rangkaian.
* **Aksi**:
  * Tombol **Tambah Kereta / Add Train**: Membuka form entri baru.
  * Tombol **Edit** (Ikon Pensil): Mengubah properti kereta terpilih.
  * Tombol **Delete** (Ikon Sampah): Menghapus konfigurasi kereta dari sistem database.

> **[TEMPAT FOTO: Menu Manajemen Kereta - Daftar Armada & Form Konfigurasi Rangkaian]**

### 4.4. Menu Manajemen Stasiun (Stations)

* **Fungsi**: Mengelola database koordinat stasiun pemberhentian.
* **Kolom Isian Form**:
  * *Nama Stasiun*: Nama stasiun resmi (Contoh: "BANDUNG").
  * *Kode Stasiun*: Singkatan unik stasiun (Contoh: "BD").
  * *Latitude*: Titik koordinat lintang bumi.
  * *Longitude*: Titik koordinat bujur bumi.
* **Aksi**:
  * Tombol **Add Station**: Menambahkan stasiun baru ke peta.
  * Tombol **Edit / Delete**: Memperbarui atau menghapus stasiun.

> **[TEMPAT FOTO: Menu Manajemen Stasiun - Form Koordinat Geografis]**

### 4.5. Menu Manajemen Rute (Routes)

* **Fungsi**: Menyusun stasiun-stasiun pemberhentian menjadi satu jalur perjalanan utuh.
* **Kolom Isian Form**:
  * *Nama Rute*: Nama pengenal rute (Contoh: "MALABAR_GO").
  * *Daftar Stasiun*: Menambahkan stasiun dari database dan mengurutkannya menggunakan drag-and-drop.
* **Aksi**:
  * Tombol **Reverse Route**: Membalik urutan stasiun secara otomatis untuk membuat rute pulang (*BACK*).

> **[TEMPAT FOTO: Menu Manajemen Rute - Urutan Stasiun & Pembuat Garis Rel Geometris]**

### 4.6. Menu Jadwal Kereta (Schedules)

* **Fungsi**: Menetapkan jam operasional kedatangan dan keberangkatan pada setiap stasiun.
* **Kolom Isian Form**:
  * *Kereta*: Pilih nomor KA terdaftar.
  * *Tabel Waktu Stasiun*: Mengisi kolom jam kedatangan (*scheduled arrival*) dan jam keberangkatan (*scheduled departure*) untuk setiap stasiun di dalam rute terkait.
* **Aksi**:
  * Tombol **Save Schedule**: Menyimpan tabel waktu perjalanan ke PostgreSQL dan menyinkronkan ke Redis cache.

> **[TEMPAT FOTO: Menu Jadwal Kereta - Pengaturan Tabel Kedatangan & Keberangkatan]**

### 4.7. Menu Akun Operator (Users)

* **Fungsi**: Mengelola kredensial masuk pengguna aplikasi PIDS.
* **Kolom Isian Form**:
  * *Username*, *Nama Lengkap*, *Password*, dan *Role* (pilihan: "Admin" atau "Operator").
* **Aksi**:
  * Tombol **Reset Password**: Mengatur ulang kata sandi pengguna secara instan.

> **[TEMPAT FOTO: Menu Akun Operator - Kontrol Akses Pengguna & Reset Sandi]**

### 4.8. Menu System Logs (Audit Trail)

* **Fungsi**: Menampilkan log riwayat aktivitas operasional untuk kebutuhan audit forensik.
* **Informasi yang Ditampilkan**: Waktu kejadian (*timestamp*), kategori aksi (LOGIN, LOGOUT, STATE_UPDATE, LED_CONFIG, ADMIN_CRUD, SYSTEM), nama pengguna yang melakukan aksi, tingkat otoritas (Role), dan rincian detail keterangan aktivitas.
* **Aksi**:
  * Tombol **Filter Kategori**: Menyaring log berdasarkan jenis aksi tertentu.

> **[TEMPAT FOTO: Menu System Logs - Tabel Rekaman Audit Trail Sistem]**

### 4.9. Menu Notifications (Pusat Darurat & Tindakan)

* **Fungsi**: Menerima peringatan kegagalan sistem atau keadaan darurat di atas kereta secara real-time.
* **Antarmuka 2-Kolom**:
  * **Daftar Kiri (Feed Notifikasi)**: Menampilkan log notifikasi aktif yang belum diatasi (misal: Operational Alert KA Argo Wilis). Notifikasi yang belum dibaca ditandai dengan dot oranye menyala dan badge "Active".
  * **Panel Kanan (Detail Aksi & Template Khusus)**: Menyediakan visualisasi dinamis dan kontrol interaktif sesuai tipe notifikasi:
* **Visualisasi & Tombol Tindakan**:
  * **Template Notifikasi Operational (Kritis)**:
    * Menampilkan nama kereta, koordinat kilometer (KM), kecepatan saat ini, dan jumlah penumpang.
    * Merender **Peta Jalur SVG**: Menunjukkan posisi stasiun asal, stasiun tujuan, dan ikon bahaya (hazard) merah berkedip di lokasi spesifik kejadian luar biasa.
    * Tombol **Hubungi Masinis**: Membuka dialog panggilan VOIP suara nirkabel ke lokomotif secara real-time. Menampilkan gelombang audio dinamis (*voice wave indicator*) dan durasi stopwatch panggilan aktif. Menutup panggilan dengan tombol **Hang Up** akan menyimpan rekaman durasi panggilan.
    * Tombol **Kirim Tim Rescue**: Membuka modal konfigurasi penyelamatan. Operator memilih jumlah personel (3, 5, 8, atau 12 Crew) dan jenis transportasi darurat (*Rescue Train*, *Railcar*, atau *Road-Rail Jeep*). Proses pengiriman sinyal disimulasikan dengan animasi loading sebelum memancarkan status sukses ke sistem pusat.
  * **Template Notifikasi Update (Informasi)**:
    * Menampilkan detail rilis jadwal baru dan berkas sinkronisasi.
    * Tombol **Download Sync Report**: Mengunduh berkas laporan sinkronisasi JSON.
    * Tombol **Force Sync Display**: Memaksa pengiriman ulang data rute ke 12 gerbong sekaligus melalui jaringan lokal.

> **[TEMPAT FOTO: Laman Notifications - Antarmuka 2-Kolom & Detail Panel Taktis]**

> **[TEMPAT FOTO: Modal Popup - Dialog Panggilan VOIP Masinis dengan Waveform]**

> **[TEMPAT FOTO: Modal Popup - Pengiriman Tim Penyelamat / Rescue Dispatcher]**

> **[TEMPAT FOTO: Modal Popup - Progress Bar OTA Reboot Modul GPS]**

> **[TEMPAT FOTO: Tampilan Stack Floating Toast Notification]**

---

## 5. PANDUAN PENGGUNA REKAYASA: PIDS MASTER APP (KERETA MAKAN)

PIDS Master dipasang pada unit server gerbong restorasi (kereta makan) untuk bertindak sebagai koordinator lokal yang menyalurkan data informasi ke seluruh gerbong penumpang.

### 5.1. Tab PIDS Dashboard (Konsol Master)

* **Fungsi**: Menampilkan parameter dinamis utama kereta.
* **Informasi Layar**:
  * *Current Position*: Nama stasiun tempat kereta berada saat ini.
  * *Next Station*: Nama stasiun pemberhentian berikutnya beserta estimasi jam tiba (ETA).
  * *Speedometer*: Mengukur kecepatan laju lokomotif dalam km/h.
  * *Suhu Ruangan*: Rata-rata suhu interior gerbong (sensor celsius).
* **Aksi**:
  * Tombol **Running Text Speed**: Mengatur kelajuan pergeseran teks informasi di layar monitor penumpang.

> **[TEMPAT FOTO: PIDS Master - Dasbor Konsol Kereta Makan]**

### 5.2. Tab Stampformasi (Formasi Rangkaian)

* **Fungsi**: Menyusun tata letak fisik gerbong agar sistem penomoran unit PIDS selaras.
* **Komponen Layar**:
  * *Bento-Grid Carriage Layout*: Menampilkan kartu-kartu gerbong secara berurutan.
  * *Status Sinkronisasi Layar*: Setiap kartu gerbong menampilkan indikator status (Hijau: Aktif & Sinkron, Abu-abu: Layar Terputus).
* **Aksi**:
  * *Ubah Urutan*: Menyesuaikan letak gerbong makan, gerbong eksekutif, dan gerbong pembangkit.
  * Tombol **Force Sync**: Mengirimkan ulang paket konfigurasi stasiun ke gerbong terpilih secara individual.

> **[TEMPAT FOTO: PIDS Master - Konfigurasi Formasi Gerbong (Stampformasi)]**

### 5.3. Tab CCTV Monitor

* **Fungsi**: Memantau keamanan interior rangkaian kereta api secara visual.
* **Komponen Layar**:
  * *Layar Monitor Utama*: Menampilkan umpan video interior gerbong.
  * *Efek Scanning*: Efek garis pindai (scanline) animasi khas CCTV ruang kontrol.
* **Aksi**:
  * Tombol **Auto Play (Cycle Mode)**: Jika aktif, tayangan kamera CCTV akan bergantian berputar dari gerbong 1 ke gerbong berikutnya secara otomatis setiap 5 detik.
  * Tombol **Next / Prev Camera** (Ikon Panah): Mengganti tampilan kamera gerbong secara manual (otomatis mematikan mode Auto Play).
  * Tombol **Fullscreen** (Ikon Maximize): Memperbesar tayangan video CCTV memenuhi layar monitor master.
  * Dropdown **Pilih Lokasi Kamera**: Melompat langsung ke kamera interior gerbong spesifik yang ingin diawasi ketat.

> **[TEMPAT FOTO: PIDS Master - Layar Monitoring CCTV dengan Scanning Effect]**

### 5.4. Tab GPS MAP (Peta Lokal)

* **Fungsi**: Menampilkan peta digital rute perjalanan lokal kereta.
* **Informasi Layar**: Merender jalur rel kereta api, titik-titik stasiun yang akan dilewati, dan posisi marker lokomotif saat ini lengkap dengan sudut rotasi arah hadap (heading).

> **[TEMPAT FOTO: PIDS Master - Peta GPS Rangkaian Lokal]**

### 5.5. Tab TV MONITOR (Emulasi Layar Penumpang)

* **Fungsi**: Menampilkan tayangan visual yang disiarkan langsung ke monitor LCD gerbong penumpang.
* **Komponen Desain Layar**:
  * *Header*: Tanggal, Jam dinamis, Nomor KA, dan Nama Kereta.
  * *Middle Left*: Status Stasiun Saat Ini (Kecepatan, Suhu Gerbong, Nama Stasiun Terbesar).
  * *Middle Right (Multimedia Area)*: Memutar video promosi PT KAI atau panduan keselamatan perjalanan (*safety video*).
  * *Footer*: Running text yang menampilkan pesan sambutan, stasiun berikutnya, dan informasi keselamatan.

> **[TEMPAT FOTO: PIDS Master - Layar Emulasi Layar Informasi Penumpang (TV Gerbong)]**

---

## 6. PANDUAN PENGGUNAAN A-Z: PIDS SELECTOR APP (5-INCH CONSOLE)

Layar sentuh mini ini dioperasikan langsung oleh kondektur di atas kereta untuk melakukan penyesuaian manual cepat jika sambungan dengan pusat terputus.

### 6.1. Tampilan Utama Selector

* **Indikator Utama**:
  * *Current Station*: Menampilkan nama stasiun aktif saat ini.
  * *Next Station*: Menampilkan nama stasiun berikutnya lengkap dengan jam tiba ETA.
  * *Timeline Rute*: Garis vertikal visual yang memetakan stasiun sebelumnya (*passed*), stasiun saat ini (*active*), dan stasiun berikutnya (*upcoming*).

> **[TEMPAT FOTO: PIDS Selector - Tampilan Beranda Utama (Selector Home)]**

### 6.2. Kendali Manual Override Posisi

* **Fungsi**: Menggeser titik stasiun jika kereta berhenti di luar stasiun atau melompati stasiun.
* **Aksi**:
    1. Ubah sakelar **Auto-Sync Mode** ke status **OFF** (layar sentuh). Hal ini menonaktifkan pelacakan otomatis berbasis GPS agar kontrol beralih sepenuhnya ke kondektur.
    2. Tekan tombol **[ PREV ]**: Menggeser penanda posisi stasiun aktif mundur satu stasiun.
    3. Tekan tombol **[ NEXT ]**: Menggeser penanda posisi stasiun aktif maju satu stasiun.
    4. Tekan tombol **[ MANUAL SYNC ]**: Memancarkan data pembaruan posisi stasiun tersebut ke server gerbong makan untuk langsung memperbarui teks LED dan layar monitor TV penumpang di seluruh gerbong.

> **[TEMPAT FOTO: PIDS Selector - Panel Pengendalian Override Stasiun Manual]**

### 6.3. Konfigurasi Layar Selector

* **Service Config Header Button**:
  * *Fungsi*: Membuka modal pengaturan layanan.
  * *Kolom Isian*: Mengubah nama kereta (misal: Malabar), rute perjalanan, stasiun awal/akhir, dan nomor urut unit gerbong tempat panel dipasang.
* **Direction Header Button**:
  * *Fungsi*: Membalik urutan stasiun perjalanan secara cepat saat kereta sampai di stasiun akhir dan akan melakukan perjalanan kembali (*GO* ke *BACK*).
* **Category Switcher**:
  * *Fungsi*: Mengubah sistem layout tampilan informasi monitor penumpang antara format kelas "EKSEKUTIF" atau kelas "EKONOMI PREMIUM".
* **Conductor Settings Modal**:
  * *Led Scroll Speed*: Mengatur kelajuan teks berjalan (dalam milidetik). Semakin kecil nilainya, semakin cepat teks LED bergeser.
  * *Led display type selection*: Mengonfigurasi modul pengontrol LED fisik berdasarkan jenis panel yang terhubung (Indoor, Outdoor, P10 32x16, atau P25 32x16).

> **[TEMPAT FOTO: PIDS Selector - Modal Opsi Layanan (Service Config)]**

> **[TEMPAT FOTO: PIDS Selector - Modal Pemilihan Arah Perjalanan (Direction Config)]**

> **[TEMPAT FOTO: PIDS Selector - Panel Pengaturan Kondektur (Selector Settings)]**
