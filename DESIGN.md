# 📑 Panduan Desain & Penyelarasan Visual PIDS Modern Suite v2.0

## 1. Pendahuluan
Dokumen ini disusun sebagai **acuan desain tunggal (Single Source of Truth - SSOT)** untuk memastikan konsistensi visual di seluruh ekosistem PIDS Modern Suite v2.0 yang terdiri dari tiga aplikasi utama:
1. **Master App** (Port 5173 / Electron) - Console Monitoring Utama & API Server.
2. **Selector App** (Port 5174) - Interface Layar Sentuh Operator di Kereta (RPi 5-inch).
3. **Command Center App** (Port 5176) - Panel Admin & Monitoring Armada/Rute Global.

Saat ini terdapat beberapa inkonstensi desain visual (warna hardcoded, radius sudut yang bervariasi tanpa standar, serta palet mode gelap yang tidak seragam) meskipun tema dasarnya sama-sama menggunakan warna korporat KAI. Panduan ini menetapkan token desain yang harus diikuti untuk setiap modifikasi dan pengembangan baru.

---

## 2. Analisis Inkonsistensi Desain Saat Ini
Berdasarkan audit kode pada ketiga aplikasi, ditemukan beberapa inkonsistensi berikut:

### A. Warna Utama Hardcoded vs Variabel CSS
*   **Masalah:** Kode warna korporat KAI (KAI Blue `#1d2d6a` dan KAI Orange `#ee6f1f`) di-hardcode sebagai nilai inline Tailwind (seperti `bg-[#1d2d6a]`, `text-[#ee6f1f]`, `bg-[#ee6f1f]`) di puluhan file TSX.
*   **Dampak:** Menyulitkan rebranding jika di masa mendatang warna korporat berubah atau jika produk ini digunakan oleh operator kereta lain (KCI, LRT, MRT).
*   **Kondisi Saat Ini:** `tailwind.config.js` di ketiga aplikasi tidak mendefinisikan warna-warna ini di bagian `extend`, sehingga developer terpaksa menulis warna hardcoded secara inline.

### B. Variasi Skema Mode Gelap (Dark Mode Backgrounds)
*   **Master App:** Menggunakan warna latar belakang `#0a0f1e` untuk body gelap dan `#0f172a`/40 untuk kartu (Deep Slate).
*   **Selector App:** Menggunakan warna latar belakang `slate-950` (`#020617`).
*   **Command Center App:** Menggunakan latar belakang body `slate-950` (`#020617`) dan `slate-900` (`#0f172a`).
*   **Dampak:** Kedalaman visual (visual depth) mode gelap terasa berbeda saat berpindah antar aplikasi, mengurangi rasa kesatuan sistem (operating as a single ecosystem).

### C. Variasi Radius Sudut (Border Radius)
*   **Master App:** Menggunakan `.kai-card` dengan `rounded-[2.5rem]` (40px), tombol toolbar menggunakan `rounded-[1.25rem]` (20px), dan container maps menggunakan `rounded-[3rem]` (48px).
*   **Selector App:** Menggunakan `.controller-card` dengan `rounded-3xl` (24px) dan tombol-tombol input menggunakan `rounded-[24px]` (24px) atau `rounded-2xl` (16px).
*   **Command Center App:** Menggunakan kartu dengan `rounded-3xl` (24px) di dashboard, `rounded-[2.5rem]` (40px) di detail kereta, `rounded-2xl` (16px) di formulir, dan `rounded-xl` (12px) di daftar gerbong.
*   **Dampak:** Perbedaan kelengkungan sudut yang terlalu mencolok menciptakan estetika yang tidak seragam (kurang kokoh/konsisten).

### D. Scrollbar Custom yang Beragam
*   Masing-masing file `index.css` mendefinisikan scrollbar dengan lebar, warna track, dan warna thumb yang berbeda-beda (ada yang 8px, 6px, bahkan 3px untuk thin scrollbar).

---

## 3. Sistem Token Desain Terpadu (Design Tokens)

Untuk menyelaraskan tampilan, seluruh aplikasi wajib merujuk pada token desain berikut:

