import { useState } from "react";
import {
  ArrowUpRight, CalendarClock, FileSpreadsheet, Lock, RefreshCw, ShieldCheck,
  Sparkles, TrendingDown, TrendingUp, WalletCards,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BrandMark } from "@/components/BrandMark";
import { ConnectSheetDialog } from "@/components/ConnectSheetDialog";

const flow = [
  { month: "Jan", income: 8.4, expense: 6.1 },
  { month: "Feb", income: 9.1, expense: 6.8 },
  { month: "Mar", income: 8.8, expense: 5.4 },
  { month: "Apr", income: 10.2, expense: 7.2 },
  { month: "Mei", income: 9.6, expense: 6.3 },
  { month: "Jun", income: 11.4, expense: 6.9 },
];

const kpis = [
  { label: "Pengeluaran bulan ini", value: "Rp 6,9 Juta", note: "38 transaksi", tone: "rose", icon: TrendingDown },
  { label: "Pemasukan bulan ini", value: "Rp 11,4 Juta", note: "+18% vs bulan lalu", tone: "indigo", icon: TrendingUp },
  { label: "Arus bersih", value: "Rp 4,5 Juta", note: "Pemasukan − Pengeluaran", tone: "teal", icon: ArrowUpRight },
  { label: "Cicilan & tagihan", value: "Rp 2,1 Juta", note: "3 jatuh tempo", tone: "amber", icon: CalendarClock },
] as const;

const tones: Record<string, string> = {
  rose: "bg-red-500/12 text-red-400",
  indigo: "bg-indigo-500/12 text-indigo-400",
  teal: "bg-primary/12 text-primary",
  amber: "bg-amber-500/12 text-amber-400",
};

const features = [
  { icon: FileSpreadsheet, title: "Spreadsheet Anda, bukan server kami", body: "Setiap transaksi ditulis langsung ke Google Sheet milik Anda. Buka, edit, atau bagikan kapan pun." },
  { icon: RefreshCw, title: "Sinkron dua arah", body: "Edit di aplikasi atau langsung di Sheets — tarik ulang kapan saja dan angka tetap konsisten." },
  { icon: Lock, title: "Tanpa data pribadi tersimpan", body: "Tidak ada email, token, atau ID spreadsheet yang dikirim ke server aplikasi." },
];

