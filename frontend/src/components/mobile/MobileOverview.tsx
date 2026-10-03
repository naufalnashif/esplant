import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  ArrowDownLeft, ArrowUpRight, CalendarClock, ChevronRight, Plus, RefreshCw, ShieldCheck, Sparkles,
  Target, TrendingDown, TrendingUp, WalletCards,
} from "lucide-react";
import { useState } from "react";
import type * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AccountsBreakdownModal } from "@/components/AccountsBreakdownModal";
import type { FinanceState } from "@/lib/localDb";
import { formatMoney } from "@/lib/formatters";
import { CATEGORY_COLORS, toBase, useOverviewStats, type PeriodKey } from "@/lib/overviewStats";
import { OTHER_SLICE_COLOR, type CategorySlice } from "@/lib/categoryChart";
import { KpiCard, SectionCardHeader, type KpiTone } from "@/components/shared";

export interface OverviewLabels {
  hello: string; totalBalance: string; cashFlow: string; recent: string; seeAll: string; dueSoon: string; noData: string;
  compare: string; thisMonth: string; lastMonth: string; addTransaction: string;
}
export type OverviewTarget = "accounts" | "settings" | "commitments" | "transactions" | "goals";
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

// MiniKpi: thin wrapper around shared KpiCard using compact mobile sizing
function MiniKpi({ label, value, note, icon, tone, testid, onClick }: { label: string; value: string; note: string; icon: React.ReactNode; tone: KpiTone; testid: string; onClick?: () => void }) {
  return (
    <KpiCard
      testid={testid}
      label={label}
      value={value}
      note={note}
      icon={icon}
      tone={tone}
      onClick={onClick}
      variant="compact"
    />
  );
}

// MobileCardHeader: thin wrapper around shared SectionCardHeader for mobile context
function MobileCardHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return <SectionCardHeader eyebrow={eyebrow} title={title} action={action} mb="mb-3" />;
}

