import React, { useRef, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FinanceState } from "@/lib/localDb";
import type { CategorySlice } from "@/lib/categoryChart";

export interface MobileChartsCarouselProps {
  flowChart: { month: string; income: number; expense: number }[];
  categoryChart: CategorySlice[];
  pieData: CategorySlice[];
  state: FinanceState;
  t: Record<string, string>;
  isId: boolean;
  currentMonth: string;
  setCompareMonth: (m: string) => void;
  monthOptions: { value: string; label: string }[];
  currentSpend: number;
  money: (value: number) => string;
  sliceColor: (slice: CategorySlice, index: number) => string;
  tooltipStyle: React.CSSProperties;
  isFlowVisible?: boolean;
  isCategoryVisible?: boolean;
  isAllocationVisible?: boolean;
  flowIncome: number;
  flowExpense: number;
  compareMax: number;
  previousTotal: number;
  topCategories: CategorySlice[];
}

export const MobileChartsCarousel: React.FC<MobileChartsCarouselProps> = ({
  flowChart,
  categoryChart,
  pieData,
  state,
  t,
  isId,
  currentMonth,
  setCompareMonth,
  monthOptions,
  currentSpend,
  money,
  sliceColor,
  tooltipStyle,
  isFlowVisible = true,
  isCategoryVisible = true,
  isAllocationVisible = true,
  flowIncome,
  flowExpense,
  compareMax,
  previousTotal,
  topCategories,
}) => {
  const isDark = state.theme === "dark";
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Available visible slides in order
  const slides: { id: "cashflow_trend" | "category_comparison" | "spending_allocation"; label: string }[] = [];
  if (isFlowVisible) {
    slides.push({ id: "cashflow_trend", label: isId ? "Arus Kas" : "Cash Flow" });
  }
  if (isCategoryVisible) {
    slides.push({ id: "category_comparison", label: isId ? "Bandingkan Kategori" : "Comparison" });
  }
  if (isAllocationVisible) {
    slides.push({ id: "spending_allocation", label: isId ? "Alokasi Belanja" : "Allocation" });
  }

  if (slides.length === 0) return null;

  const handleScroll = () => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const cardWidth = el.firstElementChild ? (el.firstElementChild as HTMLElement).offsetWidth + 12 : el.offsetWidth;
    const newIndex = Math.min(slides.length - 1, Math.max(0, Math.round(scrollLeft / cardWidth)));
    setActiveIndex(newIndex);
  };

  const scrollToSlide = (idx: number) => {
    const el = scrollContainerRef.current;
    if (!el || !el.children[idx]) return;
    const targetChild = el.children[idx] as HTMLElement;
    targetChild.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    setActiveIndex(idx);
  };

  return (
    <div className="w-full space-y-2" data-testid="mobile-charts-carousel-wrapper">
      {/* Top Carousel Navigation Tabs & Swipe Hint */}
      {slides.length > 1 && (
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5" role="tablist">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                role="tab"
                aria-selected={activeIndex === idx}
                onClick={() => scrollToSlide(idx)}
                className={`rounded-full px-3 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                  activeIndex === idx
                    ? "bg-amber-600 text-white shadow-xs dark:bg-primary dark:text-primary-foreground"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/80 dark:bg-card dark:border dark:border-border/60 dark:text-muted-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <span className="text-[10px] font-semibold text-muted-foreground shrink-0 select-none">
            {activeIndex + 1}/{slides.length}
          </span>
        </div>
      )}

      {/* Swipeable Horizontal Track */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 snap-x snap-mandatory scroll-smooth pb-1"
        data-testid="mobile-charts-swipe-track"
      >
        {slides.map((slide) => {
          if (slide.id === "cashflow_trend") {
            return (
              <div
                key="cashflow_trend"
                className="w-[calc(100vw-36px)] sm:w-[380px] shrink-0 snap-center"
              >
                <Card
                  className="flex h-full flex-col justify-between border border-slate-200/80 bg-white p-4 shadow-soft dark:border-border/70 dark:bg-card/75 dark:shadow-none"
                  data-testid="mobile-main-chart"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-muted-foreground">
                          {isId ? "Tren Finansial" : "Smart snapshot"}
                        </p>
                        <h3 className="font-heading text-sm font-extrabold text-slate-900 dark:text-foreground">
                          {t.cashFlow}
                        </h3>
                      </div>
                      <Badge variant="secondary" className="shrink-0 gap-1 text-[10px]">
                        <RefreshCw size={10} /> Live
                      </Badge>
                    </div>

                    <div className="mt-2 h-[160px] w-full min-h-[160px]">
                      <ResponsiveContainer width="100%" height="100%" minHeight={160}>
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
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200/80 pt-2.5 text-[11px] dark:border-border/50">
                    <div>
                      <p className="flex items-center gap-1 font-semibold text-slate-600 dark:text-muted-foreground">
                        <i className="size-2 rounded-full bg-emerald-500" /> {isId ? "Pemasukan" : "Income"}
                      </p>
                      <p className="mt-0.5 font-data text-xs font-bold text-emerald-600 dark:text-emerald-400" data-testid="mobile-flow-income-total">
                        +{money(flowIncome)}
                      </p>
                    </div>
                    <div>
                      <p className="flex items-center gap-1 font-semibold text-slate-600 dark:text-muted-foreground">
                        <i className="size-2 rounded-full bg-rose-500" /> {isId ? "Pengeluaran" : "Expense"}
                      </p>
                      <p className="mt-0.5 font-data text-xs font-bold text-rose-600 dark:text-red-400" data-testid="mobile-flow-expense-total">
                        −{money(flowExpense)}
                      </p>
                    </div>
                  </div>
                </Card>
              </div>
            );
          }

          if (slide.id === "category_comparison") {
            return (
              <div
                key="category_comparison"
                className="w-[calc(100vw-36px)] sm:w-[380px] shrink-0 snap-center"
              >
                <Card
                  className="flex h-full flex-col justify-between border border-slate-200/80 bg-white p-4 shadow-soft dark:border-border/70 dark:bg-card/75 dark:shadow-none"
                  data-testid="mobile-category-comparison-card"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-muted-foreground">
                          {t.compare}
                        </p>
                        <h3 className="font-heading text-sm font-extrabold text-slate-900 dark:text-foreground">
                          {isId ? "Bandingkan Kategori" : "Category Comparison"}
                        </h3>
                      </div>
                      <select
                        aria-label="Comparison month"
                        data-testid="comparison-month-select"
                        value={currentMonth}
                        onChange={(event) => setCompareMonth(event.target.value)}
                        className="cursor-pointer truncate rounded-lg border border-slate-200/80 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-900 outline-none focus:border-amber-500 dark:border-border dark:bg-background dark:text-foreground shrink-0 max-w-[120px]"
                      >
                        {monthOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-2 space-y-2">
                      {topCategories.map((item) => (
                        <div key={item.key}>
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="min-w-0 flex-1 truncate font-medium text-slate-700 dark:text-foreground">
                              {item.category}
                            </span>
                            <span className="font-data font-semibold text-slate-600 dark:text-muted-foreground">
                              {money(item.current)}
                            </span>
                          </div>
                          <div className="mt-1 space-y-0.5">
                            <div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(3, (item.current / compareMax) * 100)}%` }} />
                            <div className={`h-1.5 rounded-full ${isDark ? "bg-neutral-500" : "bg-slate-300"}`} style={{ width: `${Math.max(3, (item.previous / compareMax) * 100)}%` }} />
                          </div>
                        </div>
                      ))}
                      {topCategories.length === 0 && (
                        <p className="py-6 text-center text-xs text-slate-500 dark:text-muted-foreground">{t.noData}</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 border-t border-slate-200/80 pt-2 text-[10px] font-semibold text-slate-500 dark:border-border/50 dark:text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <i className="size-2 rounded-full bg-primary" /> {t.thisMonth} {money(currentSpend)}
                    </span>
                    <span className="flex items-center gap-1">
                      <i className={`size-2 rounded-full ${isDark ? "bg-neutral-500" : "bg-slate-300"}`} /> {t.lastMonth} {money(previousTotal)}
                    </span>
                  </div>
                </Card>
              </div>
            );
          }

          if (slide.id === "spending_allocation") {
            return (
              <div
                key="spending_allocation"
                className="w-[calc(100vw-36px)] sm:w-[380px] shrink-0 snap-center"
              >
                <Card
                  className="flex h-full flex-col justify-between border border-slate-200/80 bg-white p-4 shadow-soft dark:border-border/70 dark:bg-card/75 dark:shadow-none"
                  data-testid="mobile-spending-allocation-card"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-muted-foreground">
                          {isId ? "Alokasi" : "Allocation"}
                        </p>
                        <h3 className="font-heading text-sm font-extrabold text-slate-900 dark:text-foreground">
                          {isId ? "Distribusi Alokasi Pengeluaran" : "Spending Allocation"}
                        </h3>
                      </div>
                      <Badge variant="outline" className="text-[10px] font-medium shrink-0">
                        {categoryChart.length} {isId ? "pos" : "cats"}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3.5 py-1">
                      <div className="relative size-[100px] shrink-0" data-testid="mobile-category-donut" data-slice-count={categoryChart.length}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={pieData} dataKey="current" nameKey="category" innerRadius={28} outerRadius={46} paddingAngle={3} stroke="none">
                              {pieData.map((item, index) => (
                                <Cell key={item.key} fill={sliceColor(item, index)} />
                              ))}
                            </Pie>
                            <Tooltip contentStyle={tooltipStyle} formatter={(value) => money(Number(value))} />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                          <span className="font-data text-[9px] font-bold leading-tight text-slate-900 dark:text-white">
                            {money(currentSpend).replace("Rp ", "")}
                          </span>
                        </div>
                      </div>

                      <div className="min-w-0 flex-1 space-y-1.5" data-testid="mobile-category-legend">
                        {categoryChart.slice(0, 4).map((item, index) => (
                          <div key={item.key} className="flex items-center justify-between gap-1.5 text-xs" data-testid={`mobile-category-legend-${item.key}`}>
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: sliceColor(item, index) }} />
                              <span className="truncate font-medium text-slate-700 dark:text-foreground">{item.category}</span>
                            </div>
                            <span className="font-data text-slate-500 dark:text-muted-foreground font-semibold shrink-0">
                              {currentSpend ? Math.min(100, Math.round((item.current / currentSpend) * 100)) : 0}%
                            </span>
                          </div>
                        ))}
                        {categoryChart.length === 0 && (
                          <p className="text-xs text-slate-500 dark:text-muted-foreground">{t.noData}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 border-t border-slate-200/80 pt-2 text-[10px] font-semibold text-slate-500 dark:border-border/50 dark:text-muted-foreground">
                    <span>{isId ? "Total Terhitung" : "Total"}: {money(currentSpend)}</span>
                  </div>
                </Card>
              </div>
            );
          }

          return null;
        })}
      </div>

      {/* Pagination dots */}
      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pt-1" aria-hidden="true" data-testid="carousel-dots-indicator">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              onClick={() => scrollToSlide(idx)}
              aria-label={`Ke slide ${idx + 1}`}
              className={`size-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                activeIndex === idx
                  ? "bg-amber-600 dark:bg-primary scale-125 shadow-xs"
                  : "bg-slate-300 dark:bg-zinc-700 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
