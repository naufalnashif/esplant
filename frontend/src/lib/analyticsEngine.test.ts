import { describe, expect, it } from "vitest";
import {
  getCycleRangeForDate,
  getCycleKeyForTransaction,
  getPreviousCycleKey,
  calculateRollingBaseline,
  buildMultiCycleTrend,
  validateGranularityRange,
} from "./analyticsEngine";
import type { Transaction } from "./localDb";

describe("Custom Payday Cycle & Accounting Dates", () => {
  it("defaults to calendar month when cycleDay is 1", () => {
    const date = new Date(2026, 9, 15); // Oct 15, 2026
    const range = getCycleRangeForDate(date, 1);
    expect(range.startDate).toBe("2026-10-01");
    expect(range.endDate).toBe("2026-10-31");
    expect(range.key).toBe("2026-10");
  });

  it("handles custom payday cycle (e.g. 25th to 24th)", () => {
    // 1. Date before the 25th (e.g. Oct 10, 2026) -> cycle started Sep 25 and ends Oct 24
    const dateBefore = new Date(2026, 9, 10);
    const rangeBefore = getCycleRangeForDate(dateBefore, 25);
    expect(rangeBefore.startDate).toBe("2026-09-25");
    expect(rangeBefore.endDate).toBe("2026-10-24");
    expect(rangeBefore.key).toBe("2026-10");

    // 2. Date on or after the 25th (e.g. Oct 25, 2026) -> cycle started Oct 25 and ends Nov 24
    const dateAfter = new Date(2026, 9, 25);
    const rangeAfter = getCycleRangeForDate(dateAfter, 25);
    expect(rangeAfter.startDate).toBe("2026-10-25");
    expect(rangeAfter.endDate).toBe("2026-11-24");
    expect(rangeAfter.key).toBe("2026-11");
  });

  it("assigns transactions to correct cycle keys", () => {
    expect(getCycleKeyForTransaction("2026-10-05", 25)).toBe("2026-10");
    expect(getCycleKeyForTransaction("2026-10-24", 25)).toBe("2026-10");
    expect(getCycleKeyForTransaction("2026-10-25", 25)).toBe("2026-11");
  });

  it("calculates previous cycle key correctly across year boundaries", () => {
    expect(getPreviousCycleKey("2026-05")).toBe("2026-04");
    expect(getPreviousCycleKey("2026-01")).toBe("2025-12");
  });
});

describe("Rolling Average Baseline Engine", () => {
  it("strictly excludes active unclosed cycle from baseline calculations", () => {
    const transactions: Transaction[] = [
      // Closed cycle 2026-08 (ended Aug 24)
      {
        id: "t1",
        kind: "expense",
        date: "2026-08-01",
        description: "Rent",
        category: "Housing",
        accountId: "a1",
        amount: 2_000_000,
        currency: "IDR",
        baseAmount: 2_000_000,
        tags: [],
      },
      // Closed cycle 2026-09 (ended Sep 24)
      {
        id: "t2",
        kind: "expense",
        date: "2026-09-01",
        description: "Rent",
        category: "Housing",
        accountId: "a1",
        amount: 2_000_000,
        currency: "IDR",
        baseAmount: 2_000_000,
        tags: [],
      },
      // Current active unclosed cycle 2026-10 (started Sep 25, ends Oct 24)
      {
        id: "t3-active",
        kind: "expense",
        date: "2026-10-05",
        description: "Recent expense",
        category: "Food",
        accountId: "a1",
        amount: 10_000_000, // Massive spike in current active month
        currency: "IDR",
        baseAmount: 10_000_000,
        tags: [],
      },
    ];

    const currentCycleKey = "2026-10";
    const baseline = calculateRollingBaseline(transactions, currentCycleKey, 25);

    // Active unclosed cycle (t3-active) must NOT skew the closed historical baseline!
    expect(baseline.closedCyclesCount).toBe(2);
    expect(baseline.avgCycleSpend).toBe(2_000_000);
  });
});

describe("Granularity guardrails", () => {
  it("enforces max days on daily, weekly, and monthly granularities", () => {
    expect(validateGranularityRange("daily", 15).valid).toBe(true);
    expect(validateGranularityRange("daily", 45).valid).toBe(false);
    expect(validateGranularityRange("daily", 45).recommended).toBe("weekly");

    expect(validateGranularityRange("weekly", 50).valid).toBe(true);
    expect(validateGranularityRange("weekly", 120).valid).toBe(false);
    expect(validateGranularityRange("weekly", 120).recommended).toBe("monthly");

    expect(validateGranularityRange("monthly", 300).valid).toBe(true);
  });
});

describe("Multi-Cycle Cashflow Trend Engine", () => {
  it("builds 6-cycle trend data with correct labels and amounts", () => {
    const transactions: Transaction[] = [
      {
        id: "tx-1",
        kind: "income",
        date: "2026-10-01",
        description: "Salary",
        category: "Salary",
        accountId: "a1",
        amount: 5_000_000,
        currency: "IDR",
        baseAmount: 5_000_000,
        tags: [],
      },
      {
        id: "tx-2",
        kind: "expense",
        date: "2026-10-02",
        description: "Groceries",
        category: "Food",
        accountId: "a1",
        amount: 500_000,
        currency: "IDR",
        baseAmount: 500_000,
        tags: [],
      },
    ];

    const trend = buildMultiCycleTrend(transactions, 1, 6, "id", 1);
    expect(trend).toHaveLength(6);
    const lastPoint = trend[trend.length - 1];
    expect(lastPoint).toBeDefined();
    expect(typeof lastPoint.label).toBe("string");
    expect(typeof lastPoint.shortLabel).toBe("string");
    expect(lastPoint.net).toBe(lastPoint.income - lastPoint.expense);
  });
});
