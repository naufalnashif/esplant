import { Check, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import type * as React from "react";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { formatMoney } from "@/lib/formatters";
import type { Account, Currency, FinanceState } from "@/lib/localDb";
import type { CommitmentKind, CommitmentPaymentInput } from "@/lib/commitmentPayment";

/** Fallback category used when a commitment carries no category of its own (debts). */
export const COMMITMENT_CATEGORY = "Cicilan";

export interface PayCommitmentTarget {
  kind: CommitmentKind;
  id: string;
  name: string;
  /** Commitment category, "" for debts/receivables. */
  category: string;
  /** Amount to prefill the nominal field with. */
  amount: number;
  /** Hard cap (outstanding balance) — only set for debts/receivables. */
  maxAmount?: number;
  currency: Currency;
  /** Small line under the title, e.g. "Sisa 5x cicilan". */
  subtitle: string;
  /** "expense" for bills and debts you owe, "income" when collecting a receivable. */
  direction: "expense" | "income";
  lastPaidDate?: string;
}

/**
 * Confirmation step for paying a commitment. Nothing is written here — the parent receives the
 * collected values and applies them atomically via `applyCommitmentPayment`.
 */
export function PayCommitmentDialog({
  state,
  target,
  categories,
  onClose,
  onConfirm,
}: {
  state: FinanceState;
  target: PayCommitmentTarget;
  categories: string[];
  onClose: () => void;
  /** Returns true when the payment was committed, so the dialog can close. */
  onConfirm: (input: CommitmentPaymentInput) => boolean;
}) {
  const isId = state.locale === "id";
  const today = new Date().toISOString().slice(0, 10);

  // Reuse the account from the previous payment of this same commitment — the old flow silently
  // hardcoded accounts[0], which is exactly why the recorded account did not match reality.
  const lastUsedAccountId = useMemo(() => {
    const previous = state.transactions
      .filter((item) => item.commitmentId === target.id)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    return previous && state.accounts.some((acc) => acc.id === previous.accountId) ? previous.accountId : "";
  }, [state.transactions, state.accounts, target.id]);

  const categoryOptions = useMemo(() => {
    const preferred = target.category.trim() || COMMITMENT_CATEGORY;
    return Array.from(new Set([preferred, ...categories]));
  }, [categories, target.category]);

  const [form, setForm] = useState({
    amount: String(target.amount),
    category: target.category.trim() || COMMITMENT_CATEGORY,
    accountId: lastUsedAccountId || state.accounts[0]?.id || "",
    date: today,
    note: isId ? `Bayar ${target.name}` : `Pay ${target.name}`,
  });
  const [submitting, setSubmitting] = useState(false);

  const change = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const amount = Number(form.amount);
  const validAmount = Number.isFinite(amount) && amount > 0;
  const overCap = target.maxAmount !== undefined && validAmount && amount > target.maxAmount + 0.0001;
  const account = state.accounts.find((item) => item.id === form.accountId);
  const signedDelta = target.direction === "income" ? amount : -amount;
  const balanceAfter = account && validAmount ? account.balance + signedDelta : account?.balance ?? 0;
  const goesNegative = target.direction === "expense" && validAmount && balanceAfter < 0;
  const blocked = !validAmount || overCap || !account || !form.category.trim() || !form.date || submitting;

  const money = (value: number) => formatMoney(value, target.currency, state.locale);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (blocked) return;
    setSubmitting(true);
    const committed = onConfirm({
      kind: target.kind,
      commitmentId: target.id,
      amount,
      category: form.category.trim(),
      accountId: form.accountId,
      date: form.date,
      note: form.note,
    });
    if (committed) onClose();
    else setSubmitting(false);
  };

  const fieldClass = "h-11 w-full min-w-0 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary";
  const labelClass = "mb-1.5 block text-xs font-semibold text-muted-foreground sm:mb-2";

  return (
    <BottomSheet
      open
      onClose={onClose}
      testid="pay-commitment-modal"
      eyebrow={isId ? "Konfirmasi pembayaran" : "Payment confirmation"}
      title={target.name}
      description={
        isId
          ? "Periksa dulu — pembayaran dicatat sebagai transaksi, mengurangi saldo akun, dan memperbarui status komitmen sekaligus."
          : "Review first — this records a transaction, updates the account balance and the commitment status in one go."
      }
      footer={
        <div className="flex gap-2 sm:justify-end">
          <Button data-testid="pay-commitment-cancel-button" type="button" variant="ghost" onClick={onClose}>
            {isId ? "Batal" : "Cancel"}
          </Button>
          <Button
            data-testid="pay-commitment-confirm-button"
            type="submit"
            form="pay-commitment-form"
            disabled={blocked}
            className="flex-1 gap-2 sm:flex-none"
          >
            <Check size={16} />
            {isId ? "Konfirmasi & Bayar" : "Confirm & Pay"}
          </Button>
        </div>
      }
    >
      <form id="pay-commitment-form" onSubmit={submit} data-testid="pay-commitment-form" className="space-y-3 sm:space-y-4">
        <div
          className="rounded-xl border border-border bg-secondary/40 px-3 py-2.5 text-[11px] font-semibold text-muted-foreground"
          data-testid="pay-commitment-summary"
        >
          {target.subtitle}
          {target.lastPaidDate && (
            <span className="ml-1 text-amber-500">
              · {isId ? "terakhir dibayar" : "last paid"} {target.lastPaidDate}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <label className="col-span-2 block">
            <span className={labelClass}>
              {isId ? "Nominal" : "Amount"} * <span className="font-data text-muted-foreground">({target.currency})</span>
            </span>
            <input
              data-testid="pay-commitment-amount-input"
              required
              type="number"
              min="1"
              step="any"
              name="amount"
              value={form.amount}
              onChange={change}
              className={`${fieldClass} font-data`}
            />
            {target.maxAmount !== undefined && (
              <span className="mt-1 block text-[10px] font-semibold text-muted-foreground">
                {isId ? "Maksimal" : "Max"} {money(target.maxAmount)}
                <button
                  type="button"
                  data-testid="pay-commitment-fill-max-button"
                  onClick={() => setForm((prev) => ({ ...prev, amount: String(target.maxAmount) }))}
                  className="ml-2 font-bold text-primary hover:underline"
                >
                  {isId ? "Bayar penuh" : "Pay in full"}
                </button>
              </span>
            )}
            {overCap && (
              <span className="mt-1 block text-[10px] font-bold text-red-400" data-testid="pay-commitment-over-cap">
                {isId ? "Nominal melebihi sisa komitmen." : "Amount exceeds the outstanding balance."}
              </span>
            )}
          </label>

          <label className="block min-w-0">
            <span className={labelClass}>{isId ? "Kategori" : "Category"}</span>
            <select
              data-testid="pay-commitment-category-select"
              name="category"
              value={form.category}
              onChange={change}
              className={`${fieldClass} text-xs font-semibold`}
            >
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="block min-w-0">
            <span className={labelClass}>{isId ? "Akun sumber" : "Source account"} *</span>
            <select
              data-testid="pay-commitment-account-select"
              name="accountId"
              value={form.accountId}
              onChange={change}
              className={`${fieldClass} text-xs font-semibold`}
            >
              {state.accounts.length === 0 && <option value="">{isId ? "Belum ada akun" : "No account yet"}</option>}
              {state.accounts.map((item: Account) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block min-w-0">
            <span className={labelClass}>{isId ? "Tanggal" : "Date"} *</span>
            <input
              data-testid="pay-commitment-date-input"
              required
              type="date"
              name="date"
              value={form.date}
              onChange={change}
              className={`${fieldClass} text-xs`}
            />
          </label>

          <label className="block min-w-0">
            <span className={labelClass}>{isId ? "Catatan (opsional)" : "Note (optional)"}</span>
            <input
              data-testid="pay-commitment-note-input"
              name="note"
              value={form.note}
              onChange={change}
              placeholder={isId ? "Catatan pembayaran" : "Payment note"}
              className={fieldClass}
            />
          </label>
        </div>

        {account ? (
          <div
            className="flex items-center gap-2.5 rounded-xl border border-border bg-background px-3 py-2.5"
            data-testid="pay-commitment-balance-preview"
          >
            <Wallet size={15} className="shrink-0 text-muted-foreground" />
            <div className="min-w-0 flex-1 text-[11px]">
              <p className="font-semibold">{account.name}</p>
              <p className="font-data text-[10px] text-muted-foreground">
                {formatMoney(account.balance, state.baseCurrency, state.locale)}
                <span className="mx-1">→</span>
                <span className={goesNegative ? "font-bold text-red-400" : "font-bold text-foreground"}>
                  {formatMoney(balanceAfter, state.baseCurrency, state.locale)}
                </span>
              </p>
            </div>
            <span className={`shrink-0 font-data text-xs font-bold ${target.direction === "income" ? "text-emerald-400" : "text-red-400"}`}>
              {target.direction === "income" ? "+" : "−"}
              {validAmount ? money(amount) : money(0)}
            </span>
          </div>
        ) : (
          <p className="rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2.5 text-[11px] font-semibold text-red-400" data-testid="pay-commitment-no-account">
            {isId ? "Tambahkan akun dulu di tab Akun & saldo." : "Add an account first in the Accounts tab."}
          </p>
        )}

        {goesNegative && (
          <p
            className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-[11px] font-semibold text-amber-500"
            data-testid="pay-commitment-negative-warning"
          >
            {isId
              ? "Saldo akun akan minus setelah pembayaran ini. Lanjutkan hanya jika memang begitu kondisinya."
              : "This account will go negative after the payment. Continue only if that is really the case."}
          </p>
        )}
      </form>
    </BottomSheet>
  );
}
