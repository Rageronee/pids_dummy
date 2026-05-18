# Analisis Redundansi dan Rekomendasi Arsitektur Command Center PIDS

Berdasarkan hasil peninjauan kode secara menyeluruh pada aplikasi `command-center-app` (khususnya `TrainsPage.tsx`, `RoutesPage.tsx`, `SchedulesPage.tsx`, dan `StationsPage.tsx`), ditemukan beberapa tumpang tindih (redundansi) logika dan alur data yang dapat menyebabkan inkonstensi dan kebingungan pengguna (User Experience).

Berikut adalah analisis mendetail mengenai redudansi yang terjadi, beserta rekomendasi solusi arsitektur untuk restrukturisasi fungsi, logika, database, dan alur aplikasi agar memenuhi prinsip *Single Source of Truth (SSOT)* secara efisien dan kredibel.

---

## 1. Temuan Redundansi & Kejanggalan Alur

### A. Tumpang Tindih Definisi Rute (TrainsPage vs RoutesPage vs SchedulesPage)

1. **Di `TrainsPage.tsx`:** Saat membuat armada kereta (Train), terdapat form untuk mendefinisikan *Origin Station*, *Destination Station*, dan *Route Stations (Intermediate)*. Ketika disimpan, data ini akan memicu *POST* ke `/api/admin/routes`.
   * **Masalah:** Kereta adalah **aset fisik** (rolling stock), bukan jalur. Sebuah kereta (misal: KA Argo Wilis) bisa bertukar rute di masa depan. Menyimpan rute di dalam form penciptaan kereta adalah penyatuan konsep yang salah.
2. **Di `RoutesPage.tsx`:** Halaman ini mendefinisikan urutan stasiun, tetapi juga mencampuradukkan **waktu (schedule)** pada masing-masing stasiun (contoh: *time, schedule_ka67, dsb.*), dan bahkan status *Live Tracking* (*ON TRACK*, *DELAYED*, *Trip Progress*).
   * **Masalah:** "Rute" seharusnya hanyalah jalur geografis (urutan stasiun & koordinat/GeoJSON). Jika ada waktu di dalamnya, maka itu sudah menjadi "Jadwal", bukan sekadar rute.
3. **Di `SchedulesPage.tsx`:** Halaman ini mengatur waktu keberangkatan dan kedatangan untuk stasiun awal dan akhir, serta menampilkan "Route Checkpoints" yang memiliki waktu kedatangan/keberangkatan sendiri.
   * **Masalah:** Terjadi kebingungan antara mengatur waktu di `RoutesPage` (lewat GeoJSON/manual) dan mengatur jadwal perjalanan di `SchedulesPage`. Ini adalah redundansi data terburuk karena waktu jadwal tersebar di dua halaman yang berbeda.

### B. Penyebaran Identitas Kereta

Di `SchedulesPage`, pengguna harus menginput/memilih ulang `train_name` dan `train_number`. Meskipun ada auto-fill, hubungan relasional antar modul tampak longgar dan lebih bergantung pada pencocokan string nama (*String Matching*) daripada *Foreign Key/ID* yang kuat. Terdapat juga duplikasi identitas IP Address dan PIC antara halaman Stasiun dan Kereta yang penggunaannya berpotensi rancu.

---

## 2. Solusi Restrukturisasi Sistematis (Database, Logic, & Flow)

Untuk menghindari tumpang tindih, konsep sistem wajib dipisahkan secara tegas menjadi **Master Data (Statis)** dan **Data Operasional (Dinamis/Transaksional)**. Berikut adalah rancangan solusi *end-to-end* terbaik:

### A. Restrukturisasi Database & Struktur JSON/State

Penerapan *Single Source of Truth (SSOT)* dengan memisahkan *concern* setiap entitas, menggunakan pengikatan relasional (ID/Kode Unik) menggantikan string matching:

1. **Tabel/Koleksi `stations` (Master Stasiun)**
   * `station_code` (Primary Key)
   * `name`, `city`, `latitude`, `longitude`, `ip_address`, `pic_name`, `pic_contact`
2. **Tabel/Koleksi `trains` (Master Kereta)**
   * `train_id` (Primary Key)
   * `train_name` (Contoh: ARGO WILIS)
   * `ka_number` (Contoh: 1A)
   * `ip_address` (IP unit kereta)
   * `pic_name`, `pic_contact`
   * *Child Collection:* `gerbongs` (Urutan rangkaian, tipe, media).
3. **Tabel/Koleksi `routes` (Master Rute)**
   * `route_id` (Primary Key)
   * `route_name` (Contoh: "Jalur Selatan JKT-SBY")
   * `geojson_data` (Data jalur polyline map)
   * *Child Collection:* `route_stations` (Hanya *sequence* stasiun, **tanpa waktu**).