### 3.1 Skema Warna (Color Palette)

| Token Desain | Nama Visual | Nilai Hex | Variabel CSS | Penggunaan Utama |
| :--- | :--- | :--- | :--- | :--- |
| **`primary`** | KAI Blue | `#1d2d6a` | `--kai-blue` | Header, sidebar utama, aksen gelap |
| **`primary-hover`** | Deep Navy | `#152355` | `--kai-blue-dark` | State hover tombol biru |
| **`secondary`** | KAI Orange | `#ee6f1f` | `--kai-orange` | Tombol aksi utama, status penting, highlight |
| **`secondary-hover`** | Dark Orange | `#d45d15` | `--kai-orange-dark` | State hover tombol oranye |
| **`bg-light`** | Light Slate | `#f8fafc` | `--background-light` | Latar belakang aplikasi (Light Mode) |
| **`bg-dark`** | Deep Space | `#0a0f1e` | `--background-dark` | Latar belakang aplikasi (Dark Mode) |
| **`card-light`** | White | `#ffffff` | `--card-light` | Latar belakang komponen/kartu (Light Mode) |
| **`card-dark`** | Slate Slate | `#121b2e` | `--card-dark` | Latar belakang komponen/kartu (Dark Mode) |
| **`border-light`** | slate-200 | `#e2e8f0` | `--border-light` | Border pembatas (Light Mode) |
| **`border-dark`** | slate-800 | `#1e293b` | `--border-dark` | Border pembatas (Dark Mode) |

### 3.2 Skala Radius Sudut (Border Radius Scale)

Untuk menjaga konsistensi kelengkungan elemen (dari yang terbesar ke terkecil):

1.  **`radius-card` (Kartu Utama / Panel Dashboard / Modal Besar):**
    *   **Nilai:** `rounded-3xl` atau `rounded-[24px]` (24px).
    *   *Catatan:* Kurangi penggunaan `rounded-[2.5rem]` (40px) atau `rounded-[3rem]` (48px) secara berlebihan untuk mempertahankan kesan industrial yang kokoh dan efisien.
2.  **`radius-element` (Formulir / Kartu Detail / Tombol Utama):**
    *   **Nilai:** `rounded-2xl` atau `rounded-[16px]` (16px).
    *   *Penggunaan:* Input field, tombol aksi di toolbar, dan baris daftar yang dapat diklik.
3.  **`radius-item` (Status Pill / Badge / Dropdown Menu):**
    *   **Nilai:** `rounded-lg` atau `rounded-[8px]` (8px).
    *   *Penggunaan:* Pill status (Online, Delay), tooltip, dan menu dropdown kecil.

### 3.3 Tipografi & Spacing
*   **Font Family:** `Inter`, `sans-serif` (sans default modern, bersih, dan sangat mudah dibaca).
*   **Metadata / Label Pendukung:** Gunakan format **UPPERCASE** dengan `tracking-wider` atau `tracking-widest` (misal: `text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]`). Ini adalah ciri khas desain v2.0 yang memberikan kesan industrial dan presisi.

---

## 4. Standar Implementasi Styling di Setiap Aplikasi

### 4.1 Konfigurasi Tailwind Terpadu (`tailwind.config.js`)
Untuk menghentikan penulisan warna hardcoded, file `tailwind.config.js` di ketiga paket (`master-app`, `selector-app`, `command-center-app`) harus diekstensi dengan token warna berikut:

```javascript
theme: {
  extend: {
    colors: {
      kai: {
        blue: {
          DEFAULT: '#1d2d6a',
          dark: '#152355',
        },
        orange: {
          DEFAULT: '#ee6f1f',
          dark: '#d45d15',
        },
        slate: {
          bg: '#0a0f1e',
          card: '#121b2e',
        }
      }
    },
    borderRadius: {
      'kai-card': '24px',
      'kai-btn': '16px',
    }
  }
}
```

Dengan konfigurasi ini, kode visual di komponen dapat ditulis dengan class standar yang deskriptif dan konsisten:
*   `bg-kai-blue` menggantikan `bg-[#1d2d6a]`
*   `text-kai-orange` menggantikan `text-[#ee6f1f]`
*   `hover:bg-kai-orange-dark` menggantikan `hover:bg-[#d45d15]`
*   `rounded-kai-card` menggantikan `rounded-3xl` atau `rounded-[2.5rem]`

