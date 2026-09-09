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
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { FinanceState } from "@/lib/localDb";
import { CategoryManager } from "@/components/CategoryManager";
import { DataHealthPanel } from "@/components/DataHealthPanel";
import { useStorage } from "@/lib/storageContext";
import { readFullState, writeFullState } from "@/lib/googleSheets";

type SettingsSubTab = "general" | "data";

function DatabaseConnectionCard({ state, save }: { state: FinanceState; save: (nextState: FinanceState) => void }) {
  const { profile, setProfile, setSyncStatus, lastSyncTime, setLastSyncTime } = useStorage();
  const [isSyncing, setIsSyncing] = useState(false);
  const isId = state.locale === "id";

  const handleManualSync = async () => {
    if (!profile?.spreadsheetId || profile.storageMode !== "sheets") return;
    setIsSyncing(true);
    setSyncStatus("syncing");
    try {
      const remoteState = await readFullState(profile.spreadsheetId);
      save(remoteState);
      setSyncStatus("idle");
      setLastSyncTime(new Date());
      toast.success(isId ? "Data berhasil disinkronkan dari Google Sheets!" : "Successfully synced from Google Sheets!");
    } catch (err) {
      console.error("Sync error:", err);
      setSyncStatus("error");
      toast.error(isId ? "Gagal sinkronisasi dengan Google Sheets." : "Failed to sync with Google Sheets.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePushToSheets = async () => {
    if (!profile?.spreadsheetId || profile.storageMode !== "sheets") return;
    setIsSyncing(true);
    setSyncStatus("syncing");
    try {
      await writeFullState(profile.spreadsheetId, state);
      setSyncStatus("idle");
      setLastSyncTime(new Date());
      toast.success(isId ? "Data lokal berhasil di-push ke Google Sheets!" : "Local data pushed to Google Sheets!");
    } catch (err) {
      console.error("Push error:", err);
      setSyncStatus("error");
      toast.error(isId ? "Gagal mengirim data ke Google Sheets." : "Failed to push data to Google Sheets.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSwitchMode = (mode: "sheets" | "local") => {
    if (!profile) return;
    setProfile({ ...profile, storageMode: mode });
    toast.success(
      isId
        ? `Mode penyimpanan diubah ke ${mode === "sheets" ? "Google Sheets" : "Lokal"}`
        : `Storage mode changed to ${mode === "sheets" ? "Google Sheets" : "Local"}`
    );
  };

  return (
    <Card className="border-border/70 bg-card/75 p-5 sm:p-6">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-emerald-500/12 text-emerald-500">
            <Database size={18} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Database Connection</p>
            <h2 className="font-heading text-xl font-bold">{isId ? "Status & Koneksi Database" : "Database & Storage Mode"}</h2>
          </div>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
          profile?.storageMode === "sheets"
            ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
            : "bg-blue-500/15 text-blue-500 border border-blue-500/30"
        }`}>
          {profile?.storageMode === "sheets" ? "Google Sheets" : "Lokal (Offline)"}
        </span>
      </div>

      <div className="space-y-4">
        {profile?.storageMode === "sheets" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/60 bg-background/50 p-3.5">
                <p className="text-xs text-muted-foreground mb-1">Spreadsheet ID</p>
                {profile.spreadsheetId ? (
                  <a
                    href={profile.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${profile.spreadsheetId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-data font-bold text-primary hover:underline truncate block"
                  >
                    {profile.spreadsheetId} ↗
                  </a>
                ) : (
                  <p className="text-xs text-muted-foreground italic">{isId ? "Belum terhubung" : "Not connected"}</p>
                )}
              </div>

              <div className="rounded-xl border border-border/60 bg-background/50 p-3.5">
                <p className="text-xs text-muted-foreground mb-1">{isId ? "Akun Google" : "Google Account"}</p>
                <p className="text-xs font-bold text-foreground truncate">{profile.email || "—"}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualSync}
                disabled={isSyncing}
                className="gap-2 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
              >
                <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                {isId ? "Tarik Data dari Sheets" : "Pull from Sheets"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handlePushToSheets}
                disabled={isSyncing}
                className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
              >
                <Upload size={14} className={isSyncing ? "animate-spin" : ""} />
                {isId ? "Push Data ke Sheets" : "Push to Sheets"}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSwitchMode("local")}
                className="text-xs text-muted-foreground hover:text-foreground ml-auto"
              >
                {isId ? "Ubah ke Mode Lokal" : "Switch to Local Mode"}
              </Button>
            </div>

            {lastSyncTime && (
              <p className="text-[11px] text-muted-foreground">
                {isId ? "Terakhir sinkronisasi: " : "Last synced: "}{lastSyncTime.toLocaleTimeString()}
              </p>
            )}
          </>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {isId
                ? "Saat ini Anda menggunakan mode lokal. Data disimpan secara aman di browser peranti ini (IndexedDB)."
                : "You are using local storage mode. Data is stored safely in this browser (IndexedDB)."}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSwitchMode("sheets")}
              className="gap-2 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
            >
              <Cloud size={14} />
              {isId ? "Aktifkan Sync Google Sheets" : "Enable Google Sheets Sync"}
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}

export function SettingsPanel({
  state,
  profileDraft,
  setProfileDraft,
  updateState,
  onSaveProfile,
  onCsv,
  onJson,
  onImport,
  onImportCsv,
  onErase,
  onPrint,
  save,
}: {
  state: FinanceState;
  profileDraft: string;
  setProfileDraft: (value: string) => void;
  updateState: (updates: Partial<FinanceState>) => void;
  onSaveProfile: () => void;
  onCsv: () => void;
  onJson: () => void;
  onImport: (file: File) => void;
  onImportCsv?: (file: File) => void;
  onErase: () => void;
  onPrint: () => void;
  save: (nextState: FinanceState) => void;
}) {
  const isId = state.locale === "id";
  const [activeSubTab, setActiveSubTab] = useState<SettingsSubTab>("general");
  const fileRef = useRef<HTMLInputElement>(null);
  const csvFileRef = useRef<HTMLInputElement>(null);

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
      description: isId ? "Ekspor, impor CSV/JSON, restore & template" : "Export, CSV/JSON import & templates",
    },
  ];

  const downloadCsvTemplate = () => {
    const csvContent =
      '\uFEFF"date","type","description","category","amount","currency","tags"\n' +
      '"2026-09-08","expense","Makan Siang Resto","Food","45000","IDR","kuliner|lunch"\n' +
      '"2026-09-08","income","Gaji Project Freelance","Income","2500000","IDR","freelance|gaji"\n';
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "esplant_template_transaksi.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(isId ? "Template CSV transaksi berhasil di-download." : "CSV template downloaded.");
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
    a.download = "esplant_template_backup.json";
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
          {isId ? "Pengaturan Esplan" : "Esplan Settings"}
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

      {/* Sub-tab Content */}
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

      {activeSubTab === "data" && (
        <div className="space-y-6">
          {/* Backup, Export & Import Controls */}
          <Card className="border-border/70 bg-card/75 p-5 sm:p-6">
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Backup & export</p>
              <h2 className="mt-1 font-heading text-xl font-bold">{isId ? "Ekspor & Impor Data Transaksi" : "Export & Data Backup"}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {isId
                  ? "Unduh cadangan data atau impor transaksi baru menggunakan format CSV / JSON."
                  : "Download data backups or import transactions via CSV / JSON."}
              </p>
            </div>

            {/* Export & Print Section */}
            <div className="mb-5">
              <p className="mb-2 text-xs font-bold text-muted-foreground">{isId ? "1. Ekspor & Cetak Laporan" : "1. Export & Report"}</p>
              <div className="grid gap-2 sm:grid-cols-3">
                <Button data-testid="export-csv-button" variant="outline" onClick={onCsv} className="gap-2">
                  <FileSpreadsheet size={15} />
                  {isId ? "Ekspor CSV Transaksi" : "Export CSV"}
                </Button>
                <Button data-testid="export-json-button" variant="outline" onClick={onJson} className="gap-2">
                  <Download size={15} />
                  {isId ? "Backup JSON Full" : "Backup JSON"}
                </Button>
                <Button data-testid="print-pdf-button" variant="outline" onClick={onPrint} className="gap-2 border-primary/40 text-primary hover:bg-primary/8">
                  <FileText size={15} />
                  {isId ? "Preview & Download PDF" : "PDF Summary"}
                </Button>
              </div>
            </div>

            {/* Import Section with Hidden Inputs */}
            <div className="mb-5 border-t border-border/60 pt-4">
              <p className="mb-2 text-xs font-bold text-muted-foreground">{isId ? "2. Impor Data Transaksi / Restore Backup" : "2. Import & Restore Data"}</p>

              <input
                ref={fileRef}
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
                ref={csvFileRef}
                data-testid="import-csv-input"
                type="file"
                accept="text/csv,.csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file && onImportCsv) onImportCsv(file);
                  event.target.value = "";
                }}
              />

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  data-testid="import-csv-button"
                  variant="outline"
                  onClick={() => csvFileRef.current?.click()}
                  className="gap-2 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                >
                  <Upload size={15} />
                  {isId ? "Impor CSV Transaksi" : "Import CSV"}
                </Button>

                <Button
                  data-testid="import-json-button"
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  className="gap-2 border-primary/40 text-primary hover:bg-primary/8"
                >
                  <Upload size={15} />
                  {isId ? "Impor JSON State" : "Import JSON"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={downloadCsvTemplate}
                  className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Download size={13} />
                  {isId ? "Template CSV" : "CSV Template"}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={downloadJsonTemplate}
                  className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                >
                  <Download size={13} />
                  {isId ? "Template JSON" : "JSON Template"}
                </Button>

                <button
                  type="button"
                  data-testid="erase-all-button"
                  onClick={onErase}
                  className="ml-auto flex items-center gap-1.5 rounded-lg border border-red-500/30 px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-500/8"
                >
                  <Trash2 size={13} />
                  {isId ? "Hapus semua data" : "Erase all data"}
                </button>
              </div>
            </div>

            {/* Information Box explaining data structure */}
            <div className="rounded-xl border border-border/70 bg-background/50 p-4 text-xs leading-relaxed space-y-2">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <HelpCircle size={15} className="text-primary" />
                <span>{isId ? "Petunjuk & Format Data Impor" : "Data Import Format Instructions"}</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-muted-foreground text-[11px]">
                <li>
                  <strong className="text-foreground">Format CSV Transaksi:</strong> Harus memiliki kolom header:{" "}
                  <code className="font-data bg-secondary px-1 py-0.5 rounded text-[10px]">
                    date, type, description, category, amount, currency, tags
                  </code>
                </li>
                <li>
                  <strong className="text-foreground">Format Tanggal:</strong>{" "}
                  <code className="font-data bg-secondary px-1 py-0.5 rounded text-[10px]">YYYY-MM-DD</code> (contoh: 2026-09-08).
                </li>
                <li>
                  <strong className="text-foreground">Format Tipe (kind):</strong>{" "}
                  <code className="font-data bg-secondary px-1 py-0.5 rounded text-[10px]">expense</code> (pengeluaran) atau{" "}
                  <code className="font-data bg-secondary px-1 py-0.5 rounded text-[10px]">income</code> (pemasukan).
                </li>
                <li>
                  <strong className="text-foreground">Format JSON Backup:</strong> Menerima file backup full state Esplan atau array transaksi.
                </li>
              </ul>
            </div>
          </Card>

          {/* Data Integrity & Health Inspector */}
          <DataHealthPanel state={state} onSave={save} />
        </div>
      )}
    </div>
  );
}
