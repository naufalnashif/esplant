/**
 * GoalsPanel — Savings Goals dashboard (Tabungan).
 *
 * Implements:
 * - Dedicated Savings Goals (Tabungan) dashboard (Wishlist removed & merged into savings)
 * - Clean, sleek layout matching TransactionsPanel
 * - Mobile-friendly responsive KPI cards without horizontal overflow
 * - Single-column on mobile form fields to eliminate horizontal scroll
 * - Integrated with MobileNav FAB (no duplicate floating buttons)
 * - Quick deposit/withdraw (commit) dialog directly on goals
 * - Edit and delete goal modals with zero window.prompt/confirm
 */
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Calendar,
  Check,
  CheckCircle2,
  Pencil,
  Plus,
  Search,
  Target,
  Trash2,
  Wallet,
} from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import type * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/formatters";
import type { FinanceState, SavingsGoal } from "@/lib/localDb";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import {
  SectionHeading,
  KpiCard,
  GlassCard,
  SectionCardHeader,
  EmptyState,
} from "@/components/shared";

// ─── Sub-component: Savings Goal Card ───────────────────────────────────────

function SavingsGoalCard({
  goal,
  locale,
  baseCurrency,
  onCommitClick,
  onEdit,
  onDelete,
}: {
  goal: SavingsGoal;
  locale: FinanceState["locale"];
  baseCurrency: FinanceState["baseCurrency"];
  onCommitClick: (goal: SavingsGoal) => void;
  onEdit: (goal: SavingsGoal) => void;
  onDelete: (goal: SavingsGoal) => void;
}) {
  const isId = locale === "id";
  const progress = goal.target > 0
    ? Math.min(100, Math.round((goal.saved / goal.target) * 100))
    : 0;
  const isCompleted = goal.target > 0 && goal.saved >= goal.target;

  return (
    <div
      data-testid={`savings-goal-card-${goal.id}`}
      className="group relative flex flex-col justify-between rounded-2xl border border-border/70 bg-card/60 p-4 transition-all hover:border-primary/40 hover:bg-card/90 sm:p-5 min-w-0 max-w-full"
    >
      <div>
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className={`grid size-9 sm:size-10 shrink-0 place-items-center rounded-xl ${
                isCompleted ? "bg-emerald-500/15 text-emerald-400" : "bg-primary/15 text-primary"
              }`}
            >
              {isCompleted ? <CheckCircle2 size={18} /> : <Target size={18} />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-sm sm:text-base font-bold text-foreground">
                {goal.name}
              </p>
              {goal.targetDate && (
                <p className="flex items-center gap-1 text-[10px] text-muted-foreground truncate">
                  <Calendar size={11} className="shrink-0" /> {goal.targetDate}
                </p>
              )}
            </div>
          </div>
          <Badge
            variant="outline"
            className={`shrink-0 text-[10px] font-bold ${
              isCompleted ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : ""
            }`}
          >
            {isCompleted ? (isId ? "✓ Tercapai" : "✓ Goal Reached") : `${progress}%`}
          </Badge>
        </div>

        {/* Progress Bar */}
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isCompleted ? "bg-emerald-400" : "bg-primary"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="mt-2.5 flex items-baseline justify-between text-[11px] sm:text-xs">
          <div>
            <span className="text-[10px] text-muted-foreground block">{isId ? "Terkumpul" : "Saved"}</span>
            <span className="font-data font-bold text-foreground">
              {formatMoney(goal.saved, baseCurrency, locale)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-muted-foreground block">{isId ? "Target" : "Target"}</span>
            <span className="font-data font-semibold text-muted-foreground">
              {formatMoney(goal.target, baseCurrency, locale)}
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3 gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => onCommitClick(goal)}
          data-testid={`savings-commit-btn-${goal.id}`}
          className="h-8 gap-1.5 text-xs font-semibold hover:border-primary/50 hover:bg-primary/10 hover:text-primary flex-1 sm:flex-initial"
        >
          <Wallet size={13} />
          {isId ? "Tabung / Ambil" : "Deposit / Withdraw"}
        </Button>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            title={isId ? "Edit goal" : "Edit goal"}
            data-testid={`savings-edit-${goal.id}-button`}
            onClick={() => onEdit(goal)}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            title={isId ? "Hapus goal" : "Delete goal"}
            data-testid={`savings-delete-${goal.id}-button`}
            onClick={() => onDelete(goal)}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-red-400/10 hover:text-red-400"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main GoalsPanel ─────────────────────────────────────────────────────────

export function GoalsPanel({
  state,
  onSave,
  onCommit,
  showAddModalFromParent,
  onCloseAddModalFromParent,
}: {
  state: FinanceState;
  onSave: (next: FinanceState) => void;
  onCommit: (goal: SavingsGoal, amount: number, direction: "deposit" | "withdraw") => void;
  showAddModalFromParent?: boolean;
  onCloseAddModalFromParent?: () => void;
}) {
  const isId = state.locale === "id";

  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Sync with parent modal trigger if provided
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

  // Add Form State
  const [goalForm, setGoalForm] = useState({
    name: "",
    target: "",
    saved: "0",
    targetDate: "",
  });

  // Edit Goal State
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [editGoalForm, setEditGoalForm] = useState({ name: "", target: "", targetDate: "" });

  // Delete Confirm State
  const [deletingGoal, setDeletingGoal] = useState<SavingsGoal | null>(null);

  // Quick Commit Modal State
  const [commitTargetGoal, setCommitTargetGoal] = useState<SavingsGoal | null>(null);
  const [commitAmount, setCommitAmount] = useState("");
  const [commitDirection, setCommitDirection] = useState<"deposit" | "withdraw">("deposit");

  // KPI calculations
  const savedTotal = state.savings.reduce((sum, g) => sum + g.saved, 0);
  const targetTotal = state.savings.reduce((sum, g) => sum + g.target, 0);
  const overallProgress = targetTotal > 0 ? Math.min(100, Math.round((savedTotal / targetTotal) * 100)) : 0;

  // Filtered savings goals list
  const filteredGoals = useMemo(() => {
    return state.savings.filter((g) =>
      searchQuery ? g.name.toLowerCase().includes(searchQuery.toLowerCase()) : true,
    );
  }, [state.savings, searchQuery]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  // Add Savings Goal
  const handleCreateGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = Number(goalForm.target);
    const initialSaved = Number(goalForm.saved) || 0;
    if (!goalForm.name.trim() || !Number.isFinite(target) || target <= 0) {
      toast.error(isId ? "Isi nama goal dan nominal target valid." : "Valid name and target required.");
      return;
    }

    const newGoal: SavingsGoal = {
      id: `goal-${Date.now()}`,
      name: goalForm.name.trim(),
      target,
      saved: initialSaved,
      currency: state.baseCurrency,
      targetDate: goalForm.targetDate || new Date().toISOString().slice(0, 10),
      color: "#14b8a6",
    };

    onSave({ ...state, savings: [newGoal, ...state.savings] });
    setGoalForm({ name: "", target: "", saved: "0", targetDate: "" });
    handleCloseAdd();
    toast.success(isId ? `Goal "${newGoal.name}" ditambahkan!` : `Goal "${newGoal.name}" created!`);
  };

  // Save Edit Goal
  const handleSaveEditGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal) return;
    const target = Number(editGoalForm.target);
    if (!editGoalForm.name.trim() || !Number.isFinite(target) || target <= 0) return;

    onSave({
      ...state,
      savings: state.savings.map((g) =>
        g.id === editingGoal.id
          ? {
              ...g,
              name: editGoalForm.name.trim(),
              target,
              targetDate: editGoalForm.targetDate || g.targetDate || new Date().toISOString().slice(0, 10),
            }
          : g,
      ),
    });
    setEditingGoal(null);
    toast.success(isId ? "Goal tabungan diperbarui." : "Goal updated.");
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!deletingGoal) return;
    onSave({
      ...state,
      savings: state.savings.filter((g) => g.id !== deletingGoal.id),
    });
    toast.success(isId ? "Goal tabungan dihapus." : "Goal deleted.");
    setDeletingGoal(null);
  };

  // Commit Savings Form Submit
  const handleCommitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commitTargetGoal) return;
    const value = Number(commitAmount);
    if (!Number.isFinite(value) || value <= 0) {
      toast.error(isId ? "Nominal tidak valid." : "Invalid amount.");
      return;
    }
    onCommit(commitTargetGoal, value, commitDirection);
    setCommitTargetGoal(null);
    setCommitAmount("");
  };

  return (
    <div className="animate-rise-in pb-16 lg:pb-8">
      {/* ── Page Header ── */}
      <SectionHeading
        eyebrow="Future you / 04"
        title="Goals"
        description={
          isId
            ? "Kelola tabungan masa depan, celengan target, dan komitmen menabung Anda."
            : "Manage future savings targets, buckets, and commitment progress in one unified view."
        }
        action={
          <Button
            data-testid="goals-add-button"
            onClick={() => setIsAddOpen(true)}
            className="hidden gap-2 md:inline-flex"
          >
            <Plus size={17} />
            {isId ? "Tambah Goal" : "Add Goal"}
          </Button>
        }
      />

      {/* ── KPI Row (Responsive 2-Card Layout) ── */}
      <div className="mb-5 sm:mb-6 grid grid-cols-2 gap-3 sm:gap-4">
        <KpiCard
          testid="total-savings-kpi"
          icon={<Target size={18} />}
          tone="teal"
          label={isId ? "Total uang tertabung" : "Total saved"}
          value={formatMoney(savedTotal, state.baseCurrency, state.locale, true)}
          note={isId ? `Di ${state.savings.length} goals aktif` : `Across ${state.savings.length} active goals`}
        />
        <KpiCard
          testid="target-savings-kpi"
          icon={<ArrowUpFromLine size={18} />}
          tone="indigo"
          label={isId ? "Target tabungan" : "Target savings"}
          value={formatMoney(targetTotal, state.baseCurrency, state.locale, true)}
          note={isId ? `${overallProgress}% tercapai` : `${overallProgress}% achieved`}
        />
      </div>

      {/* ── Filter / Search Bar ── */}
      <div className="mb-5 flex items-center justify-between rounded-2xl border border-border/70 bg-card/75 p-3.5 backdrop-blur-xl sm:p-4">
        <p className="text-xs font-semibold text-muted-foreground hidden sm:block">
          {isId ? `Daftar Celengan (${state.savings.length})` : `Savings Buckets (${state.savings.length})`}
        </p>
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={isId ? "Cari target tabungan..." : "Search savings goals..."}
            className="h-9 w-full min-w-0 max-w-full rounded-lg border border-border bg-background pl-8 pr-3 text-xs outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* ── Savings Goals Grid ── */}
      <GlassCard as="section" className="p-4 sm:p-6">
        <SectionCardHeader
          eyebrow={isId ? "Target Tabungan" : "Savings Buckets"}
          title={isId ? "Celengan & Tabungan Masa Depan" : "Goals & Savings"}
          mb="mb-4"
        />

        {filteredGoals.length > 0 ? (
          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredGoals.map((goal) => (
              <SavingsGoalCard
                key={goal.id}
                goal={goal}
                locale={state.locale}
                baseCurrency={state.baseCurrency}
                onCommitClick={(g) => {
                  setCommitTargetGoal(g);
                  setCommitAmount("");
                  setCommitDirection("deposit");
                }}
                onEdit={(g) => {
                  setEditingGoal(g);
                  setEditGoalForm({
                    name: g.name,
                    target: String(g.target),
                    targetDate: g.targetDate || "",
                  });
                }}
                onDelete={(g) => setDeletingGoal(g)}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            message={
              isId
                ? "Belum ada target tabungan. Tekan tombol Tambah untuk membuat celengan baru."
                : "No savings goals found. Tap Add Goal to set up a new target."
            }
          />
        )}
      </GlassCard>

      {/* ── Add Savings Goal Modal ── */}
      {isAddOpen && (
        <BottomSheet
          open
          onClose={handleCloseAdd}
          testid="add-goal-modal"
          eyebrow={isId ? "Target Baru" : "New Target"}
          title={isId ? "Tambah Target Tabungan" : "Add Savings Goal"}
        >
          <form onSubmit={handleCreateGoal} className="space-y-3.5">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                {isId ? "Nama Goal / Celengan" : "Goal Name"}
              </label>
              <input
                data-testid="savings-name-input"
                required
                value={goalForm.name}
                onChange={(e) => setGoalForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={isId ? "Contoh: Dana Darurat, Beli Rumah, Tabungan Liburan" : "e.g. Emergency Fund"}
                className="h-10 w-full min-w-0 max-w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0 max-w-full">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  {isId ? "Target Nominal (Rp)" : "Target Amount"}
                </label>
                <input
                  data-testid="savings-target-input"
                  required
                  type="number"
                  min="1"
                  value={goalForm.target}
                  onChange={(e) => setGoalForm((f) => ({ ...f, target: e.target.value }))}
                  placeholder="10000000"
                  className="h-10 w-full min-w-0 max-w-full rounded-lg border border-border bg-background px-3 font-data text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="min-w-0 max-w-full">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  {isId ? "Saldo Awal (Opsional)" : "Initial Saved"}
                </label>
                <input
                  data-testid="savings-initial-saved-input"
                  type="number"
                  min="0"
                  value={goalForm.saved}
                  onChange={(e) => setGoalForm((f) => ({ ...f, saved: e.target.value }))}
                  placeholder="0"
                  className="h-10 w-full min-w-0 max-w-full rounded-lg border border-border bg-background px-3 font-data text-sm outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                {isId ? "Target Tanggal (Opsional)" : "Target Date (Optional)"}
              </label>
              <input
                data-testid="savings-date-input"
                type="date"
                value={goalForm.targetDate}
                onChange={(e) => setGoalForm((f) => ({ ...f, targetDate: e.target.value }))}
                className="h-10 w-full min-w-0 max-w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-primary appearance-none"
              />
            </div>

            <div className="mt-5 flex gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleCloseAdd}
                className="flex-1"
              >
                {isId ? "Batal" : "Cancel"}
              </Button>
              <Button
                type="submit"
                data-testid="savings-submit-btn"
                className="flex-1 gap-1.5"
              >
                <Check size={16} />
                {isId ? "Simpan Goal" : "Save Goal"}
              </Button>
            </div>
          </form>
        </BottomSheet>
      )}

      {/* ── Quick Commit / Withdraw Modal ── */}
      {commitTargetGoal && (
        <BottomSheet
          open
          onClose={() => setCommitTargetGoal(null)}
          testid="savings-commit-modal"
          eyebrow={isId ? "Aksi Tabungan" : "Savings Action"}
          title={`${isId ? "Tabung / Ambil:" : "Deposit / Withdraw:"} ${commitTargetGoal.name}`}
        >
          <form onSubmit={handleCommitSubmit} className="space-y-4">
            <div className="flex rounded-xl bg-secondary/80 p-1">
              <button
                type="button"
                data-testid="savings-deposit-toggle"
                onClick={() => setCommitDirection("deposit")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                  commitDirection === "deposit"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ArrowUpFromLine size={14} />
                {isId ? "Menabung (Deposit)" : "Deposit"}
              </button>
              <button
                type="button"
                data-testid="savings-withdraw-toggle"
                onClick={() => setCommitDirection("withdraw")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-bold transition-all ${
                  commitDirection === "withdraw"
                    ? "bg-amber-400 text-slate-900 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ArrowDownToLine size={14} />
                {isId ? "Ambil Tabungan" : "Withdraw"}
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                {isId ? "Nominal Transaksi (Rp)" : "Transaction Amount"}
              </label>
              <input
                data-testid="savings-commit-amount-input"
                required
                type="number"
                min="1"
                value={commitAmount}
                onChange={(e) => setCommitAmount(e.target.value)}
                placeholder="Nominal"
                className="h-11 w-full min-w-0 max-w-full rounded-lg border border-border bg-background px-3 font-data text-base font-bold outline-none focus:border-primary"
              />
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {isId
                  ? commitDirection === "deposit"
                    ? "Mengurangi saldo akun dan menambahkan ke tabungan ini."
                    : "Menambah saldo akun dan mengurangi tabungan ini."
                  : commitDirection === "deposit"
                  ? "Transfers from your balance into this savings goal."
                  : "Withdraws from savings back into your active balance."}
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCommitTargetGoal(null)}
                className="flex-1"
              >
                {isId ? "Batal" : "Cancel"}
              </Button>
              <Button
                type="submit"
                data-testid="savings-commit-submit-button"
                className="flex-1 gap-1.5"
              >
                <Check size={16} />
                {commitDirection === "deposit"
                  ? isId
                    ? "Commit Tabung"
                    : "Commit Deposit"
                  : isId
                  ? "Tarik Dana"
                  : "Withdraw"}
              </Button>
            </div>
          </form>
        </BottomSheet>
      )}

      {/* ── Edit Savings Goal Modal ── */}
      {editingGoal && (
        <BottomSheet
          open
          onClose={() => setEditingGoal(null)}
          testid="edit-goal-modal"
          eyebrow={isId ? "Edit Goal" : "Edit Goal"}
          title={editingGoal.name}
        >
          <form onSubmit={handleSaveEditGoal} className="space-y-3.5">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                {isId ? "Nama Goal" : "Goal Name"}
              </label>
              <input
                required
                value={editGoalForm.name}
                onChange={(e) =>
                  setEditGoalForm((f) => ({ ...f, name: e.target.value }))
                }
                className="h-10 w-full min-w-0 max-w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="min-w-0 max-w-full">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  {isId ? "Target Nominal (Rp)" : "Target Amount"}
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  value={editGoalForm.target}
                  onChange={(e) =>
                    setEditGoalForm((f) => ({ ...f, target: e.target.value }))
                  }
                  className="h-10 w-full min-w-0 max-w-full rounded-lg border border-border bg-background px-3 font-data text-sm outline-none focus:border-primary"
                />
              </div>
              <div className="min-w-0 max-w-full">
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  {isId ? "Target Tanggal (Opsional)" : "Target Date (Optional)"}
                </label>
                <input
                  type="date"
                  value={editGoalForm.targetDate}
                  onChange={(e) =>
                    setEditGoalForm((f) => ({ ...f, targetDate: e.target.value }))
                  }
                  className="h-10 w-full min-w-0 max-w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-primary appearance-none"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingGoal(null)}
                className="flex-1"
              >
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
      {deletingGoal && (
        <BottomSheet
          open
          onClose={() => setDeletingGoal(null)}
          testid="delete-confirm-modal"
          eyebrow={isId ? "Konfirmasi Hapus" : "Confirm Deletion"}
          title={isId ? "Hapus Goal Ini?" : "Delete This Goal?"}
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isId
                ? `Apakah Anda yakin ingin menghapus goal "${deletingGoal.name}"? Tindakan ini tidak dapat dibatalkan.`
                : `Are you sure you want to delete "${deletingGoal.name}"? This action cannot be undone.`}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeletingGoal(null)}
                className="flex-1"
              >
                {isId ? "Batal" : "Cancel"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                data-testid="confirm-delete-button"
                onClick={handleConfirmDelete}
                className="flex-1 gap-1.5"
              >
                <Trash2 size={16} />
                {isId ? "Hapus Permanen" : "Delete Permanently"}
              </Button>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}