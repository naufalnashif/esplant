import { useState, useRef } from "react";
import {
  Download,
  FileText,
  HelpCircle,
  Moon,
  Settings2,
  ShieldCheck,
  Sun,
  Trash2,
  Upload,
  User,
  FileSpreadsheet,
  Cloud,
  Database,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { FinanceState } from "@/lib/localDb";
import { CategoryManager } from "@/components/CategoryManager";
import { DataHealthPanel } from "@/components/DataHealthPanel";
import { useStorage } from "@/lib/storageContext";
import { readState, isGoogleConfigured } from "@/lib/googleSheets";
import { pushNow } from "@/lib/dataStore";
import { ConnectSheetDialog } from "@/components/ConnectSheetDialog";
import * as XLSX from "xlsx";

type SettingsSubTab = "general" | "data";

function DatabaseConnectionCard({ state, save }: { state: FinanceState; save: (nextState: FinanceState) => void }) {
  const { profile, spreadsheetId, sheetUrl, disconnectSheet, lastSyncTime, syncStatus, needsReconnect, reconnect } = useStorage();
  const [isSyncing, setIsSyncing] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const isId = state.locale === "id";
  const connected = Boolean(spreadsheetId);

  const handlePull = async () => {
    if (!spreadsheetId) return;
    setIsSyncing(true);
    try {
      save(await readState(spreadsheetId));
      toast.success(isId ? "Data ditarik dari spreadsheet." : "Pulled from your spreadsheet.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : isId ? "Gagal menarik data." : "Pull failed.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePush = async () => {
    if (!spreadsheetId) return;
    setIsSyncing(true);
    try {
      await pushNow(spreadsheetId, state);
      toast.success(isId ? "Data dikirim ke spreadsheet." : "Pushed to your spreadsheet.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : isId ? "Gagal mengirim data." : "Push failed.");
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card className="border-border/70 bg-card/75 p-5 sm:p-6" data-testid="database-connection-card">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-emerald-500/12 text-emerald-500">
            <Database size={18} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Storage</p>
            <h2 className="font-heading text-xl font-bold">{isId ? "Koneksi Spreadsheet" : "Spreadsheet Connection"}</h2>
          </div>
        </div>
        <span
          data-testid="storage-mode-badge"
          className={`rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
            connected
              ? "border border-emerald-500/30 bg-emerald-500/15 text-emerald-500"
              : "border border-blue-500/30 bg-blue-500/15 text-blue-500"
          }`}
        >
          {connected ? "Google Sheets" : isId ? "Lokal (browser)" : "Local (browser)"}
        </span>
      </div>

      {connected ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-border/60 bg-background/50 p-3.5">
            <p className="mb-1 text-xs text-muted-foreground">{profile?.spreadsheetName || "Spreadsheet"}</p>
            <a
              href={sheetUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="settings-open-sheet-link"
              className="block truncate font-data text-xs font-bold text-primary hover:underline"
            >
              {sheetUrl} ↗
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              data-testid="pull-from-sheets-button"
              onClick={handlePull}
              disabled={isSyncing}
              className="gap-2 border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10"
            >
              <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
              {isId ? "Tarik dari Sheets" : "Pull from Sheets"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              data-testid="push-to-sheets-button"
              onClick={handlePush}
              disabled={isSyncing}
              className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
            >
              <Upload size={14} className={isSyncing ? "animate-spin" : ""} />
              {isId ? "Kirim ke Sheets" : "Push to Sheets"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              data-testid="disconnect-sheet-button"
              onClick={() => {
                disconnectSheet();
                toast.success(isId ? "Spreadsheet dilepas. Kembali ke mode lokal." : "Disconnected. Back to local mode.");
              }}
              className="ml-auto text-xs text-muted-foreground hover:text-foreground"
            >
              {isId ? "Lepas koneksi" : "Disconnect"}
            </Button>
          </div>

          {needsReconnect && (
            <div
              className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-500/45 bg-amber-500/10 px-3 py-2.5"
              data-testid="sheet-reconnect-banner"
            >
              <p className="min-w-0 flex-1 text-[11px] font-semibold leading-relaxed text-amber-500">
                {isId
                  ? "Sesi Google terputus, tapi spreadsheet Anda masih tersimpan. Data di bawah ini dari cache — klik sync ulang untuk menyambung kembali."
                  : "The Google session lapsed, but your spreadsheet link is intact. The data below is cached — click re-sync to reconnect."}
              </p>
              <Button
                variant="outline"
                size="sm"
                data-testid="sheet-reconnect-button"
                onClick={() => {
                  void (async () => {
                    const ok = await reconnect();
                    toast[ok ? "success" : "error"](
                      ok
                        ? isId ? "Tersambung kembali ke Google." : "Reconnected to Google."
                        : isId ? "Login Google belum berhasil." : "Google sign-in did not complete.",
                    );
                  })();
                }}
                className="shrink-0 gap-1.5 border-amber-500/50 text-xs text-amber-500 hover:bg-amber-500/15"
              >
                <RefreshCw size={13} />
                {isId ? "Sync ulang" : "Re-sync"}
              </Button>
            </div>
          )}

          <p className="text-[11px] text-muted-foreground">
            {needsReconnect || syncStatus === "disconnected"
              ? isId ? "Terputus — klik sync ulang untuk menyambung lagi. Data lokal tetap aman." : "Disconnected — click re-sync to reconnect. Your local data is safe."
              : syncStatus === "error"
                ? isId ? "Sinkronisasi terakhir gagal — coba tarik atau kirim ulang." : "Last sync failed — try pull or push again."
                : lastSyncTime
                  ? `${isId ? "Terakhir sinkron: " : "Last synced: "}${lastSyncTime.toLocaleTimeString()}`
                  : isId ? "Perubahan tersimpan otomatis ke spreadsheet Anda." : "Changes are saved to your spreadsheet automatically."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-muted-foreground">
            {isId
              ? "Mode lokal aktif: data hanya ada di browser ini (IndexedDB). Hubungkan spreadsheet agar data tersimpan di Google Drive Anda dan bisa dibuka dari perangkat lain."
              : "Local mode: data lives only in this browser. Connect a spreadsheet to store it in your own Google Drive."}
          </p>
          {!isGoogleConfigured() && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/8 p-3 text-[11px] leading-relaxed text-amber-500">
              {isId
                ? "VITE_GOOGLE_CLIENT_ID belum diisi, jadi login Google masih nonaktif."
                : "VITE_GOOGLE_CLIENT_ID is not set, so Google sign-in is disabled."}
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            data-testid="connect-sheet-from-settings-button"
            onClick={() => setShowConnect(true)}
            className="gap-2 border-emerald-500/40 text-emerald-500 hover:bg-emerald-500/10"
          >
            <Cloud size={14} />
            {isId ? "Hubungkan Google Sheets" : "Connect Google Sheets"}
          </Button>
        </div>
      )}

      <ConnectSheetDialog open={showConnect} onClose={() => setShowConnect(false)} />
    </Card>
  );
}

export function SettingsPanel({
  state,
  profileDraft,
  setProfileDraft,
  updateState,
  onSaveProfile,
  onJson,
  onXlsx,
  onImport,
  onImportXlsx,
  onErase,
  onPrint,
  save,
}: {
  state: FinanceState;
  profileDraft: string;
  setProfileDraft: (value: string) => void;
  updateState: (updates: Partial<FinanceState>) => void;
  onSaveProfile: () => void;
  onJson: () => void;
  onXlsx: () => void;
  onImport: (file: File) => void;
  onImportXlsx: (file: File) => void;
  onErase: () => void;
  onPrint: () => void;
  save: (nextState: FinanceState) => void;
}) {
  const isId = state.locale === "id";
  const [activeSubTab, setActiveSubTab] = useState<SettingsSubTab>("general");
  const jsonFileRef = useRef<HTMLInputElement>(null);
  const xlsxFileRef = useRef<HTMLInputElement>(null);

  const subTabs = [
    {
      id: "general" as SettingsSubTab,
      label: isId ? "Profil & Kategori" : "Profile & Categories",
      icon: User,
      description: isId ? "Pengaturan profil, tema, dan kategori" : "Profile, theme & category management",
    },
    {
      id: "data" as SettingsSubTab,
      label: isId ? "Backup & Kesehatan Data" : "Backup & Data Health",
      icon: ShieldCheck,
      description: isId ? "Ekspor, impor XLSX & JSON, restore" : "Export, XLSX/JSON import & restore",
    },
  ];

  const downloadXlsxTemplate = () => {
    const wb = XLSX.utils.book_new();

    // Transactions sheet
    const txSheet = XLSX.utils.aoa_to_sheet([
      ["date", "type", "description", "category", "amount", "currency", "tags", "accountId"],
      ["2026-09-08", "expense", "Makan Siang Restoran", "Food", 45000, "IDR", "kuliner|lunch", "acc-001"],
      ["2026-09-08", "income", "Gaji Project Freelance", "Salary", 2500000, "IDR", "freelance|gaji", "acc-001"],
      ["2026-09-10", "expense", "Token Listrik PLN", "Utilities", 150000, "IDR", "tagihan|listrik", "acc-001"],
      ["2026-09-12", "expense", "Grab ke Kantor", "Transport", 25000, "IDR", "ojol|commute", "acc-001"],
    ]);
    XLSX.utils.book_append_sheet(wb, txSheet, "Transactions");

    // Accounts sheet
    const accSheet = XLSX.utils.aoa_to_sheet([
      ["id", "name", "type", "brand", "balance", "currency", "openingBalance"],
      ["acc-001", "BCA Tabungan", "debit", "BCA", 5000000, "IDR", 3000000],
      ["acc-002", "GoPay", "ewallet", "GoPay", 350000, "IDR", 350000],
      ["acc-003", "Dompet Cash", "cash", "", 200000, "IDR", 200000],
    ]);
    XLSX.utils.book_append_sheet(wb, accSheet, "Accounts");

    // Bills sheet
    const billSheet = XLSX.utils.aoa_to_sheet([
      ["id", "name", "category", "amount", "currency", "frequency", "nextDueDate", "active", "remainingInstallments"],
      ["bill-001", "Cicilan HP Samsung", "Lifestyle", 450000, "IDR", "monthly", "2026-10-01", true, 12],
      ["bill-002", "Indihome Wifi", "Utilities", 350000, "IDR", "monthly", "2026-10-05", true, ""],
    ]);
    XLSX.utils.book_append_sheet(wb, billSheet, "Bills");

    // Debts sheet
    const debtSheet = XLSX.utils.aoa_to_sheet([
      ["id", "name", "person", "type", "total", "paid", "currency", "dueDate", "note"],
      ["debt-001", "Utang ke Budi", "Budi Santoso", "debt", 500000, 0, "IDR", "2026-10-15", "Pinjaman beli laptop"],
      ["debt-002", "Piutang dari Andi", "Andi Wijaya", "receivable", 250000, 100000, "IDR", "2026-11-01", "Patungan makan"],
    ]);
    XLSX.utils.book_append_sheet(wb, debtSheet, "Debts");

    // Savings sheet
    const savSheet = XLSX.utils.aoa_to_sheet([
      ["id", "name", "target", "saved", "currency", "targetDate", "color"],
      ["sav-001", "Dana Darurat", 30000000, 12000000, "IDR", "2027-06-01", "#ffa116"],
      ["sav-002", "Liburan Bali", 5000000, 1500000, "IDR", "2026-12-25", "#22c55e"],
    ]);
    XLSX.utils.book_append_sheet(wb, savSheet, "Savings");

    // Wishlist sheet
    const wishSheet = XLSX.utils.aoa_to_sheet([
      ["id", "name", "price", "currency", "priority", "targetDate", "category", "status"],
      ["wish-001", "MacBook Air M3", 20000000, "IDR", "high", "2027-01-01", "Education", "saving"],
      ["wish-002", "Sepatu Nike Air Max", 1500000, "IDR", "medium", "2026-11-11", "Lifestyle", "planning"],
    ]);
    XLSX.utils.book_append_sheet(wb, wishSheet, "Wishlist");

    // Budgets sheet
    const budgetSheet = XLSX.utils.aoa_to_sheet([
      ["id", "category", "limit", "currency"],
      ["bud-001", "Food", 2000000, "IDR"],
      ["bud-002", "Transport", 500000, "IDR"],
      ["bud-003", "Lifestyle", 1000000, "IDR"],
    ]);
    XLSX.utils.book_append_sheet(wb, budgetSheet, "Budgets");

    XLSX.writeFile(wb, "selfmanage_template.xlsx");
    toast.success(isId ? "Template XLSX berhasil diunduh (7 sheet)." : "XLSX template downloaded (7 sheets).");
  };

  const downloadJsonTemplate = () => {
    const templateObj = {
      transactions: [
        {
          date: "2026-09-08",
          kind: "expense",
          description: "Contoh Belanja",
          category: "Shopping",
          amount: 150000,
          currency: "IDR",
          tags: ["belanja", "bulanan"],
        },
      ],
    };
    const blob = new Blob([JSON.stringify(templateObj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "selfmanage_template_backup.json";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(isId ? "Template JSON berhasil di-download." : "JSON template downloaded.");
  };

  return (
    <div className="animate-rise-in space-y-6">
      {/* Header */}
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Control room / settings</p>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
          {isId ? "Pengaturan _self.manage" : "_self.manage Settings"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          {isId
            ? "Pusat kendali aplikasi: kelola profil lokal, kategori transaksi, cadangan data, dan kesehatan database."
            : "Central control room: manage profile, categories, data backups, and database integrity."}
        </p>
      </div>

      {/* Sub-tabs Navigation */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/70 bg-card/60 p-1.5 max-w-2xl">
        {subTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              data-testid={`settings-subtab-${tab.id}`}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex flex-col items-start gap-1 rounded-xl p-3 text-left transition-all ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:bg-card hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon size={16} />
                <span className="text-xs font-bold sm:text-sm">{tab.label}</span>
              </div>
              <span className={`text-[10px] hidden sm:block ${isActive ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                {tab.description}
              </span>
            </button>
          );
        })}
      </div>

      {/* General Tab */}
      {activeSubTab === "general" && (
        <div className="space-y-6">
          <Card className="border-border/70 bg-card/75 p-5 sm:p-6">
            <div className="mb-5 flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary">
                <Settings2 size={18} />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Local profile</p>
                <h2 className="font-heading text-xl font-bold">{isId ? "Profil & Preferensi Tampilan" : "Profile & Display Preferences"}</h2>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-semibold text-muted-foreground">{isId ? "Nama Panggilan" : "Nickname"}</span>
                <div className="flex gap-2">
                  <input
                    data-testid="profile-name-input"
                    value={profileDraft}
                    onChange={(event) => setProfileDraft(event.target.value)}
                    placeholder={isId ? "Nama kamu" : "Your name"}
                    className="h-10 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
                  />
                  <Button data-testid="profile-save-button" onClick={onSaveProfile} size="sm">
                    {isId ? "Simpan" : "Save"}
                  </Button>
                </div>
              </label>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">{isId ? "Bahasa" : "Language"}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      data-testid="language-id-button"
                      onClick={() => updateState({ locale: "id" })}
                      className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                        state.locale === "id" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                      }`}
                    >
                      Bahasa
                    </button>
                    <button
                      type="button"
                      data-testid="language-en-button"
                      onClick={() => updateState({ locale: "en" })}
                      className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                        state.locale === "en" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                      }`}
                    >
                      English
                    </button>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">{isId ? "Tampilan" : "Appearance"}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      data-testid="settings-dark-mode-button"
                      onClick={() => updateState({ theme: "dark" })}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold ${
                        state.theme === "dark" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                      }`}
                    >
                      <Moon size={13} />
                      Dark
                    </button>
                    <button
                      type="button"
                      data-testid="settings-light-mode-button"
                      onClick={() => updateState({ theme: "light" })}
                      className={`flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-bold ${
                        state.theme === "light" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"
                      }`}
                    >
                      <Sun size={13} />
                      Light
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Database & Storage Mode */}
          <DatabaseConnectionCard state={state} save={save} />

          {/* Category Management */}
          <CategoryManager state={state} onSave={(categories) => updateState({ categories })} />
        </div>
      )}

      {/* Data Tab — redesigned for mobile */}
      {activeSubTab === "data" && (
        <div className="space-y-5">

          {/* ── Export Section ── */}
          <Card className="border-border/70 bg-card/75 p-4 sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-primary/12 text-primary shrink-0">
                <Download size={16} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {isId ? "Ekspor & Cetak" : "Export & Print"}
                </p>
                <h2 className="font-heading text-base font-bold sm:text-lg">
                  {isId ? "Unduh Data & Laporan" : "Download Data & Reports"}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <Button
                data-testid="export-xlsx-button"
                variant="outline"
                onClick={onXlsx}
                className="gap-2 justify-start sm:justify-center"
              >
                <FileSpreadsheet size={15} />
                <span>{isId ? "Export XLSX (Semua Data)" : "Export XLSX (All Data)"}</span>
              </Button>
              <Button
                data-testid="export-json-button"
                variant="outline"
                onClick={onJson}
                className="gap-2 justify-start sm:justify-center"
              >
                <Download size={15} />
                <span>{isId ? "Backup JSON Lengkap" : "Full JSON Backup"}</span>
              </Button>
              <Button
                data-testid="print-pdf-button"
                variant="outline"
                onClick={onPrint}
                className="gap-2 justify-start sm:justify-center border-primary/40 text-primary hover:bg-primary/8"
              >
                <FileText size={15} />
                <span>{isId ? "Preview & Download PDF" : "PDF Summary"}</span>
              </Button>
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
              {isId
                ? "XLSX berisi 7 sheet: Transaksi, Akun, Tagihan, Utang, Tabungan, Wishlist, dan Budget — cocok untuk dibuka di Excel atau Google Sheets."
                : "XLSX contains 7 sheets: Transactions, Accounts, Bills, Debts, Savings, Wishlist, and Budgets — open in Excel or Google Sheets."}
            </p>
          </Card>

          {/* ── Import Section ── */}
          <Card className="border-border/70 bg-card/75 p-4 sm:p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid size-9 place-items-center rounded-xl bg-emerald-500/12 text-emerald-500 shrink-0">
                <Upload size={16} />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  {isId ? "Impor & Restore" : "Import & Restore"}
                </p>
                <h2 className="font-heading text-base font-bold sm:text-lg">
                  {isId ? "Impor Data ke Aplikasi" : "Import Data to App"}
                </h2>
              </div>
            </div>

            {/* Hidden file inputs */}
            <input
              ref={jsonFileRef}
              data-testid="import-json-input"
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onImport(file);
                event.target.value = "";
              }}
            />
            <input
              ref={xlsxFileRef}
              data-testid="import-xlsx-input"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onImportXlsx(file);
                event.target.value = "";
              }}
            />

            {/* Primary import buttons */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <Button
                data-testid="import-xlsx-button"
                variant="outline"
                onClick={() => xlsxFileRef.current?.click()}
                className="gap-2 justify-start sm:justify-center border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
              >
                <Upload size={15} />
                <span>{isId ? "Impor XLSX (Semua Data)" : "Import XLSX (All Data)"}</span>
              </Button>
              <Button
                data-testid="import-json-button"
                variant="outline"
                onClick={() => jsonFileRef.current?.click()}
                className="gap-2 justify-start sm:justify-center border-primary/40 text-primary hover:bg-primary/8"
              >
                <Upload size={15} />
                <span>{isId ? "Impor JSON Backup" : "Import JSON Backup"}</span>
              </Button>
            </div>

            {/* Template download row */}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadXlsxTemplate}
                className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/8 hover:text-emerald-400"
                data-testid="download-xlsx-template-button"
              >
                <Download size={12} />
                {isId ? "Unduh Template XLSX" : "Download XLSX Template"}
              </button>
              <button
                type="button"
                onClick={downloadJsonTemplate}
                className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/8 hover:text-primary"
                data-testid="download-json-template-button"
              >
                <Download size={12} />
                {isId ? "Unduh Template JSON" : "Download JSON Template"}
              </button>
            </div>

            {/* Import info box */}
            <div className="mt-4 rounded-xl border border-border/70 bg-background/50 p-3.5 text-xs leading-relaxed space-y-2">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <HelpCircle size={14} className="text-primary shrink-0" />
                <span>{isId ? "Petunjuk Format Import" : "Import Format Guide"}</span>
              </div>
              <ul className="list-disc pl-4 space-y-1 text-muted-foreground text-[11px]">
                <li>
                  <strong className="text-foreground">{isId ? "XLSX (Disarankan):" : "XLSX (Recommended):"}</strong>{" "}
                  {isId
                    ? "Template dengan 7 sheet siap pakai. Unduh template, isi data, lalu impor."
                    : "Template with 7 sheets ready to use. Download, fill data, then import."}
                </li>
                <li>
                  <strong className="text-foreground">{isId ? "Format JSON Backup:" : "JSON Backup Format:"}</strong>{" "}
                  {isId ? "File backup full state _self.manage atau array transaksi." : "Full _self.manage state backup or transaction array."}
                </li>
                <li>
                  <strong className="text-foreground">{isId ? "Catatan:" : "Note:"}</strong>{" "}
                  {isId
                    ? "Impor XLSX akan menambah transaksi baru ke data yang sudah ada. Akun, tagihan, dan data lain hanya diimpor jika data tersebut masih kosong."
                    : "XLSX import adds new transactions to existing data. Accounts, bills, and other data are only imported if they are currently empty."}
                </li>
              </ul>
            </div>
          </Card>

          {/* ── Danger Zone ── */}
          <Card className="border-red-500/20 bg-red-500/3 p-4 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid size-9 place-items-center rounded-xl bg-red-500/12 text-red-400 shrink-0 mt-0.5">
                  <AlertTriangle size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-red-400">
                    {isId ? "Zona Berbahaya" : "Danger Zone"}
                  </p>
                  <h2 className="font-heading text-base font-bold">{isId ? "Hapus Data" : "Erase Data"}</h2>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground max-w-sm">
                    {isId
                      ? "Pilih kategori data yang ingin dihapus. Pengaturan, profil, dan kategori selalu dipertahankan."
                      : "Select which data categories to erase. Settings, profile, and categories are always kept."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                data-testid="erase-all-button"
                onClick={onErase}
                className="flex shrink-0 items-center gap-2 rounded-xl border border-red-500/35 bg-red-500/8 px-4 py-2.5 text-xs font-bold text-red-400 transition-colors hover:bg-red-500/15 hover:border-red-500/50 sm:self-center"
              >
                <Trash2 size={14} />
                {isId ? "Hapus Data..." : "Erase Data..."}
              </button>
            </div>
          </Card>

          {/* Data Health Panel */}
          <DataHealthPanel state={state} onSave={save} />
        </div>
      )}
    </div>
  );
}
