/**
 * CommitmentsPanel — Unified Dashboard for Bills, Installments, Debts, and Receivables.
 *
 * Implements:
 * - Unified "Komitmen" (Commitments) module merging bills/installments with debts/receivables
 * - Clean, sleek layout matching TransactionsPanel
 * - Mobile-friendly responsive KPI cards
 * - Unified Add Commitment modal with category switch (Cicilan / Tagihan vs Utang Saya vs Piutang)
 * - Floating Action Button (FAB) for adding commitments without scrolling
 * - View filter tabs: Semua | Cicilan & Tagihan | Utang & Piutang
 * - Non-blocking modal editing (no window.prompt or window.confirm)
 */
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  HandCoins,
  Landmark,
  Pencil,
  Plus,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import type * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/formatters";
import type { Bill, CommitmentType, Debt, FinanceState } from "@/lib/localDb";
import { DEFAULT_CATEGORIES } from "@/lib/localDb";
import { applyCommitmentPayment, isPaidInMonth, type CommitmentPaymentInput } from "@/lib/commitmentPayment";
import { PayCommitmentDialog, type PayCommitmentTarget } from "@/components/PayCommitmentDialog";
import { DetailCard } from "@/components/mobile/DetailCard";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { SectionHeading, KpiCard, ShowMoreButton, EmptyState } from "@/components/shared";

