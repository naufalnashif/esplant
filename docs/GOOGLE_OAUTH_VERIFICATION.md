# Checklist verifikasi Google OAuth — `_self.manage`

Domain produksi: `https://financial-tracker-v1.netlify.app`
Nama aplikasi resmi (harus sama di semua tempat): **`_self.manage`**

---

## A. Tiga penolakan Google & status perbaikannya

### 1. "Website home page URL is not registered to you"

Google meminta bukti kepemilikan domain.

- [x] Meta tag verifikasi sudah dipasang di `frontend/index.html`:
      `<meta name="google-site-verification" content="cCXrIbLero7Ahl9wWtT3bfIBqPaPyYPBYMfMiFQVwz4" />`
- [ ] Deploy ulang Netlify, lalu buka [Google Search Console](https://search.google.com/search-console),
      pilih properti **URL prefix** `https://financial-tracker-v1.netlify.app/`, metode **HTML tag**, klik **Verify**.
- [ ] Pastikan akun Google yang memverifikasi **sama** dengan akun pemilik project Google Cloud.
- Cek cepat: `curl -s https://financial-tracker-v1.netlify.app/ | grep google-site-verification`

### 2. "Privacy policy page does not have sufficient content"

- [x] Halaman khusus dibuat: `frontend/public/privacy.html` → `/privacy.html`
      (berisi identitas aplikasi, jenis data, daftar scope, pernyataan **Limited Use**, cara mencabut
      akses, cara menghapus data, tanggal pembaruan, dan email kontak).
- [x] Halaman Terms dibuat: `frontend/public/terms.html` → `/terms.html`
- [ ] Di OAuth consent screen → **Branding**, isi:
      - Application privacy policy link: `https://financial-tracker-v1.netlify.app/privacy.html`
      - Application terms of service link: `https://financial-tracker-v1.netlify.app/terms.html`
      - Application home page: `https://financial-tracker-v1.netlify.app`

### 3. "App name does not match the app name on your home page"

- [x] Seluruh aplikasi (title tab, header dashboard, hero landing page, footer laporan PDF)
      kini menampilkan `_self.manage`.
- [ ] Di OAuth consent screen → **Branding** → **App name**, tulis persis: `_self.manage`
- [ ] Kosongkan / hapus nama lama seperti "financial-tracker" atau "Esplan(t)".

---

## B. Pengaturan OAuth yang benar

**APIs & Services → Library**

- [ ] Google Sheets API: **Enabled**
- [ ] Google Drive API: **Enabled** (dipakai hanya untuk membuat berkas baru lewat scope `drive.file`)

**Credentials → OAuth 2.0 Client ID (Web application)**

- [ ] Authorized JavaScript origins:
      - `https://financial-tracker-v1.netlify.app`
      - `http://localhost:3000`
      - (opsional) URL preview Emergent saat pengembangan
- [ ] Authorized redirect URIs: **kosong** — aplikasi memakai GIS token client, bukan redirect flow.
- [ ] Client secret **tidak dipakai** dan tidak boleh ditaruh di frontend.

**Data Access (scopes)** — minta hanya dua ini:

| Scope | Alasan yang dikirim ke Google |
| --- | --- |
| `https://www.googleapis.com/auth/spreadsheets` | Membaca dan menulis baris transaksi, akun, anggaran, tagihan, dan target pada spreadsheet yang dipilih pengguna. Tanpa akses tulis, fitur tambah/ubah/hapus tidak dapat berjalan. |
| `https://www.googleapis.com/auth/drive.file` | Membuat satu berkas spreadsheet baru di Drive pengguna bila mereka memilih opsi "buat baru otomatis". Aplikasi tidak mengakses berkas Drive lain. |

Jangan tambahkan scope lain (email, profile, `drive.readonly`, dsb.) — setiap scope tambahan
memperpanjang proses review.

---

## C. Demo video (diminta Google untuk scope sensitif)

Rekam layar tanpa dipotong, ±2 menit, bahasa Inggris atau Indonesia, urutan:

1. Tampilkan URL `https://financial-tracker-v1.netlify.app` di address bar dan nama `_self.manage` di halaman.
2. Klik **Hubungkan Spreadsheet** → tampilkan dialog consent Google, **tunjukkan nama aplikasi `_self.manage`
   dan daftar scope pada layar consent** (ini wajib terlihat).
3. Setelah login, tambahkan satu transaksi di aplikasi.
4. Buka spreadsheet di tab lain dan tunjukkan baris tersebut muncul di tab `Transactions`.
5. Ubah lalu hapus transaksi itu, tunjukkan perubahannya di spreadsheet.
6. Tunjukkan halaman `/privacy.html`.
7. Tunjukkan pencabutan akses di `myaccount.google.com/permissions`.

Unggah ke YouTube sebagai **Unlisted**, tempel tautannya di form verifikasi.

---

## D. Selama menunggu verifikasi

- Publishing status **Testing**: hanya email di daftar **Test users** (maks. 100) yang bisa login.
  Tambahkan email penguji Anda di OAuth consent screen → Audience → Test users.
- Publishing status **In production** + belum diverifikasi: pengguna melihat layar
  "Google hasn't verified this app" (masih bisa lanjut lewat *Advanced*), dan tetap dibatasi 100 pengguna
  untuk scope sensitif.
- Setelah verifikasi disetujui: tanpa batas pengguna, tanpa biaya. Kuota gratis Sheets API
  300 permintaan/menit/project dan 60 permintaan/menit/pengguna sudah lebih dari cukup karena
  aplikasi menulis secara batch dan ditunda (debounce).

---

## E. Uji cepat setelah deploy

```bash
curl -s https://financial-tracker-v1.netlify.app/ | grep -o "google-site-verification[^/]*"
curl -sI https://financial-tracker-v1.netlify.app/privacy.html | head -1   # HTTP/2 200
curl -sI https://financial-tracker-v1.netlify.app/terms.html | head -1     # HTTP/2 200
curl -s https://financial-tracker-v1.netlify.app/ | grep -o "_self.manage" | head -1
```

Di aplikasi: buka dialog connect → jangan sampai muncul peringatan
"Google OAuth belum dikonfigurasi" (artinya `VITE_GOOGLE_CLIENT_ID` belum ter-build).
