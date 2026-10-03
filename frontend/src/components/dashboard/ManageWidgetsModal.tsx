import React from "react";
import { ArrowDown, ArrowUp, RotateCcw } from "lucide-react";
import { BottomSheet } from "@/components/mobile/BottomSheet";
import { Button } from "@/components/ui/button";
import type { WidgetId, WidgetLayoutItem } from "@/types/dashboardLayout";

export interface ManageWidgetsModalProps {
  open: boolean;
  onClose: () => void;
  items: WidgetLayoutItem[];
  onToggleVisibility: (id: WidgetId) => void;
  onMoveWidget: (id: WidgetId, direction: "up" | "down") => void;
  onResetDefault: () => void;
  onShowAll: () => void;
  isId?: boolean;
}

const WIDGET_TITLES: Record<WidgetId, { id: string; en: string; descId: string; descEn: string }> = {
  hero_balance: {
    id: "Total Saldo & Akun",
    en: "Total Balance & Accounts",
    descId: "Kartu utama penunjuk total saldo seluruh rekening dan tabungan.",
    descEn: "Hero card displaying combined balance across all accounts.",
  },
  cashflow_trend: {
    id: "Grafik Arus Kas 6 Bulan",
    en: "6-Month Cash Flow",
    descId: "Tren perbandingan pemasukan vs pengeluaran 6 bulan terakhir.",
    descEn: "Area chart showing income vs expense trends over 6 months.",
  },
  quick_filters: {
    id: "Filter Periode Cepat",
    en: "Quick Period Filter",
    descId: "Pilihan tab hari ini, minggu ini, bulan ini, tahun ini, dan semua.",
    descEn: "Fast selector for today, week, month, year, and all-time.",
  },
  financial_summary: {
    id: "Ringkasan Finansial (KPI)",
    en: "Financial Summary (KPI Grid)",
    descId: "5 kartu metrik: Pengeluaran, Pemasukan, Arus Bersih, Cicilan, Tabungan.",
    descEn: "5 KPI cards: Spent, Income, Net Flow, Committed, and Savings.",
  },
  payday_status: {
    id: "Status Siklus Gajian",
    en: "Payday Cycle Status",
    descId: "Informasi siklus pembukuan aktif, tanggal gajian, dan sisa hari.",
    descEn: "Banner with current cycle range, payday, and days remaining.",
  },
  category_comparison: {
    id: "Bandingkan Kategori Pengeluaran",
    en: "Spending Category Comparison",
    descId: "Bar chart perbandingan pengeluaran per kategori bulan ini vs lalu.",
    descEn: "Bar chart comparing spending per category this month vs last.",
  },
  upcoming_bills: {
    id: "Pusat Aksi & Tagihan Jatuh Tempo",
    en: "Action Center & Upcoming Bills",
    descId: "Daftar tagihan atau cicilan terdekat yang harus dibayar.",
    descEn: "Upcoming commitments and bills requiring attention.",
  },
  recent_transactions: {
    id: "Riwayat Transaksi Terbaru",
    en: "Recent Transactions",
    descId: "5 mutasi transaksi pemasukan dan pengeluaran paling baru.",
    descEn: "Latest 5 income and expense transactions recorded.",
  },
  spending_allocation: {
    id: "Distribusi Alokasi Pengeluaran",
    en: "Spending Allocation Donut",
    descId: "Diagram donat proporsi belanja per kategori.",
    descEn: "Donut chart visualizing expense proportions by category.",
  },
  budget_guardrails: {
    id: "Budget Guardrails",
    en: "Budget Guardrails",
    descId: "Batas pengeluaran per kategori dengan indikator otomatis aman vs over.",
    descEn: "Category budget guardrails with automatic safe vs over-limit insights.",
  },
};

export const ManageWidgetsModal: React.FC<ManageWidgetsModalProps> = ({
  open,
  onClose,
  items,
  onToggleVisibility,
  onMoveWidget,
  onResetDefault,
  onShowAll,
  isId = true,
}) => {
  const visibleCount = items.filter((item) => item.isVisible).length;
  const sortedItems = [...items].sort((a, b) => a.order - b.order);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      testid="manage-widgets-sheet"
      title={isId ? "Kelola Tata Letak Widget" : "Manage Dashboard Widgets"}
      eyebrow={isId ? "Kustomisasi Tampilan" : "Layout Customization"}
      description={
        isId
          ? `${visibleCount} dari ${items.length} widget aktif. Atur urutan dan centang untuk menampilkan.`
          : `${visibleCount} of ${items.length} widgets active. Reorder and toggle visibility.`
      }
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onResetDefault}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            data-testid="reset-widgets-button"
          >
            <RotateCcw size={13} />
            {isId ? "Reset Default" : "Reset Default"}
          </Button>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onShowAll}
              className="text-xs"
              data-testid="show-all-widgets-button"
            >
              {isId ? "Tampilkan Semua" : "Show All"}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={onClose}
              className="text-xs"
              data-testid="close-manage-widgets-button"
            >
              {isId ? "Selesai" : "Done"}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-2 py-1" data-testid="manage-widgets-list">
        {sortedItems.map((item, index) => {
          const info = WIDGET_TITLES[item.id] || {
            id: item.titleKey,
            en: item.titleKey,
            descId: "Widget dashboard",
            descEn: "Dashboard widget",
          };
          const title = isId ? info.id : info.en;
          const desc = isId ? info.descId : info.descEn;
          const isFirst = index === 0;
          const isLast = index === sortedItems.length - 1;

          return (
            <div
              key={item.id}
              data-testid={`manage-widget-row-${item.id}`}
              className={`flex items-center justify-between gap-3 rounded-2xl border p-3 transition-colors ${
                item.isVisible
                  ? "border-slate-200/90 bg-white dark:border-border/80 dark:bg-card/75 shadow-xs"
                  : "border-dashed border-slate-300/80 bg-slate-50/60 opacity-60 dark:border-zinc-800 dark:bg-zinc-900/40"
              }`}
            >
              {/* Left: Reorder buttons & Title */}
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button
                    type="button"
                    disabled={isFirst}
                    onClick={() => onMoveWidget(item.id, "up")}
                    data-testid={`sheet-move-up-${item.id}`}
                    aria-label={`Pindahkan ${title} ke atas`}
                    className="grid size-6 place-items-center rounded border border-border/80 bg-background text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ArrowUp size={11} />
                  </button>
                  <button
                    type="button"
                    disabled={isLast}
                    onClick={() => onMoveWidget(item.id, "down")}
                    data-testid={`sheet-move-down-${item.id}`}
                    aria-label={`Pindahkan ${title} ke bawah`}
                    className="grid size-6 place-items-center rounded border border-border/80 bg-background text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ArrowDown size={11} />
                  </button>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="grid size-5 place-items-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 dark:bg-zinc-800 dark:text-zinc-300 shrink-0">
                      {index + 1}
                    </span>
                    <p className="font-heading text-xs font-bold text-slate-900 truncate dark:text-foreground">
                      {title}
                    </p>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground line-clamp-1">{desc}</p>
                </div>
              </div>

              {/* Right: Visibility Switch Toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={item.isVisible}
                onClick={() => onToggleVisibility(item.id)}
                data-testid={`sheet-toggle-${item.id}`}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ${
                  item.isVisible ? "bg-amber-600 dark:bg-primary" : "bg-slate-300 dark:bg-zinc-700"
                }`}
              >
                <span className="sr-only">Toggle {title}</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block size-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    item.isVisible ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </BottomSheet>
  );
};
