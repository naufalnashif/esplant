import { useCallback, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Copy, ExternalLink, FileSpreadsheet, HardDrive, Loader2, Lock, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        spreadsheetId = await createSpreadsheet(`Esplan — ${nickname.trim() || "Keuangan Saya"}`);
        title = `Esplan — ${nickname.trim() || "Keuangan Saya"}`;
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4" data-testid="connect-dialog">
      <div className="animate-rise-in w-full max-w-lg rounded-t-3xl border border-border/70 bg-card p-6 shadow-2xl sm:rounded-3xl sm:p-8">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-primary/12 text-primary">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="font-heading text-xl font-bold leading-tight">Hubungkan spreadsheet</h2>
              <p className="text-xs text-muted-foreground">Data tinggal di Google Drive Anda sendiri.</p>
            </div>
          </div>
          <button
            type="button"
            data-testid="connect-dialog-close"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Tutup"
          >
            <X size={16} />
          </button>
        </div>

        {authFailed && configured && (
          <div className="mb-5 rounded-2xl border border-red-500/35 bg-red-500/8 p-4" data-testid="origin-mismatch-help">
            <p className="text-xs font-bold text-red-400">Google menolak: origin belum terdaftar (Error 400: origin_mismatch)</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              Buka OAuth Client Anda di Google Cloud Console → bagian <em>Authorized JavaScript origins</em> → tambahkan alamat
              persis di bawah ini (tanpa garis miring di akhir), simpan, tunggu ±1 menit, lalu coba lagi.
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <code data-testid="app-origin-value" className="flex-1 truncate rounded-lg border border-border bg-background px-2.5 py-2 font-data text-[11px] text-foreground">
                {appOrigin}
              </code>
              <Button
                variant="outline"
                size="sm"
                data-testid="copy-origin-button"
                onClick={() => {
                  void navigator.clipboard?.writeText(appOrigin);
                  toast.success("Origin disalin.");
                }}
                className="h-9 shrink-0 gap-1.5 text-[11px]"
              >
                <Copy size={12} /> Salin
              </Button>
            </div>
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noreferrer"
              className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
            >
              Buka halaman Credentials <ExternalLink size={11} />
            </a>
          </div>
        )}

        {!configured && (          <div className="mb-5 rounded-2xl border border-amber-500/35 bg-amber-500/8 p-4" data-testid="google-setup-notice">
            <p className="text-xs font-bold text-amber-500">Google OAuth belum dikonfigurasi</p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              Isi <span className="font-data">VITE_GOOGLE_CLIENT_ID</span> di <span className="font-data">frontend/.env</span> dengan
              OAuth Client ID (tipe <em>Web application</em>) dari Google Cloud Console, lalu tambahkan origin aplikasi ini ke
              <em> Authorized JavaScript origins</em>. Sementara itu Anda tetap bisa memakai mode lokal di bawah.
            </p>
            <a
              href="https://console.cloud.google.com/apis/credentials"
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
            >
              Buka Google Cloud Console <ExternalLink size={11} />
            </a>
          </div>
        )}

        <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Nama panggilan <span className="font-normal normal-case tracking-normal">(opsional)</span>
        </label>
        <input
          type="text"
          data-testid="connect-nickname-input"
          value={nickname}
          onChange={(event) => setNickname(event.target.value.slice(0, 24))}
          placeholder="Mis. Rangga"
          className="mb-5 h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none transition-colors focus:border-primary"
        />

        <div className="mb-4 grid grid-cols-2 gap-1.5 rounded-xl bg-secondary/70 p-1.5">
          <button
            type="button"
            data-testid="connect-mode-existing"
            onClick={() => setMode("existing")}
            className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${mode === "existing" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Spreadsheet saya
          </button>
          <button
            type="button"
            data-testid="connect-mode-new"
            onClick={() => setMode("new")}
            className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${mode === "new" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Buat baru otomatis
          </button>
        </div>

        {mode === "existing" ? (
          <div className="mb-5">
            <input
              type="text"
              data-testid="connect-link-input"
              value={link}
              onChange={(event) => setLink(event.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm outline-none transition-colors focus:border-primary"
            />
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              Tempel link spreadsheet milik Anda. Tab yang dibutuhkan (Transactions, Accounts, dst.) dibuat otomatis tanpa
              menghapus tab lain.
            </p>
          </div>
        ) : (
          <div className="mb-5 rounded-2xl border border-border/70 bg-background/50 p-4">
            <p className="flex items-center gap-2 text-xs font-bold">
              <Plus size={13} className="text-primary" /> Esplan membuat spreadsheet baru di Drive Anda
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
              Lengkap dengan semua tab dan header. Anda tetap pemilik penuh file-nya dan bisa mengeditnya langsung di Google
              Sheets kapan saja.
            </p>
          </div>
        )}

        <Button
          data-testid="connect-submit-button"
          onClick={handleConnect}
          disabled={busy !== "" || !configured}
          className="h-12 w-full gap-2 text-sm font-bold shadow-lg shadow-primary/20"
        >
          {busy === "connect" ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
          {busy === "connect" ? "Menghubungkan…" : mode === "new" ? "Login Google & buat spreadsheet" : "Login Google & hubungkan"}
        </Button>

        <div className="my-4 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> atau <span className="h-px flex-1 bg-border" />
        </div>

        <Button
          data-testid="connect-local-button"
          variant="outline"
          onClick={handleLocal}
          disabled={busy !== ""}
          className="h-11 w-full gap-2 text-xs font-bold"
        >
          <HardDrive size={14} />
          Coba dulu tanpa connect (data di browser ini)
        </Button>

        <p className="mt-4 flex items-start gap-2 text-[11px] leading-relaxed text-muted-foreground">
          <Lock size={12} className="mt-0.5 shrink-0 text-emerald-500" />
          Esplan tidak menyimpan email, token, atau isi spreadsheet Anda di server mana pun. Izin Google berlaku hanya selama
          tab ini terbuka.
        </p>
      </div>
    </div>
  );
}
