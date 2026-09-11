import { describe, expect, it } from "vitest";
import { buildCategoryChart, buildStackedSpend, seriesKey, OTHER_SLICE_KEY } from "./categoryChart";
import type { Transaction } from "./localDb";

let counter = 0;
const tx = (category: string, baseAmount: number, kind: Transaction["kind"] = "expense"): Transaction => ({
  id: `tx-${++counter}`,
  kind,
  date: "2026-07-10",
  description: category,
  category,
  accountId: "acc-1",
  amount: baseAmount,
  currency: "IDR",
  baseAmount,
  tags: [],
});

describe("buildCategoryChart", () => {
  it("includes custom categories and the 8th default (regression: categories.slice(0, 7))", () => {
    const current = [
      tx("Food", 100),
      tx("Education", 900),
      tx("Kursus Coding", 700),
    ];
    const rows = buildCategoryChart(current, [], 1, "Lainnya");
    expect(rows.map((r) => r.category)).toEqual(["Education", "Kursus Coding", "Food"]);
  });

  it("ignores income and non-positive amounts", () => {
    const rows = buildCategoryChart([tx("Salary", 5000, "income"), tx("Food", 0), tx("Transport", 50)], [], 1, "Lainnya");
    expect(rows.map((r) => r.category)).toEqual(["Transport"]);
  });

  it("keeps a category that only had spend last month", () => {
    const rows = buildCategoryChart([tx("Food", 10)], [tx("Education", 600)], 1, "Lainnya");
    const education = rows.find((r) => r.category === "Education");
    expect(education).toMatchObject({ current: 0, previous: 600 });
  });

  it("collapses rank 6 and beyond into a single Lainnya slice", () => {
    const current = [
      tx("A", 1000), tx("B", 900), tx("C", 800), tx("D", 700),
      tx("E", 600), tx("F", 500), tx("G", 400), tx("H", 300),
    ];
    const rows = buildCategoryChart(current, [], 1, "Lainnya");
    expect(rows).toHaveLength(6);
    expect(rows.map((r) => r.category)).toEqual(["A", "B", "C", "D", "E", "Lainnya"]);
    const other = rows[5];
    expect(other.isOther).toBe(true);
    expect(other.key).toBe(OTHER_SLICE_KEY);
    expect(other.current).toBe(500 + 400 + 300);
    expect(other.members).toEqual(["F", "G", "H"]);
  });

  it("does not collapse when there are exactly 5 categories", () => {
    const current = [tx("A", 5), tx("B", 4), tx("C", 3), tx("D", 2), tx("E", 1)];
    const rows = buildCategoryChart(current, [], 1, "Lainnya");
    expect(rows).toHaveLength(5);
    expect(rows.some((r) => r.isOther)).toBe(false);
  });

  it("stays collision-free when a real category is literally named Lainnya", () => {
    const current = [
      tx("Lainnya", 5000), tx("B", 900), tx("C", 800), tx("D", 700),
      tx("E", 600), tx("F", 500), tx("G", 400),
    ];
    const rows = buildCategoryChart(current, [], 1, "Lainnya");
    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
    expect(rows[0].key).toBe("Lainnya");
    expect(rows[5].key).toBe(OTHER_SLICE_KEY);
  });

  it("divides by the display rate", () => {
    const rows = buildCategoryChart([tx("Food", 1000)], [], 2, "Lainnya");
    expect(rows[0].current).toBe(500);
  });
});

describe("buildStackedSpend", () => {
  it("produces one stacked column per compared month", () => {
    const slices = buildCategoryChart([tx("Food", 300)], [tx("Food", 100)], 1, "Lainnya");
    const points = buildStackedSpend(slices, "Bulan lalu", "Bulan ini");
    expect(points).toHaveLength(2);
    expect(points[0].label).toBe("Bulan lalu");
    expect(points[0][seriesKey(slices[0])]).toBe(100);
    expect(points[1][seriesKey(slices[0])]).toBe(300);
    expect(points[1].total).toBe(300);
  });

  it("uses series keys that cannot clash with the axis key", () => {
    const slices = buildCategoryChart([tx("label", 10), tx("total", 5)], [], 1, "Lainnya");
    const points = buildStackedSpend(slices, "prev", "now");
    expect(points[1].label).toBe("now");
    expect(points[1]["s:label"]).toBe(10);
    expect(points[1]["s:total"]).toBe(5);
    expect(points[1].total).toBe(15);
  });
});
