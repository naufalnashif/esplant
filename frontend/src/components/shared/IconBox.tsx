/**
 * IconBox — Rounded square container for lucide icons.
 *
 * Replaces the pattern:
 *   <div className="grid size-{N} place-items-center rounded-xl {colorClass}">
 * found in 12+ files across the codebase.
 */
import type * as React from "react";
import type { KpiTone } from "./KpiCard";

const SIZE_CLASSES = {
  xs: "size-7",
  sm: "size-9",
  md: "size-10",
  lg: "size-12",
} as const;

const TONE_CLASSES: Record<KpiTone | "muted", string> = {
  teal: "bg-primary/12 text-primary",
  rose: "bg-red-500/12 text-red-400",
  amber: "bg-amber-500/12 text-amber-400",
  indigo: "bg-indigo-500/12 text-indigo-400",
  emerald: "bg-emerald-500/12 text-emerald-400",
  muted: "bg-secondary text-muted-foreground",
};

export interface IconBoxProps {
  children: React.ReactNode;
  /** Size preset: xs=28px, sm=36px, md=40px (default), lg=48px */
  size?: keyof typeof SIZE_CLASSES;
  /** Predefined colour tone. Ignored if colorClass is provided. */
  tone?: KpiTone | "muted";
  /** Raw Tailwind classes for background + text colour (overrides tone). */
  colorClass?: string;
  /** Rounded style: "xl" (default) or "lg" for smaller icons. */
  rounded?: "lg" | "xl";
  className?: string;
}

export function IconBox({
  children,
  size = "md",
  tone = "teal",
  colorClass,
  rounded = "xl",
  className = "",
}: IconBoxProps) {
  const colors = colorClass ?? TONE_CLASSES[tone];
  return (
    <div
      className={`grid ${SIZE_CLASSES[size]} shrink-0 place-items-center rounded-${rounded} ${colors} ${className}`}
    >
      {children}
    </div>
  );
}
