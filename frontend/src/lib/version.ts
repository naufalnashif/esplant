/**
 * ─────────────────────────────────────────────────────────────
 *  version.ts — Single source of truth for application version,
 *  changelog entries, and update-notification logic.
 *
 *  When bumping a version:
 *    1. Update APP_VERSION below
 *    2. Add an entry to CHANGELOG at index 0 (newest first)
 *    3. The version badge + changelog page auto-update
 *    4. First visit after a version change triggers a toast
 * ─────────────────────────────────────────────────────────────
 */

export const APP_VERSION = "1.0.0-beta";

/** ISO date of the latest release — shown on the changelog page. */
export const APP_VERSION_DATE = "2026-10-03";

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  /** Short summary shown in the update toast notification */
  summary: string;
  changes: {
    type: "added" | "fixed" | "changed" | "removed" | "improved";
    text: string;
  }[];
}

const TYPE_LABELS: Record<ChangelogEntry["changes"][number]["type"], string> = {
  added: "Baru",
  fixed: "Perbaikan",
  changed: "Perubahan",
  removed: "Dihapus",
  improved: "Peningkatan",
};

export const getTypeLabel = (type: ChangelogEntry["changes"][number]["type"]) => TYPE_LABELS[type];

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "1.0.0-beta",
    date: "2026-10-03",
    title: "Rilis Beta Pertama",
    summary: "Rilis beta pertama _self.manage — sistem version tracking aktif!",
    changes: [
      { type: "added", text: "Sistem pelacakan versi dan halaman changelog" },
      { type: "added", text: "Notifikasi update otomatis saat versi baru tersedia" },
      { type: "added", text: "Tombol versi di landing page dan dashboard" },
      { type: "added", text: "Pelacak keuangan pribadi dengan Google Sheets atau mode lokal" },
      { type: "added", text: "Dashboard ringkasan finansial dengan grafik arus kas" },
      { type: "added", text: "Manajemen akun (bank, e-wallet, kartu kredit, tunai, investasi)" },
      { type: "added", text: "Komitmen: tagihan, cicilan, utang/piutang" },
      { type: "added", text: "Goals: celengan/tabungan dan wishlist" },
      { type: "added", text: "Budget guardrails per kategori" },
      { type: "added", text: "Export JSON, XLSX, dan cetak PDF" },
      { type: "added", text: "Mode gelap dan terang" },
      { type: "added", text: "Progressive Web App (PWA) — install di layar utama" },
      { type: "added", text: "Sinkronisasi dua arah dengan Google Spreadsheet" },
      { type: "added", text: "Mode demo lokal dengan data contoh" },
    ],
  },
];

/* ─────────────────────── Update notification ─────────────────────── */

const SEEN_VERSION_KEY = "selfmanage-seen-version";

/** Returns the latest version if the user has NOT seen it yet, otherwise null. */
export function getUnseenVersion(): string | null {
  try {
    const seen = localStorage.getItem(SEEN_VERSION_KEY);
    if (seen === APP_VERSION) return null;
    return APP_VERSION;
  } catch {
    return null;
  }
}

/** Marks the current version as seen — call after showing the toast. */
export function markVersionSeen(): void {
  try {
    localStorage.setItem(SEEN_VERSION_KEY, APP_VERSION);
  } catch {
    /* private mode */
  }
}
