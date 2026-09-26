import type { Bill, Currency, Debt, FinanceState, Transaction } from "./localDb";

/*
  Atomic commitment payment.

  Paying a commitment touches three different slices of the workspace at once:
    1. a new expense/income entry in the transaction history,
    2. the source account balance,
    3. the commitment status (remaining installments / amount paid / due date).

  `applyCommitmentPayment` is a PURE function: it validates first and then returns ONE fully
  rebuilt FinanceState. The caller hands that single object to `save()`, which persists the whole
  document in a single write — so either all three mutations land or none of them do. Nothing is
  ever written from inside this module, which is what keeps a failed payment from leaving a
  half-recorded transaction behind.
*/

export type CommitmentKind = "bill" | "debt";

/** Everything the confirmation dialog collects from the user. */
export interface CommitmentPaymentInput {
  kind: CommitmentKind;
  commitmentId: string;
  /** Positive amount in the commitment currency. */
  amount: number;
  category: string;
  accountId: string;
  /** ISO yyyy-mm-dd. */
  date: string;
  note: string;
}

export type CommitmentPaymentResult =
  | { ok: true; state: FinanceState; transaction: Transaction; completed: boolean; message: string }
  | { ok: false; error: string };

/** Advances a due date by one billing cycle without mutating the input. */
/** Advances a due date by one billing cycle without mutating the input. */
export const advanceDueDate = (date: string, frequency: Bill["frequency"], customInterval?: number): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(year, month - 1, day);
  const interval = customInterval && customInterval > 0 ? customInterval : 1;

  if (frequency === "daily") {
    next.setDate(next.getDate() + interval);
  } else if (frequency === "weekly") {
    next.setDate(next.getDate() + 7 * interval);
  } else if (frequency === "monthly") {
    next.setMonth(next.getMonth() + interval);
  } else if (frequency === "yearly") {
    next.setFullYear(next.getFullYear() + interval);
  } else {
    next.setMonth(next.getMonth() + 1); // fallback
  }

  const y = next.getFullYear();
  const m = String(next.getMonth() + 1).padStart(2, "0");
  const d = String(next.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

/** True when the commitment already has a payment recorded inside `month` (yyyy-mm). */
export const isPaidInMonth = (lastPaidDate: string | undefined, month: string) =>
  Boolean(lastPaidDate) && String(lastPaidDate).slice(0, 7) === month;

/** A receivable being collected is money coming IN; everything else is money going OUT. */
export const paymentDirection = (kind: CommitmentKind, debt?: Debt): Transaction["kind"] =>
  kind === "debt" && debt?.type === "receivable" ? "income" : "expense";

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

export const applyCommitmentPayment = (
  state: FinanceState,
  input: CommitmentPaymentInput,
  copy: { id: boolean },
): CommitmentPaymentResult => {
  const isId = copy.id;
  const fail = (id: string, en: string) => ({ ok: false as const, error: isId ? id : en });

  // ---- 1. validate everything BEFORE building any new state ----
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return fail("Nominal pembayaran harus lebih dari 0.", "Payment amount must be greater than 0.");
  }
  if (!isoDate.test(input.date)) {
    return fail("Tanggal pembayaran tidak valid.", "Invalid payment date.");
  }
  const category = input.category.trim();
  if (!category) {
    return fail("Kategori wajib dipilih.", "A category is required.");
  }
  const account = state.accounts.find((item) => item.id === input.accountId);
  if (!account) {
    return fail("Akun sumber tidak ditemukan. Pilih akun yang valid.", "Source account not found. Pick a valid account.");
  }

  const bill = input.kind === "bill" ? state.bills.find((item) => item.id === input.commitmentId) : undefined;
  const debt = input.kind === "debt" ? state.debts.find((item) => item.id === input.commitmentId) : undefined;
  if (input.kind === "bill" && !bill) {
    return fail("Komitmen tidak ditemukan (mungkin sudah dihapus).", "Commitment not found (it may have been deleted).");
  }
  if (input.kind === "debt" && !debt) {
    return fail("Komitmen tidak ditemukan (mungkin sudah dihapus).", "Commitment not found (it may have been deleted).");
  }

  const currency: Currency = (bill?.currency ?? debt?.currency ?? state.baseCurrency) as Currency;
  const rate = state.exchangeRates[currency] || 1;
  const direction = paymentDirection(input.kind, debt);

  if (debt) {
    const remaining = Math.max(0, debt.total - debt.paid);
    if (remaining <= 0) {
      return fail("Komitmen ini sudah lunas.", "This commitment is already settled.");
    }
    if (amount > remaining + 0.0001) {
      return fail(
        "Nominal melebihi sisa komitmen. Kurangi nominalnya.",
        "Amount exceeds the outstanding balance. Lower the amount.",
      );
    }
  }

  // ---- 2. build the single next state (all three mutations together) ----
  const transaction: Transaction = {
    id: `tx-${input.kind}-${input.commitmentId}-${Date.now()}`,
    kind: direction,
    date: input.date,
    description: input.note.trim() || (bill?.name ?? debt?.name ?? (isId ? "Pembayaran komitmen" : "Commitment payment")),
    category,
    accountId: account.id,
    amount,
    currency,
    baseAmount: amount * rate,
    tags: input.kind === "bill" ? ["komitmen", "bill-payment"] : ["komitmen", debt?.type === "receivable" ? "receivable-collection" : "debt-payment"],
    commitmentId: input.commitmentId,
  };

  const delta = direction === "income" ? amount : -amount;
  const accounts = state.accounts.map((item) =>
    item.id === account.id ? { ...item, balance: item.balance + delta } : item,
  );

  let completed = false;
  let message = "";
  let bills = state.bills;
  let debts = state.debts;

  if (bill) {
    const hadCount = typeof bill.remainingInstallments === "number";
    const nextRemaining = hadCount ? Math.max(0, (bill.remainingInstallments as number) - 1) : undefined;
    completed = hadCount && nextRemaining === 0;
    bills = state.bills.map((item) =>
      item.id !== bill.id
        ? item
        : {
            ...item,
            remainingInstallments: nextRemaining,
            paidInstallments: (item.paidInstallments ?? 0) + 1,
            lastPaidDate: input.date,
            nextDueDate: completed ? item.nextDueDate : advanceDueDate(item.nextDueDate, item.frequency, item.customInterval),
            active: completed ? false : item.active,
          },
    );
    message = completed
      ? isId
        ? `Cicilan "${bill.name}" LUNAS. Transaksi tercatat & saldo diperbarui.`
        : `"${bill.name}" is fully paid. Transaction recorded and balance updated.`
      : isId
        ? `Pembayaran "${bill.name}" tercatat di riwayat transaksi.${hadCount ? ` Sisa ${nextRemaining}x.` : ""}`
        : `Payment for "${bill.name}" recorded.${hadCount ? ` ${nextRemaining} left.` : ""}`;
  }

  if (debt) {
    const nextPaid = Math.min(debt.total, debt.paid + amount);
    completed = nextPaid >= debt.total - 0.0001;
    debts = state.debts.map((item) =>
      item.id !== debt.id ? item : { ...item, paid: nextPaid, lastPaidDate: input.date },
    );
    message = completed
      ? isId
        ? `"${debt.name}" LUNAS. Transaksi tercatat & saldo diperbarui.`
        : `"${debt.name}" is settled. Transaction recorded and balance updated.`
      : isId
        ? `Pembayaran "${debt.name}" tercatat di riwayat transaksi.`
        : `Payment for "${debt.name}" recorded.`;
  }

  return {
    ok: true,
    completed,
    transaction,
    message,
    state: {
      ...state,
      accounts,
      bills,
      debts,
      transactions: [transaction, ...state.transactions],
    },
  };
};

