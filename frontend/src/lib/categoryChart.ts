import type { FinanceState, Transaction } from "@/lib/localDb";

/** Chart-friendly palette: 5 distinct slices + a neutral bucket for "Lainnya". */
export const CATEGORY_COLORS = ["#ffa116", "#60a5fa", "#2cbb5d", "#a78bfa", "#22d3ee"];
export const OTHERS_COLOR = "#6b7280";

/** Keeping charts readable: at most 5 named categories, the rest collapse into one bucket. */
export const CATEGORY_CHART_LIMIT = 5;
/** Guardrail so the manager (and every chart downstream) never explodes. */
export const MAX_CATEGORIES = 15;

export interface CategorySlice {
  category: string;
  current: number;
  previous: number;
  isOthers: boolean;
}

export interface CategoryChartModel {
  slices: CategorySlice[];
  keys: string[];
  /** Two stacked rows: previous period first, then current. */
  stacked: Record<string, string | number>[];
  colorFor: (category: string) => string;
  collapsedCount: number;
  collapsedNames: string[];
  currentTotal: number;
  previousTotal: number;
}

const sumBy = (items: Transaction[], category: string, rate: number) =>
  items.filter((item) => item.kind === "expense" && item.category === category).reduce((sum, item) => sum + item.baseAmount, 0) / rate;

/**
 * Aggregates expenses per category for two periods, then keeps the top N and folds
 * everything else into a single "Lainnya" slice. Scales to any number of categories.
 */
export function buildCategoryModel(
  currentTransactions: Transaction[],
  previousTransactions: Transaction[],
  displayRate: number,
  locale: FinanceState["locale"],
  limit = CATEGORY_CHART_LIMIT,
): CategoryChartModel {
  const othersLabel = locale === "id" ? "Lainnya" : "Others";
  const rate = displayRate || 1;
  const names = Array.from(
    new Set(
      [...currentTransactions, ...previousTransactions]
        .filter((item) => item.kind === "expense")
        .map((item) => item.category || (locale === "id" ? "Tanpa kategori" : "Uncategorized")),
    ),
  );

  const totals = names
    .map((category) => ({
      category,
      current: sumBy(currentTransactions, category, rate),
      previous: sumBy(previousTransactions, category, rate),
      isOthers: false,
    }))
    .filter((item) => item.current > 0 || item.previous > 0)
    .sort((a, b) => b.current - a.current || b.previous - a.previous);

  const head = totals.slice(0, limit);
  const tail = totals.slice(limit);
  const slices: CategorySlice[] = [...head];
  if (tail.length) {
    slices.push({
      category: othersLabel,
      current: tail.reduce((sum, item) => sum + item.current, 0),
      previous: tail.reduce((sum, item) => sum + item.previous, 0),
      isOthers: true,
    });
  }

  const colorMap = new Map<string, string>();
  slices.forEach((slice, index) => {
    colorMap.set(slice.category, slice.isOthers ? OTHERS_COLOR : CATEGORY_COLORS[index % CATEGORY_COLORS.length]);
  });

  const row = (label: string, key: "current" | "previous") => {
    const entry: Record<string, string | number> = { label };
    slices.forEach((slice) => {
      entry[slice.category] = Math.round(slice[key]);
    });
    return entry;
  };

  return {
    slices,
    keys: slices.map((slice) => slice.category),
    stacked: [
      row(locale === "id" ? "Bulan lalu" : "Last month", "previous"),
      row(locale === "id" ? "Bulan ini" : "This month", "current"),
    ],
    colorFor: (category: string) => colorMap.get(category) ?? OTHERS_COLOR,
    collapsedCount: tail.length,
    collapsedNames: tail.map((item) => item.category),
    currentTotal: totals.reduce((sum, item) => sum + item.current, 0),
    previousTotal: totals.reduce((sum, item) => sum + item.previous, 0),
  };
}
