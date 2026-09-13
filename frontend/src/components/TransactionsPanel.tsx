import { useState, useEffect } from "react";
import {
  ArrowDownLeft, ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight,
  ListFilter, Pencil, Plus, Search, SlidersHorizontal, Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FinanceState, Transaction } from "@/lib/localDb";
import type * as React from "react";

interface TransactionLabels {
  all: string; type: string; expense: string; incomeType: string;
  category: string; account: string; newest: string; largest: string;
  search: string; noData: string; addTransaction: string;
}
interface FilterState { search: string; kind: string; category: string; account: string; sort: string; }

const shortDate = (date: string, locale: FinanceState["locale"]) =>
  new Intl.DateTimeFormat(locale === "id" ? "id-ID" : "en-US", { day: "2-digit", month: "short" }).format(new Date(`${date}T00:00:00`));
const formatMoney = (value: number, state: FinanceState) =>
  new Intl.NumberFormat(state.locale === "id" ? "id-ID" : "en-US", {
    style: "currency", currency: state.baseCurrency,
    maximumFractionDigits: state.baseCurrency === "IDR" ? 0 : 2,
  }).format(value / (state.exchangeRates[state.baseCurrency] || 1));

const MOBILE_PREVIEW = 8;
const MAX_PAGES = 10;
const PAGE_SIZE_OPTIONS = [5, 7, 10, 15, 20];

