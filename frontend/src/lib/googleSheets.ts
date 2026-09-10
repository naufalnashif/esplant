import type { FinanceState } from "./localDb";
import { createInitialState } from "./localDb";

/* ────────────────────────────────────────────────────────────────
   Browser-only Google Sheets client.

   • Auth: Google Identity Services token client (no client secret,
     no backend, no token ever leaves the user's browser session).
   • Data: plain fetch against the Sheets REST API — no gapi bundle.
   • Privacy: nothing is persisted anywhere except the user's own
     spreadsheet + this browser's sessionStorage/localStorage.
   ──────────────────────────────────────────────────────────────── */

export const GOOGLE_CLIENT_ID = String(import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "").trim();
export const isGoogleConfigured = (): boolean => GOOGLE_CLIENT_ID.length > 0;

const SCOPES = [
  "https://www.googleapis.com/auth/spreadsheets",
  "https://www.googleapis.com/auth/drive.file",
].join(" ");
const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const TOKEN_KEY = "selfmanage-google-token";
const KNOWN_SHEETS_KEY = "selfmanage-known-sheets";
const GIS_SRC = "https://accounts.google.com/gsi/client";

export class SheetsError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "SheetsError";
    this.status = status;
  }
}

export class AuthRequiredError extends Error {
  constructor(message = "Google authorization required") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

/* ───────────────────────── Token handling ───────────────────────── */

interface StoredToken {
  access_token: string;
  expires_at: number;
}

const readStoredToken = (): StoredToken | null => {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredToken;
    return parsed.expires_at > Date.now() + 30_000 ? parsed : null;
  } catch {
    return null;
  }
};

let token: StoredToken | null = readStoredToken();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let tokenClient: any = null;
let gisPromise: Promise<void> | null = null;

const storeToken = (next: StoredToken | null) => {
  token = next;
  try {
    if (next) sessionStorage.setItem(TOKEN_KEY, JSON.stringify(next));
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode — keep in memory only */
  }
};

export const isSignedIn = (): boolean => Boolean(token && token.expires_at > Date.now() + 30_000);

export const signOutGoogle = (): void => {
  storeToken(null);
};

function loadGis(): Promise<void> {
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GIS_SRC}"]`);
    const script = existing ?? document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => {
      gisPromise = null;
      reject(new SheetsError("Gagal memuat Google Identity Services"));
    });
    if (!existing) document.head.appendChild(script);
  });
  return gisPromise;
}

/**
 * Requests an access token. `interactive` must be true when triggered by a
 * user gesture (shows the Google account chooser); false attempts a silent
 * refresh of an already granted scope.
 */
export async function authorize(interactive = true): Promise<string> {
  if (!isGoogleConfigured()) throw new AuthRequiredError("VITE_GOOGLE_CLIENT_ID belum diisi");
  if (isSignedIn()) return token!.access_token;

  await loadGis();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oauth2 = (window as any).google?.accounts?.oauth2;
  if (!oauth2) throw new SheetsError("Google Identity Services tidak tersedia");

  return new Promise<string>((resolve, reject) => {
    tokenClient = oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      callback: (resp: any) => {
        if (resp?.error || !resp?.access_token) {
          reject(new AuthRequiredError(resp?.error_description || resp?.error || "Login dibatalkan"));
          return;
        }
        storeToken({
          access_token: resp.access_token,
          expires_at: Date.now() + Number(resp.expires_in ?? 3600) * 1000,
        });
        resolve(resp.access_token);
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      error_callback: (err: any) => {
        const type = String(err?.type ?? "");
        if (type === "popup_failed_to_open") {
          reject(new AuthRequiredError("Popup Google diblokir browser. Izinkan popup lalu coba lagi."));
          return;
        }
        reject(
          new AuthRequiredError(
            "Login Google tidak selesai. Jika jendela Google menampilkan error, pastikan alamat aplikasi ini sudah terdaftar di Authorized JavaScript origins pada OAuth Client Anda.",
          ),
        );
      },
    });
    tokenClient.requestAccessToken({ prompt: interactive ? "" : "none" });
  });
}