export function MobileOverview({ state, t, totalBalance, currentSpend, currentIncome, categoryChart, flowChart, currentMonth, setCompareMonth, onNavigate, onLoadSample, accountName }: MobileOverviewProps) {
  const [accountsModalOpen, setAccountsModalOpen] = useState(false);
  const { isId, periodFilter, setPeriodFilter, upcoming, periodCommitted, monthOptions, activeStats, periodLabels, incomeDelta, totalSavings } = useOverviewStats(state, currentMonth, currentIncome);
  const isDark = state.theme === "dark";
  const tooltipStyle = {
    background: isDark ? "#282828" : "#ffffff",
    border: isDark ? "1px solid #3c3c3c" : "1px solid #e2e8f0",
    borderRadius: 12,
    fontSize: 11,
    color: isDark ? "#eff1f6" : "#0f172a",
    boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.4)" : "0 10px 15px -3px rgba(0,0,0,0.08)",
  };
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
        <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-primary">{isId ? "Keuangan Pribadi" : "Personal finance"}</p>
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

      <Card className="relative overflow-hidden border border-amber-500/20 bg-white p-5 text-slate-900 shadow-soft dark:border-primary/20 dark:bg-gradient-to-br dark:from-[#303030] dark:via-[#262626] dark:to-[#1c1c1c] dark:text-white dark:shadow-xl dark:shadow-primary/10" data-testid="mobile-balance-card">
        <div className="absolute -right-16 -top-20 size-56 rounded-full border-[24px] border-amber-500/10 pointer-events-none dark:border-white/8" />
        <div className="absolute -right-12 -top-12 size-40 rounded-full bg-gradient-to-bl from-amber-500/12 via-amber-500/4 to-transparent blur-2xl pointer-events-none dark:hidden" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-white/65">{t.totalBalance} · {state.baseCurrency}</p>
            <button
              type="button"
              data-testid="mobile-total-balance-accounts-trigger"
              onClick={() => setAccountsModalOpen(true)}
              title={isId ? "Klik untuk melihat rincian akun aktif" : "Click to view active accounts breakdown"}
              aria-label={isId ? "Lihat rincian akun aktif" : "View active accounts breakdown"}
              className="flex items-center justify-center rounded-lg border border-slate-200/80 bg-slate-50/80 p-1.5 text-slate-700 shadow-xs transition-all duration-200 active:scale-90 hover:bg-slate-100 hover:border-amber-400 cursor-pointer dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 dark:hover:border-white/40"
            >
              <WalletCards size={16} />
            </button>
          </div>
          <p className="mt-2 font-heading text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white" data-testid="total-balance-value">{formatMoney(totalBalance, state.baseCurrency, state.locale)}</p>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-600 dark:text-white/70">
            <button
              type="button"
              data-testid="mobile-active-accounts-count-trigger"
              onClick={() => setAccountsModalOpen(true)}
              className="flex items-center gap-1.5 transition-colors hover:text-slate-900 cursor-pointer dark:hover:text-white"
              title={isId ? "Klik untuk melihat rincian akun" : "Click to view accounts breakdown"}
            >
              <span className="size-2 rounded-full bg-emerald-500 dark:bg-emerald-300" /> {state.accounts.length} {isId ? "akun aktif" : "active accounts"}
            </button>
            {totalSavings > 0 && (
              <button
                type="button"
                data-testid="mobile-total-savings-trigger"
                onClick={() => onNavigate("goals")}
                className="flex items-center gap-1.5 transition-colors hover:text-slate-900 cursor-pointer dark:hover:text-white"
                title={isId ? "Lihat tabungan di Goals" : "View savings in Goals"}
              >
                <Target size={13} className="text-teal-600 dark:text-teal-300" />
                <span>{isId ? "Tabungan" : "Saved"}: {money(totalSavings)}</span>
              </button>
            )}
            <span className="flex items-center gap-1.5"><ShieldCheck size={13} /> {isId ? "Privat & Aman" : "Saved"}</span>
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
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
              periodFilter === key
                ? "bg-amber-600 text-white shadow-xs dark:bg-primary dark:text-primary-foreground"
                : "border border-slate-200/80 bg-white text-slate-600 hover:text-slate-900 dark:border-border/70 dark:bg-card/80 dark:text-muted-foreground"
            }`}
          >
            {periodLabels[key]}
          </button>
        ))}
      </div>

      <div className="space-y-2" data-testid="mobile-kpi-container">
        <div className="grid grid-cols-2 gap-2" data-testid="mobile-kpi-grid">
          <MiniKpi testid="mobile-kpi-expense" label={isId ? "Pengeluaran" : "Spent"} value={money(activeStats.expense)} note={`${activeStats.count} ${isId ? "transaksi" : "transactions"}`} icon={<TrendingDown size={14} />} tone="rose" />
          <MiniKpi testid="mobile-kpi-income" label={isId ? "Pemasukan" : "Income"} value={money(activeStats.income)} note={periodFilter === "month" ? `${incomeDelta >= 0 ? "+" : ""}${incomeDelta}% vs ${isId ? "bulan lalu" : "last month"}` : periodLabels[periodFilter]} icon={<TrendingUp size={14} />} tone="emerald" />
          <MiniKpi testid="mobile-kpi-net" label={isId ? "Arus Bersih" : "Net Flow"} value={money(activeStats.net)} note={isId ? "Pemasukan − Pengeluaran" : "Income − Expense"} icon={<ArrowUpRight size={14} />} tone={activeStats.net >= 0 ? "teal" : "rose"} />
          <MiniKpi testid="mobile-kpi-committed" label={isId ? "Tagihan & Cicilan" : "Committed"} value={money(periodCommitted)} note={`${upcoming.length} ${isId ? "jatuh tempo" : "due soon"}`} icon={<CalendarClock size={14} />} tone="amber" />
        </div>
        <div
          data-testid="mobile-kpi-savings"
          onClick={() => onNavigate("goals")}
          className="group flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-3 py-2 shadow-soft transition-all active:scale-[0.99] cursor-pointer hover:border-amber-400 hover:bg-amber-50/30 dark:border-primary/25 dark:bg-card/75 dark:shadow-xs dark:backdrop-blur-xl dark:hover:border-primary/50 dark:hover:bg-primary/5"
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className="grid size-6 shrink-0 place-items-center rounded-md border border-teal-200/60 bg-teal-50 text-teal-600 dark:border-transparent dark:bg-primary/15 dark:text-primary">
              <Target size={13} />
            </div>
            <div className="min-w-0 flex items-center gap-1.5">
              <span className="truncate text-xs font-semibold text-slate-900 dark:text-foreground">
                {isId ? "Total Tabungan" : "Total Saved"}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-muted-foreground font-medium shrink-0">
                · {state.savings.length} {isId ? "target" : "goals"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="font-data text-xs font-bold text-amber-700 dark:text-primary" data-testid="mobile-kpi-savings-value">
              {money(totalSavings)}
            </span>
            <ChevronRight size={13} className="text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-700 dark:text-muted-foreground dark:group-hover:text-primary" />
          </div>
        </div>
      </div>

      <Card className="border border-slate-200/80 bg-white p-4 shadow-soft dark:border-border/70 dark:bg-card/75 dark:shadow-none" data-testid="mobile-main-chart">
        <MobileCardHeader eyebrow={isId ? "Tren Finansial" : "Smart snapshot"} title={t.cashFlow} action={<Badge variant="secondary" className="shrink-0 gap-1"><RefreshCw size={11} /> Live</Badge>} />
        <div className="mt-3 h-[170px] w-full min-h-[170px]">
          <ResponsiveContainer width="100%" height="100%" minHeight={170}>
            <AreaChart data={flowChart} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="cashflow-mobile" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ffa116" stopOpacity={0.42} />
                  <stop offset="100%" stopColor="#ffa116" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, (dataMax: number) => (dataMax <= 0 ? 100000 : Math.ceil(dataMax * 1.15))]} />
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => money(Number(value))} />
              <Area type="monotone" dataKey="income" stroke={isDark ? "#2cbb5d" : "#16a34a"} strokeWidth={2} fill="url(#cashflow-mobile)" />
              <Area type="monotone" dataKey="expense" stroke={isDark ? "#ef4743" : "#e11d48"} strokeWidth={2} fill="transparent" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200/80 pt-3 text-[11px] dark:border-border/50">
          <div><p className="flex items-center gap-1 font-semibold text-slate-600 dark:text-muted-foreground"><i className="size-2 rounded-full bg-emerald-500" /> {isId ? "Pemasukan" : "Income"}</p><p className="mt-0.5 font-data text-xs font-bold text-emerald-600 dark:text-emerald-400" data-testid="mobile-flow-income-total">+{money(flowIncome)}</p></div>
          <div><p className="flex items-center gap-1 font-semibold text-slate-600 dark:text-muted-foreground"><i className="size-2 rounded-full bg-rose-500" /> {isId ? "Pengeluaran" : "Expense"}</p><p className="mt-0.5 font-data text-xs font-bold text-rose-600 dark:text-red-400" data-testid="mobile-flow-expense-total">−{money(flowExpense)}</p></div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3" data-testid="mobile-mini-charts">
        <Card className="border border-slate-200/80 bg-white p-3.5 shadow-soft dark:border-border/70 dark:bg-card/75 dark:shadow-none">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-muted-foreground">{isId ? "Alokasi" : "Allocation"}</p>
          <p className="mt-0.5 truncate font-heading text-sm font-bold text-slate-900 dark:text-foreground">{isId ? "Pos Belanja" : "Where it goes"}</p>
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
              <span className="font-data text-[9px] font-bold leading-tight text-slate-900 dark:text-white">{money(currentSpend).replace("Rp ", "")}</span>
            </div>
          </div>
          <div className="mt-2 space-y-1" data-testid="mobile-category-legend">
            {categoryChart.map((item, index) => (
              <div key={item.key} className="flex items-center gap-1.5 text-[10px]" data-testid={`mobile-category-legend-${item.key}`}>
                <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: sliceColor(item, index) }} />
                <span className="min-w-0 flex-1 truncate font-medium text-slate-700 dark:text-foreground">{item.category}</span>
                <span className="font-data text-slate-500 dark:text-muted-foreground">{currentSpend ? Math.min(100, Math.round((item.current / currentSpend) * 100)) : 0}%</span>
              </div>
            ))}
            {categoryChart.length === 0 && <p className="text-[10px] text-slate-500 dark:text-muted-foreground">{t.noData}</p>}
          </div>
        </Card>

        <Card className="border border-slate-200/80 bg-white p-3.5 shadow-soft dark:border-border/70 dark:bg-card/75 dark:shadow-none">
          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-muted-foreground">{t.compare}</p>
          <select
            aria-label="Comparison month"
            data-testid="comparison-month-select"
            value={currentMonth}
            onChange={(event) => setCompareMonth(event.target.value)}
            className="mt-0.5 w-full cursor-pointer truncate rounded-md border border-slate-200/80 bg-slate-50 px-1.5 py-1 text-[11px] font-bold text-slate-900 outline-none focus:border-amber-500 dark:border-border dark:bg-background dark:text-foreground"
          >
            {monthOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          <div className="mt-2.5 space-y-2">
            {topCategories.map((item) => (
              <div key={item.key}>
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="min-w-0 flex-1 truncate font-medium text-slate-700 dark:text-foreground">{item.category}</span>
                  <span className="font-data text-slate-500 dark:text-muted-foreground">{money(item.current)}</span>
                </div>
                <div className="mt-1 space-y-0.5">
                  <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(3, (item.current / compareMax) * 100)}%` }} />
                  <div className={`h-1.5 rounded-full ${isDark ? "bg-neutral-500" : "bg-slate-300"}`} style={{ width: `${Math.max(3, (item.previous / compareMax) * 100)}%` }} />
                </div>
              </div>
            ))}
            {topCategories.length === 0 && <p className="py-4 text-center text-[10px] text-slate-500 dark:text-muted-foreground">{t.noData}</p>}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-200/80 pt-2 text-[9px] font-semibold text-slate-500 dark:border-border/50 dark:text-muted-foreground">
            <span className="flex items-center gap-1"><i className="size-1.5 rounded-full bg-primary" />{t.thisMonth} {money(currentSpend)}</span>
            <span className="flex items-center gap-1"><i className={`size-1.5 rounded-full ${isDark ? "bg-neutral-500" : "bg-slate-300"}`} />{t.lastMonth} {money(previousTotal)}</span>
          </div>
        </Card>
      </div>

      <Card className="border border-slate-200/80 bg-white p-4 shadow-soft dark:border-border/70 dark:bg-card/75 dark:shadow-none" data-testid="mobile-due-soon">
        <MobileCardHeader eyebrow={isId ? "Jadwal Pembayaran" : "Action center"} title={t.dueSoon} action={<button type="button" data-testid="view-commitments-button" onClick={() => onNavigate("commitments")} className="shrink-0 text-xs font-bold text-amber-700 hover:underline dark:text-primary">{t.seeAll}</button>} />
        <div className="mt-3 space-y-2">
          {upcoming.slice(0, 3).map((bill) => (
            <div key={bill.id} className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-slate-50/70 px-3 py-2.5 dark:border-border/60 dark:bg-background/35">
              <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-amber-200/60 bg-amber-50 text-amber-700 dark:border-transparent dark:bg-amber-500/12 dark:text-amber-400"><CalendarClock size={14} /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight text-slate-900 dark:text-foreground">{bill.name}</p>
                <p className="text-[10px] text-slate-500 dark:text-muted-foreground">{shortDate(bill.nextDueDate, state.locale)} · {bill.remainingInstallments ? `${bill.remainingInstallments}x ${isId ? "sisa" : "left"}` : bill.frequency}</p>
              </div>
              <p className="shrink-0 font-data text-xs font-bold text-slate-900 dark:text-foreground">{money(toBase(bill.amount, bill.currency, state.exchangeRates))}</p>
            </div>
          ))}
          {upcoming.length === 0 && <p className="py-5 text-center text-xs text-slate-500 dark:text-muted-foreground">{t.noData}</p>}
        </div>
        <button type="button" data-testid="open-commitment-from-action-button" onClick={() => onNavigate("commitments")} className="mt-3 flex w-full items-center justify-between rounded-xl border border-dashed border-amber-500/35 px-3 py-2.5 text-left text-xs font-semibold text-amber-700 hover:bg-amber-50/50 dark:border-primary/35 dark:text-primary dark:hover:bg-primary/8 cursor-pointer">
          <span className="flex items-center gap-2"><Plus size={14} /> {isId ? "Tambah Tagihan / Cicilan" : "Add Bill / Installment"}</span>
          <ChevronRight size={14} />
        </button>
      </Card>

      <Card className="border border-slate-200/80 bg-white p-4 shadow-soft dark:border-border/70 dark:bg-card/75 dark:shadow-none" data-testid="mobile-recent">
        <MobileCardHeader eyebrow={t.recent} title={isId ? "Riwayat Transaksi" : "Your money trail"} action={<button type="button" data-testid="view-transactions-button" onClick={() => onNavigate("transactions")} className="shrink-0 text-xs font-bold text-amber-700 hover:underline dark:text-primary">{t.seeAll}</button>} />
        <div className="mt-2 divide-y divide-slate-200/80 dark:divide-border/40">
          {recent.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-2.5">
              <div className={`grid size-8 shrink-0 place-items-center rounded-lg ${item.kind === "income" ? "border border-emerald-200/60 bg-emerald-50 text-emerald-600 dark:border-transparent dark:bg-emerald-500/12 dark:text-emerald-400" : "border border-rose-200/60 bg-rose-50 text-rose-600 dark:border-transparent dark:bg-red-500/12 dark:text-red-400"}`}>{item.kind === "income" ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight text-slate-900 dark:text-foreground">{item.description}</p>
                <p className="truncate text-[10px] text-slate-500 dark:text-muted-foreground">{item.category} · {accountName(item.accountId)} · {shortDate(item.date, state.locale)}</p>
              </div>
              <p className={`shrink-0 font-data text-xs font-bold ${item.kind === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-900 dark:text-foreground"}`}>{item.kind === "income" ? "+" : "−"}{money(item.baseAmount)}</p>
            </div>
          ))}
          {recent.length === 0 && <p className="py-6 text-center text-xs text-slate-500 dark:text-muted-foreground" data-testid="recent-empty-state">{t.noData}</p>}
        </div>
      </Card>

      <AccountsBreakdownModal
        open={accountsModalOpen}
        onClose={() => setAccountsModalOpen(false)}
        state={state}
        totalBalance={totalBalance}
        onNavigate={onNavigate}
      />
    </div>
  );
}
