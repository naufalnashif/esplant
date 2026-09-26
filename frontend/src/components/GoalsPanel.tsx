/**
 * GoalsPanel — Unified Savings Goals and Wishlist dashboard.
 *
 * Implements:
 * - Unified "Goals" hub combining Savings Goals and Wishlist
 * - Clean, compact aesthetic matching TransactionsPanel
 * - Mobile-friendly KPI cards with overflow guards and clean typography
 * - Modal / BottomSheet for adding goals with category selector (Tabungan / Wishlist)
 *   to minimize scrolling and streamline navigation
 * - Floating Action Button (FAB) for adding goals on mobile/screen
 * - View filter tabs: Semua | Tabungan | Wishlist
 * - In-place commit (deposit/withdraw) dialog without cluttering the page
 * - Full CRUD with no window.prompt/confirm
 */
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Calendar,
  Check,
  CheckCircle2,
  Lightbulb,
  Pencil,
  Plus,
  Search,
  Target,
  Trash2,
  Wallet,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type * as React from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/formatters";
import type { FinanceState, SavingsGoal, WishlistItem } from "@/lib/localDb";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import {
  SectionHeading,
  KpiCard,
  GlassCard,
  SectionCardHeader,
  EmptyState,
} from "@/components/shared";

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

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
      className="group relative flex flex-col justify-between rounded-2xl border border-border/70 bg-card/60 p-4 transition-all hover:border-primary/40 hover:bg-card/90 sm:p-5"
    >
      <div>
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`grid size-9 sm:size-10 shrink-0 place-items-center rounded-xl ${
              isCompleted ? "bg-emerald-500/15 text-emerald-400" : "bg-primary/15 text-primary"
            }`}>
              {isCompleted ? <CheckCircle2 size={18} /> : <Target size={18} />}
            </div>
            <div className="min-w-0">
              <p className="truncate font-heading text-sm sm:text-base font-bold text-foreground">
                {goal.name}
              </p>
              {goal.targetDate && (
                <p className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Calendar size={11} /> {goal.targetDate}
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

// ─── Sub-component: Wishlist Item Row ───────────────────────────────────────

function WishlistRow({
  item,
  locale,
  baseCurrency,
  onEdit,
  onDelete,
}: {
  item: WishlistItem;
  locale: FinanceState["locale"];
  baseCurrency: FinanceState["baseCurrency"];
  onEdit: (item: WishlistItem) => void;
  onDelete: (item: WishlistItem) => void;
}) {
  const isId = locale === "id";
  const priorityColors = {
    high: "border-red-500/30 bg-red-500/10 text-red-400",
    medium: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    low: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  };
  const priorityLabels = {
    high: isId ? "Prioritas Tinggi" : "High Priority",
    medium: isId ? "Prioritas Sedang" : "Medium Priority",
    low: isId ? "Prioritas Rendah" : "Low Priority",
  };

  return (
    <div
      data-testid={`wishlist-card-${item.id}`}
      className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 p-3.5 transition-colors hover:border-amber-500/30 sm:p-4"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-500/15 text-amber-400">
          <Lightbulb size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-semibold text-foreground">{item.name}</p>
            {item.category && (
              <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                {item.category}
              </Badge>
            )}
            {item.priority && (
              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${priorityColors[item.priority] || ""}`}>
                {priorityLabels[item.priority]}
              </Badge>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-data font-bold text-foreground">
              {formatMoney(item.price, baseCurrency, locale)}
            </span>
            {item.targetDate && (
              <span className="flex items-center gap-1 text-[10px]">
                · <Calendar size={10} /> {item.targetDate}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          data-testid={`wishlist-edit-${item.id}-button`}
          onClick={() => onEdit(item)}
          className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary"
        >
          <Pencil size={13} />
        </button>
        <button
          type="button"
          data-testid={`wishlist-delete-${item.id}-button`}
          onClick={() => onDelete(item)}
          className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-red-400/10 hover:text-red-400"
        >
          <Trash2 size={13} />
        </button>
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

  // Tab filter: all | savings | wishlist
  const [activeTab, setActiveTab] = useState<"all" | "savings" | "wishlist">("all");
  const [wishlistCategoryFilter, setWishlistCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Modal states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addCategory, setAddCategory] = useState<"savings" | "wishlist">("savings");

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

  const [wishForm, setWishForm] = useState({
    name: "",
    price: "",
    category: "Lifestyle",
    priority: "medium" as WishlistItem["priority"],
    targetDate: "",
  });

  // Edit Goal State
  const [editingGoal, setEditingGoal] = useState<SavingsGoal | null>(null);
  const [editGoalForm, setEditGoalForm] = useState({ name: "", target: "", targetDate: "" });

  // Edit Wishlist State
  const [editingWish, setEditingWish] = useState<WishlistItem | null>(null);
  const [editWishForm, setEditWishForm] = useState({
    name: "",
    price: "",
    category: "Lifestyle",
    priority: "medium" as WishlistItem["priority"],
    targetDate: "",
  });

  // Delete Confirm State
  const [deletingItem, setDeletingItem] = useState<{
    type: "goal" | "wish";
    id: string;
    name: string;
  } | null>(null);

  // Quick Commit Modal State
  const [commitTargetGoal, setCommitTargetGoal] = useState<SavingsGoal | null>(null);
  const [commitAmount, setCommitAmount] = useState("");
  const [commitDirection, setCommitDirection] = useState<"deposit" | "withdraw">("deposit");

  // Categories list for wishlist
  const wishlistCategories = useMemo(
    () =>
      Array.from(
        new Set([
          "Lifestyle",
          "Gadget",
          "Travel",
          "Work",
          "Home",
          "Education",
          "Health",
          "Other",
          ...state.categories.filter((c) => !c.archived).map((c) => c.name),
          ...state.wishlist.map((w) => w.category).filter(Boolean),
        ]),
      ),
    [state.categories, state.wishlist],
  );

  // KPI calculations
  const savedTotal = state.savings.reduce((sum, g) => sum + g.saved, 0);
  const targetTotal = state.savings.reduce((sum, g) => sum + g.target, 0);
  const totalWishlistPrice = state.wishlist.reduce((sum, w) => sum + w.price, 0);
  const overallProgress = targetTotal > 0 ? Math.min(100, Math.round((savedTotal / targetTotal) * 100)) : 0;

  // Filtered lists
  const filteredGoals = useMemo(() => {
    return state.savings.filter((g) =>
      searchQuery ? g.name.toLowerCase().includes(searchQuery.toLowerCase()) : true,
    );
  }, [state.savings, searchQuery]);

  const filteredWishlist = useMemo(() => {
    return state.wishlist.filter((w) => {
      const matchCat = wishlistCategoryFilter === "all" || w.category === wishlistCategoryFilter;
      const matchSearch = searchQuery
        ? w.name.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      return matchCat && matchSearch;
    });
  }, [state.wishlist, wishlistCategoryFilter, searchQuery]);

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

  // Add Wishlist Item
  const handleCreateWish = (e: React.FormEvent) => {
    e.preventDefault();
    const price = Number(wishForm.price);
    if (!wishForm.name.trim() || !Number.isFinite(price) || price <= 0) {
      toast.error(isId ? "Isi nama wishlist dan harga valid." : "Valid name and price required.");
      return;
    }

    const newWish: WishlistItem = {
      id: uid(),
      name: wishForm.name.trim(),
      price,
      currency: state.baseCurrency,
      priority: wishForm.priority,
      targetDate: wishForm.targetDate || new Date().toISOString().slice(0, 10),
      category: wishForm.category,
      status: "planning",
    };

    onSave({ ...state, wishlist: [newWish, ...state.wishlist] });
    setWishForm({
      name: "",
      price: "",
      category: "Lifestyle",
      priority: "medium",
      targetDate: "",
    });
    handleCloseAdd();
    toast.success(isId ? `Wishlist "${newWish.name}" ditambahkan!` : `Wishlist item created!`);
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

  // Save Edit Wishlist
  const handleSaveEditWish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWish) return;
    const price = Number(editWishForm.price);
    if (!editWishForm.name.trim() || !Number.isFinite(price) || price <= 0) return;

    onSave({
      ...state,
      wishlist: state.wishlist.map((w) =>
        w.id === editingWish.id
          ? {
              ...w,
              name: editWishForm.name.trim(),
              price,
              category: editWishForm.category,
              priority: editWishForm.priority,
              targetDate: editWishForm.targetDate || w.targetDate || new Date().toISOString().slice(0, 10),
            }
          : w,
      ),
    });
    setEditingWish(null);
    toast.success(isId ? "Wishlist diperbarui." : "Wishlist updated.");
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!deletingItem) return;
    if (deletingItem.type === "goal") {
      onSave({
        ...state,
        savings: state.savings.filter((g) => g.id !== deletingItem.id),
      });
      toast.success(isId ? "Goal tabungan dihapus." : "Goal deleted.");
    } else {
      onSave({
        ...state,
        wishlist: state.wishlist.filter((w) => w.id !== deletingItem.id),
      });
      toast.success(isId ? "Wishlist dihapus." : "Wishlist deleted.");
    }
    setDeletingItem(null);
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
            ? "Kelola tabungan masa depan dan daftar wishlist impian dalam satu dashboard."
            : "Manage savings targets and dream wishlist items in one unified dashboard."
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

      {/* ── KPI Row (Responsive & Mobile-Friendly) ── */}
      <div className="mb-5 sm:mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <KpiCard
          testid="total-savings-kpi"
          icon={<Target size={18} />}
          tone="teal"
          label={isId ? "Total uang tertabung" : "Total saved"}
          value={formatMoney(savedTotal, state.baseCurrency, state.locale, true)}
          note={isId ? `Di ${state.savings.length} goals` : `Across ${state.savings.length} goals`}
        />
        <KpiCard
          testid="target-savings-kpi"
          icon={<ArrowUpFromLine size={18} />}
          tone="indigo"
          label={isId ? "Target tabungan" : "Target savings"}
          value={formatMoney(targetTotal, state.baseCurrency, state.locale, true)}
          note={isId ? `${overallProgress}% tercapai` : `${overallProgress}% achieved`}
        />
        <KpiCard
          testid="wishlist-kpi"
          icon={<Lightbulb size={18} />}
          tone="amber"
          label={isId ? "Wishlist impian" : "Wishlist items"}
          value={`${state.wishlist.length}`}
          note={isId ? `Total ${formatMoney(totalWishlistPrice, state.baseCurrency, state.locale, true)}` : `Total ${formatMoney(totalWishlistPrice, state.baseCurrency, state.locale, true)}`}
          className="col-span-2 sm:col-span-1"
        />
      </div>

      {/* ── Filter / View Switcher (TransactionsPanel Style) ── */}
      <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/75 p-3.5 backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between sm:p-4">
        {/* Tab Pills */}
        <div className="flex rounded-xl bg-secondary/80 p-1">
          <button
            type="button"
            data-testid="goals-tab-all"
            onClick={() => setActiveTab("all")}
            className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all sm:flex-initial ${
              activeTab === "all"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {isId ? "Semua" : "All"} ({state.savings.length + state.wishlist.length})
          </button>
          <button
            type="button"
            data-testid="goals-tab-savings"
            onClick={() => setActiveTab("savings")}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex-1 sm:flex-initial ${
              activeTab === "savings"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Target size={13} className="text-primary" />
            {isId ? "Tabungan" : "Savings"} ({state.savings.length})
          </button>
          <button
            type="button"
            data-testid="goals-tab-wishlist"
            onClick={() => setActiveTab("wishlist")}
            className={`flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all flex-1 sm:flex-initial ${
              activeTab === "wishlist"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Lightbulb size={13} className="text-amber-400" />
            Wishlist ({state.wishlist.length})
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-48">
            <Search size={14} className="absolute left-3 top-2.5 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isId ? "Cari nama..." : "Search..."}
              className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-xs outline-none focus:border-primary"
            />
          </div>

          {(activeTab === "wishlist" || activeTab === "all") && (
            <select
              data-testid="wishlist-category-filter"
              value={wishlistCategoryFilter}
              onChange={(e) => setWishlistCategoryFilter(e.target.value)}
              className="h-9 rounded-lg border border-border bg-background px-2.5 text-xs font-semibold outline-none focus:border-primary"
            >
              <option value="all">{isId ? "Semua Kategori" : "All Categories"}</option>
              {wishlistCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ── Content Grid ── */}
      <div className="space-y-6">
        {/* Savings Section (shown on 'all' or 'savings') */}
        {(activeTab === "all" || activeTab === "savings") && (
          <GlassCard as="section" className="p-4 sm:p-6">
            <SectionCardHeader
              eyebrow={isId ? "Target Tabungan" : "Savings Buckets"}
              title={isId ? "Celengan & Tabungan Masa Depan" : "Goals & Savings"}
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAddCategory("savings");
                    setIsAddOpen(true);
                  }}
                  className="gap-1 text-xs font-semibold"
                >
                  <Plus size={14} />
                  {isId ? "Tambah Tabungan" : "Add Savings"}
                </Button>
              }
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
                    onDelete={(g) =>
                      setDeletingItem({ type: "goal", id: g.id, name: g.name })
                    }
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
        )}

        {/* Wishlist Section (shown on 'all' or 'wishlist') */}
        {(activeTab === "all" || activeTab === "wishlist") && (
          <GlassCard as="section" className="p-4 sm:p-6">
            <SectionCardHeader
              eyebrow="Wants & Plans"
              title={isId ? "Wishlist Impian" : "Wishlist Items"}
              action={
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAddCategory("wishlist");
                    setIsAddOpen(true);
                  }}
                  className="gap-1 text-xs font-semibold"
                >
                  <Plus size={14} />
                  {isId ? "Tambah Wishlist" : "Add Wishlist"}
                </Button>
              }
              mb="mb-4"
            />

            {filteredWishlist.length > 0 ? (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {filteredWishlist.map((wish) => (
                  <WishlistRow
                    key={wish.id}
                    item={wish}
                    locale={state.locale}
                    baseCurrency={state.baseCurrency}
                    onEdit={(w) => {
                      setEditingWish(w);
                      setEditWishForm({
                        name: w.name,
                        price: String(w.price),
                        category: w.category || "Lifestyle",
                        priority: w.priority || "medium",
                        targetDate: w.targetDate || "",
                      });
                    }}
                    onDelete={(w) =>
                      setDeletingItem({ type: "wish", id: w.id, name: w.name })
                    }
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                message={
                  isId
                    ? "Belum ada wishlist pada kategori ini. Tekan tombol Tambah untuk menambahkan impian Anda."
                    : "No wishlist items found. Tap Add to record a new want."
                }
              />
            )}
          </GlassCard>
        )}
      </div>

      {/* ── Floating Action Button (FAB) on Screen ── */}
      <button
        type="button"
        data-testid="goals-fab-button"
        aria-label={isId ? "Tambah Goal atau Wishlist" : "Add Goal or Wishlist"}
        onClick={() => setIsAddOpen(true)}
        className="fixed bottom-[84px] right-4 z-30 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95 lg:hidden"
      >
        <Plus size={24} />
      </button>

      {/* ── Unified Add Goal Modal with Category Selector ── */}
      {isAddOpen && (
        <BottomSheet
          open
          onClose={handleCloseAdd}
          testid="add-goal-modal"
          eyebrow={isId ? "Tambah Target Baru" : "Add New Target"}
          title={isId ? "Tambah ke Goals" : "Add to Goals"}
        >
          {/* Category Selector Tabs */}
          <div className="mb-4 flex rounded-xl bg-secondary/80 p-1">
            <button
              type="button"
              data-testid="category-toggle-savings"
              onClick={() => setAddCategory("savings")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-all ${
                addCategory === "savings"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Target size={16} className="text-primary" />
              {isId ? "Tabungan (Goals)" : "Savings Goal"}
            </button>
            <button
              type="button"
              data-testid="category-toggle-wishlist"
              onClick={() => setAddCategory("wishlist")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-xs font-bold transition-all ${
                addCategory === "wishlist"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Lightbulb size={16} className="text-amber-400" />
              {isId ? "Wishlist Impian" : "Wishlist Item"}
            </button>
          </div>

          {addCategory === "savings" ? (
            /* Savings Goal Form */
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
                  placeholder={isId ? "Contoh: Dana Darurat, Beli Rumah" : "e.g. Emergency Fund"}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
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
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 font-data text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
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
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 font-data text-sm outline-none focus:border-primary"
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
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-primary"
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
          ) : (
            /* Wishlist Form */
            <form onSubmit={handleCreateWish} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  {isId ? "Nama Barang / Rencana" : "Item / Plan Name"}
                </label>
                <input
                  data-testid="wishlist-name-input"
                  required
                  value={wishForm.name}
                  onChange={(e) => setWishForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder={isId ? "Contoh: MacBook Pro M3, Liburan Jepang" : "e.g. New Laptop"}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  {isId ? "Estimasi Harga (Rp)" : "Estimated Price"}
                </label>
                <input
                  data-testid="wishlist-price-input"
                  required
                  type="number"
                  min="1"
                  value={wishForm.price}
                  onChange={(e) => setWishForm((f) => ({ ...f, price: e.target.value }))}
                  placeholder="25000000"
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 font-data text-sm outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    {isId ? "Kategori" : "Category"}
                  </label>
                  <select
                    data-testid="wishlist-category-select"
                    value={wishForm.category}
                    onChange={(e) => setWishForm((f) => ({ ...f, category: e.target.value }))}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs font-semibold outline-none focus:border-primary"
                  >
                    {wishlistCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                    {isId ? "Prioritas" : "Priority"}
                  </label>
                  <select
                    data-testid="wishlist-priority-select"
                    value={wishForm.priority}
                    onChange={(e) =>
                      setWishForm((f) => ({
                        ...f,
                        priority: e.target.value as WishlistItem["priority"],
                      }))
                    }
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs font-semibold outline-none focus:border-primary"
                  >
                    <option value="high">{isId ? "Tinggi" : "High"}</option>
                    <option value="medium">{isId ? "Sedang" : "Medium"}</option>
                    <option value="low">{isId ? "Rendah" : "Low"}</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  {isId ? "Target Tanggal (Opsional)" : "Target Date (Optional)"}
                </label>
                <input
                  data-testid="wishlist-date-input"
                  type="date"
                  value={wishForm.targetDate}
                  onChange={(e) => setWishForm((f) => ({ ...f, targetDate: e.target.value }))}
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-primary"
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
                  data-testid="wishlist-submit-button"
                  className="flex-1 gap-1.5"
                >
                  <Check size={16} />
                  {isId ? "Simpan Wishlist" : "Save Wishlist"}
                </Button>
              </div>
            </form>
          )}
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
                autoFocus
                value={commitAmount}
                onChange={(e) => setCommitAmount(e.target.value)}
                placeholder="Nominal"
                className="h-11 w-full rounded-lg border border-border bg-background px-3 font-data text-base font-bold outline-none focus:border-primary"
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
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
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
                className="h-10 w-full rounded-lg border border-border bg-background px-3 font-data text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                {isId ? "Target Tanggal (Opsional)" : "Target Date (Optional)"}
              </label>
              <input
                type="date"
                value={editGoalForm.targetDate}
                onChange={(e) =>
                  setEditGoalForm((f) => ({ ...f, targetDate: e.target.value }))
                }
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-primary"
              />
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

      {/* ── Edit Wishlist Modal ── */}
      {editingWish && (
        <BottomSheet
          open
          onClose={() => setEditingWish(null)}
          testid="wishlist-edit-modal"
          eyebrow={isId ? "Edit Wishlist" : "Edit Wishlist"}
          title={editingWish.name}
        >
          <form onSubmit={handleSaveEditWish} className="space-y-3.5">
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                {isId ? "Nama Wishlist" : "Item Name"}
              </label>
              <input
                data-testid="wishlist-edit-name-input"
                required
                value={editWishForm.name}
                onChange={(e) =>
                  setEditWishForm((f) => ({ ...f, name: e.target.value }))
                }
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                {isId ? "Estimasi Harga (Rp)" : "Estimated Price"}
              </label>
              <input
                data-testid="wishlist-edit-price-input"
                required
                type="number"
                min="1"
                value={editWishForm.price}
                onChange={(e) =>
                  setEditWishForm((f) => ({ ...f, price: e.target.value }))
                }
                className="h-10 w-full rounded-lg border border-border bg-background px-3 font-data text-sm outline-none focus:border-primary"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  {isId ? "Kategori" : "Category"}
                </label>
                <select
                  value={editWishForm.category}
                  onChange={(e) =>
                    setEditWishForm((f) => ({ ...f, category: e.target.value }))
                  }
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs font-semibold outline-none focus:border-primary"
                >
                  {wishlistCategories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                  {isId ? "Prioritas" : "Priority"}
                </label>
                <select
                  value={editWishForm.priority}
                  onChange={(e) =>
                    setEditWishForm((f) => ({
                      ...f,
                      priority: e.target.value as WishlistItem["priority"],
                    }))
                  }
                  className="h-10 w-full rounded-lg border border-border bg-background px-3 text-xs font-semibold outline-none focus:border-primary"
                >
                  <option value="high">{isId ? "Tinggi" : "High"}</option>
                  <option value="medium">{isId ? "Sedang" : "Medium"}</option>
                  <option value="low">{isId ? "Rendah" : "Low"}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingWish(null)}
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
      {deletingItem && (
        <BottomSheet
          open
          onClose={() => setDeletingItem(null)}
          testid="delete-confirm-modal"
          eyebrow={isId ? "Konfirmasi Hapus" : "Confirm Deletion"}
          title={isId ? "Hapus Item Ini?" : "Delete This Item?"}
        >
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {isId
                ? `Apakah Anda yakin ingin menghapus "${deletingItem.name}"? Tindakan ini tidak dapat dibatalkan.`
                : `Are you sure you want to delete "${deletingItem.name}"? This action cannot be undone.`}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setDeletingItem(null)}
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