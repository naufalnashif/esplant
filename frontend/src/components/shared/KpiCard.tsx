/**
 * KpiCard — Unified KPI stat card with icon, label, value, and note.
 *
 * Replaces:
 * - Home.tsx local `KpiCard` function
 * - MobileOverview.tsx `MiniKpi` function
 * - CommitmentsPanel.tsx inline KPI card map
 * - GoalsPanel.tsx inline KPI div blocks
 */
import type * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export type KpiTone = "teal" | "rose" | "amber" | "indigo" | "emerald";

const TONE_CLASSES: Record<KpiTone, string> = {
  teal: "bg-teal-50 text-teal-600 border border-teal-200/60 dark:bg-primary/12 dark:text-primary dark:border-transparent",
  rose: "bg-rose-50 text-rose-600 border border-rose-200/60 dark:bg-red-500/12 dark:text-red-400 dark:border-transparent",
  amber: "bg-amber-50 text-amber-700 border border-amber-200/60 dark:bg-amber-500/12 dark:text-amber-400 dark:border-transparent",
  indigo: "bg-blue-50 text-blue-600 border border-blue-200/60 dark:bg-indigo-500/12 dark:text-indigo-400 dark:border-transparent",
  emerald: "bg-emerald-50 text-emerald-600 border border-emerald-200/60 dark:bg-emerald-500/12 dark:text-emerald-400 dark:border-transparent",
};

export interface KpiCardProps {
  label: string;
  value: string;
  note: string;
  icon: React.ReactNode;
  /** Visual colour accent — defaults to "teal" (primary). */
  tone?: KpiTone;
  /** Optional badge text shown top-right (used by CommitmentsPanel). */
  badge?: string;
  /** Additional Tailwind classes for the badge element. */
  badgeClass?: string;
  /** Additional Tailwind classes for the value text. */
  valueClass?: string;
  /** data-testid on the card root; also auto-generates `${testid}-value` on the value element. */
  testid?: string;
  /** Makes the card clickable (hover lift already present). */
  onClick?: () => void;
  /** Visual layout density — defaults to "default". Use "compact" for space-constrained mobile dashboards. */
  variant?: "default" | "compact";
  className?: string;
}

export function KpiCard({
  label,
  value,
  note,
  icon,
  tone = "teal",
  badge,
  badgeClass,
  valueClass,
  testid,
  onClick,
  variant = "default",
  className = "",
}: KpiCardProps) {
  if (variant === "compact") {
    return (
      <Card
        className={`group relative min-w-0 overflow-hidden border border-slate-200/80 bg-white p-2.5 sm:p-3 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-border/70 dark:bg-card/75 dark:shadow-xs dark:backdrop-blur-xl ${onClick ? "cursor-pointer" : ""} ${className}`}
        data-testid={testid}
        onClick={onClick}
      >
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className={`grid size-6 shrink-0 place-items-center rounded-md [&>svg]:size-3.5 ${TONE_CLASSES[tone]}`}>
              {icon}
            </div>
            <p className="truncate text-[11px] font-semibold text-slate-600 dark:text-muted-foreground">{label}</p>
          </div>
          {badge && (
            <Badge variant="outline" className={`shrink-0 text-[9px] px-1 py-0 ${badgeClass ?? ""}`}>
              {badge}
            </Badge>
          )}
        </div>
        <p
          className={`mt-1 truncate font-data text-base font-bold tracking-tight text-slate-900 sm:text-lg dark:text-foreground ${valueClass ?? ""}`}
          data-testid={testid ? `${testid}-value` : undefined}
        >
          {value}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-slate-500 dark:text-muted-foreground">{note}</p>
        {/* Subtle glow orb */}
        <div className="absolute -right-6 -top-6 size-16 rounded-full bg-primary/5 blur-xl transition-transform duration-300 group-hover:scale-150 pointer-events-none" />
      </Card>
    );
  }

  return (
    <Card
      className={`group relative min-w-0 overflow-hidden border border-slate-200/80 bg-white p-3.5 sm:p-5 shadow-soft transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-border/70 dark:bg-card/75 dark:shadow-sm dark:backdrop-blur-xl ${onClick ? "cursor-pointer" : ""} ${className}`}
      data-testid={testid}
      onClick={onClick}
    >
      <div className="mb-2.5 sm:mb-4 flex items-center justify-between">
        <div className={`grid size-8 sm:size-10 place-items-center rounded-lg sm:rounded-xl [&>svg]:size-4 sm:[&>svg]:size-5 ${TONE_CLASSES[tone]}`}>
          {icon}
        </div>
        {badge && (
          <Badge variant="outline" className={`text-[9px] sm:text-[10px] px-1.5 py-0.5 ${badgeClass ?? ""}`}>
            {badge}
          </Badge>
        )}
      </div>
      <p className="truncate text-[11px] sm:text-xs font-semibold text-slate-600 dark:text-muted-foreground">{label}</p>
      <p
        className={`mt-0.5 sm:mt-1 truncate font-data text-lg font-bold tracking-tight text-slate-900 sm:text-2xl dark:text-foreground ${valueClass ?? ""}`}
        data-testid={testid ? `${testid}-value` : undefined}
      >
        {value}
      </p>
      <p className="mt-1 sm:mt-2 truncate text-[10px] sm:text-[11px] text-slate-500 dark:text-muted-foreground">{note}</p>
      {/* Subtle glow orb that expands on hover */}
      <div className="absolute -right-8 -top-8 size-20 sm:size-24 rounded-full bg-primary/5 blur-2xl transition-transform duration-300 group-hover:scale-150 pointer-events-none" />
    </Card>
  );
}
