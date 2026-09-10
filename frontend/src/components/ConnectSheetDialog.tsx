import { useCallback, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, ExternalLink, FileSpreadsheet, HardDrive, Info, Loader2, Plus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConnectDialogFrame } from "@/components/ConnectDialogFrame";
import { ConnectSetupNotice, ConnectSheetDetails } from "@/components/ConnectSheetDetails";
import { useStorage } from "@/lib/storageContext";
import {
  authorize,
  createSpreadsheet,
  ensureStructure,
  extractSpreadsheetId,
  isGoogleConfigured,
  listAppSpreadsheets,
  readKnownSheets,
  readState,
  rememberSheet,
  spreadsheetUrl,
  writeState,
  type SheetCandidate,
} from "@/lib/googleSheets";
import { loadLocalState } from "@/lib/localDb";

type Mode = "existing" | "new";

const hasData = (state: { accounts: unknown[]; transactions: unknown[] }) =>
  state.accounts.length > 0 || state.transactions.length > 0;

const mergeCandidates = (remote: SheetCandidate[], local: SheetCandidate[]): SheetCandidate[] => {
  const seen = new Set(remote.map((item) => item.id));
  return [...remote, ...local.filter((item) => !seen.has(item.id))];
};

const whenLabel = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};

export function ConnectSheetDialog({ open, onClose, onConnected }: { open: boolean; onClose: () => void; onConnected?: () => void }) {
  const { setProfile } = useStorage();
  const [mode, setMode] = useState<Mode>("existing");
  const [nickname, setNickname] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState<"" | "connect" | "local" | "reuse">("");
  const [authFailed, setAuthFailed] = useState(false);
  const [candidates, setCandidates] = useState<SheetCandidate[] | null>(null);
  const knownSheets = readKnownSheets();
  const configured = isGoogleConfigured();
  const appOrigin = typeof window === "undefined" ? "" : window.location.origin;

  const finish = useCallback(
    (spreadsheetId: string, spreadsheetName: string) => {
      if (spreadsheetId) rememberSheet({ id: spreadsheetId, name: spreadsheetName });
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

  /** Attaches an existing spreadsheet: ensures the schema then seeds it if it is still empty. */
  const attach = useCallback(async (spreadsheetId: string, knownTitle?: string) => {
    const title = await ensureStructure(spreadsheetId);
    const remote = await readState(spreadsheetId);
    if (!hasData(remote)) {
      const local = await loadLocalState();
      if (hasData(local)) await writeState(spreadsheetId, local);
    }
    return knownTitle || title;
  }, []);

  const handleConnect = async () => {
    if (mode === "existing" && !link.trim()) {
      toast.error("Tempel link atau ID spreadsheet Anda dulu.");
      return;
    }
    setBusy("connect");
    setAuthFailed(false);
    try {
      await authorize(true);

      if (mode === "new") {
        // Duplicate guard: reuse anything this account/device already owns.
        let remote: SheetCandidate[] = [];
        try {
          remote = await listAppSpreadsheets();
        } catch {
          remote = [];
        }
        const found = mergeCandidates(remote, knownSheets);
        if (found.length) {
          setCandidates(found);
          setBusy("");
          return;
        }
        const title = `_self.manage — ${nickname.trim() || "Keuangan Saya"}`;
        const spreadsheetId = await createSpreadsheet(title);
        const local = await loadLocalState();
        if (hasData(local)) await writeState(spreadsheetId, local);
        toast.success("Spreadsheet baru dibuat dan terhubung.");
        finish(spreadsheetId, title);
        return;
      }

      const spreadsheetId = extractSpreadsheetId(link);
      const title = await attach(spreadsheetId);
      toast.success("Spreadsheet terhubung — data Anda tersimpan di sana.");
      finish(spreadsheetId, title);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Gagal menghubungkan spreadsheet";
      setAuthFailed(true);
      toast.error(message, { duration: 8000 });
    } finally {
      setBusy("");
    }
  };

  const handleReuse = async (candidate: SheetCandidate) => {
    setBusy("reuse");
    try {
      await authorize(true);
      await attach(candidate.id, candidate.name);
      toast.success(`Terhubung ke "${candidate.name}". Data Anda tetap satu tempat.`);
      finish(candidate.id, candidate.name);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membuka spreadsheet itu.", { duration: 8000 });
    } finally {
      setBusy("");
    }
  };

  const handleForceNew = async () => {
    setBusy("connect");
    try {
      await authorize(true);
      const title = `_self.manage — ${nickname.trim() || "Keuangan Saya"} (${new Date().toISOString().slice(0, 10)})`;
      const spreadsheetId = await createSpreadsheet(title);
      toast.success("Spreadsheet baru dibuat.");
      finish(spreadsheetId, title);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Gagal membuat spreadsheet baru.");
    } finally {
      setBusy("");
    }
  };

  const handleLocal = async () => {
    setBusy("local");
    finish("", "");
    setBusy("");
  };

  if (candidates) {
    return (
      <ConnectDialogFrame open={open} onClose={onClose}>
        <div className="mb-4 rounded-2xl border border-primary/35 bg-primary/8 p-3" data-testid="existing-sheet-notice">
          <p className="flex items-start gap-2 text-xs font-bold leading-relaxed text-primary">
            <Info size={14} className="mt-0.5 shrink-0" />
            <span>Anda pernah membuat spreadsheet _self.manage sebelumnya.</span>
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            Pakai yang sudah ada agar data di HP dan laptop tetap sinkron tanpa duplikasi file.
          </p>
        </div>

        <div className="space-y-2" data-testid="existing-sheet-list">
          {candidates.map((candidate) => (
            <div
              key={candidate.id}
              data-testid={`existing-sheet-${candidate.id}`}
              className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/50 p-3"
            >
              <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-500/12 text-emerald-500">
                <FileSpreadsheet size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold">{candidate.name || "Spreadsheet"}</p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {candidate.local ? "Riwayat perangkat ini" : "Dari Google Drive Anda"}
                  {whenLabel(candidate.modifiedTime) ? ` · ${whenLabel(candidate.modifiedTime)}` : ""}
                </p>
              </div>
              <a
                href={spreadsheetUrl(candidate.id)}
                target="_blank"
                rel="noreferrer"
                aria-label="Buka di Google Sheets"
                data-testid={`existing-sheet-open-${candidate.id}`}
                className="grid size-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:text-primary"
              >
                <ExternalLink size={14} />
              </a>
              <Button
                data-testid={`existing-sheet-use-${candidate.id}`}
                onClick={() => void handleReuse(candidate)}
                disabled={busy !== ""}
                className="h-9 shrink-0 gap-1.5 px-3 text-xs font-bold"
              >
                {busy === "reuse" ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                Pakai ini
              </Button>
            </div>
          ))}
        </div>

        <Button
          variant="outline"
          data-testid="existing-sheet-create-new-button"
          onClick={() => void handleForceNew()}
          disabled={busy !== ""}
          className="mt-4 h-auto min-h-11 w-full gap-2 px-3 py-2.5 text-xs font-bold"
        >
          <Plus size={14} /> Tetap buat spreadsheet baru
        </Button>
        <Button
          variant="ghost"
          data-testid="existing-sheet-back-button"
          onClick={() => setCandidates(null)}
          disabled={busy !== ""}
          className="mt-1.5 h-auto min-h-11 w-full gap-2 px-3 py-2.5 text-xs font-bold text-muted-foreground"
        >
          <RotateCcw size={13} /> Kembali
        </Button>
      </ConnectDialogFrame>
    );
  }

  return (
    <ConnectDialogFrame open={open} onClose={onClose}>
        <ConnectSetupNotice configured={configured} authFailed={authFailed} appOrigin={appOrigin} />

        {knownSheets.length > 0 && (
          <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/8 p-3" data-testid="known-sheet-hint">
            <p className="flex items-start gap-2 text-xs font-bold leading-relaxed text-emerald-500">
              <Info size={14} className="mt-0.5 shrink-0" />
              <span>Perangkat ini pernah terhubung ke "{knownSheets[0].name || "spreadsheet Anda"}".</span>
            </p>
            <Button
              data-testid="known-sheet-reuse-button"
              onClick={() => void handleReuse(knownSheets[0])}
              disabled={busy !== ""}
              className="mt-2.5 h-9 w-full gap-1.5 text-xs font-bold"
            >
              {busy === "reuse" ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
              Lanjutkan dengan spreadsheet itu
            </Button>
          </div>
        )}

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

        <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-xl bg-secondary/70 p-1.5" role="group" aria-label="Pilihan spreadsheet" data-testid="connect-mode-options">
          <button
            type="button"
            data-testid="connect-mode-existing"
            onClick={() => setMode("existing")}
            aria-pressed={mode === "existing"}
            className={`min-h-11 min-w-0 rounded-lg px-2 py-2 text-xs font-bold leading-snug transition-colors focus-visible:outline-2 focus-visible:outline-primary ${mode === "existing" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Spreadsheet saya
          </button>
          <button
            type="button"
            data-testid="connect-mode-new"
            onClick={() => setMode("new")}
            aria-pressed={mode === "new"}
            className={`min-h-11 min-w-0 rounded-lg px-2 py-2 text-xs font-bold leading-snug transition-colors focus-visible:outline-2 focus-visible:outline-primary ${mode === "new" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Buat baru otomatis
          </button>
        </div>

        {mode === "existing" ? (
          <div className="mb-4">
            <label htmlFor="connect-link" data-testid="connect-link-label" className="mb-1.5 block text-xs font-semibold text-muted-foreground">Link atau ID spreadsheet</label>
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
          </div>
        ) : (
          <div className="mb-4 rounded-2xl border border-border/70 bg-background/50 p-3" data-testid="connect-new-sheet-notice">
            <p className="flex items-start gap-2 text-xs font-bold leading-relaxed">
              <Plus size={13} className="mt-0.5 shrink-0 text-primary" /> <span>_self.manage membuat spreadsheet baru di Drive Anda</span>
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              Kami cek dulu apakah Anda sudah punya spreadsheet _self.manage, supaya tidak ada file ganda.
            </p>
          </div>
        )}

        <Button
          data-testid="connect-submit-button"
          onClick={handleConnect}
          disabled={busy !== ""}
          className="h-auto min-h-12 w-full gap-2 px-3 py-3 text-sm font-bold leading-snug shadow-lg shadow-primary/20"
        >
          {busy === "connect" ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          <span className="min-w-0">{busy === "connect" ? "Menghubungkan…" : mode === "new" ? "Login Google & buat baru" : "Login Google & hubungkan"}</span>
        </Button>

        <div className="my-3 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground" aria-hidden="true">
          <span className="h-px flex-1 bg-border" /> atau <span className="h-px flex-1 bg-border" />
        </div>

        <Button
          data-testid="connect-local-button"
          variant="outline"
          onClick={handleLocal}
          disabled={busy !== ""}
          className="h-auto min-h-11 w-full gap-2 px-3 py-2.5 text-xs font-bold leading-snug"
        >
          <HardDrive size={14} />
          <span className="min-w-0">Coba dulu tanpa connect</span>
        </Button>

        <p className="mt-1.5 text-center text-[11px] leading-relaxed text-muted-foreground" data-testid="connect-local-notice">Data lokal tersimpan di browser ini.</p>
        <ConnectSheetDetails mode={mode} />
    </ConnectDialogFrame>
  );
}
