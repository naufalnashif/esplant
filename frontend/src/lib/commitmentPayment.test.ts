import { describe, expect, it } from "vitest";
import { advanceDueDate, applyCommitmentPayment, isPaidInMonth, paymentDirection } from "./commitmentPayment";
import type { Bill, Debt, FinanceState } from "./localDb";

const ID = { id: true };

const bill = (over: Partial<Bill> = {}): Bill => ({
  id: "bill-1",
  name: "Cicilan HP",
  category: "Lifestyle",
  amount: 425000,
  currency: "IDR",
  frequency: "monthly",
  nextDueDate: "2026-07-20",
  remainingInstallments: 5,
  active: true,
  ...over,
});

const debt = (over: Partial<Debt> = {}): Debt => ({
  id: "debt-1",
  name: "Pinjaman Budi",
  person: "Budi",
  type: "debt",
  total: 1000000,
  paid: 200000,
  currency: "IDR",
  dueDate: "2026-08-01",
  note: "",
  ...over,
});

const baseState = (over: Partial<FinanceState> = {}): FinanceState =>
  ({
    profileName: "test",
    baseCurrency: "IDR",
    locale: "id",
    theme: "dark",
    exchangeRates: { IDR: 1, USD: 16000, EUR: 17000, SGD: 12000, MYR: 3500, JPY: 105, AUD: 10500 },
    accounts: [
      { id: "acc-1", name: "BCA", type: "bank", brand: "BCA", balance: 5000000, currency: "IDR" },
      { id: "acc-2", name: "Dana", type: "ewallet", brand: "Dana", balance: 300000, currency: "IDR" },
    ],
    transactions: [],
    bills: [bill()],
    debts: [debt()],
    savings: [],
    wishlist: [],
    budgets: [],
    categories: [],
    schedule: {},
    ...over,
  }) as unknown as FinanceState;

const payInput = (over: Record<string, unknown> = {}) => ({
  kind: "bill" as const,
  commitmentId: "bill-1",
  amount: 425000,
  category: "Lifestyle",
  accountId: "acc-2",
  date: "2026-07-11",
  note: "Bayar Cicilan HP",
  ...over,
});

describe("applyCommitmentPayment — bills", () => {
  it("records the transaction against the CHOSEN account, not accounts[0]", () => {
    const result = applyCommitmentPayment(baseState(), payInput(), ID);
    if (!result.ok) throw new Error(result.error);
    expect(result.transaction.accountId).toBe("acc-2");
    expect(result.state.accounts.find((a) => a.id === "acc-2")?.balance).toBe(300000 - 425000);
    // the untouched account keeps its balance
    expect(result.state.accounts.find((a) => a.id === "acc-1")?.balance).toBe(5000000);
  });

  it("applies all three mutations in the single returned state", () => {
    const result = applyCommitmentPayment(baseState(), payInput(), ID);
    if (!result.ok) throw new Error(result.error);
    // 1. history entry
    expect(result.state.transactions).toHaveLength(1);
    expect(result.state.transactions[0]).toMatchObject({
      kind: "expense",
      category: "Lifestyle",
      amount: 425000,
      date: "2026-07-11",
      description: "Bayar Cicilan HP",
      commitmentId: "bill-1",
    });
    // 2. balance
    expect(result.state.accounts.find((a) => a.id === "acc-2")?.balance).toBe(-125000);
    // 3. commitment status
    const next = result.state.bills[0];
    expect(next.remainingInstallments).toBe(4);
    expect(next.paidInstallments).toBe(1);
    expect(next.lastPaidDate).toBe("2026-07-11");
    expect(next.nextDueDate).toBe("2026-08-20");
    expect(next.active).toBe(true);
  });

  it("never mutates the input state (nothing half-written)", () => {
    const state = baseState();
    applyCommitmentPayment(state, payInput(), ID);
    expect(state.transactions).toHaveLength(0);
    expect(state.accounts[1].balance).toBe(300000);
    expect(state.bills[0].remainingInstallments).toBe(5);
  });

  it("closes the bill when the last installment is paid", () => {
    const result = applyCommitmentPayment(baseState({ bills: [bill({ remainingInstallments: 1 })] }), payInput(), ID);
    if (!result.ok) throw new Error(result.error);
    expect(result.completed).toBe(true);
    expect(result.state.bills[0].remainingInstallments).toBe(0);
    expect(result.state.bills[0].active).toBe(false);
    // due date is frozen once completed
    expect(result.state.bills[0].nextDueDate).toBe("2026-07-20");
  });

  it("keeps recurring bills (no installment count) open and rolls the due date", () => {
    const result = applyCommitmentPayment(
      baseState({ bills: [bill({ remainingInstallments: undefined })] }),
      payInput(),
      ID,
    );
    if (!result.ok) throw new Error(result.error);
    expect(result.completed).toBe(false);
    expect(result.state.bills[0].remainingInstallments).toBeUndefined();
    expect(result.state.bills[0].active).toBe(true);
    expect(result.state.bills[0].nextDueDate).toBe("2026-08-20");
  });

  it("honours a user-edited amount, category and date", () => {
    const result = applyCommitmentPayment(
      baseState(),
      payInput({ amount: 500000, category: "Kursus Coding", date: "2026-07-01", note: "" }),
      ID,
    );
    if (!result.ok) throw new Error(result.error);
    expect(result.transaction.amount).toBe(500000);
    expect(result.transaction.category).toBe("Kursus Coding");
    expect(result.transaction.date).toBe("2026-07-01");
    // an empty note falls back to the commitment name
    expect(result.transaction.description).toBe("Cicilan HP");
    expect(result.state.accounts.find((a) => a.id === "acc-2")?.balance).toBe(300000 - 500000);
  });

  it("converts a foreign-currency commitment into the base amount", () => {
    const result = applyCommitmentPayment(
      baseState({ bills: [bill({ currency: "USD", amount: 50 })] }),
      payInput({ amount: 50 }),
      ID,
    );
    if (!result.ok) throw new Error(result.error);
    expect(result.transaction.currency).toBe("USD");
    expect(result.transaction.baseAmount).toBe(50 * 16000);
  });
});

