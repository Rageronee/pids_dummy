# 📑 ANALISIS TRANSFORMASI SISTEM: PIDS V1 (Produk Erka) vs PIDS V2.0 (Modern Suite)

**Project:** Passenger Information Display System (PIDS) - Integrated Suite
**Versi:** V2.0 (Current Live Build)
**Subjek:** Evolusi dari Sistem Terbatas Hardware (V1) ke Sistem Berbasis Data Cerdas (V2.0)

---

## 🏗️ 1. Paradigma Arsitektur: Dari Hardware-Centric ke Software-Defined
Lompatan terbesar dari Produk Erka (V1) ke V2.0 adalah cara sistem berpikir dan berjalan.

*   **V1 (Produk Erka):** Berbasis pada batasan fisik perangkat keras (*Hardware-Locked*). Kontrol dan tampilan sangat bergantung pada kemampuan modul kontroler Erka yang kaku. Perubahan kecil pada tampilan sering kali memerlukan pembaruan firmware yang rumit.
*   **V2.0 (Modern Stack):** Menggunakan paradigma **Software-Defined Infrastructure**. Dengan teknologi **React** dan **Electron**, kita membangun mesin *rendering* sendiri yang fleksibel. Tampilan visual tidak lagi dibatasi oleh hardware, melainkan oleh kreativitas software, memungkinkan antarmuka yang jauh lebih kaya dan responsif.

## 💾 2. Manajemen Data: Dari Flat-File ke Relasional (PostgreSQL)
Cara sistem menyimpan informasi menentukan seberapa andal data tersebut.

*   **V1 (Produk Erka):** Menggunakan penyimpanan data sederhana (*Flat-File/Excel Based*). Berdasarkan dokumen SRS Erka, data jadwal dan stasiun sering kali bersifat statis. Risiko duplikasi data sangat tinggi karena tidak ada validasi otomatis di level database.
*   **V2.0 (PostgreSQL & Docker):** Mengadopsi database relasional kelas industri. Data dikelola secara terpusat dan memiliki **Integritas Data** yang kuat melalui `UNIQUE CONSTRAINTS`. Sistem secara otomatis mencegah jadwal ganda dan memastikan sinkronisasi data yang konsisten di semua aplikasi (`Master`, `CC`, `Selector`).

## 🎨 3. Revolusi UI/UX: Industrial Minimalism & Dark Mode
Tampilan bukan hanya soal kecantikan, tapi tentang efisiensi operasional.

*   **V1 (Basic Display):** Tampilan standar prototipe dengan elemen yang terpisah-pisah, penggunaan bayangan (*shadow*) yang berat, dan sudut bulat yang berlebihan. Hanya mendukung *Light Mode* yang melelahkan mata jika digunakan dalam durasi lama di ruang kontrol.
*   **V2.0 (Bento Industrial):**
    *   **Industrial Minimalism:** Menghilangkan elemen visual yang tidak perlu (seperti teks "Displays/Nodes" yang redundant) dan fokus pada data krusial.
    *   **Edge-to-Edge Layout:** Desain detail stasiun yang menempel penuh ke layar memberikan kesan profil sistem yang kokoh dan profesional.
    *   **Adaptive Dark Mode:** Menggunakan skema warna *Deep Slate* yang dirancang khusus untuk visibilitas tinggi di lingkungan minim cahaya (seperti kabin masinis atau ruang kontrol malam hari).

## 📡 4. Intelegensi Operasional: Smarter Matching & Tracking
V2.0 memiliki "otak" yang lebih cerdas dalam memproses situasi nyata.

*   **V1 (Passive Display):** Bersifat pasif; hanya menampilkan apa yang dikirimkan tanpa memahami konteks rute secara utuh. Sulit untuk membedakan variasi nomor perjalanan dalam satu nama layanan yang sama.
*   **V2.0 (Context-Aware Logic):**
    *   **Smart Matching (67-70):** Sistem secara cerdas mampu membedakan jadwal KA Malabar 67, 68, 69, dan 70 secara otomatis. Operator cukup memilih layanan, dan sistem akan menarik data jadwal, stasiun asal, dan tujuan yang tepat.
    *   **Real-time Position Tracking:** Marker di peta tidak lagi statis. Ia bergerak secara dinamis mengikuti "Posisi Sekarang" kereta berdasarkan stasiun yang disinggahi, lengkap dengan popup informasi yang adaptif.

---

## 📊 Tabel Perbandingan Teknis

| Dimensi Perbandingan | V1 (Produk Erka) | V2.0 (PIDS Modern Suite) |
| :--- | :--- | :--- |
| **Teknologi Utama** | Firmware-Based / Static JSON | React, Electron, Node.js |
| **Penyimpanan Data** | Excel / Flat JSON | PostgreSQL (Relational DB) |
| **Startup System** | Dependent (Harus Berurutan) | Independent (Bisa dari mana saja) |
| **Visual Desain** | Prototype Style (Rounded) | Industrial Style (Sharp & Flat) |
| **Skema Warna** | Light Mode Only | Adaptive Dark/Light Mode |
| **Integritas Jadwal** | Rendah (Sering Duplikat) | Tinggi (Unique Constraints) |
| **Interaksi Peta** | Statis / Terbatas | Dinamis / Fly-to Focus |

---

## 💡 Kesimpulan
Transformasi dari **Produk Erka (V1)** ke **PIDS V2.0** mewakili pergeseran dari era "Penyampaian Informasi Statis" ke era **"Pusat Kontrol Operasional Digital"**. Sistem yang baru tidak hanya lebih rapi dan estetik, tetapi juga memiliki ketahanan (*resilience*) dan kecerdasan logika yang siap digunakan untuk standar operasional transportasi modern.

---
*Dokumen ini disusun sebagai ringkasan teknis atas rekayasa ulang sistem PIDS Dummy.*