/* ───────────────────────── REST plumbing ───────────────────────── */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  if (!navigator.onLine) throw new SheetsError("Perangkat sedang offline");

  let lastError: SheetsError | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const accessToken = isSignedIn() ? token!.access_token : await authorize(false);
    const res = await fetch(url, {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (res.ok) return (res.status === 204 ? undefined : await res.json()) as T;

    if (res.status === 401) {
      storeToken(null);
      if (attempt === 0) continue;
      throw new AuthRequiredError("Sesi Google berakhir, hubungkan ulang");
    }

    const body = await res.json().catch(() => null);
    const message =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (body as any)?.error?.message ?? `Google Sheets API error ${res.status}`;
    lastError = new SheetsError(message, res.status);

    if (res.status === 429 || res.status >= 500) {
      await sleep(2 ** attempt * 700);
      continue;
    }
    throw lastError;
  }
  throw lastError ?? new SheetsError("Permintaan ke Google Sheets gagal");
}

const api = <T,>(path: string, init: RequestInit = {}) => request<T>(`${SHEETS_API}${path}`, init);

/* ─────────────────── Duplicate-spreadsheet protection ─────────────────── */

export interface SheetCandidate {
  id: string;
  name: string;
  modifiedTime?: string;
  /** Set when the entry came from this browser's own history instead of Drive. */
  local?: boolean;
}

/**
 * Spreadsheets this app created for the signed-in Google account. The `drive.file`
 * scope makes Drive return app-created files only, so this is the cross-device
 * source of truth used to avoid making a second workspace for the same account.
 */
export async function listAppSpreadsheets(): Promise<SheetCandidate[]> {
  const params = new URLSearchParams({
    q: "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false",
    fields: "files(id,name,modifiedTime)",
    orderBy: "modifiedTime desc",
    pageSize: "25",
    spaces: "drive",
  });
  const result = await request<{ files?: SheetCandidate[] }>(`${DRIVE_API}/files?${params.toString()}`);
  return (result.files ?? []).filter((file) => Boolean(file.id));
}

/** Workspaces this browser has connected before (survives sign-out, never leaves the device). */
export const readKnownSheets = (): SheetCandidate[] => {
  try {
    const raw = localStorage.getItem(KNOWN_SHEETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as SheetCandidate[];
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.id === "string") : [];
  } catch {
    return [];
  }
};

export const rememberSheet = (candidate: SheetCandidate): void => {
  try {
    const next = [
      { id: candidate.id, name: candidate.name, modifiedTime: new Date().toISOString(), local: true },
      ...readKnownSheets().filter((item) => item.id !== candidate.id),
    ].slice(0, 10);
    localStorage.setItem(KNOWN_SHEETS_KEY, JSON.stringify(next));
  } catch {
    /* private mode */
  }
};

/* ───────────────────────── Workbook schema ───────────────────────── */

const TABS = {
  config: "Config",
  accounts: "Accounts",
  transactions: "Transactions",
  bills: "Bills",
  debts: "Debts",
  savings: "Savings",
  wishlist: "Wishlist",
  budgets: "Budgets",
  categories: "Categories",
} as const;

type TabKey = keyof typeof TABS;

const HEADERS: Record<TabKey, string[]> = {
  config: ["key", "value"],
  accounts: ["id", "name", "type", "brand", "balance", "currency", "openingBalance"],
  transactions: ["id", "kind", "date", "description", "category", "accountId", "amount", "currency", "baseAmount", "tags"],
  bills: ["id", "name", "category", "amount", "currency", "frequency", "nextDueDate", "remainingInstallments", "active"],
  debts: ["id", "name", "person", "type", "total", "paid", "currency", "dueDate", "note"],
  savings: ["id", "name", "target", "saved", "currency", "targetDate", "color"],
  wishlist: ["id", "name", "price", "currency", "priority", "targetDate", "category", "status"],
  budgets: ["id", "category", "limit", "currency"],
  categories: ["id", "name", "archived"],
};

const TAB_KEYS = Object.keys(TABS) as TabKey[];
const dataRange = (key: TabKey) => `'${TABS[key]}'!A2:Z`;

/** Accepts a full spreadsheet URL or a bare ID and returns the ID. */
export function extractSpreadsheetId(input: string): string {
  const raw = input.trim();
  const match = raw.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (match) return match[1];
  return raw.replace(/^\/+|\/+$/g, "");
}

export const spreadsheetUrl = (id: string) => `https://docs.google.com/spreadsheets/d/${id}/edit`;

/** Creates every missing tab and (re)writes the header row. Idempotent. */
export async function ensureStructure(spreadsheetId: string): Promise<string> {
  const meta = await api<{
    properties?: { title?: string };
    sheets?: { properties?: { title?: string } }[];
  }>(`/${spreadsheetId}?fields=properties.title,sheets.properties.title`);

  const existing = new Set((meta.sheets ?? []).map((s) => s.properties?.title).filter(Boolean) as string[]);
  const missing = TAB_KEYS.filter((key) => !existing.has(TABS[key]));

  if (missing.length) {
    await api(`/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({
        requests: missing.map((key) => ({ addSheet: { properties: { title: TABS[key] } } })),
      }),
    });
  }

  await api(`/${spreadsheetId}/values:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      valueInputOption: "RAW",
      data: TAB_KEYS.map((key) => ({ range: `'${TABS[key]}'!A1`, values: [HEADERS[key]] })),
    }),
  });

  return meta.properties?.title ?? "Spreadsheet";
}

