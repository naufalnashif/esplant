import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, ChevronDown, ListFilter, Pencil, Plus, Search, SlidersHorizontal, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/Pagination";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { FinanceState, Transaction } from "@/lib/localDb";
import type * as React from "react";

interface TransactionLabels { all: string; type: string; expense: string; incomeType: string; category: string; account: string; newest: string; largest: string; search: string; noData: string; addTransaction: string; }
interface FilterState { search: string; kind: string; category: string; account: string; sort: string; }
const shortDate = (date: string, locale: FinanceState["locale"]) => new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", { day: "2-digit", month: "short" }).format(new Date(`${date}T00:00:00`));
const formatMoney = (value: number, state: FinanceState) => new Intl.NumberFormat(state.locale === "id" ? "id-ID" : "en-US", { style: "currency", currency: state.baseCurrency, maximumFractionDigits: state.baseCurrency === "IDR" ? 0 : 2 }).format(value / (state.exchangeRates[state.baseCurrency] || 1));
const MOBILE_PREVIEW = 8;

export function TransactionsPanel({ state, labels, categories, filteredTransactions, filter, setFilter, accountName, onAdd, onEdit, onDelete }: { state: FinanceState; labels: TransactionLabels; categories: string[]; filteredTransactions: Transaction[]; filter: FilterState; setFilter: React.Dispatch<React.SetStateAction<FilterState>>; accountName: (accountId: string) => string; onAdd: () => void; onEdit: (transaction: Transaction) => void; onDelete: (transaction: Transaction) => void }) {
  const isId = state.locale === "id";
  const isMobile = useIsMobile();
  const [showFilters, setShowFilters] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const total = filteredTransactions.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  // Any filter/sort change (or a shrinking result set) must not leave us on a dead page.
  const filterKey = `${filter.search}|${filter.kind}|${filter.category}|${filter.account}|${filter.sort}`;
  useEffect(() => {
    setPage(1);
    setShowAll(false);
  }, [filterKey]);
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const mobileItems = showAll ? filteredTransactions : filteredTransactions.slice(0, MOBILE_PREVIEW);
  const hiddenCount = total - mobileItems.length;
  const pagedItems = useMemo(
    () => filteredTransactions.slice((page - 1) * pageSize, page * pageSize),
    [filteredTransactions, page, pageSize],
  );

  const activeFilterCount = [filter.kind, filter.category, filter.account].filter((value) => value !== "all").length + (filter.sort !== "newest" ? 1 : 0);
  const selectClass = "h-10 min-w-0 rounded-lg border border-border bg-background px-3 text-xs font-semibold";

  return <div className="animate-rise-in">
    <div className="mb-5 flex flex-col justify-between gap-4 sm:mb-6 sm:flex-row sm:items-end">
      <div><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Money trail / 02</p><h1 className="font-heading text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl">Transactions</h1><p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:mt-2">Satu ledger yang mudah dicari, difilter, dan dikelola.</p></div>
      <Button data-testid="transactions-add-button" onClick={onAdd} className="hidden gap-2 md:inline-flex"><Plus size={17} />{labels.addTransaction}</Button>
    </div>

    <div className="mb-4 rounded-2xl border border-border/70 bg-card/75 p-3 backdrop-blur-xl sm:mb-5 sm:p-5">
      <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
        <div className="flex gap-2 md:contents">
          <label className="relative block min-w-0 flex-1"><Search size={15} className="absolute left-3 top-3 text-muted-foreground" /><input data-testid="transaction-search-input" value={filter.search} onChange={(event) => setFilter((value) => ({ ...value, search: event.target.value }))} placeholder={labels.search} className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary" /></label>
          <button type="button" data-testid="transaction-filter-toggle" aria-expanded={showFilters} aria-label="Filter" onClick={() => setShowFilters((value) => !value)} className={`relative grid size-10 shrink-0 place-items-center rounded-lg border bg-background md:hidden ${showFilters || activeFilterCount ? "border-primary text-primary" : "border-border text-muted-foreground"}`}>
            <SlidersHorizontal size={16} />
            {activeFilterCount > 0 && <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-primary font-data text-[9px] font-bold text-primary-foreground" data-testid="transaction-filter-count">{activeFilterCount}</span>}
          </button>
        </div>
        <div className={`${showFilters ? "grid" : "hidden"} grid-cols-2 gap-2 md:contents`} data-testid="transaction-filter-group">
          <select data-testid="transaction-kind-filter" value={filter.kind} onChange={(event) => setFilter((value) => ({ ...value, kind: event.target.value }))} className={selectClass}>
            <option value="all">{`${labels.all} · ${labels.type}`}</option>
            <option value="expense">{labels.expense}</option>
            <option value="income">{labels.incomeType}</option>
          </select>
          <select data-testid="transaction-category-filter" value={filter.category} onChange={(event) => setFilter((value) => ({ ...value, category: event.target.value }))} className={selectClass}>
            <option value="all">{`${labels.all} · ${labels.category}`}</option>
            {categories.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
          <select data-testid="transaction-account-filter" value={filter.account} onChange={(event) => setFilter((value) => ({ ...value, account: event.target.value }))} className={selectClass}>
            <option value="all">{`${labels.all} · ${labels.account}`}</option>
            {state.accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
          </select>
          <select data-testid="transaction-sort-filter" value={filter.sort} onChange={(event) => setFilter((value) => ({ ...value, sort: event.target.value }))} className={selectClass}>
            <option value="newest">{labels.newest}</option>
            <option value="largest">{labels.largest}</option>
          </select>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-muted-foreground">
        <ListFilter size={14} />
        <span data-testid="transactions-result-count">{total} {isId ? "transaksi" : "transactions"}</span>
        {activeFilterCount > 0 && (
          <button
            type="button"
            data-testid="transaction-reset-filters"
            onClick={() => setFilter((value) => ({ ...value, kind: "all", category: "all", account: "all", sort: "newest" }))}
            className="font-bold text-primary hover:underline"
          >
            {isId ? "Reset filter" : "Reset filters"}
          </button>
        )}
      </div>
    </div>

    {/* Mobile: compact, tap-to-expand card list (no horizontal scroll) */}
    {isMobile ? (
    <div className="space-y-2" data-testid="transactions-mobile-list">
      {mobileItems.map((item) => {
        const open = expandedId === item.id;
        return (
          <div key={item.id} data-testid={`transaction-card-${item.id}`} className="rounded-2xl border border-border/70 bg-card/75">
            <button type="button" data-testid={`transaction-card-toggle-${item.id}`} aria-expanded={open} onClick={() => setExpandedId(open ? null : item.id)} className="flex w-full items-center gap-3 p-3 text-left">
              <div className={`grid size-8 shrink-0 place-items-center rounded-lg ${item.kind === "income" ? "bg-emerald-500/12 text-emerald-400" : "bg-red-500/12 text-red-400"}`}>{item.kind === "income" ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold leading-tight">{item.description}</p>
                <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{shortDate(item.date, state.locale)} · {item.category}</p>
              </div>
              <p className={`shrink-0 font-data text-[13px] font-bold ${item.kind === "income" ? "text-emerald-400" : ""}`}>{item.kind === "income" ? "+" : "−"}{formatMoney(item.baseAmount, state)}</p>
              <ChevronDown size={14} className={`shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
            </button>
            {open && (
              <div className="flex items-center justify-between gap-3 border-t border-border/60 px-3 py-2.5" data-testid={`transaction-card-details-${item.id}`}>
                <div className="min-w-0 text-[11px] text-muted-foreground">
                  <p className="truncate"><span className="font-semibold text-foreground">{accountName(item.accountId)}</span> · {item.currency} {item.amount.toLocaleString(isId ? "id-ID" : "en-US")}</p>
                  <p className="mt-0.5 flex flex-wrap gap-1"><Badge variant="outline" className="text-[10px]">{item.category}</Badge>{item.tags.map((tag) => <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>)}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button type="button" data-testid={`transaction-card-edit-${item.id}-button`} onClick={() => onEdit(item)} className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary"><Pencil size={14} /></button>
                  <button type="button" data-testid={`transaction-card-delete-${item.id}-button`} onClick={() => onDelete(item)} className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-red-400/10 hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
            )}
          </div>
        );
      })}
      {hiddenCount > 0 && <button type="button" data-testid="transactions-show-all-button" onClick={() => setShowAll(true)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/35 text-xs font-bold text-primary">{isId ? `Lihat semua transaksi (${total})` : `Show all transactions (${total})`}</button>}
      {showAll && total > MOBILE_PREVIEW && <button type="button" data-testid="transactions-show-less-button" onClick={() => setShowAll(false)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border/70 text-xs font-bold text-muted-foreground">{isId ? "Tampilkan lebih sedikit" : "Show less"}</button>}
      {total === 0 && <div className="rounded-2xl border border-border/70 bg-card/75 px-5 py-14 text-center text-sm text-muted-foreground" data-testid="transactions-empty-state">{labels.noData}</div>}
    </div>
    ) : (
    /* Desktop/tablet: paginated table */
    <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/75">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left">
          <thead className="border-b border-border/70 bg-secondary/35 text-[10px] uppercase tracking-widest text-muted-foreground"><tr><th className="px-5 py-4">Date</th><th className="px-5 py-4">Description</th><th className="px-5 py-4">Category</th><th className="px-5 py-4">Account</th><th className="px-5 py-4 text-right">Amount</th><th className="px-5 py-4 text-right">Manage</th></tr></thead>
          <tbody className="divide-y divide-border/50">
            {pagedItems.map((item) => (
              <tr key={item.id} data-testid={`transaction-row-${item.id}`} className="group hover:bg-secondary/30">
                <td className="px-5 py-4 text-xs text-muted-foreground">{shortDate(item.date, state.locale)}</td>
                <td className="px-5 py-4"><div className="flex items-center gap-3"><div className={`grid size-8 place-items-center rounded-lg ${item.kind === "income" ? "bg-emerald-500/12 text-emerald-400" : "bg-red-500/12 text-red-400"}`}>{item.kind === "income" ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}</div><div><p className="text-sm font-semibold">{item.description}</p><p className="text-[10px] text-muted-foreground">{item.tags.join(" · ") || "untagged"}</p></div></div></td>
                <td className="px-5 py-4"><Badge variant="outline">{item.category}</Badge></td>
                <td className="px-5 py-4 text-xs text-muted-foreground">{accountName(item.accountId)}</td>
                <td className={`px-5 py-4 text-right font-data text-xs font-bold ${item.kind === "income" ? "text-emerald-400" : ""}`}>{item.kind === "income" ? "+" : "−"}{formatMoney(item.baseAmount, state)}</td>
                <td className="px-5 py-4"><div className="flex justify-end gap-1"><button type="button" data-testid={`transaction-edit-${item.id}-button`} onClick={() => onEdit(item)} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary"><Pencil size={13} /></button><button type="button" data-testid={`transaction-delete-${item.id}-button`} onClick={() => onDelete(item)} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-red-400/10 hover:text-red-400"><Trash2 size={13} /></button></div></td>
              </tr>
            ))}
            {total === 0 && <tr><td colSpan={6} className="px-5 py-14 text-center text-sm text-muted-foreground" data-testid="transactions-empty-state">{labels.noData}</td></tr>}
          </tbody>
        </table>
      </div>
      {total > 0 && (
        <Pagination
          page={page}
          pageCount={pageCount}
          total={total}
          pageSize={pageSize}
          onPage={setPage}
          onPageSize={(size) => { setPageSize(size); setPage(1); }}
          locale={state.locale}
          testid="transactions-pagination"
        />
      )}
    </div>
    )}
  </div>;
}
