# Laporan Analisis Keselarasan: Program vs Research

> **Tanggal:** 20 Februari 2026
> **Proyek:** Eltran-PIDS-Dummy
> **Referensi Research:** SRS Software PIDS, SRS Hardware PIDS (Selector, Controller & Display)

---

## Ringkasan Eksekutif

Secara keseluruhan, program **Eltran-PIDS-Dummy sudah cukup selaras** dengan research, terutama untuk sebuah proyek *dummy simulation*. Namun terdapat beberapa **kesenjangan fungsional signifikan** yang perlu dicatat.

---

## ✅ Yang Sudah Selaras

### 1. Arsitektur Sistem (SRS Hardware §2.1 ↔ Program)

| Research | Implementasi Program |
|---|---|
| Selector → Controller → Display | `selector-app` → API Master (`localhost:3001`) → `led-app` |
| Jalur data terpusat ke controller | Centralized REST API di `master-app` (Express, port 3001) |
| Selector sebagai antarmuka operator | `selector-app` adalah UI operator untuk memilih nama kereta & rute |

**Status: ✅ Selaras** — arsitektur hirarki data sudah mengikuti pola yang benar.

---

### 2. Kebutuhan Fungsional Selector (KF-SEL ↔ `selector-app`)

| Kode | Deskripsi Research | Implementasi |
|---|---|---|
| **KF-SEL-01** | Terhubung ke Kereta Makan via jaringan IP | ✅ Poll ke `http://localhost:3001/api/state` |
| **KF-SEL-02** | Terima info tampilan dari Kereta Makan | ✅ `checkSync()` polling tiap 1 detik |
| **KF-SEL-03** | Teruskan perintah ke Controller PIDS | ✅ `sendData()` POST ke master API |
| **KF-SEL-04** | Antarmuka input nama kereta & nomor gerbong | ✅ UI `handleSetName()` & `handleSetNumber()` |
| **KF-SEL-05** | Kirim identitas ke Kereta Makan | ✅ `sendData({ stationName, trainNumber })` |
| **KF-SEL-06** | Kirim konten tampilan ke Controller | ✅ Termasuk `ledSpeed`, `displayMode`, `activeRoute` |
| **KF-SEL-07** | Tampilkan status koneksi | ✅ "Ping Controller" button dengan status `success/error/idle` |
| **KF-SEL-08** | Fungsi "uji koneksi" / ping | ✅ `handlePing()` — masih simulasi (timeout), belum real ping |
| **KF-SEL-12** | Tetap beroperasi jika koneksi terputus | ✅ try/catch, error tidak crash app |

**KF-SEL yang belum diimplementasi:**

- **KF-SEL-09 & KF-SEL-10**: Selector harus bisa ambil & kirim data GPS dari modul GPS fisik. Saat ini speed/altitude adalah **simulasi random**, bukan dari GPS nyata.
- **KF-SEL-11**: Selector *tidak* kendalikan display langsung — ✅ sudah benar, LED dikontrol via `led-app` yang poll dari master.

---

### 3. Kebutuhan Fungsional Mini PC / Master (MPC ↔ `master-app`)

| Kode | Deskripsi Research | Implementasi |
|---|---|---|
| **MPC-003** | Update data lokal | ✅ `/api/db` endpoint dengan `db.json` |
| **MPC-004** | Terima & kirim data dari/ke PIDS Selektor | ✅ REST API bidireksional |
| **MPC-006** | Simpan data terakhir saat offline | ✅ State ada di memory Express server |
| **MPC-007** | Terima data dari PIDS Selektor | ✅ POST `/api/state` |
| **MPC-008/009** | Operator dapat update Nama/Nomor Kereta | ✅ Via selector-app |
| **MPC-014/015** | Tampilkan CCTV, read-only | ✅ Mock CCTV di `MonitorCCTV` (gambar statis Unsplash) |

**MPC yang belum diimplementasi:**

- **MPC-001**: Sistem hanya bisa diakses Operator → **tidak ada autentikasi/login** sama sekali
- **MPC-002**: Auto-run saat Mini PC menyala → belum ada konfigurasi autostart Electron
- **MPC-011/012**: Peta lokasi kereta dan tracking per gerbong → GPS di `MonitorGPS` hanya **SVG statis hardcoded**, koordinat `-6.9147, 107.6098` dan speed `98.4 km/h` adalah nilai **literal hardcoded**
- **MPC-016**: Pengaturan konten TV → ada `displayMode` tapi tidak menghubungkan ke media server
- **MPC-018/019**: Sinkronisasi dua arah dengan **Command Center** → **Command Center tidak ada sama sekali** dalam proyek ini

---

### 4. SRS Software — Software PIDS Selektor (PIDS-001 s.d. 007)

