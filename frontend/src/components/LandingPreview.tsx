import { lazy, Suspense, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowUpRight, Banknote, BookOpen, Building2, ChevronDown, CreditCard, FileSpreadsheet,
  HardDrive, Landmark, LayoutGrid, Lock, Menu, MessageSquarePlus, PiggyBank, RefreshCw, Send,
  ShieldCheck, Sparkles, TrendingDown, TrendingUp, UserPlus, Wallet, WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandMark } from "@/components/BrandMark";
import { LandingDrawer } from "@/components/mobile/LandingDrawer";
import { Reveal } from "@/components/Reveal";
import { useDocumentTitle } from "@/hooks/useReveal";
import { useStorage } from "@/lib/storageContext";

const TESTER_URL = "https://s.id/selfmanage-register-tester";

// These dialogs pull in authentication, upload, and modal dependencies. Keep them out of
// the landing's critical bundle and fetch them only after the user asks to open one.
const ConnectSheetDialog = lazy(() => import("@/components/ConnectSheetDialog").then((module) => ({ default: module.ConnectSheetDialog })));
const FeedbackDialog = lazy(() => import("@/components/FeedbackDialog").then((module) => ({ default: module.FeedbackDialog })));

/* ── Hero sparkline (dependency-free, keeps first paint light) ── */
const flow = [
  { income: 8.4, expense: 6.1 }, { income: 9.1, expense: 6.8 }, { income: 8.8, expense: 5.4 },
  { income: 10.2, expense: 7.2 }, { income: 9.6, expense: 6.3 }, { income: 11.4, expense: 6.9 },
];
const W = 300;
const H = 112;
const linePoints = (key: "income" | "expense") => {
  const values = flow.map((item) => item[key]);
  const min = Math.min(...flow.map((f) => Math.min(f.income, f.expense))) - 0.8;
  const max = Math.max(...flow.map((f) => Math.max(f.income, f.expense))) + 0.8;
  return values.map((value, index) => [
    (index / (values.length - 1)) * W,
    H - ((value - min) / (max - min)) * (H - 12) - 6,
  ] as const);
};
const smooth = (pts: readonly (readonly [number, number])[]) =>
  pts.reduce((path, [x, y], index) => {
    if (index === 0) return `M ${x} ${y}`;
    const [px, py] = pts[index - 1];
    const cx = (px + x) / 2;
    return `${path} C ${cx} ${py} ${cx} ${y} ${x} ${y}`;
  }, "");

