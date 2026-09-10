export type Locale = "id" | "en";
export type Theme = "light" | "dark";
export type Currency = "IDR" | "USD" | "EUR" | "SGD" | "MYR" | "JPY" | "AUD";
export type TransactionKind = "expense" | "income";
export type CommitmentType = "debt" | "receivable";

export interface Account {
  id: string;
  name: string;
  type: "debit" | "credit" | "ewallet" | "cash" | "investment";
  brand: string;
  balance: number;
  currency: Currency;
  /** Balance before any recorded transaction; anchor for Data Health reconciliation. */
  openingBalance?: number;
}

export interface Transaction {
  id: string;
  kind: TransactionKind;
  date: string;
  description: string;
  category: string;
  accountId: string;
  amount: number;
  currency: Currency;
  baseAmount: number;
  tags: string[];
}

export interface Bill {
  id: string;
  name: string;
  category: string;
  amount: number;
  currency: Currency;
  frequency: "weekly" | "monthly";
  nextDueDate: string;
  remainingInstallments?: number;
  active: boolean;
}

export interface Debt {
  id: string;
  name: string;
  person: string;
  type: CommitmentType;
  total: number;
  paid: number;
  currency: Currency;
  dueDate: string;
  note: string;
}

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  saved: number;
  currency: Currency;
  targetDate: string;
  color: string;
}

export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  currency: Currency;
  priority: "high" | "medium" | "low";
  targetDate: string;
  category: string;
  status: "planning" | "saving" | "purchased";
}

export interface ScheduleSettings {
  enabled: boolean;
  frequency: "daily" | "weekly" | "monthly";
  email: string;
  browserReminder: boolean;
  lastReminder?: string;
}

export interface Budget {
  id: string;
  category: string;
  limit: number;
  currency: Currency;
}

export interface Category { id: string; name: string; archived: boolean; }

export interface FinanceState {
  profileName: string;
  baseCurrency: Currency;
  locale: Locale;
  theme: Theme;
  exchangeRates: Record<Currency, number>;
  accounts: Account[];
  transactions: Transaction[];
  bills: Bill[];
  debts: Debt[];
  savings: SavingsGoal[];
  wishlist: WishlistItem[];
  budgets: Budget[];
  categories: Category[];
  schedule: ScheduleSettings;
}

const DB_NAME = "esplant-financial-tracker";
const STORE_NAME = "finance-state";
const STATE_KEY = "current";

/**
 * Kategori awal sengaja hanya 5 supaya donut/bar chart langsung enak dibaca.
 * Pengguna bisa menambah sendiri (dibatasi MAX_CATEGORIES di CategoryManager).
 */
export const DEFAULT_CATEGORIES = ["Food", "Transport", "Bills", "Salary", "Other"];

const transactionDelta = (transaction: Transaction, rates: FinanceState["exchangeRates"], currency: Currency) =>
  ((transaction.kind === "expense" ? -1 : 1) * transaction.baseAmount) / (rates[currency] || 1);

/** Backfills openingBalance for accounts created before the Data Health feature existed. */
export const withOpeningBalances = (state: FinanceState): FinanceState => ({
  ...state,
  accounts: state.accounts.map((account) =>
    account.openingBalance !== undefined
      ? account
      : {
          ...account,
          openingBalance:
            account.balance -
            state.transactions
              .filter((item) => item.accountId === account.id)
              .reduce((sum, item) => sum + transactionDelta(item, state.exchangeRates, account.currency), 0),
        },
  ),
});

/** Launch-ready initial state: no dummy data, everything starts from zero. */
export const createInitialState = (): FinanceState => ({
  profileName: "",
  baseCurrency: "IDR",
  locale: "id",
  theme: "dark",
  exchangeRates: { IDR: 1, USD: 16250, EUR: 17600, SGD: 12100, MYR: 3800, JPY: 108, AUD: 10600 },
  accounts: [],
  transactions: [],
  bills: [],
  debts: [],
  savings: [],
  wishlist: [],
  budgets: [],
  categories: DEFAULT_CATEGORIES.map((name) => ({ id: `category-${name.toLowerCase()}`, name, archived: false })),
  schedule: { enabled: false, frequency: "daily", email: "", browserReminder: false },
});

/** Validates and normalizes a JSON backup into a safe FinanceState (returns null when unusable). */
export const sanitizeImportedState = (raw: unknown): FinanceState | null => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const value = raw as Partial<FinanceState>;
  const base = createInitialState();
  const arr = <T,>(input: unknown, fallback: T[]): T[] => (Array.isArray(input) ? (input as T[]) : fallback);
  const next: FinanceState = {
    ...base,
    profileName: typeof value.profileName === "string" ? value.profileName.slice(0, 60) : base.profileName,
    baseCurrency: typeof value.baseCurrency === "string" && value.baseCurrency in base.exchangeRates ? (value.baseCurrency as Currency) : base.baseCurrency,
    locale: value.locale === "en" ? "en" : "id",
    theme: value.theme === "light" ? "light" : "dark",
    exchangeRates: { ...base.exchangeRates, ...(typeof value.exchangeRates === "object" && value.exchangeRates ? value.exchangeRates : {}) },
    accounts: arr(value.accounts, base.accounts),
    transactions: arr(value.transactions, base.transactions),
    bills: arr(value.bills, base.bills),
    debts: arr(value.debts, base.debts),
    savings: arr(value.savings, base.savings),
    wishlist: arr(value.wishlist, base.wishlist),
    budgets: arr(value.budgets, base.budgets),
    categories: arr(value.categories, base.categories),
    schedule: { ...base.schedule, ...(typeof value.schedule === "object" && value.schedule ? value.schedule : {}) },
  };
  if (!next.accounts.every((item) => item && typeof item.id === "string" && typeof item.name === "string" && Number.isFinite(item.balance))) return null;
  if (!next.transactions.every((item) => item && typeof item.id === "string" && Number.isFinite(item.amount))) return null;
  return withOpeningBalances(next);
};

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open local storage"));
  });

export const saveLocalState = async (state: FinanceState): Promise<void> => {
  // 1. Always update localStorage immediately for instant synchronous recovery
  try {
    localStorage.setItem("nusa-artha-state", JSON.stringify(state));
  } catch {}

  // 2. Also update IndexedDB for structured local storage
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(state, STATE_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  } catch {}
};

/** This browser's copy of the workspace. Never leaves the device. */
export const loadLocalState = async (): Promise<FinanceState> => {
  try {
    const db = await openDb();
    const value = await new Promise<FinanceState | undefined>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(STATE_KEY);
      request.onsuccess = () => resolve(request.result as FinanceState | undefined);
      request.onerror = () => reject(request.error);
    });
    db.close();
    if (value) {
      const demo = createInitialState();
      return withOpeningBalances({ ...demo, ...value, budgets: value.budgets ?? demo.budgets, categories: value.categories ?? demo.categories });
    }
  } catch {
    const fallback = localStorage.getItem("nusa-artha-state");
    if (fallback) {
      const demo = createInitialState();
      const value = JSON.parse(fallback) as Partial<FinanceState>;
      return withOpeningBalances({ ...demo, ...value, budgets: value.budgets ?? demo.budgets, categories: value.categories ?? demo.categories });
    }
  }
  const fresh = withOpeningBalances(createInitialState());
  await saveLocalState(fresh);
  return fresh;
};
