import type { Transaction } from "./localDb";

/*
  Category aggregation for the overview donut + comparison bar chart.

  Why this module exists: the charts used to render `categories.slice(0, 7)` — a slice of a
  hardcoded fallback list — so the 8th default ("Education") and every user-created category
  were silently dropped from the visuals. Everything here is derived from the actual
  transactions instead, so any category (default, custom, or only present in history) shows up
  as soon as it has money attached to it.
*/

/** Real categories kept as their own slice; rank 6 and beyond collapse into "Lainnya"/"Others". */
export const CHART_CATEGORY_LIMIT = 5;

/** Stable key for the collapsed slice — a user category may legitimately be named "Lainnya". */
export const OTHER_SLICE_KEY = "__other__";

/** Neutral grey so the grouped slice never competes with a real category colour. */
export const OTHER_SLICE_COLOR = "#6b7280";

export interface CategorySlice {
  /** Unique, render-safe React key / Recharts series id. */
  key: string;
  /** Display name — the translated "Lainnya"/"Others" label for the collapsed slice. */
  category: string;
  /** Spend in the selected month, already divided by the display rate. */
  current: number;
  /** Spend in the month before the selected one. */
  previous: number;
  /** True only for the collapsed slice. */
  isOther: boolean;
  /** Real category names folded into this slice (single-element for normal slices). */
  members: string[];
}

const blank = () => ({ current: 0, previous: 0 });

/**
 * Aggregates expense transactions into at most `limit + 1` slices, sorted by combined
 * (current + previous) spend so a category that only had spend last month stays visible in the
 * month-over-month comparison.
 */
export const buildCategoryChart = (
  currentTransactions: Transaction[],
  previousTransactions: Transaction[],
  displayRate: number,
  otherLabel: string,
  limit: number = CHART_CATEGORY_LIMIT,
): CategorySlice[] => {
  const rate = displayRate || 1;
  const totals = new Map<string, { current: number; previous: number }>();

  const accumulate = (transactions: Transaction[], bucket: "current" | "previous") => {
    transactions.forEach((transaction) => {
      if (transaction.kind !== "expense") return;
      const amount = Number(transaction.baseAmount);
      if (!Number.isFinite(amount) || amount <= 0) return;
      const name = String(transaction.category ?? "").trim() || otherLabel;
      const entry = totals.get(name) ?? blank();
      entry[bucket] += amount / rate;
      totals.set(name, entry);
    });
  };

  accumulate(currentTransactions, "current");
  accumulate(previousTransactions, "previous");

  const rows: CategorySlice[] = Array.from(totals.entries())
    .map(([category, value]) => ({
      key: category,
      category,
      current: value.current,
      previous: value.previous,
      isOther: false,
      members: [category],
    }))
    .filter((row) => row.current > 0 || row.previous > 0)
    .sort(
      (a, b) =>
        b.current + b.previous - (a.current + a.previous) ||
        b.current - a.current ||
        a.category.localeCompare(b.category),
    );

  if (rows.length <= limit) return rows;

  const head = rows.slice(0, limit);
  const tail = rows.slice(limit);
  return [
    ...head,
    {
      key: OTHER_SLICE_KEY,
      category: otherLabel,
      current: tail.reduce((sum, row) => sum + row.current, 0),
      previous: tail.reduce((sum, row) => sum + row.previous, 0),
      isOther: true,
      members: tail.map((row) => row.category),
    },
  ];
};

/** Recharts series id for a slice — prefixed so it can never clash with the axis key. */
export const seriesKey = (slice: CategorySlice) => `s:${slice.key}`;

export interface StackedSpendPoint {
  /** X-axis label (the two compared months). */
  label: string;
  /** Total of every stacked segment, for the axis/tooltip. */
  total: number;
  [series: string]: string | number;
}

/**
 * Reshapes the slices into two stacked columns ("last month" / "this month") where each
 * category is a segment. Stacking only makes sense across categories, which is why the chart
 * falls back to grouped bars when there is a single category.
 */
export const buildStackedSpend = (
  slices: CategorySlice[],
  previousLabel: string,
  currentLabel: string,
): StackedSpendPoint[] => {
  const point = (label: string, pick: (slice: CategorySlice) => number): StackedSpendPoint => {
    const row: StackedSpendPoint = { label, total: 0 };
    slices.forEach((slice) => {
      const value = pick(slice);
      row[seriesKey(slice)] = value;
      row.total = Number(row.total) + value;
    });
    return row;
  };

  return [
    point(previousLabel, (slice) => slice.previous),
    point(currentLabel, (slice) => slice.current),
  ];
};
