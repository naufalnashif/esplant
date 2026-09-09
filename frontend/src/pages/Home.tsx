import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import type * as React from "react";
import { toast } from "sonner";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import {
  ArrowDownLeft, ArrowUpRight, Bell, CalendarClock, Check, ChevronRight,
  CircleDollarSign, Landmark, LayoutDashboard,
  Moon, MoreHorizontal, Plus, ReceiptText, RefreshCw, Settings2, ShieldCheck,
  Sun, Target, TrendingDown, TrendingUp, WalletCards, X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type {
  Account, CommitmentType, Currency, Debt, FinanceState, Locale, SavingsGoal,
  Transaction, TransactionKind, WishlistItem,
} from "@/lib/localDb";
import { createInitialState, loadState, saveState, sanitizeImportedState } from "@/lib/localDb";
import { TransactionsPanel } from "@/components/TransactionsPanel";
import { BudgetGuardrails } from "@/components/BudgetGuardrails";
import { AccountsPanel } from "@/components/AccountsPanel";
import { InsightsPanel } from "@/components/InsightsPanel";
import { GoalsPanel } from "@/components/GoalsPanel";
import { CommitmentsPanel } from "@/components/CommitmentsPanel";
import { WishlistManager } from "@/components/WishlistManager";
import { SettingsPanel } from "@/components/SettingsPanel";
import { PDFReportModal } from "@/components/PDFReportModal";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { useStorage } from "@/lib/storageContext";
import { runDataHealth } from "@/lib/dataHealth";
import { formatMoney } from "@/lib/formatters";

const CURRENCIES: Currency[] = ["IDR", "USD", "EUR", "SGD", "MYR", "JPY", "AUD"];
const CATEGORY_COLORS = ["#ffa116", "#60a5fa", "#2cbb5d", "#ef4743", "#a78bfa", "#22d3ee"];
const categoryFallbacks = ["Food", "Transport", "Housing", "Utilities", "Family", "Lifestyle", "Health", "Education"];
const currentMonth = new Date().toISOString().slice(0, 7);

const copy = {
  id: {
    overview: "Ringkasan", transactions: "Transaksi", commitments: "Komitmen", goals: "Tujuan & wishlist", settings: "Pengaturan",
    hello: "Selamat datang kembali", command: "Satu ruang tenang untuk keputusan uang yang lebih baik.", accounts: "Akun & saldo", manageAccounts: "Kelola bank, kartu kredit, e-wallet, cash, dan investasi dalam satu money map.", addAccount: "Tambah akun", bankName: "Nama akun / bank", accountType: "Tipe akun", brand: "Brand", startingBalance: "Saldo awal", adjust: "Sesuaikan saldo", remove: "Hapus", totalAcross: "Total seluruh akun",
    totalBalance: "Total saldo", spent: "Pengeluaran bulan ini", income: "Pemasukan bulan ini", net: "Arus bersih", committed: "Komitmen aktif",
    vsLast: "vs bulan lalu", addTransaction: "Tambah transaksi", recent: "Aktivitas terbaru", seeAll: "Lihat semua",
    compare: "Bandingkan pengeluaran", category: "Kategori", thisMonth: "Bulan ini", lastMonth: "Bulan lalu", cashFlow: "Arus kas 6 bulan",
    actionCenter: "Pusat aksi", dueSoon: "Segera jatuh tempo", save: "Simpan", cancel: "Batal", amount: "Nominal", description: "Deskripsi",
    type: "Tipe", expense: "Pengeluaran", incomeType: "Pemasukan", account: "Sumber dana", date: "Tanggal", tags: "Tag",
    noData: "Belum ada data untuk filter ini.", all: "Semua", search: "Cari transaksi", sort: "Urutkan", newest: "Terbaru", largest: "Nominal terbesar",
    bills: "Tagihan & cicilan", debt: "Utang & piutang", savings: "Celengan & tabungan", wishlist: "Wishlist", addDebt: "Tambah utang/piutang",
    addWish: "Tambah wishlist", target: "Target", remaining: "tersisa", due: "Jatuh tempo", progress: "Progress", profile: "Profil lokal",
    language: "Bahasa", appearance: "Tampilan", backup: "Backup & export", exportCsv: "Export CSV", exportJson: "Backup JSON", printPdf: "Cetak / PDF",
    integrations: "Integrasi yang aman", gmail: "Gmail e-banking", scheduler: "Laporan terjadwal", offline: "Offline-first", manualRates: "Kurs manual",
  enabled: "Aktif", disabled: "Nonaktif", reset: "Reset data demo", notifications: "Pengingat browser", monthly: "Bulanan", weekly: "Mingguan", daily: "Harian", budgets: "Budget guardrails", budgetSubtitle: "Batas kategori dengan insight otomatis", safe: "Aman", warning: "Perhatian", over: "Melewati batas", setBudget: "Atur budget", monthlyLimit: "Batas bulanan", insightWithin: "ruang tersisa", insightOver: "melewati batas",
  },
  en: {
    overview: "Overview", transactions: "Transactions", commitments: "Commitments", goals: "Goals & wishlist", settings: "Settings",
    hello: "Welcome back", command: "One calm space for better money decisions.", accounts: "Accounts & balances", manageAccounts: "Manage banks, credit cards, e-wallets, cash, and investments in one money map.", addAccount: "Add account", bankName: "Account / bank name", accountType: "Account type", brand: "Brand", startingBalance: "Starting balance", adjust: "Adjust balance", remove: "Remove", totalAcross: "Total across accounts",
    totalBalance: "Total balance", spent: "Spent this month", income: "Income this month", net: "Net flow", committed: "Active commitments",
    vsLast: "vs last month", addTransaction: "Add transaction", recent: "Recent activity", seeAll: "See all",
    compare: "Spending comparison", category: "Category", thisMonth: "This month", lastMonth: "Last month", cashFlow: "6-month cash flow",
    actionCenter: "Action center", dueSoon: "Due soon", save: "Save", cancel: "Cancel", amount: "Amount", description: "Description",
    type: "Type", expense: "Expense", incomeType: "Income", account: "Funding source", date: "Date", tags: "Tags",
    noData: "No data for this filter yet.", all: "All", search: "Search transactions", sort: "Sort", newest: "Newest", largest: "Largest",
    bills: "Bills & installments", debt: "Debt & receivables", savings: "Savings goals", wishlist: "Wishlist", addDebt: "Add debt/receivable",
    addWish: "Add wishlist", target: "Target", remaining: "remaining", due: "Due", progress: "Progress", profile: "Local profile",
    language: "Language", appearance: "Appearance", backup: "Backup & export", exportCsv: "Export CSV", exportJson: "Backup JSON", printPdf: "Print / PDF",
    integrations: "Safe integrations", gmail: "Gmail e-banking", scheduler: "Scheduled reports", offline: "Offline-first", manualRates: "Manual rates",
  enabled: "Enabled", disabled: "Disabled", reset: "Reset demo data", notifications: "Browser reminders", monthly: "Monthly", weekly: "Weekly", daily: "Daily", budgets: "Budget guardrails", budgetSubtitle: "Category limits with automatic insights", safe: "Safe", warning: "Watch", over: "Over budget", setBudget: "Set budget", monthlyLimit: "Monthly limit", insightWithin: "room left", insightOver: "over the limit",
  },
};
type Tab = "overview" | "transactions" | "commitments" | "goals" | "accounts" | "settings";

const id = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
const monthKey = (date: string) => date.slice(0, 7);
const previousMonth = (month: string) => {
  const date = new Date(`${month}-01T00:00:00`);
  date.setMonth(date.getMonth() - 1);
  return date.toISOString().slice(0, 7);
};
const shortDate = (date: string, locale: Locale) => new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", { day: "2-digit", month: "short" }).format(new Date(`${date}T00:00:00`));
const toBase = (amount: number, currency: Currency, rates: FinanceState["exchangeRates"]) => amount * rates[currency];
const percent = (value: number, total: number) => total ? Math.min(100, Math.round((value / total) * 100)) : 0;
const accountDeltaFor = (transaction: Transaction, rates: FinanceState["exchangeRates"], currency: Currency) => ((transaction.kind === "expense" ? -1 : 1) * transaction.baseAmount) / rates[currency];

export default function Home() {
  const { profile } = useStorage();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [compareMonth, setCompareMonth] = useState(currentMonth);
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [filter, setFilter] = useState({ search: "", kind: "all", category: "all", account: "all", sort: "newest" });
  const [profileDraft, setProfileDraft] = useState("");
  const [transactionForm, setTransactionForm] = useState({ kind: "expense" as TransactionKind, amount: "", description: "", category: "Food", accountId: "", currency: "IDR" as Currency, date: new Date().toISOString().slice(0, 10), tags: "" });
  const [debtForm, setDebtForm] = useState({ name: "", person: "", type: "debt" as CommitmentType, total: "", dueDate: new Date().toISOString().slice(0, 10) });
  const [wishForm, setWishForm] = useState({ name: "", price: "", priority: "medium" as WishlistItem["priority"], targetDate: "", category: "Lifestyle" });

  const stateQuery = useQuery({ queryKey: ["nusa-artha-local-state"], queryFn: loadState, staleTime: Infinity });
  const state = stateQuery.data ?? createInitialState();
  const saveMutation = useMutation({
    mutationFn: saveState,
    onSuccess: (next) => queryClient.setQueryData(["nusa-artha-local-state"], next),
    onError: () => toast.error("Data belum tersimpan. Coba lagi."),
  });
  const t = copy[state.locale];
  const categories = useMemo(() => Array.from(new Set([...categoryFallbacks, ...state.categories.filter((item) => !item.archived).map((item) => item.name), ...state.transactions.map((item) => item.category)])), [state.categories, state.transactions]);
  const previous = previousMonth(compareMonth);
  const currentTransactions = state.transactions.filter((item) => monthKey(item.date) === compareMonth);
  const previousTransactions = state.transactions.filter((item) => monthKey(item.date) === previous);
  const displayRate = state.exchangeRates[state.baseCurrency] || 1;
  const currentSpend = currentTransactions.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.baseAmount, 0) / displayRate;
  const previousSpend = previousTransactions.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.baseAmount, 0) / displayRate;
  const currentIncome = currentTransactions.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.baseAmount, 0) / displayRate;
  const totalBalance = state.accounts.reduce((sum, account) => sum + toBase(account.balance, account.currency, state.exchangeRates), 0) / displayRate;
  const committed = state.bills.filter((bill) => bill.active).reduce((sum, bill) => sum + toBase(bill.amount, bill.currency, state.exchangeRates), 0) / displayRate;
  const spendDelta = previousSpend ? Math.round(((currentSpend - previousSpend) / previousSpend) * 100) : 0;
  const filteredTransactions = useMemo(() => [...state.transactions].filter((item) => {
    const query = filter.search.toLowerCase();
    return (!query || `${item.description} ${item.category} ${item.tags.join(" ")}`.toLowerCase().includes(query))
      && (filter.kind === "all" || item.kind === filter.kind)
      && (filter.category === "all" || item.category === filter.category)
      && (filter.account === "all" || item.accountId === filter.account);
  }).sort((a, b) => filter.sort === "largest" ? b.baseAmount - a.baseAmount : b.date.localeCompare(a.date)), [filter, state.transactions]);
  const categoryChart = useMemo(() => categories.slice(0, 7).map((category) => ({
    category,
    current: currentTransactions.filter((item) => item.kind === "expense" && item.category === category).reduce((sum, item) => sum + item.baseAmount, 0) / displayRate,
    previous: previousTransactions.filter((item) => item.kind === "expense" && item.category === category).reduce((sum, item) => sum + item.baseAmount, 0) / displayRate,
  })).filter((item) => item.current || item.previous), [categories, currentTransactions, previousTransactions, displayRate]);
  const flowChart = useMemo(() => Array.from({ length: 6 }, (_, index) => {
    const date = new Date(); date.setMonth(date.getMonth() - (5 - index));
    const key = date.toISOString().slice(0, 7);
    const items = state.transactions.filter((item) => monthKey(item.date) === key);
    return { month: new Intl.DateTimeFormat(state.locale === "id" ? "id-ID" : "en-US", { month: "short" }).format(date), income: items.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.baseAmount, 0) / displayRate, expense: items.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.baseAmount, 0) / displayRate };
  }), [state.locale, state.transactions, displayRate]);
  const save = (next: FinanceState) => { queryClient.setQueryData(["nusa-artha-local-state"], next); saveMutation.mutate(next); };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", state.theme === "dark");
    document.documentElement.lang = state.locale === "id" ? "id" : "en";
  }, [state.locale, state.theme]);

  // Check onboarding gate AFTER all hooks have executed to conform with React Rules of Hooks
  if (!profile || !profile.onboarded) {
    return <OnboardingFlow onComplete={() => queryClient.invalidateQueries({ queryKey: ["nusa-artha-local-state"] })} />;
  }

  const updateState = (updates: Partial<FinanceState>) => save({ ...state, ...updates });
  const updateTransaction = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setTransactionForm((form) => ({ ...form, [event.target.name]: event.target.value }));
  const handleAddTransaction = (event: React.FormEvent) => {
    event.preventDefault();
    if (!state.accounts.length) {
      toast.error(state.locale === "id" ? "Tambahkan akun terlebih dahulu di tab Akun & saldo." : "Add an account first in the Accounts tab."); return;
    }
    const amount = Number(transactionForm.amount);
    if (!transactionForm.description.trim() || !Number.isFinite(amount) || amount <= 0) {
      toast.error(state.locale === "id" ? "Isi deskripsi dan nominal yang valid." : "Add a valid description and amount."); return;
    }
    const accountId = state.accounts.some((account) => account.id === transactionForm.accountId) ? transactionForm.accountId : state.accounts[0].id;
    const transaction: Transaction = { id: editingTransaction?.id ?? id(), kind: transactionForm.kind, amount, currency: transactionForm.currency, baseAmount: toBase(amount, transactionForm.currency, state.exchangeRates), description: transactionForm.description.trim(), category: transactionForm.category, accountId, date: transactionForm.date, tags: transactionForm.tags.split(",").map((tag) => tag.trim()).filter(Boolean) };
    const accountDelta = (item: Transaction, sign: 1 | -1) => (item.kind === "expense" ? -1 : 1) * item.baseAmount * sign;
    const old = editingTransaction;
    const accounts = state.accounts.map((account) => { const reversal = old && old.accountId === account.id ? accountDelta(old, -1) / state.exchangeRates[account.currency] : 0; const next = transaction.accountId === account.id ? accountDelta(transaction, 1) / state.exchangeRates[account.currency] : 0; return reversal || next ? { ...account, balance: account.balance + reversal + next } : account; });
    const transactions = old ? state.transactions.map((item) => item.id === old.id ? transaction : item) : [transaction, ...state.transactions];
    save({ ...state, accounts, transactions });
    setTransactionForm({ kind: "expense", amount: "", description: "", category: "Food", accountId: state.accounts[0]?.id ?? "", currency: state.baseCurrency, date: new Date().toISOString().slice(0, 10), tags: "" });
    setShowTransactionForm(false);
    setEditingTransaction(null);
    toast.success(state.locale === "id" ? "Transaksi tersimpan di perangkat." : "Transaction saved on this device.");
  };
  const openEditTransaction = (transaction: Transaction) => { setEditingTransaction(transaction); setTransactionForm({ kind: transaction.kind, amount: String(transaction.amount), description: transaction.description, category: transaction.category, accountId: transaction.accountId, currency: transaction.currency, date: transaction.date, tags: transaction.tags.join(", ") }); setShowTransactionForm(true); };
  const deleteTransaction = (transaction: Transaction) => { if (!window.confirm(`Delete ${transaction.description}?`)) return; const accounts = state.accounts.map((account) => account.id === transaction.accountId ? { ...account, balance: account.balance - accountDeltaFor(transaction, state.exchangeRates, account.currency) } : account); save({ ...state, accounts, transactions: state.transactions.filter((item) => item.id !== transaction.id) }); toast.success("Transaction deleted."); };
  const handleAddDebt = (event: React.FormEvent) => {
    event.preventDefault(); const total = Number(debtForm.total);
    if (!debtForm.name.trim() || !debtForm.person.trim() || !Number.isFinite(total) || total <= 0) { toast.error("Lengkapi nama, orang, dan nominal."); return; }
    const debt: Debt = { id: id(), name: debtForm.name.trim(), person: debtForm.person.trim(), type: debtForm.type, total, paid: 0, currency: state.baseCurrency, dueDate: debtForm.dueDate, note: "" };
    save({ ...state, debts: [debt, ...state.debts] }); setDebtForm({ name: "", person: "", type: "debt", total: "", dueDate: new Date().toISOString().slice(0, 10) }); toast.success("Komitmen baru ditambahkan.");
  };
  void handleAddDebt;
  const handleAddWish = (event: React.FormEvent) => {
    event.preventDefault(); const price = Number(wishForm.price);
    if (!wishForm.name.trim() || !Number.isFinite(price) || price <= 0) { toast.error("Lengkapi nama wishlist dan harga valid."); return; }
    const wish: WishlistItem = { id: id(), name: wishForm.name.trim(), price, currency: state.baseCurrency, priority: wishForm.priority, targetDate: wishForm.targetDate, category: wishForm.category, status: "planning" };
    save({ ...state, wishlist: [wish, ...state.wishlist] }); setWishForm({ name: "", price: "", priority: "medium", targetDate: "", category: "Lifestyle" }); toast.success("Wishlist ditambahkan.");
  };
  const saveBudget = (category: string, limit: number) => {
    const existing = state.budgets.find((budget) => budget.category === category);
    if (limit <= 0) {
      const budgets = state.budgets.filter((budget) => budget.category !== category);
      save({ ...state, budgets });
      toast.success(state.locale === "id" ? `Budget ${category} dihapus.` : `${category} budget deleted.`);
      return;
    }
    const budgets = existing ? state.budgets.map((budget) => budget.category === category ? { ...budget, limit, currency: state.baseCurrency } : budget) : [...state.budgets, { id: id(), category, limit, currency: state.baseCurrency }];
    save({ ...state, budgets });
    toast.success(state.locale === "id" ? `Budget ${category} diperbarui.` : `${category} budget updated.`);
  };
  const deleteBudget = (category: string) => {
    const budgets = state.budgets.filter((budget) => budget.category !== category);
    save({ ...state, budgets });
    toast.success(state.locale === "id" ? `Budget ${category} dihapus.` : `${category} budget deleted.`);
  };
  const addAccount = (account: Account) => { save({ ...state, accounts: [...state.accounts, { ...account, openingBalance: account.balance }] }); toast.success(state.locale === "id" ? "Akun baru ditambahkan." : "New account added."); };
  const adjustAccount = (account: Account) => { const next = Number(window.prompt(`Saldo baru untuk ${account.name}`, String(account.balance))); if (!Number.isFinite(next)) return; save({ ...state, accounts: state.accounts.map((item) => item.id === account.id ? { ...item, balance: next, openingBalance: (item.openingBalance ?? item.balance) + (next - item.balance) } : item) }); toast.success("Saldo akun diperbarui."); };
  const removeAccount = (account: Account) => { if (state.transactions.some((item) => item.accountId === account.id)) { toast.error(state.locale === "id" ? "Akun dengan transaksi tidak dapat dihapus." : "Accounts with transactions cannot be removed."); return; } save({ ...state, accounts: state.accounts.filter((item) => item.id !== account.id) }); toast.success("Akun dihapus."); };
  const commitSavings = (goal: SavingsGoal, amount: number, direction: "deposit" | "withdraw") => {
    const account = state.accounts.find((item) => item.type === "debit" && item.balance > 0) ?? state.accounts[0];
    const baseAmount = toBase(amount, goal.currency, state.exchangeRates);
    const accountAmount = account ? baseAmount / state.exchangeRates[account.currency] : 0;
    if (!account) { toast.error("Tambahkan akun sebelum commit tabungan."); return; }
    if (direction === "deposit" && account.balance < accountAmount) { toast.error("Saldo akun tidak cukup untuk commit ini."); return; }
    if (direction === "withdraw" && goal.saved < amount) { toast.error("Nominal withdraw melebihi tabungan."); return; }
    const transaction: Transaction = { id: id(), kind: direction === "deposit" ? "expense" : "income", date: new Date().toISOString().slice(0, 10), description: `${direction === "deposit" ? "Commit to" : "Withdraw from"} ${goal.name}`, category: "Savings", accountId: account.id, amount, currency: goal.currency, baseAmount, tags: ["savings", direction] };
    const accounts = state.accounts.map((item) => item.id === account.id ? { ...item, balance: item.balance + (direction === "deposit" ? -accountAmount : accountAmount) } : item);
    const savings = state.savings.map((item) => item.id === goal.id ? { ...item, saved: direction === "deposit" ? Math.min(item.target, item.saved + amount) : Math.max(0, item.saved - amount) } : item);
    save({ ...state, accounts, savings, transactions: [transaction, ...state.transactions] });
    toast.success(direction === "deposit" ? "Commit tabungan tersimpan." : "Tabungan berhasil diambil.");
  };
  const payDebt = (debt: Debt) => { const nextPaid = Math.min(debt.total, debt.paid + debt.total / 3); save({ ...state, debts: state.debts.map((item) => item.id === debt.id ? { ...item, paid: nextPaid } : item) }); toast.success("Pembayaran dicatat."); };
  void payDebt;
  const addSavings = (goal: SavingsGoal) => { const value = Number(window.prompt("Nominal tabungan", "250000")); if (!Number.isFinite(value) || value <= 0) return; save({ ...state, savings: state.savings.map((item) => item.id === goal.id ? { ...item, saved: Math.min(item.target, item.saved + value) } : item) }); toast.success("Tabungan diperbarui."); };
  void addSavings;
  const download = (filename: string, content: string, type: string) => { const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([content], { type })); link.download = filename; link.click(); URL.revokeObjectURL(link.href); };
  const exportCsv = () => { const rows = [["date", "type", "description", "category", "amount", "currency", "tags"], ...state.transactions.map((item) => [item.date, item.kind, item.description, item.category, String(item.amount), item.currency, item.tags.join("|")])]; download("esplant-transactions.csv", `\uFEFF${rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n")}`, "text/csv;charset=utf-8"); toast.success("CSV berhasil dibuat."); };
  const exportJson = () => { download("esplant-backup.json", JSON.stringify(state, null, 2), "application/json"); toast.success("Backup JSON berhasil dibuat."); };
  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const next = sanitizeImportedState(JSON.parse(String(reader.result)));
        if (!next) { toast.error(state.locale === "id" ? "File backup tidak valid." : "Invalid backup file."); return; }
        save(next);
        toast.success(state.locale === "id" ? "Data berhasil diimpor ke perangkat ini." : "Data imported to this device.");
      } catch { toast.error(state.locale === "id" ? "File JSON tidak dapat dibaca." : "Unable to read the JSON file."); }
    };
    reader.readAsText(file);
  };
  const importCsv = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result);
        const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        if (lines.length <= 1) {
          toast.error(state.locale === "id" ? "File CSV kosong atau tidak valid." : "CSV file is empty.");
          return;
        }
        const defaultAccount = state.accounts[0];
        if (!defaultAccount) {
          toast.error(state.locale === "id" ? "Tambahkan akun terlebih dahulu." : "Add an account first.");
          return;
        }
        const headers = lines[0].toLowerCase().replaceAll('"', '').split(',').map((h) => h.trim());
        const dateIdx = headers.indexOf("date");
        const kindIdx = headers.findIndex((h) => h === "type" || h === "kind");
        const descIdx = headers.findIndex((h) => h === "description" || h === "desc");
        const catIdx = headers.indexOf("category");
        const amountIdx = headers.indexOf("amount");
        const currencyIdx = headers.indexOf("currency");
        const tagsIdx = headers.indexOf("tags");

        const newTransactions: Transaction[] = [];
        let totalDelta = 0;

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || lines[i].split(",");
          const cleanRow = row.map((cell) => cell.replace(/^"|"$/g, "").trim());
          const date = dateIdx >= 0 && cleanRow[dateIdx] ? cleanRow[dateIdx] : new Date().toISOString().slice(0, 10);
          const rawKind = kindIdx >= 0 ? cleanRow[kindIdx]?.toLowerCase() : "expense";
          const kind: TransactionKind = rawKind === "income" ? "income" : "expense";
          const description = descIdx >= 0 ? cleanRow[descIdx] || "Impor CSV" : "Impor CSV";
          const category = catIdx >= 0 ? cleanRow[catIdx] || "Food" : "Food";
          const rawAmount = amountIdx >= 0 ? Number(cleanRow[amountIdx]) : 0;
          const currency: Currency = (currencyIdx >= 0 && (cleanRow[currencyIdx] as Currency)) || state.baseCurrency;
          const tags = tagsIdx >= 0 && cleanRow[tagsIdx] ? cleanRow[tagsIdx].split("|").map((t) => t.trim()).filter(Boolean) : ["csv-import"];

          if (Number.isFinite(rawAmount) && rawAmount > 0) {
            const baseAmount = toBase(rawAmount, currency, state.exchangeRates);
            newTransactions.push({
              id: `tx-csv-${Date.now()}-${i}`,
              kind,
              date,
              description,
              category,
              accountId: defaultAccount.id,
              amount: rawAmount,
              currency,
              baseAmount,
              tags,
            });
            totalDelta += (kind === "expense" ? -1 : 1) * baseAmount;
          }
        }

        if (newTransactions.length === 0) {
          toast.error(state.locale === "id" ? "Tidak ada transaksi valid di CSV." : "No valid transactions in CSV.");
          return;
        }

        const accounts = state.accounts.map((acc) =>
          acc.id === defaultAccount.id
            ? { ...acc, balance: acc.balance + totalDelta / (state.exchangeRates[acc.currency] || 1) }
            : acc
        );

        save({
          ...state,
          accounts,
          transactions: [...newTransactions, ...state.transactions],
        });

        toast.success(
          state.locale === "id"
            ? `Berhasil mengimpor ${newTransactions.length} transaksi dari CSV.`
            : `Imported ${newTransactions.length} transactions from CSV.`
        );
      } catch {
        toast.error(state.locale === "id" ? "Gagal membaca file CSV." : "Failed to read CSV.");
      }
    };
    reader.readAsText(file);
  };
  const eraseAll = () => {
    if (!window.confirm(state.locale === "id" ? "Hapus SEMUA data di perangkat ini? Tindakan ini tidak bisa dibatalkan." : "Erase ALL data on this device? This cannot be undone.")) return;
    save(createInitialState());
    toast.success(state.locale === "id" ? "Semua data dihapus. Mulai dari nol." : "All data erased. Starting from zero.");
  };
  const openAddTransaction = () => { setEditingTransaction(null); setTransactionForm((form) => ({ ...form, accountId: form.accountId || state.accounts[0]?.id || "" })); setShowTransactionForm(true); };

  const navItems: { key: Tab; label: string; icon: typeof LayoutDashboard }[] = [
    { key: "overview", label: t.overview, icon: LayoutDashboard }, { key: "transactions", label: t.transactions, icon: ReceiptText }, { key: "commitments", label: t.commitments, icon: Landmark }, { key: "goals", label: t.goals, icon: Target }, { key: "accounts", label: t.accounts, icon: WalletCards }, { key: "settings", label: t.settings, icon: Settings2 },
  ];
  const accountName = (accountId: string) => state.accounts.find((account) => account.id === accountId)?.name ?? "—";
  const trendText = spendDelta <= 0 ? `${Math.abs(spendDelta)}% ${t.vsLast}` : `+${spendDelta}% ${t.vsLast}`;
  const healthReport = useMemo(() => runDataHealth(state), [state]);

  return (
    <div className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex min-h-svh max-w-[1600px]">
        <aside className="sticky top-0 hidden h-svh w-[250px] shrink-0 flex-col border-r border-border/70 bg-card/70 px-5 py-6 backdrop-blur-xl lg:flex" data-testid="desktop-sidebar">
          <div className="mb-10 flex items-center gap-3 px-2"><div className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20"><CircleDollarSign size={22} /></div><div><p className="font-heading text-lg font-extrabold tracking-tight">Esplan</p><p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">Money, made clear</p></div></div>
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Workspace</p>
          <nav className="space-y-1" data-testid="desktop-navigation">{navItems.map((item) => { const Icon = item.icon; return <button key={item.key} type="button" data-testid={`nav-${item.key}-button`} onClick={() => setTab(item.key)} className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium ${tab === item.key ? "bg-secondary font-semibold text-foreground" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"}`}><Icon size={18} className={`shrink-0 ${tab === item.key ? "text-primary" : ""}`} /><span>{item.label}</span>{tab === item.key && <ChevronRight size={14} className="ml-auto text-primary" />}</button>; })}</nav>
          <div className="mt-auto rounded-2xl border border-primary/20 bg-primary/8 p-4" data-testid="offline-status-card"><div className="mb-3 flex items-center gap-2"><ShieldCheck size={17} className="text-primary" /><span className="text-xs font-bold">{t.offline}</span></div><p className="text-xs leading-relaxed text-muted-foreground">Data pribadi tersimpan di perangkat ini, bukan di server aplikasi.</p><div className="mt-3 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary"><span className="size-1.5 rounded-full bg-primary animate-pulse-soft" /> Local only</div></div>
        </aside>
        <main className="min-w-0 flex-1 pb-24 lg:pb-8">
          <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/60 bg-background/85 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-10" data-testid="app-header">
            <div className="flex items-center gap-3"><div className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground lg:hidden"><CircleDollarSign size={19} /></div><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{tab === "overview" ? "Esplan / Financial Tracker" : `Esplan / ${navItems.find((item) => item.key === tab)?.label}`}</p><p className="font-heading text-sm font-bold lg:hidden">Esplan</p></div></div>
            <div className="flex items-center gap-2 sm:gap-3">{!healthReport.ok && <button type="button" data-testid="data-health-header-badge" onClick={() => setTab("settings")} title={state.locale === "id" ? "Ada inkonsistensi data — buka Data Health" : "Data inconsistencies found — open Data Health"} className="flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-[11px] font-bold text-amber-500 transition-colors hover:bg-amber-500/20"><Bell size={13} />{healthReport.errors + healthReport.warnings}</button>}<button type="button" data-testid="language-toggle-button" onClick={() => updateState({ locale: state.locale === "id" ? "en" : "id" })} className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-bold text-muted-foreground hover:border-primary hover:text-primary">{state.locale.toUpperCase()}</button><button type="button" data-testid="theme-toggle-button" onClick={() => updateState({ theme: state.theme === "dark" ? "light" : "dark" })} className="grid size-9 place-items-center rounded-lg border border-border bg-card text-muted-foreground hover:border-primary hover:text-primary">{state.theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}</button><div className="hidden h-8 w-px bg-border sm:block" /><div className="hidden text-right sm:block"><p className="text-xs font-semibold">{state.profileName || "Esplan"}</p><p className="text-[10px] text-muted-foreground">Personal workspace</p></div><div className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-primary to-indigo-400 text-xs font-bold text-white">{(state.profileName || "E").slice(0, 1).toUpperCase()}</div></div>
          </header>
          <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10">
            {tab === "overview" && <Overview state={state} t={t} totalBalance={totalBalance} currentSpend={currentSpend} currentIncome={currentIncome} committed={committed} trendText={trendText} previousSpend={previousSpend} categoryChart={categoryChart} flowChart={flowChart} currentMonth={compareMonth} setCompareMonth={setCompareMonth} onAdd={() => openAddTransaction()} onNavigate={setTab} accountName={accountName} />}
            {tab === "transactions" && <TransactionsPanel state={state} labels={{ all: t.all, type: t.type, expense: t.expense, incomeType: t.incomeType, category: t.category, account: t.account, newest: t.newest, largest: t.largest, search: t.search, noData: t.noData, addTransaction: t.addTransaction }} categories={categories} filteredTransactions={filteredTransactions} filter={filter} setFilter={setFilter} accountName={(accountId) => state.accounts.find((account) => account.id === accountId)?.name ?? "—"} onAdd={() => openAddTransaction()} onEdit={openEditTransaction} onDelete={deleteTransaction} />}
            {tab === "commitments" && <CommitmentsPanel state={state} onSave={save} />}
            {tab === "goals" && <GoalsPanel state={state} wishForm={wishForm} setWishForm={setWishForm} onAddWish={handleAddWish} onCommit={commitSavings} />}
            {tab === "accounts" && <AccountsPanel state={state} labels={{ accounts: t.accounts, manageAccounts: t.manageAccounts, addAccount: t.addAccount, bankName: t.bankName, accountType: t.accountType, brand: t.brand, startingBalance: t.startingBalance, save: t.save, adjust: t.adjust, remove: t.remove, totalAcross: t.totalAcross }} totalBalance={totalBalance} onAdd={addAccount} onAdjust={adjustAccount} onRemove={removeAccount} />}
            {tab === "settings" && <SettingsPanel state={state} profileDraft={profileDraft || state.profileName} setProfileDraft={setProfileDraft} updateState={updateState} onSaveProfile={() => { updateState({ profileName: profileDraft || state.profileName }); toast.success("Profil lokal tersimpan."); }} onCsv={exportCsv} onJson={exportJson} onImport={importJson} onImportCsv={importCsv} onErase={eraseAll} onPrint={() => setShowPdfModal(true)} save={save} />}
          </div>
          {tab === "overview" && <div className="px-4 pb-8 sm:px-6 lg:px-10"><BudgetGuardrails state={state} labels={{ budgets: t.budgets, budgetSubtitle: t.budgetSubtitle, safe: t.safe, warning: t.warning, over: t.over, setBudget: t.setBudget, monthlyLimit: t.monthlyLimit, insightWithin: t.insightWithin, insightOver: t.insightOver, save: t.save }} categories={categories} currentMonth={compareMonth} onSave={saveBudget} onDelete={deleteBudget} /></div>}
          {tab === "overview" && <div className="px-4 pb-8 sm:px-6 lg:px-10"><InsightsPanel state={state} currentMonth={compareMonth} /></div>}
          {tab === "goals" && <div className="px-4 pb-8 sm:px-6 lg:px-10"><WishlistManager state={state} onSave={save} /></div>}
        </main>
      </div>
      <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-6 border-t border-border/70 bg-card/95 px-1 py-2 backdrop-blur-xl lg:hidden" data-testid="mobile-navigation">{navItems.map((item) => { const Icon = item.icon; return <button key={item.key} type="button" data-testid={`mobile-nav-${item.key}-button`} onClick={() => setTab(item.key)} className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[9px] font-semibold transition-colors ${tab === item.key ? "text-primary" : "text-muted-foreground"}`}><Icon size={18} /><span className="max-w-full truncate px-0.5">{item.label}</span></button>; })}</nav>
      {showTransactionForm && <TransactionModal state={state} t={t} categories={categories} form={transactionForm} setForm={setTransactionForm} onChange={updateTransaction} onClose={() => { setShowTransactionForm(false); setEditingTransaction(null); }} onSubmit={handleAddTransaction} editingTransaction={editingTransaction} />}
      {showPdfModal && <PDFReportModal state={state} onClose={() => setShowPdfModal(false)} />}
    </div>
  );
}

function SectionHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: React.ReactNode }) {
  return <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">{eyebrow}</p><h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>}</div>{action}</div>;
}

function KpiCard({ label, value, note, icon, tone = "teal" }: { label: string; value: string; note: string; icon: React.ReactNode; tone?: "teal" | "rose" | "amber" | "indigo" }) {
  const tones = { teal: "bg-primary/12 text-primary", rose: "bg-red-500/12 text-red-400", amber: "bg-amber-500/12 text-amber-400", indigo: "bg-indigo-500/12 text-indigo-400" };
  return <Card className="group relative overflow-hidden border-border/70 bg-card/75 p-5 shadow-sm backdrop-blur-xl hover:-translate-y-0.5 hover:shadow-lg"><div className={`mb-5 grid size-10 place-items-center rounded-xl ${tones[tone]}`}>{icon}</div><p className="text-xs font-semibold text-muted-foreground">{label}</p><p className="mt-1 font-data text-xl font-bold tracking-tight sm:text-2xl" data-testid={`kpi-${label.toLowerCase().replaceAll(" ", "-")}-value`}>{value}</p><p className="mt-2 text-[11px] text-muted-foreground">{note}</p><div className="absolute -right-8 -top-8 size-24 rounded-full bg-primary/5 blur-2xl transition-transform duration-300 group-hover:scale-150" /></Card>;
}

function Overview({
  state,
  t,
  totalBalance,
  currentSpend,
  currentIncome,
  committed,
  trendText,
  previousSpend,
  categoryChart,
  flowChart,
  currentMonth,
  setCompareMonth,
  onAdd,
  onNavigate,
  accountName,
}: {
  state: FinanceState;
  t: typeof copy.id;
  totalBalance: number;
  currentSpend: number;
  currentIncome: number;
  committed: number;
  trendText: string;
  previousSpend: number;
  categoryChart: { category: string; current: number; previous: number }[];
  flowChart: { month: string; income: number; expense: number }[];
  currentMonth: string;
  setCompareMonth: (value: string) => void;
  onAdd: () => void;
  onNavigate: (tab: Tab) => void;
  accountName: (id: string) => string;
}) {
  const isId = state.locale === "id";
  const [periodFilter, setPeriodFilter] = useState<"today" | "week" | "month" | "year" | "all">("month");
  const [showMatrix, setShowMatrix] = useState(true);

  const displayRate = state.exchangeRates[state.baseCurrency] || 1;
  const todayIso = new Date().toISOString().slice(0, 10);
  const monthIso = todayIso.slice(0, 7);
  const yearIso = todayIso.slice(0, 4);

  // Week bounds (Monday to Sunday)
  const getWeekBounds = (dateStr: string) => {
    const d = new Date(`${dateStr}T00:00:00`);
    const day = d.getDay();
    const diffToMon = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diffToMon));
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return {
      start: monday.toISOString().slice(0, 10),
      end: sunday.toISOString().slice(0, 10),
    };
  };

  const weekBounds = useMemo(() => getWeekBounds(todayIso), [todayIso]);

  // Active bills
  const activeBills = useMemo(() => {
    return state.bills.filter(
      (b) => b.active !== false && (b.remainingInstallments === undefined || b.remainingInstallments > 0)
    );
  }, [state.bills]);

  // Filter bills according to active periodFilter (today, week, month, year, all)
  const filteredBillsByPeriod = useMemo(() => {
    return activeBills.filter((bill) => {
      if (periodFilter === "all") return true;
      if (periodFilter === "today") return bill.nextDueDate === todayIso;
      if (periodFilter === "week") return bill.nextDueDate >= weekBounds.start && bill.nextDueDate <= weekBounds.end;
      if (periodFilter === "month") return bill.nextDueDate.slice(0, 7) === monthIso;
      if (periodFilter === "year") return bill.nextDueDate.slice(0, 4) === yearIso;
      return true;
    });
  }, [activeBills, periodFilter, todayIso, weekBounds, monthIso, yearIso]);

  const upcoming = useMemo(() => {
    return [...filteredBillsByPeriod].sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate)).slice(0, 4);
  }, [filteredBillsByPeriod]);

  const periodCommitted = useMemo(() => {
    return filteredBillsByPeriod.reduce(
      (sum, bill) => sum + toBase(bill.amount, bill.currency, state.exchangeRates),
      0
    ) / displayRate;
  }, [filteredBillsByPeriod, state.exchangeRates, state.baseCurrency, displayRate]);

  const recent = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = d.toISOString().slice(0, 7);
      const label = new Intl.DateTimeFormat(state.locale === "id" ? "id-ID" : "en-US", {
        month: "long",
        year: "numeric",
      }).format(d);
      options.push({ value, label });
    }
    return options;
  }, [state.locale]);

  // Helper for computing income/expense/net for a transaction subset
  const calcStats = (txs: Transaction[]) => {
    const income = txs.filter((t) => t.kind === "income").reduce((s, t) => s + t.baseAmount, 0) / displayRate;
    const expense = txs.filter((t) => t.kind === "expense").reduce((s, t) => s + t.baseAmount, 0) / displayRate;
    return { income, expense, net: income - expense, count: txs.length };
  };

  const periodStats = useMemo(() => {
    return {
      today: calcStats(state.transactions.filter((t) => t.date === todayIso)),
      week: calcStats(state.transactions.filter((t) => t.date >= weekBounds.start && t.date <= weekBounds.end)),
      month: calcStats(state.transactions.filter((t) => t.date.slice(0, 7) === monthIso)),
      year: calcStats(state.transactions.filter((t) => t.date.slice(0, 4) === yearIso)),
      all: calcStats(state.transactions),
    };
  }, [state.transactions, todayIso, weekBounds, monthIso, yearIso, displayRate]);

  // Selected period active stats
  const activeStats = periodStats[periodFilter];

  const periodLabels = {
    today: isId ? "Hari ini" : "Today",
    week: isId ? "Minggu ini" : "This Week",
    month: isId ? "Bulan ini" : "This Month",
    year: isId ? "Tahun ini" : "This Year",
    all: isId ? "Semua Waktu" : "All Time",
  };

  const previousIncome = state.transactions.filter((item) => monthKey(item.date) === previousMonth(currentMonth) && item.kind === "income").reduce((sum, item) => sum + item.baseAmount, 0) / displayRate;
  const incomeDelta = previousIncome ? Math.round(((currentIncome - previousIncome) / previousIncome) * 100) : 0;

  return (
    <div className="animate-rise-in">
      <SectionHeading
        eyebrow="Personal finance / 01"
        title={state.profileName ? `${t.hello}, ${state.profileName}.` : `${t.hello}.`}
        description={t.command}
        action={
          <Button data-testid="add-transaction-button" onClick={onAdd} className="gap-2 shadow-lg shadow-primary/20">
            <Plus size={17} />
            {t.addTransaction}
          </Button>
        }
      />

      {state.accounts.length === 0 && (
        <Card className="mb-6 border-primary/25 bg-primary/5 p-6 sm:p-8" data-testid="onboarding-banner">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                <WalletCards size={22} />
              </div>
              <div>
                <h2 className="font-heading text-lg font-bold">
                  {isId ? "Mulai dari nol — data Anda 100% tersimpan aman" : "Start from zero — your data is 100% saved"}
                </h2>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  {isId
                    ? "Tambahkan akun pertama (bank, e-wallet, cash) untuk mulai mencatat, atau impor backup JSON dari perangkat lain."
                    : "Add your first account (bank, e-wallet, cash) to start tracking, or import a JSON backup from another device."}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button data-testid="onboarding-add-account-button" onClick={() => onNavigate("accounts")} className="gap-2">
                <Plus size={15} />
                {isId ? "Tambah akun" : "Add account"}
              </Button>
              <Button data-testid="onboarding-import-button" variant="outline" onClick={() => onNavigate("settings")} className="gap-2">
                {isId ? "Impor JSON" : "Import JSON"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Main Top Balance & Smart Snapshot */}
      <div className="mb-6 grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card className="relative min-h-[218px] overflow-hidden border-primary/20 bg-gradient-to-br from-[#303030] via-[#262626] to-[#1c1c1c] p-6 text-white shadow-xl shadow-primary/10 sm:p-8">
          <div className="absolute -right-20 -top-24 size-72 rounded-full border-[30px] border-white/8" />
          <div className="absolute -bottom-28 right-24 size-56 rounded-full border-[18px] border-white/6" />
          <div className="relative flex h-full flex-col justify-between">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/65">
                  {t.totalBalance} · {state.baseCurrency}
                </p>
                <p className="mt-3 font-heading text-4xl font-extrabold tracking-tight sm:text-5xl" data-testid="total-balance-value">
                  {formatMoney(totalBalance, state.baseCurrency, state.locale)}
                </p>
              </div>
              <div className="rounded-xl border border-white/15 bg-white/10 p-2">
                <WalletCards size={20} />
              </div>
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-5 text-xs text-white/70">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-300" /> {state.accounts.length} active accounts
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={14} /> Synchronized & Saved
              </span>
            </div>
          </div>
        </Card>

        <Card className="border-border/70 bg-card/75 p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Smart snapshot</p>
              <p className="mt-2 font-heading text-lg font-bold">{t.cashFlow}</p>
            </div>
            <Badge variant="secondary" className="gap-1">
              <RefreshCw size={12} /> Live
            </Badge>
          </div>
          <div className="mt-5 h-[105px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={flowChart}>
                <defs>
                  <linearGradient id="cashflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffa116" stopOpacity={0.42} />
                    <stop offset="100%" stopColor="#ffa116" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={{ background: "#282828", border: "1px solid #3c3c3c", borderRadius: 12, fontSize: 11 }}
                  formatter={(value) => formatMoney(Number(value), state.baseCurrency, state.locale, true)}
                />
                <Area type="monotone" dataKey="income" stroke="#2cbb5d" strokeWidth={2} fill="url(#cashflow)" />
                <Area type="monotone" dataKey="expense" stroke="#ef4743" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex gap-4 text-[10px] font-semibold text-muted-foreground">
            <span className="flex items-center gap-1">
              <i className="size-2 rounded-full bg-emerald-400" />
              Income
            </span>
            <span className="flex items-center gap-1">
              <i className="size-2 rounded-full bg-red-400" />
              Expense
            </span>
          </div>
        </Card>
      </div>

      {/* Filter Periode Dashboard Header */}
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {isId ? "Filter Periode Dashboard" : "Dashboard Period Filter"}
          </p>
          <h2 className="mt-1 font-heading text-xl font-bold">
            {isId ? `Ringkasan Finansial (${periodLabels[periodFilter]})` : `Financial Overview (${periodLabels[periodFilter]})`}
          </h2>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border/70 bg-card/80 p-1.5 shadow-sm" data-testid="period-filter-bar">
          {(["today", "week", "month", "year", "all"] as const).map((pKey) => (
            <button
              key={pKey}
              type="button"
              data-testid={`period-filter-${pKey}`}
              onClick={() => setPeriodFilter(pKey)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                periodFilter === pKey
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {periodLabels[pKey]}
            </button>
          ))}
        </div>
      </div>

      {/* Dynamic KPI Cards corresponding to selected period filter */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={isId ? `Pengeluaran (${periodLabels[periodFilter]})` : `Spent (${periodLabels[periodFilter]})`}
          value={formatMoney(activeStats.expense, state.baseCurrency, state.locale, true)}
          note={`${activeStats.count} ${isId ? "transaksi tercatat" : "transactions"}`}
          icon={<TrendingDown size={19} />}
          tone="rose"
        />
        <KpiCard
          label={isId ? `Pemasukan (${periodLabels[periodFilter]})` : `Income (${periodLabels[periodFilter]})`}
          value={formatMoney(activeStats.income, state.baseCurrency, state.locale, true)}
          note={periodFilter === "month" ? `${incomeDelta >= 0 ? "+" : ""}${incomeDelta}% vs last month` : `${periodLabels[periodFilter]}`}
          icon={<TrendingUp size={19} />}
          tone="indigo"
        />
        <KpiCard
          label={isId ? `Arus Bersih (${periodLabels[periodFilter]})` : `Net Flow (${periodLabels[periodFilter]})`}
          value={formatMoney(activeStats.net, state.baseCurrency, state.locale, true)}
          note={isId ? "Pemasukan − Pengeluaran" : "Income − Expense"}
          icon={<ArrowUpRight size={19} />}
          tone={activeStats.net >= 0 ? "teal" : "rose"}
        />
        <KpiCard
          label={isId ? `Cicilan / Tagihan (${periodLabels[periodFilter]})` : `Committed (${periodLabels[periodFilter]})`}
          value={formatMoney(periodCommitted, state.baseCurrency, state.locale, true)}
          note={`${upcoming.length} ${isId ? "jatuh tempo" : "due soon"}`}
          icon={<CalendarClock size={19} />}
          tone="amber"
        />
      </div>

      {/* Multi-Timeframe Summary Matrix Card (Side-by-side comparison for Today, Week, Month, Year) */}
      <Card className="mb-6 border-border/70 bg-card/75 p-4 sm:p-6" data-testid="multi-period-matrix">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Matriks Ringkasan Multi-Periode</p>
            <h3 className="mt-0.5 font-heading text-base font-bold sm:text-lg">
              {isId ? "Perbandingan Ringkasan: Hari Ini, Minggu Ini, Bulan Ini & Tahun Ini" : "Multi-Timeframe Summary Matrix"}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowMatrix(!showMatrix)}
            className="flex items-center gap-1 text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            <Badge variant="outline" className="text-[10px] cursor-pointer hover:bg-secondary">
              {showMatrix ? (isId ? "Lipat" : "Collapse") : (isId ? "Buka Matriks" : "Expand")}
            </Badge>
          </button>
        </div>

        {showMatrix && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 pt-1">
          {(["today", "week", "month", "year"] as const).map((pKey) => {
            const stats = periodStats[pKey];
            const isPositive = stats.net >= 0;

            return (
              <div
                key={pKey}
                onClick={() => setPeriodFilter(pKey)}
                className={`cursor-pointer rounded-xl border p-4 transition-all hover:border-primary/50 hover:shadow-md ${
                  periodFilter === pKey ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border/60 bg-background/35"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-foreground">{periodLabels[pKey]}</p>
                  <span className="text-[10px] text-muted-foreground">{stats.count} tx</span>
                </div>

                <div className="mt-3 space-y-1.5 text-xs font-medium">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isId ? "Masuk" : "Income"}:</span>
                    <span className="font-data font-semibold text-emerald-400">
                      +{formatMoney(stats.income, state.baseCurrency, state.locale, true)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{isId ? "Keluar" : "Expense"}:</span>
                    <span className="font-data font-semibold text-red-400">
                      −{formatMoney(stats.expense, state.baseCurrency, state.locale, true)}
                    </span>
                  </div>
                  <div className="mt-2 flex justify-between border-t border-border/40 pt-2 font-bold">
                    <span>{isId ? "Net" : "Net Flow"}:</span>
                    <span className={`font-data ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                      {isPositive ? "+" : ""}
                      {formatMoney(stats.net, state.baseCurrency, state.locale, true)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </Card>

      {/* Main Bar Chart & Action Center */}
      <div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <Card className="border-border/70 bg-card/75 p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t.compare}</p>
              <h2 className="mt-1 font-heading text-xl font-bold">
                {t.category} · {currentMonth}
              </h2>
            </div>
            <select
              aria-label="Comparison month"
              data-testid="comparison-month-select"
              value={currentMonth}
              onChange={(event) => setCompareMonth(event.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold outline-none focus:border-primary cursor-pointer"
            >
              {monthOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChart} barGap={5}>
                <CartesianGrid vertical={false} stroke="currentColor" opacity={0.08} />
                <XAxis dataKey="category" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(value) => `${Math.round(Number(value) / 1000000)}m`} />
                <Tooltip
                  contentStyle={{ background: "#282828", border: "1px solid #3c3c3c", borderRadius: 12, fontSize: 11 }}
                  formatter={(value) => formatMoney(Number(value), state.baseCurrency, state.locale, true)}
                />
                <Bar dataKey="previous" name={t.lastMonth} fill="#5f5f5f" radius={[5, 5, 0, 0]} />
                <Bar dataKey="current" name={t.thisMonth} fill="#ffa116" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex gap-4 text-[10px] font-semibold text-muted-foreground">
            <span className="flex items-center gap-1">
              <i className="size-2 rounded-full bg-primary" />
              {t.thisMonth}
            </span>
            <span className="flex items-center gap-1">
              <i className="size-2 rounded-full bg-neutral-500" />
              {t.lastMonth}
            </span>
          </div>
        </Card>

        <Card className="border-border/70 bg-card/75 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t.actionCenter}</p>
              <h2 className="mt-1 font-heading text-xl font-bold">{t.dueSoon}</h2>
            </div>
            <button
              type="button"
              data-testid="view-commitments-button"
              onClick={() => onNavigate("commitments")}
              className="text-xs font-bold text-primary hover:underline"
            >
              {t.seeAll}
            </button>
          </div>
          <div className="mt-5 space-y-3">
            {upcoming.map((bill) => (
              <div key={bill.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/35 p-3">
                <div className="grid size-9 place-items-center rounded-lg bg-amber-500/12 text-amber-400">
                  <CalendarClock size={16} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{bill.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {shortDate(bill.nextDueDate, state.locale)} · {bill.remainingInstallments ? `${bill.remainingInstallments}x remaining` : bill.frequency}
                  </p>
                </div>
                <p className="font-data text-xs font-bold">
                  {formatMoney(toBase(bill.amount, bill.currency, state.exchangeRates), state.baseCurrency, state.locale, true)}
                </p>
              </div>
            ))}
            {upcoming.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">{t.noData}</p>}
          </div>
          <button
            type="button"
            data-testid="open-commitment-from-action-button"
            onClick={() => onNavigate("commitments")}
            className="mt-5 flex w-full items-center justify-between rounded-xl border border-dashed border-primary/35 px-3 py-3 text-left text-xs font-semibold text-primary hover:bg-primary/8"
          >
            <span className="flex items-center gap-2">
              <Plus size={15} /> {isId ? "Tambah Cicilan / Tagihan Baru" : "Add Bill / Installment"}
            </span>
            <ChevronRight size={15} />
          </button>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_1fr]">
        <Card className="border-border/70 bg-card/75 p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t.recent}</p>
              <h2 className="mt-1 font-heading text-xl font-bold">Your money trail</h2>
            </div>
            <button
              type="button"
              data-testid="view-transactions-button"
              onClick={() => onNavigate("transactions")}
              className="text-xs font-bold text-primary hover:underline"
            >
              {t.seeAll}
            </button>
          </div>
          <div className="space-y-1">
            {recent.map((item) => (
              <div key={item.id} className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-secondary/60">
                <div
                  className={`grid size-9 place-items-center rounded-lg ${
                    item.kind === "income" ? "bg-emerald-500/12 text-emerald-400" : "bg-red-500/12 text-red-400"
                  }`}
                >
                  {item.kind === "income" ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.description}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.category} · {accountName(item.accountId)} · {shortDate(item.date, state.locale)}
                  </p>
                </div>
                <p className={`font-data text-xs font-bold ${item.kind === "income" ? "text-emerald-400" : "text-foreground"}`}>
                  {item.kind === "income" ? "+" : "−"}
                  {formatMoney(item.baseAmount, state.baseCurrency, state.locale, true)}
                </p>
              </div>
            ))}
            {recent.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground" data-testid="recent-empty-state">
                {t.noData}
              </p>
            )}
          </div>
        </Card>

        <Card className="border-border/70 bg-card/75 p-5 sm:p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Allocation</p>
              <h2 className="mt-1 font-heading text-xl font-bold">Where it goes</h2>
            </div>
            <button
              type="button"
              data-testid="view-goals-button"
              onClick={() => onNavigate("goals")}
              className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary"
            >
              <MoreHorizontal size={18} />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="h-[150px] w-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryChart.length ? categoryChart : [{ category: "No data", current: 1 }]}
                    dataKey="current"
                    nameKey="category"
                    innerRadius={45}
                    outerRadius={68}
                    paddingAngle={3}
                  >
                    {(categoryChart.length ? categoryChart : [{ category: "No data", current: 1 }]).map((item, index) => (
                      <Cell key={item.category} fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#282828", border: "1px solid #3c3c3c", borderRadius: 12, fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              {categoryChart.slice(0, 4).map((item, index) => (
                <div key={item.category} className="flex items-center gap-2">
                  <span className="size-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }} />
                  <span className="min-w-0 flex-1 truncate text-xs font-medium">{item.category}</span>
                  <span className="font-data text-[10px] text-muted-foreground">{percent(item.current, currentSpend)}%</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}







function TransactionModal({ state, t, categories, form, setForm, onChange, onClose, onSubmit, editingTransaction }: { state: FinanceState; t: typeof copy.id; categories: string[]; form: { kind: TransactionKind; amount: string; description: string; category: string; accountId: string; currency: Currency; date: string; tags: string }; setForm: React.Dispatch<React.SetStateAction<{ kind: TransactionKind; amount: string; description: string; category: string; accountId: string; currency: Currency; date: string; tags: string }>>; onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void; onClose: () => void; onSubmit: (event: React.FormEvent) => void; editingTransaction?: Transaction | null }) {
  const isId = state.locale === "id";
  const title = editingTransaction
    ? (isId ? "Edit Transaksi" : "Edit Transaction")
    : t.addTransaction;
  const submitText = editingTransaction
    ? (isId ? "Simpan Perubahan" : "Save Changes")
    : t.save;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" data-testid="transaction-modal">
      <Card className="max-h-[92vh] w-full max-w-xl overflow-y-auto border-border bg-card p-5 shadow-2xl sm:p-7">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
              {editingTransaction ? (isId ? "Mode Edit" : "Edit Mode") : "Quick capture"}
            </p>
            <h2 className="font-heading text-2xl font-extrabold">{title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {isId ? "Data tersimpan ke database lokal & PostgreSQL." : "Validated locally, saved to database."}
            </p>
          </div>
          <button type="button" data-testid="transaction-modal-close-button" onClick={onClose} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-secondary">
            <X size={17} />
          </button>
        </div>
        <form onSubmit={onSubmit} data-testid="transaction-form" className="space-y-4">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary/60 p-1">
            <button type="button" data-testid="transaction-expense-toggle" onClick={() => setForm((value) => ({ ...value, kind: "expense" }))} className={`rounded-lg py-2 text-xs font-bold ${form.kind === "expense" ? "bg-card text-red-400 shadow-sm" : "text-muted-foreground"}`}>{t.expense}</button>
            <button type="button" data-testid="transaction-income-toggle" onClick={() => setForm((value) => ({ ...value, kind: "income" }))} className={`rounded-lg py-2 text-xs font-bold ${form.kind === "income" ? "bg-card text-emerald-400 shadow-sm" : "text-muted-foreground"}`}>{t.incomeType}</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-xs font-semibold text-muted-foreground">{t.amount} *</span>
              <div className="flex gap-2">
                <input data-testid="transaction-amount-input" required min="1" type="number" name="amount" value={form.amount} onChange={onChange} placeholder="0" className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 font-data text-sm outline-none focus:border-primary" />
                <select data-testid="transaction-currency-select" name="currency" value={form.currency} onChange={onChange} className="h-11 rounded-lg border border-border bg-background px-3 text-xs font-bold">{CURRENCIES.map((currency) => <option key={currency}>{currency}</option>)}</select>
              </div>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-xs font-semibold text-muted-foreground">{t.description} *</span>
              <input data-testid="transaction-description-input" required name="description" value={form.description} onChange={onChange} placeholder="Contoh: makan siang, gaji, PLN token" className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-muted-foreground">{t.category}</span>
              <select data-testid="transaction-category-select" name="category" value={form.category} onChange={onChange} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-xs font-semibold">{categories.map((category) => <option key={category}>{category}</option>)}</select>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-muted-foreground">{t.account}</span>
              <select data-testid="transaction-account-select" name="accountId" value={form.accountId} onChange={onChange} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-xs font-semibold">{state.accounts.map((account: Account) => <option key={account.id} value={account.id}>{account.name}</option>)}</select>
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-muted-foreground">{t.date}</span>
              <input data-testid="transaction-date-input" required type="date" name="date" value={form.date} onChange={onChange} className="h-11 w-full rounded-lg border border-border bg-background px-3 text-xs" />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-semibold text-muted-foreground">{t.tags}</span>
              <input data-testid="transaction-tags-input" name="tags" value={form.tags} onChange={onChange} placeholder="home, fixed" className="h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary" />
            </label>
          </div>
          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <Button data-testid="transaction-cancel-button" type="button" variant="ghost" onClick={onClose}>{t.cancel}</Button>
            <Button data-testid="transaction-submit-button" type="submit" className="gap-2"><Check size={16} />{submitText}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
