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
  teal: "bg-primary/12 text-primary",
  rose: "bg-red-500/12 text-red-400",
  amber: "bg-amber-500/12 text-amber-400",
  indigo: "bg-indigo-500/12 text-indigo-400",
  emerald: "bg-emerald-500/12 text-emerald-400",
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
  className = "",
}: KpiCardProps) {
  return (
    <Card
      className={`group relative min-w-0 overflow-hidden border-border/70 bg-card/75 p-5 shadow-sm backdrop-blur-xl transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg ${onClick ? "cursor-pointer" : ""} ${className}`}
      data-testid={testid}
      onClick={onClick}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className={`grid size-10 place-items-center rounded-xl ${TONE_CLASSES[tone]}`}>
          {icon}
        </div>
        {badge && (
          <Badge variant="outline" className={`text-[10px] ${badgeClass ?? ""}`}>
            {badge}
          </Badge>
        )}
      </div>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
      <p
        className={`mt-1 truncate font-data text-xl font-bold tracking-tight sm:text-2xl ${valueClass ?? ""}`}
        data-testid={testid ? `${testid}-value` : undefined}
      >
        {value}
      </p>
      <p className="mt-2 text-[11px] text-muted-foreground">{note}</p>
      {/* Subtle glow orb that expands on hover */}
      <div className="absolute -right-8 -top-8 size-24 rounded-full bg-primary/5 blur-2xl transition-transform duration-300 group-hover:scale-150" />
    </Card>
  );
}