### 4.2 Standardisasi Kartu (Card Standard)
Kartu data harus menggunakan struktur Tailwind yang seragam di seluruh aplikasi:
*   **Light Mode:** `bg-white border border-slate-200 shadow-sm`
*   **Dark Mode:** `dark:bg-kai-slate-card dark:border-slate-800/80 dark:shadow-none`
*   **Hover Effect (Jika interaktif):** `hover:border-kai-orange dark:hover:border-kai-orange transition-all hover:shadow-md`

### 4.3 Standardisasi Scrollbar (`index.css`)
Gunakan utilitas scrollbar tunggal di seluruh file `index.css`:

```css
/* Custom Scrollbar Utility - Premium & Subtle */
.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: #cbd5e1; /* slate-300 */
    border-radius: 9999px;
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #334155; /* slate-700 */
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #94a3b8; /* slate-400 */
}
.dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #475569; /* slate-600 */
}
```

---

## 5. Pedoman Khusus Berdasarkan Karakteristik Aplikasi

### 5.1 Master App (Console & Dashboard Operator Utama)
*   **Pendekatan Visual:** *Bento Grid Layout* dengan struktur modular padat informasi.
*   **Palet Mode:** Sangat direkomendasikan berjalan pada *Dark Mode* untuk mengurangi kelelahan mata operator yang bertugas 24/7 di ruang kontrol.
*   **Interaktivitas:** Gunakan transisi halus via `Framer Motion` (durasi default `0.2s` atau `0.3s`) pada panel accordion dan fly-out menu.

### 5.2 Selector App (Raspberry Pi Layar Sentuh 5-inch)
*   **Pendekatan Visual:** *Touch-Optimized Large Buttons* dengan target ketukan (tap target) minimal `56px x 56px` atau `64px x 64px`.
*   **Kepadatan Informasi:** Disesuaikan untuk keterbacaan dari jarak sedang (kabin masinis). Judul stasiun menggunakan ukuran minimal `text-3xl` hingga `text-5xl`.
*   **Navigasi:** Carousel stasiun dengan tombol Prev/Next besar untuk menghindari salah sentuh akibat getaran kereta.

### 5.3 Command Center App (Desktop Web Administrator)
*   **Pendekatan Visual:** *Data-Dense Tables & Detailed Forms*. Mengutamakan keterbacaan teks dan fungsionalitas CRUD yang bersih.
*   **Struktur Grid:** Padding halaman standar `p-6` hingga `p-10`.
*   **Warna Latar:** Default menggunakan *Light Mode* yang bersih, dengan opsi beralih ke *Dark Mode* yang responsif.

---

## 6. Checklist Kepatuhan Desain (Design Compliance Checklist)
Setiap kali membuat atau memperbarui komponen UI, pastikan memenuhi checklist berikut:
- [ ] Tidak menggunakan kode warna hex secara langsung/inline (seperti `#1d2d6a` atau `#ee6f1f`). Gunakan class Tailwind terkonfigurasi (`bg-kai-blue` atau `text-kai-orange`).
- [ ] Sudut rounded kartu utama tidak melebihi `24px` (`rounded-3xl` / `rounded-kai-card`) untuk mempertahankan kesan industrial yang kokoh.
- [ ] Elemen input formulir menggunakan kelengkungan `rounded-2xl` (16px) dengan border default `slate-200` (Light) atau `slate-800` (Dark).
- [ ] Mode gelap menggunakan warna latar belakang dasar `#0a0f1e` untuk keseragaman nuansa kegelapan (visual depth).
- [ ] Teks label kecil menggunakan format UPPERCASE dengan `tracking-[0.1em]` atau `tracking-[0.2em]`.
- [ ] Tidak menambahkan komentar inline di dalam baris kode UI (Sesuai panduan `GEMINI.md`).

---
*Dokumen ini disusun untuk penyelarasan tim pengembang PIDS Modern Suite.*
