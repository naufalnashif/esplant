import { useState, useId } from "react";
import { CalendarClock, Minus, Plus, Sparkles } from "lucide-react";
import { getCycleRangeForDate } from "@/lib/analyticsEngine";
import type { Locale } from "@/lib/localDb";

export interface FinancialCycleSelectorProps {
  value: number; // 1 to 31
  onChange: (day: number) => void;
  locale?: Locale;
  compact?: boolean;
}

const COMMON_CUSTOM_DAYS = [5, 10, 15, 20, 27, 30];

export function FinancialCycleSelector({
  value,
  onChange,
  locale = "id",
  compact = false,
}: FinancialCycleSelectorProps) {
  const isId = locale === "id";
  const inputId = useId();
  const currentDay = Math.max(1, Math.min(31, Math.floor(value || 1)));

  const isPreset = currentDay === 1 || currentDay === 25 || currentDay === 28;
  const [isCustomMode, setIsCustomMode] = useState(!isPreset);
  const [localInput, setLocalInput] = useState(String(currentDay));

  const PRESETS = [
    { value: 1, label: "Tgl 1", sublabel: isId ? "Kalender" : "Calendar" },
    { value: 25, label: "Tgl 25", sublabel: isId ? "Gajian Swasta" : "Payday" },
    { value: 28, label: "Tgl 28", sublabel: isId ? "Gajian ASN/BUMN" : "Gov Payday" },
    { value: -1, label: isId ? "Kustom" : "Custom", sublabel: isId ? "Pilih 1–31" : "Pick 1–31" },
  ];

  const activePreset = isCustomMode ? -1 : (isPreset ? currentDay : -1);

  // Cycle range and progress calculations
  const today = new Date();
  const activeRange = getCycleRangeForDate(today, currentDay);
  const startDate = new Date(activeRange.startDate + "T00:00:00");
  const endDate = new Date(activeRange.endDate + "T23:59:59");
  const totalDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86400000));
  const elapsedDays = Math.max(1, Math.min(totalDays, Math.ceil((today.getTime() - startDate.getTime()) / 86400000)));
  const remainingDays = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / 86400000));
  const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));

  const handleSelectDay = (day: number) => {
    const clamped = Math.max(1, Math.min(31, Math.floor(day)));
    setLocalInput(String(clamped));
    onChange(clamped);
  };

  const handlePresetClick = (presetVal: number) => {
    if (presetVal === -1) {
      setIsCustomMode(true);
    } else {
      setIsCustomMode(false);
      handleSelectDay(presetVal);
    }
  };

  const handleStepper = (delta: number) => {
    const next = Math.max(1, Math.min(31, currentDay + delta));
    handleSelectDay(next);
  };

  return (
    <div className="flex flex-col gap-4" data-testid="financial-cycle-selector">
      {/* 1. Preset Segmented Control */}
      <div>
        <label className="mb-2 block text-xs font-semibold text-muted-foreground">
          {isId ? "Pilihan Cepat Siklus:" : "Quick Preset:"}
        </label>
        <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-border/70 bg-background/50 p-1">
          {PRESETS.map((preset) => {
            const isActive = preset.value === activePreset;
            return (
              <button
                key={preset.value}
                type="button"
                data-testid={`cycle-preset-button-${preset.value}`}
                onClick={() => handlePresetClick(preset.value)}
                className={`flex flex-col items-center justify-center rounded-lg px-2 py-2 text-center transition-all cursor-pointer ${
                  isActive
                    ? "bg-primary text-primary-foreground font-bold shadow-sm scale-[1.02]"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                }`}
              >
                <span className="text-xs font-extrabold leading-tight">{preset.label}</span>
                {preset.sublabel && (
                  <span
                    className={`mt-0.5 text-[9px] leading-tight ${
                      isActive ? "text-primary-foreground/80 font-medium" : "text-muted-foreground/70"
                    }`}
                  >
                    {preset.sublabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Interactive Custom Day Picker (Shown in custom mode) */}
      {isCustomMode && (
        <div className="rounded-xl border border-border/60 bg-card/60 p-3 sm:p-4 space-y-3.5 transition-all animate-in fade-in duration-200">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Sparkles size={13} className="text-primary" />
              {isId ? "Pilih Tanggal Mulai Siklus (1 – 31)" : "Select Cycle Start Day (1 – 31)"}
            </span>
            {/* Direct Number Input + Stepper for precision */}
            <div className="flex items-center gap-1 bg-background rounded-lg border border-border px-1 py-0.5">
              <button
                type="button"
                data-testid="cycle-day-decrement"
                onClick={() => handleStepper(-1)}
                disabled={currentDay <= 1}
                aria-label="Decrease day"
                className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                <Minus size={12} />
              </button>
              <div className="flex items-center px-1">
                <span className="text-[11px] font-semibold text-muted-foreground mr-1">Tgl</span>
                <input
                  id={inputId}
                  data-testid="cycle-day-custom-input"
                  type="number"
                  min={1}
                  max={31}
                  value={localInput}
                  onChange={(e) => {
                    setLocalInput(e.target.value);
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 1 && val <= 31) {
                      onChange(val);
                    }
                  }}
                  onBlur={() => setLocalInput(String(currentDay))}
                  className="w-8 bg-transparent text-center font-data text-xs font-bold text-foreground focus:outline-none"
                />
              </div>
              <button
                type="button"
                data-testid="cycle-day-increment"
                onClick={() => handleStepper(1)}
                disabled={currentDay >= 31}
                aria-label="Increase day"
                className="grid size-6 place-items-center rounded text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
              >
                <Plus size={12} />
              </button>
            </div>
          </div>

          {/* Quick Popular Dates */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-medium text-muted-foreground mr-1">
              {isId ? "Tanggal populer:" : "Popular days:"}
            </span>
            {COMMON_CUSTOM_DAYS.map((day) => (
              <button
                key={day}
                type="button"
                data-testid={`cycle-chip-${day}`}
                onClick={() => handleSelectDay(day)}
                className={`rounded-md px-2 py-0.5 text-[11px] font-semibold transition-colors cursor-pointer ${
                  currentDay === day
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-secondary/70 text-secondary-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                Tgl {day}
              </button>
            ))}
          </div>

          {/* Visual 1–31 Touch Calendar Grid */}
          <div>
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
                const isSelected = day === currentDay;
                return (
                  <button
                    key={day}
                    type="button"
                    data-testid={`cycle-grid-day-${day}`}
                    onClick={() => handleSelectDay(day)}
                    className={`relative flex items-center justify-center rounded-lg font-data font-semibold transition-all cursor-pointer ${
                      compact ? "h-8 text-xs" : "h-9 sm:h-10 text-xs sm:text-sm"
                    } ${
                      isSelected
                        ? "bg-primary text-primary-foreground font-extrabold shadow-md scale-105 ring-2 ring-primary/40 z-10"
                        : "bg-background/80 text-foreground hover:bg-secondary hover:border-primary/50 border border-border/50"
                    }`}
                  >
                    {day}
                    {isSelected && (
                      <span className="absolute -top-1 -right-1 size-2 rounded-full bg-emerald-400 ring-2 ring-background" />
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground text-center">
              {isId
                ? "💡 Sentuh angka di atas untuk memilih tanggal awal siklus bulanan Anda."
                : "💡 Tap any date above to set your monthly cycle start day."}
            </p>
          </div>
        </div>
      )}

      {/* 3. Live Interactive Cycle Preview Card */}
      <div
        data-testid="cycle-live-preview-card"
        className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-3.5 sm:p-4 space-y-2.5"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-primary/20 text-primary shrink-0">
              <CalendarClock size={16} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                {isId ? "Preview Siklus Aktif" : "Active Cycle Preview"}
              </p>
              <p className="font-heading text-sm sm:text-base font-extrabold text-foreground">
                {activeRange.label}
              </p>
            </div>
          </div>
          <span className="rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-bold text-primary shrink-0">
            {currentDay === 1
              ? isId ? "Kalender Standar" : "Standard Calendar"
              : isId ? `Gajian Tgl ${currentDay}` : `Payday Day ${currentDay}`}
          </span>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
            <span>
              {isId ? `Hari ke-${elapsedDays} dari ${totalDays} hari` : `Day ${elapsedDays} of ${totalDays}`}
            </span>
            <span className="font-bold text-primary">
              {remainingDays} {isId ? "hari tersisa" : "days remaining"}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-background/80 border border-border/50">
            <div
              className="h-full bg-gradient-to-r from-primary to-amber-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <p className="text-[11px] leading-relaxed text-muted-foreground">
          {isId
            ? `Pembukuan, grafik arus kas, dan budget guardrail Anda akan dihitung ulang setiap tanggal ${currentDay}.`
            : `Bookkeeping, cashflow trends, and budget guardrails will reset every month on day ${currentDay}.`}
        </p>
      </div>
    </div>
  );
}
