import { useCallback, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, HardDrive, Loader2, Plus } from "lucide-react";
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
  readState,
  writeState,
} from "@/lib/googleSheets";
import { loadLocalState } from "@/lib/localDb";

type Mode = "existing" | "new";

const hasData = (state: { accounts: unknown[]; transactions: unknown[] }) =>
  state.accounts.length > 0 || state.transactions.length > 0;

export function ConnectSheetDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { setProfile } = useStorage();
  const [mode, setMode] = useState<Mode>("existing");
  const [nickname, setNickname] = useState("");
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState<"" | "connect" | "local">("");
  const [authFailed, setAuthFailed] = useState(false);
  const configured = isGoogleConfigured();
  const appOrigin = typeof window === "undefined" ? "" : window.location.origin;

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
    },
    [nickname, onClose, setProfile],
  );

  const handleConnect = async () => {
    if (mode === "existing" && !link.trim()) {
      toast.error("Tempel link atau ID spreadsheet Anda dulu.");
      return;
    }
    setBusy("connect");
    setAuthFailed(false);
    try {
      await authorize(true);

      let spreadsheetId: string;
      let title: string;

      if (mode === "new") {
        spreadsheetId = await createSpreadsheet(`_self.manage — ${nickname.trim() || "Keuangan Saya"}`);
        title = `_self.manage — ${nickname.trim() || "Keuangan Saya"}`;
      } else {
        spreadsheetId = extractSpreadsheetId(link);
        title = await ensureStructure(spreadsheetId);
      }

      // Empty spreadsheet + data already on this device → carry it over.
      const remote = await readState(spreadsheetId);
      if (!hasData(remote)) {
        const local = await loadLocalState();
        if (hasData(local)) await writeState(spreadsheetId, local);
      }

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

  const handleLocal = async () => {
    setBusy("local");
    finish("", "");
    setBusy("");
  };

  return (
    <ConnectDialogFrame open={open} onClose={onClose}>
        <ConnectSetupNotice configured={configured} authFailed={authFailed} appOrigin={appOrigin} />

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