export function CommitmentsPanel({
  state,
  onSave,
  showAddModalFromParent,
  onCloseAddModalFromParent,
}: {
  state: FinanceState;
  onSave: (next: FinanceState) => void;
  showAddModalFromParent?: boolean;
  onCloseAddModalFromParent?: () => void;
}) {
  const BILL_PREVIEW_COUNT = 6;
  const DEBT_PREVIEW_COUNT = 6;
  const isId = state.locale === "id";

  // Tab filter: all | bills | debts
  const [activeTab, setActiveTab] = useState<"all" | "bills" | "debts">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Add Commitment modal state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addKind, setAddKind] = useState<"bill" | "debt" | "receivable">("bill");

  useEffect(() => {
    if (showAddModalFromParent !== undefined) {
      setIsAddOpen(showAddModalFromParent);
    }
  }, [showAddModalFromParent]);

  const handleCloseAdd = () => {
    setIsAddOpen(false);
    if (onCloseAddModalFromParent) {
      onCloseAddModalFromParent();
    }
  };

  // Add Bill form state
  const [billForm, setBillForm] = useState({
    name: "",
    category: "Utilities",
    amount: "",
    frequency: "monthly" as Bill["frequency"],
    customInterval: "1",
    nextDueDate: new Date().toISOString().slice(0, 10),
    remainingInstallments: "",
  });

  // Add Debt / Receivable form state
  const [debtForm, setDebtForm] = useState({
    name: "",
    person: "",
    type: "debt" as CommitmentType,
    total: "",
    dueDate: new Date().toISOString().slice(0, 10),
  });

  // Editing state
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [editBillForm, setEditBillForm] = useState({ name: "", amount: "", nextDueDate: "" });

  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
  const [editDebtForm, setEditDebtForm] = useState({ name: "", person: "", total: "", dueDate: "" });

  // Delete confirmation state
  const [deletingTarget, setDeletingTarget] = useState<{ kind: "bill" | "debt"; id: string; name: string } | null>(null);

  const [showArchivedBills, setShowArchivedBills] = useState(false);
  const [showAllBills, setShowAllBills] = useState(false);
  const [showAllDebts, setShowAllDebts] = useState(false);

  // Mobile expand state
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

  const paidThisMonthBills = activeBills.filter((b) => isPaidInMonth(b.lastPaidDate, thisMonth));
  const unpaidActiveBills = activeBills.filter((b) => !isPaidInMonth(b.lastPaidDate, thisMonth));

  const sortByDue = (a: Bill, b: Bill) => a.nextDueDate.localeCompare(b.nextDueDate);
  const sortedActiveBills = [
    ...unpaidActiveBills.sort(sortByDue),
    ...paidThisMonthBills.sort(sortByDue),
  ];

  const displayedBills = showArchivedBills
    ? [...state.bills].sort(sortByDue)
    : sortedActiveBills;

  const filteredBills = useMemo(() => {
    return displayedBills.filter((b) =>
      searchQuery
        ? b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.category.toLowerCase().includes(searchQuery.toLowerCase())
        : true,
    );
  }, [displayedBills, searchQuery]);

  const filteredDebts = useMemo(() => {
    return state.debts.filter((d) =>
      searchQuery
        ? d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          d.person.toLowerCase().includes(searchQuery.toLowerCase())
        : true,
    );
  }, [state.debts, searchQuery]);

  const hasMoreBills = filteredBills.length > BILL_PREVIEW_COUNT;
  const visibleBills = showAllBills ? filteredBills : filteredBills.slice(0, BILL_PREVIEW_COUNT);
  const hasMoreDebts = filteredDebts.length > DEBT_PREVIEW_COUNT;
  const visibleDebts = showAllDebts ? filteredDebts : filteredDebts.slice(0, DEBT_PREVIEW_COUNT);

  // KPI Computations
  const totalDebt = state.debts
    .filter((d) => d.type === "debt")
    .reduce((sum, d) => sum + Math.max(0, d.total - d.paid), 0);
  const totalReceivables = state.debts
    .filter((d) => d.type === "receivable")
    .reduce((sum, d) => sum + Math.max(0, d.total - d.paid), 0);
  const totalBillsThisMonth = unpaidActiveBills.reduce((sum, b) => sum + b.amount, 0);
  const netObligations = totalDebt + totalBillsThisMonth - totalReceivables;

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleAddBill = (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(billForm.amount);
    if (!billForm.name.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error(isId ? "Isi nama dan nominal tagihan yang valid." : "Invalid name or amount.");
      return;
    }
    const rem = billForm.remainingInstallments.trim() ? Number(billForm.remainingInstallments) : undefined;
    const interval = Number(billForm.customInterval);
    const customInterval = Number.isFinite(interval) && interval > 0 ? interval : 1;
    const next: Bill = {
      id: `bill-${Date.now()}`,
      name: billForm.name.trim(),
      category: billForm.category,
      amount,
      currency: state.baseCurrency,
      frequency: billForm.frequency,
      customInterval,
      nextDueDate: billForm.nextDueDate,
      remainingInstallments: rem,
      active: true,
    };
    onSave({ ...state, bills: [next, ...state.bills] });
    setBillForm({
      name: "",
      category: "Utilities",
      amount: "",
      frequency: "monthly",
      customInterval: "1",
      nextDueDate: new Date().toISOString().slice(0, 10),
      remainingInstallments: "",
    });
    handleCloseAdd();
    toast.success(
      isId
        ? rem
          ? `Cicilan "${next.name}" (${rem}x) ditambahkan.`
          : `Tagihan rutin "${next.name}" ditambahkan.`
        : `Bill "${next.name}" created.`,
    );
  };

  const handleAddDebt = (event: React.FormEvent) => {
    event.preventDefault();
    const total = Number(debtForm.total);
    if (!debtForm.name.trim() || !debtForm.person.trim() || !Number.isFinite(total) || total <= 0) {
      toast.error(isId ? "Lengkapi nama, orang, dan nominal." : "Fill required fields.");
      return;
    }
    const next: Debt = {
      id: `debt-${Date.now()}`,
      name: debtForm.name.trim(),
      person: debtForm.person.trim(),
      type: addKind === "receivable" ? "receivable" : "debt",
      total,
      paid: 0,
      currency: state.baseCurrency,
      dueDate: debtForm.dueDate,
      note: "",
    };
    onSave({ ...state, debts: [next, ...state.debts] });
    setDebtForm({
      name: "",
      person: "",
      type: "debt",
      total: "",
      dueDate: new Date().toISOString().slice(0, 10),
    });
    handleCloseAdd();
    toast.success(
      isId
        ? addKind === "receivable"
          ? "Catatan piutang berhasil ditambahkan."
          : "Catatan utang berhasil ditambahkan."
        : "Record created successfully.",
    );
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
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    onSave(result.state);
    toast.success(result.message);
    return true;
  };

  const handleSaveEditBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBill) return;
    const value = Number(editBillForm.amount);
    if (!Number.isFinite(value) || value <= 0 || !editBillForm.name.trim()) return;

    onSave({
      ...state,
      bills: state.bills.map((b) =>
        b.id === editingBill.id
          ? {
              ...b,
              name: editBillForm.name.trim(),
              amount: value,
              nextDueDate: editBillForm.nextDueDate || b.nextDueDate,
            }
          : b,
      ),
    });
    setEditingBill(null);
    toast.success(isId ? "Tagihan diperbarui." : "Bill updated.");
  };

  const handleSaveEditDebt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDebt) return;
    const value = Number(editDebtForm.total);
    if (!Number.isFinite(value) || value <= 0 || !editDebtForm.name.trim()) return;

    onSave({
      ...state,
      debts: state.debts.map((d) =>
        d.id === editingDebt.id
          ? {
              ...d,
              name: editDebtForm.name.trim(),
              person: editDebtForm.person.trim() || d.person,
              total: value,
              paid: Math.min(d.paid, value),
              dueDate: editDebtForm.dueDate || d.dueDate,
            }
          : d,
      ),
    });
    setEditingDebt(null);
    toast.success(isId ? "Utang/piutang diperbarui." : "Debt updated.");
  };

  const handleConfirmDelete = () => {
    if (!deletingTarget) return;
    const { kind, id } = deletingTarget;
    onSave({
      ...state,
      bills: kind === "bill" ? state.bills.filter((item) => item.id !== id) : state.bills,
      debts: kind === "debt" ? state.debts.filter((item) => item.id !== id) : state.debts,
    });
    setDeletingTarget(null);
    toast.success(isId ? "Berhasil dihapus." : "Deleted successfully.");
  };

  const formatFreq = (freq: string, interval?: number) => {
    const i = interval || 1;
    if (isId) {
      if (freq === "daily") return i === 1 ? "Harian" : `Tiap ${i} Hari`;
      if (freq === "weekly") return i === 1 ? "Mingguan" : `Tiap ${i} Minggu`;
      if (freq === "monthly") return i === 1 ? "Bulanan" : `Tiap ${i} Bulan`;
      if (freq === "yearly") return i === 1 ? "Tahunan" : `Tiap ${i} Tahun`;
      return freq;
    }
    if (freq === "daily") return i === 1 ? "Daily" : `Every ${i} Days`;
    if (freq === "weekly") return i === 1 ? "Weekly" : `Every ${i} Weeks`;
    if (freq === "monthly") return i === 1 ? "Monthly" : `Every ${i} Months`;
    if (freq === "yearly") return i === 1 ? "Yearly" : `Every ${i} Years`;
    return freq;
  };

  return (
    <div className="animate-rise-in space-y-6 pb-16 lg:pb-8">
      {/* ── Page Header (Consistent with Transactions & Goals) ── */}
      <SectionHeading
        eyebrow="Obligations & Commitments / 03"
        title={isId ? "Komitmen" : "Commitments"}
        description={
          isId
            ? "Kelola tagihan rutin, cicilan, serta utang dan piutang dalam satu dashboard terpusat."
            : "Track recurring bills, installment plans, debts, and receivables in one dashboard."
        }
        action={
          <Button
            data-testid="commitments-add-button"
            onClick={() => setIsAddOpen(true)}
            className="hidden gap-2 md:inline-flex"
          >
            <Plus size={17} />
            {isId ? "Tambah Komitmen" : "Add Commitment"}
          </Button>
        }
      />

      {/* ── KPI Cards (Responsive & Overflow-Safe) ── */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" data-testid="debt-dashboard">
        <KpiCard
          testid="kpi-total-debt"
          icon={<ArrowUpRight size={18} />}
          tone="rose"
          badge={isId ? "Harus Dibayar" : "Owed"}
          badgeClass="border-red-500/20 text-red-400"
          label={isId ? "Total Utang Saya" : "Total Debt Owed"}
          value={formatMoney(totalDebt, state.baseCurrency, state.locale, true)}
          valueClass="text-red-400"
          note={`${state.debts.filter((d) => d.type === "debt").length} ${isId ? "catatan utang" : "debt records"}`}
        />
        <KpiCard
          testid="kpi-total-receivables"
          icon={<ArrowDownLeft size={18} />}
          tone="emerald"
          badge={isId ? "Akan Diterima" : "Receivable"}
          badgeClass="border-emerald-500/20 text-emerald-400"
          label={isId ? "Total Piutang Saya" : "Total Receivables"}
          value={formatMoney(totalReceivables, state.baseCurrency, state.locale, true)}
          valueClass="text-emerald-400"
          note={`${state.debts.filter((d) => d.type === "receivable").length} ${isId ? "catatan piutang" : "receivable records"}`}
        />
        <KpiCard
          testid="kpi-total-bills"
          icon={<CalendarClock size={18} />}
          tone="amber"
          badge={isId ? "Rutin & Cicilan" : "Recurring"}
          badgeClass="border-amber-500/20 text-amber-400"
          label={isId ? "Cicilan/Tagihan Aktif" : "Active Bills Due"}
          value={formatMoney(totalBillsThisMonth, state.baseCurrency, state.locale, true)}
          valueClass="text-amber-400"
          note={`${activeBills.length} ${isId ? "tagihan/cicilan berjalan" : "active bills"}`}
        />
        <KpiCard
          testid="kpi-net-obligations"
          icon={<Landmark size={18} />}
          tone="indigo"
          badge={isId ? "Net Berjalan" : "Net Pending"}
          badgeClass="border-indigo-500/20 text-indigo-400"
          label={isId ? "Total Tanggungan Net" : "Net Obligations"}
          value={formatMoney(netObligations, state.baseCurrency, state.locale, true)}
          note={isId ? "Utang + Tagihan − Piutang" : "Debt + Bills − Receivables"}
        />
      </div>

      {/* ── Filter / View Switcher (TransactionsPanel Style) ── */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/75 p-3.5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-4">
        {/* Tab Pills */}
        <div className="flex rounded-xl bg-secondary/80 p-1">
          <button
            type="button"
            data-testid="commitments-tab-all"
            onClick={() => setActiveTab("all")}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all sm:flex-initial ${
              activeTab === "all"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {isId ? "Semua" : "All"} ({state.bills.length + state.debts.length})
          </button>
          <button
            type="button"
            data-testid="commitments-tab-bills"
            onClick={() => setActiveTab("bills")}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex-1 sm:flex-initial ${
              activeTab === "bills"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CreditCard size={13} className="text-amber-400" />
            {isId ? "Tagihan & Cicilan" : "Bills & Installments"} ({state.bills.length})
          </button>
          <button
            type="button"
            data-testid="commitments-tab-debts"
            onClick={() => setActiveTab("debts")}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex-1 sm:flex-initial ${
              activeTab === "debts"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <HandCoins size={13} className="text-indigo-400" />
            {isId ? "Utang & Piutang" : "Debts & Receivables"} ({state.debts.length})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-60">
          <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isId ? "Cari nama / orang..." : "Search commitments..."}
            className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-xs outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* ── Content Grid ── */}
      <div className="grid gap-6 xl:grid-cols-2">
        {/* ── Bills & Installments Section ── */}
        {(activeTab === "all" || activeTab === "bills") && (
          <section className="rounded-2xl border border-border/70 bg-card/75 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <CreditCard size={16} className="text-amber-400" />
                  <h2 className="font-heading text-base font-bold sm:text-lg">
                    {isId ? "Tagihan Rutin & Cicilan" : "Recurring Bills & Installments"}
                  </h2>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {isId ? "Otomatis selesai ketika sisa cicilan habis" : "Auto-completes when remaining count hits 0"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {completedBills.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowArchivedBills(!showArchivedBills)}
                    className="rounded-lg border border-border/60 px-2 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-secondary"
                  >
                    {showArchivedBills
                      ? isId ? "Sembunyikan Selesai" : "Hide Completed"
                      : isId ? `Lihat Selesai (${completedBills.length})` : `Show Completed (${completedBills.length})`}
                  </button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAddKind("bill");
                    setIsAddOpen(true);
                  }}
                  className="gap-1 text-xs font-semibold"
                >
                  <Plus size={14} />
                  {isId ? "Tambah" : "Add"}
                </Button>
              </div>
            </div>

            <div className="p-3 sm:p-4">
              {/* Mobile View */}
              <div className="space-y-2 md:hidden">
                {visibleBills.map((item) => {
                  const isFinished = item.active === false || (item.remainingInstallments !== undefined && item.remainingInstallments <= 0);
                  const open = expandedBillId === item.id;
                  const paidThisMonth = isPaidInMonth(item.lastPaidDate, thisMonth) && !isFinished;

                  return (
                    <DetailCard
                      key={item.id}
                      testid={`bill-card-${item.id}`}
                      icon={<CreditCard size={14} />}
                      iconClass={
                        isFinished
                          ? "bg-secondary text-muted-foreground"
                          : paidThisMonth
                          ? "bg-secondary/70 text-muted-foreground"
                          : "bg-amber-500/12 text-amber-400"
                      }
                      title={item.name}
                      subtitle={`${isId ? "Jatuh Tempo" : "Due"}: ${item.nextDueDate}${
                        item.remainingInstallments !== undefined && !isFinished ? ` · ${item.remainingInstallments}x` : ""
                      }`}
                      value={formatMoney(item.amount, item.currency, state.locale)}
                      valueSub={paidThisMonth ? (isId ? "✓ Sudah dibayar" : "✓ Paid") : isFinished ? (isId ? "🎉 Lunas" : "Done") : undefined}
                      open={open}
                      onToggle={() => setExpandedBillId(open ? null : item.id)}
                      className={`transition-colors ${
                        isFinished
                          ? "border-dashed border-border/40 bg-muted/15 opacity-50"
                          : paidThisMonth
                          ? "border-dashed border-border/40 bg-muted/20 opacity-60"
                          : ""
                      }`}
                    >
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                        {item.remainingInstallments !== undefined && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              isFinished ? "border-emerald-500/30 text-emerald-400" : "border-amber-500/30 text-amber-400"
                            }`}
                          >
                            {isFinished
                              ? isId ? "🎉 LUNAS" : "COMPLETED"
                              : isId ? `Sisa ${item.remainingInstallments}x lagi` : `${item.remainingInstallments}x left`}
                          </Badge>
                        )}
                        {paidThisMonth && (
                          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/5 text-[10px] font-bold text-emerald-400">
                            {isId ? "Sudah dibayar bulan ini" : "Paid this month"}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {formatFreq(item.frequency, item.customInterval)}
                        </Badge>
                      </div>

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
                          onClick={() => {
                            setEditingBill(item);
                            setEditBillForm({ name: item.name, amount: String(item.amount), nextDueDate: item.nextDueDate });
                          }}
                          className="grid size-9 place-items-center rounded-xl border border-border/60 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          data-testid={`bill-delete-crud-${item.id}-button`}
                          onClick={() => setDeletingTarget({ kind: "bill", id: item.id, name: item.name })}
                          className="grid size-9 place-items-center rounded-xl border border-border/60 text-muted-foreground hover:bg-red-400/10 hover:text-red-400"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </DetailCard>
                  );
                })}

                {visibleBills.length === 0 && (
                  <EmptyState
                    message={isId ? "Belum ada tagihan rutin atau cicilan aktif." : "No active recurring bills or installments."}
                  />
                )}

                {hasMoreBills && (
                  <ShowMoreButton
                    expanded={showAllBills}
                    onToggle={() => setShowAllBills((v) => !v)}
                    count={filteredBills.length}
                    label={{
                      show: isId ? "Lihat semua tagihan" : "Show all bills",
                      hide: isId ? "Tampilkan lebih sedikit" : "Show less",
                    }}
                    testid="bills-toggle-show-all-mobile"
                  />
                )}
              </div>

              {/* Desktop View */}
              <div className="hidden space-y-2 md:block">
                {visibleBills.map((item) => {
                  const isFinished = item.active === false || (item.remainingInstallments !== undefined && item.remainingInstallments <= 0);
                  const paidThisMonth = isPaidInMonth(item.lastPaidDate, thisMonth) && !isFinished;

                  return (
                    <div
                      key={item.id}
                      data-testid={`bill-row-${item.id}`}
                      className={`flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 p-3 transition-colors ${
                        isFinished
                          ? "border-dashed border-border/40 bg-muted/15 opacity-50"
                          : paidThisMonth
                          ? "border-dashed border-border/40 bg-muted/20 opacity-60"
                          : "hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                            isFinished
                              ? "bg-secondary text-muted-foreground"
                              : paidThisMonth
                              ? "bg-secondary/70 text-muted-foreground"
                              : "bg-amber-500/12 text-amber-400"
                          }`}
                        >
                          <CreditCard size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold">{item.name}</p>
                            <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                            {item.remainingInstallments !== undefined && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-bold ${
                                  isFinished ? "border-emerald-500/30 text-emerald-400" : "border-amber-500/30 text-amber-400"
                                }`}
                              >
                                {isFinished
                                  ? isId ? "🎉 LUNAS" : "COMPLETED"
                                  : isId ? `Sisa ${item.remainingInstallments}x` : `${item.remainingInstallments}x left`}
                              </Badge>
                            )}
                            {paidThisMonth && (
                              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/5 text-[10px] font-bold text-emerald-400">
                                {isId ? "Sudah dibayar bulan ini" : "Paid this month"}
                              </Badge>
                            )}
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {formatFreq(item.frequency, item.customInterval)} · {isId ? "Jatuh tempo" : "Due"} {item.nextDueDate}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <p className="font-data text-sm font-bold">
                          {formatMoney(item.amount, item.currency, state.locale)}
                        </p>
                        {!isFinished && (
                          <button
                            type="button"
                            title={isId ? "Bayar 1x cicilan" : "Pay 1x installment"}
                            data-testid={`bill-pay-installment-${item.id}-button`}
                            onClick={() => openBillPayment(item)}
                            className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20"
                          >
                            <CheckCircle2 size={13} />
                            {isId ? "Bayar" : "Pay"}
                          </button>
                        )}
                        <button
                          type="button"
                          data-testid={`bill-edit-crud-${item.id}-button`}
                          onClick={() => {
                            setEditingBill(item);
                            setEditBillForm({ name: item.name, amount: String(item.amount), nextDueDate: item.nextDueDate });
                          }}
                          className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          data-testid={`bill-delete-crud-${item.id}-button`}
                          onClick={() => setDeletingTarget({ kind: "bill", id: item.id, name: item.name })}
                          className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-red-400/10 hover:text-red-400"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {visibleBills.length === 0 && (
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
                      : <><ChevronDown size={14} />{isId ? `Lihat semua (${filteredBills.length})` : `Show all (${filteredBills.length})`}</>}
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* ── Debts & Receivables Section ── */}
        {(activeTab === "all" || activeTab === "debts") && (
          <section className="rounded-2xl border border-border/70 bg-card/75 shadow-sm overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 border-b border-border/60 px-4 py-4 sm:px-6">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <HandCoins size={16} className="text-indigo-400" />
                  <h2 className="font-heading text-base font-bold sm:text-lg">
                    {isId ? "Utang & Piutang" : "Debts & Receivables"}
                  </h2>
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {isId ? "Catat siapa berutang ke siapa dan cicil pelunasannya" : "Track who owes whom and make partial payments"}
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setAddKind("debt");
                  setIsAddOpen(true);
                }}
                className="gap-1 text-xs font-semibold"
              >
                <Plus size={14} />
                {isId ? "Tambah" : "Add"}
              </Button>
            </div>

            <div className="p-3 sm:p-4">
              {/* Mobile View */}
              <div className="space-y-2 md:hidden">
                {visibleDebts.map((item) => {
                  const remaining = Math.max(0, item.total - item.paid);
                  const isSettled = remaining <= 0;
                  const isDebt = item.type === "debt";
                  const open = expandedDebtId === item.id;
                  const progress = item.total > 0 ? Math.min(100, Math.round((item.paid / item.total) * 100)) : 100;

                  return (
                    <DetailCard
                      key={item.id}
                      testid={`debt-card-${item.id}`}
                      icon={isDebt ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                      iconClass={isSettled ? "bg-secondary text-muted-foreground" : isDebt ? "bg-red-500/12 text-red-400" : "bg-emerald-500/12 text-emerald-400"}
                      title={item.name}
                      subtitle={`${isDebt ? (isId ? "Utang ke" : "Owed to") : (isId ? "Piutang dari" : "From")}: ${item.person}`}
                      value={formatMoney(remaining, item.currency, state.locale)}
                      valueSub={isSettled ? (isId ? "🎉 Lunas" : "Settled") : `${progress}% ${isId ? "terbayar" : "paid"}`}
                      open={open}
                      onToggle={() => setExpandedDebtId(open ? null : item.id)}
                      className={`transition-colors ${isSettled ? "border-dashed border-border/40 bg-muted/15 opacity-50" : ""}`}
                    >
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant="outline" className={`text-[10px] font-bold ${isDebt ? "border-red-500/30 text-red-400" : "border-emerald-500/30 text-emerald-400"}`}>
                          {isDebt ? (isId ? "Utang Saya" : "I Owe") : (isId ? "Piutang" : "Receivable")}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] text-muted-foreground">
                          {isId ? "Jatuh Tempo" : "Due"}: {item.dueDate}
                        </Badge>
                        {isSettled && (
                          <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/5 text-[10px] font-bold text-emerald-400">
                            {isId ? "✓ Lunas" : "✓ Settled"}
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px] text-muted-foreground">
                          <span>{isId ? "Terbayar" : "Paid"}: {formatMoney(item.paid, item.currency, state.locale)}</span>
                          <span>Total: {formatMoney(item.total, item.currency, state.locale)}</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                          <div
                            className={`h-full rounded-full transition-all ${isDebt ? "bg-red-400" : "bg-emerald-400"}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!isSettled && (
                          <button
                            type="button"
                            data-testid={`debt-pay-remaining-${item.id}-button`}
                            onClick={() => { openDebtPayment(item); setExpandedDebtId(null); }}
                            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2.5 text-xs font-bold text-primary hover:bg-primary/20"
                          >
                            <Wallet size={13} />
                            {isId ? "Catat Pembayaran" : "Record Payment"}
                          </button>
                        )}
                        <button
                          type="button"
                          data-testid={`debt-edit-crud-${item.id}-button`}
                          onClick={() => {
                            setEditingDebt(item);
                            setEditDebtForm({ name: item.name, person: item.person, total: String(item.total), dueDate: item.dueDate });
                          }}
                          className="grid size-9 place-items-center rounded-xl border border-border/60 text-muted-foreground hover:bg-primary/10 hover:text-primary"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          type="button"
                          data-testid={`debt-delete-crud-${item.id}-button`}
                          onClick={() => setDeletingTarget({ kind: "debt", id: item.id, name: item.name })}
                          className="grid size-9 place-items-center rounded-xl border border-border/60 text-muted-foreground hover:bg-red-400/10 hover:text-red-400"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </DetailCard>
                  );
                })}

                {visibleDebts.length === 0 && (
                  <EmptyState
                    message={isId ? "Belum ada catatan utang atau piutang." : "No debts or receivables recorded."}
                  />
                )}

                {hasMoreDebts && (
                  <ShowMoreButton
                    expanded={showAllDebts}
                    onToggle={() => setShowAllDebts((v) => !v)}
                    count={filteredDebts.length}
                    label={{
                      show: isId ? "Lihat semua catatan" : "Show all records",
                      hide: isId ? "Tampilkan lebih sedikit" : "Show less",
                    }}
                    testid="debts-toggle-show-all-mobile"
                  />
                )}
              </div>

              {/* Desktop View */}
              <div className="hidden space-y-2 md:block">
                {visibleDebts.map((item) => {
                  const remaining = Math.max(0, item.total - item.paid);
                  const isSettled = remaining <= 0;
                  const isDebt = item.type === "debt";
                  const progress = item.total > 0 ? Math.min(100, Math.round((item.paid / item.total) * 100)) : 100;

                  return (
                    <div
                      key={item.id}
                      data-testid={`debt-row-${item.id}`}
                      className={`space-y-2 rounded-xl border border-border/60 bg-background/40 p-3 transition-colors ${
                        isSettled ? "border-dashed border-border/40 bg-muted/15 opacity-50" : "hover:border-primary/40"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                              isSettled ? "bg-secondary text-muted-foreground" : isDebt ? "bg-red-500/12 text-red-400" : "bg-emerald-500/12 text-emerald-400"
                            }`}
                          >
                            {isDebt ? <ArrowUpRight size={16} /> : <ArrowDownLeft size={16} />}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold">{item.name}</p>
                              <Badge variant="outline" className={`text-[10px] font-bold ${isDebt ? "border-red-500/30 text-red-400" : "border-emerald-500/30 text-emerald-400"}`}>
                                {isDebt ? (isId ? "Utang Saya" : "I Owe") : (isId ? "Piutang" : "Receivable")}
                              </Badge>
                              {isSettled && (
                                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/5 text-[10px] font-bold text-emerald-400">
                                  {isId ? "✓ Lunas" : "✓ Settled"}
                                </Badge>
                              )}
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {isDebt ? (isId ? "Ke" : "To") : (isId ? "Dari" : "From")}: <span className="font-semibold text-foreground">{item.person}</span> · {isId ? "Jatuh tempo" : "Due"} {item.dueDate}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <p className="font-data text-sm font-bold">
                              {formatMoney(remaining, item.currency, state.locale)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {isId ? "sisa dari" : "left of"} {formatMoney(item.total, item.currency, state.locale, true)}
                            </p>
                          </div>
                          {!isSettled && (
                            <button
                              type="button"
                              title={isId ? "Catat pembayaran" : "Record payment"}
                              data-testid={`debt-pay-remaining-${item.id}-button`}
                              onClick={() => openDebtPayment(item)}
                              className="flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-bold text-primary hover:bg-primary/20"
                            >
                              <Wallet size={13} />
                              {isId ? "Bayar" : "Pay"}
                            </button>
                          )}
                          <button
                            type="button"
                            data-testid={`debt-edit-crud-${item.id}-button`}
                            onClick={() => {
                              setEditingDebt(item);
                              setEditDebtForm({ name: item.name, person: item.person, total: String(item.total), dueDate: item.dueDate });
                            }}
                            className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            type="button"
                            data-testid={`debt-delete-crud-${item.id}-button`}
                            onClick={() => setDeletingTarget({ kind: "debt", id: item.id, name: item.name })}
                            className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-red-400/10 hover:text-red-400"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>

                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                        <div
                          className={`h-full rounded-full transition-all ${isDebt ? "bg-red-400" : "bg-emerald-400"}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

                {visibleDebts.length === 0 && (
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
                      : <><ChevronDown size={14} />{isId ? `Lihat semua (${filteredDebts.length})` : `Show all (${filteredDebts.length})`}</>}
                  </button>
                )}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* ── Floating Action Button (FAB) on Screen ── */}
      <button
        type="button"
        data-testid="commitments-fab-button"
        aria-label={isId ? "Tambah Komitmen" : "Add Commitment"}
        onClick={() => setIsAddOpen(true)}
        className="fixed bottom-[84px] right-4 z-30 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95 lg:hidden"
      >
        <Plus size={24} />
      </button>

      {/* ── Unified Add Commitment Modal with Category Switch ── */}
      {isAddOpen && (
        <BottomSheet
          open
          onClose={handleCloseAdd}
          testid="add-commitment-modal"
          eyebrow={isId ? "Kewajiban Baru" : "New Obligation"}
          title={isId ? "Tambah Komitmen" : "Add Commitment"}
        >
          {/* Category Switcher Tabs */}
          <div className="mb-4 flex rounded-xl bg-secondary/80 p-1">
            <button
              type="button"
              data-testid="commitment-toggle-bill"
              onClick={() => setAddKind("bill")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                addKind === "bill"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CreditCard size={14} className="text-amber-400" />
              {isId ? "Cicilan / Tagihan" : "Bill"}
            </button>
            <button
              type="button"
              data-testid="commitment-toggle-debt"
              onClick={() => setAddKind("debt")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                addKind === "debt"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowUpRight size={14} className="text-red-400" />
              {isId ? "Utang Saya" : "Debt"}
            </button>
            <button
              type="button"
              data-testid="commitment-toggle-receivable"
              onClick={() => setAddKind("receivable")}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                addKind === "receivable"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowDownLeft size={14} className="text-emerald-400" />
              {isId ? "Piutang" : "Receivable"}
            </button>
          </div>

          {addKind === "bill" ? (
            /* Bill / Installment Form */
            <form onSubmit={handleAddBill} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  {isId ? "Nama Tagihan / Cicilan" : "Bill / Installment Name"}
                </label>
                <input
                  data-testid="bill-name-input"
                  required
                  value={billForm.name}
                  onChange={(e) => setBillForm((v) => ({ ...v, name: e.target.value }))}
                  placeholder={isId ? "Contoh: Cicilan Motor, Netflix, Listrik PLN" : "e.g. Car Loan"}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    {isId ? "Nominal per Bayar (Rp)" : "Amount"}
                  </label>
                  <input
                    data-testid="bill-amount-input"
                    required
                    type="number"
                    min="1"
                    value={billForm.amount}
                    onChange={(e) => setBillForm((v) => ({ ...v, amount: e.target.value }))}
                    placeholder="500000"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 font-data text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    {isId ? "Kategori" : "Category"}
                  </label>
                  <select
                    value={billForm.category}
                    onChange={(e) => setBillForm((v) => ({ ...v, category: e.target.value }))}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs font-semibold outline-none focus:border-primary"
                  >
                    {categoryOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    {isId ? "Jatuh Tempo" : "Due Date"}
                  </label>
                  <input
                    data-testid="bill-date-input"
                    required
                    type="date"
                    value={billForm.nextDueDate}
                    onChange={(e) => setBillForm((v) => ({ ...v, nextDueDate: e.target.value }))}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    {isId ? "Frekuensi" : "Frequency"}
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <input
                      data-testid="bill-interval-input"
                      type="number"
                      min="1"
                      value={billForm.customInterval}
                      onChange={(e) => setBillForm((v) => ({ ...v, customInterval: e.target.value }))}
                      className="h-10 rounded-lg border border-border bg-background px-2 text-xs text-center outline-none focus:border-primary"
                    />
                    <select
                      value={billForm.frequency}
                      onChange={(e) => setBillForm((v) => ({ ...v, frequency: e.target.value as Bill["frequency"] }))}
                      className="col-span-2 h-10 rounded-lg border border-border bg-background px-2 text-xs font-medium outline-none focus:border-primary"
                    >
                      <option value="daily">{isId ? "Hari" : "Days"}</option>
                      <option value="weekly">{isId ? "Minggu" : "Weeks"}</option>
                      <option value="monthly">{isId ? "Bulan" : "Months"}</option>
                      <option value="yearly">{isId ? "Tahun" : "Years"}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  {isId ? "Sisa Kali Cicilan (Opsional — kosongkan jika tagihan rutin terus berjalan)" : "Remaining Count (Optional)"}
                </label>
                <input
                  data-testid="bill-installments-input"
                  type="number"
                  min="1"
                  value={billForm.remainingInstallments}
                  onChange={(e) => setBillForm((v) => ({ ...v, remainingInstallments: e.target.value }))}
                  placeholder={isId ? "Contoh: 12 (cicilan 12x)" : "e.g. 12"}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                />
              </div>

              <div className="mt-5 flex gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={handleCloseAdd} className="flex-1">
                  {isId ? "Batal" : "Cancel"}
                </Button>
                <Button data-testid="bill-create-button" type="submit" className="flex-1 gap-1.5">
                  <Check size={16} />
                  {isId ? "Simpan Tagihan/Cicilan" : "Save Bill"}
                </Button>
              </div>
            </form>
          ) : (
            /* Debt / Receivable Form */
            <form onSubmit={handleAddDebt} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  {isId ? "Keterangan Catatan" : "Record Description"}
                </label>
                <input
                  data-testid="commitment-name-input"
                  required
                  value={debtForm.name}
                  onChange={(e) => setDebtForm((v) => ({ ...v, name: e.target.value }))}
                  placeholder={isId ? "Contoh: Pinjaman Renovasi Rumah, Talangan Tiket" : "e.g. Project Loan"}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  {isId
                    ? addKind === "receivable"
                      ? "Nama Peminjam (Dia yang Berutang)"
                      : "Nama Pemberi Pinjaman / Lembaga"
                    : "Person / Organization"}
                </label>
                <input
                  data-testid="commitment-person-input"
                  required
                  value={debtForm.person}
                  onChange={(e) => setDebtForm((v) => ({ ...v, person: e.target.value }))}
                  placeholder={isId ? "Nama orang atau bank" : "e.g. John Doe / Bank BCA"}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    {isId ? "Total Nominal (Rp)" : "Total Amount"}
                  </label>
                  <input
                    data-testid="commitment-total-input"
                    required
                    type="number"
                    min="1"
                    value={debtForm.total}
                    onChange={(e) => setDebtForm((v) => ({ ...v, total: e.target.value }))}
                    placeholder="10000000"
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 font-data text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    {isId ? "Tenggat Waktu" : "Due Date"}
                  </label>
                  <input
                    required
                    type="date"
                    value={debtForm.dueDate}
                    onChange={(e) => setDebtForm((v) => ({ ...v, dueDate: e.target.value }))}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="mt-5 flex gap-2 pt-2">
                <Button type="button" variant="ghost" onClick={handleCloseAdd} className="flex-1">
                  {isId ? "Batal" : "Cancel"}
                </Button>
                <Button data-testid="commitment-create-button" type="submit" className="flex-1 gap-1.5">
                  <Check size={16} />
                  {isId
                    ? addKind === "receivable"
                      ? "Simpan Piutang"
                      : "Simpan Utang"
                    : "Save Record"}
                </Button>
              </div>
            </form>
          )}
        </BottomSheet>
      )}

      {/* ── Edit Bill Modal ── */}
      {editingBill && (
        <BottomSheet
          open
          onClose={() => setEditingBill(null)}
          testid="edit-bill-modal"
          eyebrow={isId ? "Edit Tagihan / Cicilan" : "Edit Bill"}
          title={editingBill.name}
        >
          <form onSubmit={handleSaveEditBill} className="space-y-3.5">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                {isId ? "Nama" : "Name"}
              </label>
              <input
                required
                value={editBillForm.name}
                onChange={(e) => setEditBillForm((f) => ({ ...f, name: e.target.value }))}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                {isId ? "Nominal per Pembayaran (Rp)" : "Amount"}
              </label>
              <input
                required
                type="number"
                min="1"
                value={editBillForm.amount}
                onChange={(e) => setEditBillForm((f) => ({ ...f, amount: e.target.value }))}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 font-data text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                {isId ? "Jatuh Tempo" : "Due Date"}
              </label>
              <input
                type="date"
                value={editBillForm.nextDueDate}
                onChange={(e) => setEditBillForm((f) => ({ ...f, nextDueDate: e.target.value }))}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-primary"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditingBill(null)} className="flex-1">
                {isId ? "Batal" : "Cancel"}
              </Button>
              <Button type="submit" className="flex-1 gap-1.5">
                <Check size={16} />
                {isId ? "Simpan Perubahan" : "Save Changes"}
              </Button>
            </div>
          </form>
        </BottomSheet>
      )}

      {/* ── Edit Debt Modal ── */}
      {editingDebt && (
        <BottomSheet
          open
          onClose={() => setEditingDebt(null)}
          testid="edit-debt-modal"
          eyebrow={isId ? "Edit Utang / Piutang" : "Edit Record"}
          title={editingDebt.name}
        >
          <form onSubmit={handleSaveEditDebt} className="space-y-3.5">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                {isId ? "Keterangan" : "Description"}
              </label>
              <input
                required
                value={editDebtForm.name}
                onChange={(e) => setEditDebtForm((f) => ({ ...f, name: e.target.value }))}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                {isId ? "Pihak Terkait (Orang / Lembaga)" : "Person / Organization"}
              </label>
              <input
                required
                value={editDebtForm.person}
                onChange={(e) => setEditDebtForm((f) => ({ ...f, person: e.target.value }))}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                {isId ? "Total Nominal (Rp)" : "Total Amount"}
              </label>
              <input
                required
                type="number"
                min="1"
                value={editDebtForm.total}
                onChange={(e) => setEditDebtForm((f) => ({ ...f, total: e.target.value }))}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 font-data text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                {isId ? "Jatuh Tempo" : "Due Date"}
              </label>
              <input
                type="date"
                value={editDebtForm.dueDate}
                onChange={(e) => setEditDebtForm((f) => ({ ...f, dueDate: e.target.value }))}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-primary"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setEditingDebt(null)} className="flex-1">
                {isId ? "Batal" : "Cancel"}
              </Button>
              <Button type="submit" className="flex-1 gap-1.5">
                <Check size={16} />
                {isId ? "Simpan Perubahan" : "Save Changes"}
              </Button>
            </div>
          </form>
        </BottomSheet>
      )}

      {/* ── Delete Confirmation Dialog ── */}
      {deletingTarget && (
        <BottomSheet
          open
          onClose={() => setDeletingTarget(null)}
          testid="delete-commitment-confirm-modal"
          eyebrow={isId ? "Konfirmasi Hapus" : "Confirm Deletion"}
          title={isId ? "Hapus Catatan Ini?" : "Delete Record?"}
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isId
                ? `Apakah Anda yakin ingin menghapus "${deletingTarget.name}"? Data komitmen ini akan dihapus.`
                : `Are you sure you want to delete "${deletingTarget.name}"?`}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setDeletingTarget(null)} className="flex-1">
                {isId ? "Batal" : "Cancel"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleConfirmDelete}
                className="flex-1 gap-1.5"
              >
                <Trash2 size={16} />
                {isId ? "Hapus" : "Delete"}
              </Button>
            </div>
          </div>
        </BottomSheet>
      )}

      {/* ── Payment Dialog ── */}
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