export function TransactionsPanel({
  state, labels, categories, filteredTransactions, filter, setFilter,
  accountName, onAdd, onEdit, onDelete,
}: {
  state: FinanceState;
  labels: TransactionLabels;
  categories: string[];
  filteredTransactions: Transaction[];
  filter: FilterState;
  setFilter: React.Dispatch<React.SetStateAction<FilterState>>;
  accountName: (accountId: string) => string;
  onAdd: () => void;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}) {
  const isId = state.locale === "id";
  const [showFilters, setShowFilters] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Desktop pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(7);

  // Reset to page 1 whenever filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter.search, filter.kind, filter.category, filter.account, filter.sort]);

  const mobileItems = showAll ? filteredTransactions : filteredTransactions.slice(0, MOBILE_PREVIEW);
  const hiddenCount = filteredTransactions.length - mobileItems.length;
  const activeFilterCount =
    [filter.kind, filter.category, filter.account].filter((v) => v !== "all").length +
    (filter.sort !== "newest" ? 1 : 0);

  // Desktop pagination calculations
  const totalPages = Math.min(MAX_PAGES, Math.ceil(filteredTransactions.length / pageSize));
  const safePage = Math.min(currentPage, Math.max(1, totalPages));
  const pageStart = (safePage - 1) * pageSize;
  const pageEnd = Math.min(pageStart + pageSize, filteredTransactions.length);
  // Clamp to max 10 pages worth of transactions
  const maxVisibleTotal = MAX_PAGES * pageSize;
  const desktopItems = filteredTransactions.slice(pageStart, pageEnd);

  const goTo = (page: number) => setCurrentPage(Math.max(1, Math.min(page, totalPages)));

  const options = (items: { value: string; label: string }[]) =>
    items.map((item) => <option key={item.value} value={item.value}>{item.label}</option>);
  const selectClass = "h-10 min-w-0 rounded-lg border border-border bg-background px-3 text-xs font-semibold";

  // Build page number array (show max 5 buttons)
  const pageNumbers = (() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (safePage <= 3) return [1, 2, 3, 4, 5];
    if (safePage >= totalPages - 2) return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [safePage - 2, safePage - 1, safePage, safePage + 1, safePage + 2];
  })();

  return (
    <div className="animate-rise-in">
      <div className="mb-5 flex flex-col justify-between gap-4 sm:mb-6 sm:flex-row sm:items-end">
        <div>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">Money trail / 02</p>
          <h1 className="font-heading text-2xl font-extrabold tracking-tight sm:text-3xl md:text-4xl">Transactions</h1>
          <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:mt-2">
            Satu ledger yang mudah dicari, difilter, dan dikelola.
          </p>
        </div>
        <Button data-testid="transactions-add-button" onClick={onAdd} className="hidden gap-2 md:inline-flex">
          <Plus size={17} />{labels.addTransaction}
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="mb-4 rounded-2xl border border-border/70 bg-card/75 p-3 backdrop-blur-xl sm:mb-5 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_1fr_auto]">
          <div className="flex gap-2 md:contents">
            <label className="relative block min-w-0 flex-1">
              <Search size={15} className="absolute left-3 top-3 text-muted-foreground" />
              <input
                data-testid="transaction-search-input"
                value={filter.search}
                onChange={(event) => setFilter((v) => ({ ...v, search: event.target.value }))}
                placeholder={labels.search}
                className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </label>
            <button
              type="button"
              data-testid="transaction-filter-toggle"
              aria-expanded={showFilters}
              aria-label="Filter"
              onClick={() => setShowFilters((v) => !v)}
              className={`relative grid size-10 shrink-0 place-items-center rounded-lg border bg-background md:hidden ${showFilters || activeFilterCount ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
            >
              <SlidersHorizontal size={16} />
              {activeFilterCount > 0 && (
                <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-primary font-data text-[9px] font-bold text-primary-foreground" data-testid="transaction-filter-count">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
          <div className={`${showFilters ? "grid" : "hidden"} grid-cols-2 gap-2 md:contents`} data-testid="transaction-filter-group">
            <select data-testid="transaction-kind-filter" value={filter.kind} onChange={(e) => setFilter((v) => ({ ...v, kind: e.target.value }))} className={selectClass}>
              {options([{ value: "all", label: `${labels.all} · ${labels.type}` }, { value: "expense", label: labels.expense }, { value: "income", label: labels.incomeType }])}
            </select>
            <select data-testid="transaction-category-filter" value={filter.category} onChange={(e) => setFilter((v) => ({ ...v, category: e.target.value }))} className={selectClass}>
              {options([{ value: "all", label: `${labels.all} · ${labels.category}` }, ...categories.map((c) => ({ value: c, label: c }))])}
            </select>
            <select data-testid="transaction-account-filter" value={filter.account} onChange={(e) => setFilter((v) => ({ ...v, account: e.target.value }))} className={selectClass}>
              {options([{ value: "all", label: `${labels.all} · ${labels.account}` }, ...state.accounts.map((a) => ({ value: a.id, label: a.name }))])}
            </select>
            <select data-testid="transaction-sort-filter" value={filter.sort} onChange={(e) => setFilter((v) => ({ ...v, sort: e.target.value }))} className={selectClass}>
              {options([{ value: "newest", label: labels.newest }, { value: "largest", label: labels.largest }])}
            </select>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-[11px] font-semibold text-muted-foreground">
          <ListFilter size={14} />
          {filteredTransactions.length} transactions
          {filteredTransactions.length > maxVisibleTotal && (
            <span className="text-amber-400">
              · {isId ? `Menampilkan ${maxVisibleTotal} terbaru (maks. ${MAX_PAGES} halaman)` : `Showing latest ${maxVisibleTotal} (max ${MAX_PAGES} pages)`}
            </span>
          )}
          · IndexedDB local
        </div>
      </div>

      {/* Mobile: compact card list */}
      <div className="space-y-2 md:hidden" data-testid="transactions-mobile-list">
        {mobileItems.map((item) => {
          const open = expandedId === item.id;
          return (
            <div key={item.id} data-testid={`transaction-card-${item.id}`} className="rounded-2xl border border-border/70 bg-card/75">
              <button type="button" data-testid={`transaction-card-toggle-${item.id}`} aria-expanded={open} onClick={() => setExpandedId(open ? null : item.id)} className="flex w-full items-center gap-3 p-3 text-left">
                <div className={`grid size-8 shrink-0 place-items-center rounded-lg ${item.kind === "income" ? "bg-emerald-500/12 text-emerald-400" : "bg-red-500/12 text-red-400"}`}>
                  {item.kind === "income" ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold leading-tight">{item.description}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{shortDate(item.date, state.locale)} · {item.category}</p>
                </div>
                <p className={`shrink-0 font-data text-[13px] font-bold ${item.kind === "income" ? "text-emerald-400" : ""}`}>
                  {item.kind === "income" ? "+" : "−"}{formatMoney(item.baseAmount, state)}
                </p>
                <ChevronDown size={14} className={`shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
              </button>
              {open && (
                <div className="flex items-center justify-between gap-3 border-t border-border/60 px-3 py-2.5" data-testid={`transaction-card-details-${item.id}`}>
                  <div className="min-w-0 text-[11px] text-muted-foreground">
                    <p className="truncate"><span className="font-semibold text-foreground">{accountName(item.accountId)}</span> · {item.currency} {item.amount.toLocaleString(isId ? "id-ID" : "en-US")}</p>
                    <p className="mt-0.5 flex flex-wrap gap-1">
                      <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                      {item.tags.map((tag) => <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>)}
                    </p>
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
        {hiddenCount > 0 && (
          <button type="button" data-testid="transactions-show-all-button" onClick={() => setShowAll(true)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/35 text-xs font-bold text-primary">
            {isId ? `Lihat semua transaksi (${filteredTransactions.length})` : `Show all transactions (${filteredTransactions.length})`}
          </button>
        )}
        {showAll && filteredTransactions.length > MOBILE_PREVIEW && (
          <button type="button" data-testid="transactions-show-less-button" onClick={() => setShowAll(false)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-border/70 text-xs font-bold text-muted-foreground">
            {isId ? "Tampilkan lebih sedikit" : "Show less"}
          </button>
        )}
        {filteredTransactions.length === 0 && (
          <div className="rounded-2xl border border-border/70 bg-card/75 px-5 py-14 text-center text-sm text-muted-foreground">{labels.noData}</div>
        )}
      </div>

      {/* Desktop/tablet: paginated table */}
      <div className="hidden md:block">
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/75">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead className="border-b border-border/70 bg-secondary/35 text-[10px] uppercase tracking-widest text-muted-foreground">
                <tr>
                  <th className="px-5 py-4">Date</th>
                  <th className="px-5 py-4">Description</th>
                  <th className="px-5 py-4">Category</th>
                  <th className="px-5 py-4">Account</th>
                  <th className="px-5 py-4 text-right">Amount</th>
                  <th className="px-5 py-4 text-right">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {desktopItems.map((item) => (
                  <tr key={item.id} data-testid={`transaction-row-${item.id}`} className="group hover:bg-secondary/30">
                    <td className="px-5 py-4 text-xs text-muted-foreground">{shortDate(item.date, state.locale)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`grid size-8 place-items-center rounded-lg ${item.kind === "income" ? "bg-emerald-500/12 text-emerald-400" : "bg-red-500/12 text-red-400"}`}>
                          {item.kind === "income" ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{item.description}</p>
                          <p className="text-[10px] text-muted-foreground">{item.tags.join(" · ") || "untagged"}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4"><Badge variant="outline">{item.category}</Badge></td>
                    <td className="px-5 py-4 text-xs text-muted-foreground">{accountName(item.accountId)}</td>
                    <td className={`px-5 py-4 text-right font-data text-xs font-bold ${item.kind === "income" ? "text-emerald-400" : ""}`}>
                      {item.kind === "income" ? "+" : "−"}{formatMoney(item.baseAmount, state)}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-1">
                        <button type="button" data-testid={`transaction-edit-${item.id}-button`} onClick={() => onEdit(item)} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary"><Pencil size={13} /></button>
                        <button type="button" data-testid={`transaction-delete-${item.id}-button`} onClick={() => onDelete(item)} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-red-400/10 hover:text-red-400"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-14 text-center text-sm text-muted-foreground">{labels.noData}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination controls */}
        {filteredTransactions.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/50 px-4 py-2.5">
            {/* Left: info & page size */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>
                {isId
                  ? `Menampilkan ${pageStart + 1}–${pageEnd} dari ${Math.min(filteredTransactions.length, maxVisibleTotal)} transaksi`
                  : `Showing ${pageStart + 1}–${pageEnd} of ${Math.min(filteredTransactions.length, maxVisibleTotal)} transactions`}
              </span>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-muted-foreground">{isId ? "Per halaman:" : "Per page:"}</span>
                <select
                  data-testid="transactions-page-size-select"
                  value={pageSize}
                  onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
                  className="h-7 rounded-md border border-border bg-background px-2 text-[11px] font-semibold outline-none focus:border-primary cursor-pointer"
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Right: pagination buttons */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1" data-testid="transactions-pagination">
                <button
                  type="button"
                  data-testid="transactions-prev-page"
                  onClick={() => goTo(safePage - 1)}
                  disabled={safePage === 1}
                  className="grid size-8 place-items-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={15} />
                </button>

                {pageNumbers[0] > 1 && (
                  <>
                    <button type="button" onClick={() => goTo(1)} className="grid size-8 place-items-center rounded-lg border border-border bg-background text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary">1</button>
                    {pageNumbers[0] > 2 && <span className="px-1 text-xs text-muted-foreground">…</span>}
                  </>
                )}

                {pageNumbers.map((num) => (
                  <button
                    key={num}
                    type="button"
                    data-testid={`transactions-page-${num}`}
                    onClick={() => goTo(num)}
                    className={`grid size-8 place-items-center rounded-lg border text-xs font-bold transition-colors ${
                      num === safePage
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground hover:border-primary hover:text-primary"
                    }`}
                  >
                    {num}
                  </button>
                ))}

                {pageNumbers[pageNumbers.length - 1] < totalPages && (
                  <>
                    {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && <span className="px-1 text-xs text-muted-foreground">…</span>}
                    <button type="button" onClick={() => goTo(totalPages)} className="grid size-8 place-items-center rounded-lg border border-border bg-background text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary">{totalPages}</button>
                  </>
                )}

                <button
                  type="button"
                  data-testid="transactions-next-page"
                  onClick={() => goTo(safePage + 1)}
                  disabled={safePage === totalPages}
                  className="grid size-8 place-items-center rounded-lg border border-border bg-background text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
