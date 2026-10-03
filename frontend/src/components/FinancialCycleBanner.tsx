import { CalendarClock, ChevronRight, SlidersHorizontal } from "lucide-react";
import { getCycleRangeForDate } from "@/lib/analyticsEngine";
import type { FinanceState } from "@/lib/localDb";

export interface FinancialCycleBannerProps {
  state: FinanceState;
  onOpenEditCycle: () => void;
}

/**
 * Compact, space-saving Financial Cycle Pill.
 * Designed to provide instant context without pushing down primary dashboard cards.
 */
export function FinancialCycleBanner({
  state,
  onOpenEditCycle,
}: FinancialCycleBannerProps) {
  const isId = state.locale === "id";
  const cycleDay = state.customCycleDay || 1;
  const today = new Date();
  const activeRange = getCycleRangeForDate(today, cycleDay);

  const endDate = new Date(activeRange.endDate + "T23:59:59");
  const remainingDays = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / 86400000));

  const badgeText =
    cycleDay === 1
      ? isId ? "Kalender (Tgl 1)" : "Calendar (Day 1)"
      : cycleDay === 25
      ? isId ? "Gajian Tgl 25" : "Payday Day 25"
      : cycleDay === 28
      ? isId ? "Gajian Tgl 28" : "Payday Day 28"
      : isId ? `Kustom Tgl ${cycleDay}` : `Custom Day ${cycleDay}`;

  return (
    <div
      data-testid="cycle-banner-card"
      onClick={onOpenEditCycle}
      className="group mb-3 inline-flex max-w-full items-center justify-between gap-2 rounded-xl border border-amber-500/25 bg-amber-50/70 px-3 py-1.5 text-xs text-slate-800 transition-all hover:border-amber-400 hover:bg-amber-100/60 active:scale-[0.99] cursor-pointer touch-manipulation select-none dark:border-primary/20 dark:bg-primary/8 dark:text-foreground dark:hover:border-primary/40 dark:hover:bg-primary/12"
      title={isId ? "Klik untuk mengubah tanggal siklus keuangan" : "Click to change financial cycle date"}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpenEditCycle();
        }
      }}
    >
      <div className="flex min-w-0 items-center gap-2 truncate">
        <CalendarClock size={13} className="text-amber-600 dark:text-primary shrink-0" />
        <span className="truncate font-semibold text-slate-800 dark:text-foreground">
          {isId ? "Siklus: " : "Cycle: "}
          <strong className="text-amber-700 dark:text-primary font-bold">{activeRange.label}</strong>
        </span>
        <span className="hidden sm:inline-block rounded-md bg-amber-100/80 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-800 dark:bg-primary/15 dark:text-primary shrink-0">
          {badgeText}
        </span>
        <span className="text-[11px] text-slate-500 dark:text-muted-foreground shrink-0">
          · {remainingDays} {isId ? "hari lagi" : "days left"}
        </span>
      </div>

      <div
        data-testid="cycle-banner-edit-button"
        className="flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-primary shrink-0 ml-1"
      >
        <SlidersHorizontal size={11} className="shrink-0" />
        <span className="underline underline-offset-2">{isId ? "Ubah" : "Edit"}</span>
        <ChevronRight size={12} className="opacity-70 group-hover:translate-x-0.5 transition-transform shrink-0" />
      </div>
    </div>
  );
}
