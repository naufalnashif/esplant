import { useState } from "react";
import {
  Boxes,
  Check,
  ChevronDown,
  ChevronUp,
  PackagePlus,
  Play,
  Plus,
  Trash2,
  X,
  Calendar,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { FinanceState, Transaction, Account } from "@/lib/localDb";
import { formatMoney } from "@/lib/formatters";
import {
  calculateBundleTotal,
  generateBundleTransactions,
  type SpendingBundle,
  type SpendingBundleItem,
} from "@/lib/templates";

interface BundlesPanelProps {
  open: boolean;
  onClose: () => void;
  state: FinanceState;
  onApplyBatch: (transactions: Transaction[], updatedAccounts: Account[]) => void;
  onSaveBundles: (bundles: SpendingBundle[]) => void;
  onFilterByBundle?: (bundleSlug: string) => void;
}

export function BundlesPanel({
  open,
  onClose,
  state,
  onApplyBatch,
  onSaveBundles,
  onFilterByBundle,
}: BundlesPanelProps) {
  const isId = state.locale === "id";
  const bundles = state.bundles || [];

  const [selectedBundleId, setSelectedBundleId] = useState<string | null>(null);
  const [targetAccountId, setTargetAccountId] = useState<string>(state.accounts[0]?.id || "");
  const [targetDate, setTargetDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [expandedBundleId, setExpandedBundleId] = useState<string | null>(bundles[0]?.id || null);

  // New Bundle Form Modal
  const [isCreating, setIsCreating] = useState(false);
  const [newBundleName, setNewBundleName] = useState("");
  const [newBundleDesc, setNewBundleDesc] = useState("");
  const [newItems, setNewItems] = useState<Omit<SpendingBundleItem, "id">[]>([
    { description: "", category: "Utilities", amount: 0 },
  ]);

  const activeCategories = state.categories.filter((c) => !c.archived).map((c) => c.name);

  const handleApply = (bundle: SpendingBundle) => {
    if (!targetAccountId) {
      toast.error(isId ? "Pilih akun pembayaran terlebih dahulu." : "Please select a payment account first.");
      return;
    }

    const account = state.accounts.find((a) => a.id === targetAccountId);
    if (!account) {
      toast.error(isId ? "Akun tidak ditemukan." : "Account not found.");
      return;
    }

    const txs = generateBundleTransactions(
      bundle,
      targetDate,
      targetAccountId,
      state.exchangeRates,
      state.baseCurrency,
    );

    // Calculate total spend in account's currency to update balance
    const totalDeduction = txs.reduce((sum, tx) => {
      return sum + (tx.baseAmount / (state.exchangeRates[account.currency] || 1));
    }, 0);

    const updatedAccounts = state.accounts.map((acc) =>
      acc.id === targetAccountId ? { ...acc, balance: acc.balance - totalDeduction } : acc,
    );

    onApplyBatch(txs, updatedAccounts);
    toast.success(
      isId
        ? `Paket "${bundle.name}" diterapkan! ${txs.length} transaksi berhasil dicatat.`
        : `Bundle "${bundle.name}" applied! ${txs.length} transactions recorded.`,
    );
    setSelectedBundleId(null);
    onClose();
  };

  const handleAddItemRow = () => {
    setNewItems([...newItems, { description: "", category: "Utilities", amount: 0 }]);
  };

  const handleRemoveItemRow = (idx: number) => {
    if (newItems.length <= 1) return;
    setNewItems(newItems.filter((_, i) => i !== idx));
  };

  const handleSaveNewBundle = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newBundleName.trim();
    if (!name) {
      toast.error(isId ? "Nama paket tidak boleh kosong." : "Bundle name is required.");
      return;
    }

    const validItems = newItems
      .filter((i) => i.description.trim() && Number.isFinite(i.amount) && i.amount > 0)
      .map((i, idx) => ({
        id: `item-${Date.now()}-${idx + 1}`,
        description: i.description.trim(),
        category: i.category,
        amount: Number(i.amount),
        currency: state.baseCurrency,
      }));

    if (validItems.length === 0) {
      toast.error(isId ? "Tambahkan minimal 1 item dengan nominal valid." : "Add at least 1 item with valid amount.");
      return;
    }

    const newBundle: SpendingBundle = {
      id: `bundle-${Date.now()}`,
      name,
      description: newBundleDesc.trim(),
      createdDate: new Date().toISOString().slice(0, 10),
      items: validItems,
    };

    onSaveBundles([...bundles, newBundle]);
    toast.success(isId ? "Paket baru berhasil disimpan." : "New bundle saved successfully.");
    setIsCreating(false);
    setNewBundleName("");
    setNewBundleDesc("");
    setNewItems([{ description: "", category: "Utilities", amount: 0 }]);
  };

  const handleDeleteBundle = (id: string, name: string) => {
    if (window.confirm(isId ? `Hapus paket "${name}"?` : `Delete bundle "${name}"?`)) {
      onSaveBundles(bundles.filter((b) => b.id !== id));
      toast.success(isId ? "Paket dihapus." : "Bundle deleted.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6" data-testid="spending-bundles-modal">
        <DialogHeader className="mb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-xl bg-primary/12 text-primary">
                <Boxes size={18} />
              </div>
              <div>
                <DialogTitle className="font-heading text-lg font-bold sm:text-xl">
                  {isId ? "Template Pengeluaran Rutin (Bundles)" : "Recurring Spending Bundles"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {isId
                    ? "Catat serangkaian pengeluaran rutin (tagihan pokok, wifi, sembako) dalam 1 kali klik."
                    : "Log recurring routine expenses (utilities, internet, groceries) with one click."}
                </DialogDescription>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              data-testid="create-bundle-button"
              onClick={() => setIsCreating(true)}
              className="gap-1.5 border-primary/40 text-primary text-xs"
            >
              <PackagePlus size={14} />
              {isId ? "Buat Paket" : "New Bundle"}
            </Button>
          </div>
        </DialogHeader>

        {/* Create Bundle Modal/Drawer view */}
        {isCreating ? (
          <form onSubmit={handleSaveNewBundle} className="space-y-4 rounded-xl border border-border/70 bg-card/60 p-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <h3 className="font-heading font-bold text-sm">
                {isId ? "Buat Paket Rutin Baru" : "Create New Spending Bundle"}
              </h3>
              <Button type="button" variant="ghost" size="icon" className="size-7" onClick={() => setIsCreating(false)}>
                <X size={14} />
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">{isId ? "Nama Paket" : "Bundle Name"}</label>
                <input
                  type="text"
                  required
                  placeholder={isId ? "misal: Kebutuhan Pokok Awal Bulan" : "e.g. Monthly Living Essentials"}
                  value={newBundleName}
                  onChange={(e) => setNewBundleName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">{isId ? "Deskripsi (opsional)" : "Description (optional)"}</label>
                <input
                  type="text"
                  placeholder={isId ? "Catatan singkat tentang paket ini" : "Brief notes about this bundle"}
                  value={newBundleDesc}
                  onChange={(e) => setNewBundleDesc(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">{isId ? "Daftar Item Pengeluaran" : "Expense Items"}</span>
                <button
                  type="button"
                  onClick={handleAddItemRow}
                  className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                >
                  <Plus size={12} /> {isId ? "Tambah Baris" : "Add Row"}
                </button>
              </div>

              {newItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder={isId ? "Deskripsi item" : "Item description"}
                    value={item.description}
                    onChange={(e) => {
                      const updated = [...newItems];
                      updated[idx].description = e.target.value;
                      setNewItems(updated);
                    }}
                    className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                  <select
                    value={item.category}
                    onChange={(e) => {
                      const updated = [...newItems];
                      updated[idx].category = e.target.value;
                      setNewItems(updated);
                    }}
                    className="w-32 rounded-lg border border-border bg-background px-2 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                  >
                    {activeCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    required
                    min={1}
                    placeholder="Nominal"
                    value={item.amount || ""}
                    onChange={(e) => {
                      const updated = [...newItems];
                      updated[idx].amount = Number(e.target.value);
                      setNewItems(updated);
                    }}
                    className="w-28 rounded-lg border border-border bg-background px-2.5 py-1.5 font-data text-xs text-foreground focus:border-primary focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveItemRow(idx)}
                    disabled={newItems.length <= 1}
                    className="rounded p-1 text-muted-foreground hover:text-destructive disabled:opacity-30"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
              <Button type="button" variant="ghost" size="sm" onClick={() => setIsCreating(false)}>
                {isId ? "Batal" : "Cancel"}
              </Button>
              <Button type="submit" size="sm" className="gap-1.5">
                <Check size={14} />
                {isId ? "Simpan Paket" : "Save Bundle"}
              </Button>
            </div>
          </form>
        ) : null}

        {/* Existing Bundles List */}
        <div className="space-y-3 mt-1">
          {bundles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border/70 p-8 text-center">
              <Boxes size={32} className="mx-auto text-muted-foreground/50 mb-2" />
              <p className="font-heading font-bold text-sm text-foreground">
                {isId ? "Belum ada paket pengeluaran" : "No spending bundles yet"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {isId
                  ? "Buat paket untuk mempermudah mencatat pengeluaran berulang setiap bulan."
                  : "Create bundles to easily log routine monthly spending."}
              </p>
            </div>
          ) : (
            bundles.map((bundle) => {
              const isExpanded = expandedBundleId === bundle.id;
              const total = calculateBundleTotal(bundle);
              const isApplying = selectedBundleId === bundle.id;
              const bundleSlug = bundle.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

              return (
                <Card
                  key={bundle.id}
                  data-testid={`bundle-card-${bundle.id}`}
                  className="border-border/70 bg-card/75 overflow-hidden transition-all"
                >
                  <div className="p-3.5 sm:p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-heading font-bold text-sm sm:text-base text-foreground">
                            {bundle.name}
                          </h4>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                            {bundle.items.length} {isId ? "item" : "items"}
                          </Badge>
                          {onFilterByBundle && (
                            <button
                              type="button"
                              onClick={() => {
                                onFilterByBundle(`bundle:${bundleSlug}`);
                                onClose();
                              }}
                              className="text-[10px] text-muted-foreground hover:text-primary underline"
                            >
                              {isId ? "Lihat riwayat" : "View history"}
                            </button>
                          )}
                        </div>
                        {bundle.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                            {bundle.description}
                          </p>
                        )}
                        <p className="font-data font-bold text-sm text-primary mt-1">
                          Total: {formatMoney(total, state.baseCurrency, state.locale)}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          data-testid={`apply-bundle-btn-${bundle.id}`}
                          onClick={() => setSelectedBundleId(isApplying ? null : bundle.id)}
                          className="gap-1.5 bg-primary text-primary-foreground text-xs shadow-sm shadow-primary/25"
                        >
                          <Play size={12} className="fill-current" />
                          {isId ? "Terapkan" : "Apply"}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-muted-foreground"
                          onClick={() => setExpandedBundleId(isExpanded ? null : bundle.id)}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteBundle(bundle.id, bundle.name)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>

                    {/* Apply Configuration Box */}
                    {isApplying && (
                      <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3 animate-fade-in space-y-3">
                        <p className="text-xs font-bold text-primary">
                          {isId ? "Konfirmasi Penerapan Paket" : "Confirm Bundle Application"}
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div>
                            <label className="flex items-center gap-1 font-semibold text-muted-foreground mb-1">
                              <Wallet size={12} />
                              {isId ? "Sumber Akun / Dompet:" : "Payment Account:"}
                            </label>
                            <select
                              value={targetAccountId}
                              onChange={(e) => setTargetAccountId(e.target.value)}
                              className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground focus:border-primary focus:outline-none"
                            >
                              {state.accounts.map((acc) => (
                                <option key={acc.id} value={acc.id}>
                                  {acc.name} ({formatMoney(acc.balance, acc.currency, state.locale)})
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="flex items-center gap-1 font-semibold text-muted-foreground mb-1">
                              <Calendar size={12} />
                              {isId ? "Tanggal Transaksi:" : "Transaction Date:"}
                            </label>
                            <input
                              type="date"
                              value={targetDate}
                              onChange={(e) => setTargetDate(e.target.value)}
                              className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 font-data text-xs text-foreground focus:border-primary focus:outline-none"
                            />
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-1">
                          <Button size="sm" variant="ghost" onClick={() => setSelectedBundleId(null)}>
                            {isId ? "Batal" : "Cancel"}
                          </Button>
                          <Button
                            size="sm"
                            data-testid={`confirm-apply-bundle-${bundle.id}`}
                            onClick={() => handleApply(bundle)}
                            className="gap-1.5"
                          >
                            <Check size={14} />
                            {isId ? "Catat Sekarang" : "Record Now"}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Expanded Items Breakdown */}
                    {isExpanded && (
                      <div className="mt-3 border-t border-border/50 pt-2.5 space-y-1.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {isId ? "Rincian Item" : "Item Breakdown"}
                        </p>
                        <div className="grid gap-1.5">
                          {bundle.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between rounded-lg bg-background/50 px-2.5 py-1.5 text-xs"
                            >
                              <div className="min-w-0 flex items-center gap-2">
                                <span className="font-medium text-foreground truncate">{item.description}</span>
                                <Badge variant="secondary" className="text-[9px] py-0 px-1">
                                  {item.category}
                                </Badge>
                              </div>
                              <span className="font-data font-bold text-foreground shrink-0 ml-2">
                                {formatMoney(item.amount, item.currency || state.baseCurrency, state.locale)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
