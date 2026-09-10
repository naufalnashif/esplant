import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  Landmark,
  Pencil,
  Plus,
  Trash2,
  CreditCard,
  History,
} from "lucide-react";
import { useState } from "react";
import type * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PaymentConfirmDialog, type PaymentDraft, type PaymentTarget } from "@/components/PaymentConfirmDialog";
import { formatMoney } from "@/lib/formatters";
import type { Bill, CommitmentType, Debt, FinanceState, Transaction } from "@/lib/localDb";

const PREVIEW = 4;

export function CommitmentsPanel({
  state,
  onSave,
}: {
  state: FinanceState;
  onSave: (next: FinanceState) => void;
}) {
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
  const [expandBills, setExpandBills] = useState(false);
  const [expandDebts, setExpandDebts] = useState(false);
  const [pendingBill, setPendingBill] = useState<Bill | null>(null);
  const [pendingDebt, setPendingDebt] = useState<Debt | null>(null);

  // Active bills: active === true and remainingInstallments is undefined or > 0
  const activeBills = state.bills.filter(
    (b) => b.active !== false && (b.remainingInstallments === undefined || b.remainingInstallments > 0)
  );

  const completedBills = state.bills.filter(
    (b) => b.active === false || (b.remainingInstallments !== undefined && b.remainingInstallments <= 0)
  );

  const displayedBills = showArchivedBills ? state.bills : activeBills;
  const visibleBills = expandBills ? displayedBills : displayedBills.slice(0, PREVIEW);
  const hiddenBills = displayedBills.length - visibleBills.length;
  const visibleDebts = expandDebts ? state.debts : state.debts.slice(0, PREVIEW);
  const hiddenDebts = state.debts.length - visibleDebts.length;

  // Calculate Metrics for Dashboard KPI Cards
  const totalDebt = state.debts
    .filter((d) => d.type === "debt")
    .reduce((sum, d) => sum + Math.max(0, d.total - d.paid), 0);

  const totalReceivables = state.debts
    .filter((d) => d.type === "receivable")
    .reduce((sum, d) => sum + Math.max(0, d.total - d.paid), 0);

  const totalBillsThisMonth = activeBills.reduce((sum, b) => sum + b.amount, 0);

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
    setBill({
      name: "",
      category: "Utilities",
      amount: "",
      frequency: "monthly",
      nextDueDate: new Date().toISOString().slice(0, 10),
      remainingInstallments: "",
    });
    toast.success(
      isId
        ? rem
          ? `Cicilan "${next.name}" (${rem}x) ditambahkan.`
          : `Tagihan rutin "${next.name}" ditambahkan.`
        : `Bill "${next.name}" created.`
    );
  };

  const payBillInstallment = (item: Bill, draft: PaymentDraft) => {
    const account = state.accounts.find((acc) => acc.id === draft.accountId);
    if (!account) {
      toast.error(isId ? "Tambahkan akun terlebih dahulu di tab Akun." : "Add an account first.");
      return;
    }

    const currentRem = item.remainingInstallments;
    const nextRem = currentRem !== undefined ? currentRem - 1 : undefined;
    const isCompleted = nextRem !== undefined && nextRem <= 0;

    // Advance due date by 1 month (or 1 week for weekly bills)
    const dueDateObj = new Date(`${item.nextDueDate}T00:00:00`);
    if (item.frequency === "weekly") dueDateObj.setDate(dueDateObj.getDate() + 7);
    else dueDateObj.setMonth(dueDateObj.getMonth() + 1);
    const nextDueDate = dueDateObj.toISOString().slice(0, 10);

    const baseAmount = draft.amount * (state.exchangeRates[item.currency] || 1);
    const newTx: Transaction = {
      id: `tx-bill-${Date.now()}`,
      kind: "expense",
      date: draft.date,
      description: draft.note || `Bayar ${item.name}${currentRem ? ` (sisa ${currentRem}x)` : ""}`,
      category: item.category,
      accountId: account.id,
      amount: draft.amount,
      currency: item.currency,
      baseAmount,
      tags: ["cicilan", "bill-payment"],
    };

    // Deduct from the chosen account, converted into that account's currency.
    const accounts = state.accounts.map((acc) =>
      acc.id === account.id
        ? { ...acc, balance: acc.balance - baseAmount / (state.exchangeRates[acc.currency] || 1) }
        : acc
    );

    const bills = state.bills.map((b) => {
      if (b.id !== item.id) return b;
      if (isCompleted) {
        return { ...b, remainingInstallments: 0, active: false };
      }
      return { ...b, remainingInstallments: nextRem, nextDueDate };
    });

    onSave({
      ...state,
      accounts,
      bills,
      transactions: [newTx, ...state.transactions],
    });
    setPendingBill(null);

    if (isCompleted) {
      toast.success(
        isId
          ? `Cicilan "${item.name}" LUNAS. Pembayaran masuk riwayat transaksi.`
          : `Bill "${item.name}" fully paid and recorded in transactions.`
      );
    } else {
      toast.success(
        isId
          ? `Pembayaran "${item.name}" dicatat ke riwayat transaksi. Sisa: ${nextRem ?? "-"}x.`
          : `Payment recorded in transactions. Remaining: ${nextRem ?? "-"}x.`
      );
    }
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
    onSave({
      ...state,
      bills: state.bills.map((billItem) => (billItem.id === item.id ? { ...billItem, amount: value } : billItem)),
    });
    toast.success(isId ? "Tagihan diperbarui." : "Bill updated.");
  };

  const editDebt = (item: Debt) => {
    const value = Number(window.prompt(isId ? `Total baru untuk ${item.name}` : `New total for ${item.name}`, String(item.total)));
    if (!Number.isFinite(value) || value <= 0) return;
    onSave({
      ...state,
      debts: state.debts.map((debtItem) =>
        debtItem.id === item.id ? { ...debtItem, total: value, paid: Math.min(debtItem.paid, value) } : debtItem
      ),
    });
    toast.success(isId ? "Utang/piutang diperbarui." : "Debt updated.");
  };

  const recordDebtPayment = (item: Debt, draft: PaymentDraft) => {
    const account = state.accounts.find((acc) => acc.id === draft.accountId);
    if (!account) {
      toast.error(isId ? "Tambahkan akun terlebih dahulu di tab Akun." : "Add an account first.");
      return;
    }
    const remaining = Math.max(0, item.total - item.paid);
    const payAmount = Math.min(draft.amount, remaining);
    if (payAmount <= 0) return;

    const baseAmount = payAmount * (state.exchangeRates[item.currency] || 1);
    // Paying my debt = money out; collecting a receivable = money in.
    const kind: Transaction["kind"] = item.type === "debt" ? "expense" : "income";
    const sign = kind === "expense" ? -1 : 1;

    const newTx: Transaction = {
      id: `tx-debt-${Date.now()}`,
      kind,
      date: draft.date,
      description: draft.note || `${item.type === "debt" ? "Bayar utang" : "Terima piutang"} ${item.name} · ${item.person}`,
      category: item.type === "debt" ? "Other" : "Other",
      accountId: account.id,
      amount: payAmount,
      currency: item.currency,
      baseAmount,
      tags: [item.type === "debt" ? "utang" : "piutang", "debt-payment"],
    };

    const accounts = state.accounts.map((acc) =>
      acc.id === account.id
        ? { ...acc, balance: acc.balance + (sign * baseAmount) / (state.exchangeRates[acc.currency] || 1) }
        : acc
    );

    onSave({
      ...state,
      accounts,
      transactions: [newTx, ...state.transactions],
      debts: state.debts.map((d) => (d.id === item.id ? { ...d, paid: Math.min(d.total, d.paid + payAmount) } : d)),
    });
    setPendingDebt(null);
    toast.success(isId ? "Pembayaran dicatat ke riwayat transaksi." : "Payment recorded in transactions.");
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

      {/* KPI Dashboard Section */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4" data-testid="debt-dashboard">
        <Card className="min-w-0 border-border/70 bg-card/75 p-4 shadow-sm backdrop-blur-xl sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="grid size-10 place-items-center rounded-xl bg-red-500/12 text-red-400">
              <ArrowUpRight size={19} />
            </div>
            <Badge variant="outline" className="border-red-500/20 text-[10px] text-red-400">
              {isId ? "Harus Dibayar" : "Owed"}
            </Badge>
          </div>
          <p className="text-xs font-semibold text-muted-foreground">{isId ? "Total Utang Saya" : "Total Debt Owed"}</p>
          <p className="mt-1 truncate font-data text-lg font-bold tracking-tight sm:text-2xl text-red-400" data-testid="kpi-total-debt">
            {formatMoney(totalDebt, state.baseCurrency, state.locale, true)}
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {state.debts.filter((d) => d.type === "debt").length} {isId ? "catatan utang" : "debt records"}
          </p>
        </Card>

        <Card className="min-w-0 border-border/70 bg-card/75 p-4 shadow-sm backdrop-blur-xl sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="grid size-10 place-items-center rounded-xl bg-emerald-500/12 text-emerald-400">
              <ArrowDownLeft size={19} />
            </div>
            <Badge variant="outline" className="border-emerald-500/20 text-[10px] text-emerald-400">
              {isId ? "Akan Diterima" : "Receivable"}
            </Badge>
          </div>
          <p className="text-xs font-semibold text-muted-foreground">{isId ? "Total Piutang Saya" : "Total Receivables"}</p>
          <p className="mt-1 truncate font-data text-lg font-bold tracking-tight sm:text-2xl text-emerald-400" data-testid="kpi-total-receivables">
            {formatMoney(totalReceivables, state.baseCurrency, state.locale, true)}
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {state.debts.filter((d) => d.type === "receivable").length} {isId ? "catatan piutang" : "receivable records"}
          </p>
        </Card>

        <Card className="min-w-0 border-border/70 bg-card/75 p-4 shadow-sm backdrop-blur-xl sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="grid size-10 place-items-center rounded-xl bg-amber-500/12 text-amber-400">
              <CalendarClock size={19} />
            </div>
            <Badge variant="outline" className="border-amber-500/20 text-[10px] text-amber-400">
              {isId ? "Rutin & Cicilan" : "Recurring"}
            </Badge>
          </div>
          <p className="text-xs font-semibold text-muted-foreground">{isId ? "Cicilan/Tagihan Aktif" : "Active Bills Due"}</p>
          <p className="mt-1 truncate font-data text-lg font-bold tracking-tight sm:text-2xl text-amber-400" data-testid="kpi-total-bills">
            {formatMoney(totalBillsThisMonth, state.baseCurrency, state.locale, true)}
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {activeBills.length} {isId ? "tagihan/cicilan berjalan" : "active bills"}
          </p>
        </Card>

        <Card className="min-w-0 border-border/70 bg-card/75 p-4 shadow-sm backdrop-blur-xl sm:p-5">
          <div className="mb-3 flex items-center justify-between">
            <div className="grid size-10 place-items-center rounded-xl bg-indigo-500/12 text-indigo-400">
              <Landmark size={19} />
            </div>
            <Badge variant="outline" className="border-indigo-500/20 text-[10px] text-indigo-400">
              {isId ? "Net Berjalan" : "Net Pending"}
            </Badge>
          </div>
          <p className="text-xs font-semibold text-muted-foreground">{isId ? "Total Tanggungan Net" : "Net Pending Obligations"}</p>
          <p className="mt-1 truncate font-data text-lg font-bold tracking-tight sm:text-2xl text-foreground" data-testid="kpi-net-obligations">
            {formatMoney(netObligations, state.baseCurrency, state.locale, true)}
          </p>
          <p className="mt-2 text-[11px] text-muted-foreground">
            {isId ? "Utang + Tagihan - Piutang" : "Debt + Bills - Receivables"}
          </p>
        </Card>
      </div>

      {/* Main Grid: Recurring Bills/Installments & Debts/Receivables */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Recurring Bills & Installments Section */}
        <section className="rounded-2xl border border-border/70 bg-card/75 p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl font-bold">{isId ? "Tagihan Rutin & Fitur Cicilan" : "Recurring bills & installments"}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {isId ? "Otomatis hilang jika sisa cicilan habis (0x)" : "Auto-completes when remaining count hits 0"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {completedBills.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowArchivedBills(!showArchivedBills)}
                  className="flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  <History size={13} />
                  {showArchivedBills ? (isId ? "Sembunyikan Selesai" : "Hide Completed") : (isId ? `Lunas (${completedBills.length})` : `History (${completedBills.length})`)}
                </button>
              )}
              <Badge variant="secondary">{activeBills.length}</Badge>
            </div>
          </div>

          <div className="space-y-3">
            {visibleBills.map((item) => {
              const isFinished = item.active === false || (item.remainingInstallments !== undefined && item.remainingInstallments <= 0);

              return (
                <div
                  key={item.id}
                  className={`flex flex-wrap items-center gap-3 rounded-xl border p-3 transition-colors ${
                    isFinished
                      ? "border-dashed border-border/60 bg-muted/30 opacity-60"
                      : "border-border/60 bg-background/35 hover:border-border/90"
                  }`}
                >
                  <div className={`grid size-9 place-items-center rounded-lg ${isFinished ? "bg-secondary text-muted-foreground" : "bg-amber-500/12 text-amber-400"}`}>
                    <CreditCard size={16} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold">{item.name}</p>
                      {item.remainingInstallments !== undefined && (
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-bold ${
                            isFinished
                              ? "border-emerald-500/30 text-emerald-400"
                              : "border-amber-500/30 text-amber-400 bg-amber-500/5"
                          }`}
                        >
                          {isFinished
                            ? isId ? "🎉 LUNAS" : "COMPLETED"
                            : isId ? `Kurang ${item.remainingInstallments} bulan lagi (${item.remainingInstallments}x)` : `${item.remainingInstallments}x remaining`}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {item.category} · {isId ? "Jatuh Tempo" : "Due"}: {item.nextDueDate} · {item.remainingInstallments === undefined ? (isId ? "Tagihan Bulanan Rutin" : "Monthly Recurring") : ""}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-data text-xs font-bold">{formatMoney(item.amount, item.currency, state.locale)}</span>
                    <p className="text-[9px] text-muted-foreground">{isId ? "per bulan" : "per month"}</p>
                  </div>

                  <div className="flex gap-1 pl-1">
                    {!isFinished && (
                      <button
                        type="button"
                        data-testid={`bill-pay-installment-${item.id}-button`}
                        onClick={() => setPendingBill(item)}
                        title={isId ? "Bayar 1x Cicilan" : "Pay 1x Installment"}
                        className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2 py-1 text-xs font-extrabold text-emerald-400 hover:bg-emerald-500/20"
                      >
                        <CheckCircle2 size={13} />
                        <span>{isId ? "Bayar 1x" : "Pay 1x"}</span>
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
              <p className="py-6 text-center text-xs text-muted-foreground">
                {isId ? "Belum ada tagihan rutin atau cicilan aktif." : "No active recurring bills or installments."}
              </p>
            )}

            {displayedBills.length > PREVIEW && (
              <button
                type="button"
                data-testid="bills-toggle-button"
                onClick={() => setExpandBills((value) => !value)}
                aria-expanded={expandBills}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/35 text-xs font-bold text-primary transition-colors hover:bg-primary/8"
              >
                {expandBills
                  ? isId ? "Sembunyikan sebagian" : "Show less"
                  : isId ? `Lihat ${hiddenBills} tagihan lainnya` : `Show ${hiddenBills} more`}
                <ChevronDown size={14} className={`transition-transform duration-200 ${expandBills ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>

          {/* Form Create Bill / Installment */}
          <form onSubmit={addBill} className="mt-5 grid gap-2.5 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3.5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="text-xs font-bold text-primary mb-1">
                {isId ? "+ Tambah Tagihan / Cicilan Baru" : "+ Add New Bill or Installment"}
              </p>
            </div>

            <input
              data-testid="bill-name-input"
              required
              value={bill.name}
              onChange={(event) => setBill((value) => ({ ...value, name: event.target.value }))}
              placeholder={isId ? "Nama tagihan/cicilan (misal: Cicilan Motor)" : "Bill / Installment name"}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
            <input
              data-testid="bill-amount-input"
              required
              type="number"
              min="1"
              value={bill.amount}
              onChange={(event) => setBill((value) => ({ ...value, amount: event.target.value }))}
              placeholder={isId ? "Nominal angsuran per bulan" : "Amount per month"}
              className="h-10 rounded-lg border border-border bg-background px-3 font-data text-sm outline-none focus:border-primary"
            />
            <input
              data-testid="bill-date-input"
              required
              type="date"
              value={bill.nextDueDate}
              onChange={(event) => setBill((value) => ({ ...value, nextDueDate: event.target.value }))}
              className="h-10 rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-primary"
            />
            <input
              data-testid="bill-installments-input"
              type="number"
              min="1"
              value={bill.remainingInstallments}
              onChange={(event) => setBill((value) => ({ ...value, remainingInstallments: event.target.value }))}
              placeholder={isId ? "Sisa Berapa Kali/Bulan (opsional)" : "Remaining months count (optional)"}
              className="h-10 rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-primary"
            />
            <p className="text-[10px] text-muted-foreground sm:col-span-2 italic">
              * {isId ? "Isi jumlah sisa bulan/kali cicilan (misal: 4). Setelah 4x dibayar, cicilan akan otomatis lunas & hilang sendiri dari dashboard." : "Specify remaining installments (e.g. 4). Auto-expires when completed."}
            </p>
            <div className="sm:col-span-2">
              <Button data-testid="bill-create-button" type="submit" className="w-full h-10 gap-2">
                <Plus size={14} />
                {isId ? "Simpan Cicilan / Tagihan" : "Save Bill / Installment"}
              </Button>
            </div>
          </form>
        </section>

        {/* Debt & Receivables Section */}
        <section className="rounded-2xl border border-border/70 bg-card/75 p-5 shadow-sm sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-heading text-xl font-bold">{isId ? "Utang & Piutang Persona" : "Debt & receivables"}</h2>
              <p className="mt-1 text-xs text-muted-foreground">{isId ? "Catat pinjaman dengan teman, bank, atau keluarga" : "Track money owed or borrowed"}</p>
            </div>
            <Badge variant="secondary">{state.debts.length}</Badge>
          </div>

          <div className="space-y-3">
            {visibleDebts.map((item) => {
              const remaining = Math.max(0, item.total - item.paid);
              const progress = item.total ? Math.min(100, Math.round((item.paid / item.total) * 100)) : 0;
              const isFinished = remaining === 0;

              return (
                <div key={item.id} className="rounded-xl border border-border/60 bg-background/35 p-3 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className={`grid size-9 place-items-center rounded-lg ${item.type === "debt" ? "bg-red-500/12 text-red-400" : "bg-emerald-500/12 text-emerald-400"}`}>
                      {item.type === "debt" ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold">{item.name}</p>
                        <Badge variant="outline" className={`text-[9px] ${item.type === "debt" ? "text-red-400 border-red-500/30" : "text-emerald-400 border-emerald-500/30"}`}>
                          {item.type === "debt" ? (isId ? "Saya Berutang" : "Debt") : (isId ? "Piutang Saya" : "Receivable")}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        {item.person} · {isId ? "Jatuh Tempo" : "Due"}: {item.dueDate}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-data text-xs font-bold">
                        {formatMoney(remaining, item.currency, state.locale)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {isId ? "Sisa dari" : "left of"} {formatMoney(item.total, item.currency, state.locale, true)}
                      </p>
                    </div>

                    <div className="flex gap-1 pl-1">
                      {!isFinished && (
                        <button
                          type="button"
                          data-testid={`debt-pay-${item.id}-button`}
                          onClick={() => setPendingDebt(item)}
                          title={isId ? "Catat Pembayaran" : "Record Payment"}
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

                  {/* Progress Bar */}
                  <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${item.type === "debt" ? "bg-red-400" : "bg-emerald-400"}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              );
            })}

            {state.debts.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">
                {isId ? "Belum ada catatan utang atau piutang." : "No debts or receivables recorded."}
              </p>
            )}

            {state.debts.length > PREVIEW && (
              <button
                type="button"
                data-testid="debts-toggle-button"
                onClick={() => setExpandDebts((value) => !value)}
                aria-expanded={expandDebts}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/35 text-xs font-bold text-primary transition-colors hover:bg-primary/8"
              >
                {expandDebts
                  ? isId ? "Sembunyikan sebagian" : "Show less"
                  : isId ? `Lihat ${hiddenDebts} catatan lainnya` : `Show ${hiddenDebts} more`}
                <ChevronDown size={14} className={`transition-transform duration-200 ${expandDebts ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>

          <form onSubmit={addDebt} className="mt-5 grid gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3 sm:grid-cols-2">
            <input
              data-testid="commitment-name-input"
              required
              value={debt.name}
              onChange={(event) => setDebt((value) => ({ ...value, name: event.target.value }))}
              placeholder={isId ? "Keterangan (misal: Pinjam Modal)" : "Name"}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
            <input
              data-testid="commitment-person-input"
              required
              value={debt.person}
              onChange={(event) => setDebt((value) => ({ ...value, person: event.target.value }))}
              placeholder={isId ? "Nama orang/lembaga" : "Person / Lender"}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
            />
            <div className="grid grid-cols-2 gap-2">
              <select
                data-testid="commitment-type-select"
                value={debt.type}
                onChange={(e) => setDebt((val) => ({ ...val, type: e.target.value as CommitmentType }))}
                className="h-10 rounded-lg border border-border bg-background px-2 text-xs font-semibold"
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
                onChange={(event) => setDebt((value) => ({ ...value, total: event.target.value }))}
                placeholder={isId ? "Total nominal" : "Total amount"}
                className="h-10 rounded-lg border border-border bg-background px-3 font-data text-sm outline-none focus:border-primary"
              />
            </div>
            <Button data-testid="commitment-create-button" type="submit" className="h-10 gap-2">
              <Plus size={14} />
              {isId ? "Tambah Catatan" : "Create"}
            </Button>
          </form>
        </section>
      </div>

      {pendingBill && (
        <PaymentConfirmDialog
          state={state}
          target={{
            kind: "bill",
            name: pendingBill.name,
            amount: pendingBill.amount,
            currency: pendingBill.currency,
            category: pendingBill.category,
            hint: isId
              ? `Bayar 1x cicilan/tagihan. ${pendingBill.remainingInstallments !== undefined ? `Sisa saat ini ${pendingBill.remainingInstallments}x.` : "Tagihan rutin."} Akan tercatat di riwayat transaksi.`
              : "Pay one installment. It will be recorded in your transactions.",
          } satisfies PaymentTarget}
          onClose={() => setPendingBill(null)}
          onConfirm={(draft) => payBillInstallment(pendingBill, draft)}
        />
      )}

      {pendingDebt && (
        <PaymentConfirmDialog
          state={state}
          target={{
            kind: "debt",
            name: pendingDebt.name,
            amount: Math.max(0, pendingDebt.total - pendingDebt.paid),
            currency: pendingDebt.currency,
            category: "Other",
            maxAmount: Math.max(0, pendingDebt.total - pendingDebt.paid),
            hint: isId
              ? `${pendingDebt.type === "debt" ? "Bayar utang ke" : "Terima piutang dari"} ${pendingDebt.person}. Sisa ${formatMoney(Math.max(0, pendingDebt.total - pendingDebt.paid), pendingDebt.currency, state.locale)}.`
              : `Remaining ${formatMoney(Math.max(0, pendingDebt.total - pendingDebt.paid), pendingDebt.currency, state.locale)}.`,
          } satisfies PaymentTarget}
          onClose={() => setPendingDebt(null)}
          onConfirm={(draft) => recordDebtPayment(pendingDebt, draft)}
        />
      )}
    </div>
  );
}