import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { CalendarClock, ChevronRight, Sparkles, User } from "lucide-react";
import { BACKDROP } from "@/lib/constants";
import { FinancialCycleSelector } from "@/components/FinancialCycleSelector";
import type { FinanceState } from "@/lib/localDb";

/**
 * Two-step first-run onboarding wizard.
 * Step 1: "Siapa nama panggilan Anda?" — text input
 * Step 2: "Kapan tanggal gajian / siklus awal Anda?" — interactive FinancialCycleSelector
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
  const isId = state.locale === "id";

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

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
          <div className="max-h-[82vh] overflow-y-auto px-6 pt-6 pb-7">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary shrink-0">
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
                ? "Pilih tanggal awal pembukuan sesuai tanggal gajian Anda agar ringkasan dan grafik bulanan akurat."
                : "Pick your cycle start date — usually your payday — to keep monthly calculations accurate."}
            </p>

            <FinancialCycleSelector
              value={cycleDay}
              onChange={setCycleDay}
              locale={state.locale}
              compact
            />

            {/* Back + Submit */}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                data-testid="onboarding-back-button"
                onClick={() => setStep(1)}
                className="flex-1 rounded-xl border border-border py-3 text-sm font-bold text-muted-foreground transition-colors hover:bg-secondary cursor-pointer"
              >
                {isId ? "Kembali" : "Back"}
              </button>
              <button
                type="button"
                data-testid="onboarding-finish-button"
                onClick={handleFinish}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-primary-foreground transition-all hover:bg-primary/90 shadow-md active:scale-95 cursor-pointer"
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
