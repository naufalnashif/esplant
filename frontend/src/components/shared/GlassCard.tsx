/**
 * GlassCard — Glassmorphism card container used as the primary surface
 * across all dashboard panels.
 *
 * Replaces the inline pattern:
 *   "rounded-2xl border border-border/70 bg-card/75 p-5 shadow-sm backdrop-blur-xl sm:p-6"
 * found in AccountsPanel, GoalsPanel, CommitmentsPanel, BudgetGuardrails, TransactionsPanel.
 */
import type * as React from "react";

export interface GlassCardProps {
  children: React.ReactNode;
  /** Visual variant — "default" uses glass card, "accent" uses primary-tinted surface. */
  variant?: "default" | "accent";
  /** Padding size: sm=p-4, md=p-5/sm:p-6 (default), lg=p-6/sm:p-8 */
  padding?: "sm" | "md" | "lg";
  /** Render as <section> instead of <div> (recommended for landmark sections). */
  as?: "div" | "section" | "article";
  className?: string;
  testid?: string;
}

const PADDING: Record<NonNullable<GlassCardProps["padding"]>, string> = {
  sm: "p-4",
  md: "p-5 sm:p-6",
  lg: "p-6 sm:p-8",
};

const VARIANT: Record<NonNullable<GlassCardProps["variant"]>, string> = {
  default: "border-border/80 bg-card/95 shadow-xs backdrop-blur-xl dark:border-border/70 dark:bg-card/75",
  accent: "border-primary/25 bg-primary/6 dark:border-primary/20 dark:bg-primary/8",
};

export function GlassCard({
  children,
  variant = "default",
  padding = "md",
  as: Tag = "div",
  className = "",
  testid,
}: GlassCardProps) {
  return (
    <Tag
      className={`rounded-2xl border ${VARIANT[variant]} ${PADDING[padding]} ${className}`}
      data-testid={testid}
    >
      {children}
    </Tag>
  );
}
