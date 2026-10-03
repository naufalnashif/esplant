import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { FinancialCycleSelector } from "@/components/FinancialCycleSelector";
import type { FinanceState } from "@/lib/localDb";
import { toast } from "sonner";

export interface FinancialCycleModalProps {
  open: boolean;
  onClose: () => void;
  state: FinanceState;
  onSaveCycle: (newCycleDay: number) => void;
}

export function FinancialCycleModal({
  open,
  onClose,
  state,
  onSaveCycle,
}: FinancialCycleModalProps) {
  const isId = state.locale === "id";
  const [selectedDay, setSelectedDay] = useState(state.customCycleDay || 1);

  // Sync state if prop changes when opening
  useEffect(() => {
    if (open) {
      setSelectedDay(state.customCycleDay || 1);
    }
  }, [open, state.customCycleDay]);

  const handleSave = () => {
    onSaveCycle(selectedDay);
    toast.success(
      isId
        ? `Siklus keuangan diperbarui: Mulai tanggal ${selectedDay}`
        : `Financial cycle updated: Starts on day ${selectedDay}`,
    );
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={isId ? "Atur Siklus Keuangan" : "Set Financial Cycle"}
      eyebrow={isId ? "Pengaturan Pembukuan" : "Accounting Settings"}
      description={
        isId
          ? "Pilih tanggal awal periode keuangan Anda agar grafik dan perhitungan anggaran sesuai dengan tanggal gajian."
          : "Choose your cycle start day so monthly charts and budget guardrails match your payday."
      }
      testid="financial-cycle-modal"
      maxWidth="sm:max-w-lg"
      footer={
        <div className="flex w-full items-center justify-end gap-2 pt-2">
          <button
            type="button"
            data-testid="cycle-modal-cancel-button"
            onClick={onClose}
            className="flex-1 sm:flex-initial rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-muted-foreground hover:bg-secondary transition-colors cursor-pointer"
          >
            {isId ? "Batal" : "Cancel"}
          </button>
          <button
            type="button"
            data-testid="cycle-modal-save-button"
            onClick={handleSave}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <Check size={14} />
            {isId ? "Simpan Siklus" : "Save Cycle"}
          </button>
        </div>
      }
    >
      <div className="py-2">
        <FinancialCycleSelector
          value={selectedDay}
          onChange={setSelectedDay}
          locale={state.locale}
        />
      </div>
    </BottomSheet>
  );
}