describe("applyCommitmentPayment — debts and receivables", () => {
  it("increases paid and records an expense for a debt", () => {
    const result = applyCommitmentPayment(baseState(), payInput({ kind: "debt", commitmentId: "debt-1", amount: 300000, category: "Cicilan" }), ID);
    if (!result.ok) throw new Error(result.error);
    expect(result.transaction.kind).toBe("expense");
    expect(result.state.debts[0].paid).toBe(500000);
    expect(result.state.debts[0].lastPaidDate).toBe("2026-07-11");
    expect(result.state.accounts.find((a) => a.id === "acc-2")?.balance).toBe(300000 - 300000);
    expect(result.completed).toBe(false);
  });

  it("collecting a receivable is INCOME and increases the balance", () => {
    const state = baseState({ debts: [debt({ type: "receivable", paid: 0, total: 400000 })] });
    const result = applyCommitmentPayment(state, payInput({ kind: "debt", commitmentId: "debt-1", amount: 400000, category: "Cicilan" }), ID);
    if (!result.ok) throw new Error(result.error);
    expect(result.transaction.kind).toBe("income");
    expect(result.state.accounts.find((a) => a.id === "acc-2")?.balance).toBe(300000 + 400000);
    expect(result.completed).toBe(true);
  });

  it("rejects paying more than the outstanding balance", () => {
    const result = applyCommitmentPayment(baseState(), payInput({ kind: "debt", commitmentId: "debt-1", amount: 900000 }), ID);
    expect(result.ok).toBe(false);
  });

  it("rejects paying an already settled commitment", () => {
    const state = baseState({ debts: [debt({ paid: 1000000 })] });
    const result = applyCommitmentPayment(state, payInput({ kind: "debt", commitmentId: "debt-1", amount: 1000 }), ID);
    expect(result.ok).toBe(false);
  });
});

describe("applyCommitmentPayment — validation keeps state untouched", () => {
  const cases: [string, Record<string, unknown>][] = [
    ["zero amount", { amount: 0 }],
    ["negative amount", { amount: -5000 }],
    ["non-numeric amount", { amount: Number.NaN }],
    ["bad date", { date: "11-07-2026" }],
    ["empty category", { category: "   " }],
    ["unknown account", { accountId: "acc-does-not-exist" }],
    ["unknown commitment", { commitmentId: "bill-999" }],
  ];

  it.each(cases)("rejects %s without writing anything", (_label, over) => {
    const state = baseState();
    const result = applyCommitmentPayment(state, payInput(over), ID);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.length).toBeGreaterThan(0);
    expect(state.transactions).toHaveLength(0);
    expect(state.accounts[1].balance).toBe(300000);
    expect(state.bills[0].remainingInstallments).toBe(5);
  });

  it("returns English copy when the locale is English", () => {
    const result = applyCommitmentPayment(baseState(), payInput({ amount: 0 }), { id: false });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("Payment amount must be greater than 0.");
  });
});

describe("helpers", () => {
  it("advanceDueDate rolls monthly and weekly cycles", () => {
    expect(advanceDueDate("2026-07-20", "monthly")).toBe("2026-08-20");
    expect(advanceDueDate("2026-07-20", "weekly")).toBe("2026-07-27");
    expect(advanceDueDate("2026-12-31", "monthly")).toBe("2027-01-31");
    expect(advanceDueDate("not-a-date", "monthly")).toBe("not-a-date");
  });

  it("isPaidInMonth compares only the year-month part", () => {
    expect(isPaidInMonth("2026-07-11", "2026-07")).toBe(true);
    expect(isPaidInMonth("2026-06-30", "2026-07")).toBe(false);
    expect(isPaidInMonth(undefined, "2026-07")).toBe(false);
  });

  it("paymentDirection treats receivable collection as income", () => {
    expect(paymentDirection("bill")).toBe("expense");
    expect(paymentDirection("debt", debt())).toBe("expense");
    expect(paymentDirection("debt", debt({ type: "receivable" }))).toBe("income");
  });
});
