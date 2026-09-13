import { useState } from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface EraseOptions {
  transactions: boolean;
  accounts: boolean;
  bills: boolean;
  debts: boolean;
  savings: boolean;
  wishlist: boolean;
  budgets: boolean;
}

interface EraseConfirmModalProps {
  open: boolean;
  isId: boolean;
  onClose: () => void;
  onConfirm: (options: EraseOptions) => void;
}

const ERASE_ITEMS = [
  { key: "transactions" as const, labelId: "Transaksi", labelEn: "Transactions", descId: "Semua riwayat pemasukan & pengeluaran", descEn: "All income & expense history" },
  { key: "accounts" as const, labelId: "Akun & Saldo", labelEn: "Accounts & Balances", descId: "Bank, e-wallet, kartu kredit, cash", descEn: "Bank, e-wallet, credit cards, cash" },
  { key: "bills" as const, labelId: "Tagihan & Cicilan", labelEn: "Bills & Installments", descId: "Semua tagihan dan cicilan aktif", descEn: "All active bills and installments" },
  { key: "debts" as const, labelId: "Utang & Piutang", labelEn: "Debts & Receivables", descId: "Catatan utang dan piutang", descEn: "Debt and receivable records" },
  { key: "savings" as const, labelId: "Celengan & Tujuan", labelEn: "Savings Goals", descId: "Semua tujuan tabungan", descEn: "All savings goals" },
  { key: "wishlist" as const, labelId: "Wishlist", labelEn: "Wishlist", descId: "Daftar keinginan", descEn: "Wish list items" },
  { key: "budgets" as const, labelId: "Budget Guardrails", labelEn: "Budget Guardrails", descId: "Batas pengeluaran per kategori", descEn: "Per-category spending limits" },
];

export function EraseConfirmModal({ open, isId, onClose, onConfirm }: EraseConfirmModalProps) {
  const [options, setOptions] = useState<EraseOptions>({
    transactions: true,
    accounts: true,
    bills: true,
    debts: true,
    savings: true,
    wishlist: true,
    budgets: true,
  });

  if (!open) return null;

  const selectedCount = Object.values(options).filter(Boolean).length;
  const allSelected = selectedCount === ERASE_ITEMS.length;

  const toggle = (key: keyof EraseOptions) =>
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleAll = () => {
    const next = !allSelected;
    setOptions({
      transactions: next, accounts: next, bills: next,
      debts: next, savings: next, wishlist: next, budgets: next,
    });
  };

  const handleConfirm = () => {
    if (selectedCount === 0) return;
    onConfirm(options);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      data-testid="erase-confirm-modal"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-border/70 bg-card shadow-2xl shadow-black/40">
        {/* Header */}
        <div className="flex items-start gap-4 border-b border-border/60 p-5">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-500/12 text-red-400">
            <Trash2 size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-red-400">
              {isId ? "Zona Berbahaya" : "Danger Zone"}
            </p>
            <h2 className="mt-0.5 font-heading text-lg font-bold">
              {isId ? "Hapus Data" : "Erase Data"}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {isId
                ? "Pilih data yang ingin dihapus. Pengaturan, profil, dan kategori selalu dipertahankan."
                : "Select data to erase. Settings, profile, and categories are always kept."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 border-b border-border/60 bg-red-500/5 px-5 py-3">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-red-400" />
          <p className="text-[11px] font-semibold leading-relaxed text-red-400">
            {isId
              ? "Tindakan ini tidak dapat dibatalkan. Data yang dipilih akan dihapus secara permanen."
              : "This action cannot be undone. Selected data will be permanently deleted."}
          </p>
        </div>

        {/* Checkboxes */}
        <div className="p-5">
          {/* Select all */}
          <label className="mb-3 flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-secondary/30 px-3 py-2.5 hover:bg-secondary/50">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="size-4 cursor-pointer accent-red-400"
              data-testid="erase-select-all"
            />
            <span className="text-xs font-bold text-foreground">
              {isId ? "Pilih Semua" : "Select All"}
            </span>
          </label>

          <div className="space-y-1.5">
            {ERASE_ITEMS.map((item) => (
              <label
                key={item.key}
                className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/50 px-3 py-2.5 transition-colors hover:border-red-500/30 hover:bg-red-500/5"
                data-testid={`erase-checkbox-${item.key}`}
              >
                <input
                  type="checkbox"
                  checked={options[item.key]}
                  onChange={() => toggle(item.key)}
                  className="size-4 cursor-pointer accent-red-400"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold">{isId ? item.labelId : item.labelEn}</p>
                  <p className="text-[10px] text-muted-foreground">{isId ? item.descId : item.descEn}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-border/60 px-5 py-4">
          <p className="text-[11px] text-muted-foreground">
            {selectedCount === 0
              ? (isId ? "Pilih minimal satu data" : "Select at least one item")
              : isId
                ? `${selectedCount} kategori dipilih`
                : `${selectedCount} ${selectedCount === 1 ? "category" : "categories"} selected`}
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              data-testid="erase-cancel-button"
            >
              {isId ? "Batal" : "Cancel"}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={selectedCount === 0}
              onClick={handleConfirm}
              data-testid="erase-confirm-button"
              className="gap-1.5 bg-red-500 text-white hover:bg-red-600 disabled:opacity-40"
            >
              <Trash2 size={13} />
              {isId ? "Hapus yang Dipilih" : "Erase Selected"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
