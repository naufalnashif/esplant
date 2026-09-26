/**
 * GoalsPanel — Savings goals, wishlist management, and savings commit/withdraw.
 *
 * Refactored with:
 * - Shared component library (SectionHeading, KpiCard, GlassCard, SectionCardHeader, EmptyState)
 * - Bug fixes:
 *   1. goalId stale fix — syncs via useEffect when savings change
 *   2. formatMoney from shared lib (no more local money() duplicate)
 *   3. wishlistCategories synced with state.categories + state.wishlist
 *   4. onSave prop for self-contained state management (no more wishForm prop drilling)
 *   5. Empty savings guard — CommitForm hidden when no goals exist
 *   6. Progress bar NaN/Infinity guard — target === 0 → 0%
 *   7. goalId stale guard — fallback to first goal after savings list changes
 *   8. WishlistManager edit uses inline UI via BottomSheet (no window.prompt)
 *   9. Component broken into named sub-components for readability
 */
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  Lightbulb,
  Pencil,
  Plus,
  Target,
  Trash2,
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

// ─── Sub-component: single savings goal card ────────────────────────────────

function SavingsGoalCard({
  goal,
  locale,
  baseCurrency,
}: {
  goal: SavingsGoal;
  locale: FinanceState["locale"];
  baseCurrency: FinanceState["baseCurrency"];
}) {
  // Bug 6 fix: guard against target === 0 to prevent NaN/Infinity
  const progress = goal.target > 0
    ? Math.min(100, Math.round((goal.saved / goal.target) * 100))
    : 0;

  return (
    <div className="rounded-2xl border border-border/60 bg-background/35 p-4">
      <div className="mb-4 flex items-start justify-between">
        <div className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
          <Target size={18} />
        </div>
        <Badge variant="outline">{progress}%</Badge>
      </div>
      <p className="font-heading text-base font-bold">{goal.name}</p>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-[10px] font-semibold text-muted-foreground">
        <span>{formatMoney(goal.saved, baseCurrency, locale)}</span>
        <span>{formatMoney(goal.target, baseCurrency, locale)}</span>
      </div>
    </div>
  );
}

// ─── Sub-component: commit/withdraw form ────────────────────────────────────

