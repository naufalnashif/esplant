import { ArrowDownLeft, ArrowUpRight, ListFilter, Plus, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Account, FinanceState, Transaction } from "@/lib/localDb";

interface TransactionLabels {
  all: string;
  type: string;
  expense: string;
  incomeType: string;
  category: string;
  account: string;
  newest: string;
  largest: string;
  search: string;
  noData: string;
  addTransaction: string;
}

interface FilterState {
  search: string;
  kind: string;
  category: string;
  account: string;
  sort: string;
}

const shortDate = (date: string, locale: FinanceState["locale"]) => new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", { day: "2-digit", month: "short" }).format(new Date(`${date}T00:00:00`));
const formatMoney = (value: number, currency: FinanceState["baseCurrency"], locale: FinanceState["locale"]) => new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-US", { style: "currency", currency, maximumFractionDigits: currency === "IDR" ? 0 : 2 }).format(value);

export function TransactionsPanel({ state, labels, categories, filteredTransactions, filter, setFilter, accountName, onAdd }: { state: FinanceState; labels: TransactionLabels; categories: string[]; filteredTransactions: Transaction[]; filter: FilterState; setFilter: React.Dispatch<React.SetStateAction<FilterState>>; accountName: (accountId: string) => string; onAdd: () => void }) {
  const options = (values: string[]) => values.map((value) => { const account = state.accounts.find((item) => item.name === value); return <option key={value} value={account?.id ?? value} label={value} />; });
  return <div className="animate-rise-in"><div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Money trail / 02</p><h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">Transactions</h1><p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Satu ledger yang mudah dicari, difilter, dan dipahami.</p></div><Button data-testid="transactions-add-button" onClick={onAdd} className="gap-2"><Plus size={17} />{labels.addTransaction}</Button></div><div className="mb-5 rounded-2xl border border-border/70 bg-card/75 p-4 backdrop-blur-xl sm:p-5"><div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto]"><label className="relative block"><Search size={15} className="absolute left-3 top-3 text-muted-foreground" /><input data-testid="transaction-search-input" value={filter.search} onChange={(event) => setFilter((value) => ({ ...value, search: event.target.value }))} placeholder={labels.search} className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary" /></label><select data-testid="transaction-kind-filter" value={filter.kind} onChange={(event) => setFilter((value) => ({ ...value, kind: event.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-xs font-semibold outline-none focus:border-primary">{options([`${labels.all} · ${labels.type}`, labels.expense, labels.incomeType])}</select><select data-testid="transaction-category-filter" value={filter.category} onChange={(event) => setFilter((value) => ({ ...value, category: event.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-xs font-semibold outline-none focus:border-primary">{options([`${labels.all} · ${labels.category}`, ...categories])}</select><select data-testid="transaction-account-filter" value={filter.account} onChange={(event) => setFilter((value) => ({ ...value, account: event.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-xs font-semibold outline-none focus:border-primary">{options([`${labels.all} · ${labels.account}`, ...state.accounts.map((account: Account) => account.name)])}</select><select data-testid="transaction-sort-filter" value={filter.sort} onChange={(event) => setFilter((value) => ({ ...value, sort: event.target.value }))} className="h-10 rounded-lg border border-border bg-background px-3 text-xs font-semibold outline-none focus:border-primary">{options([labels.newest, labels.largest])}</select></div><div className="mt-4 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground"><ListFilter size={14} /> {filteredTransactions.length} transactions shown · IndexedDB local</div></div><div className="overflow-hidden rounded-2xl border border-border/70 bg-card/75"><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead className="border-b border-border/70 bg-secondary/35 text-[10px] uppercase tracking-widest text-muted-foreground"><tr><th className="px-5 py-4">Date</th><th className="px-5 py-4">Description</th><th className="px-5 py-4">Category</th><th className="px-5 py-4">Account</th><th className="px-5 py-4 text-right">Amount</th></tr></thead><tbody className="divide-y divide-border/50">{filteredTransactions.map((item) => <tr key={item.id} data-testid={`transaction-row-${item.id}`} className="group hover:bg-secondary/30"><td className="px-5 py-4 text-xs text-muted-foreground">{shortDate(item.date, state.locale)}</td><td className="px-5 py-4"><div className="flex items-center gap-3"><div className={`grid size-8 place-items-center rounded-lg ${item.kind === "income" ? "bg-emerald-500/12 text-emerald-400" : "bg-rose-500/12 text-rose-400"}`}>{item.kind === "income" ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}</div><div><p className="text-sm font-semibold">{item.description}</p><p className="text-[10px] text-muted-foreground">{item.tags.join(" · ") || "untagged"}</p></div></div></td><td className="px-5 py-4"><Badge variant="outline">{item.category}</Badge></td><td className="px-5 py-4 text-xs text-muted-foreground">{accountName(item.accountId)}</td><td className={`px-5 py-4 text-right font-data text-xs font-bold ${item.kind === "income" ? "text-emerald-400" : ""}`}>{item.kind === "income" ? "+" : "−"}{formatMoney(item.baseAmount, state.baseCurrency, state.locale)}</td></tr>)}{filteredTransactions.length === 0 && <tr><td colSpan={5} className="px-5 py-14 text-center text-sm text-muted-foreground">{labels.noData}</td></tr>}</tbody></table></div></div></div>;
}