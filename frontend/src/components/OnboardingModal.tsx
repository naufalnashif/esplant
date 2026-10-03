import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { CalendarClock, ChevronRight, Sparkles, User } from "lucide-react";
import { BACKDROP } from "@/lib/constants";
import { getCycleRangeForDate } from "@/lib/analyticsEngine";
import type { FinanceState } from "@/lib/localDb";

/**
 * Two-step first-run onboarding wizard.
 * Step 1: "Siapa nama panggilan Anda?" — text input
 * Step 2: "Kapan tanggal gajian / siklus awal Anda?" — segmented control
 *
 * Shown when `state.onboardingDone` is falsy.
 */
export function OnboardingModal({
  state,
  onComplete,
}: {
  state: FinanceState;
  onComplete: (profileName: string, customCycleDay: number) => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState(state.profileName || "");
  const [cycleDay, setCycleDay] = useState(state.customCycleDay || 1);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [localCustom, setLocalCustom] = useState(String(cycleDay));
  const isId = state.locale === "id";

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const SEGMENTS = [
    { value: 1, label: "Tgl 1", sublabel: isId ? "Kalender" : "Calendar" },
    { value: 25, label: "Tgl 25", sublabel: isId ? "Gajian" : "Payday" },
    { value: 28, label: "Tgl 28", sublabel: isId ? "Gajian" : "Payday" },
    { value: -1, label: isId ? "Kustom" : "Custom", sublabel: "" },
  ];

  const isCustomPreset = cycleDay === 1 || cycleDay === 25 || cycleDay === 28;
  const activeSegment = showCustomInput ? -1 : (isCustomPreset ? cycleDay : -1);
  const activeRange = getCycleRangeForDate(new Date(), cycleDay);

  const handleSegment = (val: number) => {
    if (val === -1) {
      setShowCustomInput(true);
    } else {
      setShowCustomInput(false);
      setCycleDay(val);
    }
  };

  const handleFinish = () => {
    const trimmed = name.trim() || (isId ? "Pengguna" : "User");
    onComplete(trimmed, cycleDay);
  };

  return createPortal(
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center p-4 ${BACKDROP.overlay}`}
      role="dialog"
      aria-modal="true"
      aria-label={isId ? "Selamat Datang" : "Welcome"}
      data-testid="onboarding-modal"
    >
      <div className="animate-sheet-up relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 px-6 pt-5">
          <span className={`h-1.5 rounded-full transition-all duration-300 ${step >= 1 ? "w-8 bg-primary" : "w-4 bg-border"}`} />
          <span className={`h-1.5 rounded-full transition-all duration-300 ${step >= 2 ? "w-8 bg-primary" : "w-4 bg-border"}`} />
        </div>

        {/* Step 1 — Name */}
        {step === 1 && (
          <div className="px-6 pt-6 pb-7">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
                <User size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                  {isId ? "Langkah 1 dari 2" : "Step 1 of 2"}
                </p>
                <h2 className="font-heading text-lg font-extrabold">
                  {isId ? "Siapa nama panggilan Anda?" : "What should we call you?"}
                </h2>
              </div>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              {isId
                ? "Nama ini hanya tersimpan di perangkat Anda — tidak dikirim ke server mana pun."
                : "This name is stored locally on your device — never sent to any server."}
            </p>
            <input
              data-testid="onboarding-name-input"
              type="text"
              maxLength={24}
              autoFocus
              placeholder={isId ? "contoh: Naufal" : "e.g. John"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) setStep(2); }}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none"
            />
            <button
              type="button"
              data-testid="onboarding-next-button"
              disabled={!name.trim()}
              onClick={() => setStep(2)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isId ? "Lanjut" : "Next"}
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Step 2 — Financial Cycle */}
        {step === 2 && (
          <div className="px-6 pt-6 pb-7">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
                <CalendarClock size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                  {isId ? "Langkah 2 dari 2" : "Step 2 of 2"}
                </p>
                <h2 className="font-heading text-lg font-extrabold">
                  {isId ? "Kapan siklus keuangan Anda?" : "When does your pay cycle start?"}
                </h2>
              </div>
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              {isId
                ? "Pilih tanggal awal pembukuan sesuai tanggal gajian Anda."
                : "Pick your cycle start date — usually your payday."}
            </p>

            {/* Segmented Control */}
            <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-border/70 bg-background/50 p-1">
              {SEGMENTS.map((seg) => {
                const active = seg.value === activeSegment;
                return (
                  <button
                    key={seg.value}
                    type="button"
                    data-testid={`onboarding-cycle-${seg.value}`}
                    onClick={() => handleSegment(seg.value)}
                    className={`flex flex-col items-center justify-center rounded-lg px-2 py-2.5 text-center transition-all ${
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    }`}
                  >
                    <span className="text-xs font-extrabold leading-none">{seg.label}</span>
                    {seg.sublabel && (
                      <span className={`mt-0.5 text-[9px] leading-none ${active ? "text-primary-foreground/70" : "text-muted-foreground/70"}`}>
                        {seg.sublabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom day input */}
            {showCustomInput && (
              <div className="mt-3 flex items-center gap-2">
                <label htmlFor="onboarding-custom-day" className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                  {isId ? "Tanggal (1 – 31):" : "Day (1 – 31):"}
                </label>
                <input
                  id="onboarding-custom-day"
                  data-testid="onboarding-custom-day-input"
                  type="number"
                  min={1}
                  max={31}
                  value={localCustom}
                  onChange={(e) => {
                    setLocalCustom(e.target.value);
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val >= 1 && val <= 31) setCycleDay(val);
                  }}
                  className="w-20 rounded-lg border border-primary/40 bg-background px-3 py-1.5 font-data text-xs font-bold text-foreground focus:border-primary focus:outline-none"
                />
              </div>
            )}

            {/* Cycle preview badge */}
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
              <CalendarClock size={13} className="shrink-0 text-primary" />
              <span className="text-xs font-semibold text-primary">
                {isId ? "Siklus Aktif: " : "Active Cycle: "}
                <span className="font-bold">{activeRange.label}</span>
              </span>
            </div>

            {/* Back + Submit */}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                data-testid="onboarding-back-button"
                onClick={() => setStep(1)}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-bold text-muted-foreground transition-colors hover:bg-secondary"
              >
                {isId ? "Kembali" : "Back"}
              </button>
              <button
                type="button"
                data-testid="onboarding-finish-button"
                onClick={handleFinish}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90"
              >
                <Sparkles size={15} />
                {isId ? "Mulai Gunakan" : "Get Started"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
