import React from "react";
import type { PeriodKey } from "@/lib/overviewStats";

export interface QuickPeriodFilterWidgetProps {
  periodFilter: PeriodKey;
  setPeriodFilter: (period: PeriodKey) => void;
  periodLabels: Record<PeriodKey, string>;
  isId: boolean;
}

const PERIOD_KEYS: PeriodKey[] = ["today", "week", "month", "year", "all"];

export const QuickPeriodFilterWidget: React.FC<QuickPeriodFilterWidgetProps> = ({
  periodFilter,
  setPeriodFilter,
  periodLabels,
  isId,
}) => {
  return (
    <div
      data-testid="quick-period-filter-widget"
      className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center py-1"
    >
      <div>
        <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-muted-foreground">
          {isId ? "Filter Periode Dashboard" : "Dashboard Period Filter"}
        </p>
        <h2 className="mt-0.5 sm:mt-1 font-heading text-lg sm:text-xl font-bold text-slate-900 dark:text-foreground">
          {isId
            ? `Ringkasan Finansial (${periodLabels[periodFilter]})`
            : `Financial Overview (${periodLabels[periodFilter]})`}
        </h2>
      </div>

      <div
        className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-100/90 p-1.5 shadow-xs dark:border-border/70 dark:bg-card/80"
        data-testid="period-filter-bar"
      >
        {PERIOD_KEYS.map((pKey) => (
          <button
            key={pKey}
            type="button"
            data-testid={`period-filter-${pKey}`}
            onClick={() => setPeriodFilter(pKey)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors cursor-pointer ${
              periodFilter === pKey
                ? "bg-amber-600 text-white shadow-xs dark:bg-primary dark:text-primary-foreground"
                : "text-slate-600 hover:bg-white hover:text-slate-900 dark:text-muted-foreground dark:hover:bg-secondary dark:hover:text-foreground"
            }`}
          >
            {periodLabels[pKey]}
          </button>
        ))}
      </div>
    </div>
  );
};
