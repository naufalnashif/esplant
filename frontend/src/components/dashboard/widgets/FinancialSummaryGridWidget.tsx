import React from "react";
import { ArrowUpRight, CalendarClock, Target, TrendingDown, TrendingUp } from "lucide-react";
import { KpiCard } from "@/components/shared";
import { formatMoney } from "@/lib/formatters";
import type { FinanceState } from "@/lib/localDb";
import type { PeriodKey } from "@/lib/overviewStats";

export interface FinancialSummaryGridWidgetProps {
  activeStats: {
    income: number;
    expense: number;
    net: number;
    count: number;
  };
  periodCommitted: number;
  totalSavings: number;
  upcomingCount: number;
  incomeDelta: number;
  periodFilter: PeriodKey;
  periodLabels: Record<PeriodKey, string>;
  baseCurrency: FinanceState["baseCurrency"];
  locale: FinanceState["locale"];
  savingsCount: number;
  onNavigateToGoals?: () => void;
}

export const FinancialSummaryGridWidget: React.FC<FinancialSummaryGridWidgetProps> = ({
  activeStats,
  periodCommitted,
  totalSavings,
  upcomingCount,
  incomeDelta,
  periodFilter,
  periodLabels,
  baseCurrency,
  locale,
  savingsCount,
  onNavigateToGoals,
}) => {
  const isId = locale === "id";

  return (
    <div
      data-testid="financial-summary-grid-widget"
      className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
    >
      <KpiCard
        label={isId ? `Pengeluaran (${periodLabels[periodFilter]})` : `Spent (${periodLabels[periodFilter]})`}
        value={formatMoney(activeStats.expense, baseCurrency, locale, true)}
        note={`${activeStats.count} ${isId ? "transaksi tercatat" : "transactions"}`}
        icon={<TrendingDown size={19} />}
        tone="rose"
      />
      <KpiCard
        label={isId ? `Pemasukan (${periodLabels[periodFilter]})` : `Income (${periodLabels[periodFilter]})`}
        value={formatMoney(activeStats.income, baseCurrency, locale, true)}
        note={
          periodFilter === "month"
            ? `${incomeDelta >= 0 ? "+" : ""}${incomeDelta}% ${isId ? "vs bulan lalu" : "vs last month"}`
            : `${periodLabels[periodFilter]}`
        }
        icon={<TrendingUp size={19} />}
        tone="emerald"
      />
      <KpiCard
        label={isId ? `Arus Bersih (${periodLabels[periodFilter]})` : `Net Flow (${periodLabels[periodFilter]})`}
        value={formatMoney(activeStats.net, baseCurrency, locale, true)}
        note={isId ? "Pemasukan − Pengeluaran" : "Income − Expense"}
        icon={<ArrowUpRight size={19} />}
        tone={activeStats.net >= 0 ? "teal" : "rose"}
      />
      <KpiCard
        label={isId ? `Tagihan & Cicilan (${periodLabels[periodFilter]})` : `Committed (${periodLabels[periodFilter]})`}
        value={formatMoney(periodCommitted, baseCurrency, locale, true)}
        note={`${upcomingCount} ${isId ? "jatuh tempo" : "due soon"}`}
        icon={<CalendarClock size={19} />}
        tone="amber"
      />
      <KpiCard
        testid="kpi-total-savings"
        label={isId ? "Total Tabungan" : "Total Saved"}
        value={formatMoney(totalSavings, baseCurrency, locale, true)}
        note={`${savingsCount} ${isId ? "target impian aktif" : "active goals"}`}
        icon={<Target size={19} />}
        tone="teal"
        onClick={onNavigateToGoals}
      />
    </div>
  );
};
