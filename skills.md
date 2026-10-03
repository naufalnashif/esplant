# AI ARCHITECTURAL & CODING GUIDELINES
**Project:** `_self.manage` (Personal Finance Web/PWA)  
**Standard:** Enterprise Production-Ready, Offline-First, Cross-Platform  
**Stack Target:** React 18+ / TypeScript Strict / Tailwind CSS / PWA Service Worker / Google Sheets API Sync  
**Deployment Infrastructure:** Dual-Live Synchronization (Netlify & Vercel Parity)

---

## 1. Core Mission & Architectural Governance

Dokumen ini adalah kontrak arsitektur absolut (*mandatory architectural contract*) untuk semua model AI, agen otonom, dan engineer manusia yang berkontribusi pada repositori `_self.manage`.

Setiap modifikasi kode, penambahan fitur, atau refactoring wajib lolos validasi pada 9 pilar rekayasa perangkat lunak berikut:

```
                  ┌────────────────────────────────────────────────────────┐
                  │          _self.manage ENGINE ARCHITECTURE              │
                  └───────────────────────────┬────────────────────────────┘
                                              │
         ┌────────────────────────────────────┼────────────────────────────────────┐
         ▼                                    ▼                                    ▼
┌──────────────────┐               ┌───────────────────────┐            ┌──────────────────┐
│  1. SOFTWARE ENG │               │ 2. MOBILE & UI/UX     │            │ 3. BI & METRICS  │
│  - Strict TS     │               │ - dvh / safe-areas    │            │ - Rolling Base   │
│  - Atomic DRY    │               │ - Bottom Sheet Modal  │            │ - Granularity    │
│  - Custom Hooks  │               │ - Dual-Theme Harmony  │            │ - Adaptive Scale │
└────────┬─────────┘               └──────────┬────────────┘            └────────┬─────────┘
         │                                    │                                  │
         ├────────────────────────────────────┼──────────────────────────────────┤
         ▼                                    ▼                                  ▼
┌──────────────────┐               ┌───────────────────────┐            ┌──────────────────┐
│ 4. WEB SECURITY  │               │ 5. API & PERFORMANCE  │            │ 6. PRODUCT UX    │
│ - Zod Validation │               │ - SWR Engine          │            │ - 1x Onboarding  │
│ - XSS Defense    │               │ - Mutex Sync Queue    │            │ - Snooze Cloud   │
│ - Storage Bounds │               │ - Delta Fetching      │            │ - Release Notes  │
└────────┬─────────┘               └──────────┬────────────┘            └────────┬─────────┘
         │                                    │                                  │
         └────────────────────────────────────┴──────────────────────────────────┘
                                              │
                      ┌───────────────────────┴───────────────────────┐
                      ▼                                               ▼
          ┌────────────────────────┐                     ┌────────────────────────┐
          │ 7. MODULAR DASHBOARD   │                     │ 8. DUAL-DEPLOY PARITY  │
          │ - 12-Col Desktop       │                     │ - Netlify redirects    │
          │ - 1-Col Mobile Stack   │                     │ - Vercel SPA rewrites  │
          │ - Debounced Resize     │                     │ - Service Worker TTL   │
          └────────────────────────┘                     └────────────────────────┘
```

---

## 2. Software Engineering, Atomic Modularity & DRY Standards

### A. Strict TypeScript Discipline (Zero `any` Tolerance)
1. **Dilarang Keras** mendeklarasikan tipe `any`. Gunakan `unknown` yang diiringi *Type Guard Predicates* atau validasi skema runtime.
2. Semua entitas domain finansial wajib didefinisikan dengan tipe nominal/branded:
```typescript
export type IDR = number & { readonly __brand: unique symbol };
export type ISO8601Date = string; // Format: YYYY-MM-DD
export type StorageMode = 'DEMO_SANDBOX' | 'OFFLINE_LOCAL' | 'GOOGLE_SHEET_CONNECTED';
export type Granularity = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface TransactionItem {
  readonly id: string;
  readonly amount: IDR;
  readonly title: string;
  readonly category: string;
  readonly date: ISO8601Date;
  readonly isRecurring?: boolean;
  readonly bundleTag?: string;
  readonly isExcludedFromBaseline?: boolean;
}

export function toIDR(value: number): IDR {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`Invalid currency amount: ${value}`);
  }
  return Math.round(value) as IDR;
}
```

