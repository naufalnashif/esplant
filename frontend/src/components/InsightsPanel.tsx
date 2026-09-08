import { ArrowDownRight, ArrowUpRight, CheckCircle2, Lightbulb, ShieldAlert, Sparkles, Wallet, Landmark } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/formatters";
import type { FinanceState } from "@/lib/localDb";

const monthKey = (date: string) => date.slice(0, 7);

export function InsightsPanel({
  state,
  currentMonth,
}: {
  state: FinanceState;
  currentMonth: string;
}) {
  const isId = state.locale === "id";
  const displayRate = state.exchangeRates[state.baseCurrency] || 1;
  const todayMonthStr = new Date().toISOString().slice(0, 7);

  // 1. Liquid Balance Metrics
  const totalLiquidBalance = state.accounts
    .filter((acc) => acc.balance > 0)
    .reduce((sum, acc) => sum + (acc.balance * (state.exchangeRates[acc.currency] || 1)), 0) / displayRate;

  // 2. Personal Debt Metrics
  const totalUnpaidDebt = state.debts
    .filter((d) => d.type === "debt")
    .reduce((sum, d) => sum + Math.max(0, d.total - d.paid), 0);

  // 3. Ongoing Active Bills / Installments Due This Month
  const activeBillsThisMonth = state.bills
    .filter((b) => b.active !== false && b.nextDueDate.slice(0, 7) === todayMonthStr && (b.remainingInstallments === undefined || b.remainingInstallments > 0))
    .reduce((sum, b) => sum + (b.amount * (state.exchangeRates[b.currency] || 1)), 0) / displayRate;

  // Total Combined Obligations (Debt + Installments Due)
  const totalObligations = totalUnpaidDebt + activeBillsThisMonth;

  // Receivables (Piutang)
  const totalUncollectedReceivables = state.debts
    .filter((d) => d.type === "receivable")
    .reduce((sum, d) => sum + Math.max(0, d.total - d.paid), 0);

  const debtRatio = totalLiquidBalance > 0
    ? Math.round((totalObligations / totalLiquidBalance) * 100)
    : totalObligations > 0 ? 100 : 0;

  const getRiskLevel = () => {
    if (totalObligations === 0) return "safe";
    if (debtRatio > 100) return "danger";
    if (debtRatio >= 50) return "warning";
    return "safe";
  };

  const riskLevel = getRiskLevel();

  // 4. Monthly Category Spending Insights
  const lastMonth = (() => {
    const date = new Date(`${currentMonth}-01T00:00:00`);
    date.setMonth(date.getMonth() - 1);
    return date.toISOString().slice(0, 7);
  })();

  const categories = Array.from(
    new Set([...state.transactions.map((item) => item.category), ...state.budgets.map((item) => item.category)])
  );

  const categoryInsights = categories
    .map((category) => {
      const current = state.transactions
        .filter((item) => item.kind === "expense" && item.category === category && monthKey(item.date) === currentMonth)
        .reduce((sum, item) => sum + item.baseAmount, 0);
      const previous = state.transactions
        .filter((item) => item.kind === "expense" && item.category === category && monthKey(item.date) === lastMonth)
        .reduce((sum, item) => sum + item.baseAmount, 0);
      const budget = state.budgets.find((item) => item.category === category);
      const change = previous ? Math.round(((current - previous) / previous) * 100) : 0;
      const ratio = budget ? current / (budget.limit * state.exchangeRates[budget.currency]) : 0;

      if (budget && ratio >= 1)
        return { category, tone: "rose", icon: ShieldAlert, title: `${category} melebihi budget`, detail: `Kurangi pengeluaran agar kembali ke batas.` };
      if (budget && ratio >= 0.8)
        return { category, tone: "amber", icon: Lightbulb, title: `${category} hampir penuh`, detail: `${Math.max(0, Math.round((1 - ratio) * 100))}% ruang budget tersisa bulan ini.` };
      if (change >= 15)
        return { category, tone: "amber", icon: ArrowUpRight, title: `${category} naik ${change}%`, detail: "Bandingkan transaksi sebelum menambah pengeluaran lagi." };
      if (change <= -15)
        return { category, tone: "teal", icon: ArrowDownRight, title: `${category} turun ${Math.abs(change)}%`, detail: `Berhasil menghemat dibanding bulan lalu.` };
      return { category, tone: "indigo", icon: Sparkles, title: `${category} terkendali`, detail: budget ? "Masih dalam batas budget." : "Budget aman." };
    })
    .sort((a, b) => (a.tone === "rose" ? -1 : 0) - (b.tone === "rose" ? -1 : 0))
    .slice(0, 4);

  return (
    <div className="mt-6 space-y-6" data-testid="spending-insights-panel">
      {/* Debt & Installments vs Balance Awareness Card */}
      <Card className="border-border/70 bg-card/75 p-5 shadow-sm backdrop-blur-xl sm:p-6" data-testid="debt-balance-insight-card">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Debt & Installment Awareness Engine</p>
            <h2 className="mt-1 font-heading text-xl font-bold">
              {isId ? "Kesadaran Utang & Cicilan vs Saldo Kas" : "Debt & Installments vs Balance"}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isId
                ? "Perbandingan total utang & cicilan berjalan bulan ini terhadap saldo kas cair yang kamu miliki."
                : "Ratio of total debt and monthly installments relative to liquid cash balances."}
            </p>
          </div>
          <Badge
            variant="outline"
            className={`text-xs font-extrabold px-3 py-1 ${
              riskLevel === "danger"
                ? "border-red-500/50 bg-red-500/10 text-red-400"
                : riskLevel === "warning"
                ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                : "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
            }`}
          >
            {riskLevel === "danger"
              ? isId ? "🚨 KONDISI KRITIS" : "🚨 DANGER"
              : riskLevel === "warning"
              ? isId ? "⚠️ PERLU WASPADA" : "⚠️ WARNING"
              : isId ? "✅ AMAN" : "✅ HEALTHY"}
          </Badge>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid gap-4 sm:grid-cols-3">
          {/* Total Cash Balance */}
          <div className="rounded-xl border border-border/70 bg-background/50 p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Wallet size={15} />
              <span className="text-xs font-semibold">{isId ? "Total Saldo Kas Cair" : "Liquid Cash Balance"}</span>
            </div>
            <p className="font-data text-xl font-bold tracking-tight text-foreground">
              {formatMoney(totalLiquidBalance, state.baseCurrency, state.locale, true)}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {state.accounts.length} {isId ? "akun dompet & bank" : "accounts"}
            </p>
          </div>

          {/* Total Debt & Active Installments */}
          <div className="rounded-xl border border-red-500/25 bg-red-500/5 p-4">
            <div className="flex items-center gap-2 text-red-400 mb-1">
              <Landmark size={15} />
              <span className="text-xs font-semibold">{isId ? "Total Utang & Cicilan Bulan Ini" : "Debt & Monthly Installments"}</span>
            </div>
            <p className="font-data text-xl font-bold tracking-tight text-red-400">
              {formatMoney(totalObligations, state.baseCurrency, state.locale, true)}
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {formatMoney(totalUnpaidDebt, state.baseCurrency, state.locale, true)} {isId ? "utang" : "debt"} + {formatMoney(activeBillsThisMonth, state.baseCurrency, state.locale, true)} {isId ? "cicilan bulan ini" : "bills this month"}
            </p>
          </div>

          {/* Debt-to-Balance Ratio */}
          <div className="rounded-xl border border-border/70 bg-background/50 p-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-muted-foreground">{isId ? "Rasio Beban / Saldo" : "Obligation Ratio"}</span>
              <span className="font-data text-xs font-bold text-primary">{debtRatio}%</span>
            </div>

            {/* Progress bar */}
            <div className="mt-2 h-2.5 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  debtRatio > 100 ? "bg-red-500" : debtRatio >= 50 ? "bg-amber-400" : "bg-emerald-400"
                }`}
                style={{ width: `${Math.min(100, debtRatio)}%` }}
              />
            </div>

            <p className="mt-2 text-[11px] font-medium leading-tight text-muted-foreground">
              {riskLevel === "danger"
                ? isId ? "Tanggungan melebihi kas cair! Prioritaskan pelunasan & cicilan." : "Obligations exceed liquid cash!"
                : riskLevel === "warning"
                ? isId ? "Tanggungan memakan >50% kas. Hindari utang/cicilan baru." : "Obligations consume >50% of cash."
                : isId ? "Beban utang & cicilan dalam batas aman dibanding kas." : "Obligations within safe limits."}
            </p>
          </div>
        </div>

        {/* Receivables Alert Notification */}
        {totalUncollectedReceivables > 0 && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-500/25 bg-emerald-500/8 p-3 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold">
              <CheckCircle2 size={16} />
              <span>
                {isId
                  ? `Kamu memiliki piutang sebesar ${formatMoney(totalUncollectedReceivables, state.baseCurrency, state.locale, true)} yang dapat ditagih untuk memperkuat kas.`
                  : `You have ${formatMoney(totalUncollectedReceivables, state.baseCurrency, state.locale, true)} in receivables to collect.`}
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* Category Spending Insights */}
      <Card className="border-border/70 bg-card/75 p-5 shadow-sm backdrop-blur-xl sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Coach / monthly trends</p>
            <h2 className="mt-1 font-heading text-xl font-bold">{isId ? "Insight Pengeluaran Kategori" : "Spending insights"}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {isId ? "Rekomendasi berdasarkan perubahan tren kategori dan budget." : "Category spending trends & budget guardrails."}
            </p>
          </div>
          <Badge variant="secondary">Auto</Badge>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {categoryInsights.map((insight) => {
            const Icon = insight.icon;
            return (
              <div
                key={insight.category}
                className={`rounded-xl border p-4 ${
                  insight.tone === "rose"
                    ? "border-red-400/20 bg-red-400/5"
                    : insight.tone === "amber"
                    ? "border-amber-400/20 bg-amber-400/5"
                    : insight.tone === "teal"
                    ? "border-primary/20 bg-primary/5"
                    : "border-indigo-400/20 bg-indigo-400/5"
                }`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <Icon
                    size={18}
                    className={
                      insight.tone === "rose"
                        ? "text-red-400"
                        : insight.tone === "amber"
                        ? "text-amber-400"
                        : insight.tone === "teal"
                        ? "text-primary"
                        : "text-indigo-400"
                    }
                  />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {insight.category}
                  </span>
                </div>
                <p className="text-sm font-bold">{insight.title}</p>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{insight.detail}</p>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}