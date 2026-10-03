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
  teal: "bg-primary/10 text-primary dark:bg-primary/12",
  rose: "bg-rose-500/10 text-rose-600 dark:bg-red-500/12 dark:text-red-400",
  amber: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/12 dark:text-amber-400",
  indigo: "bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/12 dark:text-indigo-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/12 dark:text-emerald-400",
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
        className={`group relative min-w-0 overflow-hidden border-border/70 bg-card/75 p-2.5 sm:p-3 shadow-xs backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${onClick ? "cursor-pointer" : ""} ${className}`}
        data-testid={testid}
        onClick={onClick}
      >
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className={`grid size-6 shrink-0 place-items-center rounded-md [&>svg]:size-3.5 ${TONE_CLASSES[tone]}`}>
              {icon}
            </div>
            <p className="truncate text-[11px] font-semibold text-muted-foreground">{label}</p>
          </div>
          {badge && (
            <Badge variant="outline" className={`shrink-0 text-[9px] px-1 py-0 ${badgeClass ?? ""}`}>
              {badge}
            </Badge>
          )}
        </div>
        <p
          className={`mt-1 truncate font-data text-base font-bold tracking-tight text-foreground sm:text-lg ${valueClass ?? ""}`}
          data-testid={testid ? `${testid}-value` : undefined}
        >
          {value}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{note}</p>
        {/* Subtle glow orb */}
        <div className="absolute -right-6 -top-6 size-16 rounded-full bg-primary/5 blur-xl transition-transform duration-300 group-hover:scale-150 pointer-events-none" />
      </Card>
    );
  }

  return (
    <Card
      className={`group relative min-w-0 overflow-hidden border-border/70 bg-card/75 p-3.5 sm:p-5 shadow-sm backdrop-blur-xl transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg ${onClick ? "cursor-pointer" : ""} ${className}`}
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
      <p className="truncate text-[11px] sm:text-xs font-semibold text-muted-foreground">{label}</p>
      <p
        className={`mt-0.5 sm:mt-1 truncate font-data text-lg font-bold tracking-tight sm:text-2xl ${valueClass ?? ""}`}
        data-testid={testid ? `${testid}-value` : undefined}
      >
        {value}
      </p>
      <p className="mt-1 sm:mt-2 truncate text-[10px] sm:text-[11px] text-muted-foreground">{note}</p>
      {/* Subtle glow orb that expands on hover */}
      <div className="absolute -right-8 -top-8 size-20 sm:size-24 rounded-full bg-primary/5 blur-2xl transition-transform duration-300 group-hover:scale-150 pointer-events-none" />
    </Card>
  );
}