### B. Compound Component Pattern & Atomic Directory Layout
Dilarang membuat komponen monolitik (>250 baris per file). Direktori wajib terstruktur secara konsisten:
```
src/
├── components/
│   ├── ui/               # Atomic primitives: Button, Input, Badge, Pill, Card
│   ├── common/           # Molecular reusable: ModalSheet, NavigationBar, Header
│   ├── modules/          # Business containers: TransactionDrawer, NotificationCenter
│   └── dashboard/        # Modular dashboard widgets: HeroCard, CashFlowWidget
├── hooks/                # Isolated reactive logic: useCashFlow, useSWRStorage
├── services/             # Pure I/O: sheetApi, storageAdapter, encryption
├── utils/                # Pure deterministic math & formatting
└── types/                # Ambient & domain typings
```

Komponen container kompleks wajib menggunakan pola **Compound Component**:
```tsx
<WidgetContainer id="cashflow-trend" defaultSpan={8}>
  <WidgetContainer.Header title="Tren Finansial" badge="Siklus Aktif" />
  <WidgetContainer.Body loadingFallback={<ChartSkeleton height={240} />}>
    <CashFlowChart />
  </WidgetContainer.Body>
  <WidgetContainer.Footer lastUpdated="Baru saja" />
</WidgetContainer>
```

### C. Pure State Separation (Logic vs Presentation)
Komponen view tidak boleh melakukan perhitungan agregasi keuangan secara langsung. Semua komputasi statistik (rata-rata, pengelompokan siklus, deviasi) wajib ditempatkan pada Custom Hooks yang ter-memoize (`useMemo`) dengan dependensi data stabil.

---

## 3. Mobile-First Space Efficiency & Professional UI/UX Architecture

### A. Mobile Viewport & Hardware Safe Areas (iOS & Android)
1. **Dynamic Viewport Height:** Dilarang menggunakan `100vh` karena memicu *layout jump* saat toolbar Safari/Chrome muncul dan hilang. Gunakan `100dvh` atau class `min-h-[100dvh]`.
2. **Safe-Area Inset Enforcement:**
```css
/* Container Root Mobile Navigation */
.bottom-nav-container {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding-bottom: max(env(safe-area-inset-bottom), 12px);
  height: calc(64px + max(env(safe-area-inset-bottom), 12px));
}

/* Floating Action Button (FAB) Anchor */
.fab-button-position {
  position: fixed;
  bottom: calc(64px + max(env(safe-area-inset-bottom), 12px) + 12px);
  right: 16px;
}

/* Main Dashboard Scroll View */
.main-content-scroll {
  padding-bottom: calc(88px + max(env(safe-area-inset-bottom), 16px));
}
```
3. **Space-Efficiency Padding:**
   - Mobile ($< 640\text{px}$): Container padding `p-3.5` hingga `p-4`. Jarak antar-card `gap-3`.
   - Desktop ($> 1024\text{px}$): Container padding `p-6` hingga `p-8`. Jarak antar-card `gap-6`.
4. **Touch Target Standard:** Minimal area klik untuk seluruh elemen interaktif adalah $44 \times 44\text{px}$.

### B. Mobile Bottom Sheet Pattern (Standard Modal)
Di layar HP, seluruh popup interaktif (Notifikasi, Transaksi Baru, Profil, Edit Siklus) **wajib** menggunakan Bottom Sheet, bukan dialog melayang di tengah layar:
- Lebar penuh (`w-full`), rounded top (`rounded-t-3xl`), tinggi dinamis maksimal `max-h-[85dvh]`.
- Sticky header dengan judul, counter badge, dan tombol tutup (`✕`).
- Area konten wajib dibungkus `overflow-y-auto` dengan `overscroll-contain` untuk mematikan efek bounce scroll pada body browser iOS.
- Drag handle bar visual di bagian atas: `w-12 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-700 mx-auto my-2`.

