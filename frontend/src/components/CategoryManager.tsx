import { Archive, Check, Pencil, Plus, RotateCcw, Search, Trash2, Tag } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Category, FinanceState } from "@/lib/localDb";
import { MAX_ACTIVE_CATEGORIES } from "@/lib/localDb";

export function CategoryManager({
  state,
  onSave,
}: {
  state: FinanceState;
  onSave: (categories: Category[]) => void;
}) {
  const isId = state.locale === "id";
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "archived">("all");
  const [showAllCategories, setShowAllCategories] = useState(false);
  const CATEGORY_PREVIEW_COUNT = 8;

  const categoryUsageCount = useMemo(() => {
    const counts: Record<string, number> = {};
    state.transactions.forEach((tx) => {
      counts[tx.category] = (counts[tx.category] || 0) + 1;
    });
    return counts;
  }, [state.transactions]);

  const activeCount = state.categories.filter((item) => !item.archived).length;
  const atLimit = activeCount >= MAX_ACTIVE_CATEGORIES;
  const limitMessage = isId
    ? `Maksimal ${MAX_ACTIVE_CATEGORIES} kategori aktif. Arsipkan atau hapus salah satu dulu.`
    : `Maximum ${MAX_ACTIVE_CATEGORIES} active categories. Archive or delete one first.`;

  const add = () => {
    const name = newName.trim();
    if (!name) return;
    if (atLimit) {
      toast.error(limitMessage);
      return;
    }
    if (state.categories.some((item) => item.name.toLowerCase() === name.toLowerCase())) {
      toast.error(isId ? "Kategori sudah ada." : "Category already exists.");
      return;
    }
    onSave([...state.categories, { id: `category-${Date.now()}`, name, archived: false }]);
    setNewName("");
    toast.success(isId ? "Kategori baru ditambahkan." : "New category added.");
  };

  /** Un-archiving consumes an active slot, so it obeys the same ceiling as creating one. */
  const restore = (item: Category) => {
    if (atLimit) {
      toast.error(limitMessage);
      return;
    }
    onSave(state.categories.map((c) => (c.id === item.id ? { ...c, archived: false } : c)));
  };

  const rename = (item: Category) => {
    const name = editingName.trim();
    if (!name || name === item.name) {
      setEditingId(null);
      return;
    }
    if (state.transactions.some((transaction) => transaction.category === item.name)) {
      toast.error(isId ? "Kategori yang sudah dipakai histori tidak dapat diubah namanya." : "Category in use cannot be renamed.");
      return;
    }
    onSave(state.categories.map((category) => (category.id === item.id ? { ...category, name } : category)));
    setEditingId(null);
    toast.success(isId ? "Kategori diperbarui." : "Category updated.");
  };

  const remove = (item: Category) => {
    if (
      state.transactions.some((transaction) => transaction.category === item.name) ||
      state.budgets.some((budget) => budget.category === item.name)
    ) {
      toast.error(isId ? "Kategori masih dipakai; arsipkan agar histori tetap aman." : "Category in use; archive it instead.");
      return;
    }
    onSave(state.categories.filter((category) => category.id !== item.id));
    toast.success(isId ? "Kategori dihapus." : "Category deleted.");
  };

  const filteredCategories = state.categories.filter((c) => {
    const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (activeFilter === "active") return !c.archived;
    if (activeFilter === "archived") return c.archived;
    return true;
  });

  const visibleCategories = showAllCategories
    ? filteredCategories
    : filteredCategories.slice(0, CATEGORY_PREVIEW_COUNT);
  const hiddenCount = filteredCategories.length - visibleCategories.length;

  return (
    <section className="rounded-2xl border border-border/70 bg-card/75 p-4 shadow-sm backdrop-blur-xl sm:p-5" data-testid="category-manager">
      {/* Header & Controls */}
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-primary/12 text-primary">
            <Tag size={16} />
          </div>
          <div>
            <h2 className="font-heading text-lg font-bold">{isId ? "Kelola Kategori Transaksi" : "Manage Categories"}</h2>
            <p className="text-xs text-muted-foreground">
              {isId ? "Kategori aktif & jumlah transaksi terikat" : "Active categories & transaction count"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <Badge
            variant={atLimit ? "outline" : "secondary"}
            className={`text-xs ${atLimit ? "border-amber-500/50 text-amber-500" : ""}`}
            data-testid="category-active-count"
          >
            {activeCount}/{MAX_ACTIVE_CATEGORIES} {isId ? "Aktif" : "Active"}
          </Badge>
          {state.categories.some((c) => c.archived) && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {state.categories.filter((c) => c.archived).length} {isId ? "Diarsipkan" : "Archived"}
            </Badge>
          )}
        </div>
      </div>

      {/* Action Bar: Create & Search/Filter */}
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <div className="flex gap-2">
          <input
            data-testid="category-new-input"
            value={newName}
            disabled={atLimit}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") add(); }}
            placeholder={atLimit ? limitMessage : isId ? "+ Tambah kategori baru..." : "+ Add new category..."}
            className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-xs outline-none focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
          />
          <Button data-testid="category-create-button" onClick={add} disabled={atLimit} size="sm" className="h-9 gap-1.5 shrink-0 text-xs">
            <Plus size={14} />
            {isId ? "Tambah" : "Add"}
          </Button>
        </div>

        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-2.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isId ? "Cari..." : "Search..."}
            className="h-9 w-full sm:w-36 rounded-lg border border-border bg-background pl-7 pr-2.5 text-xs outline-none focus:border-primary"
          />
        </div>

        <div className="flex rounded-lg border border-border/80 bg-background/50 p-0.5 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`px-2.5 py-1 rounded-md transition-all ${activeFilter === "all" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground"}`}
          >
            {isId ? "Semua" : "All"}
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("active")}
            className={`px-2.5 py-1 rounded-md transition-all ${activeFilter === "active" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground"}`}
          >
            {isId ? "Aktif" : "Active"}
          </button>
          <button
            type="button"
            onClick={() => setActiveFilter("archived")}
            className={`px-2.5 py-1 rounded-md transition-all ${activeFilter === "archived" ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground hover:text-foreground"}`}
          >
            {isId ? "Arsip" : "Archived"}
          </button>
        </div>
      </div>

      {atLimit && (
        <p
          className="mb-3 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-[11px] font-semibold text-amber-500"
          data-testid="category-limit-note"
        >
          {limitMessage}
        </p>
      )}

      {/* Compact Chips Grid */}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {visibleCategories.map((item) => {
          const count = categoryUsageCount[item.name] || 0;
          const isEditing = editingId === item.id;

          return (
            <div
              key={item.id}
              className={`group inline-flex min-w-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                item.archived
                  ? "border-dashed border-border/60 bg-muted/40 opacity-60"
                  : "border-border/80 bg-card hover:border-primary/50 hover:bg-secondary/40 shadow-xs"
              }`}
            >
              {isEditing ? (
                <div className="flex min-w-0 flex-1 items-center gap-1">
                  <input
                    autoFocus
                    data-testid={`category-edit-${item.id}-input`}
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") rename(item); }}
                    className="h-6 w-full min-w-0 rounded border border-primary bg-background px-1.5 text-xs font-bold sm:w-28"
                  />
                  <button
                    type="button"
                    data-testid={`category-save-${item.id}-button`}
                    onClick={() => rename(item)}
                    className="grid size-6 shrink-0 place-items-center rounded text-primary hover:bg-primary/20"
                  >
                    <Check size={12} />
                  </button>
                </div>
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate">{item.name}</span>
                  <span className="shrink-0 rounded-full bg-secondary px-1.5 py-0.2 font-data text-[10px] text-muted-foreground font-bold">
                    {count}
                  </span>

                  {/* Actions visible on hover/focus */}
                  <div className="flex shrink-0 items-center gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      data-testid={`category-edit-${item.id}-button`}
                      onClick={() => {
                        setEditingId(item.id);
                        setEditingName(item.name);
                      }}
                      title={isId ? "Edit nama" : "Edit name"}
                      className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-primary/10 hover:text-primary"
                    >
                      <Pencil size={11} />
                    </button>

                    {!item.archived ? (
                      <button
                        type="button"
                        data-testid={`category-archive-${item.id}-button`}
                        onClick={() =>
                          onSave(state.categories.map((c) => (c.id === item.id ? { ...c, archived: true } : c)))
                        }
                        title={isId ? "Arsipkan" : "Archive"}
                        className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-amber-400/10 hover:text-amber-400"
                      >
                        <Archive size={11} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        data-testid={`category-restore-${item.id}-button`}
                        onClick={() => restore(item)}
                        title={isId ? "Pulihkan" : "Restore"}
                        className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-primary/10 hover:text-primary"
                      >
                        <RotateCcw size={11} />
                      </button>
                    )}

                    <button
                      type="button"
                      data-testid={`category-delete-${item.id}-button`}
                      onClick={() => remove(item)}
                      title={isId ? "Hapus" : "Delete"}
                      className="grid size-5 place-items-center rounded text-muted-foreground hover:bg-red-400/10 hover:text-red-400"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </>
              )}
            </div>
          );
        })}

        {filteredCategories.length === 0 && (
          <p className="col-span-2 w-full py-4 text-center text-xs text-muted-foreground sm:w-full">
            {isId ? "Kategori tidak ditemukan." : "No categories found."}
          </p>
        )}
      </div>

      {hiddenCount > 0 && (
        <button
          type="button"
          data-testid="category-show-more-button"
          onClick={() => setShowAllCategories(true)}
          className="mt-3 w-full rounded-lg border border-dashed border-border/70 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          {isId
            ? `Tampilkan Semua (${filteredCategories.length})`
            : `Show All (${filteredCategories.length})`}
        </button>
      )}
      {showAllCategories && filteredCategories.length > CATEGORY_PREVIEW_COUNT && (
        <button
          type="button"
          data-testid="category-show-less-button"
          onClick={() => setShowAllCategories(false)}
          className="mt-3 w-full rounded-lg border border-dashed border-border/70 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary"
        >
          {isId ? "Sembunyikan" : "Show Less"}
        </button>
      )}
    </section>
  );
}