/**
 * Two-way sync when a transaction is added directly in TransactionsPanel or Quick Add.
 * If transaction.commitmentId is provided, advances the bill or increments debt paid.
 */
export const syncCommitmentsOnAdd = (
  state: FinanceState,
  tx: Transaction,
): { bills: Bill[]; debts: Debt[] } => {
  if (!tx.commitmentId) return { bills: state.bills, debts: state.debts };

  const billIndex = state.bills.findIndex((b) => b.id === tx.commitmentId);
  if (billIndex !== -1) {
    const target = state.bills[billIndex];
    const updatedBill: Bill = {
      ...target,
      paidInstallments: (target.paidInstallments || 0) + 1,
      remainingInstallments:
        target.remainingInstallments !== undefined
          ? Math.max(0, target.remainingInstallments - 1)
          : undefined,
      lastPaidDate: tx.date,
      nextDueDate: advanceDueDate(target.nextDueDate, target.frequency, target.customInterval),
    };
    const bills = [...state.bills];
    bills[billIndex] = updatedBill;
    return { bills, debts: state.debts };
  }

  const debtIndex = state.debts.findIndex((d) => d.id === tx.commitmentId);
  if (debtIndex !== -1) {
    const target = state.debts[debtIndex];
    const nextPaid = Math.min(target.total, (target.paid || 0) + tx.amount);
    const updatedDebt: Debt = {
      ...target,
      paid: nextPaid,
      lastPaidDate: tx.date,
    };
    const debts = [...state.debts];
    debts[debtIndex] = updatedDebt;
    return { bills: state.bills, debts };
  }

  return { bills: state.bills, debts: state.debts };
};

