import { CalendarClock, ChevronRight, SlidersHorizontal } from "lucide-react";
import { getCycleRangeForDate } from "@/lib/analyticsEngine";
import type { FinanceState } from "@/lib/localDb";

export interface FinancialCycleBannerProps {
  state: FinanceState;
  onOpenEditCycle: () => void;
}

export function FinancialCycleBanner({
  state,
  onOpenEditCycle,
}: FinancialCycleBannerProps) {
  const isId = state.locale === "id";
  const cycleDay = state.customCycleDay || 1;
  const today = new Date();
  const activeRange = getCycleRangeForDate(today, cycleDay);

  const startDate = new Date(activeRange.startDate + "T00:00:00");
  const endDate = new Date(activeRange.endDate + "T23:59:59");
  const totalDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));
  const elapsedDays = Math.max(1, Math.min(totalDays, Math.ceil((today.getTime() - startDate.getTime()) / 86400000)));
  const remainingDays = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / 86400000));
  const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));

  const badgeText =
    cycleDay === 1
      ? isId ? "Kalender (Tgl 1)" : "Calendar (Day 1)"
      : cycleDay === 25
      ? isId ? "Gajian (Tgl 25)" : "Payday (Day 25)"
      : cycleDay === 28
      ? isId ? "Gajian (Tgl 28)" : "Payday (Day 28)"
      : isId ? `Kustom (Tgl ${cycleDay})` : `Custom (Day ${cycleDay})`;

  return (
    <div
      data-testid="cycle-banner-card"
      className="group relative mb-5 overflow-hidden rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-card to-card p-3.5 sm:p-4 shadow-sm transition-all hover:border-primary/45 backdrop-blur-md"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {/* Left: Info & Range */}
        <div className="flex items-start gap-3">
          <div className="grid size-9 sm:size-10 place-items-center rounded-xl bg-primary/20 text-primary shrink-0 shadow-xs">
            <CalendarClock size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {isId ? "Siklus Keuangan Aktif" : "Active Financial Cycle"}
              </span>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-extrabold text-primary">
                {badgeText}
              </span>
            </div>

            <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
              <h3 className="font-heading text-sm sm:text-base font-extrabold text-foreground">
                {activeRange.label}
              </h3>
              <span className="text-[11px] font-medium text-muted-foreground">
                · {isId ? `Hari ke-${elapsedDays} (${remainingDays} hari lagi)` : `Day ${elapsedDays} (${remainingDays}d left)`}
              </span>
            </div>
          </div>
        </div>

        {/* Right: Quick action button */}
        <button
          type="button"
          data-testid="cycle-banner-edit-button"
          onClick={onOpenEditCycle}
          aria-label={isId ? "Ubah siklus keuangan" : "Change financial cycle"}
          className="inline-flex items-center justify-center gap-1.5 self-start sm:self-auto rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 sm:py-2 text-xs font-bold text-primary transition-all hover:bg-primary hover:text-primary-foreground active:scale-95 cursor-pointer shadow-xs"
        >
          <SlidersHorizontal size={13} />
          <span>{isId ? "Ubah Siklus" : "Change Cycle"}</span>
          <ChevronRight size={13} className="opacity-60" />
        </button>
      </div>

      {/* Mini cycle progress bar */}
      <div className="mt-3 space-y-1">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-background/80 border border-border/50">
          <div
            className="h-full bg-gradient-to-r from-primary via-amber-400 to-primary transition-all duration-500 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
