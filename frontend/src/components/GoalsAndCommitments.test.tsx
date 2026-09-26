import { describe, expect, it, vi } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { GoalsPanel } from "./GoalsPanel";
import { CommitmentsPanel } from "./CommitmentsPanel";
import { TransactionsPanel } from "./TransactionsPanel";
import { AccountsPanel } from "./AccountsPanel";
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

describe("TransactionsPanel status bar", () => {
  it("removes IndexedDB local and formats mobile vs desktop context properly", () => {
    const html = renderToStaticMarkup(
      <TransactionsPanel
        state={mockState}
        labels={{
          all: "Semua",
          type: "Tipe",
          expense: "Pengeluaran",
          incomeType: "Pemasukan",
          category: "Kategori",
          account: "Akun",
          newest: "Terbaru",
          largest: "Terbesar",
          search: "Cari",
          noData: "Tidak ada transaksi",
          addTransaction: "Tambah Transaksi",
        }}
        categories={["Food", "Transport"]}
        filteredTransactions={[]}
        filter={{ search: "", kind: "all", category: "all", account: "all", sort: "newest" }}
        setFilter={() => {}}
        accountName={() => "BCA"}
        onAdd={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );

    // Dead / unwanted text removed
    expect(html).not.toContain("IndexedDB local");
    expect(html).toContain("0 transaksi");
  });
});

describe("AccountsPanel", () => {
  it("renders Total Tertabung (Goals) as a dedicated non-transactional account card", () => {
    const html = renderToStaticMarkup(
      <AccountsPanel
        state={mockState}
        labels={{
          accounts: "Akun",
          manageAccounts: "Kelola Akun",
          addAccount: "Tambah Akun",
          bankName: "Nama Akun",
          accountType: "Tipe Akun",
          brand: "Institusi",
          startingBalance: "Saldo Awal",
          save: "Simpan",
          adjust: "Sesuaikan",
          remove: "Hapus",
          totalAcross: "Total Saldo",
        }}
        totalBalance={5000000}
        onAdd={() => {}}
        onAdjust={() => {}}
        onRemove={() => {}}
      />
    );

    expect(html).toContain("data-testid=\"account-card-savings-goals\"");
    expect(html).toContain("Total Tertabung (Goals)");
    expect(html).toContain("Khusus Tabungan");
    expect(html).toContain("Non-transaksi langsung");
  });

  it("renders desktop 'Tambah Akun' button and opens BottomSheet modal when showAddModalFromParent is true", () => {
    const htmlWithModal = renderToStaticMarkup(
      <AccountsPanel
        state={mockState}
        labels={{
          accounts: "Akun",
          manageAccounts: "Kelola Akun",
          addAccount: "Tambah Akun",
          bankName: "Nama Akun",
          accountType: "Tipe Akun",
          brand: "Institusi",
          startingBalance: "Saldo Awal",
          save: "Simpan",
          adjust: "Sesuaikan",
          remove: "Hapus",
          totalAcross: "Total Saldo",
        }}
        totalBalance={5000000}
        onAdd={() => {}}
        onAdjust={() => {}}
        onRemove={() => {}}
        showAddModalFromParent={true}
        onCloseAddModalFromParent={() => {}}
      />
    );

    // Desktop add button exists in section heading
    expect(htmlWithModal).toContain("data-testid=\"accounts-add-button\"");
    // BottomSheet modal for mobile / floating add button
    expect(htmlWithModal).toContain("data-testid=\"add-account-modal\"");
    expect(htmlWithModal).toContain("data-testid=\"account-modal-form\"");
  });
});

describe("TransactionsPanel Commitment Integration", () => {
  it("renders commitment badge when transaction is linked to a bill/debt", () => {
    const stateWithLinkedTx: FinanceState = {
      ...mockState,
      transactions: [
        {
          id: "tx-1",
          description: "Pembayaran Cicilan Motor",
          amount: 750000,
          baseAmount: 750000,
          category: "Transport",
          accountId: "acc-1",
          currency: "IDR",
          date: "2026-09-26",
          tags: ["cicilan"],
          kind: "expense",
          commitmentId: "bill-1",
        },
      ],
    };

    const html = renderToStaticMarkup(
      <TransactionsPanel
        state={stateWithLinkedTx}
        labels={{
          all: "Semua",
          type: "Tipe",
          expense: "Pengeluaran",
          incomeType: "Pemasukan",
          category: "Kategori",
          account: "Akun",
          newest: "Terbaru",
          largest: "Terbesar",
          search: "Cari",
          noData: "Tidak ada transaksi",
          addTransaction: "Tambah Transaksi",
        }}
        categories={["Transport"]}
        filteredTransactions={stateWithLinkedTx.transactions}
        filter={{ search: "", kind: "all", category: "all", account: "all", sort: "newest" }}
        setFilter={() => {}}
        accountName={() => "BCA Tabungan"}
        onAdd={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    );

    expect(html).toContain("Cicilan: Cicilan Motor");
  });
});