/** Creates a brand new spreadsheet in the signed-in user's own Drive. */
export async function createSpreadsheet(title: string): Promise<string> {
  const created = await api<{ spreadsheetId: string }>("", {
    method: "POST",
    body: JSON.stringify({
      properties: { title },
      sheets: TAB_KEYS.map((key) => ({
        properties: { title: TABS[key] },
        data: [{ startRow: 0, startColumn: 0, rowData: [{ values: HEADERS[key].map((h) => ({ userEnteredValue: { stringValue: h } })) }] }],
      })),
    }),
  });
  return created.spreadsheetId;
}

/* ───────────────────────── State ⇄ rows mapping ───────────────────────── */

const str = (value: unknown) => (value === undefined || value === null ? "" : String(value));
const num = (value: string | undefined) => {
  const parsed = Number(String(value ?? "").replace(/[^\d.,-]/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};

export function stateToRows(state: FinanceState): Record<TabKey, string[][]> {
  return {
    config: [
      ["profileName", str(state.profileName)],
      ["baseCurrency", str(state.baseCurrency)],
      ["locale", str(state.locale)],
      ["theme", str(state.theme)],
      ["exchangeRates", JSON.stringify(state.exchangeRates ?? {})],
      ["schedule", JSON.stringify(state.schedule ?? {})],
    ],
    accounts: state.accounts.map((a) => [a.id, a.name, a.type, str(a.brand), str(a.balance), a.currency, str(a.openingBalance)]),
    transactions: state.transactions.map((t) => [
      t.id, t.kind, t.date, t.description, t.category, t.accountId, str(t.amount), t.currency, str(t.baseAmount), (t.tags ?? []).join("|"),
    ]),
    bills: state.bills.map((b) => [
      b.id, b.name, b.category, str(b.amount), b.currency, b.frequency, b.nextDueDate, str(b.remainingInstallments), str(b.active),
    ]),
    debts: state.debts.map((d) => [d.id, d.name, d.person, d.type, str(d.total), str(d.paid), d.currency, d.dueDate, str(d.note)]),
    savings: state.savings.map((s) => [s.id, s.name, str(s.target), str(s.saved), s.currency, str(s.targetDate), str(s.color)]),
    wishlist: state.wishlist.map((w) => [w.id, w.name, str(w.price), w.currency, w.priority, str(w.targetDate), w.category, w.status]),
    budgets: state.budgets.map((b) => [b.id, b.category, str(b.limit), b.currency]),
    categories: state.categories.map((c) => [c.id, c.name, str(c.archived)]),
  };
}

export function rowsToState(rows: Partial<Record<TabKey, string[][]>>): FinanceState {
  const base = createInitialState();
  const state: FinanceState = { ...base, categories: [] };

  for (const row of rows.config ?? []) {
    const [key, value] = [row[0], row[1] ?? ""];
    try {
      if (key === "profileName") state.profileName = value;
      else if (key === "baseCurrency" && value) state.baseCurrency = value as FinanceState["baseCurrency"];
      else if (key === "locale" && value) state.locale = value === "en" ? "en" : "id";
      else if (key === "theme" && value) state.theme = value === "light" ? "light" : "dark";
      else if (key === "exchangeRates" && value) state.exchangeRates = { ...base.exchangeRates, ...JSON.parse(value) };
      else if (key === "schedule" && value) state.schedule = { ...base.schedule, ...JSON.parse(value) };
    } catch {
      /* malformed cell — keep default */
    }
  }

  state.accounts = (rows.accounts ?? []).filter((r) => r[0]).map((r) => ({
    id: r[0], name: r[1] ?? "", type: (r[2] || "cash") as FinanceState["accounts"][number]["type"],
    brand: r[3] ?? "", balance: num(r[4]), currency: (r[5] || state.baseCurrency) as FinanceState["baseCurrency"],
    openingBalance: r[6] ? num(r[6]) : undefined,
  }));

  state.transactions = (rows.transactions ?? []).filter((r) => r[0]).map((r) => ({
    id: r[0], kind: r[1] === "income" ? "income" : "expense", date: r[2] ?? "", description: r[3] ?? "",
    category: r[4] ?? "Other", accountId: r[5] ?? "", amount: num(r[6]),
    currency: (r[7] || state.baseCurrency) as FinanceState["baseCurrency"], baseAmount: num(r[8]),
    tags: r[9] ? r[9].split("|").filter(Boolean) : [],
  }));

  state.bills = (rows.bills ?? []).filter((r) => r[0]).map((r) => ({
    id: r[0], name: r[1] ?? "", category: r[2] ?? "Other", amount: num(r[3]),
    currency: (r[4] || state.baseCurrency) as FinanceState["baseCurrency"],
    frequency: r[5] === "weekly" ? "weekly" : "monthly", nextDueDate: r[6] ?? "",
    remainingInstallments: r[7] ? num(r[7]) : undefined, active: r[8] !== "false",
  }));

  state.debts = (rows.debts ?? []).filter((r) => r[0]).map((r) => ({
    id: r[0], name: r[1] ?? "", person: r[2] ?? "", type: r[3] === "receivable" ? "receivable" : "debt",
    total: num(r[4]), paid: num(r[5]), currency: (r[6] || state.baseCurrency) as FinanceState["baseCurrency"],
    dueDate: r[7] ?? "", note: r[8] ?? "",
  }));

  state.savings = (rows.savings ?? []).filter((r) => r[0]).map((r) => ({
    id: r[0], name: r[1] ?? "", target: num(r[2]), saved: num(r[3]),
    currency: (r[4] || state.baseCurrency) as FinanceState["baseCurrency"], targetDate: r[5] ?? "", color: r[6] || "#ffa116",
  }));

  state.wishlist = (rows.wishlist ?? []).filter((r) => r[0]).map((r) => ({
    id: r[0], name: r[1] ?? "", price: num(r[2]), currency: (r[3] || state.baseCurrency) as FinanceState["baseCurrency"],
    priority: (["high", "medium", "low"].includes(r[4]) ? r[4] : "medium") as FinanceState["wishlist"][number]["priority"],
    targetDate: r[5] ?? "", category: r[6] ?? "Lifestyle",
    status: (["planning", "saving", "purchased"].includes(r[7]) ? r[7] : "planning") as FinanceState["wishlist"][number]["status"],
  }));

  state.budgets = (rows.budgets ?? []).filter((r) => r[0]).map((r) => ({
    id: r[0], category: r[1] ?? "Other", limit: num(r[2]), currency: (r[3] || state.baseCurrency) as FinanceState["baseCurrency"],
  }));

  const categories = (rows.categories ?? []).filter((r) => r[0]).map((r) => ({
    id: r[0], name: r[1] ?? "", archived: r[2] === "true",
  }));
  state.categories = categories.length ? categories : base.categories;

  return state;
}

/* ───────────────────────── Read / write ───────────────────────── */

export async function readState(spreadsheetId: string): Promise<FinanceState> {
  const query = TAB_KEYS.map((key) => `ranges=${encodeURIComponent(dataRange(key))}`).join("&");
  const fetchValues = () =>
    api<{ valueRanges?: { values?: string[][] }[] }>(`/${spreadsheetId}/values:batchGet?${query}&majorDimension=ROWS`);

  let result: { valueRanges?: { values?: string[][] }[] };
  try {
    result = await fetchValues();
  } catch (error) {
    // A tab is missing (fresh or hand-made spreadsheet) → build the schema, retry once.
    if (error instanceof SheetsError && error.status === 400) {
      await ensureStructure(spreadsheetId);
      result = await fetchValues();
    } else {
      throw error;
    }
  }

  const rows: Partial<Record<TabKey, string[][]>> = {};
  TAB_KEYS.forEach((key, index) => {
    rows[key] = result.valueRanges?.[index]?.values ?? [];
  });
  return rowsToState(rows);
}

export async function writeState(spreadsheetId: string, state: FinanceState): Promise<void> {
  const rows = stateToRows(state);

  // Clear first so deletions actually disappear from the sheet.
  await api(`/${spreadsheetId}/values:batchClear`, {
    method: "POST",
    body: JSON.stringify({ ranges: TAB_KEYS.map(dataRange) }),
  });

  const data = TAB_KEYS
    .filter((key) => rows[key].length > 0)
    .map((key) => ({ range: `'${TABS[key]}'!A2`, values: rows[key] }));

  if (!data.length) return;

  await api(`/${spreadsheetId}/values:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({ valueInputOption: "RAW", data }),
  });
}
