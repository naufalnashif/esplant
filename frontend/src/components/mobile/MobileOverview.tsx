import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import {
  ArrowDownLeft, ArrowUpRight, CalendarClock, ChevronRight, Plus, RefreshCw, ShieldCheck, Sparkles,
  TrendingDown, TrendingUp, WalletCards,
} from "lucide-react";
import type * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MobileDisclosure } from "@/components/mobile/MobileDisclosure";
import type { FinanceState } from "@/lib/localDb";
import { formatMoney } from "@/lib/formatters";
import { CATEGORY_COLORS, toBase, useOverviewStats, type PeriodKey } from "@/lib/overviewStats";
import { OTHER_SLICE_COLOR, type CategorySlice } from "@/lib/categoryChart";

export interface OverviewLabels {
  hello: string; totalBalance: string; cashFlow: string; recent: string; seeAll: string; dueSoon: string; noData: string;
  compare: string; thisMonth: string; lastMonth: string; addTransaction: string;
}
export type OverviewTarget = "accounts" | "settings" | "commitments" | "transactions";
export interface MobileOverviewProps {
  state: FinanceState;
  t: OverviewLabels;
  totalBalance: number;
  currentSpend: number;
  currentIncome: number;
  categoryChart: CategorySlice[];
  flowChart: { month: string; income: number; expense: number }[];
  currentMonth: string;
  setCompareMonth: (value: string) => void;
  onNavigate: (tab: OverviewTarget) => void;
  onLoadSample?: () => void;
  accountName: (id: string) => string;
}

const PERIODS: PeriodKey[] = ["today", "week", "month", "year", "all"];
const shortDate = (date: string, locale: FinanceState["locale"]) => new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", { day: "2-digit", month: "short" }).format(new Date(`${date}T00:00:00`));
const tooltipStyle = { background: "#282828", border: "1px solid #3c3c3c", borderRadius: 12, fontSize: 11 };

