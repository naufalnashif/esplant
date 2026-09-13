import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Landmark,
  Pencil,
  Plus,
  Trash2,
  CreditCard,
  History,
} from "lucide-react";
import { useMemo, useState } from "react";
import type * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/formatters";
import type { Bill, CommitmentType, Debt, FinanceState } from "@/lib/localDb";
import { DEFAULT_CATEGORIES } from "@/lib/localDb";
import { applyCommitmentPayment, isPaidInMonth, type CommitmentPaymentInput } from "@/lib/commitmentPayment";
import { PayCommitmentDialog, type PayCommitmentTarget } from "@/components/PayCommitmentDialog";

export function CommitmentsPanel({
  state,
  onSave,
}: {
  state: FinanceState;
  onSave: (next: FinanceState) => void;
}) {
  const BILL_PREVIEW_COUNT = 5;
  const DEBT_PREVIEW_COUNT = 5;
  const isId = state.locale === "id";

  const [bill, setBill] = useState({
    name: "",
    category: "Utilities",
    amount: "",
    frequency: "monthly" as Bill["frequency"],
    nextDueDate: new Date().toISOString().slice(0, 10),
    remainingInstallments: "",
  });

  const [debt, setDebt] = useState({
    name: "",
    person: "",
    type: "debt" as CommitmentType,
    total: "",
    dueDate: new Date().toISOString().slice(0, 10),
  });

  const [showArchivedBills, setShowArchivedBills] = useState(false);
  const [showAllBills, setShowAllBills] = useState(false);
  const [showAllDebts, setShowAllDebts] = useState(false);

  // Mobile expand state — like TransactionsPanel
  const [expandedBillId, setExpandedBillId] = useState<string | null>(null);
  const [expandedDebtId, setExpandedDebtId] = useState<string | null>(null);

  const [payTarget, setPayTarget] = useState<PayCommitmentTarget | null>(null);

  const thisMonth = new Date().toISOString().slice(0, 7);

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...DEFAULT_CATEGORIES,
          ...state.categories.filter((item) => !item.archived).map((item) => item.name),
          ...state.transactions.map((item) => item.category).filter(Boolean),
        ]),
      ),
    [state.categories, state.transactions],
  );

  const activeBills = state.bills.filter(
    (b) => b.active !== false && (b.remainingInstallments === undefined || b.remainingInstallments > 0),
  );
  const completedBills = state.bills.filter(
    (b) => b.active === false || (b.remainingInstallments !== undefined && b.remainingInstallments <= 0),
  );

  // Bills paid this month: visually dim, sorted to the bottom
  const paidThisMonthBills = activeBills.filter((b) => isPaidInMonth(b.lastPaidDate, thisMonth));
  const unpaidActiveBills = activeBills.filter((b) => !isPaidInMonth(b.lastPaidDate, thisMonth));

  // Sort each group by due date ascending
  const sortByDue = (a: Bill, b: Bill) => a.nextDueDate.localeCompare(b.nextDueDate);
  const sortedActiveBills = [
    ...unpaidActiveBills.sort(sortByDue),
    ...paidThisMonthBills.sort(sortByDue),
  ];

  const displayedBills = showArchivedBills
    ? [...state.bills].sort(sortByDue)
    : sortedActiveBills;
  const hasMoreBills = displayedBills.length > BILL_PREVIEW_COUNT;
  const visibleBills = showAllBills ? displayedBills : displayedBills.slice(0, BILL_PREVIEW_COUNT);
  const hasMoreDebts = state.debts.length > DEBT_PREVIEW_COUNT;
  const visibleDebts = showAllDebts ? state.debts : state.debts.slice(0, DEBT_PREVIEW_COUNT);

  const totalDebt = state.debts
    .filter((d) => d.type === "debt")
    .reduce((sum, d) => sum + Math.max(0, d.total - d.paid), 0);
  const totalReceivables = state.debts
    .filter((d) => d.type === "receivable")
    .reduce((sum, d) => sum + Math.max(0, d.total - d.paid), 0);
  // KPI: only count bills NOT yet paid this month
  const totalBillsThisMonth = unpaidActiveBills.reduce((sum, b) => sum + b.amount, 0);
  const netObligations = totalDebt + totalBillsThisMonth - totalReceivables;

  const addBill = (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(bill.amount);
    if (!bill.name.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error(isId ? "Isi nama dan nominal tagihan yang valid." : "Invalid name or amount.");
      return;
    }
    const rem = bill.remainingInstallments.trim() ? Number(bill.remainingInstallments) : undefined;
    const next: Bill = {
      id: `bill-${Date.now()}`,
      name: bill.name.trim(),
      category: bill.category,
      amount,
      currency: state.baseCurrency,
      frequency: bill.frequency,
      nextDueDate: bill.nextDueDate,
      remainingInstallments: rem,
      active: true,
    };
    onSave({ ...state, bills: [next, ...state.bills] });
    setBill({ name: "", category: "Utilities", amount: "", frequency: "monthly", nextDueDate: new Date().toISOString().slice(0, 10), remainingInstallments: "" });
    toast.success(isId ? rem ? `Cicilan "${next.name}" (${rem}x) ditambahkan.` : `Tagihan rutin "${next.name}" ditambahkan.` : `Bill "${next.name}" created.`);
  };

  const openBillPayment = (item: Bill) => {
    if (state.accounts.length === 0) {
      toast.error(isId ? "Tambahkan akun terlebih dahulu di tab Akun & saldo." : "Add an account first.");
      return;
    }
    const rem = item.remainingInstallments;
    setPayTarget({
      kind: "bill",
      id: item.id,
      name: item.name,
      category: item.category,
      amount: item.amount,
      currency: item.currency,
      direction: "expense",
      lastPaidDate: item.lastPaidDate,
      subtitle:
        rem === undefined
          ? isId ? `Tagihan rutin · jatuh tempo ${item.nextDueDate}` : `Recurring bill · due ${item.nextDueDate}`
          : isId ? `Sisa ${rem}x cicilan · jatuh tempo ${item.nextDueDate}` : `${rem} installments left · due ${item.nextDueDate}`,
    });
  };

  const openDebtPayment = (item: Debt) => {
    if (state.accounts.length === 0) {
      toast.error(isId ? "Tambahkan akun terlebih dahulu di tab Akun & saldo." : "Add an account first.");
      return;
    }
    const remaining = Math.max(0, item.total - item.paid);
    if (remaining <= 0) {
      toast.error(isId ? "Komitmen ini sudah lunas." : "This commitment is already settled.");
      return;
    }
    const collecting = item.type === "receivable";
    setPayTarget({
      kind: "debt",
      id: item.id,
      name: item.name,
      category: "",
      amount: remaining,
      maxAmount: remaining,
      currency: item.currency,
      direction: collecting ? "income" : "expense",
      lastPaidDate: item.lastPaidDate,
      subtitle: isId
        ? `${collecting ? "Piutang dari" : "Utang ke"} ${item.person} · sisa ${formatMoney(remaining, item.currency, state.locale)}`
        : `${collecting ? "Receivable from" : "Debt to"} ${item.person} · ${formatMoney(remaining, item.currency, state.locale)} left`,
    });
  };

  const confirmPayment = (input: CommitmentPaymentInput): boolean => {
    const result = applyCommitmentPayment(state, input, { id: isId });
    if (!result.ok) { toast.error(result.error); return false; }
    onSave(result.state);
    toast.success(result.message);
    return true;
  };

  const addDebt = (event: React.FormEvent) => {
    event.preventDefault();
    const total = Number(debt.total);
    if (!debt.name.trim() || !debt.person.trim() || !Number.isFinite(total) || total <= 0) return;
    const next: Debt = {
      id: `debt-${Date.now()}`,
      name: debt.name.trim(),
      person: debt.person.trim(),
      type: debt.type,
      total,
      paid: 0,
      currency: state.baseCurrency,
      dueDate: debt.dueDate,
      note: "",
    };
    onSave({ ...state, debts: [next, ...state.debts] });
    setDebt({ name: "", person: "", type: "debt", total: "", dueDate: new Date().toISOString().slice(0, 10) });
    toast.success(isId ? "Komitmen utang/piutang ditambahkan." : "Debt or receivable created.");
  };

  const editBill = (item: Bill) => {
    const value = Number(window.prompt(isId ? `Nominal baru untuk ${item.name}` : `New amount for ${item.name}`, String(item.amount)));
    if (!Number.isFinite(value) || value <= 0) return;
    onSave({ ...state, bills: state.bills.map((b) => b.id === item.id ? { ...b, amount: value } : b) });
    toast.success(isId ? "Tagihan diperbarui." : "Bill updated.");
  };

  const editDebt = (item: Debt) => {
    const value = Number(window.prompt(isId ? `Total baru untuk ${item.name}` : `New total for ${item.name}`, String(item.total)));
    if (!Number.isFinite(value) || value <= 0) return;
    onSave({ ...state, debts: state.debts.map((d) => d.id === item.id ? { ...d, total: value, paid: Math.min(d.paid, value) } : d) });
    toast.success(isId ? "Utang/piutang diperbarui." : "Debt updated.");
  };

  const remove = (kind: "bill" | "debt", id: string) => {
    if (!window.confirm(isId ? `Hapus ${kind === "bill" ? "tagihan" : "utang/piutang"} ini?` : `Delete this ${kind}?`)) return;
    onSave({
      ...state,
      bills: kind === "bill" ? state.bills.filter((item) => item.id !== id) : state.bills,
      debts: kind === "debt" ? state.debts.filter((item) => item.id !== id) : state.debts,
    });
    toast.success(isId ? "Berhasil dihapus." : `${kind} deleted.`);
  };

  return (
    <div className="animate-rise-in space-y-6">
      {/* Header */}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Obligations & Commitments</p>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
          {isId ? "Utang & Cicilan" : "Bills & Debt"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          {isId
            ? "Kelola tagihan rutin, sisa kali cicilan, utang, dan piutang dalam satu dashboard."
            : "Track recurring bills, remaining installment counts, debt, and receivables."}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" data-testid="debt-dashboard">
        {[
          {
            icon: <ArrowUpRight size={18} />,
            iconClass: "bg-red-500/12 text-red-400",
            badge: isId ? "Harus Dibayar" : "Owed",
            badgeClass: "border-red-500/20 text-red-400",
            label: isId ? "Total Utang Saya" : "Total Debt Owed",
            value: formatMoney(totalDebt, state.baseCurrency, state.locale, true),
            valueClass: "text-red-400",
            note: `${state.debts.filter((d) => d.type === "debt").length} ${isId ? "catatan utang" : "debt records"}`,
            testid: "kpi-total-debt",
          },
          {
            icon: <ArrowDownLeft size={18} />,
            iconClass: "bg-emerald-500/12 text-emerald-400",
            badge: isId ? "Akan Diterima" : "Receivable",
            badgeClass: "border-emerald-500/20 text-emerald-400",
            label: isId ? "Total Piutang Saya" : "Total Receivables",
            value: formatMoney(totalReceivables, state.baseCurrency, state.locale, true),
            valueClass: "text-emerald-400",
            note: `${state.debts.filter((d) => d.type === "receivable").length} ${isId ? "catatan piutang" : "receivable records"}`,
            testid: "kpi-total-receivables",
          },
          {
            icon: <CalendarClock size={18} />,
            iconClass: "bg-amber-500/12 text-amber-400",
            badge: isId ? "Rutin & Cicilan" : "Recurring",
            badgeClass: "border-amber-500/20 text-amber-400",
            label: isId ? "Cicilan/Tagihan Aktif" : "Active Bills Due",
            value: formatMoney(totalBillsThisMonth, state.baseCurrency, state.locale, true),
            valueClass: "text-amber-400",
            note: `${activeBills.length} ${isId ? "tagihan/cicilan berjalan" : "active bills"}`,
            testid: "kpi-total-bills",
          },
          {
            icon: <Landmark size={18} />,
            iconClass: "bg-indigo-500/12 text-indigo-400",
            badge: isId ? "Net Berjalan" : "Net Pending",
            badgeClass: "border-indigo-500/20 text-indigo-400",
            label: isId ? "Total Tanggungan Net" : "Net Obligations",
            value: formatMoney(netObligations, state.baseCurrency, state.locale, true),
            valueClass: "text-foreground",
            note: isId ? "Utang + Tagihan − Piutang" : "Debt + Bills − Receivables",
            testid: "kpi-net-obligations",
          },
        ].map((card) => (
          <Card key={card.testid} className="min-w-0 border-border/70 bg-card/75 p-4 shadow-sm backdrop-blur-xl sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className={`grid size-9 place-items-center rounded-xl ${card.iconClass}`}>{card.icon}</div>
              <Badge variant="outline" className={`text-[10px] ${card.badgeClass}`}>{card.badge}</Badge>
            </div>
            <p className="text-xs font-semibold text-muted-foreground">{card.label}</p>
            <p className={`mt-1 truncate font-data text-lg font-bold tracking-tight sm:text-xl ${card.valueClass}`} data-testid={card.testid}>
              {card.value}
            </p>
            <p className="mt-1.5 text-[11px] text-muted-foreground">{card.note}</p>
          </Card>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 xl:grid-cols-2">

        {/* ── Bills & Installments ── */}
        <section className="rounded-2xl border border-border/70 bg-card/75 shadow-sm">
          {/* Section Header */}
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <h2 className="font-heading text-base font-bold sm:text-lg">
                {isId ? "Tagihan Rutin & Cicilan" : "Recurring Bills & Installments"}
              </h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {isId ? "Otomatis selesai ketika sisa cicilan habis" : "Auto-completes when remaining count hits 0"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {completedBills.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowArchivedBills(!showArchivedBills)}
                  className="flex items-center gap-1.5 rounded-lg border border-border/60 px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
                >
                  <History size={12} />
                  {showArchivedBills ? (isId ? "Sembunyikan" : "Hide") : `+${completedBills.length}`}
                </button>
              )}
              <Badge variant="secondary" className="shrink-0">{activeBills.length}</Badge>
            </div>
          </div>

          <div className="p-3 sm:p-4">
            {/* ── Mobile: tap-to-expand cards ── */}
            <div className="space-y-2 md:hidden">
              {visibleBills.map((item) => {
                const isFinished = item.active === false || (item.remainingInstallments !== undefined && item.remainingInstallments <= 0);
                const open = expandedBillId === item.id;
                const paidThisMonth = isPaidInMonth(item.lastPaidDate, thisMonth) && !isFinished;

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border transition-colors ${
                      isFinished
                        ? "border-dashed border-border/40 bg-muted/15 opacity-50"
                        : paidThisMonth
                          ? "border-dashed border-border/40 bg-muted/20 opacity-60"
                          : "border-border/60 bg-background/40"
                    }`}
                  >
                    {/* Collapsed row — always visible */}
                    <button
                      type="button"
                      onClick={() => setExpandedBillId(open ? null : item.id)}
                      aria-expanded={open}
                      className="flex w-full items-center gap-3 p-3 text-left"
                    >
                      <div className={`grid size-8 shrink-0 place-items-center rounded-lg ${
                        isFinished ? "bg-secondary text-muted-foreground"
                        : paidThisMonth ? "bg-secondary/70 text-muted-foreground"
                        : "bg-amber-500/12 text-amber-400"
                      }`}>
                        <CreditCard size={14} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold leading-tight">{item.name}</p>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {isId ? "Jatuh Tempo" : "Due"}: {item.nextDueDate}
                          {item.remainingInstallments !== undefined && !isFinished && ` · ${item.remainingInstallments}x`}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-data text-[13px] font-bold">{formatMoney(item.amount, item.currency, state.locale)}</p>
                        {paidThisMonth && (
                          <p className="text-[10px] font-semibold text-emerald-400">{isId ? "✓ Sudah dibayar" : "✓ Paid"}</p>
                        )}
                        {isFinished && (
                          <p className="text-[10px] font-semibold text-emerald-400">{isId ? "🎉 Lunas" : "Done"}</p>
                        )}
                      </div>
                      <ChevronDown size={14} className={`shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
                    </button>

                    {/* Expanded detail */}
                    {open && (
                      <div className="border-t border-border/50 px-3 py-3 space-y-3">
                        {/* Meta info */}
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                          {item.remainingInstallments !== undefined && (
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold ${isFinished ? "border-emerald-500/30 text-emerald-400" : "border-amber-500/30 text-amber-400"}`}
                            >
                              {isFinished
                                ? (isId ? "🎉 LUNAS" : "COMPLETED")
                                : (isId ? `Sisa ${item.remainingInstallments}x lagi` : `${item.remainingInstallments}x left`)}
                            </Badge>
                          )}
                          {paidThisMonth && (
                            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/5 text-[10px] font-bold text-emerald-400">
                              {isId ? "Sudah dibayar bulan ini" : "Paid this month"}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-[10px] text-muted-foreground">
                            {item.frequency === "monthly" ? (isId ? "Bulanan" : "Monthly") : (isId ? "Mingguan" : "Weekly")}
                          </Badge>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2">
                          {!isFinished && (
                            <button
                              type="button"
                              data-testid={`bill-pay-installment-${item.id}-button`}
                              onClick={() => { openBillPayment(item); setExpandedBillId(null); }}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20"
                            >
                              <CheckCircle2 size={13} />
                              {isId ? "Bayar 1x Cicilan" : "Pay 1x Installment"}
                            </button>
                          )}
                          <button
                            type="button"
                            data-testid={`bill-edit-crud-${item.id}-button`}
                            onClick={() => editBill(item)}
                            className="grid size-9 place-items-center rounded-xl border border-border/60 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            data-testid={`bill-delete-crud-${item.id}-button`}
                            onClick={() => remove("bill", item.id)}
                            className="grid size-9 place-items-center rounded-xl border border-border/60 text-muted-foreground hover:bg-red-400/10 hover:text-red-400"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {displayedBills.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {isId ? "Belum ada tagihan rutin atau cicilan aktif." : "No active recurring bills or installments."}
                </p>
              )}

              {hasMoreBills && (
                <button
                  type="button"
                  data-testid="bills-toggle-show-all"
                  onClick={() => setShowAllBills((v) => !v)}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/35 text-xs font-bold text-primary transition-colors hover:bg-primary/5"
                >
                  {showAllBills
                    ? <><ChevronUp size={14} />{isId ? "Tampilkan lebih sedikit" : "Show less"}</>
                    : <><ChevronDown size={14} />{isId ? `Lihat semua (${displayedBills.length})` : `Show all (${displayedBills.length})`}</>}
                </button>
              )}
            </div>

            {/* ── Desktop/tablet: clean row list ── */}
            <div className="hidden space-y-2 md:block">
              {visibleBills.map((item) => {
                const isFinished = item.active === false || (item.remainingInstallments !== undefined && item.remainingInstallments <= 0);
                const paidThisMonth = isPaidInMonth(item.lastPaidDate, thisMonth) && !isFinished;

                return (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                      isFinished
                        ? "border-dashed border-border/40 bg-muted/15 opacity-50"
                        : paidThisMonth
                          ? "border-dashed border-border/40 bg-muted/20 opacity-55"
                          : "border-border/60 bg-background/35 hover:border-border/90 hover:bg-background/60"
                    }`}
                  >
                    <div className={`grid size-9 shrink-0 place-items-center rounded-lg ${
                      isFinished ? "bg-secondary text-muted-foreground"
                      : paidThisMonth ? "bg-secondary/70 text-muted-foreground"
                      : "bg-amber-500/12 text-amber-400"
                    }`}>
                      <CreditCard size={15} />
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="truncate text-sm font-semibold">{item.name}</p>
                        {item.remainingInstallments !== undefined && (
                          <Badge variant="outline" className={`text-[9px] font-bold ${isFinished ? "border-emerald-500/30 text-emerald-400" : "border-amber-500/30 text-amber-400"}`}>
                            {isFinished ? (isId ? "🎉 LUNAS" : "DONE") : (isId ? `${item.remainingInstallments}x lagi` : `${item.remainingInstallments}x left`)}
                          </Badge>
                        )}
                        {paidThisMonth && (
                          <Badge variant="outline" className="border-emerald-500/30 text-[9px] font-bold text-emerald-400">
                            {isId ? "✓ Dibayar bln ini" : "✓ Paid this month"}
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {item.category} · {isId ? "Jatuh tempo" : "Due"}: {item.nextDueDate}
                        {item.remainingInstallments === undefined && ` · ${isId ? "Tagihan Bulanan Rutin" : "Monthly Recurring"}`}
                      </p>
                    </div>

                    {/* Amount */}
                    <div className="shrink-0 text-right">
                      <p className="font-data text-sm font-bold">{formatMoney(item.amount, item.currency, state.locale)}</p>
                      <p className="text-[10px] text-muted-foreground">{isId ? "per bulan" : "per month"}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-1">
                      {!isFinished && (
                        <button
                          type="button"
                          data-testid={`bill-pay-installment-${item.id}-button`}
                          onClick={() => openBillPayment(item)}
                          title={isId ? "Bayar 1x Cicilan" : "Pay 1x Installment"}
                          className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20"
                        >
                          <CheckCircle2 size={12} />
                          {isId ? "Bayar" : "Pay"}
                        </button>
                      )}
                      <button
                        type="button"
                        data-testid={`bill-edit-crud-${item.id}-button`}
                        onClick={() => editBill(item)}
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        data-testid={`bill-delete-crud-${item.id}-button`}
                        onClick={() => remove("bill", item.id)}
                        className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-red-400/10 hover:text-red-400"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}

              {displayedBills.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {isId ? "Belum ada tagihan rutin atau cicilan aktif." : "No active recurring bills or installments."}
                </p>
              )}

              {hasMoreBills && (
                <button
                  type="button"
                  data-testid="bills-toggle-show-all"
                  onClick={() => setShowAllBills((v) => !v)}
                  className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/35 text-xs font-bold text-primary transition-colors hover:bg-primary/5"
                >
                  {showAllBills
                    ? <><ChevronUp size={14} />{isId ? "Tampilkan lebih sedikit" : "Show less"}</>
                    : <><ChevronDown size={14} />{isId ? `Lihat semua (${displayedBills.length})` : `Show all (${displayedBills.length})`}</>}
                </button>
              )}
            </div>
          </div>

          {/* Add Bill Form */}
          <div className="border-t border-border/60 px-4 py-4 sm:px-6">
            <form onSubmit={addBill} className="grid gap-2.5 sm:grid-cols-2">
              <p className="text-xs font-bold text-primary sm:col-span-2">
                {isId ? "+ Tambah Tagihan / Cicilan Baru" : "+ Add New Bill or Installment"}
              </p>
              <input
                data-testid="bill-name-input"
                required
                value={bill.name}
                onChange={(e) => setBill((v) => ({ ...v, name: e.target.value }))}
                placeholder={isId ? "Nama tagihan/cicilan" : "Bill / Installment name"}
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
              <input
                data-testid="bill-amount-input"
                required
                type="number"
                min="1"
                value={bill.amount}
                onChange={(e) => setBill((v) => ({ ...v, amount: e.target.value }))}
                placeholder={isId ? "Nominal per bulan" : "Amount per month"}
                className="h-10 rounded-lg border border-border bg-background px-3 font-data text-sm outline-none focus:border-primary"
              />
              <input
                data-testid="bill-date-input"
                required
                type="date"
                value={bill.nextDueDate}
                onChange={(e) => setBill((v) => ({ ...v, nextDueDate: e.target.value }))}
                className="h-10 rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-primary"
              />
              <input
                data-testid="bill-installments-input"
                type="number"
                min="1"
                value={bill.remainingInstallments}
                onChange={(e) => setBill((v) => ({ ...v, remainingInstallments: e.target.value }))}
                placeholder={isId ? "Sisa bulan cicilan (opsional)" : "Remaining months (optional)"}
                className="h-10 rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-primary"
              />
              <p className="text-[10px] italic text-muted-foreground sm:col-span-2">
                * {isId ? "Isi jumlah sisa cicilan (misal: 4). Setelah 4x dibayar, cicilan otomatis lunas." : "Specify remaining installments (e.g. 4). Auto-expires when completed."}
              </p>
              <div className="sm:col-span-2">
                <Button data-testid="bill-create-button" type="submit" className="w-full gap-2">
                  <Plus size={14} />
                  {isId ? "Simpan Cicilan / Tagihan" : "Save Bill / Installment"}
                </Button>
              </div>
            </form>
          </div>
        </section>

        {/* ── Debts & Receivables ── */}
        <section className="rounded-2xl border border-border/70 bg-card/75 shadow-sm">
          {/* Section Header */}
          <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-4 sm:px-6">
            <div className="min-w-0">
              <h2 className="font-heading text-base font-bold sm:text-lg">
                {isId ? "Utang & Piutang" : "Debt & Receivables"}
              </h2>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {isId ? "Catat pinjaman dengan teman, bank, atau keluarga" : "Track money owed or borrowed"}
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0">{state.debts.length}</Badge>
          </div>

          <div className="p-3 sm:p-4">
            {/* ── Mobile: tap-to-expand ── */}
            <div className="space-y-2 md:hidden">
              {visibleDebts.map((item) => {
                const remaining = Math.max(0, item.total - item.paid);
                const progress = item.total ? Math.min(100, Math.round((item.paid / item.total) * 100)) : 0;
                const isFinished = remaining === 0;
                const open = expandedDebtId === item.id;

                return (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-border/60 bg-background/40"
                  >
                    {/* Collapsed row */}
                    <button
                      type="button"
                      onClick={() => setExpandedDebtId(open ? null : item.id)}
                      aria-expanded={open}
                      className="flex w-full items-center gap-3 p-3 text-left"
                    >
                      <div className={`grid size-8 shrink-0 place-items-center rounded-lg ${item.type === "debt" ? "bg-red-500/12 text-red-400" : "bg-emerald-500/12 text-emerald-400"}`}>
                        {item.type === "debt" ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold leading-tight">{item.name}</p>
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {item.person} · {progress}%
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`font-data text-[13px] font-bold ${item.type === "debt" ? "text-red-400" : "text-emerald-400"}`}>
                          {formatMoney(remaining, item.currency, state.locale)}
                        </p>
                        {isFinished && <p className="text-[10px] font-semibold text-emerald-400">{isId ? "🎉 Lunas" : "Settled"}</p>}
                      </div>
                      <ChevronDown size={14} className={`shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
                    </button>

                    {/* Progress bar — always visible */}
                    <div className="mx-3 h-1 overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full transition-all ${item.type === "debt" ? "bg-red-400" : "bg-emerald-400"}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    {/* Expanded detail */}
                    {open && (
                      <div className="border-t border-border/50 px-3 py-3 mt-2 space-y-3">
                        <div className="flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
                          <Badge variant="outline" className={`text-[10px] ${item.type === "debt" ? "text-red-400 border-red-500/30" : "text-emerald-400 border-emerald-500/30"}`}>
                            {item.type === "debt" ? (isId ? "Saya Berutang" : "I Owe") : (isId ? "Piutang Saya" : "Receivable")}
                          </Badge>
                          <span className="rounded-md border border-border/50 px-2 py-0.5">
                            {isId ? "Jatuh tempo" : "Due"}: {item.dueDate}
                          </span>
                          <span className="rounded-md border border-border/50 px-2 py-0.5">
                            {isId ? "Total" : "Total"}: {formatMoney(item.total, item.currency, state.locale)}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {!isFinished && (
                            <button
                              type="button"
                              data-testid={`debt-pay-${item.id}-button`}
                              onClick={() => { openDebtPayment(item); setExpandedDebtId(null); }}
                              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500/10 px-3 py-2.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20"
                            >
                              <CheckCircle2 size={13} />
                              {isId ? "Catat Pembayaran" : "Record Payment"}
                            </button>
                          )}
                          <button
                            type="button"
                            data-testid={`debt-edit-crud-${item.id}-button`}
                            onClick={() => editDebt(item)}
                            className="grid size-9 place-items-center rounded-xl border border-border/60 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            data-testid={`debt-delete-crud-${item.id}-button`}
                            onClick={() => remove("debt", item.id)}
                            className="grid size-9 place-items-center rounded-xl border border-border/60 text-muted-foreground hover:bg-red-400/10 hover:text-red-400"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                    {/* Bottom spacing for progress bar */}
                    <div className="h-3" />
                  </div>
                );
              })}

              {state.debts.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {isId ? "Belum ada catatan utang atau piutang." : "No debts or receivables recorded."}
                </p>
              )}

              {hasMoreDebts && (
                <button
                  type="button"
                  data-testid="debts-toggle-show-all"
                  onClick={() => setShowAllDebts((v) => !v)}
                  className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/35 text-xs font-bold text-primary transition-colors hover:bg-primary/5"
                >
                  {showAllDebts
                    ? <><ChevronUp size={14} />{isId ? "Tampilkan lebih sedikit" : "Show less"}</>
                    : <><ChevronDown size={14} />{isId ? `Lihat semua (${state.debts.length})` : `Show all (${state.debts.length})`}</>}
                </button>
              )}
            </div>

            {/* ── Desktop: clean row list ── */}
            <div className="hidden space-y-2 md:block">
              {visibleDebts.map((item) => {
                const remaining = Math.max(0, item.total - item.paid);
                const progress = item.total ? Math.min(100, Math.round((item.paid / item.total) * 100)) : 0;
                const isFinished = remaining === 0;

                return (
                  <div key={item.id} className="rounded-xl border border-border/60 bg-background/35 p-3 space-y-2">
                    <div className="flex items-center gap-3">
                      <div className={`grid size-9 shrink-0 place-items-center rounded-lg ${item.type === "debt" ? "bg-red-500/12 text-red-400" : "bg-emerald-500/12 text-emerald-400"}`}>
                        {item.type === "debt" ? <ArrowUpRight size={15} /> : <ArrowDownLeft size={15} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <p className="truncate text-sm font-semibold">{item.name}</p>
                          <Badge variant="outline" className={`text-[9px] ${item.type === "debt" ? "text-red-400 border-red-500/30" : "text-emerald-400 border-emerald-500/30"}`}>
                            {item.type === "debt" ? (isId ? "Saya Berutang" : "Debt") : (isId ? "Piutang Saya" : "Receivable")}
                          </Badge>
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {item.person} · {isId ? "Jatuh tempo" : "Due"}: {item.dueDate}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-data text-sm font-bold">{formatMoney(remaining, item.currency, state.locale)}</p>
                        <p className="text-[10px] text-muted-foreground">{isId ? "sisa dari" : "left of"} {formatMoney(item.total, item.currency, state.locale, true)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {!isFinished && (
                          <button
                            type="button"
                            data-testid={`debt-pay-${item.id}-button`}
                            onClick={() => openDebtPayment(item)}
                            className="grid size-8 place-items-center rounded-lg text-emerald-400 hover:bg-emerald-500/10"
                          >
                            <CheckCircle2 size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          data-testid={`debt-edit-crud-${item.id}-button`}
                          onClick={() => editDebt(item)}
                          className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          data-testid={`debt-delete-crud-${item.id}-button`}
                          onClick={() => remove("debt", item.id)}
                          className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-red-400/10 hover:text-red-400"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className={`h-full rounded-full transition-all ${item.type === "debt" ? "bg-red-400" : "bg-emerald-400"}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {state.debts.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  {isId ? "Belum ada catatan utang atau piutang." : "No debts or receivables recorded."}
                </p>
              )}

              {hasMoreDebts && (
                <button
                  type="button"
                  data-testid="debts-toggle-show-all"
                  onClick={() => setShowAllDebts((v) => !v)}
                  className="flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/35 text-xs font-bold text-primary transition-colors hover:bg-primary/5"
                >
                  {showAllDebts
                    ? <><ChevronUp size={14} />{isId ? "Tampilkan lebih sedikit" : "Show less"}</>
                    : <><ChevronDown size={14} />{isId ? `Lihat semua (${state.debts.length})` : `Show all (${state.debts.length})`}</>}
                </button>
              )}
            </div>
          </div>

          {/* Add Debt Form */}
          <div className="border-t border-border/60 px-4 py-4 sm:px-6">
            <form onSubmit={addDebt} className="grid gap-2.5 sm:grid-cols-2">
              <p className="text-xs font-bold text-primary sm:col-span-2">
                {isId ? "+ Tambah Catatan Utang / Piutang" : "+ Add Debt or Receivable"}
              </p>
              <input
                data-testid="commitment-name-input"
                required
                value={debt.name}
                onChange={(e) => setDebt((v) => ({ ...v, name: e.target.value }))}
                placeholder={isId ? "Keterangan (misal: Pinjam Modal)" : "Name"}
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
              <input
                data-testid="commitment-person-input"
                required
                value={debt.person}
                onChange={(e) => setDebt((v) => ({ ...v, person: e.target.value }))}
                placeholder={isId ? "Nama orang/lembaga" : "Person / Lender"}
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
              <select
                data-testid="commitment-type-select"
                value={debt.type}
                onChange={(e) => setDebt((v) => ({ ...v, type: e.target.value as CommitmentType }))}
                className="h-10 rounded-lg border border-border bg-background px-3 text-xs font-semibold"
              >
                <option value="debt">{isId ? "Utang Saya" : "I Owe (Debt)"}</option>
                <option value="receivable">{isId ? "Piutang (Dia Utang)" : "Receivable"}</option>
              </select>
              <input
                data-testid="commitment-total-input"
                required
                type="number"
                min="1"
                value={debt.total}
                onChange={(e) => setDebt((v) => ({ ...v, total: e.target.value }))}
                placeholder={isId ? "Total nominal" : "Total amount"}
                className="h-10 rounded-lg border border-border bg-background px-3 font-data text-sm outline-none focus:border-primary"
              />
              <div className="sm:col-span-2">
                <Button data-testid="commitment-create-button" type="submit" className="w-full gap-2">
                  <Plus size={14} />
                  {isId ? "Tambah Catatan" : "Create"}
                </Button>
              </div>
            </form>
          </div>
        </section>
      </div>

      {payTarget && (
        <PayCommitmentDialog
          state={state}
          target={payTarget}
          categories={categoryOptions}
          onClose={() => setPayTarget(null)}
          onConfirm={confirmPayment}
        />
      )}
    </div>
  );
}