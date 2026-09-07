# Deploy Esplant ke Netlify (Statis + Serverless Functions)

Frontend Vite dibangun sebagai situs statis; integrasi Gmail OAuth dan Resend berjalan
sebagai **Netlify Functions** dengan path yang identik dengan backend FastAPI
(`/api/integrations/...`), sehingga **kode frontend tidak perlu diubah sama sekali**.

Token OAuth disimpan terenkripsi (AES-256-GCM) di **Netlify Blobs** — key-value storage
bawaan Netlify (gratis), bukan database yang Anda kelola. Data keuangan pengguna tetap
100% di browser (IndexedDB).

## Langkah deploy

1. Push repo ini ke GitHub, lalu di Netlify: **Add new site → Import from Git**.
2. Netlify otomatis membaca `netlify.toml` di root (build: `cd frontend && yarn install && yarn build`, publish: `frontend/dist`, functions: `netlify/functions`).
3. Set **Environment variables** di Site settings → Environment variables:

   | Variable | Nilai |
   |---|---|
   | `GOOGLE_CLIENT_ID` | Dari Google Cloud Console (OAuth Client ID, tipe Web) |
   | `GOOGLE_CLIENT_SECRET` | Dari Google Cloud Console |
   | `RESEND_API_KEY` | Dari https://resend.com/api-keys |
   | `REPORT_FROM_EMAIL` | `onboarding@resend.dev` (sandbox) atau email domain terverifikasi |
   | `REPORT_RECIPIENT_EMAIL` | (Opsional) fallback email tujuan laporan |

4. Di **Google Cloud Console → APIs & Services → Credentials → OAuth Client**, tambahkan
   Authorized redirect URI:

   ```
   https://NAMA-SITE-ANDA.netlify.app/api/integrations/gmail/callback
   ```

5. Deploy. Selesai — tidak perlu server terpisah.

## Catatan penting

- **Resend sandbox**: selama domain belum diverifikasi di Resend, pengirim
  `onboarding@resend.dev` hanya bisa mengirim ke alamat email pemilik akun Resend.
  Verifikasi domain di https://resend.com/domains untuk mengirim ke email mana pun.
- **Scheduler laporan**: reminder browser berjalan lokal. Untuk pengiriman otomatis saat
  browser tertutup, Anda bisa menambah [Netlify Scheduled Functions](https://docs.netlify.com/functions/scheduled-functions/)
  — namun laporan butuh data dari perangkat, jadi desain local-first tetap mengandalkan
  reminder + kirim manual satu klik.
- **Keamanan**: `GOOGLE_CLIENT_SECRET` dan `RESEND_API_KEY` hanya hidup di environment
  Functions. Scope Gmail hanya `gmail.readonly`. Token dienkripsi sebelum disimpan.

## Pemetaan endpoint

| Path | Function |
|---|---|
| `GET /api/integrations/gmail/start` | `gmail-start.mjs` |
| `GET /api/integrations/gmail/callback` | `gmail-callback.mjs` |
| `GET /api/integrations/gmail/status` | `gmail-status.mjs` |
| `POST /api/integrations/gmail/scan` | `gmail-scan.mjs` |
| `DELETE /api/integrations/gmail` | `gmail-disconnect.mjs` |
| `POST /api/integrations/reports/send` | `reports-send.mjs` |
