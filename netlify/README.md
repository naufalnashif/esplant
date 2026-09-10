# Deploy `_self.manage` ke Netlify

Aplikasi statis (Vite + React). Tidak ada database milik aplikasi — data keuangan
tersimpan di Google Spreadsheet milik masing-masing pengguna, atau di penyimpanan
lokal peramban saat mode lokal dipakai.

Domain produksi: **https://financial-tracker-v1.netlify.app**

## 1. Build settings

Sudah diatur di `netlify.toml`:

```
command = "cd frontend && npm install && npm run build"
publish = "frontend/dist"
```

## 2. Environment variable (wajib)

Site configuration → Environment variables → Add:

| Key | Value |
| --- | --- |
| `VITE_GOOGLE_CLIENT_ID` | OAuth Client ID Anda, mis. `xxxx.apps.googleusercontent.com` |

`frontend/.env` di-gitignore, jadi nilai ini **harus** diisi di Netlify. Client ID bersifat
publik; aplikasi ini tidak memakai client secret sama sekali.

Setelah menambah/mengubah env var, jalankan **Deploys → Trigger deploy → Clear cache and
deploy site** (Vite menanam nilai env saat build, bukan saat runtime).

## 3. Authorized JavaScript origins (wajib)

Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID (tipe
*Web application*) → **Authorized JavaScript origins**. Tambahkan setiap alamat, persis
apa adanya, tanpa garis miring di akhir:

```
https://financial-tracker-v1.netlify.app
http://localhost:3000
```

Authorized redirect URIs tidak perlu diisi (aplikasi memakai token client, bukan redirect flow).
Pastikan **Google Sheets API** aktif di APIs & Services → Library.

Jika muncul `Error 400: origin_mismatch`, aplikasi menampilkan origin yang sedang dipakai di
dialog "Hubungkan spreadsheet" lengkap dengan tombol salin — tempel nilai itu ke daftar origin.

## 4. Halaman legal

Sudah tersedia sebagai berkas statis dan wajib diisikan ke OAuth consent screen:

- https://financial-tracker-v1.netlify.app/privacy.html
- https://financial-tracker-v1.netlify.app/terms.html

## 5. Verifikasi domain

`frontend/index.html` sudah memuat meta tag Google Search Console. Setelah deploy, klik
**Verify** di Search Console untuk properti `https://financial-tracker-v1.netlify.app/`.

Detail lengkap proses verifikasi OAuth ada di [`docs/GOOGLE_OAUTH_VERIFICATION.md`](../docs/GOOGLE_OAUTH_VERIFICATION.md).
