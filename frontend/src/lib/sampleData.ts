import type { Account, Bill, FinanceState, Transaction, TransactionKind } from "./localDb";
import { createInitialState } from "./localDb";

const iso = (date: Date) => date.toISOString().slice(0, 10);
const noon = (year: number, monthIndex: number, day: number) => new Date(year, monthIndex, day, 12);
const daysInMonth = (year: number, monthIndex: number) => new Date(year, monthIndex + 1, 0).getDate();
// Deterministic jitter so repeated loads produce the same sample.
const jitter = (seed: number) => { const x = Math.sin(seed * 9301 + 49297) * 233280; return x - Math.floor(x); };
const round = (value: number, step = 1000) => Math.round(value / step) * step;

interface Template { day: number; kind: TransactionKind; description: string; category: string; accountId: string; amount: number; tags: string[]; every?: (offset: number) => boolean }

const templates: Template[] = [
  { day: 1, kind: "income", description: "Gaji bulanan", category: "Salary", accountId: "acc-bca", amount: 8_500_000, tags: ["salary"] },
  { day: 15, kind: "income", description: "Proyek freelance", category: "Freelance", accountId: "acc-bca", amount: 1_750_000, tags: ["side-income"], every: (m) => m % 2 === 1 },
  { day: 2, kind: "expense", description: "Sewa kost", category: "Housing", accountId: "acc-bca", amount: 1_500_000, tags: ["fixed"] },
  { day: 5, kind: "expense", description: "Internet & listrik", category: "Utilities", accountId: "acc-bca", amount: 350_000, tags: ["fixed"] },
  { day: 4, kind: "expense", description: "Bensin", category: "Transport", accountId: "acc-cash", amount: 120_000, tags: [] },
  { day: 12, kind: "expense", description: "Ojek online", category: "Transport", accountId: "acc-gopay", amount: 68_000, tags: [] },
  { day: 20, kind: "expense", description: "Parkir & tol", category: "Transport", accountId: "acc-cash", amount: 45_000, tags: [] },
  { day: 3, kind: "expense", description: "Makan siang kantor", category: "Food", accountId: "acc-gopay", amount: 48_000, tags: [] },
  { day: 7, kind: "expense", description: "Belanja mingguan", category: "Food", accountId: "acc-bca", amount: 240_000, tags: ["groceries"] },
  { day: 10, kind: "expense", description: "Kopi & sarapan", category: "Food", accountId: "acc-gopay", amount: 38_000, tags: [] },
  { day: 14, kind: "expense", description: "Makan malam keluarga", category: "Food", accountId: "acc-bca", amount: 185_000, tags: ["family"] },
  { day: 18, kind: "expense", description: "Belanja mingguan", category: "Food", accountId: "acc-bca", amount: 230_000, tags: ["groceries"] },
  { day: 22, kind: "expense", description: "Makan siang", category: "Food", accountId: "acc-cash", amount: 52_000, tags: [] },
  { day: 26, kind: "expense", description: "Camilan & minuman", category: "Food", accountId: "acc-gopay", amount: 41_000, tags: [] },
  { day: 9, kind: "expense", description: "Langganan streaming", category: "Lifestyle", accountId: "acc-bca", amount: 199_000, tags: ["subscription"] },
  { day: 21, kind: "expense", description: "Nongkrong & hiburan", category: "Lifestyle", accountId: "acc-gopay", amount: 320_000, tags: [], every: (m) => m % 2 === 0 },
  { day: 17, kind: "expense", description: "Vitamin & obat", category: "Health", accountId: "acc-cash", amount: 275_000, tags: [], every: (m) => m % 3 === 0 },
  { day: 11, kind: "expense", description: "Kursus online", category: "Education", accountId: "acc-bca", amount: 600_000, tags: ["upskill"], every: (m) => m === 1 || m === 4 },
];

