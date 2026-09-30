# _self.manage — Money, made clear

> **Privacy-first, serverless personal finance manager.**
> Simpan data keuangan langsung di Google Spreadsheet milik Anda sendiri atau secara lokal di browser. Tanpa database backend, tanpa perantara, data tetap 100% milik Anda.

---

## 🌟 Fitur Utama

- **100% Client-Side & Zero-Backend**: Tidak ada database terpusat yang menyimpan riwayat transaksi Anda.
- **Dua Opsi Penyimpanan**:
  - **Google Sheets**: Sinkronisasi dua arah langsung ke spreadsheet Google Drive pribadi menggunakan Google Sheets API v4.
  - **Local Storage**: Mode offline/lokal langsung di browser tanpa perlu akun Google.
- **Privasi & Keamanan Terjamin**:
  - Menggunakan Google Identity Services (GIS) token-based OAuth 2.0.
  - Hanya membutuhkan *Public Client ID* — tidak ada client secret yang diekspos maupun disimpan.
  - Header keamanan produksi (CSP, HSTS, X-Frame-Options, dsb.) telah dikonfigurasi.
- **PWA Ready**: Dapat di-install langsung ke layar utama (*Add to Home Screen*) di smartphone (iOS & Android) maupun desktop.
- **Multi-Currency & Bilingual**: Mendukung format mata uang IDR & USD, serta bahasa Indonesia dan Inggris.
- **Export & Import**: Dukungan ekspor ke PDF, Excel (.xlsx), dan JSON.

---

## 🏗️ Arsitektur Proyek

```
esplant/
├── frontend/                 # Aplikasi React 19 + TypeScript + Vite
│   ├── public/               # Asset statis, favicon, manifest.json (PWA)
│   ├── src/
│   │   ├── components/       # Komponen UI (desktop, mobile, shared)
│   │   ├── lib/              # Google Sheets API client, storage context, utilities
│   │   └── pages/            # Halaman utama (Home, Terms, Privacy, Docs, Faq)
│   ├── .env.example          # Template environment variable frontend
│   └── package.json          # Dependencies frontend
├── docs/                     # Dokumentasi verifikasi Google OAuth
├── .env.example              # Template root environment variable
├── netlify.toml              # Konfigurasi deployment Netlify + Security Headers
├── vercel.json               # Konfigurasi deployment Vercel + Security Headers
├── firebase.json             # Konfigurasi deployment Google Firebase Hosting
└── package.json              # Root package script (build, dev, test, lint)
```

---

## 🛡️ Pre-Launch Security Checklist

Sebelum melakukan deployment ke production, pastikan checklist berikut telah terpenuhi:

- [x] **Credential Management**: Tidak ada API secret atau database password di dalam source code. `VITE_GOOGLE_CLIENT_ID` bersifat publik.
- [x] **Gitignore**: Seluruh file `.env`, credential lokal, dan build artifact terdaftar di `.gitignore`.
- [x] **Content-Security-Policy (CSP)**: Mengizinkan request hanya ke domain terpercaya (`apis.google.com`, `sheets.googleapis.com`, `accounts.google.com`).
- [x] **HSTS & Frame Protection**: Header `Strict-Transport-Security`, `X-Frame-Options: SAMEORIGIN`, dan `X-Content-Type-Options: nosniff` aktif di seluruh platform deployment.
- [x] **Clean Codebase**: Seluruh dead code, mock backend Python, dan file template yang tidak digunakan telah dibersihkan.

---

## 🔑 Konfigurasi Google Cloud (OAuth 2.0)

Aplikasi ini menggunakan **Google Identity Services (GIS)** dengan alur implicit token client. Ikuti langkah berikut untuk mendapatkan Client ID:

1. Buka [Google Cloud Console](https://console.cloud.google.com/).
2. Buat project baru atau pilih project yang sudah ada.
3. Masuk ke **APIs & Services** → **Library**, cari **Google Sheets API**, lalu klik **Enable**.
4. Masuk ke **APIs & Services** → **OAuth consent screen**:
   - Pilih User Type: **External**.
   - Isi Nama Aplikasi (misal: `_self.manage`), Email Dukungan, dan Developer Contact.
   - Tambahkan scope: `https://www.googleapis.com/auth/spreadsheets`.
5. Masuk ke **APIs & Services** → **Credentials** → **Create Credentials** → **OAuth client ID**:
   - Application type: **Web application**.
   - Nama: `_self.manage Web Client`.
   - **Authorized JavaScript origins** (Sangat Penting):
     Tambahkan domain tempat aplikasi di-hosting (tanpa garis miring di akhir `/`), contoh:
     - `http://localhost:3000` (untuk pengujian lokal)
     - `https://your-app.vercel.app` (jika menggunakan Vercel)
     - `https://your-app.netlify.app` (jika menggunakan Netlify)
     - `https://your-project.web.app` (jika menggunakan Firebase Hosting)
   - **Authorized redirect URIs**: Kosongkan (aplikasi menggunakan in-page token client, bukan redirect flow).
6. Salin **Client ID** yang dihasilkan (`xxxxxx.apps.googleusercontent.com`).

---

## 🚀 Panduan Deployment

Pilih platform hosting gratis yang Anda sukai. Semua konfigurasi routing SPA dan header keamanan telah disiapkan.

### Opsi 1: Vercel (Rekomendasi)

Konfigurasi telah disediakan di [`vercel.json`](./vercel.json).

#### Melalui Dashboard Vercel:
1. Push repositori ini ke GitHub/GitLab Anda.
2. Masuk ke [Vercel Dashboard](https://vercel.com/) → klik **Add New** → **Project**.
3. Import repositori Anda:
   - **Root Directory**: Biarkan `./` (atau pilih `frontend`).
   - **Build Command**: `cd frontend && npm install && npm run build` (otomatis dari `vercel.json`).
   - **Output Directory**: `frontend/dist`.
4. Buka tab **Environment Variables**:
   - Key: `VITE_GOOGLE_CLIENT_ID`
   - Value: `Client ID Google Anda`
5. Klik **Deploy**.

#### Melalui Vercel CLI:
```bash
npm i -g vercel
vercel
```

---

### Opsi 2: Netlify

Konfigurasi telah disediakan di [`netlify.toml`](./netlify.toml).

1. Push repositori ke GitHub/GitLab Anda.
2. Masuk ke [Netlify Dashboard](https://app.netlify.com/) → **Add new site** → **Import an existing project**.
3. Pilih repositori Anda:
   - Build settings akan otomatis terdeteksi dari `netlify.toml` (`publish = "frontend/dist"`).
4. Tambahkan Environment Variable:
   - Buka **Site configuration** → **Environment variables** → **Add a variable**.
   - Key: `VITE_GOOGLE_CLIENT_ID`
   - Value: `Client ID Google Anda`
5. Klik **Deploy site**.

---

### Opsi 3: Google Firebase Hosting (Hosting Gratis dari Google)

Konfigurasi telah disediakan di [`firebase.json`](./firebase.json).

1. Install Firebase CLI (jika belum ada):
   ```bash
   npm install -g firebase-tools
   ```
2. Login ke akun Google Anda:
   ```bash
   firebase login
   ```
3. Hubungkan project Firebase Anda:
   ```bash
   firebase use --add
   ```
   (Pilih Google Cloud Project yang sama dengan OAuth Client ID Anda).
4. Buat file `frontend/.env.production`:
   ```bash
   VITE_GOOGLE_CLIENT_ID=Client ID Google Anda
   ```
5. Build dan deploy:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```

---

## 💻 Pengembangan Lokal (Local Development)

### 1. Prasyarat
- **Node.js** v20 atau lebih baru.
- **npm** atau **yarn**.

### 2. Instalasi
Clone repositori dan pasang dependensi:
```bash
git clone <url-repo-anda>
cd esplant
cd frontend
npm install
```

### 3. Konfigurasi Lingkungan (.env)
Salin contoh environment file:
```bash
cp .env.example .env
```
Buka `.env` dan masukkan Google Client ID Anda:
```env
VITE_GOOGLE_CLIENT_ID=xxxxxx.apps.googleusercontent.com
```

### 4. Menjalankan Aplikasi
Dari root direktori atau dari folder `frontend`:
```bash
# Dari root:
npm run dev

# Atau dari frontend:
cd frontend && npm run dev
```
Aplikasi akan berjalan di `http://localhost:3000`.

### 5. Menjalankan Pengujian (Testing & Linting)
```bash
# Menjalankan unit & integration test (Vitest)
npm run test

# Menjalankan linting (oxlint)
npm run lint

# Menjalankan TypeScript typecheck
npm run typecheck

# Membuat production build
npm run build
```

---

## 📄 Kebijakan & Privasi

Aplikasi ini menyertakan halaman legal statis yang dapat langsung digunakan untuk verifikasi Google OAuth:
- Privacy Policy: `/privacy.html`
- Terms of Service: `/terms.html`

Panduan lengkap mengenai tata cara verifikasi OAuth di Google Cloud Console tersedia di [`docs/GOOGLE_OAUTH_VERIFICATION.md`](docs/GOOGLE_OAUTH_VERIFICATION.md).
