import { useState } from "react";
import type * as React from "react";
import { Check, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { formatMoney } from "@/lib/formatters";
import type { Currency, FinanceState } from "@/lib/localDb";

export interface PaymentDraft {
  accountId: string;
  amount: number;
  date: string;
  note: string;
}

export interface PaymentTarget {
  kind: "bill" | "debt";
  name: string;
  amount: number;
  currency: Currency;
  category: string;
  /** Cicilan sisa (bill) atau sisa utang (debt), untuk konteks di dialog. */
  hint?: string;
  maxAmount?: number;
}

/** Konfirmasi pembayaran cicilan/utang: pilih akun sumber dana, tanggal, dan nominal. */
export function PaymentConfirmDialog({
  state,
  target,
  onClose,
  onConfirm,
}: {
  state: FinanceState;
  target: PaymentTarget;
  onClose: () => void;
  onConfirm: (draft: PaymentDraft) => void;
}) {
  const isId = state.locale === "id";
  const [accountId, setAccountId] = useState(state.accounts[0]?.id ?? "");
  const [amount, setAmount] = useState(String(target.amount));
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");

  const account = state.accounts.find((item) => item.id === accountId);
  const parsed = Number(amount);
  const rate = state.exchangeRates[target.currency] || 1;
  const accountRate = account ? state.exchangeRates[account.currency] || 1 : 1;
  const accountDelta = Number.isFinite(parsed) ? (parsed * rate) / accountRate : 0;
  const insufficient = Boolean(account && account.balance - accountDelta < 0);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!account || !Number.isFinite(parsed) || parsed <= 0) return;
    onConfirm({ accountId: account.id, amount: parsed, date, note: note.trim() });
  };

  return (
    <BottomSheet
      open
      onClose={onClose}
      testid="payment-confirm-modal"
      eyebrow={isId ? "Konfirmasi pembayaran" : "Confirm payment"}
      title={target.name}
      description={
        target.hint ??
        (isId ? "Pembayaran akan dicatat ke riwayat transaksi." : "This payment will be recorded as a transaction.")
      }
      footer={
        <div className="flex gap-2 sm:justify-end">
          <Button data-testid="payment-cancel-button" type="button" variant="ghost" onClick={onClose}>
            {isId ? "Batal" : "Cancel"}
          </Button>
          <Button
            data-testid="payment-confirm-button"
            type="submit"
            form="payment-confirm-form"
            disabled={!account || !Number.isFinite(parsed) || parsed <= 0}
            className="flex-1 gap-2 sm:flex-none"
          >
            <Check size={16} />
            {isId ? "Ya, bayar sekarang" : "Yes, pay now"}
          </Button>
        </div>
      }
    >
      <form id="payment-confirm-form" onSubmit={submit} className="space-y-3" data-testid="payment-confirm-form">
        {state.accounts.length === 0 && (
          <p className="rounded-xl border border-red-500/35 bg-red-500/10 p-3 text-xs font-semibold text-red-400" data-testid="payment-no-account">
            {isId ? "Tambahkan akun terlebih dahulu di tab Akun & saldo." : "Add an account first."}
          </p>
        )}

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            {isId ? "Sumber dana" : "Funding source"}
          </span>
          <select
            data-testid="payment-account-select"
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-xs font-semibold"
          >
            {state.accounts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {formatMoney(item.balance, item.currency, state.locale, true)}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block min-w-0">
            <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              {isId ? "Nominal" : "Amount"} ({target.currency})
            </span>
            <input
              data-testid="payment-amount-input"
              required
              type="number"
              min="1"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 font-data text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="block min-w-0">
            <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{isId ? "Tanggal" : "Date"}</span>
            <input
              data-testid="payment-date-input"
              required
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-11 w-full rounded-lg border border-border bg-background px-3 text-xs"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
            {isId ? "Catatan (opsional)" : "Note (optional)"}
          </span>
          <input
            data-testid="payment-note-input"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder={isId ? "Mis. bayar via mobile banking" : "e.g. paid via mobile banking"}
            className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
        </label>

        {account && (
          <div className="rounded-xl border border-border/70 bg-background/50 p-3 text-xs" data-testid="payment-preview">
            <p className="flex items-center gap-2 font-semibold text-muted-foreground">
              <Wallet size={14} /> {isId ? "Saldo setelah pembayaran" : "Balance after payment"}
            </p>
            <p className={`mt-1 font-data text-sm font-bold ${insufficient ? "text-red-400" : "text-foreground"}`} data-testid="payment-preview-balance">
              {formatMoney(account.balance, account.currency, state.locale, true)} →{" "}
              {formatMoney(account.balance - accountDelta, account.currency, state.locale, true)}
            </p>
            {insufficient && (
              <p className="mt-1 text-[11px] font-semibold text-red-400" data-testid="payment-insufficient-warning">
                {isId ? "Saldo akun ini akan menjadi negatif." : "This account will go negative."}
              </p>
            )}
          </div>
        )}
      </form>
    </BottomSheet>
  );
}
