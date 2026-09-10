import type { Currency, FinanceState, Transaction } from "@/lib/localDb";

export type HealthSeverity = "error" | "warning";

export interface HealthIssue {
  id: string;
  severity: HealthSeverity;
  fixable: boolean;
  title: string;
  titleEn: string;
  detail: string;
  detailEn: string;
}

export interface HealthReport {
  issues: HealthIssue[];
  errors: number;
  warnings: number;
  ok: boolean;
}

const TOLERANCE = 1; // rounding tolerance in account currency units

const transactionDelta = (transaction: Transaction, rates: FinanceState["exchangeRates"], currency: Currency) =>
  ((transaction.kind === "expense" ? -1 : 1) * transaction.baseAmount) / (rates[currency] || 1);

export const expectedAccountBalance = (state: FinanceState, accountId: string): number | null => {
  const account = state.accounts.find((item) => item.id === accountId);
  if (!account || account.openingBalance === undefined) return null;
  const movement = state.transactions
    .filter((item) => item.accountId === account.id)
    .reduce((sum, item) => sum + transactionDelta(item, state.exchangeRates, account.currency), 0);
  return account.openingBalance + movement;
};

export const runDataHealth = (state: FinanceState): HealthReport => {
  const issues: HealthIssue[] = [];
  const money = (value: number, currency: Currency) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency, maximumFractionDigits: 0 }).format(value);

  // 1. Balance drift: opening balance + transaction history must equal current balance
  for (const account of state.accounts) {
    const expected = expectedAccountBalance(state, account.id);
    if (expected === null) continue;
    const drift = account.balance - expected;
    if (Math.abs(drift) > TOLERANCE) {
      issues.push({
        id: `drift-${account.id}`,
        severity: "error",
        fixable: true,
        title: `Saldo ${account.name} tidak sinkron`,
        titleEn: `${account.name} balance out of sync`,
        detail: `Saldo tercatat ${money(account.balance, account.currency)}, tetapi riwayat transaksi menghasilkan ${money(expected, account.currency)} (selisih ${money(drift, account.currency)}).`,
        detailEn: `Recorded balance is ${money(account.balance, account.currency)}, but the transaction history reconciles to ${money(expected, account.currency)} (drift of ${money(drift, account.currency)}).`,
      });
    }
  }

  // 2. Orphan transactions referencing a deleted account
  const accountIds = new Set(state.accounts.map((item) => item.id));
  const orphans = state.transactions.filter((item) => !accountIds.has(item.accountId));
  if (orphans.length) {
    issues.push({
      id: "orphan-transactions",
      severity: "warning",
      fixable: false,
      title: `${orphans.length} transaksi tanpa akun`,
      titleEn: `${orphans.length} transactions without an account`,
      detail: `Transaksi seperti "${orphans[0].description}" menunjuk akun yang sudah tidak ada. Edit transaksi tersebut dan pilih akun yang valid.`,
      detailEn: `Transactions such as "${orphans[0].description}" reference an account that no longer exists. Edit them and choose a valid account.`,
    });
  }

  // 3. Invalid transaction amounts
  const invalid = state.transactions.filter((item) => !Number.isFinite(item.amount) || item.amount <= 0 || !Number.isFinite(item.baseAmount));
  if (invalid.length) {
    issues.push({
      id: "invalid-amounts",
      severity: "error",
      fixable: false,
      title: `${invalid.length} transaksi dengan nominal tidak valid`,
      titleEn: `${invalid.length} transactions with invalid amounts`,
      detail: `Contoh: "${invalid[0].description}". Perbaiki atau hapus transaksi ini dari tab Transaksi.`,
      detailEn: `Example: "${invalid[0].description}". Fix or delete these entries from the Transactions tab.`,
    });
  }

  // 4. Debt paid exceeding total
  for (const debt of state.debts) {
    if (debt.paid > debt.total) {
      issues.push({
        id: `debt-over-${debt.id}`,
        severity: "warning",
        fixable: true,
        title: `Pembayaran "${debt.name}" melebihi total`,
        titleEn: `"${debt.name}" payments exceed the total`,
        detail: `Terbayar ${money(debt.paid, debt.currency)} dari total ${money(debt.total, debt.currency)}. Perbaikan otomatis akan menyamakan nilainya.`,
        detailEn: `Paid ${money(debt.paid, debt.currency)} of ${money(debt.total, debt.currency)}. Auto-fix will clamp it to the total.`,
      });
    }
  }

  // 5. Savings saved exceeding target
  for (const goal of state.savings) {
    if (goal.saved > goal.target) {
      issues.push({
        id: `savings-over-${goal.id}`,
        severity: "warning",
        fixable: true,
        title: `Tabungan "${goal.name}" melewati target`,
        titleEn: `"${goal.name}" savings exceed the target`,
        detail: `Tersimpan ${money(goal.saved, goal.currency)} dari target ${money(goal.target, goal.currency)}.`,
        detailEn: `Saved ${money(goal.saved, goal.currency)} against a target of ${money(goal.target, goal.currency)}.`,
      });
    }
  }

  // 6. Suspected duplicate transactions
  const seen = new Map<string, number>();
  for (const item of state.transactions) {
    const key = `${item.date}|${item.amount}|${item.description.toLowerCase()}|${item.accountId}|${item.kind}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  const duplicateGroups = Array.from(seen.values()).filter((count) => count > 1).length;
  if (duplicateGroups) {
    issues.push({
      id: "duplicate-suspects",
      severity: "warning",
      fixable: false,
      title: `${duplicateGroups} kemungkinan transaksi duplikat`,
      titleEn: `${duplicateGroups} possible duplicate transactions`,
      detail: "Ada transaksi dengan tanggal, nominal, dan deskripsi identik. Cek tab Transaksi untuk memastikan bukan duplikat impor.",
      detailEn: "Some transactions share the same date, amount, and description. Review the Transactions tab to rule out import duplicates.",
    });
  }

  // 7. Budgets with non-positive limits
  const badBudgets = state.budgets.filter((budget) => !Number.isFinite(budget.limit) || budget.limit <= 0);
  if (badBudgets.length) {
    issues.push({
      id: "invalid-budgets",
      severity: "warning",
      fixable: true,
      title: `${badBudgets.length} budget dengan batas tidak valid`,
      titleEn: `${badBudgets.length} budgets with invalid limits`,
      detail: "Budget dengan batas nol/negatif akan dihapus oleh perbaikan otomatis.",
      detailEn: "Budgets with zero/negative limits will be removed by auto-fix.",
    });
  }

  const errors = issues.filter((issue) => issue.severity === "error").length;
  return { issues, errors, warnings: issues.length - errors, ok: issues.length === 0 };
};

export const applyDataHealthFix = (state: FinanceState): { state: FinanceState; fixed: number } => {
  let fixed = 0;
  const accounts = state.accounts.map((account) => {
    const expected = expectedAccountBalance(state, account.id);
    if (expected !== null && Math.abs(account.balance - expected) > TOLERANCE) {
      fixed += 1;
      return { ...account, balance: expected };
    }
    return account;
  });
  const debts = state.debts.map((debt) => {
    if (debt.paid > debt.total) {
      fixed += 1;
      return { ...debt, paid: debt.total };
    }
    return debt;
  });
  const savings = state.savings.map((goal) => {
    if (goal.saved > goal.target) {
      fixed += 1;
      return { ...goal, saved: goal.target };
    }
    return goal;
  });
  const budgets = state.budgets.filter((budget) => {
    const valid = Number.isFinite(budget.limit) && budget.limit > 0;
    if (!valid) fixed += 1;
    return valid;
  });
  return { state: { ...state, accounts, debts, savings, budgets }, fixed };
};
