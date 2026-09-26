import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GoalsPanel } from "./GoalsPanel";
import { CommitmentsPanel } from "./CommitmentsPanel";
import type { FinanceState } from "@/lib/localDb";

if (typeof globalThis.document === "undefined") {
  (globalThis as any).document = {
    body: { style: {} },
  };
}

vi.mock("react-dom", async () => {
  const actual = await vi.importActual<typeof import("react-dom")>("react-dom");
  return {
    ...actual,
    createPortal: (children: React.ReactNode) => children,
  };
});

const mockState: FinanceState = {
  profileName: "Test User",
  baseCurrency: "IDR",
  locale: "id",
  theme: "dark",
  exchangeRates: { IDR: 1, USD: 16000, EUR: 17000, SGD: 12000, MYR: 3500, JPY: 105, AUD: 10500 },
  accounts: [
    { id: "acc-1", name: "BCA Tabungan", brand: "BCA", type: "debit", balance: 5000000, currency: "IDR" },
  ],
  transactions: [],
  bills: [
    {
      id: "bill-1",
      name: "Cicilan Motor",
      category: "Transport",
      amount: 750000,
      currency: "IDR",
      frequency: "monthly",
      customInterval: 1,
      nextDueDate: "2026-10-01",
      remainingInstallments: 10,
      active: true,
    },
  ],
  debts: [
    {
      id: "debt-1",
      name: "Pinjaman Modal Usaha",
      person: "Budi",
      type: "debt",
      total: 5000000,
      paid: 1000000,
      currency: "IDR",
      dueDate: "2026-12-31",
      note: "",
    },
  ],
  savings: [
    {
      id: "goal-1",
      name: "Dana Darurat",
      target: 20000000,
      saved: 5000000,
      currency: "IDR",
      targetDate: "2026-12-31",
      color: "#14b8a6",
    },
  ],
  wishlist: [
    {
      id: "wish-1",
      name: "MacBook Pro M3",
      price: 25000000,
      currency: "IDR",
      priority: "high",
      targetDate: "2026-11-30",
      category: "Gadget",
      status: "planning",
    },
  ],
  budgets: [],
  categories: [],
  schedule: { enabled: false, frequency: "weekly", email: "", browserReminder: false },
};

describe("GoalsPanel", () => {
  it("renders Goals panel with title 'Goals', KPI, and desktop add button", () => {
    const html = renderToStaticMarkup(
      <GoalsPanel state={mockState} onSave={() => {}} onCommit={() => {}} />
    );

    // Title & structure
    expect(html).toContain("Goals");
    expect(html).toContain("data-testid=\"goals-add-button\"");

    // Single FAB architecture: verify in-panel duplicate FAB is removed
    expect(html).not.toContain("data-testid=\"goals-fab-button\"");

    // Savings KPI cards
    expect(html).toContain("data-testid=\"total-savings-kpi\"");
    expect(html).toContain("data-testid=\"target-savings-kpi\"");

    // Wishlist removed: verify wishlist-kpi is not rendered
    expect(html).not.toContain("data-testid=\"wishlist-kpi\"");

    // Goals items rendered
    expect(html).toContain("Dana Darurat");
    expect(html).not.toContain("MacBook Pro M3");
  });
});

describe("CommitmentsPanel", () => {
  it("renders Komitmen panel with title 'Komitmen', KPI, and desktop add button", () => {
    const html = renderToStaticMarkup(
      <CommitmentsPanel state={mockState} onSave={() => {}} />
    );

    // Title & structure
    expect(html).toContain("Komitmen");
    expect(html).toContain("data-testid=\"commitments-add-button\"");

    // Single FAB architecture: verify in-panel duplicate FAB is removed
    expect(html).not.toContain("data-testid=\"commitments-fab-button\"");

    // KPI cards
    expect(html).toContain("data-testid=\"kpi-total-debt\"");
    expect(html).toContain("data-testid=\"kpi-total-receivables\"");
    expect(html).toContain("data-testid=\"kpi-total-bills\"");
    expect(html).toContain("data-testid=\"kpi-net-obligations\"");

    // Items
    expect(html).toContain("Cicilan Motor");
    expect(html).toContain("Pinjaman Modal Usaha");
  });
});
