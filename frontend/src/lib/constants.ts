/**
 * ─────────────────────────────────────────────────────────────
 *  constants.ts — Single source of truth for design tokens,
 *  repeated class-strings, and external links.
 *
 *  Why: hardcoded values (backdrop opacity, tracking widths,
 *  font-sizes, URLs) were scattered across 20+ component files.
 *  Changing a backdrop color meant editing every modal/bottom-sheet
 *  one by one. This module centralises those values so a single
 *  edit propagates everywhere.
 * ─────────────────────────────────────────────────────────────
 */

/* ══════════════════════════════════════════════════════════════
 *  1. BACKDROP — overlay + blur shared by every modal / sheet
 * ══════════════════════════════════════════════════════════════ */

export const BACKDROP = {
  /** Standard backdrop for BottomSheet, PDFReportModal, LandingDrawer, etc. */
  overlay: "bg-black/65 backdrop-blur-sm",
  /** Lighter overlay used by shadcn Dialog / Sheet primitives. */
  dialogOverlay: "bg-black/65 backdrop-blur-sm",
} as const;

/* ══════════════════════════════════════════════════════════════
 *  2. UI_TOKENS — recurring Tailwind class combos that define
 *     the visual language of the app.
 * ══════════════════════════════════════════════════════════════ */

export const UI = {
  /* ── Typography ── */

  /** Tiny uppercase label above every page title ("Money map / accounts", etc.) */
  eyebrow: "text-[10px] font-bold uppercase tracking-[0.22em] text-primary",

  /** Section eyebrow inside cards (smaller tracking). */
  sectionLabel: "text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground",

  /** Sub-label in settings / sidebar panels (medium tracking). */
  subLabel: "text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground",

  /** Tiny footnote / meta text (11px) used across cards. */
  caption: "text-[11px] text-muted-foreground",

  /** Micro caption (10px) — progress bars, legends, etc. */
  micro: "text-[10px] text-muted-foreground",

  /** Micro caption but semibold. */
  microBold: "text-[10px] font-semibold text-muted-foreground",

  /* ── Surfaces ── */

  /** Standard glassmorphic card. */
  glassCard: "border-border/70 bg-card/75 backdrop-blur-xl",

  /** Card + shadow (most KPI / section cards). */
  glassCardShadow: "border-border/70 bg-card/75 shadow-sm backdrop-blur-xl",

  /** Primary-tinted highlight card (totals, CTA areas). */
  accentCard: "border-primary/20 bg-primary/8",

  /** Warning / notice banner. */
  warningBanner: "border-amber-500/40 bg-amber-500/10",

  /** Danger / error banner. */
  dangerBanner: "border-red-500/40 bg-red-500/10",

  /* ── Form elements ── */

  /** Default input / select field. */
  field: "h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary",

  /** Label above a field. */
  fieldLabel: "mb-1.5 block text-xs font-semibold text-muted-foreground sm:mb-2",

  /* ── Icon wrapper (the 40×40 rounded square used for every icon) ── */
  iconBox: "grid size-10 place-items-center rounded-xl",
} as const;

/* ══════════════════════════════════════════════════════════════
 *  3. APP_LINKS — all external URLs and internal routes gathered
 *     in one spot so that link-rot is easy to fix.
 * ══════════════════════════════════════════════════════════════ */

export const APP_LINKS = {
  /* ── External ── */
  TESTER_REGISTER: "https://s.id/selfmanage-register-tester",
  GOOGLE_CLOUD_CONSOLE: "https://console.cloud.google.com/apis/credentials",
  GOOGLE_SHEETS_BASE: "https://docs.google.com/spreadsheets/d",

  /* ── Internal routes ── */
  ROUTES: {
    home: "/",
    connect: "/connect",
    demo: "/demo",
    dashboard: "/dashboard",
    docs: "/docs",
    faq: "/faq",
    terms: "/terms",
    privacy: "/privacy",
  },
} as const;

/* ══════════════════════════════════════════════════════════════
 *  4. APP_META — brand strings referenced in titles, footers,
 *     and legal pages.
 * ══════════════════════════════════════════════════════════════ */

export const APP_META = {
  name: "_self.manage",
  tagline: "Money, made clear",
  copyright: (year = new Date().getFullYear()) => `© ${year} _self.manage`,
} as const;