| Kode | Deskripsi | Status |
|---|---|---|
| **PIDS-001** | Pemilihan Nama Kereta | ✅ Terpenuhi |
| **PIDS-002** | Pemilihan Nomor Kereta | ✅ Terpenuhi |
| **PIDS-003** | Tampilkan data dari sensor | ⚠️ Simulasi random, bukan sensor nyata |
| **PIDS-004** | Kirim data PIDS ke Mini PC | ✅ Terpenuhi |
| **PIDS-005** | Catat log pengiriman data | ❌ Tidak ada log yang disimpan |
| **PIDS-006** | Status koneksi ke Mini PC | ✅ (simulated ping) |
| **PIDS-007** | Simpan log data sensor | ❌ Tidak ada persistent log |

---

### 5. Display LED / Controller (KF-CTRL & KF-DISP ↔ `led-app`)

| Kode | Deskripsi Research | Implementasi |
|---|---|---|
| **KF-CTRL-02** | Kendalikan panel P10 & P4 | ✅ Simulasi via `<canvas>` P10Matrix, mode `?mode=outdoor/indoor` |
| **KF-CTRL-04** | Simpan konten terakhir jika tidak ada update | ⚠️ Master menyimpan state, tapi led-app poll terus |
| **KF-CTRL-06** | Layout indoor/outdoor berbeda | ✅ URL param `?mode=indoor` vs `?mode=outdoor` |
| **KF-DISP-04** | Tampilkan tujuan/rute, stasiun berikutnya, ETA | ✅ Scrolling text menampilkan nama kereta, next station, waktu |
| **KF-DISP-05** | Pertahankan konten terakhir jika tidak ada update | ✅ Konten di-render dari state terakhir yang di-poll |

**Hardware gap yang disadari (wajar untuk proyek dummy):**

- **KF-CTRL-01**: Research menyebut komunikasi via **USB** dari Selector → program menggunakan jaringan IP (acceptable untuk simulasi)
- **PK-CTRL-01**: Research menyebut hardware **HD-W63** (WiFi+USB) → program tidak mengimplementasikan protocol HD-W63

---

## ❌ Kesenjangan Kritis (Tidak Ada dalam Program)

| Fitur | Kode Research | Keterangan |
|---|---|---|
| **Software Command Center** | CTR-001 s.d. CTR-008 | Tidak ada sama sekali — seluruh modul admin/pusat ini absen |
| **Autentikasi & Login** | MPC-001, CTR-001 | Tidak ada sistem login, semua akses terbuka |
| **Database relasional** (User, Kereta, Gerbong, Sensor, dll.) | Skema DB SRS Software | Program hanya pakai `db.json` flat (trainNames, routes saja) |
| **Log Aktivitas & Maintenance** | Log_Aktivitas, Log_Maintenance | Tidak ada logging sistem |
| **GPS nyata (NMEA 0183)** | KF-SEL-09, MPC-011 | Speed/altitude adalah angka random atau hardcoded |
| **CCTV nyata (RTSP/WebRTC)** | MPC-014 | Gambar statis dari Unsplash |
| **Integrasi Cloud** | MPC-018, CTR-007 | Tidak ada koneksi cloud |
| **Tracking per gerbong** | MPC-012 | Stampformasi adalah tabel hardcoded dummy |

---

## 🎯 Kesimpulan & Penilaian

| Aspek | Nilai | Catatan |
|---|---|---|
| Arsitektur sistem | 🟢 **Baik** | Hierarki Selector → Master → LED sudah tepat |
| Fungsional Selector | 🟡 **Cukup** | 8/12 KF-SEL terpenuhi |
| Fungsional Master (Mini PC) | 🟡 **Cukup** | Fitur dasar ada, GPS/CCTV masih dummy |
| Display LED | 🟢 **Baik** | Simulasi canvas P4/P10 cukup representatif |
| Command Center | 🔴 **Belum ada** | Seluruh modul ini tidak diimplementasi |
| Autentikasi & Security | 🔴 **Belum ada** | Tidak ada mekanisme akses terbatas |
| Logging & Audit Trail | 🔴 **Belum ada** | Tidak ada PIDS-005, PIDS-007 |
| Database schema | 🟡 **Parsial** | Hanya sebagian kecil dari skema SRS |

### Kesimpulan Akhir

Program ini **layak sebagai proof-of-concept / dummy simulation** sesuai judulnya. Namun sebagai sistem yang siap produksi, masih ada **~40–50% fitur dari research yang belum diimplementasikan**, terutama:

1. **Command Center** — modul pusat sama sekali tidak ada
2. **Keamanan & Autentikasi** — tidak ada mekanisme login
3. **Logging** — tidak ada audit trail aktivitas
4. **Integrasi hardware nyata** — GPS, CCTV, dan LED controller HD-W63

Hal ini **sudah disadari** dan dikonfirmasi di `SYSTEM_DOCUMENTATION.md` pada bagian *Feature Gap Analysis (§4)*, sehingga kesenjangan ini bukan cacat desain melainkan batasan yang sudah terdokumentasi dari proyek dummy ini.
