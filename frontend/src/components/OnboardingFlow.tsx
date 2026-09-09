import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight, Check, ChevronLeft, Cloud, Database, HardDrive,
  Link as LinkIcon, Loader2, LogIn, Plus, Sparkles, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useStorage } from "@/lib/storageContext";
import type { UserProfile } from "@/lib/storageContext";
import {
  initGoogleAuth,
  signIn as googleSignIn,
  isSignedIn as checkGoogleSignedIn,
  createNewSpreadsheet,
  readFullState,
  initializeSheetStructure,
} from "@/lib/googleSheets";

/* ─────────────────── Constants ─────────────────── */
const MAX_NICKNAME = 20;
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "";

/* ─────────────────── Animations CSS ─────────────────── */
const fadeSlideClass = "animate-rise-in";

/* ─────────────────── Step Indicator ─────────────────── */
function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-2 justify-center mt-8 mb-2">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`h-2 rounded-full transition-all duration-300 ${
            i === current
              ? "w-8 bg-[var(--primary)]"
              : i < current
                ? "w-2 bg-[var(--primary)] opacity-50"
                : "w-2 bg-[var(--muted-foreground)] opacity-30"
          }`}
        />
      ))}
    </div>
  );
}

/* ─────────────────── Glassmorphism Card ─────────────────── */
function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`
        relative overflow-hidden rounded-2xl
        bg-[var(--card)]/80 backdrop-blur-xl
        border border-[var(--border)]/50
        shadow-2xl shadow-black/10
        p-8 md:p-10
        ${className}
      `}
    >
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/[0.03] to-transparent pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

/* ─────────────────── Main Onboarding Component ─────────────────── */
export function OnboardingFlow({ onComplete }: { onComplete: () => void }) {
  const { setProfile, googleReady } = useStorage();
  const [step, setStep] = useState(0);
  const [nickname, setNickname] = useState("");
  const [storageMode, setStorageMode] = useState<"sheets" | "local">("sheets");
  const [connectionMethod, setConnectionMethod] = useState<"manual" | "oauth">("manual");
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [googleEmail, setGoogleEmail] = useState("");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [existingInput, setExistingInput] = useState("");
  const [useExisting, setUseExisting] = useState(true);
  const [connectionSuccess, setConnectionSuccess] = useState(false);

  const totalSteps = storageMode === "sheets" ? 5 : 4;

  // Initialize Google Auth if client ID exists and method is oauth
  useEffect(() => {
    if (step === 3 && storageMode === "sheets" && googleReady && GOOGLE_CLIENT_ID && connectionMethod === "oauth") {
      initGoogleAuth(GOOGLE_CLIENT_ID).catch(() => {
        /* Ignore background init failure */
      });
    }
  }, [step, storageMode, googleReady, connectionMethod]);

  /* ── Google OAuth Sign In ── */
  const handleGoogleSignIn = useCallback(async () => {
    if (!GOOGLE_CLIENT_ID) {
      toast.info("OAuth 1-Click memerlukan Google Client ID. Gunakan mode Input Link & Email yang 100% tanpa setup!");
      setConnectionMethod("manual");
      return;
    }
    setIsAuthenticating(true);
    try {
      const tokenResponse = await googleSignIn();
      try {
        const res = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo`, {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        if (res.ok) {
          const info = await res.json();
          setGoogleEmail(info.email ?? "");
        }
      } catch { /* best effort */ }
      toast.success("Berhasil login ke Google!");
    } catch (err) {
      toast.error("Login Google gagal. Anda bisa menggunakan mode Input Link & Email.");
      console.error("Google sign-in error:", err);
    } finally {
      setIsAuthenticating(false);
    }
  }, []);

  /* ── Manual Link/ID Connection ── */
  const handleConnectManual = useCallback(() => {
    const email = googleEmail.trim();
    let raw = existingInput.trim();

    if (!email || !email.includes("@")) {
      toast.error("Masukkan email Google yang valid (contoh: nama@gmail.com).");
      return;
    }
    if (!raw) {
      toast.error("Masukkan Link (URL) atau ID Spreadsheet Google Anda.");
      return;
    }

    // Extract ID if user pasted full URL
    const urlMatch = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
    if (urlMatch) {
      raw = urlMatch[1];
    }

    setSpreadsheetId(raw);
    setConnectionSuccess(true);
    toast.success("Spreadsheet terhubung!");
  }, [googleEmail, existingInput]);

  /* ── Create or Connect Spreadsheet via OAuth ── */
  const handleCreateSpreadsheetOAuth = useCallback(async () => {
    setIsCreatingSheet(true);
    try {
      if (useExisting && existingInput.trim()) {
        let sheetId = existingInput.trim();
        const urlMatch = sheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
        if (urlMatch) sheetId = urlMatch[1];

        await initializeSheetStructure(sheetId);
        await readFullState(sheetId);
        setSpreadsheetId(sheetId);
      } else {
        const newId = await createNewSpreadsheet(`Esplan — ${nickname || "Finance"}`);
        setSpreadsheetId(newId);
      }
      setConnectionSuccess(true);
      toast.success("Spreadsheet siap digunakan!");
    } catch (err) {
      console.error("Spreadsheet error:", err);
      toast.error("Gagal membuat/menghubungkan spreadsheet via Google API.");
    } finally {
      setIsCreatingSheet(false);
    }
  }, [useExisting, existingInput, nickname]);

  /* ── Complete Onboarding ── */
  const handleFinish = useCallback(() => {
    const profile: UserProfile = {
      nickname: nickname.trim() || "User",
      email: googleEmail.trim(),
      spreadsheetId: storageMode === "sheets" ? spreadsheetId.trim() : "",
      spreadsheetUrl: storageMode === "sheets" && spreadsheetId.trim()
        ? `https://docs.google.com/spreadsheets/d/${spreadsheetId.trim()}`
        : "",
      storageMode,
      onboarded: true,
    };
    setProfile(profile);
    onComplete();
  }, [nickname, googleEmail, storageMode, spreadsheetId, setProfile, onComplete]);

  /* ── Can proceed to next step? ── */
  const canProceed = useMemo(() => {
    switch (step) {
      case 0: return true;
      case 1: return nickname.trim().length >= 2;
      case 2: return true;
      case 3:
        if (storageMode === "local") return true;
        return connectionSuccess || Boolean(spreadsheetId.trim() && googleEmail.trim());
      case 4: return true;
      default: return false;
    }
  }, [step, nickname, storageMode, connectionSuccess, spreadsheetId, googleEmail]);

  const goNext = () => {
    if (step === 2 && storageMode === "local") {
      setStep(totalSteps - 1);
    } else {
      setStep((s) => Math.min(s + 1, totalSteps - 1));
    }
  };
  const goBack = () => {
    if (step === totalSteps - 1 && storageMode === "local") {
      setStep(2);
    } else {
      setStep((s) => Math.max(s - 1, 0));
    }
  };

  /* ─────────────────── Render Steps ─────────────────── */
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
      {/* Background decoration */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-[var(--primary)]/[0.05] blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-[var(--primary)]/[0.03] blur-[100px]" />
      </div>

      <div className="w-full max-w-lg relative z-10">
        {/* ── Step 0: Welcome ── */}
        {step === 0 && (
          <div className={fadeSlideClass} key="step-0">
            <GlassCard className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[var(--primary)] to-amber-500 flex items-center justify-center shadow-lg shadow-[var(--primary)]/20">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h1 className="font-heading text-3xl font-bold text-[var(--foreground)] mb-3">
                Selamat Datang di Esplan
              </h1>
              <p className="text-[var(--muted-foreground)] text-lg mb-2">
                Satu ruang tenang untuk keputusan uang yang lebih baik.
              </p>
              <p className="text-[var(--muted-foreground)] text-sm mb-8 opacity-75">
                Mari siapkan workspace keuangan pribadi Anda dalam beberapa langkah sederhana.
              </p>
              <Button
                onClick={goNext}
                className="w-full h-12 text-base font-semibold bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-[var(--primary-foreground)] rounded-xl gap-2"
              >
                Mulai Sekarang
                <ArrowRight className="w-5 h-5" />
              </Button>
            </GlassCard>
            <StepDots total={totalSteps} current={0} />
          </div>
        )}

        {/* ── Step 1: Nickname ── */}
        {step === 1 && (
          <div className={fadeSlideClass} key="step-1">
            <GlassCard>
              <button
                onClick={goBack}
                className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Kembali
              </button>

              <div className="w-14 h-14 rounded-xl bg-blue-500/10 flex items-center justify-center mb-5">
                <User className="w-7 h-7 text-blue-500" />
              </div>

              <h2 className="font-heading text-2xl font-bold text-[var(--foreground)] mb-2">
                Siapa nama Anda?
              </h2>
              <p className="text-[var(--muted-foreground)] text-sm mb-6">
                Nama panggilan untuk personalisasi workspace Anda.
              </p>

              <div className="relative mb-2">
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value.slice(0, MAX_NICKNAME))}
                  placeholder="Contoh: Naufal"
                  autoFocus
                  className="
                    w-full h-14 px-4 rounded-xl
                    bg-[var(--background)] border border-[var(--border)]
                    text-[var(--foreground)] text-lg font-medium
                    placeholder:text-[var(--muted-foreground)]/50
                    focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)]
                    transition-all
                  "
                  onKeyDown={(e) => e.key === "Enter" && canProceed && goNext()}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[var(--muted-foreground)] font-data">
                  {nickname.length}/{MAX_NICKNAME}
                </span>
              </div>

              {nickname.trim().length >= 2 && (
                <p className="text-sm text-[var(--primary)] mt-3 animate-rise-in">
                  ✨ Selamat datang, <strong>{nickname.trim()}</strong>!
                </p>
              )}

              <Button
                onClick={goNext}
                disabled={!canProceed}
                className="w-full h-12 mt-6 text-base font-semibold bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-[var(--primary-foreground)] rounded-xl gap-2 disabled:opacity-40"
              >
                Lanjutkan
                <ArrowRight className="w-5 h-5" />
              </Button>
            </GlassCard>
            <StepDots total={totalSteps} current={1} />
          </div>
        )}

        {/* ── Step 2: Storage Mode ── */}
        {step === 2 && (
          <div className={fadeSlideClass} key="step-2">
            <GlassCard>
              <button
                onClick={goBack}
                className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Kembali
              </button>

              <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-5">
                <Database className="w-7 h-7 text-emerald-500" />
              </div>

              <h2 className="font-heading text-2xl font-bold text-[var(--foreground)] mb-2">
                Pilih penyimpanan data
              </h2>
              <p className="text-[var(--muted-foreground)] text-sm mb-6">
                Pilih tempat data keuangan Anda akan disimpan.
              </p>

              <div className="space-y-3">
                {/* Google Sheets option */}
                <button
                  onClick={() => setStorageMode("sheets")}
                  className={`
                    w-full p-4 rounded-xl text-left border-2 transition-all duration-200
                    ${storageMode === "sheets"
                      ? "border-[var(--primary)] bg-[var(--primary)]/[0.06] shadow-md shadow-[var(--primary)]/10"
                      : "border-[var(--border)] hover:border-[var(--muted-foreground)]/30 bg-[var(--background)]/50"
                    }
                  `}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      storageMode === "sheets" ? "bg-[var(--primary)]/20" : "bg-[var(--muted)]"
                    }`}>
                      <Cloud className={`w-5 h-5 ${storageMode === "sheets" ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-[var(--foreground)]">Google Sheets</h3>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500">
                          Direkomendasikan
                        </span>
                      </div>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        Data disimpan di spreadsheet Google Anda. Sync otomatis lintas peranti & backup di cloud.
                      </p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      storageMode === "sheets" ? "border-[var(--primary)] bg-[var(--primary)]" : "border-[var(--muted-foreground)]/40"
                    }`}>
                      {storageMode === "sheets" && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                </button>

                {/* Local option */}
                <button
                  onClick={() => setStorageMode("local")}
                  className={`
                    w-full p-4 rounded-xl text-left border-2 transition-all duration-200
                    ${storageMode === "local"
                      ? "border-[var(--primary)] bg-[var(--primary)]/[0.06] shadow-md shadow-[var(--primary)]/10"
                      : "border-[var(--border)] hover:border-[var(--muted-foreground)]/30 bg-[var(--background)]/50"
                    }
                  `}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      storageMode === "local" ? "bg-[var(--primary)]/20" : "bg-[var(--muted)]"
                    }`}>
                      <HardDrive className={`w-5 h-5 ${storageMode === "local" ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-[var(--foreground)] mb-1">Lokal Saja</h3>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        Data hanya di browser ini. 100% offline, tanpa terhubung ke Google.
                      </p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                      storageMode === "local" ? "border-[var(--primary)] bg-[var(--primary)]" : "border-[var(--muted-foreground)]/40"
                    }`}>
                      {storageMode === "local" && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                </button>
              </div>

              <Button
                onClick={goNext}
                className="w-full h-12 mt-6 text-base font-semibold bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-[var(--primary-foreground)] rounded-xl gap-2"
              >
                Lanjutkan
                <ArrowRight className="w-5 h-5" />
              </Button>
            </GlassCard>
            <StepDots total={totalSteps} current={2} />
          </div>
        )}

        {/* ── Step 3: Google Connection ── */}
        {step === 3 && storageMode === "sheets" && (
          <div className={fadeSlideClass} key="step-3">
            <GlassCard>
              <button
                onClick={goBack}
                className="flex items-center gap-1 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Kembali
              </button>

              <div className="w-14 h-14 rounded-xl bg-violet-500/10 flex items-center justify-center mb-5">
                <Cloud className="w-7 h-7 text-violet-500" />
              </div>

              <h2 className="font-heading text-2xl font-bold text-[var(--foreground)] mb-2">
                Koneksikan Google Sheets
              </h2>
              <p className="text-[var(--muted-foreground)] text-sm mb-6">
                Masukkan email Anda & link Google Spreadsheet untuk menghubungkan database.
              </p>

              {/* Method Switcher Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--muted)]/50 rounded-xl mb-5">
                <button
                  type="button"
                  onClick={() => setConnectionMethod("manual")}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                    connectionMethod === "manual"
                      ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <LinkIcon className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                  Link & Email (Mudah)
                </button>
                <button
                  type="button"
                  onClick={() => setConnectionMethod("oauth")}
                  className={`py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                    connectionMethod === "oauth"
                      ? "bg-[var(--card)] text-[var(--foreground)] shadow-sm"
                      : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                  Login OAuth Google
                </button>
              </div>

              {/* ── Method 1: Manual Link & Email ── */}
              {connectionMethod === "manual" && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                      Email Google Anda
                    </label>
                    <input
                      type="email"
                      value={googleEmail}
                      onChange={(e) => setGoogleEmail(e.target.value)}
                      placeholder="contoh: nama@gmail.com"
                      className="
                        w-full h-11 px-3.5 rounded-xl text-sm
                        bg-[var(--background)] border border-[var(--border)]
                        text-[var(--foreground)]
                        placeholder:text-[var(--muted-foreground)]/50
                        focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)]
                        transition-all
                      "
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1">
                      Link (URL) atau ID Spreadsheet Google
                    </label>
                    <input
                      type="text"
                      value={existingInput}
                      onChange={(e) => setExistingInput(e.target.value)}
                      placeholder="https://docs.google.com/spreadsheets/d/1abc.../edit"
                      className="
                        w-full h-11 px-3.5 rounded-xl text-sm
                        bg-[var(--background)] border border-[var(--border)]
                        text-[var(--foreground)]
                        placeholder:text-[var(--muted-foreground)]/50
                        focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)]
                        transition-all
                      "
                    />
                    <p className="text-[11px] text-[var(--muted-foreground)] mt-1.5 leading-relaxed">
                      💡 <strong>Petunjuk:</strong> Buka <a href="https://sheets.new" target="_blank" rel="noreferrer" className="text-[var(--primary)] underline">sheets.new</a>, buat spreadsheet baru, lalu salin link URL dari browser dan tempel di sini.
                    </p>
                  </div>

                  {!connectionSuccess ? (
                    <Button
                      onClick={handleConnectManual}
                      disabled={!googleEmail.trim() || !existingInput.trim()}
                      className="w-full h-11 text-sm font-semibold bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-[var(--primary-foreground)] rounded-xl gap-2 disabled:opacity-40"
                    >
                      <LinkIcon className="w-4 h-4" />
                      Koneksikan Spreadsheet
                    </Button>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold text-emerald-500">✅ Spreadsheet Terhubung!</p>
                        <p className="text-[11px] text-[var(--muted-foreground)] font-data truncate max-w-[240px]">
                          ID: {spreadsheetId}
                        </p>
                      </div>
                      <a
                        href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-semibold text-[var(--primary)] hover:underline"
                      >
                        Buka →
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* ── Method 2: OAuth 1-Click Login ── */}
              {connectionMethod === "oauth" && (
                <div className="space-y-4">
                  <div className={`p-4 rounded-xl border transition-all ${
                    checkGoogleSignedIn()
                      ? "border-emerald-500/40 bg-emerald-500/[0.06]"
                      : "border-[var(--border)] bg-[var(--background)]/50"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          checkGoogleSignedIn() ? "bg-emerald-500 text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                        }`}>
                          {checkGoogleSignedIn() ? <Check className="w-4 h-4" /> : "1"}
                        </div>
                        <div>
                          <p className="font-medium text-[var(--foreground)] text-sm">Login Akun Google</p>
                          {googleEmail && (
                            <p className="text-xs text-emerald-500">{googleEmail}</p>
                          )}
                        </div>
                      </div>
                      {!checkGoogleSignedIn() && (
                        <Button
                          onClick={handleGoogleSignIn}
                          disabled={isAuthenticating}
                          variant="outline"
                          className="h-9 text-sm rounded-lg gap-2"
                        >
                          {isAuthenticating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <LogIn className="w-4 h-4" />
                          )}
                          {isAuthenticating ? "Memproses..." : "Login Google"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {checkGoogleSignedIn() && (
                    <div className={`p-4 rounded-xl border transition-all animate-rise-in ${
                      connectionSuccess
                        ? "border-emerald-500/40 bg-emerald-500/[0.06]"
                        : "border-[var(--border)] bg-[var(--background)]/50"
                    }`}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          connectionSuccess ? "bg-emerald-500 text-white" : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                        }`}>
                          {connectionSuccess ? <Check className="w-4 h-4" /> : "2"}
                        </div>
                        <p className="font-medium text-[var(--foreground)] text-sm">Pilih / Buat Spreadsheet</p>
                      </div>

                      {!connectionSuccess && (
                        <div className="ml-11 space-y-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => setUseExisting(false)}
                              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                !useExisting
                                  ? "bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30"
                                  : "bg-[var(--muted)] text-[var(--muted-foreground)] border border-transparent hover:bg-[var(--muted)]/80"
                              }`}
                            >
                              <Plus className="w-3 h-3 inline mr-1 -mt-0.5" />
                              Buat Baru (Otomatis)
                            </button>
                            <button
                              onClick={() => setUseExisting(true)}
                              className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                                useExisting
                                  ? "bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30"
                                  : "bg-[var(--muted)] text-[var(--muted-foreground)] border border-transparent hover:bg-[var(--muted)]/80"
                              }`}
                            >
                              <Database className="w-3 h-3 inline mr-1 -mt-0.5" />
                              Gunakan Link Spreadsheet
                            </button>
                          </div>

                          {useExisting && (
                            <input
                              type="text"
                              value={existingInput}
                              onChange={(e) => setExistingInput(e.target.value)}
                              placeholder="Spreadsheet URL atau ID"
                              className="
                                w-full h-10 px-3 rounded-lg text-sm
                                bg-[var(--background)] border border-[var(--border)]
                                text-[var(--foreground)]
                                placeholder:text-[var(--muted-foreground)]/50
                                focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:border-[var(--primary)]
                                transition-all
                              "
                            />
                          )}

                          <Button
                            onClick={handleCreateSpreadsheetOAuth}
                            disabled={isCreatingSheet || (useExisting && !existingInput.trim())}
                            className="w-full h-10 text-sm font-semibold bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-[var(--primary-foreground)] rounded-lg gap-2 disabled:opacity-40"
                          >
                            {isCreatingSheet ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : useExisting ? (
                              <Database className="w-4 h-4" />
                            ) : (
                              <Plus className="w-4 h-4" />
                            )}
                            {isCreatingSheet
                              ? "Menyiapkan..."
                              : useExisting
                                ? "Koneksikan"
                                : "Buat Spreadsheet Baru"
                            }
                          </Button>
                        </div>
                      )}

                      {connectionSuccess && spreadsheetId && (
                        <div className="ml-11">
                          <p className="text-xs text-emerald-500 mb-1">✅ Spreadsheet terhubung</p>
                          <a
                            href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-[var(--primary)] underline underline-offset-2 hover:opacity-80 font-data"
                          >
                            Buka di Google Sheets →
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={goNext}
                disabled={!canProceed}
                className="w-full h-12 mt-6 text-base font-semibold bg-[var(--primary)] hover:bg-[var(--primary)]/90 text-[var(--primary-foreground)] rounded-xl gap-2 disabled:opacity-40"
              >
                Lanjutkan
                <ArrowRight className="w-5 h-5" />
              </Button>
            </GlassCard>
            <StepDots total={totalSteps} current={3} />
          </div>
        )}

        {/* ── Final Step: Ready! ── */}
        {step === totalSteps - 1 && (
          <div className={fadeSlideClass} key="step-final">
            <GlassCard className="text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                <Check className="w-10 h-10 text-white" strokeWidth={3} />
              </div>

              <h2 className="font-heading text-3xl font-bold text-[var(--foreground)] mb-3">
                Semua Siap! 🎉
              </h2>
              <p className="text-[var(--muted-foreground)] text-lg mb-6">
                Selamat datang, <strong className="text-[var(--foreground)]">{nickname.trim() || "User"}</strong>!
              </p>

              {/* Summary */}
              <div className="bg-[var(--background)]/60 rounded-xl p-4 mb-6 text-left space-y-3">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-[var(--muted-foreground)]" />
                  <span className="text-sm text-[var(--muted-foreground)]">Nama:</span>
                  <span className="text-sm font-medium text-[var(--foreground)] ml-auto">{nickname.trim() || "User"}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Database className="w-4 h-4 text-[var(--muted-foreground)]" />
                  <span className="text-sm text-[var(--muted-foreground)]">Penyimpanan:</span>
                  <span className="text-sm font-medium text-[var(--foreground)] ml-auto">
                    {storageMode === "sheets" ? "Google Sheets" : "Lokal (Browser)"}
                  </span>
                </div>
                {storageMode === "sheets" && googleEmail && (
                  <div className="flex items-center gap-3">
                    <Cloud className="w-4 h-4 text-[var(--muted-foreground)]" />
                    <span className="text-sm text-[var(--muted-foreground)]">Email Google:</span>
                    <span className="text-sm font-medium text-[var(--foreground)] ml-auto truncate max-w-[180px]">{googleEmail}</span>
                  </div>
                )}
                {storageMode === "sheets" && spreadsheetId && (
                  <div className="flex items-center gap-3">
                    <LinkIcon className="w-4 h-4 text-[var(--muted-foreground)]" />
                    <span className="text-sm text-[var(--muted-foreground)]">Spreadsheet ID:</span>
                    <span className="text-xs font-data font-medium text-[var(--primary)] ml-auto truncate max-w-[160px]">{spreadsheetId}</span>
                  </div>
                )}
              </div>

              <Button
                onClick={handleFinish}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-[var(--primary)] to-amber-500 hover:opacity-90 text-[var(--primary-foreground)] rounded-xl gap-2 shadow-lg shadow-[var(--primary)]/20"
              >
                <Sparkles className="w-5 h-5" />
                Buka Dashboard
              </Button>

              <button
                onClick={goBack}
                className="mt-4 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                ← Kembali ke pengaturan
              </button>
            </GlassCard>
            <StepDots total={totalSteps} current={totalSteps - 1} />
          </div>
        )}
      </div>
    </div>
  );
}
