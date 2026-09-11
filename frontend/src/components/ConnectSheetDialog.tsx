import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, FileSpreadsheet, HardDrive, Link2, Loader2, Plus, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectDialogFrame } from "@/components/ConnectDialogFrame";
import { ConnectSetupNotice, ConnectSheetDetails } from "@/components/ConnectSheetDetails";
import { useStorage } from "@/lib/storageContext";
import {
  APP_SHEET_KEYWORD,
  authorize,
  buildSpreadsheetTitle,
  createAppSpreadsheet,
  ensureStructure,
  extractSpreadsheetId,
  findAppSpreadsheets,
  isGoogleConfigured,
  readState,
  writeState,
  type DriveSpreadsheet,
} from "@/lib/googleSheets";
import { loadLocalState } from "@/lib/localDb";

/**
 * Connect flow: sign in first, then let the user PICK one of their existing
 * `*_SelfManageApp` spreadsheets — creating a new one is a deliberate choice, not the only path.
 */
type Step = "intro" | "choose";

const hasData = (state: { accounts: unknown[]; transactions: unknown[] }) =>
  state.accounts.length > 0 || state.transactions.length > 0;

const formatWhen = (value: string | undefined) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

export function ConnectSheetDialog({ open, onClose, onConnected }: { open: boolean; onClose: () => void; onConnected?: () => void }) {
  const { setProfile } = useStorage();
  const [step, setStep] = useState<Step>("intro");
  const [nickname, setNickname] = useState("");
  const [manual, setManual] = useState(false);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState<"" | "login" | "create" | "open" | "local">("");
  const [authFailed, setAuthFailed] = useState(false);
  const [sheets, setSheets] = useState<DriveSpreadsheet[]>([]);
  const [searchFailed, setSearchFailed] = useState("");
  const configured = isGoogleConfigured();
  const appOrigin = typeof window === "undefined" ? "" : window.location.origin;
  const newTitle = buildSpreadsheetTitle();

  const finish = useCallback(
    (spreadsheetId: string, spreadsheetName: string) => {
      setProfile({
        nickname: nickname.trim().slice(0, 24),
        spreadsheetId,
        spreadsheetName,
        storageMode: spreadsheetId ? "sheets" : "local",
        onboarded: true,
      });
      onClose();
      onConnected?.();
    },
    [nickname, onClose, onConnected, setProfile],
  );

  /** Copies this device's data into a spreadsheet that is still empty, so nothing is lost. */
  const carryOverLocalData = async (spreadsheetId: string) => {
    const remote = await readState(spreadsheetId);
    if (hasData(remote)) return;
    const local = await loadLocalState();
    if (hasData(local)) await writeState(spreadsheetId, local);
  };

  const searchSheets = async () => {
    setSearchFailed("");
    try {
      const found = await findAppSpreadsheets();
      setSheets(found);
      return found;
    } catch (error) {
      setSheets([]);
      setSearchFailed(error instanceof Error ? error.message : "Pencarian spreadsheet gagal");
      return [];
    }
  };

  /* Step 1 — OAuth, then discover the user's existing workspaces. */
  const handleLogin = async () => {
    setBusy("login");
    setAuthFailed(false);
    try {
      await authorize(true);
      await searchSheets();
      setStep("choose");
    } catch (error) {
      setAuthFailed(true);
      toast.error(error instanceof Error ? error.message : "Login Google gagal", { duration: 8000 });
    } finally {
      setBusy("");
    }
  };

  /* Step 2a — reuse an existing spreadsheet as the CRUD target. */
  const handlePick = async (sheet: DriveSpreadsheet) => {
    setBusy("open");
    try {
      await ensureStructure(sheet.id);
      await carryOverLocalData(sheet.id);
      toast.success(`Terhubung ke "${sheet.name}".`);
      finish(sheet.id, sheet.name);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membuka spreadsheet", { duration: 8000 });
    } finally {
      setBusy("");
    }
  };

  /* Step 2b — create today's workspace. Reuses a same-named file instead of duplicating it. */
  const handleCreate = async () => {
    setBusy("create");
    try {
      const created = await createAppSpreadsheet();
      await carryOverLocalData(created.id);
      toast.success(
        created.reused
          ? `"${created.name}" sudah ada — dipakai ulang, tidak dibuat ganda.`
          : `Spreadsheet "${created.name}" dibuat di Drive Anda.`,
      );
      finish(created.id, created.name);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membuat spreadsheet", { duration: 8000 });
    } finally {
      setBusy("");
    }
  };

  /* Escape hatch — a spreadsheet the app did not create cannot be discovered via drive.file. */
  const handleManual = async () => {
    if (!link.trim()) {
      toast.error("Tempel link atau ID spreadsheet Anda dulu.");
      return;
    }
    setBusy("open");
    setAuthFailed(false);
    try {
      await authorize(true);
      const spreadsheetId = extractSpreadsheetId(link);
      const title = await ensureStructure(spreadsheetId);
      await carryOverLocalData(spreadsheetId);
      toast.success("Spreadsheet terhubung — data Anda tersimpan di sana.");
      finish(spreadsheetId, title);
    } catch (error) {
      setAuthFailed(true);
      toast.error(error instanceof Error ? error.message : "Gagal menghubungkan spreadsheet", { duration: 8000 });
    } finally {
      setBusy("");
    }
  };

  const working = busy !== "";

  return (
    <ConnectDialogFrame open={open} onClose={onClose}>
      <ConnectSetupNotice configured={configured} authFailed={authFailed} appOrigin={appOrigin} />

      {step === "intro" ? (
        <div data-testid="connect-step-intro">
          <label htmlFor="connect-nickname" data-testid="connect-nickname-label" className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Nama panggilan <span className="font-normal normal-case tracking-normal">(opsional)</span>
          </label>
          <input
            type="text"
            id="connect-nickname"
            autoComplete="nickname"
            data-testid="connect-nickname-input"
            value={nickname}
            onChange={(event) => setNickname(event.target.value.slice(0, 24))}
            placeholder="Mis. Rangga"
            className="mb-4 h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3.5 text-base outline-none transition-colors focus:border-primary sm:text-sm"
          />

          <Button
            data-testid="connect-submit-button"
            onClick={handleLogin}
            disabled={working}
            className="h-auto min-h-12 w-full gap-2 px-3 py-3 text-sm font-bold leading-snug shadow-lg shadow-primary/20"
          >
            {busy === "login" ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            <span className="min-w-0">{busy === "login" ? "Menghubungkan…" : "Login Google & cari spreadsheet"}</span>
          </Button>
          <p className="mt-1.5 text-center text-[11px] leading-relaxed text-muted-foreground" data-testid="connect-discover-hint">
            Setelah login, Anda memilih spreadsheet <span className="font-data">{APP_SHEET_KEYWORD}</span> yang sudah ada — atau buat baru.
          </p>

          <button
            type="button"
            data-testid="connect-manual-toggle"
            onClick={() => setManual((value) => !value)}
            className="mt-3 flex w-full items-center justify-center gap-1.5 text-[11px] font-bold text-muted-foreground transition-colors hover:text-primary"
          >
            <Link2 size={12} />
            {manual ? "Sembunyikan input link manual" : "Punya link spreadsheet sendiri?"}
          </button>

          {manual && (
            <div className="mt-2.5 rounded-2xl border border-border/70 bg-background/50 p-3" data-testid="connect-manual-panel">
              <label htmlFor="connect-link" data-testid="connect-link-label" className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                Link atau ID spreadsheet
              </label>
              <input
                type="text"
                id="connect-link"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                data-testid="connect-link-input"
                value={link}
                onChange={(event) => setLink(event.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="h-11 w-full min-w-0 rounded-xl border border-border bg-background px-3.5 text-base outline-none transition-colors focus:border-primary sm:text-sm"
              />
              <Button
                data-testid="connect-manual-submit-button"
                onClick={handleManual}
                disabled={working}
                variant="outline"
                className="mt-2.5 h-auto min-h-11 w-full gap-2 text-xs font-bold"
              >
                {busy === "open" ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Hubungkan link ini
              </Button>
            </div>
          )}

          <div className="my-3 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground" aria-hidden="true">
            <span className="h-px flex-1 bg-border" /> atau <span className="h-px flex-1 bg-border" />
          </div>

          <Button
            data-testid="connect-local-button"
            variant="outline"
            onClick={() => finish("", "")}
            disabled={working}
            className="h-auto min-h-11 w-full gap-2 px-3 py-2.5 text-xs font-bold leading-snug"
          >
            <HardDrive size={14} />
            <span className="min-w-0">Coba dulu tanpa connect</span>
          </Button>
          <p className="mt-1.5 text-center text-[11px] leading-relaxed text-muted-foreground" data-testid="connect-local-notice">
            Data lokal tersimpan di browser ini.
          </p>
          <ConnectSheetDetails mode={manual ? "existing" : "new"} />
        </div>
      ) : (
        <div data-testid="connect-step-choose">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              data-testid="connect-back-button"
              onClick={() => setStep("intro")}
              disabled={working}
              className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft size={12} /> Kembali
            </button>
            <button
              type="button"
              data-testid="connect-research-button"
              onClick={() => void searchSheets()}
              disabled={working}
              className="flex items-center gap-1 text-[11px] font-bold text-muted-foreground transition-colors hover:text-primary"
            >
              <RefreshCw size={12} /> Cari ulang
            </button>
          </div>

          {searchFailed ? (
            <p className="mb-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 text-[11px] font-semibold text-amber-500" data-testid="connect-search-error">
              Tidak bisa membaca daftar spreadsheet: {searchFailed}. Pastikan <span className="font-data">Google Drive API</span> sudah di-enable, atau buat baru di bawah.
            </p>
          ) : sheets.length > 0 ? (
            <p className="mb-2 text-[11px] font-semibold text-muted-foreground" data-testid="connect-sheet-count">
              {sheets.length} spreadsheet ditemukan · terbaru di atas
            </p>
          ) : (
            <p className="mb-3 rounded-xl border border-border/70 bg-background/50 px-3 py-2.5 text-[11px] font-semibold text-muted-foreground" data-testid="connect-sheet-empty">
              Belum ada spreadsheet <span className="font-data">{APP_SHEET_KEYWORD}</span> di Drive Anda. Buat yang pertama di bawah.
            </p>
          )}

          {sheets.length > 0 && (
            <ul className="mb-3 max-h-64 space-y-1.5 overflow-y-auto pr-0.5" data-testid="connect-sheet-list">
              {sheets.map((sheet) => (
                <li key={sheet.id}>
                  <button
                    type="button"
                    data-testid={`connect-sheet-option-${sheet.id}`}
                    onClick={() => void handlePick(sheet)}
                    disabled={working}
                    className="flex w-full items-center gap-2.5 rounded-xl border border-border bg-background/60 px-3 py-2.5 text-left transition-colors hover:border-primary hover:bg-primary/5 disabled:opacity-60"
                  >
                    <FileSpreadsheet size={15} className="shrink-0 text-emerald-400" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-bold">{sheet.name}</span>
                      <span className="block truncate text-[10px] text-muted-foreground">
                        Diubah {formatWhen(sheet.modifiedTime)} · Dibuat {formatWhen(sheet.createdTime)}
                      </span>
                    </span>
                    {busy === "open" ? <Loader2 size={13} className="shrink-0 animate-spin" /> : <CheckCircle2 size={13} className="shrink-0 text-muted-foreground" />}
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Button
            data-testid="connect-create-new-button"
            onClick={handleCreate}
            disabled={working}
            variant={sheets.length > 0 ? "outline" : "default"}
            className="h-auto min-h-12 w-full gap-2 px-3 py-3 text-sm font-bold leading-snug"
          >
            {busy === "create" ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            <span className="min-w-0">Buat baru: {newTitle}</span>
          </Button>
          <p className="mt-1.5 text-center text-[11px] leading-relaxed text-muted-foreground" data-testid="connect-create-hint">
            Kalau nama itu sudah ada, spreadsheet lama dipakai ulang — tidak dibuat ganda.
          </p>
        </div>
      )}
    </ConnectDialogFrame>
  );
}