function MiniKpi({ label, value, note, icon, tone, testid }: { label: string; value: string; note: string; icon: React.ReactNode; tone: "teal" | "rose" | "amber" | "indigo"; testid: string }) {
  const tones = { teal: "bg-primary/12 text-primary", rose: "bg-red-500/12 text-red-400", amber: "bg-amber-500/12 text-amber-400", indigo: "bg-indigo-500/12 text-indigo-400" };
  return (
    <Card className="border-border/70 bg-card/75 p-3.5 shadow-sm" data-testid={testid}>
      <div className="flex items-center gap-2">
        <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${tones[tone]}`}>{icon}</span>
        <p className="truncate text-[11px] font-semibold text-muted-foreground">{label}</p>
      </div>
      <p className="mt-2.5 truncate font-data text-base font-bold tracking-tight" data-testid={`${testid}-value`}>{value}</p>
      <p className="mt-1 truncate text-[10px] text-muted-foreground">{note}</p>
    </Card>
  );
}

function MobileCardHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{eyebrow}</p>
        <h2 className="mt-0.5 truncate font-heading text-base font-bold">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function MobileOverview({ state, t, totalBalance, currentSpend, currentIncome, categoryChart, flowChart, currentMonth, setCompareMonth, onNavigate, onLoadSample, accountName }: MobileOverviewProps) {
  const { isId, periodFilter, setPeriodFilter, upcoming, periodCommitted, monthOptions, periodStats, activeStats, periodLabels, incomeDelta } = useOverviewStats(state, currentMonth, currentIncome);
  const recent = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const flowIncome = flowChart.reduce((sum, item) => sum + item.income, 0);
  const flowExpense = flowChart.reduce((sum, item) => sum + item.expense, 0);
  const topCategories = [...categoryChart].sort((a, b) => b.current - a.current).slice(0, 4);
  const compareMax = Math.max(1, ...topCategories.flatMap((item) => [item.current, item.previous]));
  const previousTotal = categoryChart.reduce((sum, item) => sum + item.previous, 0);
  const money = (value: number) => formatMoney(value, state.baseCurrency, state.locale, true);
  const emptySlice: CategorySlice = { key: "no-data", category: t.noData, current: 1, previous: 0, isOther: false, members: [] };
  const pieData: CategorySlice[] = categoryChart.length ? categoryChart : [emptySlice];
  const sliceColor = (slice: CategorySlice, index: number) =>
    slice.isOther ? OTHER_SLICE_COLOR : CATEGORY_COLORS[index % CATEGORY_COLORS.length];

  return (
    <div className="animate-rise-in space-y-4" data-testid="mobile-overview">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Personal finance / 01</p>
        <h1 className="mt-1 font-heading text-2xl font-extrabold tracking-tight">{state.profileName ? `${t.hello}, ${state.profileName}.` : `${t.hello}.`}</h1>
      </div>

      {state.accounts.length === 0 && (
        <Card className="border-primary/25 bg-primary/5 p-4" data-testid="onboarding-banner">
          <div className="flex items-start gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary"><WalletCards size={19} /></div>
            <div className="min-w-0">
              <h2 className="font-heading text-sm font-bold">{isId ? "Mulai dari nol — data Anda 100% aman" : "Start from zero — your data is 100% saved"}</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{isId ? "Tambahkan akun pertama untuk mulai mencatat, atau impor backup JSON." : "Add your first account to start tracking, or import a JSON backup."}</p>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button data-testid="onboarding-add-account-button" onClick={() => onNavigate("accounts")} className="h-10 gap-1.5 text-xs"><Plus size={14} />{isId ? "Tambah akun" : "Add account"}</Button>
            <Button data-testid="onboarding-import-button" variant="outline" onClick={() => onNavigate("settings")} className="h-10 text-xs">{isId ? "Impor JSON" : "Import JSON"}</Button>
            {onLoadSample && (
              <Button data-testid="onboarding-load-sample-button" variant="ghost" onClick={onLoadSample} className="col-span-2 h-10 gap-1.5 text-xs text-primary hover:text-primary">
                <Sparkles size={14} />{isId ? "Muat data contoh" : "Load sample data"}
              </Button>
            )}
          </div>
        </Card>
      )}

      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-[#303030] via-[#262626] to-[#1c1c1c] p-5 text-white shadow-xl shadow-primary/10" data-testid="mobile-balance-card">
        <div className="absolute -right-16 -top-20 size-56 rounded-full border-[24px] border-white/8" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/65">{t.totalBalance} · {state.baseCurrency}</p>
            <div className="rounded-lg border border-white/15 bg-white/10 p-1.5"><WalletCards size={16} /></div>
          </div>
          <p className="mt-2 font-heading text-3xl font-extrabold tracking-tight" data-testid="total-balance-value">{formatMoney(totalBalance, state.baseCurrency, state.locale)}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-white/70">
            <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-emerald-300" /> {state.accounts.length} {isId ? "akun aktif" : "active accounts"}</span>
            <span className="flex items-center gap-1.5"><ShieldCheck size={13} /> {isId ? "Tersimpan" : "Saved"}</span>
          </div>
        </div>
      </Card>

      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4" data-testid="period-filter-bar">
        {PERIODS.map((key) => (
          <button
            key={key}
            type="button"
            data-testid={`period-filter-${key}`}
            onClick={() => setPeriodFilter(key)}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors ${periodFilter === key ? "bg-primary text-primary-foreground shadow-sm" : "border border-border/70 bg-card/80 text-muted-foreground"}`}
          >
            {periodLabels[key]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3" data-testid="mobile-kpi-grid">
        <MiniKpi testid="mobile-kpi-expense" label={isId ? "Pengeluaran" : "Spent"} value={money(activeStats.expense)} note={`${activeStats.count} ${isId ? "transaksi" : "transactions"}`} icon={<TrendingDown size={15} />} tone="rose" />
        <MiniKpi testid="mobile-kpi-income" label={isId ? "Pemasukan" : "Income"} value={money(activeStats.income)} note={periodFilter === "month" ? `${incomeDelta >= 0 ? "+" : ""}${incomeDelta}% vs ${isId ? "bulan lalu" : "last month"}` : periodLabels[periodFilter]} icon={<TrendingUp size={15} />} tone="indigo" />
        <MiniKpi testid="mobile-kpi-net" label={isId ? "Arus bersih" : "Net flow"} value={money(activeStats.net)} note={isId ? "Pemasukan − Pengeluaran" : "Income − Expense"} icon={<ArrowUpRight size={15} />} tone={activeStats.net >= 0 ? "teal" : "rose"} />
        <MiniKpi testid="mobile-kpi-committed" label={isId ? "Cicilan / Tagihan" : "Committed"} value={money(periodCommitted)} note={`${upcoming.length} ${isId ? "jatuh tempo" : "due soon"}`} icon={<CalendarClock size={15} />} tone="amber" />
      </div>

      <Card className="border-border/70 bg-card/75 p-4" data-testid="mobile-main-chart">
        <MobileCardHeader eyebrow="Smart snapshot" title={t.cashFlow} action={<Badge variant="secondary" className="shrink-0 gap-1"><RefreshCw size={11} /> Live</Badge>} />
        <div className="mt-3 h-[170px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={flowChart} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="cashflow-mobile" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffa116" stopOpacity={0.42} />
                  <stop offset="100%" stopColor="#ffa116" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => money(Number(value))} />
              <Area type="monotone" dataKey="income" stroke="#2cbb5d" strokeWidth={2} fill="url(#cashflow-mobile)" />
              <Area type="monotone" dataKey="expense" stroke="#ef4743" strokeWidth={2} fill="transparent" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border/50 pt-3 text-[11px]">
          <div><p className="flex items-center gap-1 font-semibold text-muted-foreground"><i className="size-2 rounded-full bg-emerald-400" /> Income</p><p className="mt-0.5 font-data text-xs font-bold text-emerald-400" data-testid="mobile-flow-income-total">+{money(flowIncome)}</p></div>
          <div><p className="flex items-center gap-1 font-semibold text-muted-foreground"><i className="size-2 rounded-full bg-red-400" /> Expense</p><p className="mt-0.5 font-data text-xs font-bold text-red-400" data-testid="mobile-flow-expense-total">−{money(flowExpense)}</p></div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3" data-testid="mobile-mini-charts">
        <Card className="border-border/70 bg-card/75 p-3.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Allocation</p>
          <p className="mt-0.5 truncate font-heading text-sm font-bold">Where it goes</p>
          <div className="relative mx-auto mt-2 h-[96px] w-[96px]" data-testid="mobile-category-donut" data-slice-count={categoryChart.length}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="current" nameKey="category" innerRadius={30} outerRadius={44} paddingAngle={3} stroke="none">
                  {pieData.map((item, index) => <Cell key={item.key} fill={sliceColor(item, index)} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => money(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
              <span className="font-data text-[9px] font-bold leading-tight">{money(currentSpend).replace("Rp ", "")}</span>
            </div>
          </div>
          <div className="mt-2 space-y-1" data-testid="mobile-category-legend">
            {categoryChart.map((item, index) => (
              <div key={item.key} className="flex items-center gap-1.5 text-[10px]" data-testid={`mobile-category-legend-${item.key}`}>
                <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: sliceColor(item, index) }} />
                <span className="min-w-0 flex-1 truncate font-medium">{item.category}</span>
                <span className="font-data text-muted-foreground">{currentSpend ? Math.min(100, Math.round((item.current / currentSpend) * 100)) : 0}%</span>
              </div>
            ))}
            {categoryChart.length === 0 && <p className="text-[10px] text-muted-foreground">{t.noData}</p>}
          </div>
        </Card>

        <Card className="border-border/70 bg-card/75 p-3.5">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t.compare}</p>
          <select
            aria-label="Comparison month"
            data-testid="comparison-month-select"
            value={currentMonth}
            onChange={(event) => setCompareMonth(event.target.value)}
            className="mt-0.5 w-full cursor-pointer truncate rounded-md border border-border bg-background px-1.5 py-1 text-[11px] font-bold outline-none focus:border-primary"
          >
            {monthOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <div className="mt-2.5 space-y-2">
            {topCategories.map((item) => (
              <div key={item.key}>
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="min-w-0 flex-1 truncate font-medium">{item.category}</span>
                  <span className="font-data text-muted-foreground">{money(item.current)}</span>
                </div>
                <div className="mt-1 space-y-0.5">
                  <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(3, (item.current / compareMax) * 100)}%` }} />
                  <div className="h-1.5 rounded-full bg-neutral-500" style={{ width: `${Math.max(3, (item.previous / compareMax) * 100)}%` }} />
                </div>
              </div>
            ))}
            {topCategories.length === 0 && <p className="py-4 text-center text-[10px] text-muted-foreground">{t.noData}</p>}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 border-t border-border/50 pt-2 text-[9px] font-semibold text-muted-foreground">
            <span className="flex items-center gap-1"><i className="size-1.5 rounded-full bg-primary" />{t.thisMonth} {money(currentSpend)}</span>
            <span className="flex items-center gap-1"><i className="size-1.5 rounded-full bg-neutral-500" />{t.lastMonth} {money(previousTotal)}</span>
          </div>
        </Card>
      </div>

      <Card className="border-border/70 bg-card/75 p-4" data-testid="mobile-due-soon">
        <MobileCardHeader eyebrow={isId ? "Pusat aksi" : "Action center"} title={t.dueSoon} action={<button type="button" data-testid="view-commitments-button" onClick={() => onNavigate("commitments")} className="shrink-0 text-xs font-bold text-primary">{t.seeAll}</button>} />
        <div className="mt-3 space-y-2">
          {upcoming.slice(0, 3).map((bill) => (
            <div key={bill.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/35 px-3 py-2.5">
              <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-amber-500/12 text-amber-400"><CalendarClock size={14} /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight">{bill.name}</p>
                <p className="text-[10px] text-muted-foreground">{shortDate(bill.nextDueDate, state.locale)} · {bill.remainingInstallments ? `${bill.remainingInstallments}x` : bill.frequency}</p>
              </div>
              <p className="shrink-0 font-data text-xs font-bold">{money(toBase(bill.amount, bill.currency, state.exchangeRates))}</p>
            </div>
          ))}
          {upcoming.length === 0 && <p className="py-5 text-center text-xs text-muted-foreground">{t.noData}</p>}
        </div>
        <button type="button" data-testid="open-commitment-from-action-button" onClick={() => onNavigate("commitments")} className="mt-3 flex w-full items-center justify-between rounded-xl border border-dashed border-primary/35 px-3 py-2.5 text-left text-xs font-semibold text-primary">
          <span className="flex items-center gap-2"><Plus size={14} /> {isId ? "Tambah Cicilan / Tagihan" : "Add Bill / Installment"}</span>
          <ChevronRight size={14} />
        </button>
      </Card>

      <Card className="border-border/70 bg-card/75 p-4" data-testid="mobile-recent">
        <MobileCardHeader eyebrow={t.recent} title="Your money trail" action={<button type="button" data-testid="view-transactions-button" onClick={() => onNavigate("transactions")} className="shrink-0 text-xs font-bold text-primary">{t.seeAll}</button>} />
        <div className="mt-2 divide-y divide-border/40">
          {recent.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-2.5">
              <div className={`grid size-8 shrink-0 place-items-center rounded-lg ${item.kind === "income" ? "bg-emerald-500/12 text-emerald-400" : "bg-red-500/12 text-red-400"}`}>{item.kind === "income" ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight">{item.description}</p>
                <p className="truncate text-[10px] text-muted-foreground">{item.category} · {accountName(item.accountId)} · {shortDate(item.date, state.locale)}</p>
              </div>
              <p className={`shrink-0 font-data text-xs font-bold ${item.kind === "income" ? "text-emerald-400" : "text-foreground"}`}>{item.kind === "income" ? "+" : "−"}{money(item.baseAmount)}</p>
            </div>
          ))}
          {recent.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground" data-testid="recent-empty-state">{t.noData}</p>}
        </div>
      </Card>

      <MobileDisclosure testid="mobile-period-matrix" title={isId ? "Matriks multi-periode" : "Multi-period matrix"} hint={isId ? "Hari ini · Minggu · Bulan · Tahun" : "Today · Week · Month · Year"} showLabel={isId ? "Lihat selengkapnya" : "Show more"} hideLabel={isId ? "Sembunyikan" : "Hide"}>
        <div className="grid grid-cols-2 gap-2.5">
          {(["today", "week", "month", "year"] as const).map((key) => {
            const stats = periodStats[key];
            const positive = stats.net >= 0;
            return (
              <button key={key} type="button" onClick={() => setPeriodFilter(key)} className={`rounded-xl border p-3 text-left ${periodFilter === key ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border/60 bg-card/75"}`}>
                <div className="flex items-center justify-between"><p className="text-xs font-bold">{periodLabels[key]}</p><span className="text-[10px] text-muted-foreground">{stats.count} tx</span></div>
                <div className="mt-2 space-y-1 text-[10px]">
                  <div className="flex justify-between gap-1"><span className="text-muted-foreground">{isId ? "Masuk" : "In"}</span><span className="font-data font-semibold text-emerald-400">+{money(stats.income)}</span></div>
                  <div className="flex justify-between gap-1"><span className="text-muted-foreground">{isId ? "Keluar" : "Out"}</span><span className="font-data font-semibold text-red-400">−{money(stats.expense)}</span></div>
                  <div className="flex justify-between gap-1 border-t border-border/40 pt-1 font-bold"><span>Net</span><span className={`font-data ${positive ? "text-emerald-400" : "text-red-400"}`}>{positive ? "+" : ""}{money(stats.net)}</span></div>
                </div>
              </button>
            );
          })}
        </div>
      </MobileDisclosure>
    </div>
  );
}
