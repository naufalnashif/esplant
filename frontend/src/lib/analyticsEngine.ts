import type { Locale, Transaction } from "./localDb";

export interface CycleRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  key: string; // YYYY-MM identifier for the cycle
  label: string; // human-readable e.g. "25 Sep - 24 Okt"
}

const pad = (n: number) => String(n).padStart(2, "0");
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/**
 * Returns the financial accounting cycle range for a given date.
 * If cycleDay is 1 (default), follows normal calendar month (1st to last day of month).
 * If cycleDay is > 1 (e.g. 25 for payday on the 25th), cycle runs from the 25th to the 24th of the next month.
 */
export function getCycleRangeForDate(date: Date, cycleDay = 1): CycleRange {
  const day = Math.max(1, Math.min(31, Math.floor(cycleDay)));
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  const dateOfMonth = date.getDate();

  if (day === 1) {
    const start = new Date(year, month, 1, 0, 0, 0);
    const end = new Date(year, month + 1, 0, 23, 59, 59);
    const key = `${year}-${pad(month + 1)}`;
    const label = new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric" }).format(start);
    return {
      startDate: isoDate(start),
      endDate: isoDate(end),
      key,
      label,
    };
  }

  // If cycleDay > 1 (e.g. 25th payday):
  // If today is on or after the 25th (e.g. Oct 26), cycle started Oct 25 and ends Nov 24.
  // If today is before the 25th (e.g. Oct 3), cycle started Sep 25 and ends Oct 24.
  let startYear = year;
  let startMonth = month;
  if (dateOfMonth < day) {
    // Started previous month
    startMonth = month - 1;
    if (startMonth < 0) {
      startMonth = 11;
      startYear = year - 1;
    }
  }

  // Clamp day if previous/start month has fewer days (e.g. 31 in Feb)
  const maxDaysInStartMonth = new Date(startYear, startMonth + 1, 0).getDate();
  const actualStartDay = Math.min(day, maxDaysInStartMonth);
  const start = new Date(startYear, startMonth, actualStartDay);

  let endYear = startYear;
  let endMonth = startMonth + 1;
  if (endMonth > 11) {
    endMonth = 0;
    endYear = startYear + 1;
  }
  const closingDay = day - 1;
  const maxDaysInEndMonth = new Date(endYear, endMonth + 1, 0).getDate();
  const actualEndDay = Math.min(closingDay, maxDaysInEndMonth);
  const end = new Date(endYear, endMonth, actualEndDay);

  // Key corresponds to the closing/payday month (the month in which the cycle concludes)
  const key = `${endYear}-${pad(endMonth + 1)}`;
  const label = `${actualStartDay} ${new Intl.DateTimeFormat("id-ID", { month: "short" }).format(start)} – ${actualEndDay} ${new Intl.DateTimeFormat("id-ID", { month: "short" }).format(end)}`;

  return {
    startDate: isoDate(start),
    endDate: isoDate(end),
    key,
    label,
  };
}

/** Determines which cycle key a given transaction date string falls into. */
export function getCycleKeyForTransaction(dateStr: string, cycleDay = 1): string {
  const parts = dateStr.split("-").map(Number);
  if (parts.length < 3 || Number.isNaN(parts[0])) return dateStr.slice(0, 7);
  const d = new Date(parts[0], parts[1] - 1, parts[2], 12);
  return getCycleRangeForDate(d, cycleDay).key;
}

/** Given a cycleKey (YYYY-MM), returns the previous cycle key. */
export function getPreviousCycleKey(cycleKey: string): string {
  const [yearStr, monthStr] = cycleKey.split("-");
  let year = parseInt(yearStr, 10);
  let month = parseInt(monthStr, 10) - 1; // to 0-indexed
  month -= 1;
  if (month < 0) {
    month = 11;
    year -= 1;
  }
  return `${year}-${pad(month + 1)}`;
}

export interface RollingBaseline {
  avgDailySpend: number;
  avgWeeklySpend: number;
  avgCycleSpend: number;
  closedCyclesCount: number;
  thresholdHighDaily: number;
}

/**
 * Calculates dynamic average spending strictly based on historical data (t < current_cycle),
 * excluding the active unclosed period to prevent baseline skew.
 */
