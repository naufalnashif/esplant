import React, { Component, type ErrorInfo, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  EyeOff,
  GripVertical,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import type { DesktopColSpan, WidgetId } from "@/types/dashboardLayout";

interface WidgetErrorBoundaryProps {
  widgetTitle: string;
  children: ReactNode;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class WidgetErrorBoundary extends Component<WidgetErrorBoundaryProps, WidgetErrorBoundaryState> {
  constructor(props: WidgetErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): WidgetErrorBoundaryState {
    return { hasError: true, errorMessage: error.message || "Unknown error" };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[DashboardWidgetContainer] Error rendering widget "${this.props.widgetTitle}":`, error, errorInfo);
  }

  resetError = () => {
    this.setState({ hasError: false, errorMessage: "" });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="flex min-h-[140px] flex-col items-center justify-center rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 text-center text-xs text-rose-600 dark:border-rose-500/20 dark:bg-rose-950/20 dark:text-rose-400"
          data-testid="widget-error-fallback"
        >
          <AlertTriangle className="mb-2 size-5 text-rose-500" />
          <p className="font-bold">Gagal memuat {this.props.widgetTitle}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">Widget ini mengalami kendala rendering data.</p>
          <button
            type="button"
            onClick={this.resetError}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-700 shadow-xs transition-colors hover:bg-rose-50 active:scale-95 dark:bg-zinc-900 dark:text-rose-300 dark:hover:bg-zinc-800"
          >
            <RefreshCw size={12} /> Coba lagi
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export interface DashboardWidgetContainerProps {
  id: WidgetId;
  title: string;
  isVisible: boolean;
  isEditing: boolean;
  colSpan: DesktopColSpan;
  children: ReactNode;
  order?: number;
  onColSpanChange?: (span: DesktopColSpan) => void;
  onToggleVisibility?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  isFirst?: boolean;
  isLast?: boolean;
  className?: string;
}

// Mapping tailwind responsive desktop column span classes
const COL_SPAN_CLASS_MAP: Record<DesktopColSpan, string> = {
  4: "col-span-12 md:col-span-4",
  5: "col-span-12 md:col-span-5",
  6: "col-span-12 md:col-span-6",
  7: "col-span-12 md:col-span-7",
  8: "col-span-12 md:col-span-8",
  12: "col-span-12",
};

export const DashboardWidgetContainer: React.FC<DashboardWidgetContainerProps> = ({
  id,
  title,
  isVisible,
  isEditing,
  colSpan,
  children,
  onColSpanChange,
  onToggleVisibility,
  onMoveUp,
  onMoveDown,
  isFirst = false,
  isLast = false,
  className = "",
}) => {
  if (!isVisible && !isEditing) {
    return null;
  }

  const spanClass = COL_SPAN_CLASS_MAP[colSpan] || "col-span-12";

  return (
    <div
      data-widget-id={id}
      data-testid={`widget-container-${id}`}
      className={`relative transition-all duration-200 h-full flex flex-col ${spanClass} ${
        isEditing
          ? `rounded-2xl border-2 border-dashed p-2 sm:p-2.5 transition-colors ${
              isVisible
                ? "border-amber-500/60 bg-amber-500/[0.03] dark:border-primary/50 dark:bg-primary/[0.03]"
                : "border-slate-300 bg-slate-100/50 opacity-60 dark:border-zinc-700 dark:bg-zinc-900/50"
            }`
          : ""
      } ${className}`}
    >
      {/* Edit Mode Toolbar Header */}
      {isEditing && (
        <div
          data-testid={`widget-edit-toolbar-${id}`}
          className="mb-2 flex flex-wrap items-center justify-between gap-1.5 rounded-xl border border-amber-500/30 bg-card/95 px-2.5 py-1.5 shadow-xs backdrop-blur-md dark:border-primary/30"
        >
          {/* Left: Drag Handle Indicator & Title */}
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-foreground">
            <span
              className="cursor-grab text-muted-foreground hover:text-foreground active:cursor-grabbing"
              title="Geser atau gunakan tombol panah"
            >
              <GripVertical size={15} />
            </span>
            <span className="font-heading text-xs font-bold truncate max-w-[130px] sm:max-w-xs">{title}</span>
            {!isVisible && (
              <span className="rounded-full bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-zinc-800 dark:text-zinc-400">
                Tersembunyi
              </span>
            )}
          </div>

          {/* Right: Size Selector (Desktop) & Reorder / Toggle Actions */}
          <div className="flex items-center gap-1">
            {/* Desktop ColSpan Selector */}
            {onColSpanChange && (
              <div className="hidden sm:flex items-center gap-0.5 rounded-lg border border-border/80 bg-background/80 p-0.5">
                {([4, 5, 6, 7, 8, 12] as DesktopColSpan[]).map((span) => (
                  <button
                    key={span}
                    type="button"
                    title={`Ukuran desktop: ${span} kolom`}
                    data-testid={`widget-size-${id}-${span}`}
                    onClick={() => onColSpanChange(span)}
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold transition-colors cursor-pointer ${
                      colSpan === span
                        ? "bg-amber-600 text-white shadow-xs dark:bg-primary dark:text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {span === 12 ? "Full" : `${span}c`}
                  </button>
                ))}
              </div>
            )}

            {/* Reorder Buttons (Up & Down) - Perfect for mobile and quick desktop nudging */}
            {onMoveUp && (
              <button
                type="button"
                disabled={isFirst}
                onClick={onMoveUp}
                title="Pindahkan ke atas"
                data-testid={`widget-move-up-${id}`}
                className="grid size-7 place-items-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors active:scale-95"
              >
                <ArrowUp size={13} />
              </button>
            )}
            {onMoveDown && (
              <button
                type="button"
                disabled={isLast}
                onClick={onMoveDown}
                title="Pindahkan ke bawah"
                data-testid={`widget-move-down-${id}`}
                className="grid size-7 place-items-center rounded-lg border border-border bg-background text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors active:scale-95"
              >
                <ArrowDown size={13} />
              </button>
            )}

            {/* Visibility Toggle Button */}
            {onToggleVisibility && (
              <button
                type="button"
                onClick={onToggleVisibility}
                title={isVisible ? "Sembunyikan widget" : "Tampilkan widget"}
                data-testid={`widget-toggle-visibility-${id}`}
                className={`grid size-7 place-items-center rounded-lg border transition-colors cursor-pointer active:scale-95 ${
                  isVisible
                    ? "border-border bg-background text-muted-foreground hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                    : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:border-primary/40 dark:text-primary"
                }`}
              >
                <EyeOff size={13} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Widget Content wrapped in internal Error Boundary */}
      <WidgetErrorBoundary widgetTitle={title}>
        <div className={`h-full flex-1 flex flex-col ${!isVisible && isEditing ? "pointer-events-none select-none" : ""}`}>
          {children}
        </div>
      </WidgetErrorBoundary>
    </div>
  );
};
