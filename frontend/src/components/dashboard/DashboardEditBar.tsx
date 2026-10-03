import React from "react";
import { Check, LayoutGrid, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface DashboardEditBarProps {
  onSave: () => void;
  onCancel: () => void;
  onOpenManageModal: () => void;
  onResetDefault: () => void;
  hasUnsavedChanges: boolean;
  isId?: boolean;
}

export const DashboardEditBar: React.FC<DashboardEditBarProps> = ({
  onSave,
  onCancel,
  onOpenManageModal,
  onResetDefault,
  hasUnsavedChanges,
  isId = true,
}) => {
  return (
    <aside
      aria-label={isId ? "Bilah Kontrol Mode Edit Tata Letak" : "Layout Edit Mode Control Bar"}
      data-testid="dashboard-edit-bar"
      style={{
        bottom: "calc(16px + max(env(safe-area-inset-bottom), 12px))",
      }}
      className="fixed left-4 right-4 z-40 mx-auto max-w-2xl animate-rise-in rounded-2xl border border-amber-500/30 bg-card/95 p-3 shadow-2xl backdrop-blur-xl dark:border-primary/30"
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:bg-primary/15 dark:text-primary">
            <LayoutGrid size={16} />
          </div>
          <div>
            <p className="font-heading text-xs font-bold text-foreground">
              {isId ? "Mode Atur Tata Letak" : "Edit Layout Mode"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {hasUnsavedChanges
                ? isId
                  ? "Ada perubahan belum disimpan"
                  : "Unsaved layout changes"
                : isId
                ? "Sesuaikan urutan & ukuran"
                : "Adjust order & spans"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetDefault}
            className="h-8 gap-1 text-[11px] px-2.5"
            data-testid="edit-bar-reset-button"
            title="Kembalikan ke layout bawaan"
          >
            <RotateCcw size={12} />
            <span className="hidden sm:inline">{isId ? "Reset" : "Reset"}</span>
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={onOpenManageModal}
            className="h-8 gap-1.5 text-[11px] px-2.5"
            data-testid="edit-bar-manage-button"
          >
            <LayoutGrid size={13} />
            <span>{isId ? "Kelola Widget" : "Manage"}</span>
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 gap-1 text-[11px] px-2.5 text-muted-foreground hover:text-foreground"
            data-testid="edit-bar-cancel-button"
          >
            <X size={13} />
            <span>{isId ? "Batal" : "Cancel"}</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onSave}
            className="h-8 gap-1.5 text-[11px] px-3 shadow-md shadow-primary/20"
            data-testid="edit-bar-save-button"
          >
            <Check size={13} />
            <span>{isId ? "Simpan" : "Save"}</span>
          </Button>
        </div>
      </div>
    </aside>
  );
};
