/**
 * SectionHeading — Eyebrow + H1 + description header for every dashboard panel.
 *
 * Replaces the repeated pattern found in AccountsPanel, GoalsPanel,
 * CommitmentsPanel, TransactionsPanel, SettingsPanel, and MobileOverview.
 */
import type * as React from "react";

export interface SectionHeadingProps {
  /** Small uppercase tracking label above the title (e.g. "Money map / accounts"). */
  eyebrow: string;
  /** Main page title rendered as an <h1>. */
  title: string;
  /** Optional subtitle/description below the title. */
  description?: string;
  /** Optional CTA element placed to the right of the heading block on sm+. */
  action?: React.ReactNode;
  /** data-testid on the wrapper element. */
  testid?: string;
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  testid,
  className = "",
}: SectionHeadingProps) {
  return (
    <div
      className={`mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end ${className}`}
      data-testid={testid}
    >
      <div>
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
          {eyebrow}
        </p>
        <h1 className="font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
