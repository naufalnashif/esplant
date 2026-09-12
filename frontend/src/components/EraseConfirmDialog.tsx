import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ERASABLE_KEYS,
  fullEraseSelection,
  hasEraseSelection,
  type ErasableKey,
  type EraseSelection,
  type FinanceState,
} from "@/lib/localDb";

const LABELS: Record<ErasableKey, { id: string; en: string }> = {
  transactions: { id: "Transaksi", en: "Transactions" },
  accounts: { id: "Akun & saldo", en: "Accounts" },
  bills: { id: "Tagihan & cicilan", en: "Bills" },
  debts: { id: "Utang & piutang", en: "Debts" },
  savings: { id: "Tabungan", en: "Savings" },
  wishlist: { id: "Wishlist", en: "Wishlist" },
  budgets: { id: "Budget", en: "Budgets" },
};

export function EraseConfirmDialog({
  open,
  onOpenChange,
  state,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  state: FinanceState;
  onConfirm: (selection: EraseSelection) => void | Promise<void>;
}) {
  const isId = state.locale === "id";
  const [selection, setSelection] = useState<EraseSelection>(fullEraseSelection);
  const [busy, setBusy] = useState(false);
  const selected = hasEraseSelection(selection);
  const accountsWithoutTransactions = selection.accounts && !selection.transactions;

  useEffect(() => {
    if (open) {
      setSelection(fullEraseSelection());
      setBusy(false);
    }
  }, [open]);

  const toggle = (key: ErasableKey, checked: boolean) => {
    setSelection((current) => ({ ...current, [key]: checked }));
  };

  const setAll = (value: boolean) => {
    setSelection(Object.fromEntries(ERASABLE_KEYS.map((key) => [key, value])) as EraseSelection);
  };

  const confirm = async () => {
    if (!selected || busy) return;
    setBusy(true);
    try {
      await onConfirm(selection);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[calc(100%-2rem)] gap-0 overflow-hidden p-0 sm:max-w-md"
        showCloseButton
        data-testid="erase-confirm-dialog"
      >
        <DialogHeader className="border-b border-border/70 px-5 py-4 pr-12">
          <div className="mb-2 grid size-10 place-items-center rounded-xl bg-red-500/12 text-red-400">
            <Trash2 size={18} />
          </div>
          <DialogTitle data-testid="erase-confirm-title">
            {isId ? "Hapus data terpilih?" : "Erase selected data?"}
          </DialogTitle>
          <DialogDescription>
            {isId
              ? "Pilih jenis data yang ingin dihapus. Kategori dan pengaturan tetap tersimpan. Tindakan ini tidak bisa dibatalkan."
              : "Choose which records to erase. Categories and settings are kept. This cannot be undone."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-5 py-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {isId ? "Pilih data" : "Select data"}
            </p>
            <div className="flex gap-1">
              <Button type="button" variant="ghost" size="xs" data-testid="erase-select-all" onClick={() => setAll(true)}>
                {isId ? "Semua" : "All"}
              </Button>
              <Button type="button" variant="ghost" size="xs" data-testid="erase-select-none" onClick={() => setAll(false)}>
                {isId ? "Kosongkan" : "None"}
              </Button>
            </div>
          </div>

          <ul className="space-y-1.5">
            {ERASABLE_KEYS.map((key) => {
              const count = state[key].length;
              const label = isId ? LABELS[key].id : LABELS[key].en;
              return (
                <li key={key}>
                  <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-border/70 bg-background/50 px-3 py-2.5 has-[[data-checked]]:border-primary/40 has-[[data-checked]]:bg-primary/5">
                    <Checkbox
                      checked={selection[key]}
                      onCheckedChange={(checked) => toggle(key, checked === true)}
                      data-testid={`erase-checkbox-${key}`}
                    />
                    <span className="flex-1 text-sm font-semibold">{label}</span>
                    <span className="font-data text-[11px] text-muted-foreground">{count}</span>
                  </label>
                </li>
              );
            })}
          </ul>

          {accountsWithoutTransactions && (
            <p className="rounded-lg border border-amber-500/35 bg-amber-500/8 px-3 py-2 text-[11px] leading-relaxed text-amber-500" data-testid="erase-orphan-warning">
              {isId
                ? "Menghapus akun tanpa transaksi akan menyisakan transaksi yang tidak terikat akun."
                : "Erasing accounts without transactions will leave orphaned transaction records."}
            </p>
          )}
        </div>

        <DialogFooter className="px-5">
          <Button type="button" variant="outline" data-testid="erase-cancel-button" onClick={() => onOpenChange(false)} disabled={busy}>
            {isId ? "Batal" : "Cancel"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            data-testid="erase-confirm-button"
            onClick={() => void confirm()}
            disabled={!selected || busy}
          >
            {busy ? (isId ? "Menghapus…" : "Erasing…") : isId ? "Hapus data terpilih" : "Erase selected"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