const W = 300;
const H = 112;
const points = (key: "income" | "expense") => {
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

/** Dependency-free sparkline: keeps the first paint tiny. */
function Sparkline() {
  const income = points("income");
  const expense = points("expense");
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

export function LandingPreview() {  const [showConnect, setShowConnect] = useState(false);

  return (
    <div className="relative min-h-svh overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-40 -top-52 size-[620px] rounded-full bg-primary/[0.07] blur-[130px]" />
        <div className="absolute -bottom-52 -left-40 size-[520px] rounded-full bg-emerald-500/[0.05] blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-[1180px] px-5 pb-20 pt-7 sm:px-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandMark size="lg" showTagline />
          </div>
          <div className="flex items-center gap-2">
            <a
              href="/privacy.html"
              data-testid="landing-privacy-link"
              className="hidden rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              Privasi
            </a>
            <Button
              data-testid="landing-connect-header-button"
              onClick={() => setShowConnect(true)}
              className="h-10 gap-2 text-xs font-bold shadow-lg shadow-primary/20"
            >
              <FileSpreadsheet size={14} />
              <span className="sm:hidden">Hubungkan</span>
              <span className="hidden sm:inline">Hubungkan Spreadsheet</span>
            </Button>
          </div>
        </header>

        <section className="animate-rise-in mt-14 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/8 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            <Sparkles size={11} /> Google Sheets sebagai database Anda
          </span>
          <h1 className="mt-5 font-heading text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
            Kelola uang di spreadsheet Anda sendiri.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            <span className="font-heading font-bold text-foreground">_self.manage</span> menulis setiap transaksi langsung ke
            Google Spreadsheet milik Anda. Di bawah ini pratinjau dashboard dengan data contoh — hubungkan spreadsheet Anda
            untuk mulai menambah, mengubah, dan menghapus data sungguhan.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button
              data-testid="landing-connect-button"
              onClick={() => setShowConnect(true)}
              className="h-12 gap-2 px-6 text-sm font-bold shadow-lg shadow-primary/20"
            >
              <FileSpreadsheet size={16} />
              Hubungkan Spreadsheet Saya
            </Button>
            <Button
              data-testid="landing-try-local-button"
              variant="outline"
              onClick={() => setShowConnect(true)}
              className="h-12 gap-2 px-5 text-sm font-bold"
            >
              Lihat opsi lain
            </Button>
          </div>
          <p className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck size={13} className="text-emerald-500" />
            Tanpa akun, tanpa email, tanpa biaya.
          </p>
        </section>

        {/* Dashboard preview */}
        <section className="mt-14" data-testid="landing-dashboard-preview">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Pratinjau dashboard</p>
            <span className="rounded-full border border-border bg-card px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
              Data contoh
            </span>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
            <Card className="relative min-h-[210px] overflow-hidden border-primary/20 bg-gradient-to-br from-[#303030] via-[#262626] to-[#1c1c1c] p-6 text-white shadow-xl shadow-primary/10 sm:p-8">
              <div className="absolute -right-20 -top-24 size-72 rounded-full border-[30px] border-white/8" />
              <div className="relative flex h-full flex-col justify-between">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">Total saldo · IDR</p>
                    <p className="mt-3 font-heading text-4xl font-extrabold tracking-tight sm:text-5xl">Rp 42,8 Juta</p>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-white/10 p-2">
                    <WalletCards size={20} />
                  </div>
                </div>
                <div className="mt-8 flex flex-wrap items-center gap-5 text-xs text-white/70">
                  <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-300" /> 4 akun aktif</span>
                  <span className="flex items-center gap-1.5"><ShieldCheck size={14} /> Tersimpan di spreadsheet Anda</span>
                </div>
              </div>
            </Card>

            <Card className="border-border/70 bg-card/75 p-6 backdrop-blur-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Smart snapshot</p>
              <p className="mt-2 font-heading text-lg font-bold">Arus kas 6 bulan</p>
              <div className="mt-5 h-[112px] w-full">
                <Sparkline />
              </div>
              <div className="mt-3 flex gap-4 text-[10px] font-semibold text-muted-foreground">
                <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-emerald-400" /> Pemasukan</span>
                <span className="flex items-center gap-1"><i className="size-2 rounded-full bg-red-400" /> Pengeluaran</span>
              </div>
            </Card>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map((kpi) => {
              const Icon = kpi.icon;
              return (
                <Card key={kpi.label} className="border-border/70 bg-card/75 p-5 shadow-sm backdrop-blur-xl transition-transform duration-300 hover:-translate-y-0.5">
                  <div className={`mb-5 grid size-10 place-items-center rounded-xl ${tones[kpi.tone]}`}>
                    <Icon size={19} />
                  </div>
                  <p className="text-xs font-semibold text-muted-foreground">{kpi.label}</p>
                  <p className="mt-1 font-data text-xl font-bold tracking-tight">{kpi.value}</p>
                  <p className="mt-2 text-[11px] text-muted-foreground">{kpi.note}</p>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mt-16 grid gap-4 sm:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="border-border/70 bg-card/60 p-5">
                <div className="mb-4 grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
                  <Icon size={18} />
                </div>
                <h3 className="font-heading text-sm font-bold">{feature.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{feature.body}</p>
              </Card>
            );
          })}
        </section>

        <section className="mt-14 flex flex-col items-center gap-4 rounded-3xl border border-primary/25 bg-primary/[0.06] px-6 py-10 text-center">
          <h2 className="font-heading text-2xl font-extrabold tracking-tight">Siap mulai dalam 30 detik</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Login Google satu kali, pilih spreadsheet Anda, lalu catat transaksi pertama. Tidak ada data yang dititipkan ke kami.
          </p>
          <Button
            data-testid="landing-connect-footer-button"
            onClick={() => setShowConnect(true)}
            className="h-12 gap-2 px-6 text-sm font-bold shadow-lg shadow-primary/20"
          >
            <FileSpreadsheet size={16} />
            Hubungkan Spreadsheet
          </Button>
        </section>

        <footer className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-7 sm:flex-row">
          <BrandMark size="sm" />
          <div className="flex items-center gap-5 text-[11px] font-semibold text-muted-foreground">
            <a href="/privacy.html" className="transition-colors hover:text-foreground" data-testid="footer-privacy-link">
              Privacy Policy
            </a>
            <a href="/terms.html" className="transition-colors hover:text-foreground" data-testid="footer-terms-link">
              Terms of Service
            </a>
          </div>
        </footer>
      </div>

      <ConnectSheetDialog open={showConnect} onClose={() => setShowConnect(false)} />
    </div>
  );
}
