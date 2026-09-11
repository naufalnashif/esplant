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
export const advanceDueDate = (date: string, frequency: Bill["frequency"]): string => {
  const next = new Date(`${date}T00:00:00`);
  if (Number.isNaN(next.getTime())) return date;
  if (frequency === "weekly") next.setDate(next.getDate() + 7);
  else next.setMonth(next.getMonth() + 1);
  return next.toISOString().slice(0, 10);
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
            nextDueDate: completed ? item.nextDueDate : advanceDueDate(item.nextDueDate, item.frequency),
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