### C. Dual-Theme Visual Harmony (Dark vs Eye-Friendly Light)
Sistem tema dilarang mengandalkan latar belakang `#FFFFFF` polos untuk seluruh halaman pada Light Mode. Terapkan kontras bertingkat (*depth & surface hierarchy*):

| UI Token | Dark Mode (High-Contrast Sleek) | Light Mode (Warm & Soft Eye-Friendly) |
| :--- | :--- | :--- |
| **App Canvas / Canvas BG** | `#0B0C0E` (Obsidian pekat) | `#F8FAFC` (Slate-50) |
| **Primary Cards** | `#141518` (Zinc-900 surface) | `#FFFFFF` (Pure White elevated) |
| **Secondary Cards / Pill** | `#1C1E22` | `#F1F5F9` (Slate-100) |
| **Hero Saldo Card** | `#181A1F` border `rgba(245,158,11,0.2)` | `#FFFFFF` dengan subtle amber edge glow |
| **Primary Headings** | `#FFFFFF` | `#0F172A` (Slate-900) - jangan gunakan `#000` |
| **Secondary Text** | `#9CA3AF` (Gray-400) | `#475569` (Slate-600) |
| **Muted Metadata** | `#6B7280` (Gray-500) | `#64748B` (Slate-500) |
| **Brand Accent (Amber)** | `#F59E0B` (Amber-500 Bright) | `#D97706` (Amber-600 High Contrast WCAG AA) |
| **Soft Amber Badges** | `rgba(245,158,11,0.15)` / `#FBBF24` | `rgba(245,158,11,0.12)` / `#B45309` |
| **Card Borders** | `1px solid rgba(255,255,255,0.08)` | `1px solid rgba(226,232,240,0.85)` (`border-slate-200`) |
| **Elevation Shadow** | `0 10px 30px -10px rgba(0,0,0,0.5)` | `0 1px 3px rgba(0,0,0,0.04), 0 6px 16px rgba(0,0,0,0.03)` |

### D. Zero Layout Shift (CLS Elimination)
1. **Hero Typewriter Text:** Wajib memiliki container pembungkus dengan properti `min-height` atau elemen *invisible ghost placeholder* yang merefleksikan karakter terpanjang agar teks tidak memicu lonjakan vertikal (*zero jump*).
2. **Skeleton Fallback:** Seluruh chart, card saldo, dan feed notifikasi dinamis wajib memiliki placeholder skeleton dengan rasio aspek dan dimensi tinggi yang identik sebelum data selesai di-render.

---

## 4. Business Intelligence (BI) & Financial Data Engineering

### A. Historical Rolling Baseline Calculation
Baseline rata-rata pengeluaran dinamis (harian, mingguan, bulanan, tahunan) harus dihitung secara murni dari data historis yang sudah tutup buku ($t < \text{current\_period}$):

$$\overline{E}_{\text{period}} = \frac{1}{N} \sum_{i=1}^{N} E_i \quad \text{di mana } i \notin \text{Siklus Berjalan}$$

1. **Anti-Skew Rule:** Pengeluaran pada periode berjalan yang belum selesai dilarang dimasukkan ke dalam perhitungan baseline rata-rata karena akan membuat patokan *budget guardrail* menjadi fluktuatif dan menyesatkan.
2. **Anomaly Detection:** Trigger notifikasi pengeluaran berlebih jika:
   $$E_{\text{hari\_ini}} > 1.5 \times \overline{E}_{\text{harian\_historis}}$$

