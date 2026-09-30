import { Landmark, Plus, Target, Trash2, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Account, Currency, FinanceState } from "@/lib/localDb";
import { useState } from "react";
import type * as React from "react";
import { formatMoney } from "@/lib/formatters";
import { SectionHeading, ShowMoreButton, KpiCard, EmptyState } from "@/components/shared";
import { BottomSheet } from "@/components/mobile/BottomSheet";

interface AccountLabels {
  accounts: string;
  manageAccounts: string;
  addAccount: string;
  bankName: string;
  accountType: string;
  brand: string;
  startingBalance: string;
  save: string;
  adjust: string;
  remove: string;
  totalAcross: string;
}

const ACCOUNT_PREVIEW_COUNT = 3;
const types: Account["type"][] = ["debit", "credit", "ewallet", "cash", "investment"];
const typeLabel: Record<Account["type"], string> = { debit: "Debit", credit: "Credit", ewallet: "E-Wallet", cash: "Cash", investment: "Investment" };

export function AccountsPanel({
  state,
  labels,
  totalBalance,
  onAdd,
  onAdjust,
  onRemove,
  showAddModalFromParent,
  onCloseAddModalFromParent,
}: {
  state: FinanceState;
  labels: AccountLabels;
  totalBalance: number;
  onAdd: (account: Account) => void;
  onAdjust: (account: Account) => void;
  onRemove: (account: Account) => void;
  showAddModalFromParent?: boolean;
  onCloseAddModalFromParent?: () => void;
}) {
  const [form, setForm] = useState({ name: "", brand: "", type: "debit" as Account["type"], balance: "", currency: state.baseCurrency as Currency });
  const isId = state.locale === "id";
  const [showAllAccounts, setShowAllAccounts] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const showModal = isAddOpen || Boolean(showAddModalFromParent);
  const closeModal = () => {
    setIsAddOpen(false);
    onCloseAddModalFromParent?.();
  };

  const hasMoreAccounts = state.accounts.length > ACCOUNT_PREVIEW_COUNT;
  const visibleAccounts = showAllAccounts ? state.accounts : state.accounts.slice(0, ACCOUNT_PREVIEW_COUNT);
  const totalSavings = (state.savings || []).reduce((sum, g) => sum + (g.saved || 0), 0);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const balance = Number(form.balance);
    if (!form.name.trim() || !form.brand.trim() || !Number.isFinite(balance)) return;
    onAdd({
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}`,
      name: form.name.trim(),
      brand: form.brand.trim(),
      type: form.type,
      balance,
      currency: form.currency,
    });
    setForm({ name: "", brand: "", type: "debit", balance: "", currency: state.baseCurrency });
    closeModal();
  };

  return (
    <div className="animate-rise-in">
      <SectionHeading
        eyebrow="Money map / accounts"
        title={labels.accounts}
        description={labels.manageAccounts}
        action={
          <Button
            data-testid="accounts-add-button"
            onClick={() => setIsAddOpen(true)}
            className="gap-2 shadow-lg shadow-primary/20"
          >
            <Plus size={17} />{labels.addAccount}
          </Button>
        }
      />

      {/* ── Mobile FAB / Desktop Add Account BottomSheet Modal ── */}
      {showModal && (
        <BottomSheet
          open
          onClose={closeModal}
          testid="add-account-modal"
          eyebrow="Money map · Accounts"
          title={labels.addAccount}
          description={labels.manageAccounts}
        >
          <form onSubmit={submit} data-testid="account-modal-form" className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">{labels.bankName} *</label>
              <input
                data-testid="account-modal-name-input"
                required
                value={form.name}
                onChange={(event) => setForm((value) => ({ ...value, name: event.target.value }))}
                placeholder="Contoh: BCA Tabungan, Dompet Tunai"
                className="h-11 w-full min-w-0 max-w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">{labels.brand} *</label>
                <input
                  data-testid="account-modal-brand-input"
                  required
                  value={form.brand}
                  onChange={(event) => setForm((value) => ({ ...value, brand: event.target.value }))}
                  placeholder="Contoh: BCA, Mandiri, GoPay"
                  className="h-11 w-full min-w-0 max-w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">{labels.accountType}</label>
                <select
                  data-testid="account-modal-type-select"
                  value={form.type}
                  onChange={(event) => setForm((value) => ({ ...value, type: event.target.value as Account["type"] }))}
                  className="h-11 w-full min-w-0 max-w-full rounded-lg border border-border bg-background px-3 text-xs font-semibold"
                >
                  {types.map((type) => <option key={type} value={type} label={typeLabel[type]} />)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">{labels.startingBalance} *</label>
                <input
                  data-testid="account-modal-balance-input"
                  required
                  type="number"
                  value={form.balance}
                  onChange={(event) => setForm((value) => ({ ...value, balance: event.target.value }))}
                  placeholder="0"
                  className="h-11 w-full min-w-0 max-w-full rounded-lg border border-border bg-background px-3 font-data text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Currency</label>
                <select
                  data-testid="account-modal-currency-select"
                  value={form.currency}
                  onChange={(event) => setForm((value) => ({ ...value, currency: event.target.value as Currency }))}
                  className="h-11 w-full shrink-0 rounded-lg border border-border bg-background px-3 text-xs font-bold"
                >
                  {["IDR", "USD", "EUR", "SGD", "MYR", "JPY", "AUD"].map((currency) => (
                    <option key={currency} value={currency} label={currency} />
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2 sm:justify-end">
              <Button type="button" variant="ghost" onClick={closeModal}>{isId ? "Batal" : "Cancel"}</Button>
              <Button data-testid="account-modal-submit-button" type="submit" className="flex-1 gap-2 sm:flex-none">
                <Plus size={16} />{labels.save}
              </Button>
            </div>
          </form>
        </BottomSheet>
      )}

      {/* ── Top KPI Stat Cards (Positioned at Top) ── */}
      <div
        className={`mb-6 grid gap-3 sm:gap-4 ${
          state.savings && state.savings.length > 0 ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1"
        }`}
        data-testid="accounts-kpi-section"
      >
        <div className="relative">
          <KpiCard
            testid="accounts-kpi-total"
            icon={<Landmark size={18} />}
            tone="teal"
            badge={state.baseCurrency}
            badgeClass="border-primary/20 text-primary"
            label={labels.totalAcross}
            value={formatMoney(totalBalance, state.baseCurrency, state.locale)}
            valueClass="text-foreground"
            note={`${state.accounts.length} ${isId ? "akun aktif tersimpan" : "active accounts"}`}
          />
          <span className="sr-only" data-testid="accounts-total-balance">
            {formatMoney(totalBalance, state.baseCurrency, state.locale)}
          </span>
        </div>
        {state.savings && state.savings.length > 0 && (
          <KpiCard
            testid="accounts-kpi-savings"
            icon={<Target size={18} />}
            tone="emerald"
            badge={isId ? "Goals" : "Goals"}
            badgeClass="border-emerald-500/20 text-emerald-400"
            label={isId ? "Total Tertabung (Goals)" : "Total Saved (Goals)"}
            value={formatMoney(totalSavings, state.baseCurrency, state.locale)}
            valueClass="text-emerald-400"
            note={`${state.savings.length} ${isId ? "target impian aktif" : "active savings goals"}`}
          />
        )}
      </div>

      <div className="space-y-4">
        {/* Account list header & count */}
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {isId ? `Daftar Akun (${state.accounts.length})` : `Registered Accounts (${state.accounts.length})`}
          </p>
          {hasMoreAccounts && (
            <button
              type="button"
              onClick={() => setShowAllAccounts((v) => !v)}
              className="text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              {showAllAccounts ? (isId ? "Tampilkan lebih sedikit" : "Show less") : (isId ? `Lihat Semua (${state.accounts.length})` : `Show All (${state.accounts.length})`)}
            </button>
          )}
        </div>

        {/* Account list */}
        <div className="space-y-3">
          {state.savings && state.savings.length > 0 && (
            <div
              className="rounded-2xl border border-teal-500/35 bg-teal-500/5 p-4 shadow-sm backdrop-blur-xl"
              data-testid="account-card-savings-goals"
            >
              <div className="flex items-start gap-3">
                <div className="grid size-10 place-items-center rounded-xl bg-teal-500/12 text-teal-400 border border-teal-500/25">
                  <Target size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {isId ? "Total Tertabung (Goals)" : "Total Savings (Goals)"}
                    </p>
                    <Badge variant="outline" className="border-teal-500/40 text-teal-400 text-[9px]">
                      {isId ? "Khusus Tabungan" : "Savings Only"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {state.savings.length} {isId ? "target impian aktif · Non-transaksi langsung" : "active goals · Non-transactional"}
                  </p>
                </div>
                <p className="font-data text-sm font-bold text-teal-400">
                  {formatMoney(totalSavings, state.baseCurrency, state.locale)}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3 text-[11px] text-muted-foreground">
                <span>{isId ? "Saldo teralokasi khusus target tabungan" : "Balance dedicated to savings goals"}</span>
                <span className="font-semibold text-teal-400">{isId ? "Dikelola di Menu Goals" : "Managed in Goals"}</span>
              </div>
            </div>
          )}
          {visibleAccounts.map((account, index) => (
            <div
              key={account.id}
              className={`rounded-2xl border border-border/70 bg-card/75 p-4 shadow-sm backdrop-blur-xl ${
                index >= ACCOUNT_PREVIEW_COUNT ? "animate-rise-in" : ""
              }`}
              data-testid={`account-card-${account.id}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`grid size-10 place-items-center rounded-xl ${
                    account.type === "credit"
                      ? "bg-red-500/12 text-red-400"
                      : account.type === "ewallet"
                        ? "bg-indigo-500/12 text-indigo-400"
                        : "bg-primary/12 text-primary"
                  }`}
                >
                  <WalletCards size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold">{account.name}</p>
                    <Badge variant="outline" className="text-[9px]">{typeLabel[account.type]}</Badge>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {account.brand} · {account.currency}
                  </p>
                </div>
                <p className={`font-data text-sm font-bold ${account.balance < 0 ? "text-red-400" : ""}`}>
                  {formatMoney(account.balance, account.currency, state.locale)}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2 border-t border-border/50 pt-3">
                <button
                  type="button"
                  data-testid={`account-adjust-${account.id}-button`}
                  onClick={() => onAdjust(account)}
                  className="text-[10px] font-bold text-primary hover:underline"
                >
                  {labels.adjust}
                </button>
                <button
                  type="button"
                  data-testid={`account-remove-${account.id}-button`}
                  onClick={() => onRemove(account)}
                  className="flex items-center gap-1 text-[10px] font-bold text-red-400 hover:underline"
                >
                  <Trash2 size={12} />{labels.remove}
                </button>
              </div>
            </div>
          ))}

          {state.accounts.length === 0 && (
            <EmptyState
              message={isId ? "Belum ada akun terdaftar. Tambahkan akun pertama Anda." : "No accounts registered yet. Add your first account."}
            >
              <Button size="sm" onClick={() => setIsAddOpen(true)} className="gap-1.5">
                <Plus size={14} />{labels.addAccount}
              </Button>
            </EmptyState>
          )}

          {hasMoreAccounts && (
            <ShowMoreButton
              expanded={showAllAccounts}
              onToggle={() => setShowAllAccounts((v) => !v)}
              count={state.accounts.length}
              label={{
                show: isId ? "Lihat semua akun" : "Show all accounts",
                hide: isId ? "Tampilkan lebih sedikit" : "Show less",
              }}
              testid="accounts-toggle-show-all"
            />
          )}
        </div>
      </div>
    </div>
  );
}