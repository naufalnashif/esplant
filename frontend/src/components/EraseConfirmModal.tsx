import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/mobile/BottomSheet";

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
  {
    key: "transactions" as const,
    labelId: "Transaksi",
    labelEn: "Transactions",
    descId: "Semua riwayat pemasukan & pengeluaran",
    descEn: "All income & expense history",
  },
  {
    key: "accounts" as const,
    labelId: "Akun & Saldo",
    labelEn: "Accounts & Balances",
    descId: "Bank, e-wallet, kartu kredit, cash",
    descEn: "Bank, e-wallet, credit cards, cash",
  },
  {
    key: "bills" as const,
    labelId: "Tagihan & Cicilan",
    labelEn: "Bills & Installments",
    descId: "Semua tagihan dan cicilan aktif",
    descEn: "All active bills and installments",
  },
  {
    key: "debts" as const,
    labelId: "Utang & Piutang",
    labelEn: "Debts & Receivables",
    descId: "Catatan utang dan piutang",
    descEn: "Debt and receivable records",
  },
  {
    key: "savings" as const,
    labelId: "Celengan & Tujuan",
    labelEn: "Savings Goals",
    descId: "Semua tujuan tabungan",
    descEn: "All savings goals",
  },
  {
    key: "wishlist" as const,
    labelId: "Wishlist",
    labelEn: "Wishlist",
    descId: "Daftar keinginan",
    descEn: "Wish list items",
  },
  {
    key: "budgets" as const,
    labelId: "Budget Guardrails",
    labelEn: "Budget Guardrails",
    descId: "Batas pengeluaran per kategori",
    descEn: "Per-category spending limits",
  },
];

const DEFAULT_OPTIONS: EraseOptions = {
  transactions: true,
  accounts: true,
  bills: true,
  debts: true,
  savings: true,
  wishlist: true,
  budgets: true,
};

export function EraseConfirmModal({ open, isId, onClose, onConfirm }: EraseConfirmModalProps) {
  const [options, setOptions] = useState<EraseOptions>({ ...DEFAULT_OPTIONS });

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
    // Reset back to all-selected for next open
    setOptions({ ...DEFAULT_OPTIONS });
    onClose();
  };

  const handleClose = () => {
    setOptions({ ...DEFAULT_OPTIONS });
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={handleClose}
      testid="erase-confirm-modal"
      eyebrow={isId ? "Zona Berbahaya" : "Danger Zone"}
      title={isId ? "Pilih Data yang Ingin Dihapus" : "Select Data to Erase"}
      description={
        isId
          ? "Pengaturan, profil, dan kategori selalu dipertahankan."
          : "Settings, profile, and categories are always kept."
      }
      maxWidth="sm:max-w-lg"
      footer={
        <div className="space-y-2">
          {/* Warning */}
          <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2.5">
            <AlertTriangle size={13} className="mt-0.5 shrink-0 text-red-400" />
            <p className="text-[11px] font-medium leading-relaxed text-red-400">
              {isId
                ? "Tindakan ini tidak dapat dibatalkan."
                : "This action cannot be undone."}
            </p>
          </div>
          {/* Actions */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              className="flex-1"
              onClick={handleClose}
              data-testid="erase-cancel-button"
            >
              {isId ? "Batal" : "Cancel"}
            </Button>
            <Button
              type="button"
              disabled={selectedCount === 0}
              onClick={handleConfirm}
              data-testid="erase-confirm-button"
              className="flex-1 gap-2 bg-red-500 text-white hover:bg-red-600 disabled:opacity-40"
            >
              <Trash2 size={14} />
              {selectedCount === 0
                ? (isId ? "Pilih data dulu" : "Select items first")
                : isId
                  ? `Hapus ${selectedCount} Kategori`
                  : `Erase ${selectedCount} ${selectedCount === 1 ? "Category" : "Categories"}`}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-2" data-testid="erase-items-list">
        {/* Select All */}
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border/60 bg-secondary/40 px-3 py-3 transition-colors hover:bg-secondary/70">
          <input
            type="checkbox"
            checked={allSelected}
            onChange={toggleAll}
            className="size-4 cursor-pointer accent-red-400"
            data-testid="erase-select-all"
          />
          <span className="text-sm font-bold">
            {allSelected
              ? (isId ? "Batalkan Semua" : "Deselect All")
              : (isId ? "Pilih Semua" : "Select All")}
          </span>
          <span className="ml-auto text-[11px] text-muted-foreground">
            {selectedCount}/{ERASE_ITEMS.length}
          </span>
        </label>

        {/* Divider */}
        <div className="border-t border-border/40" />

        {/* Individual items */}
        {ERASE_ITEMS.map((item) => (
          <label
            key={item.key}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
              options[item.key]
                ? "border-red-500/30 bg-red-500/5"
                : "border-border/50 hover:border-border/80 hover:bg-secondary/30"
            }`}
            data-testid={`erase-checkbox-${item.key}`}
          >
            <input
              type="checkbox"
              checked={options[item.key]}
              onChange={() => toggle(item.key)}
              className="size-4 cursor-pointer accent-red-400"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{isId ? item.labelId : item.labelEn}</p>
              <p className="text-[11px] text-muted-foreground">{isId ? item.descId : item.descEn}</p>
            </div>
          </label>
        ))}
      </div>
    </BottomSheet>
  );
}
