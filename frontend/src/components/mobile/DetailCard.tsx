import { type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Reusable mobile tap-to-expand detail card.
 *
 * Follows the proven TransactionsPanel pattern:
 * - Collapsed row: icon + title/subtitle + value + chevron
 * - Expanded: border-t separator + children slot
 * - Optional progress bar (always visible, sits below collapsed row)
 *
 * Use this component **only inside `md:hidden`** wrappers.
 * Desktop layouts remain custom per-panel.
 */
export function DetailCard({
  icon,
  iconClass = "bg-primary/12 text-primary",
  title,
  subtitle,
  value,
  valueClass,
  valueSub,
  open,
  onToggle,
  children,
  progress,
  progressColor = "bg-primary",
  className = "",
  testid,
}: {
  icon: ReactNode;
  iconClass?: string;
  title: string;
  subtitle?: string;
  value?: string;
  valueClass?: string;
  valueSub?: string;
  open: boolean;
  onToggle: () => void;
  children?: ReactNode;
  progress?: number;
  progressColor?: string;
  className?: string;
  testid?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-border/60 bg-background/40 ${className}`}
      data-testid={testid}
    >
      {/* Collapsed row — always visible */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-3 text-left"
      >
        <div
          className={`grid size-8 shrink-0 place-items-center rounded-lg ${iconClass}`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">
            {title}
          </p>
          {subtitle && (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
              {subtitle}
            </p>
          )}
        </div>
        {value && (
          <div className="shrink-0 text-right">
            <p className={`font-data text-[13px] font-bold ${valueClass ?? ""}`}>
              {value}
            </p>
            {valueSub && (
              <p className="text-[10px] font-semibold text-muted-foreground">
                {valueSub}
              </p>
            )}
          </div>
        )}
        <ChevronDown
          size={14}
          className={`shrink-0 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Optional progress bar — always visible */}
      {progress !== undefined && (
        <div className="mx-3 mb-1 h-1 overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full rounded-full transition-all ${progressColor}`}
            style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
          />
        </div>
      )}

      {/* Expanded detail */}
      {open && children && (
        <div className="border-t border-border/50 px-3 py-3 space-y-3">
          {children}
        </div>
      )}
    </div>
  );
}