function CommitForm({
  savings,
  locale,
  onCommit,
}: {
  savings: SavingsGoal[];
  locale: FinanceState["locale"];
  onCommit: (goal: SavingsGoal, amount: number, direction: "deposit" | "withdraw") => void;
}) {
  const isId = locale === "id";
  // Bug 1 & 7 fix: initialise from first goal; keep goalId synced when savings list changes
  const [goalId, setGoalId] = useState(savings[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"deposit" | "withdraw">("deposit");

  // Bug 7 fix: if current goalId no longer exists in savings, reset to first available
  useEffect(() => {
    if (!savings.find((g) => g.id === goalId)) {
      setGoalId(savings[0]?.id ?? "");
    }
  }, [savings, goalId]);

  // Bug 5 fix: guard against empty savings list
  if (savings.length === 0) {
    return (
      <EmptyState
        message={isId ? "Tambahkan goals tabungan terlebih dahulu." : "Add a savings goal first."}
      />
    );
  }

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return;
    const goal = savings.find((g) => g.id === goalId);
    if (!goal) return;
    onCommit(goal, value, direction);
    setAmount("");
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <select
          data-testid="savings-goal-select"
          value={goalId}
          onChange={(e) => setGoalId(e.target.value)}
          className="h-10 rounded-lg border border-border bg-background px-3 text-xs font-semibold"
        >
          {savings.map((goal) => (
            <option key={goal.id} value={goal.id} label={goal.name} />
          ))}
        </select>
        <input
          data-testid="savings-commit-amount-input"
          required
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Nominal"
          className="h-10 rounded-lg border border-border bg-background px-3 font-data text-xs outline-none focus:border-primary"
        />
        <Button data-testid="savings-commit-submit-button" type="submit" className="h-10 gap-2">
          <Check size={14} />
          {direction === "deposit" ? "Commit" : "Withdraw"}
        </Button>
      </form>
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          data-testid="savings-deposit-toggle"
          onClick={() => setDirection("deposit")}
          className={`flex items-center gap-1 rounded-lg px-3 py-2 text-[10px] font-bold ${
            direction === "deposit"
              ? "bg-primary text-primary-foreground"
              : "border border-border text-muted-foreground"
          }`}
        >
          <ArrowUpFromLine size={12} /> {isId ? "Menabung" : "Deposit"}
        </button>
        <button
          type="button"
          data-testid="savings-withdraw-toggle"
          onClick={() => setDirection("withdraw")}
          className={`flex items-center gap-1 rounded-lg px-3 py-2 text-[10px] font-bold ${
            direction === "withdraw"
              ? "bg-amber-400 text-slate-900"
              : "border border-border text-muted-foreground"
          }`}
        >
          <ArrowDownToLine size={12} /> {isId ? "Ambil tabungan" : "Withdraw"}
        </button>
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
        {isId
          ? "Commit mengurangi saldo akun dan membuat transaksi Savings. Withdraw melakukan kebalikannya."
          : "Deposit reduces your account balance and creates a Savings transaction. Withdraw does the opposite."}
      </p>
    </>
  );
}

// ─── Sub-component: wishlist item row ───────────────────────────────────────

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
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/35 p-3">
      <div className="grid size-9 place-items-center rounded-lg bg-amber-500/12 text-amber-400">
        <Lightbulb size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{item.name}</p>
          <Badge variant="outline" className="text-[9px]">
            {item.category}
          </Badge>
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {item.status} · {formatMoney(item.price, baseCurrency, locale)}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
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
}: {
  state: FinanceState;
  /** Bug 4 fix: GoalsPanel is now self-contained — no wishForm prop drilling from Home. */
  onSave: (next: FinanceState) => void;
  onCommit: (goal: SavingsGoal, amount: number, direction: "deposit" | "withdraw") => void;
}) {
  const isId = state.locale === "id";

  // Local wishlist form state (Bug 4 fix: moved from Home.tsx)
  const [wishForm, setWishForm] = useState({
    name: "",
    price: "",
    priority: "medium" as WishlistItem["priority"],
    targetDate: "",
    category: "Lifestyle",
  });

  // Category filter for wishlist display
  const [category, setCategory] = useState("all");

  // Inline wishlist edit state (Bug 8 fix: replaces window.prompt)
  const [editingWish, setEditingWish] = useState<WishlistItem | null>(null);
  const [editForm, setEditForm] = useState({ name: "", price: "" });

  // Bug 3 fix: wishlistCategories synced with user's state.categories + existing wishlist items
  const wishlistCategories = useMemo(
    () =>
      Array.from(
        new Set([
          "Travel",
          "Work",
          "Home",
          "Personal",
          "Education",
          "Health",
          "Lifestyle",
          "Other",
          ...state.categories.filter((c) => !c.archived).map((c) => c.name),
          ...state.wishlist.map((w) => w.category).filter(Boolean),
        ]),
      ),
    [state.categories, state.wishlist],
  );

  const displayed = category === "all"
    ? state.wishlist
    : state.wishlist.filter((w) => w.category === category);

  // KPI derived values
  const savedTotal = state.savings.reduce((sum, g) => sum + g.saved, 0);
  const targetTotal = state.savings.reduce((sum, g) => sum + g.target, 0);

  // Wishlist handlers
  const onAddWish = (event: React.FormEvent) => {
    event.preventDefault();
    const price = Number(wishForm.price);
    if (!wishForm.name.trim() || !Number.isFinite(price) || price <= 0) {
      toast.error(isId ? "Lengkapi nama wishlist dan harga valid." : "Enter a valid name and price.");
      return;
    }
    const wish: WishlistItem = {
      id: uid(),
      name: wishForm.name.trim(),
      price,
      currency: state.baseCurrency,
      priority: wishForm.priority,
      targetDate: wishForm.targetDate,
      category: wishForm.category,
      status: "planning",
    };
    onSave({ ...state, wishlist: [wish, ...state.wishlist] });
    setWishForm({ name: "", price: "", priority: "medium", targetDate: "", category: "Lifestyle" });
    toast.success(isId ? "Wishlist ditambahkan." : "Wishlist item added.");
  };

  const openEditWish = (item: WishlistItem) => {
    setEditingWish(item);
    setEditForm({ name: item.name, price: String(item.price) });
  };

  // Bug 8 fix: proper inline form edit replaces window.prompt
  const saveEditWish = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingWish) return;
    const price = Number(editForm.price);
    if (!editForm.name.trim() || !Number.isFinite(price) || price <= 0) return;
    onSave({
      ...state,
      wishlist: state.wishlist.map((w) =>
        w.id === editingWish.id ? { ...w, name: editForm.name.trim(), price } : w,
      ),
    });
    toast.success(isId ? "Wishlist diperbarui." : "Wishlist updated.");
    setEditingWish(null);
  };

  const deleteWish = (item: WishlistItem) => {
    if (!window.confirm(isId ? `Hapus "${item.name}"?` : `Delete "${item.name}"?`)) return;
    onSave({ ...state, wishlist: state.wishlist.filter((w) => w.id !== item.id) });
    toast.success(isId ? "Wishlist dihapus." : "Wishlist deleted.");
  };

  return (
    <div className="animate-rise-in">
      {/* Page Header */}
      <SectionHeading
        eyebrow="Future you / goals"
        title={isId ? "Goals & Wishlist" : "Goals & Wishlist"}
        description={
          isId
            ? "Tabungan adalah bucket uang yang nyata; wishlist adalah rencana yang terpisah."
            : "Savings are real money buckets; wishlist is a separate plan."
        }
      />

      {/* KPI Row */}
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <KpiCard
          testid="total-savings-kpi"
          icon={<Target size={19} />}
          tone="teal"
          label={isId ? "Total uang tertabung" : "Total saved"}
          value={formatMoney(savedTotal, state.baseCurrency, state.locale)}
          note={isId ? `Di ${state.savings.length} goals` : `Across ${state.savings.length} goals`}
        />
        <KpiCard
          icon={<ArrowUpFromLine size={19} />}
          tone="indigo"
          label={isId ? "Target tabungan" : "Target savings"}
          value={formatMoney(targetTotal, state.baseCurrency, state.locale)}
          note={isId ? "Commitment progress" : "Commitment progress"}
        />
        <KpiCard
          icon={<Lightbulb size={19} />}
          tone="amber"
          label={isId ? "Wishlist items" : "Wishlist items"}
          value={String(state.wishlist.length)}
          note={isId ? "Filtered by category below" : "Filtered by category below"}
        />
      </div>

      {/* Main Grid */}
      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Savings Buckets */}
          <GlassCard as="section">
            <SectionCardHeader
              eyebrow={isId ? "Savings buckets" : "Savings buckets"}
              title={isId ? "Celengan & tabungan" : "Goals & savings"}
              action={<Target size={19} className="text-primary" />}
            />
            {state.savings.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {state.savings.map((goal) => (
                  <SavingsGoalCard
                    key={goal.id}
                    goal={goal}
                    locale={state.locale}
                    baseCurrency={state.baseCurrency}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                message={
                  isId
                    ? "Belum ada goals tabungan. Tambahkan di Pengaturan."
                    : "No savings goals yet. Add them in Settings."
                }
              />
            )}
          </GlassCard>

          {/* Commit to savings */}
          <GlassCard as="section" variant="accent">
            <SectionCardHeader
              eyebrow={isId ? "Commit to savings" : "Commit to savings"}
              title={isId ? "Tabung atau ambil" : "Deposit or Withdraw"}
              action={<ArrowUpFromLine size={17} className="text-primary" />}
              mb="mb-4"
            />
            <CommitForm
              savings={state.savings}
              locale={state.locale}
              onCommit={onCommit}
            />
          </GlassCard>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Wishlist list */}
          <GlassCard as="section">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {isId ? "Wants, with intent" : "Wants, with intent"}
                </p>
                <h2 className="mt-1 font-heading text-xl font-bold">
                  {isId ? "Wishlist by category" : "Wishlist by category"}
                </h2>
              </div>
              <select
                data-testid="wishlist-category-filter"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-semibold"
              >
                <option value="all" label={isId ? "Semua kategori" : "All categories"} />
                {wishlistCategories.map((cat) => (
                  <option key={cat} value={cat} label={cat} />
                ))}
              </select>
            </div>
            <div className="space-y-3">
              {displayed.map((wish) => (
                <WishlistRow
                  key={wish.id}
                  item={wish}
                  locale={state.locale}
                  baseCurrency={state.baseCurrency}
                  onEdit={openEditWish}
                  onDelete={deleteWish}
                />
              ))}
              {displayed.length === 0 && (
                <EmptyState
                  message={isId ? "Belum ada wishlist di kategori ini." : "No wishlist items in this category."}
                />
              )}
            </div>
          </GlassCard>

          {/* Add wishlist form */}
          <GlassCard as="section">
            <SectionCardHeader
              eyebrow={isId ? "Add wishlist" : "Add wishlist"}
              title={isId ? "Tambah wishlist" : "Add wishlist item"}
              action={<Plus size={17} className="text-primary" />}
              mb="mb-4"
            />
            <form onSubmit={onAddWish} className="grid gap-3 sm:grid-cols-2">
              <input
                data-testid="wishlist-name-input"
                required
                value={wishForm.name}
                onChange={(e) => setWishForm((f) => ({ ...f, name: e.target.value }))}
                placeholder={isId ? "Apa yang kamu inginkan?" : "What do you want?"}
                className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary sm:col-span-2"
              />
              <input
                data-testid="wishlist-price-input"
                required
                type="number"
                min="1"
                value={wishForm.price}
                onChange={(e) => setWishForm((f) => ({ ...f, price: e.target.value }))}
                placeholder={isId ? "Harga target" : "Target price"}
                className="h-10 rounded-lg border border-border bg-background px-3 font-data text-sm outline-none focus:border-primary"
              />
              <select
                data-testid="wishlist-category-select"
                value={wishForm.category}
                onChange={(e) => setWishForm((f) => ({ ...f, category: e.target.value }))}
                className="h-10 rounded-lg border border-border bg-background px-3 text-xs font-semibold"
              >
                {wishlistCategories.map((cat) => (
                  <option key={cat} value={cat} label={cat} />
                ))}
              </select>
              <select
                data-testid="wishlist-priority-select"
                value={wishForm.priority}
                onChange={(e) =>
                  setWishForm((f) => ({ ...f, priority: e.target.value as WishlistItem["priority"] }))
                }
                className="h-10 rounded-lg border border-border bg-background px-3 text-xs font-semibold"
              >
                <option value="high" label={isId ? "Prioritas tinggi" : "High priority"} />
                <option value="medium" label={isId ? "Prioritas sedang" : "Medium priority"} />
                <option value="low" label={isId ? "Prioritas rendah" : "Low priority"} />
              </select>
              <Button data-testid="wishlist-submit-button" type="submit" className="h-10 sm:col-span-2">
                {isId ? "Simpan wishlist" : "Save wishlist"}
              </Button>
            </form>
          </GlassCard>
        </div>
      </div>

      {/* Bug 8 fix: Inline wishlist edit BottomSheet — replaces window.prompt */}
      {editingWish && (
        <BottomSheet
          open
          onClose={() => setEditingWish(null)}
          testid="wishlist-edit-modal"
          eyebrow={isId ? "Edit item" : "Edit item"}
          title={isId ? "Edit Wishlist" : "Edit Wishlist"}
          footer={
            <div className="flex gap-2 sm:justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingWish(null)}
              >
                {isId ? "Batal" : "Cancel"}
              </Button>
              <Button type="submit" form="wishlist-edit-form" className="flex-1 gap-2 sm:flex-none">
                <Check size={16} />
                {isId ? "Simpan" : "Save"}
              </Button>
            </div>
          }
        >
          <form
            id="wishlist-edit-form"
            onSubmit={saveEditWish}
            className="space-y-3"
          >
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                {isId ? "Nama" : "Name"}
              </span>
              <input
                data-testid="wishlist-edit-name-input"
                required
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                {isId ? "Harga target" : "Target price"}
              </span>
              <input
                data-testid="wishlist-edit-price-input"
                required
                type="number"
                min="1"
                value={editForm.price}
                onChange={(e) => setEditForm((f) => ({ ...f, price: e.target.value }))}
                className="h-11 w-full rounded-lg border border-border bg-background px-3 font-data text-sm outline-none focus:border-primary"
              />
            </label>
          </form>
        </BottomSheet>
      )}
    </div>
  );
}