function Sparkline() {
  const income = linePoints("income");
  const expense = linePoints("expense");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id="landing-flow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2cbb5d" stopOpacity="0.34" />
          <stop offset="100%" stopColor="#2cbb5d" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${smooth(income)} L ${W} ${H} L 0 ${H} Z`} fill="url(#landing-flow)" />
      <path d={smooth(income)} fill="none" stroke="#2cbb5d" strokeWidth="2" strokeLinecap="round" className="animate-draw-line" />
      <path d={smooth(expense)} fill="none" stroke="#ef4743" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 4" opacity="0.85" />
    </svg>
  );
}

/* ── Lightweight showcase charts (inline SVG, no chart library on the landing) ── */
function DonutChart() {
  const segments = [
    { value: 38, color: "#ffa116" }, { value: 24, color: "#60a5fa" },
    { value: 20, color: "#2cbb5d" }, { value: 18, color: "#a78bfa" },
  ];
  const R = 42;
  const C = 2 * Math.PI * R;
  let offset = 0;
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
      <g transform="rotate(-90 60 60)">
        {segments.map((seg) => {
          const len = (seg.value / 100) * C;
          const circle = (
            <circle key={seg.color} cx="60" cy="60" r={R} fill="none" stroke={seg.color} strokeWidth="14"
              strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-offset} />
          );
          offset += len;
          return circle;
        })}
      </g>
      <text x="60" y="58" textAnchor="middle" className="fill-foreground font-data" fontSize="15" fontWeight="700">42.8</text>
      <text x="60" y="72" textAnchor="middle" className="fill-muted-foreground" fontSize="7">JUTA · IDR</text>
    </svg>
  );
}
function BarsChart() {
  const bars = [
    { h: 46, c: "#5f5f5f" }, { h: 70, c: "#ffa116" }, { h: 38, c: "#5f5f5f" },
    { h: 58, c: "#ffa116" }, { h: 30, c: "#5f5f5f" }, { h: 82, c: "#ffa116" },
  ];
  return (
    <svg viewBox="0 0 200 110" className="h-full w-full" preserveAspectRatio="none" aria-hidden="true">
      {bars.map((b, i) => (
        <rect key={i} x={12 + i * 31} y={100 - b.h} width="18" height={b.h} rx="4" fill={b.c} />
      ))}
    </svg>
  );
}

const menu = [
  { label: "Home", href: "#top", type: "anchor" as const },
  { label: "Fitur", href: "#fitur", type: "anchor" as const },
  { label: "FAQ", href: "/faq", type: "route" as const },
  { label: "Dokumentasi", href: "/docs", type: "route" as const },
];

const kpis = [
  { label: "Pengeluaran bulan ini", value: "Rp 6,9 Juta", note: "38 transaksi", tone: "rose", icon: TrendingDown },
  { label: "Pemasukan bulan ini", value: "Rp 11,4 Juta", note: "+18% vs bulan lalu", tone: "indigo", icon: TrendingUp },
  { label: "Arus bersih", value: "Rp 4,5 Juta", note: "Pemasukan − Pengeluaran", tone: "teal", icon: ArrowUpRight },
] as const;
const tones: Record<string, string> = {
  rose: "bg-red-500/12 text-red-400", indigo: "bg-indigo-500/12 text-indigo-400", teal: "bg-primary/12 text-primary",
};

const features = [
  { icon: FileSpreadsheet, title: "Spreadsheet Anda, bukan server kami", body: "Setiap transaksi ditulis langsung ke Google Sheet milik Anda. Buka, edit, atau bagikan kapan pun." },
  { icon: RefreshCw, title: "Sinkronisasi real-time", body: "Edit di aplikasi atau langsung di Sheets — tarik ulang kapan saja dan angka tetap konsisten." },
  { icon: LayoutGrid, title: "Kategori pintar & tracking", body: "Catat pemasukan/pengeluaran dengan kategori otomatis dan lihat KPI langsung diperbarui." },
  { icon: TrendingUp, title: "Visualisasi interaktif", body: "Chart arus kas, perbandingan bulan, dan komposisi kategori yang mudah dibaca." },
  { icon: HardDrive, title: "Privacy-first dengan IndexedDB", body: "Mode lokal menyimpan data di browser Anda — tanpa akun, tanpa data pribadi ke server." },
  { icon: ShieldCheck, title: "Gratis selama beta", body: "Ekspor/impor JSON & CSV tanpa vendor lock-in. Data selalu bisa Anda bawa pergi." },
];

const marqueeItems = [
  { icon: FileSpreadsheet, label: "Google Sheets" },
  { icon: HardDrive, label: "Google Drive" },
  { icon: Landmark, label: "Bank" },
  { icon: Wallet, label: "E-Wallet" },
  { icon: CreditCard, label: "Kartu Kredit" },
  { icon: PiggyBank, label: "Tabungan" },
  { icon: Banknote, label: "Uang Tunai" },
  { icon: Building2, label: "Investasi" },
];

const faqPreview = [
  { q: "Di mana data keuangan saya disimpan?", a: "Di mode lokal, data ada di browser Anda (IndexedDB). Di mode connect, data ditulis ke Google Spreadsheet milik Anda. Server kami tidak menyimpan data keuangan Anda." },
  { q: "Apakah ada batas menyimpan ke Google Sheet?", a: "Google membatasi permintaan PER MENIT, bukan per hari. Aplikasi mengumpulkan perubahan lalu mengirim sekaligus agar tetap jauh di bawah batas." },
  { q: "Kenapa harus pakai akun Google sendiri?", a: "Agar data tetap 100% milik Anda. Spreadsheet dibuat di Drive Anda sehingga bisa dibuka atau dihapus kapan pun." },
  { q: "Apa artinya masih beta?", a: "Aplikasi masih uji coba; fitur bisa berubah. Kami sarankan rutin mengekspor cadangan JSON Anda." },
];

function FaqPreviewItem({ item }: { item: { q: string; a: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/60 backdrop-blur-xl" data-testid="landing-faq-preview-item">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-secondary/40"
      >
        <span className="text-sm font-semibold text-foreground">{item.q}</span>
        <ChevronDown size={18} className={`shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="border-t border-border/60 px-5 py-4 text-sm leading-relaxed text-muted-foreground">{item.a}</div>}
    </div>
  );
}