### B. Dynamic Payday & Custom Closing Period Engine
Sistem tidak boleh mengunci pembukuan pada tanggal 1 kalender saja:
- Dukung konfigurasi tanggal gajian ($D \in [1, 31]$).
- Rentang siklus aktif dihitung otomatis:
  - Jika hari ini tanggal $\ge D$: Siklus dimulai tanggal $D$ bulan ini s/d $(D - 1)$ bulan berikutnya.
  - Jika hari ini tanggal $< D$: Siklus dimulai tanggal $D$ bulan lalu s/d $(D - 1)$ bulan ini.
  - Jika $D = 1$: Gunakan batas bulan kalender normal.

### C. Chart Visualization Guardrails (Anti-Lag & Freezing)
Untuk menghindari penurunan frame rate akibat rendering ribuan node SVG/Canvas:
1. **Granularity Hard Bounds:**
   - Rentang $\le 31$ hari: Boleh resolusi **Harian**.
   - Rentang $32 - 90$ hari: Paksa pengelompokan **Mingguan**.
   - Rentang $91 - 730$ hari: Paksa pengelompokan **Bulanan**.
   - Rentang $> 730$ hari ($> 2$ tahun): Paksa pengelompokan **Tahunan**.
2. **Sparse Data Domain Scaling:**
   Jika riwayat data user baru terkumpul 2 bulan, sumbu grafik arus kas wajib melakukan autoscaling domain ke 2 bulan tersebut secara proporsional, bukan memaksakan ruang kosong 6 bulan yang flat. Berikan teks edukatif: *"Data tren 6 bulan akan terbentuk optimal seiring siklus pencatatan Anda."*
3. **Synchronized Global Filter:**
   Filter periode (`Hari Ini`, `Minggu Ini`, `Siklus Ini`, `Tahun Ini`) pada dashboard utama harus menggerakkan metrik ringkasan, chart distribusi, dan chart pembanding secara sinkron.

---

## 5. Web Security, Data Boundary & Input Sanitization

### A. Strict Input Boundaries & Validation Schema (Zod)
Semua form input wajib divalidasi ketat sebelum masuk ke state memory atau persistent storage:
```typescript
import { z } from 'zod';

export const UserProfileSchema = z.object({
  userName: z
    .string()
    .trim()
    .min(1, 'Nama wajib diisi')
    .max(50, 'Nama maksimal 50 karakter')
    .regex(/^[a-zA-Z0-9\s.,'-]+$/, 'Karakter tidak valid'),
  closingDay: z.number().int().min(1).max(31),
  isOnboardingCompleted: z.boolean(),
  storageMode: z.enum(['DEMO_SANDBOX', 'OFFLINE_LOCAL', 'GOOGLE_SHEET_CONNECTED']),
  isSheetConnected: z.boolean(),
});

export const TransactionInputSchema = z.object({
  amount: z.number().positive().max(999_999_999_999, 'Nominal melampaui batas wajar'),
  title: z.string().trim().min(1).max(60),
  category: z.string().trim().min(1).max(30),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD'),
  bundleTag: z.string().max(30).optional(),
});
```

### B. XSS Defense & Storage Deserialization
1. **Zero Raw Markup Injection:** Dilarang menggunakan `dangerouslySetInnerHTML`. Gunakan text node standar. Jika format teks kaya diperlukan, wajib dibersihkan menggunakan `DOMPurify.sanitize()`.
2. **Safe JSON Parse Utility:** Seluruh pembacaan `localStorage` wajib dibungkus fungsi deserialisasi aman yang kebal crash:
```typescript
export function safeStorageGet<T>(key: string, schema: z.ZodSchema<T>, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    const result = schema.safeParse(parsed);
    return result.success ? result.data : fallback;
  } catch {
    return fallback;
  }
}
```

### C. Total Data Isolation (Production vs Sandbox)
- **Namespaced Keys:**
  - Produksi: `_self_prod_data_v1`, `_self_prod_profile_v1`
  - Sandbox: `_self_sandbox_data_v1`, `_self_sandbox_profile_v1`
- Memilih menu "Coba Demo (Lokal)" **dilarang menghapus atau menimpa** data produksi. Mode Sandbox harus berjalan pada isolated sandbox store dan langsung terisi data dummy tanpa memicu *race condition* atau layar putih.

