/**
 * SectionCardHeader — Header row for card/section blocks inside dashboard panels.
 *
 * Replaces the repeated pattern of:
 *   <div className="mb-5 flex items-center justify-between">
 *     <div>
 *       <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">…</p>
 *       <h2 className="mt-1 font-heading text-xl font-bold">…</h2>
 *     </div>
 *     {icon or action}
 *   </div>
 *
 * Used in AccountsPanel, GoalsPanel, CommitmentsPanel, SettingsPanel, BudgetGuardrails.
 */
import type * as React from "react";

export interface SectionCardHeaderProps {
  /** Small uppercase tracking eyebrow label (e.g. "Savings buckets"). */
  eyebrow?: string;
  /** Section title rendered as <h2>. */
  title: string;
  /** Optional icon or action node placed to the right. */
  action?: React.ReactNode;
  /** Margin-bottom class. Defaults to "mb-5". */
  mb?: string;
  className?: string;
}

export function SectionCardHeader({
  eyebrow,
  title,
  action,
  mb = "mb-5",
  className = "",
}: SectionCardHeaderProps) {
  return (
    <div className={`flex items-center justify-between gap-3 ${mb} ${className}`}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h2 className={`font-heading text-xl font-bold ${eyebrow ? "mt-1" : ""}`}>{title}</h2>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