export function LandingPreview({ autoConnect = false }: { autoConnect?: boolean }) {
  useDocumentTitle("_self.manage — Money, made clear");
  const navigate = useNavigate();
  const { profile } = useStorage();
  const [showConnect, setShowConnect] = useState(autoConnect);
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [showAllFaq, setShowAllFaq] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const onboarded = Boolean(profile?.onboarded);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div id="top" className="landing-page relative min-h-svh overflow-hidden bg-background text-foreground">
      {/* JSON-LD for the landing (SoftwareApplication) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "_self.manage",
            applicationCategory: "FinanceApplication",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "0", priceCurrency: "IDR" },
            description: "Pelacak keuangan pribadi yang menyimpan data di Google Spreadsheet Anda sendiri atau di browser.",
          }),
        }}
      />

      <div className="landing-ambient pointer-events-none absolute inset-0">
        <div className="absolute -right-40 -top-52 size-[620px] rounded-full bg-primary/[0.07] blur-[130px]" />
        <div className="absolute -bottom-52 -left-40 size-[520px] rounded-full bg-emerald-500/[0.05] blur-[120px]" />
      </div>

      {/* a. Sticky navbar */}
      <header
        data-testid="landing-navbar"
        className={`sticky top-0 z-40 border-b transition-all duration-300 ${
          scrolled ? "border-border/70 bg-background/85 shadow-lg shadow-black/10 backdrop-blur-xl" : "border-transparent bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-4 py-2.5 sm:px-8 md:py-3.5">
          <a href="#top" className="transition-opacity hover:opacity-80"><BrandMark size="md" /></a>
          <nav className="hidden items-center gap-1 md:flex" data-testid="landing-menu">
            {menu.map((item) =>
              item.type === "route" ? (
                <Link key={item.label} to={item.href} data-testid={`landing-menu-${item.label.toLowerCase()}`} className="rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground">
                  {item.label}
                </Link>
              ) : (
                <a key={item.label} href={item.href} data-testid={`landing-menu-${item.label.toLowerCase()}`} className="rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground">
                  {item.label}
                </a>
              ),
            )}
          </nav>
          <div className="flex items-center gap-2">
            {/* Keep prior data-testids so existing flows resolve */}
            <Link to="/docs" data-testid="landing-docs-link" className="sr-only">Panduan</Link>
            <Link to="/faq" data-testid="landing-faq-link" className="sr-only">FAQ</Link>
            <Link to="/privacy" data-testid="landing-privacy-link" className="sr-only">Privasi</Link>
            {onboarded && (
              <Button data-testid="landing-open-dashboard-button" variant="outline" onClick={() => navigate("/dashboard")} className="hidden h-9 gap-2 text-xs font-bold md:inline-flex">
                <LayoutGrid size={14} /> Buka Dashboard
              </Button>
            )}
            <Button data-testid="landing-try-local-button" variant="outline" onClick={() => navigate("/demo")} className="hidden h-9 gap-2 text-xs font-bold md:inline-flex">
              <HardDrive size={14} /> Coba Demo
            </Button>
            <Button data-testid="landing-connect-header-button" onClick={() => setShowConnect(true)} className="hidden h-9 gap-2 text-xs font-bold shadow-lg shadow-primary/20 md:inline-flex">
              <FileSpreadsheet size={14} />
              Connect Google Sheet
            </Button>
            <button
              type="button"
              data-testid="landing-menu-toggle"
              aria-label="Buka menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
              className="grid size-10 place-items-center rounded-lg border border-border bg-card text-foreground transition-colors hover:border-primary hover:text-primary md:hidden"
            >
              <Menu size={18} />
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1180px] px-4 pb-14 sm:px-8 sm:pb-20">
        {/* b. Hero */}
        <section className="grid items-center gap-8 pt-7 sm:gap-10 sm:pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:pt-16" aria-labelledby="hero-heading">
          <div className="animate-rise-in max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-500" data-testid="beta-badge">
              <Sparkles size={11} /> Beta · Sedang Uji Coba
            </span>
            <h1 id="hero-heading" className="mt-5 font-heading text-[clamp(2rem,6vw,3.5rem)] font-extrabold leading-[1.08] tracking-tight">
              Kelola uang di spreadsheet Anda sendiri.
            </h1>
            <p className="mt-4 max-w-xl text-[clamp(0.9rem,2.5vw,1.05rem)] leading-relaxed text-muted-foreground">
              <span className="font-heading font-bold text-foreground">_self.manage</span> menulis setiap transaksi langsung ke
              Google Spreadsheet milik Anda — atau simpan lokal di browser. Tanpa akun, tanpa data pribadi ke server.
            </p>
            <div className="mt-6 flex flex-col gap-2.5 sm:mt-7 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <Button data-testid="landing-try-local-hero-button" variant="outline" onClick={() => navigate("/demo")} className="h-12 w-full gap-2 px-5 text-sm font-bold sm:w-auto">
                <HardDrive size={16} /> Coba Demo (Local DB)
              </Button>
              <Button data-testid="landing-connect-button" onClick={() => setShowConnect(true)} className="h-12 w-full gap-2 px-6 text-sm font-bold shadow-lg shadow-primary/20 sm:w-auto">
                <FileSpreadsheet size={16} /> Connect Google Sheet
              </Button>
            </div>
            <p className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
              <ShieldCheck size={13} className="text-emerald-500" /> Tanpa akun, tanpa email, tanpa biaya.
            </p>
          </div>

          {/* Hero chart preview */}
          <div className="animate-rise-in">
            <Card className="border-border/70 bg-card/75 p-5 backdrop-blur-xl sm:p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Total saldo · IDR</p>
                  <p className="mt-2 font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">Rp 42,8 Juta</p>
                </div>
                <div className="rounded-xl border border-border bg-background/60 p-2 text-primary"><WalletCards size={20} /></div>
              </div>
              <div className="mt-4 h-[96px] w-full sm:mt-5 sm:h-[112px]"><Sparkline /></div>
              <div className="mt-3 flex gap-4 text-[10px] font-semibold text-muted-foreground">
                <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-emerald-400" /> Pemasukan</span>
                <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-red-400" /> Pengeluaran</span>
                <span className="ml-auto rounded-full border border-border bg-card px-2 py-0.5 text-[9px] font-bold text-muted-foreground">Data contoh</span>
              </div>
            </Card>
          </div>
        </section>

        {/* c. Trusted-by / marquee */}
        <section className="mt-12 sm:mt-16" aria-label="Bekerja dengan layanan yang Anda pakai">
          <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground sm:mb-4">
            Bekerja mulus dengan layanan yang Anda pakai
          </p>
          <div className="marquee-mask marquee-track overflow-hidden">
            <div className="animate-marquee flex w-max gap-7 sm:gap-10">
              {[...marqueeItems, ...marqueeItems].map((item, index) => {
                const Icon = item.icon;
                return (
                  <span key={index} className="flex shrink-0 items-center gap-2 text-muted-foreground/70 grayscale transition-colors hover:text-foreground">
                    <Icon size={20} className="size-4 sm:size-5" />
                    <span className="text-xs font-bold sm:text-sm">{item.label}</span>
                  </span>
                );
              })}
            </div>
          </div>
        </section>

        {/* d. Features */}
        <section id="fitur" className="mt-12 scroll-mt-24 sm:mt-20" aria-labelledby="fitur-heading">
          <Reveal className="mb-6 max-w-2xl sm:mb-8">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Fitur unggulan</p>
            <h2 id="fitur-heading" className="font-heading text-[clamp(1.5rem,4vw,2.25rem)] font-extrabold tracking-tight">
              Semua yang perlu untuk mengendalikan uang Anda
            </h2>
          </Reveal>
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3" data-testid="landing-features-grid">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Reveal key={feature.title} delay={(index % 3) * 80} className={index >= 3 && !showAllFeatures ? "hidden sm:block" : ""}>
                  <Card className="h-full border-border/70 bg-card/60 p-4 transition-transform duration-300 hover:-translate-y-1 hover:shadow-lg sm:p-5">
                    <div className="mb-3 grid size-10 place-items-center rounded-xl bg-primary/12 text-primary sm:mb-4"><Icon size={18} /></div>
                    <h3 className="font-heading text-sm font-bold">{feature.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
                  </Card>
                </Reveal>
              );
            })}
          </div>
          <button
            type="button"
            data-testid="landing-features-toggle"
            aria-expanded={showAllFeatures}
            onClick={() => setShowAllFeatures((value) => !value)}
            className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-primary/35 text-xs font-bold text-primary sm:hidden"
          >
            {showAllFeatures ? "Sembunyikan fitur lainnya" : `Lihat ${features.length - 3} fitur lainnya`}
            <ChevronDown size={14} className={`transition-transform duration-200 ${showAllFeatures ? "rotate-180" : ""}`} />
          </button>
        </section>

        {/* e. Showcase charts */}
        <section className="mt-12 sm:mt-20" aria-labelledby="showcase-heading">
          <Reveal className="mb-6 max-w-2xl sm:mb-8">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Visualisasi</p>
            <h2 id="showcase-heading" className="font-heading text-[clamp(1.5rem,4vw,2.25rem)] font-extrabold tracking-tight">
              Angka yang langsung bisa Anda baca
            </h2>
          </Reveal>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3" data-testid="landing-showcase-grid">
            <Reveal>
              <Card className="h-full border-border/70 bg-card/60 p-4 sm:p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-xs">Komposisi kategori</p>
                <div className="mx-auto mt-3 h-[118px] w-[118px] sm:mt-4 sm:h-[150px] sm:w-[150px]"><DonutChart /></div>
              </Card>
            </Reveal>
            <Reveal delay={80} className="hidden sm:block">
              <Card className="h-full border-border/70 bg-card/60 p-4 sm:p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-xs">Perbandingan bulan</p>
                <div className="mt-6 h-[150px] w-full"><BarsChart /></div>
              </Card>
            </Reveal>
            <Reveal delay={160}>
              <Card className="h-full border-border/70 bg-card/60 p-4 sm:p-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground sm:text-xs">Arus kas 6 bulan</p>
                <div className="mt-4 h-[118px] w-full sm:mt-6 sm:h-[150px]"><Sparkline /></div>
              </Card>
            </Reveal>
          </div>
        </section>

        {/* f. Beta tester CTA */}
        <section className="mt-12 sm:mt-20" aria-labelledby="tester-heading">
          <Reveal>
            <Card className="relative overflow-hidden border-primary/25 bg-primary/[0.06] p-5 sm:p-10">
              <div className="absolute -right-16 -top-20 size-56 rounded-full bg-primary/10 blur-3xl" />
              <div className="relative flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-xl">
                  <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                    <Sparkles size={11} /> Program Beta Tester
                  </span>
                  <h2 id="tester-heading" className="mt-4 font-heading text-[clamp(1.5rem,4vw,2rem)] font-extrabold tracking-tight">
                    Bantu kami menyempurnakan _self.manage
                  </h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    Daftar jadi tester dan kirim masukan Anda. Setiap feedback membentuk fitur berikutnya.
                  </p>
                </div>
                <div className="flex w-full shrink-0 flex-col gap-3 sm:w-auto sm:flex-row">
                  <a href={TESTER_URL} target="_blank" rel="noopener noreferrer" data-testid="landing-tester-button">
                    <Button className="h-12 w-full gap-2 px-6 text-sm font-bold shadow-lg shadow-primary/20 sm:w-auto">
                      <UserPlus size={16} /> Ajukan Diri Jadi Tester
                    </Button>
                  </a>
                  <Button type="button" variant="outline" onClick={() => setShowFeedback(true)} data-testid="landing-feedback-button" className="h-12 w-full gap-2 px-6 text-sm font-bold sm:w-auto">
                      <MessageSquarePlus size={16} /> Kirim Feedback
                  </Button>
                </div>
              </div>
            </Card>
          </Reveal>
        </section>

        {/* g. FAQ preview */}
        <section className="mt-12 sm:mt-20" aria-labelledby="faq-preview-heading">
          <Reveal className="mb-5 flex flex-wrap items-end justify-between gap-4 sm:mb-6">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">FAQ</p>
              <h2 id="faq-preview-heading" className="font-heading text-[clamp(1.5rem,4vw,2.25rem)] font-extrabold tracking-tight">
                Pertanyaan yang sering muncul
              </h2>
            </div>
            <Link to="/faq" data-testid="landing-faq-see-all" className="text-xs font-bold text-primary hover:underline">
              Lihat semua FAQ →
            </Link>
          </Reveal>
          <div className="space-y-2.5 sm:space-y-3" data-testid="landing-faq-preview-list">
            {faqPreview.map((item, index) => (
              <div key={item.q} className={index >= 2 && !showAllFaq ? "hidden sm:block" : ""}>
                <FaqPreviewItem item={item} />
              </div>
            ))}
          </div>
          <button
            type="button"
            data-testid="landing-faq-toggle"
            aria-expanded={showAllFaq}
            onClick={() => setShowAllFaq((value) => !value)}
            className="mt-3 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-primary/35 text-xs font-bold text-primary sm:hidden"
          >
            {showAllFaq ? "Sembunyikan" : `Lihat ${faqPreview.length - 2} pertanyaan lainnya`}
            <ChevronDown size={14} className={`transition-transform duration-200 ${showAllFaq ? "rotate-180" : ""}`} />
          </button>
        </section>

        {/* Sample dashboard KPIs (kept from the original preview) */}
        <section className="mt-10 sm:mt-16" data-testid="landing-dashboard-preview" aria-label="Pratinjau dashboard">
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Card key={kpi.label} className="min-w-0 border-border/70 bg-card/75 p-3 shadow-sm backdrop-blur-xl sm:p-5">
                  <div className={`mb-3 grid size-8 place-items-center rounded-xl sm:mb-5 sm:size-10 ${tones[kpi.tone]}`}><Icon size={19} className="size-4 sm:size-[19px]" /></div>
                  <p className="truncate text-[10px] font-semibold text-muted-foreground sm:text-xs">{kpi.label}</p>
                  <p className="mt-1 truncate font-data text-xs font-bold tracking-tight sm:text-xl">{kpi.value}</p>
                  <p className="mt-2 hidden text-[11px] text-muted-foreground sm:block">{kpi.note}</p>
                </Card>
              );
            })}
          </div>
        </section>
      </main>

      {/* h. Footer */}
      <footer className="relative border-t border-border/60 bg-card/40 backdrop-blur-xl" data-testid="landing-footer">
        <div className="mx-auto grid max-w-[1180px] gap-8 px-4 py-10 sm:gap-10 sm:px-8 sm:py-12 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <BrandMark size="md" showTagline />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Pelacak keuangan pribadi lokal-first. Data Anda tetap di perangkat atau di Google Spreadsheet milik Anda sendiri.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6 md:contents">
            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Navigasi</p>
              <ul className="space-y-2 text-sm font-semibold text-muted-foreground">
                <li><Link to="/docs" className="inline-flex min-h-8 items-center transition-colors hover:text-foreground md:min-h-0" data-testid="footer-docs-link"><span className="inline-flex items-center gap-2"><BookOpen size={13} /> Dokumentasi</span></Link></li>
                <li><Link to="/faq" className="inline-flex min-h-8 items-center transition-colors hover:text-foreground md:min-h-0" data-testid="footer-faq-link">FAQ</Link></li>
                <li><Link to="/privacy" className="inline-flex min-h-8 items-center transition-colors hover:text-foreground md:min-h-0" data-testid="footer-privacy-link">Privacy Policy</Link></li>
                <li><Link to="/terms" className="inline-flex min-h-8 items-center transition-colors hover:text-foreground md:min-h-0" data-testid="footer-terms-link">Terms of Service</Link></li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Kontak & Beta</p>
              <ul className="space-y-2 text-sm font-semibold text-muted-foreground">
                <li><a href={TESTER_URL} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-2 transition-colors hover:text-foreground md:min-h-0" data-testid="footer-tester-link"><UserPlus size={13} /> Jadi Tester</a></li>
                <li><button type="button" onClick={() => setShowFeedback(true)} className="inline-flex min-h-8 items-center gap-2 transition-colors hover:text-foreground md:min-h-0" data-testid="footer-feedback-link"><Send size={13} /> Kirim Feedback</button></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-border/50">
          <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-2 px-4 py-4 pb-[max(16px,env(safe-area-inset-bottom))] text-[11px] font-semibold text-muted-foreground sm:px-8 sm:py-5">
            <p>© {new Date().getFullYear()} _self.manage</p>
            <p className="flex items-center gap-2"><Lock size={12} /> Versi Beta · Data tetap milik Anda</p>
          </div>
        </div>
      </footer>

      <LandingDrawer open={menuOpen} onClose={() => setMenuOpen(false)} menu={menu} onboarded={onboarded} onDemo={() => navigate("/demo")} onConnect={() => setShowConnect(true)} onDashboard={() => navigate("/dashboard")} />
      {showConnect && (
        <Suspense fallback={null}>
          <ConnectSheetDialog open onClose={() => setShowConnect(false)} onConnected={() => navigate("/dashboard")} />
        </Suspense>
      )}
      {showFeedback && (
        <Suspense fallback={null}>
          <FeedbackDialog open onOpenChange={setShowFeedback} />
        </Suspense>
      )}
    </div>
  );
}
