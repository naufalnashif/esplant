import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MobileOverview } from "./MobileOverview";
import type { FinanceState } from "@/lib/localDb";

// Mock recharts for SSR rendering
vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AreaChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Area: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  PieChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Pie: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Cell: () => <div />,
}));

const mockState: FinanceState = {
  profileName: "Test User",
  baseCurrency: "IDR",
  locale: "id",
  theme: "dark",
  exchangeRates: { IDR: 1, USD: 16000, EUR: 17000, SGD: 12000, MYR: 3500, JPY: 105, AUD: 10500 },
  accounts: [
    { id: "acc-1", name: "BCA Tabungan", brand: "BCA", type: "debit", balance: 5000000, currency: "IDR" },
  ],
  transactions: [
    {
      id: "tx-1",
      accountId: "acc-1",
      amount: 150000,
      currency: "IDR",
      baseAmount: 150000,
      category: "Makan",
      date: "2026-10-01",
      description: "Makan Siang",
      kind: "expense",
      tags: [],
    },
  ],
  bills: [
    {
      id: "bill-1",
      name: "Listrik PLN",
      amount: 300000,
      currency: "IDR",
      nextDueDate: "2026-10-10",
      frequency: "monthly",
      category: "Tagihan",
      active: true,
    },
  ],
  debts: [],
  savings: [],
  wishlist: [],
  budgets: [{ id: "b-1", category: "Makan", limit: 2000000, currency: "IDR" }],
  categories: [
    { id: "cat-1", name: "Makan", archived: false },
    { id: "cat-2", name: "Tagihan", archived: false },
  ],
  customCycleDay: 25,
  schedule: { enabled: false, frequency: "weekly", email: "", browserReminder: false },
};

const mockLabels = {
  hello: "Halo",
  totalBalance: "Total Saldo",
  cashFlow: "Arus Kas",
  recent: "Riwayat Transaksi",
  seeAll: "Lihat Semua",
  dueSoon: "Segera Jatuh Tempo",
  noData: "Tidak ada data",
  compare: "Bandingkan",
  thisMonth: "Bulan Ini",
  lastMonth: "Bulan Lalu",
  addTransaction: "Tambah Transaksi",
};

describe("MobileOverview default layout and widget disclosure behavior", () => {
  it("renders MobileChartsCarousel and unified MobileDisclosures in expected order", () => {
    const html = renderToStaticMarkup(
      <MobileOverview
        state={mockState}
        t={mockLabels}
        totalBalance={5000000}
        currentSpend={150000}
        currentIncome={10000000}
        categoryChart={[
          { key: "makan", category: "Makan", current: 150000, previous: 120000, isOther: false, members: [] },
        ]}
        flowChart={[
          { month: "Okt", income: 10000000, expense: 150000 },
        ]}
        currentMonth="2026-10"
        setCompareMonth={() => {}}
        onNavigate={() => {}}
        accountName={() => "BCA"}
        onOpenEditCycle={() => {}}
        categories={["Makan", "Tagihan"]}
      />
    );

    // 1. Verify charts carousel is rendered
    expect(html).toContain("mobile-charts-carousel-wrapper");

    // 2. Verify upcoming bills disclosure and testid
    expect(html).toContain("mobile-due-soon");
    expect(html).toContain("mobile-due-soon-toggle");

    // 3. Verify recent transactions disclosure and testid
    expect(html).toContain("mobile-recent");
    expect(html).toContain("mobile-recent-toggle");

    // 4. Verify budget guardrails disclosure and testid
    expect(html).toContain("mobile-budget-section");
    expect(html).toContain("mobile-budget-section-toggle");

    // 5. Verify order of elements in HTML output:
    // Carousel with Balance (1) -> Quick Filters (2) -> Financial Summary (3) -> Due Soon (4) -> Recent (5) -> Budget (6) -> Payday (bottom)
    const posCarousel = html.indexOf("mobile-charts-carousel-wrapper");
    const posBalance = html.indexOf("mobile-balance-card");
    const posFilters = html.indexOf("period-filter-bar");
    const posSummary = html.indexOf("mobile-kpi-container");
    const posDueSoon = html.indexOf("mobile-due-soon");
    const posRecent = html.indexOf("mobile-recent");
    const posBudget = html.indexOf("mobile-budget-section");
    const posPayday = html.indexOf("mobile-cycle-banner-bottom");

    expect(posCarousel).toBeGreaterThan(-1);
    expect(posBalance).toBeGreaterThan(posCarousel); // Balance card is inside carousel
    expect(posFilters).toBeGreaterThan(posCarousel);
    expect(posSummary).toBeGreaterThan(posFilters);
    expect(posDueSoon).toBeGreaterThan(posSummary);
    expect(posRecent).toBeGreaterThan(posDueSoon);
    expect(posBudget).toBeGreaterThan(posRecent);
    expect(posPayday).toBeGreaterThan(posBudget);
  });
});
