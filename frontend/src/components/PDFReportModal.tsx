import { useState } from "react";
import { FileText, Printer, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/formatters";
import type { FinanceState } from "@/lib/localDb";

type ReportPeriod = "today" | "week" | "month" | "year" | "all";

export function PDFReportModal({
  state,
  onClose,
}: {
  state: FinanceState;
  onClose: () => void;
}) {
  const isId = state.locale === "id";
  const [period, setPeriod] = useState<ReportPeriod>("month");

  const periodLabels: Record<ReportPeriod, string> = {
    today: isId ? "Hari Ini" : "Today",
    week: isId ? "Minggu Ini" : "This Week",
    month: isId ? "Bulan Ini" : "This Month",
    year: isId ? "Tahun Ini" : "This Year",
    all: isId ? "Semua Waktu" : "All Time",
  };

  const todayStr = new Date().toISOString().slice(0, 10);
  const now = new Date();

  const filteredTransactions = state.transactions.filter((tx) => {
    if (period === "all") return true;
    if (period === "today") return tx.date === todayStr;

    const txDate = new Date(`${tx.date}T00:00:00`);
    if (period === "week") {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      return txDate >= startOfWeek;
    }
    if (period === "month") {
      return tx.date.slice(0, 7) === todayStr.slice(0, 7);
    }
    if (period === "year") {
      return tx.date.slice(0, 4) === todayStr.slice(0, 4);
    }
    return true;
  });

  const totalIncome = filteredTransactions
    .filter((tx) => tx.kind === "income")
    .reduce((sum, tx) => sum + tx.baseAmount, 0);

  const totalExpense = filteredTransactions
    .filter((tx) => tx.kind === "expense")
    .reduce((sum, tx) => sum + tx.baseAmount, 0);

  const netFlow = totalIncome - totalExpense;

  const categoryBreakdown = Array.from(
    new Set(filteredTransactions.map((tx) => tx.category))
  ).map((cat) => {
    const items = filteredTransactions.filter((tx) => tx.category === cat);
    const expense = items
      .filter((tx) => tx.kind === "expense")
      .reduce((sum, tx) => sum + tx.baseAmount, 0);
    const income = items
      .filter((tx) => tx.kind === "income")
      .reduce((sum, tx) => sum + tx.baseAmount, 0);
    return {
      category: cat,
      count: items.length,
      expense,
      income,
      percentage: totalExpense ? Math.round((expense / totalExpense) * 100) : 0,
    };
  }).sort((a, b) => b.expense - a.expense);

  const accountName = (id: string) =>
    state.accounts.find((acc) => acc.id === id)?.name || id;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/80 p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      data-testid="pdf-report-modal"
    >
      <Card className="my-8 w-full max-w-3xl overflow-hidden border-border bg-card shadow-2xl">
        {/* Controls Bar (Not Printed) */}
        <div className="print-hide flex flex-wrap items-center justify-between gap-3 border-b border-border bg-secondary/40 p-4 sm:p-5">
          <div>
            <div className="flex items-center gap-2">
              <FileText size={18} className="text-primary" />
              <h2 className="font-heading text-lg font-extrabold">
                {isId ? "Preview Ringkasan Finansial PDF" : "Financial PDF Report Preview"}
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {isId
                ? "Pratinjau ringkasan siap cetak atau simpan ke PDF"
                : "Print-ready financial summary preview"}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              data-testid="trigger-print-pdf-button"
              onClick={handlePrint}
              className="gap-2 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
              size="sm"
            >
              <Printer size={15} />
              {isId ? "Cetak / Download PDF" : "Print / Download PDF"}
            </Button>
            <Button
              data-testid="close-pdf-modal-button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="size-8 rounded-lg"
            >
              <X size={16} />
            </Button>
          </div>
        </div>

        {/* Period Selector Tabs (Not Printed) */}
        <div className="print-hide flex items-center gap-1.5 border-b border-border/60 bg-background/50 px-5 py-3">
          <span className="mr-2 text-xs font-bold text-muted-foreground">
            {isId ? "Filter Periode:" : "Period:"}
          </span>
          {(["today", "week", "month", "year", "all"] as const).map((pKey) => (
            <button
              key={pKey}
              type="button"
              data-testid={`report-period-${pKey}`}
              onClick={() => setPeriod(pKey)}
              className={`rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                period === pKey
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary/60 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {periodLabels[pKey]}
            </button>
          ))}
        </div>

        {/* Printable PDF Surface */}
        <div
          data-testid="report-print-surface"
          className="print-area p-6 sm:p-8 space-y-6 text-foreground bg-card"
        >
          {/* PDF Header */}
          <div className="flex items-start justify-between border-b border-border/80 pb-5">
            <div>
              <p className="text-[11px] font-extrabold uppercase tracking-[0.25em] text-primary">
                _SELF.MANAGE
              </p>
              <h1 className="mt-1 font-heading text-2xl font-black tracking-tight">
                {isId ? "Laporan Ringkasan Keuangan" : "Financial Summary Report"}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {isId ? "Pemilik Akun:" : "Account Owner:"}{" "}
                <span className="font-bold text-foreground">{state.profileName}</span>
              </p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="font-data text-[10px] uppercase">
                {periodLabels[period]}
              </Badge>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {isId ? "Dicetak pada:" : "Generated on:"}{" "}
                <span className="font-data font-medium">{new Date().toLocaleDateString(isId ? "id-ID" : "en-US", { year: "numeric", month: "short", day: "numeric" })}</span>
              </p>
            </div>
          </div>

          {/* KPI Summary Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/8 p-3.5 text-center">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400">
                {isId ? "Total Pemasukan" : "Total Income"}
              </p>
              <p className="mt-1 font-data text-base font-extrabold text-emerald-400">
                +{formatMoney(totalIncome, state.baseCurrency, state.locale, true)}
              </p>
            </div>
            <div className="rounded-xl border border-red-500/30 bg-red-500/8 p-3.5 text-center">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-red-400">
                {isId ? "Total Pengeluaran" : "Total Expense"}
              </p>
              <p className="mt-1 font-data text-base font-extrabold text-red-400">
                −{formatMoney(totalExpense, state.baseCurrency, state.locale, true)}
              </p>
            </div>
            <div className={`rounded-xl border p-3.5 text-center ${netFlow >= 0 ? "border-primary/30 bg-primary/8 text-primary" : "border-red-500/30 bg-red-500/8 text-red-400"}`}>
              <p className="text-[10px] font-extrabold uppercase tracking-wider">
                {isId ? "Arus Bersih (Net)" : "Net Flow"}
              </p>
              <p className="mt-1 font-data text-base font-extrabold">
                {netFlow >= 0 ? "+" : ""}
                {formatMoney(netFlow, state.baseCurrency, state.locale, true)}
              </p>
            </div>
          </div>

          {/* Category Breakdown Table */}
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {isId ? "Rincian Berdasarkan Kategori" : "Category Breakdown"}
            </h3>
            <div className="overflow-hidden rounded-xl border border-border/70">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-secondary/50 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5">{isId ? "Kategori" : "Category"}</th>
                    <th className="px-3 py-2.5 text-center">{isId ? "Jumlah Tx" : "Tx Count"}</th>
                    <th className="px-3 py-2.5 text-right">{isId ? "Pengeluaran" : "Expense"}</th>
                    <th className="px-3 py-2.5 text-right">{isId ? "Porsi" : "Share"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {categoryBreakdown.map((row) => (
                    <tr key={row.category} className="hover:bg-secondary/20">
                      <td className="px-3 py-2 font-semibold">{row.category}</td>
                      <td className="px-3 py-2 text-center text-muted-foreground">{row.count}</td>
                      <td className="px-3 py-2 text-right font-data font-bold text-red-400">
                        {row.expense > 0 ? `−${formatMoney(row.expense, state.baseCurrency, state.locale, true)}` : "—"}
                      </td>
                      <td className="px-3 py-2 text-right font-data text-muted-foreground">
                        {row.percentage}%
                      </td>
                    </tr>
                  ))}
                  {categoryBreakdown.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                        {isId ? "Tidak ada transaksi dalam periode ini." : "No transactions found in period."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Transactions List Table */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {isId ? "Daftar Transaksi (" + filteredTransactions.length + ")" : "Transactions List (" + filteredTransactions.length + ")"}
              </h3>
            </div>
            <div className="overflow-hidden rounded-xl border border-border/70">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-secondary/50 text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2.5">{isId ? "Tanggal" : "Date"}</th>
                    <th className="px-3 py-2.5">{isId ? "Keterangan" : "Description"}</th>
                    <th className="px-3 py-2.5">{isId ? "Kategori" : "Category"}</th>
                    <th className="px-3 py-2.5">{isId ? "Akun" : "Account"}</th>
                    <th className="px-3 py-2.5 text-right">{isId ? "Nominal" : "Amount"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 font-medium">
                  {filteredTransactions.slice(0, 20).map((tx) => (
                    <tr key={tx.id}>
                      <td className="px-3 py-2 text-muted-foreground font-data text-[11px]">{tx.date}</td>
                      <td className="px-3 py-2 font-semibold">{tx.description}</td>
                      <td className="px-3 py-2 text-muted-foreground">{tx.category}</td>
                      <td className="px-3 py-2 text-muted-foreground">{accountName(tx.accountId)}</td>
                      <td className={`px-3 py-2 text-right font-data font-bold ${tx.kind === "income" ? "text-emerald-400" : ""}`}>
                        {tx.kind === "income" ? "+" : "−"}
                        {formatMoney(tx.baseAmount, state.baseCurrency, state.locale, true)}
                      </td>
                    </tr>
                  ))}
                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                        {isId ? "Tidak ada transaksi." : "No transactions."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {filteredTransactions.length > 20 && (
              <p className="mt-1 text-right text-[10px] text-muted-foreground italic">
                * {isId ? `Menampilkan 20 dari total ${filteredTransactions.length} transaksi` : `Showing 20 of ${filteredTransactions.length} transactions`}
              </p>
            )}
          </div>

          {/* Footer note */}
          <div className="border-t border-border/60 pt-3 flex justify-between items-center text-[10px] text-muted-foreground">
            <span>_self.manage · Confidential</span>
            <span>{isId ? "Dokumen Resmi Keuangan Pribadi" : "Personal Financial Summary"}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
