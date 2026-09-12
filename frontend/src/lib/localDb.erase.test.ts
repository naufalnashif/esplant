import { describe, expect, it } from "vitest";
import { createErasedState, createInitialState, fullEraseSelection, type FinanceState } from "./localDb";

const withRecords = (): FinanceState => ({
  ...createInitialState(),
  accounts: [{ id: "a1", name: "Cash", type: "cash", brand: "", balance: 80, currency: "IDR", openingBalance: 100 }],
  transactions: [{ id: "t1", kind: "expense", date: "2026-09-01", description: "Kopi", category: "Food", accountId: "a1", amount: 20, currency: "IDR", baseAmount: 20, tags: [] }],
  bills: [{ id: "b1", name: "Net", category: "Utilities", amount: 1, currency: "IDR", frequency: "monthly", nextDueDate: "2026-10-01", active: true }],
  debts: [{ id: "d1", name: "Pinjam", person: "A", type: "debt", total: 10, paid: 0, currency: "IDR", dueDate: "2026-10-01", note: "" }],
  savings: [{ id: "s1", name: "Dana", target: 100, saved: 10, currency: "IDR", targetDate: "2026-12-01", color: "#fff" }],
  wishlist: [{ id: "w1", name: "Buku", price: 50, currency: "IDR", priority: "low", targetDate: "", category: "Lifestyle", status: "planning" }],
  budgets: [{ id: "u1", category: "Food", limit: 500, currency: "IDR" }],
});

describe("createErasedState", () => {
  it("clears every financial collection by default", () => {
    const erased = createErasedState(withRecords());
    expect(erased.accounts).toEqual([]);
    expect(erased.transactions).toEqual([]);
    expect(erased.bills).toEqual([]);
    expect(erased.debts).toEqual([]);
    expect(erased.savings).toEqual([]);
    expect(erased.wishlist).toEqual([]);
    expect(erased.budgets).toEqual([]);
    expect(erased.categories.length).toBeGreaterThan(0);
  });

  it("erases only the checked collections", () => {
    const selection = { ...fullEraseSelection(), accounts: false, transactions: true, bills: false, debts: false, savings: false, wishlist: false, budgets: false };
    const erased = createErasedState(withRecords(), selection);
    expect(erased.transactions).toEqual([]);
    expect(erased.accounts).toHaveLength(1);
    expect(erased.accounts[0].balance).toBe(100);
    expect(erased.bills).toHaveLength(1);
  });
});
