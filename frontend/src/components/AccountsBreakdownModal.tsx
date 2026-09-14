import { useMemo } from "react";
import { ArrowRight, Banknote, CreditCard, Landmark, Smartphone, TrendingUp, WalletCards } from "lucide-react";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/formatters";
import type { Account, FinanceState } from "@/lib/localDb";
import { toBase } from "@/lib/overviewStats";

export interface AccountsBreakdownModalProps {
  open: boolean;
  onClose: () => void;
  state: FinanceState;
  totalBalance: number;
  onNavigate: (tab: "accounts") => void;
}

const ACCOUNT_TYPE_LABELS: Record<Account["type"], { id: string; en: string }> = {
  debit: { id: "Debit", en: "Debit" },
  credit: { id: "Kredit", en: "Credit" },
  ewallet: { id: "E-Wallet", en: "E-Wallet" },
  cash: { id: "Tunai", en: "Cash" },
  investment: { id: "Investasi", en: "Investment" },
};

function getAccountIconAndStyle(type: Account["type"]) {
  switch (type) {
    case "debit":
      return {
        icon: Landmark,
        className: "bg-emerald-500/12 text-emerald-400 border border-emerald-500/25",
      };
    case "credit":
      return {
        icon: CreditCard,
        className: "bg-red-500/12 text-red-400 border border-red-500/25",
      };
    case "ewallet":
      return {
        icon: Smartphone,
        className: "bg-indigo-500/12 text-indigo-400 border border-indigo-500/25",
      };
    case "cash":
      return {
        icon: Banknote,
        className: "bg-amber-500/12 text-amber-400 border border-amber-500/25",
      };
    case "investment":
      return {
        icon: TrendingUp,
        className: "bg-teal-500/12 text-teal-400 border border-teal-500/25",
      };
    default:
      return {
        icon: WalletCards,
        className: "bg-primary/12 text-primary border border-primary/25",
      };
  }
}

export function AccountsBreakdownModal({
  open,
  onClose,
  state,
  totalBalance,
  onNavigate,
}: AccountsBreakdownModalProps) {
  const isId = state.locale === "id";

  const handleGoToAccounts = () => {
    onClose();
    onNavigate("accounts");
  };

  const sortedAccounts = useMemo(() => {
    return [...state.accounts].sort((a, b) => {
      // Show positive balances first, descending
      const aVal = toBase(a.balance, a.currency, state.exchangeRates);
      const bVal = toBase(b.balance, b.currency, state.exchangeRates);
      return bVal - aVal;
    });
  }, [state.accounts, state.exchangeRates]);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      testid="active-accounts-modal"
      title={isId ? "Akun & Saldo Aktif" : "Active Accounts & Balances"}
      eyebrow={isId ? "Money Map · Portofolio" : "Money Map · Portfolio"}
      description={
        isId
          ? `${state.accounts.length} akun terdaftar dalam portofolio Anda`
          : `${state.accounts.length} registered accounts in your portfolio`
      }
      maxWidth="sm:max-w-lg"
      footer={
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            data-testid="close-accounts-modal-button"
            className="order-2 h-11 sm:order-1 sm:w-auto"
          >
            {isId ? "Tutup" : "Close"}
          </Button>
          <Button
            type="button"
            onClick={handleGoToAccounts}
            data-testid="go-to-accounts-dashboard-button"
            className="order-1 h-11 flex-1 gap-2 font-bold shadow-md shadow-primary/20 sm:order-2"
          >
            <WalletCards size={16} />
            <span>{isId ? "Buka Dashboard Akun" : "Open Accounts Dashboard"}</span>
            <ArrowRight size={15} className="ml-auto opacity-75" />
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Total Summary Card */}
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-gradient-to-br from-card via-card/90 to-secondary/30 p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {isId ? "Total Saldo Portofolio" : "Total Portfolio Balance"}
              </p>
              <p
                className="mt-1 font-heading text-2xl font-extrabold tracking-tight sm:text-3xl text-foreground"
                data-testid="accounts-modal-total-balance"
              >
                {formatMoney(totalBalance, state.baseCurrency, state.locale)}
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0 gap-1.5 px-3 py-1 font-semibold">
              <span className="size-2 rounded-full bg-emerald-400" />
              <span>
                {state.accounts.length} {isId ? "Akun" : "Accounts"}
              </span>
            </Badge>
          </div>
        </div>

        {/* Section Title */}
        <div className="flex items-center justify-between px-0.5">
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {isId ? "Daftar Akun Terdaftar" : "Registered Accounts"}
          </p>
          <span className="text-[11px] text-muted-foreground">
            {isId ? "Mata uang dasar:" : "Base currency:"} <strong className="text-foreground">{state.baseCurrency}</strong>
          </span>
        </div>

        {/* Accounts List or Empty State */}
        {sortedAccounts.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border/80 bg-secondary/20 p-8 text-center"
            data-testid="accounts-modal-empty-state"
          >
            <div className="grid size-12 place-items-center rounded-2xl bg-secondary text-muted-foreground">
              <WalletCards size={24} />
            </div>
            <p className="mt-3 text-sm font-bold">{isId ? "Belum ada akun aktif" : "No active accounts yet"}</p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground leading-relaxed">
              {isId
                ? "Tambahkan akun di dashboard Akun untuk mulai memantau saldo Anda."
                : "Add an account in the Accounts dashboard to begin monitoring your balances."}
            </p>
            <Button
              type="button"
              onClick={handleGoToAccounts}
              size="sm"
              className="mt-4 gap-1.5 text-xs font-bold"
            >
              {isId ? "Tambah Akun Baru" : "Add New Account"}
              <ArrowRight size={14} />
            </Button>
          </div>
        ) : (
          <div className="space-y-2" data-testid="accounts-modal-list">
            {sortedAccounts.map((account) => {
              const { icon: Icon, className: iconClass } = getAccountIconAndStyle(account.type);
              const isDifferentCurrency = account.currency !== state.baseCurrency;
              const baseEquivalent = isDifferentCurrency
                ? toBase(account.balance, account.currency, state.exchangeRates)
                : null;
              const typeLabel = isId
                ? ACCOUNT_TYPE_LABELS[account.type]?.id || account.type
                : ACCOUNT_TYPE_LABELS[account.type]?.en || account.type;

              return (
                <div
                  key={account.id}
                  data-testid={`accounts-modal-item-${account.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 p-3.5 transition-all hover:border-primary/40 hover:bg-secondary/40"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`grid size-10 shrink-0 place-items-center rounded-xl ${iconClass}`}>
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-bold text-foreground">{account.name}</p>
                        <Badge variant="outline" className="shrink-0 text-[10px] py-0 px-1.5">
                          {typeLabel}
                        </Badge>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {account.brand} · <span className="font-semibold">{account.currency}</span>
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p
                      className={`font-data text-sm font-extrabold ${
                        account.balance < 0 ? "text-red-400" : "text-foreground"
                      }`}
                    >
                      {formatMoney(account.balance, account.currency, state.locale)}
                    </p>
                    {baseEquivalent !== null && (
                      <p className="text-[10px] text-muted-foreground">
                        ≈ {formatMoney(baseEquivalent, state.baseCurrency, state.locale, true)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