---

## 6. Performance Engineering & Google Sheets Quota Defense

```
[UI Component Input] ──► [Optimistic Local Update] ──► [Debounce Buffer 500ms]
                                                               │
                                                      [Write-Back Queue]
                                                               │
                              ┌────────────────────────────────┴────────────────────────────────┐
                              ▼                                                                 ▼
                   [IndexedDB / Local Cache]                                          [Google Sheets API]
                   (Penyimpanan Instan)                                               (Batch Mutex Sync)
```

### A. Stale-While-Revalidate (SWR) Client Engine
1. Permintaan baca (*read*) ke Google Sheets API tidak boleh ditembakkan setiap kali komponen mount.
2. Terapkan strategi SWR dengan TTL bertingkat:
   - Data riwayat transaksi: TTL 15 menit.
   - Saldo & metadata profil: TTL 3 menit.
3. Gunakan *Delta Fetching*: Hanya baca baris spreadsheet yang berubah sejak `last_sync_timestamp`.

### B. Batched Mutations & Mutex Queue
1. Eksekusi form transaksi wajib menerapkan **Optimistic UI Update**: Update state lokal secara instan dalam 16ms, lalu masukkan mutasi ke antrean (*queue*).
2. Terapkan debounce sync minimal 500ms untuk menggabungkan input beruntun menjadi satu payload batch append ke Google Sheets API, mencegah limit quota *100 requests per 100 seconds per user*.

---

## 7. Product Management, User Lifecycle & Onboarding UX

### A. Lifecycle State Machine (Anti-Looping)
```
[Aplikasi / PWA Dibuka]
          │
          ├── Profil Tersimpan & isOnboardingCompleted === true?
          │         │
          │         ├── YA  ──► Langsung Masuk /dashboard (Bypass Landing Page)
          │         │                 │
          │         │                 ├── Mode Spreadsheet ──► Tampilan Bersih Normal
          │         │                 └── Mode Lokal Saja   ──► Tampilkan Banner Snooze Halus
          │         │
          │         └── TIDAK ──► Landing Page ──► Klik Mulai/Demo ──► Modal Onboarding (1x Saja)
```

- **Permanent Completion Flag:** Simpan status onboarding dengan aman. DILARANG memunculkan kembali dialog Nama dan Siklus Keuangan jika user sudah pernah mengisinya.
- **Pengaturan Ulang:** Perubahan nama atau tanggal closing hanya boleh dilakukan melalui halaman **Pengaturan**, bukan modal interupsi saat aplikasi dibuka.

### B. Subtle Non-Intrusive Cloud Sync Banner
User yang menggunakan mode lokal tanpa spreadsheet tidak boleh diinterupsi oleh dialog modal yang memblokir layar. Tampilkan banner kartu inline di dashboard:
- Warna soft Slate-100 / Amber-50 muda dengan border putus-putus halus.
- Pesan: *"Data tersimpan aman di perangkat ini. Hubungkan Google Drive kapan saja untuk backup otomatis."*
- Sediakan tombol *"Nanti Saja"* yang mengaktifkan snooze selama 7 hari via `localStorage.setItem('sheet_nudge_snoozed_until', Date.now() + 7 * 86400000)`.

### C. In-App Release Notes Engine
Definisikan konstanta versi pada app config:
```typescript
export const APP_VERSION = '2.2.0';
export const RELEASE_NOTES = {
  version: '2.2.0',
  title: 'Pembaruan UI Light Mode & Navigasi Mobile',
  highlights: [
    'Tampilan Light Mode baru yang nyaman di mata dengan aksen amber.',
    'Navigasi bawah dioptimalkan untuk safe-area layar HP.',
    'Dashboard modular yang dapat disesuaikan.',
  ],
};
```
Saat inisialisasi aplikasi, jika `last_seen_version !== APP_VERSION`:
1. Buat satu pesan otomatis di Notification Center.
2. Tampilkan toast banner halus: *"Aplikasi diperbarui ke v2.2.0. Klik untuk melihat pembaruan."*
3. Simpan versi ke persistent storage setelah ditutup.

