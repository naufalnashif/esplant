# Deploy Esplan ke Netlify

Esplan adalah aplikasi statis (Vite + React). Tidak ada database milik aplikasi:
data keuangan tersimpan di spreadsheet Google milik masing-masing pengguna, atau di
IndexedDB browser saat mode lokal dipakai.

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

`frontend/.env` tidak ikut ter-commit (di-ignore), jadi nilai ini harus diisi di Netlify.
Client ID bersifat publik — tidak ada client secret yang dipakai aplikasi ini.

## 3. Google Cloud Console (wajib, kalau tidak akan muncul `Error 400: origin_mismatch`)

APIs & Services → Credentials → OAuth 2.0 Client ID (tipe *Web application*) →
**Authorized JavaScript origins**, tambahkan setiap alamat tempat aplikasi dibuka,
persis apa adanya dan tanpa garis miring di akhir:

```
https://naufalnashif-financial.netlify.app
https://<subdomain-preview>.preview.emergentagent.com
http://localhost:3000
```

Authorized redirect URIs tidak perlu diisi (aplikasi memakai token client, bukan redirect flow).
Pastikan juga **Google Sheets API** aktif di APIs & Services → Library.

Origin yang sedang dipakai selalu ditampilkan aplikasi di dialog "Hubungkan spreadsheet"
ketika Google menolak login, lengkap dengan tombol salin.

## 4. Jumlah pengguna

Selama OAuth consent screen masih *Testing*, hanya email yang terdaftar sebagai
**Test users** yang bisa login (maks. 100). Untuk publik, klik **Publish app**; karena
scope `spreadsheets` termasuk sensitif, Google akan meminta proses verifikasi (gratis).
