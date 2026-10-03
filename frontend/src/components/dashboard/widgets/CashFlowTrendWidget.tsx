import React from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/formatters";
import type { FinanceState } from "@/lib/localDb";

export interface CashFlowTrendWidgetProps {
  flowChart: { month: string; income: number; expense: number }[];
  baseCurrency: FinanceState["baseCurrency"];
  locale: FinanceState["locale"];
  theme: FinanceState["theme"];
  labelCashFlow?: string;
}

export const CashFlowTrendWidget: React.FC<CashFlowTrendWidgetProps> = ({
  flowChart,
  baseCurrency,
  locale,
  theme,
  labelCashFlow = "Arus kas 6 bulan",
}) => {
  const isDark = theme === "dark";
  const isId = locale === "id";

  const tooltipStyle = {
    background: isDark ? "#282828" : "#ffffff",
    border: isDark ? "1px solid #3c3c3c" : "1px solid #e2e8f0",
    borderRadius: 12,
    fontSize: 11,
    color: isDark ? "#eff1f6" : "#0f172a",
    boxShadow: isDark ? "0 4px 12px rgba(0,0,0,0.4)" : "0 10px 15px -3px rgba(0,0,0,0.08)",
  };

  return (
    <Card
      data-testid="cashflow-trend-widget"
      className="flex h-full min-h-[200px] sm:min-h-[218px] flex-col justify-between border border-slate-200/80 bg-white p-5 sm:p-6 shadow-soft dark:border-border/70 dark:bg-card/75 dark:shadow-none dark:backdrop-blur-xl"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-muted-foreground">
            {isId ? "Tren Finansial" : "Smart snapshot"}
          </p>
          <p className="mt-1 sm:mt-2 font-heading text-base sm:text-lg font-bold text-slate-900 dark:text-foreground">
            {labelCashFlow}
          </p>
        </div>
        <Badge variant="secondary" className="gap-1 text-[11px]">
          <RefreshCw size={11} /> Live
        </Badge>
      </div>

      <div className="my-3 h-[95px] sm:h-[105px] w-full min-h-[95px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={flowChart}>
            <defs>
              <linearGradient id="cashflow-widget-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ffa116" stopOpacity={0.42} />
                <stop offset="100%" stopColor="#ffa116" stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={[0, (dataMax: number) => (dataMax <= 0 ? 100000 : Math.ceil(dataMax * 1.15))]} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value) => formatMoney(Number(value), baseCurrency, locale, true)}
            />
            <Area
              type="monotone"
              dataKey="income"
              stroke={isDark ? "#2cbb5d" : "#16a34a"}
              strokeWidth={2}
              fill="url(#cashflow-widget-grad)"
            />
            <Area
              type="monotone"
              dataKey="expense"
              stroke={isDark ? "#ef4743" : "#e11d48"}
              strokeWidth={2}
              fill="transparent"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex gap-4 text-[10px] font-semibold text-slate-500 dark:text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <i className="size-2 rounded-full bg-emerald-500" />
          {isId ? "Pemasukan" : "Income"}
        </span>
        <span className="flex items-center gap-1.5">
          <i className="size-2 rounded-full bg-rose-500" />
          {isId ? "Pengeluaran" : "Expense"}
        </span>
      </div>
    </Card>
  );
};