---

## 8. Modular & Customizable Dashboard Layout Engine

### A. 12-Column Responsive Matrix (Desktop) vs Strict 1-Column Stack (Mobile)
1. **Desktop Engine ($> 768\text{px}$):**
   - Menggunakan 12-kolom Responsive Grid.
   - User dapat mengatur widget span: `col-span-4` (Small), `col-span-6` (Medium / Half), `col-span-8` (Wide), atau `col-span-12` (Full Width).
2. **Mobile Enforcement ($< 768\text{px}$):**
   - **Matikan seluruh resize multi-kolom.** Semua widget otomatis dipaksa menjadi `w-full` (1 kolom vertikal) demi menjaga keterbacaan data finansial pada layar smartphone.
   - Di mobile, kustomisasi dibatasi pada:
     - Toggle Visibilitas (Munculkan / Sembunyikan Widget).
     - Pengaturan Urutan Prioritas (Re-order urutan vertikal via Bottom Sheet).

### B. Layout Persistence Schema
```typescript
export interface WidgetLayoutItem {
  id: 'hero_balance' | 'cashflow_chart' | 'summary_metrics' | 'quick_filters' | 'upcoming_bills';
  isVisible: boolean;
  order: number;
  desktopColSpan: 4 | 6 | 8 | 12;
}

export const DEFAULT_DASHBOARD_LAYOUT: WidgetLayoutItem[] = [
  { id: 'hero_balance', isVisible: true, order: 1, desktopColSpan: 7 },
  { id: 'cashflow_chart', isVisible: true, order: 2, desktopColSpan: 5 },
  { id: 'quick_filters', isVisible: true, order: 3, desktopColSpan: 12 },
  { id: 'summary_metrics', isVisible: true, order: 4, desktopColSpan: 12 },
  { id: 'upcoming_bills', isVisible: true, order: 5, desktopColSpan: 12 },
];
```
- Skema tata letak wajib divalidasi saat aplikasi dimuat. Jika key korup, lakukan *graceful reset* ke `DEFAULT_DASHBOARD_LAYOUT`.
- Berikan tombol instan: *"Kembalikan Tata Letak ke Default"*.

---

## 9. Dual-Platform Hosting Parity (Netlify & Vercel)

Aplikasi harus dapat di-build dan di-deploy secara identik di kedua platform tanpa konfigurasi bercabang (*zero vendor lock-in*).

### A. Netlify Configuration: `public/_redirects`
File ini wajib ada di folder `public/`:
```text
/*    /index.html   200
```

### B. Vercel Configuration: `vercel.json`
File ini wajib berada di root repository:
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/sw.js",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        },
        {
          "key": "Content-Type",
          "value": "application/javascript; charset=utf-8"
        }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

---

## 10. AI Agent Execution Checklist

Sebelum menyatakan pekerjaan selesai dan merilis kode, setiap model AI wajib memverifikasi daftar periksa berikut:

- [ ] **Tidak ada kode duplikat:** Komponen UI menggunakan yang sudah ada di direktori `src/components/`.
- [ ] **Zero TypeScript Errors:** Kompilasi `tsc --noEmit` bersih tanpa tipe `any`.
- [ ] **Mobile Safe Area:** Bottom bar dan floating action button tidak tertutup navigation bar iOS/Android.
- [ ] **Light Mode Check:** Latar belakang menggunakan `#F8FAFC`, teks `#0F172A`, dan card saldo tidak hitam legam.
- [ ] **Onboarding Check:** Tidak menanyakan nama dan siklus kepada user lama yang membuka aplikasi.
- [ ] **Input Sanitization:** Seluruh input form dibatasi panjang karakter dan nominal validasi Zod.
- [ ] **Build Parity:** Konfigurasi `public/_redirects` dan `vercel.json` tersedia dan teruji.