export function calculateRollingBaseline(
  transactions: Transaction[],
  currentCycleKey: string,
  cycleDay = 1,
  displayRate = 1,
): RollingBaseline {
  // Only past transactions strictly before the current cycle
  const pastExpenses = transactions.filter((t) => {
    if (t.kind !== "expense") return false;
    const cycleKey = getCycleKeyForTransaction(t.date, cycleDay);
    return cycleKey < currentCycleKey;
  });

  if (pastExpenses.length === 0) {
    return {
      avgDailySpend: 0,
      avgWeeklySpend: 0,
      avgCycleSpend: 0,
      closedCyclesCount: 0,
      thresholdHighDaily: 0,
    };
  }

  // Group by cycle key
  const cycleTotals = new Map<string, number>();
  const activeDays = new Set<string>();

  for (const t of pastExpenses) {
    const key = getCycleKeyForTransaction(t.date, cycleDay);
    const amount = (t.baseAmount || t.amount) / displayRate;
    cycleTotals.set(key, (cycleTotals.get(key) || 0) + amount);
    activeDays.add(t.date);
  }

  const closedCyclesCount = cycleTotals.size;
  const totalSpend = Array.from(cycleTotals.values()).reduce((sum, v) => sum + v, 0);

  const avgCycleSpend = closedCyclesCount > 0 ? totalSpend / closedCyclesCount : 0;
  const avgDailySpend = activeDays.size > 0 ? totalSpend / activeDays.size : avgCycleSpend / 30;
  const avgWeeklySpend = avgDailySpend * 7;
  // Threshold alert triggers when daily spending exceeds 2.2x rolling baseline
  const thresholdHighDaily = Math.max(150_000 / displayRate, avgDailySpend * 2.2);

  return {
    avgDailySpend,
    avgWeeklySpend,
    avgCycleSpend,
    closedCyclesCount,
    thresholdHighDaily,
  };
}

export interface TrendDataPoint {
  cycleKey: string;
  label: string;
  shortLabel?: string;
  income: number;
  expense: number;
  net: number;
}

/**
 * Builds multi-cycle cash flow trend dataset respecting custom payday/closing cycle.
 * Dynamically scales domain/ticks so sparse history (e.g. 1-2 months) still looks balanced.
 */
export function buildMultiCycleTrend(
  transactions: Transaction[],
  cycleDay = 1,
  cycleCount = 6,
  locale: Locale = "id",
  displayRate = 1,
): TrendDataPoint[] {
  const today = new Date();
  const currentRange = getCycleRangeForDate(today, cycleDay);
  let targetKey = currentRange.key;

  const cycleKeys: string[] = [];
  for (let i = 0; i < cycleCount; i++) {
    cycleKeys.unshift(targetKey);
    targetKey = getPreviousCycleKey(targetKey);
  }

  return cycleKeys.map((key) => {
    // Generate label
    const [y, m] = key.split("-").map(Number);
    // Find representative date for this cycle key
    const repDate = new Date(y, m - 1, Math.min(cycleDay, 28));
    const range = getCycleRangeForDate(repDate, cycleDay);

    const items = transactions.filter((t) => getCycleKeyForTransaction(t.date, cycleDay) === key);
    const income = items.filter((t) => t.kind === "income").reduce((sum, t) => sum + (t.baseAmount || t.amount), 0) / displayRate;
    const expense = items.filter((t) => t.kind === "expense").reduce((sum, t) => sum + (t.baseAmount || t.amount), 0) / displayRate;

    const shortMonth = new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", { month: "short" }).format(new Date(y, m - 1, 1));
    const label = cycleDay === 1 ? shortMonth : range.label;
    const shortLabel = cycleDay === 1 ? shortMonth : `${range.startDate.slice(8, 10)}/${range.startDate.slice(5, 7)} - ${range.endDate.slice(8, 10)}/${range.endDate.slice(5, 7)}`;

    return {
      cycleKey: key,
      label,
      shortLabel,
      income,
      expense,
      net: income - expense,
    };
  });
}

/**
 * Granularity guardrails to prevent browser freezes when rendering thousands of Recharts nodes.
 */
export function validateGranularityRange(
  granularity: "daily" | "weekly" | "monthly",
  diffDays: number,
): { valid: boolean; recommended: "daily" | "weekly" | "monthly"; maxDays: number } {
  switch (granularity) {
    case "daily":
      if (diffDays > 31) {
        return { valid: false, recommended: diffDays <= 84 ? "weekly" : "monthly", maxDays: 31 };
      }
      return { valid: true, recommended: "daily", maxDays: 31 };

    case "weekly":
      if (diffDays > 84) {
        // max 12 weeks
        return { valid: false, recommended: "monthly", maxDays: 84 };
      }
      return { valid: true, recommended: "weekly", maxDays: 84 };

    case "monthly":
      if (diffDays > 730) {
        // max 24 months
        return { valid: false, recommended: "monthly", maxDays: 730 };
      }
      return { valid: true, recommended: "monthly", maxDays: 730 };
  }
}
