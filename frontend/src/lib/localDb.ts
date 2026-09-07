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

const isoDate = (offsetDays = 0) => {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
};

const monthDate = (offsetMonths: number, day: number) => {
  const date = new Date();
  date.setMonth(date.getMonth() + offsetMonths, day);
  return date.toISOString().slice(0, 10);
};

export const createDemoState = (): FinanceState => ({
  profileName: "Raka",
  baseCurrency: "IDR",
  locale: "id",
  theme: "dark",
  exchangeRates: { IDR: 1, USD: 16250, EUR: 17600, SGD: 12100, MYR: 3800, JPY: 108, AUD: 10600 },
  accounts: [
    { id: "acc-bca", name: "BCA Debit", type: "debit", brand: "BCA", balance: 8425000, currency: "IDR" },
    { id: "acc-gopay", name: "GoPay", type: "ewallet", brand: "GoPay", balance: 680000, currency: "IDR" },
    { id: "acc-cash", name: "Cash wallet", type: "cash", brand: "Cash", balance: 450000, currency: "IDR" },
    { id: "acc-shopee", name: "ShopeePayLater", type: "credit", brand: "SPayLater", balance: -1250000, currency: "IDR" },
  ],
  transactions: [
    { id: "tx-1", kind: "expense", date: monthDate(0, 2), description: "Kost bulanan", category: "Housing", accountId: "acc-bca", amount: 2100000, currency: "IDR", baseAmount: 2100000, tags: ["fixed", "home"] },
    { id: "tx-2", kind: "expense", date: monthDate(0, 4), description: "Kirim orang tua", category: "Family", accountId: "acc-bca", amount: 750000, currency: "IDR", baseAmount: 750000, tags: ["priority"] },
    { id: "tx-3", kind: "expense", date: monthDate(0, 8), description: "Makan siang kantor", category: "Food", accountId: "acc-gopay", amount: 420000, currency: "IDR", baseAmount: 420000, tags: ["work"] },
    { id: "tx-4", kind: "expense", date: monthDate(0, 11), description: "PLN Token", category: "Utilities", accountId: "acc-bca", amount: 250000, currency: "IDR", baseAmount: 250000, tags: ["fixed"] },
    { id: "tx-5", kind: "income", date: monthDate(0, 1), description: "Gaji bulan ini", category: "Salary", accountId: "acc-bca", amount: 12500000, currency: "IDR", baseAmount: 12500000, tags: ["income"] },
    { id: "tx-6", kind: "expense", date: monthDate(-1, 5), description: "Transport & ride-hailing", category: "Transport", accountId: "acc-gopay", amount: 890000, currency: "IDR", baseAmount: 890000, tags: ["mobility"] },
    { id: "tx-7", kind: "expense", date: monthDate(-1, 9), description: "Belanja groceries", category: "Food", accountId: "acc-bca", amount: 1250000, currency: "IDR", baseAmount: 1250000, tags: ["home"] },
    { id: "tx-8", kind: "expense", date: monthDate(-1, 12), description: "Paket data", category: "Utilities", accountId: "acc-bca", amount: 150000, currency: "IDR", baseAmount: 150000, tags: ["fixed"] },
    { id: "tx-9", kind: "expense", date: monthDate(-1, 18), description: "Jajan weekend", category: "Lifestyle", accountId: "acc-cash", amount: 540000, currency: "IDR", baseAmount: 540000, tags: ["fun"] },
    { id: "tx-10", kind: "income", date: monthDate(-1, 1), description: "Freelance project", category: "Freelance", accountId: "acc-bca", amount: 1800000, currency: "IDR", baseAmount: 1800000, tags: ["income"] },
  ],
  bills: [
    { id: "bill-1", name: "Kost", category: "Housing", amount: 2100000, currency: "IDR", frequency: "monthly", nextDueDate: isoDate(4), active: true },
    { id: "bill-2", name: "SPayLater", category: "Installment", amount: 480000, currency: "IDR", frequency: "monthly", nextDueDate: isoDate(8), remainingInstallments: 4, active: true },
    { id: "bill-3", name: "Kirim orang tua", category: "Family", amount: 750000, currency: "IDR", frequency: "monthly", nextDueDate: isoDate(10), active: true },
    { id: "bill-4", name: "Paket data", category: "Utilities", amount: 150000, currency: "IDR", frequency: "monthly", nextDueDate: isoDate(13), active: true },
  ],
  debts: [
    { id: "debt-1", name: "Laptop kerja", person: "Dimas", type: "debt", total: 3600000, paid: 1800000, currency: "IDR", dueDate: isoDate(21), note: "Cicilan 3x, pembayaran kedua sudah masuk" },
    { id: "debt-2", name: "Patungan liburan", person: "Nadia", type: "receivable", total: 900000, paid: 300000, currency: "IDR", dueDate: isoDate(12), note: "Sisa transfer minggu depan" },
  ],
  savings: [
    { id: "goal-1", name: "Dana darurat", target: 15000000, saved: 8200000, currency: "IDR", targetDate: monthDate(5, 1), color: "teal" },
    { id: "goal-2", name: "Trip Jepang", target: 18000000, saved: 4600000, currency: "IDR", targetDate: monthDate(10, 1), color: "amber" },
  ],
  wishlist: [
    { id: "wish-1", name: "Standing desk", price: 3200000, currency: "IDR", priority: "medium", targetDate: monthDate(3, 1), category: "Work", status: "saving" },
    { id: "wish-2", name: "Kyoto trip", price: 18000000, currency: "IDR", priority: "high", targetDate: monthDate(10, 1), category: "Travel", status: "planning" },
  ],
  budgets: [
    { id: "budget-food", category: "Food", limit: 1800000, currency: "IDR" },
    { id: "budget-transport", category: "Transport", limit: 1200000, currency: "IDR" },
    { id: "budget-lifestyle", category: "Lifestyle", limit: 900000, currency: "IDR" },
    { id: "budget-family", category: "Family", limit: 1000000, currency: "IDR" },
  ],
  categories: [
    ...["Food", "Transport", "Housing", "Utilities", "Family", "Lifestyle", "Salary", "Freelance", "Savings", "Other"].map((name) => ({ id: `category-${name.toLowerCase()}`, name, archived: false })),
  ],
  schedule: { enabled: false, frequency: "daily", email: "", browserReminder: true },
});

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

export const loadState = async (): Promise<FinanceState> => {
  try {
    const db = await openDb();
    const value = await new Promise<FinanceState | undefined>((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(STATE_KEY);
      request.onsuccess = () => resolve(request.result as FinanceState | undefined);
      request.onerror = () => reject(request.error);
    });
    db.close();
    if (value) {
      const demo = createDemoState();
      return { ...demo, ...value, budgets: value.budgets ?? demo.budgets, categories: value.categories ?? demo.categories };
    }
  } catch {
    const fallback = localStorage.getItem("nusa-artha-state");
    if (fallback) {
      const demo = createDemoState();
      const value = JSON.parse(fallback) as Partial<FinanceState>;
      return { ...demo, ...value, budgets: value.budgets ?? demo.budgets, categories: value.categories ?? demo.categories };
    }
  }
  const demo = createDemoState();
  await saveState(demo);
  return demo;
};

export const saveState = async (state: FinanceState): Promise<FinanceState> => {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(state, STATE_KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  } catch {
    localStorage.setItem("nusa-artha-state", JSON.stringify(state));
  }
  return state;
};

export const resetState = async () => {
  const demo = createDemoState();
  await saveState(demo);
  return demo;
};