/**
 * Two-way sync when a transaction is deleted in TransactionsPanel.
 * If transaction was linked to a bill or debt, reverts the payment and status seamlessly.
 */
export const syncCommitmentsOnDelete = (
  state: FinanceState,
  tx: Transaction,
): { bills: Bill[]; debts: Debt[] } => {
  if (!tx.commitmentId) return { bills: state.bills, debts: state.debts };

  const billIndex = state.bills.findIndex((b) => b.id === tx.commitmentId);
  if (billIndex !== -1) {
    const target = state.bills[billIndex];
    const updatedBill: Bill = {
      ...target,
      paidInstallments: Math.max(0, (target.paidInstallments || 1) - 1),
      remainingInstallments:
        target.remainingInstallments !== undefined
          ? target.remainingInstallments + 1
          : undefined,
    };
    const bills = [...state.bills];
    bills[billIndex] = updatedBill;
    return { bills, debts: state.debts };
  }

  const debtIndex = state.debts.findIndex((d) => d.id === tx.commitmentId);
  if (debtIndex !== -1) {
    const target = state.debts[debtIndex];
    const nextPaid = Math.max(0, (target.paid || 0) - tx.amount);
    const updatedDebt: Debt = {
      ...target,
      paid: nextPaid,
    };
    const debts = [...state.debts];
    debts[debtIndex] = updatedDebt;
    return { bills: state.bills, debts };
  }

  return { bills: state.bills, debts: state.debts };
};

/**
 * Two-way sync when a transaction is updated / edited in TransactionsPanel.
 */
export const syncCommitmentsOnUpdate = (
  state: FinanceState,
  oldTx: Transaction,
  newTx: Transaction,
): { bills: Bill[]; debts: Debt[] } => {
  // If commitment didn't change:
  if (oldTx.commitmentId === newTx.commitmentId) {
    if (!newTx.commitmentId) return { bills: state.bills, debts: state.debts };

    const debtIndex = state.debts.findIndex((d) => d.id === newTx.commitmentId);
    if (debtIndex !== -1) {
      const target = state.debts[debtIndex];
      const delta = newTx.amount - oldTx.amount;
      const nextPaid = Math.max(0, Math.min(target.total, (target.paid || 0) + delta));
      const updatedDebt: Debt = {
        ...target,
        paid: nextPaid,
        lastPaidDate: newTx.date,
      };
      const debts = [...state.debts];
      debts[debtIndex] = updatedDebt;
      return { bills: state.bills, debts };
    }

    const billIndex = state.bills.findIndex((b) => b.id === newTx.commitmentId);
    if (billIndex !== -1) {
      const target = state.bills[billIndex];
      const updatedBill: Bill = {
        ...target,
        lastPaidDate: newTx.date,
      };
      const bills = [...state.bills];
      bills[billIndex] = updatedBill;
      return { bills, debts: state.debts };
    }

    return { bills: state.bills, debts: state.debts };
  }

  // Commitment changed: revert old commitment, apply new commitment
  let intermediate = { bills: state.bills, debts: state.debts };
  if (oldTx.commitmentId) {
    intermediate = syncCommitmentsOnDelete(state, oldTx);
  }
  if (newTx.commitmentId) {
    const tempState = { ...state, bills: intermediate.bills, debts: intermediate.debts };
    return syncCommitmentsOnAdd(tempState, newTx);
  }
  return intermediate;
};