4. **Tabel/Koleksi `schedules` (Transaksional/Operasional)**
   * `schedule_id` (Primary Key)
   * `train_id` (Foreign Key -> `trains`)
   * `route_id` (Foreign Key -> `routes`)
   * `trip_date` (Tanggal keberangkatan)
   * `status` (SCHEDULED, EN-ROUTE, DELAYED, COMPLETED)
   * *Child Collection:* `schedule_checkpoints` (Stasiun dari route_stations + `arrival_time_scheduled`, `departure_time_scheduled`, `arrival_time_real`, `departure_time_real`).

### B. Restrukturisasi Fungsional (Frontend & Alur UI/UX)

1. **`TrainsPage.tsx` (Registrasi Armada)**
   * **Solusi Fungsional:** **Hapus** form *Origin Station*, *Destination Station*, dan *Route Stations (Intermediate)* dari UI. Hapus panggilan API `/api/admin/routes` dari sini.
   * **Fokus:** Halaman ini hanya digunakan untuk mengonfigurasi gerbong, IP address kereta, dan informasi fisik lokomotif/rangkaian.

2. **`RoutesPage.tsx` (Manajemen Jalur)**
   * **Solusi Fungsional:** **Hapus** kolom atribut waktu (`schedule_time`, `delay`) dan *Live Tracking Progress* dari form rute.
   * **Fokus:** Jadikan halaman ini murni sebagai "Papan Gambar Jalur". Import GeoJSON cukup membaca koordinat poin dan nama urutan stasiun untuk membentuk template jalur.

3. **`SchedulesPage.tsx` (Pusat Penjadwalan & Operasional)**
   * **Solusi Fungsional:** Ubah arsitektur halaman menjadi pusat kontrol utama (*Mission Control*).
   * **Alur Baru (Flow):**
     1. Admin memilih *Train ID* (dropdown data kereta).
     2. Admin memilih *Route ID* (dropdown data rute).
     3. Sistem otomatis menarik `route_stations` dari rute yang dipilih.
     4. Admin menginput/menyunting `Scheduled Arrival` & `Scheduled Departure` untuk masing-masing stasiun pada *grid* form penjadwalan.
     5. Data di-save sebagai entitas *Schedule* yang mengikat Kereta, Rute, dan Waktu.

### C. Restrukturisasi Logika Backend (API & State Management)

1. **Dekopling Controller API:**
   * Endpoint `POST /api/admin/trains` hanya boleh memodifikasi tabel/state `trains` dan `gerbongs`.
   * Endpoint `POST /api/admin/routes` hanya memodifikasi `routes`.
   * Dibuat endpoint baru `POST /api/admin/schedules` yang memegang logika penggabungan antara *Train* dan *Route*.
2. **Sentralisasi Live Tracking (WebSocket / Polling):**
   * Logika integrasi posisi GPS waktu nyata (`state:update`) yang mengalkulasi status *ON TRACK/DELAYED* harus dipindah. Tidak lagi ditaruh berserakan di `RoutesPage`.
   * Solusi: Buat layer fungsionalitas (misal: *Hook* `useLiveTelemetry` atau dipusatkan di halaman dashboard/schedules) yang mencocokkan *Live GPS* kereta dengan titik koordinat stasiun di entitas `schedules`, bukan `routes`.
3. **Shared Hooks untuk SSOT:**
   * Gunakan paket `shared` (seperti `useStations`, `useTrains`, `useRoutes`) berbasis *React Context* atau *SWR/React Query* agar seluruh halaman (Trains, Routes, Schedules) selalu menampilkan referensi data master yang sama tanpa *race conditions* atau *multiple fetch*.

---

## 3. Kesimpulan

Dengan menerapkan arsitektur:
**`[Master Stasiun]` + `[Master Kereta]` -> `[Master Rute (Kumpulan Stasiun)]` -> `[Jadwal Operasional (Kereta + Rute + Waktu)]`**

Sistem PIDS Command Center akan menjadi:

1. **Bebas Data Collision:** Tidak ada lagi perubahan jadwal di halaman Route yang tertimpa oleh halaman Schedules.
2. **Highly Scalable:** Kereta yang sama dapat dipakai untuk puluhan Rute yang berbeda setiap harinya tanpa harus menciptakan entitas armada baru.
3. **Efisiensi Kinerja & UX:** User flow menjadi *predictable*. Admin tahu persis bahwa "Jadwal Waktu" hanya diatur di satu tempat, yaitu `SchedulesPage`.
