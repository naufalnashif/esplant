import { ChevronDown, Copy, ExternalLink, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export const ConnectSheetDetails = ({ mode }: { mode: "existing" | "new" }) => (
  <details className="connect-sheet-details mt-3" data-testid="connect-details">
    <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-lg py-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary" data-testid="connect-details-toggle">
      <span><span className="connect-show">Tampilkan detail</span><span className="connect-hide">Sembunyikan detail</span></span>
      <ChevronDown size={16} className="connect-chevron" aria-hidden="true" />
    </summary>
    <div className="space-y-3 pb-1 text-xs leading-relaxed text-muted-foreground" data-testid="connect-details-content">
      <p data-testid="connect-mode-description">
        {mode === "existing"
          ? "Tab yang dibutuhkan (Transactions, Accounts, dst.) dibuat otomatis tanpa menghapus tab lain."
          : "Lengkap dengan semua tab dan header. Anda tetap pemilik penuh file-nya dan bisa mengeditnya langsung di Google Sheets kapan saja."}
      </p>
      <p className="flex items-start gap-2" data-testid="connect-privacy-notice">
        <Lock size={12} className="mt-0.5 shrink-0 text-emerald-500" aria-hidden="true" />
        <span>_self.manage tidak menyimpan email, token, atau isi spreadsheet Anda di server mana pun. Izin Google berlaku hanya selama tab ini terbuka.</span>
      </p>
    </div>
  </details>
);

export const ConnectSetupNotice = ({ configured, authFailed, appOrigin }: {
  configured: boolean; authFailed: boolean; appOrigin: string;
}) => {
  if (configured && !authFailed) return null;
  return (
    <div className={`mb-4 rounded-2xl border p-3 ${configured ? "border-red-500/35 bg-red-500/8" : "border-amber-500/35 bg-amber-500/8"}`}
      role="status" data-testid={configured ? "origin-mismatch-help" : "google-setup-notice"}>
      <p className={`text-xs font-bold ${configured ? "text-red-400" : "text-amber-500"}`} data-testid="connect-setup-title">
        {configured ? "Koneksi Google belum berhasil" : "Google OAuth belum dikonfigurasi"}
      </p>
      <details className="connect-sheet-details mt-1" data-testid="connect-setup-details">
        <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-2 rounded-lg py-2 text-xs font-semibold text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary" data-testid="connect-setup-toggle">
          <span><span className="connect-show">Tampilkan bantuan</span><span className="connect-hide">Sembunyikan bantuan</span></span>
          <ChevronDown size={16} className="connect-chevron" aria-hidden="true" />
        </summary>
        <div className="text-xs leading-relaxed text-muted-foreground" data-testid="connect-setup-content">
          <p data-testid="connect-setup-instructions">
            {configured ? <>Jika Google menampilkan <em>origin_mismatch</em>, buka OAuth Client di Google Cloud Console → <em>Authorized JavaScript origins</em>. Tambahkan alamat di bawah tanpa garis miring di akhir, simpan, lalu coba lagi.</>
              : <>Isi <span className="font-data">VITE_GOOGLE_CLIENT_ID</span> dengan OAuth Client ID (tipe <em>Web application</em>), lalu tambahkan origin aplikasi ke <em>Authorized JavaScript origins</em>. Sementara itu Anda tetap bisa memakai mode lokal.</>}
          </p>
          {configured && <div className="mt-2.5 flex min-w-0 items-center gap-2">
            <code data-testid="app-origin-value" className="min-w-0 flex-1 break-all rounded-lg border border-border bg-background px-2.5 py-2 font-data text-[11px] text-foreground">{appOrigin}</code>
            <Button variant="outline" data-testid="copy-origin-button" className="min-h-11 shrink-0 gap-1.5 text-xs" onClick={() => {
              void navigator.clipboard?.writeText(appOrigin);
              toast.success("Origin disalin.");
            }}><Copy size={12} /> Salin</Button>
          </div>}
          <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" data-testid="connect-google-console-link"
            className="mt-2 inline-flex min-h-11 items-center gap-1 text-xs font-bold text-primary hover:underline">
            <span>Buka Google Cloud Console</span><ExternalLink size={11} className="shrink-0" />
          </a>
        </div>
      </details>
    </div>
  );
};