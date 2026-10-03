import React from "react";
import { ShieldCheck, Target, WalletCards } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/formatters";
import type { FinanceState } from "@/lib/localDb";

export interface HeroBalanceWidgetProps {
  state: FinanceState;
  totalBalance: number;
  totalSavings: number;
  locale: FinanceState["locale"];
  baseCurrency: FinanceState["baseCurrency"];
  onOpenAccounts: () => void;
  onNavigateToGoals?: () => void;
  labelTotalBalance?: string;
}

export const HeroBalanceWidget: React.FC<HeroBalanceWidgetProps> = ({
  state,
  totalBalance,
  totalSavings,
  locale,
  baseCurrency,
  onOpenAccounts,
  onNavigateToGoals,
  labelTotalBalance = "Total saldo",
}) => {
  const isId = locale === "id";

  return (
    <Card
      data-testid="hero-balance-widget"
      className="relative h-full flex flex-col justify-between min-h-[200px] sm:min-h-[218px] overflow-hidden border border-amber-500/20 bg-white p-5 sm:p-7 text-slate-900 shadow-soft dark:border-primary/20 dark:bg-gradient-to-br dark:from-[#303030] dark:via-[#262626] dark:to-[#1c1c1c] dark:text-white dark:shadow-xl dark:shadow-primary/10"
    >
      <div className="absolute -right-20 -top-24 size-72 rounded-full border-[30px] border-amber-500/10 pointer-events-none dark:border-white/8" />
      <div className="absolute -bottom-28 right-24 size-56 rounded-full border-[18px] border-amber-500/8 pointer-events-none dark:border-white/6" />
      <div className="absolute -right-16 -top-16 size-60 rounded-full bg-gradient-to-bl from-amber-500/12 via-amber-500/4 to-transparent blur-2xl pointer-events-none dark:hidden" />

      <div className="relative flex h-full flex-1 flex-col justify-between">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-white/65">
              {labelTotalBalance} · {baseCurrency}
            </p>
            <p
              className="mt-2.5 sm:mt-3 font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white"
              data-testid="total-balance-value"
            >
              {formatMoney(totalBalance, baseCurrency, locale)}
            </p>
          </div>
          <button
            type="button"
            data-testid="total-balance-accounts-trigger"
            onClick={onOpenAccounts}
            title={isId ? "Klik untuk melihat rincian akun aktif" : "Click to view active accounts breakdown"}
            aria-label={isId ? "Lihat rincian akun aktif" : "View active accounts breakdown"}
            className="group relative flex items-center justify-center rounded-xl border border-slate-200/80 bg-slate-50/80 p-2 sm:p-2.5 text-slate-700 shadow-xs transition-all duration-200 hover:scale-105 hover:border-amber-400 hover:bg-slate-100 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 cursor-pointer dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:border-white/40 dark:hover:bg-white/20 dark:focus-visible:ring-white/50"
          >
            <WalletCards size={18} className="transition-transform duration-200 group-hover:scale-110 sm:size-5" />
            <span className="sr-only">{isId ? "Lihat akun" : "View accounts"}</span>
          </button>
        </div>

        <div className="mt-6 sm:mt-8 flex flex-wrap items-center gap-3.5 sm:gap-5 text-[11px] sm:text-xs text-slate-600 dark:text-white/70">
          <button
            type="button"
            data-testid="active-accounts-count-trigger"
            onClick={onOpenAccounts}
            className="flex items-center gap-1.5 transition-colors hover:text-slate-900 cursor-pointer dark:hover:text-white"
            title={isId ? "Klik untuk melihat rincian akun" : "Click to view accounts breakdown"}
          >
            <span className="size-2 rounded-full bg-emerald-500 dark:bg-emerald-300" />{" "}
            {state.accounts.length} {isId ? "akun aktif" : "active accounts"}
          </button>
          {totalSavings > 0 && (
            <button
              type="button"
              data-testid="overview-total-savings-trigger"
              onClick={onNavigateToGoals}
              className="flex items-center gap-1.5 transition-colors hover:text-slate-900 cursor-pointer dark:hover:text-white"
              title={isId ? "Lihat tabungan di Goals" : "View savings in Goals"}
            >
              <Target size={14} className="text-teal-600 dark:text-teal-300" />
              <span>
                {isId ? "Tabungan" : "Saved"}: {formatMoney(totalSavings, baseCurrency, locale, true)}
              </span>
            </button>
          )}
          <span className="flex items-center gap-1.5">
            <ShieldCheck size={14} /> {isId ? "Tersinkron & Aman" : "Synchronized & Saved"}
          </span>
        </div>
      </div>
    </Card>
  );
};
