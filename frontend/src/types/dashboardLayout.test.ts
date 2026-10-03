import { describe, expect, it } from "vitest";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  sanitizeDashboardLayout,
} from "./dashboardLayout";

describe("dashboardLayout sanitization and types", () => {
  it("returns DEFAULT_DASHBOARD_LAYOUT when given null or invalid types", () => {
    expect(sanitizeDashboardLayout(null)).toEqual(DEFAULT_DASHBOARD_LAYOUT);
    expect(sanitizeDashboardLayout(undefined)).toEqual(DEFAULT_DASHBOARD_LAYOUT);
    expect(sanitizeDashboardLayout("string")).toEqual(DEFAULT_DASHBOARD_LAYOUT);
    expect(sanitizeDashboardLayout(12345)).toEqual(DEFAULT_DASHBOARD_LAYOUT);
    expect(sanitizeDashboardLayout({})).toEqual(DEFAULT_DASHBOARD_LAYOUT);
  });

  it("sanitizes an array of valid widget items", () => {
    const raw = [
      { id: "hero_balance", isVisible: false, order: 2, desktopColSpan: 6 },
      { id: "cashflow_trend", isVisible: true, order: 1, desktopColSpan: 8 },
    ];
    const result = sanitizeDashboardLayout(raw);

    const hero = result.find((item) => item.id === "hero_balance");
    const flow = result.find((item) => item.id === "cashflow_trend");

    expect(hero).toBeDefined();
    expect(hero?.isVisible).toBe(false);
    expect(hero?.desktopColSpan).toBe(6);

    expect(flow).toBeDefined();
    expect(flow?.isVisible).toBe(true);
    expect(flow?.desktopColSpan).toBe(8);

    // It should also fill in missing default widgets
    expect(result.length).toBe(DEFAULT_DASHBOARD_LAYOUT.length);
  });

  it("handles wrapped format with version and widgets array", () => {
    const raw = {
      version: 1,
      widgets: [
        { id: "quick_filters", isVisible: true, order: 1, desktopColSpan: 12 },
      ],
    };
    const result = sanitizeDashboardLayout(raw);
    expect(result.find((item) => item.id === "quick_filters")?.order).toBe(1);
    expect(result.length).toBe(DEFAULT_DASHBOARD_LAYOUT.length);
  });

  it("discards unknown widget IDs safely", () => {
    const raw = [
      { id: "malicious_script_widget", isVisible: true, order: 1, desktopColSpan: 12 },
      { id: "hero_balance", isVisible: true, order: 2, desktopColSpan: 6 },
    ];
    const result = sanitizeDashboardLayout(raw);
    expect(result.some((item) => (item.id as string) === "malicious_script_widget")).toBe(false);
    expect(result.some((item) => item.id === "hero_balance")).toBe(true);
  });

  it("clamps invalid colSpan to fallback default", () => {
    const raw = [
      { id: "hero_balance", isVisible: true, order: 1, desktopColSpan: 99 },
    ];
    const result = sanitizeDashboardLayout(raw);
    const hero = result.find((item) => item.id === "hero_balance");
    expect([4, 5, 6, 7, 8, 12]).toContain(hero?.desktopColSpan);
  });

  it("has the expected mobile layout order in DEFAULT_DASHBOARD_LAYOUT", () => {
    const sortedDefaultIds = [...DEFAULT_DASHBOARD_LAYOUT]
      .sort((a, b) => a.order - b.order)
      .map((item) => item.id);

    expect(sortedDefaultIds).toEqual([
      "hero_balance",
      "cashflow_trend",
      "category_comparison",
      "spending_allocation",
      "quick_filters",
      "financial_summary",
      "upcoming_bills",
      "recent_transactions",
      "budget_guardrails",
      "payday_status",
    ]);
  });
});
