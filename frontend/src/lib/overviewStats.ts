import { useMemo, useState } from "react";
import type { Currency, FinanceState, Transaction } from "@/lib/localDb";

export type PeriodKey = "today" | "week" | "month" | "year" | "all";
export interface PeriodStats { income: number; expense: number; net: number; count: number }

export const CATEGORY_COLORS = ["#ffa116", "#60a5fa", "#2cbb5d", "#ef4743", "#a78bfa", "#22d3ee"];
export const toBase = (amount: number, currency: Currency, rates: FinanceState["exchangeRates"]) => amount * rates[currency];

const monthKey = (date: string) => date.slice(0, 7);
const previousMonth = (month: string) => {
  const date = new Date(`${month}-01T00:00:00`);
  date.setMonth(date.getMonth() - 1);
  return date.toISOString().slice(0, 7);
};
// Week bounds (Monday to Sunday)
const getWeekBounds = (dateStr: string) => {
  const d = new Date(`${dateStr}T00:00:00`);
  const day = d.getDay();
  const diffToMon = d.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(d.setDate(diffToMon));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: monday.toISOString().slice(0, 10), end: sunday.toISOString().slice(0, 10) };
};

/** Period filter + derived stats shared by the desktop and mobile overview layouts. */
export function useOverviewStats(state: FinanceState, currentMonth: string, currentIncome: number) {
  const isId = state.locale === "id";
  const [periodFilter, setPeriodFilter] = useState<PeriodKey>("month");
  const displayRate = state.exchangeRates[state.baseCurrency] || 1;
  const todayIso = new Date().toISOString().slice(0, 10);
  const monthIso = todayIso.slice(0, 7);
  const yearIso = todayIso.slice(0, 4);
  const weekBounds = useMemo(() => getWeekBounds(todayIso), [todayIso]);

  const activeBills = useMemo(
    () => state.bills.filter((b) => b.active !== false && (b.remainingInstallments === undefined || b.remainingInstallments > 0)),
    [state.bills],
  );
  const filteredBillsByPeriod = useMemo(() => activeBills.filter((bill) => {
    if (periodFilter === "all") return true;
    if (periodFilter === "today") return bill.nextDueDate === todayIso;
    if (periodFilter === "week") return bill.nextDueDate >= weekBounds.start && bill.nextDueDate <= weekBounds.end;
    if (periodFilter === "month") return bill.nextDueDate.slice(0, 7) === monthIso;
    if (periodFilter === "year") return bill.nextDueDate.slice(0, 4) === yearIso;
    return true;
  }), [activeBills, periodFilter, todayIso, weekBounds, monthIso, yearIso]);
  const upcoming = useMemo(
    () => [...filteredBillsByPeriod].sort((a, b) => a.nextDueDate.localeCompare(b.nextDueDate)).slice(0, 4),
    [filteredBillsByPeriod],
  );
  const periodCommitted = useMemo(
    () => filteredBillsByPeriod.reduce((sum, bill) => sum + toBase(bill.amount, bill.currency, state.exchangeRates), 0) / displayRate,
    [filteredBillsByPeriod, state.exchangeRates, displayRate],
  );

  const monthOptions = useMemo(() => {
    const options = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = d.toISOString().slice(0, 7);
      const label = new Intl.DateTimeFormat(state.locale === "id" ? "id-ID" : "en-US", { month: "long", year: "numeric" }).format(d);
      options.push({ value, label });
    }
    return options;
  }, [state.locale]);

  const periodStats = useMemo(() => {
    const calcStats = (txs: Transaction[]): PeriodStats => {
      const income = txs.filter((t) => t.kind === "income").reduce((s, t) => s + t.baseAmount, 0) / displayRate;
      const expense = txs.filter((t) => t.kind === "expense").reduce((s, t) => s + t.baseAmount, 0) / displayRate;
      return { income, expense, net: income - expense, count: txs.length };
    };
    return {
      today: calcStats(state.transactions.filter((t) => t.date === todayIso)),
      week: calcStats(state.transactions.filter((t) => t.date >= weekBounds.start && t.date <= weekBounds.end)),
      month: calcStats(state.transactions.filter((t) => t.date.slice(0, 7) === monthIso)),
      year: calcStats(state.transactions.filter((t) => t.date.slice(0, 4) === yearIso)),
      all: calcStats(state.transactions),
    } satisfies Record<PeriodKey, PeriodStats>;
  }, [state.transactions, todayIso, weekBounds, monthIso, yearIso, displayRate]);
  const activeStats = periodStats[periodFilter];

  const periodLabels: Record<PeriodKey, string> = {
    today: isId ? "Hari ini" : "Today",
    week: isId ? "Minggu ini" : "This Week",
    month: isId ? "Bulan ini" : "This Month",
    year: isId ? "Tahun ini" : "This Year",
    all: isId ? "Semua Waktu" : "All Time",
  };

  const previousIncome = state.transactions.filter((item) => monthKey(item.date) === previousMonth(currentMonth) && item.kind === "income").reduce((sum, item) => sum + item.baseAmount, 0) / displayRate;
  const incomeDelta = previousIncome ? Math.round(((currentIncome - previousIncome) / previousIncome) * 100) : 0;

  return { isId, periodFilter, setPeriodFilter, displayRate, upcoming, periodCommitted, monthOptions, periodStats, activeStats, periodLabels, incomeDelta };
}
