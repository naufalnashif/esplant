import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AccountsBreakdownModal } from "./AccountsBreakdownModal";
import type { FinanceState } from "@/lib/localDb";

// Provide dummy document for SSR testing
if (typeof globalThis.document === "undefined") {
  (globalThis as any).document = {
    body: { style: {} },
  };
}

// Mock createPortal to render children directly for SSR testing
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
    { id: "acc-2", name: "GoPay", brand: "Gojek", type: "ewallet", balance: 250000, currency: "IDR" },
    { id: "acc-3", name: "Chase USD", brand: "Chase", type: "debit", balance: 100, currency: "USD" },
  ],
  transactions: [],
  bills: [],
  debts: [],
  savings: [],
  wishlist: [],
  budgets: [],
  categories: [],
  schedule: { enabled: false, frequency: "weekly", email: "", browserReminder: false },
};

describe("AccountsBreakdownModal", () => {
  it("renders nothing when closed", () => {
    const html = renderToStaticMarkup(
      <AccountsBreakdownModal
        open={false}
        onClose={() => {}}
        state={mockState}
        totalBalance={6850000}
        onNavigate={() => {}}
      />
    );
    expect(html).toBe("");
  });

  it("renders modal with active accounts and balances when open", () => {
    const html = renderToStaticMarkup(
      <AccountsBreakdownModal
        open={true}
        onClose={() => {}}
        state={mockState}
        totalBalance={6850000}
        onNavigate={() => {}}
      />
    );

    // Header & total balance
    expect(html).toContain("Akun &amp; Saldo Aktif");
    expect(html).toContain("data-testid=\"active-accounts-modal\"");
    expect(html).toContain("data-testid=\"accounts-modal-total-balance\"");

    // Account list
    expect(html).toContain("BCA Tabungan");
    expect(html).toContain("GoPay");
    expect(html).toContain("Chase USD");

    // Types & Badges
    expect(html).toContain("Debit");
    expect(html).toContain("E-Wallet");

    // Converted balance for foreign currency account (USD converted to IDR)
    expect(html).toContain("≈");

    // Action buttons
    expect(html).toContain("data-testid=\"go-to-accounts-dashboard-button\"");
    expect(html).toContain("Buka Dashboard Akun");
  });

  it("renders empty state when there are no accounts", () => {
    const emptyState: FinanceState = {
      ...mockState,
      accounts: [],
    };

    const html = renderToStaticMarkup(
      <AccountsBreakdownModal
        open={true}
        onClose={() => {}}
        state={emptyState}
        totalBalance={0}
        onNavigate={() => {}}
      />
    );

    expect(html).toContain("data-testid=\"accounts-modal-empty-state\"");
    expect(html).toContain("Belum ada akun aktif");
  });

  it("renders English copy when locale is en", () => {
    const enState: FinanceState = {
      ...mockState,
      locale: "en",
    };

    const html = renderToStaticMarkup(
      <AccountsBreakdownModal
        open={true}
        onClose={() => {}}
        state={enState}
        totalBalance={6850000}
        onNavigate={() => {}}
      />
    );

    expect(html).toContain("Active Accounts &amp; Balances");
    expect(html).toContain("Open Accounts Dashboard");
    expect(html).toContain("Total Portfolio Balance");
  });

  it("handles negative balances and displays credit styling", () => {
    const stateWithDebt: FinanceState = {
      ...mockState,
      accounts: [
        { id: "acc-credit", name: "Mega Card", brand: "Bank Mega", type: "credit", balance: -1500000, currency: "IDR" },
      ],
    };

    const html = renderToStaticMarkup(
      <AccountsBreakdownModal
        open={true}
        onClose={() => {}}
        state={stateWithDebt}
        totalBalance={-1500000}
        onNavigate={() => {}}
      />
    );

    expect(html).toContain("text-red-400");
    expect(html).toContain("Mega Card");
  });
});