/** Realistic 6-month sample workspace for demo mode; balances reconcile with the ledger. */
export const createSampleState = (base: FinanceState): FinanceState => {
  const initial = createInitialState();
  const rates = initial.exchangeRates;
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const accounts: Account[] = [
    { id: "acc-bca", name: "BCA Tahapan", type: "debit", brand: "BCA", balance: 0, currency: "IDR", openingBalance: 9_850_000, isDummy: true },
    { id: "acc-gopay", name: "GoPay", type: "ewallet", brand: "GoPay", balance: 0, currency: "IDR", openingBalance: 640_000, isDummy: true },
    { id: "acc-cash", name: "Uang Tunai", type: "cash", brand: "Cash", balance: 0, currency: "IDR", openingBalance: 420_000, isDummy: true },
  ];

  const transactions: Transaction[] = [];
  let seed = 1;
  const push = (date: Date, tpl: Omit<Template, "day" | "every">, variance = 0.12) => {
    const amount = round(tpl.amount * (1 + (jitter(seed++) - 0.5) * 2 * variance));
    transactions.push({ id: `tx-sample-${transactions.length + 1}`, kind: tpl.kind, date: iso(date), description: tpl.description, category: tpl.category, accountId: tpl.accountId, amount, currency: "IDR", baseAmount: amount, tags: tpl.tags, isDummy: true });
  };
  for (let offset = 5; offset >= 0; offset--) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - offset, 1);
    const year = monthDate.getFullYear();
    const monthIndex = monthDate.getMonth();
    const lastDay = offset === 0 ? today.getDate() : daysInMonth(year, monthIndex);
    for (const tpl of templates) {
      if (tpl.every && !tpl.every(offset)) continue;
      if (tpl.day > lastDay) continue;
      push(noon(year, monthIndex, tpl.day), tpl, tpl.kind === "income" || tpl.tags.includes("fixed") ? 0 : 0.18);
    }
  }
  // Guarantee fresh activity in the last few days.
  const recent = [
    { daysAgo: 0, description: "Kopi pagi", category: "Food", accountId: "acc-gopay", amount: 28_000 },
    { daysAgo: 1, description: "Ojek online", category: "Transport", accountId: "acc-gopay", amount: 24_000 },
    { daysAgo: 3, description: "Belanja bulanan", category: "Food", accountId: "acc-bca", amount: 410_000 },
  ];
  for (const item of recent) {
    const date = new Date(today);
    date.setDate(today.getDate() - item.daysAgo);
    push(date, { kind: "expense", description: item.description, category: item.category, accountId: item.accountId, amount: item.amount, tags: [] }, 0);
  }
  transactions.sort((a, b) => b.date.localeCompare(a.date));

  for (const account of accounts) {
    account.balance = (account.openingBalance ?? 0) + transactions
      .filter((item) => item.accountId === account.id)
      .reduce((sum, item) => sum + (item.kind === "expense" ? -1 : 1) * item.baseAmount / rates[account.currency], 0);
  }

  const nextDue = (day: number) => {
    const candidate = noon(today.getFullYear(), today.getMonth(), Math.min(day, daysInMonth(today.getFullYear(), today.getMonth())));
    if (candidate < today) candidate.setMonth(candidate.getMonth() + 1);
    return iso(candidate);
  };
  const bills: Bill[] = [
    { id: "bill-sample-1", name: "Sewa kost", category: "Housing", amount: 1_500_000, currency: "IDR", frequency: "monthly", nextDueDate: nextDue(2), active: true, isDummy: true },
    { id: "bill-sample-2", name: "Internet & listrik", category: "Utilities", amount: 350_000, currency: "IDR", frequency: "monthly", nextDueDate: nextDue(5), active: true, isDummy: true },
    { id: "bill-sample-3", name: "Cicilan HP", category: "Lifestyle", amount: 425_000, currency: "IDR", frequency: "monthly", nextDueDate: nextDue(20), remainingInstallments: 5, active: true, isDummy: true },
    { id: "bill-sample-4", name: "Langganan streaming", category: "Lifestyle", amount: 199_000, currency: "IDR", frequency: "monthly", nextDueDate: nextDue(9), active: true, isDummy: true },
  ];
  const plusDays = (days: number) => { const d = new Date(today); d.setDate(d.getDate() + days); return iso(d); };

  return {
    ...initial,
    profileName: base.profileName,
    locale: base.locale,
    theme: base.theme,
    accounts,
    transactions,
    bills,
    debts: [
      { id: "debt-sample-1", name: "Pinjam untuk laptop", person: "Rizky", type: "debt", total: 2_500_000, paid: 1_000_000, currency: "IDR", dueDate: plusDays(45), note: "Dicicil 3x", isDummy: true },
      { id: "debt-sample-2", name: "Patungan kado", person: "Dina", type: "receivable", total: 350_000, paid: 0, currency: "IDR", dueDate: plusDays(10), note: "", isDummy: true },
    ],
    savings: [
      { id: "saving-sample-1", name: "Dana darurat", target: 15_000_000, saved: 6_200_000, currency: "IDR", targetDate: plusDays(300), color: "#2cbb5d", isDummy: true },
      { id: "saving-sample-2", name: "Liburan Bali", target: 5_000_000, saved: 1_250_000, currency: "IDR", targetDate: plusDays(150), color: "#60a5fa", isDummy: true },
    ],
    wishlist: [
      { id: "wish-sample-1", name: "Mechanical keyboard", price: 1_200_000, currency: "IDR", priority: "medium", targetDate: plusDays(60), category: "Work", status: "planning", isDummy: true },
      { id: "wish-sample-2", name: "Sepatu lari", price: 850_000, currency: "IDR", priority: "low", targetDate: plusDays(90), category: "Health", status: "saving", isDummy: true },
    ],
    budgets: [
      { id: "budget-sample-food", category: "Food", limit: 2_000_000, currency: "IDR", isDummy: true },
      { id: "budget-sample-transport", category: "Transport", limit: 750_000, currency: "IDR", isDummy: true },
      { id: "budget-sample-lifestyle", category: "Lifestyle", limit: 1_000_000, currency: "IDR", isDummy: true },
      { id: "budget-sample-utilities", category: "Utilities", limit: 500_000, currency: "IDR", isDummy: true },
    ],
  };
};
