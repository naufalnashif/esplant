/**
 * EmptyState — Centered placeholder shown when a list has no items.
 *
 * Replaces the repeated pattern:
 *   <p className="py-8 text-center text-sm text-muted-foreground">…</p>
 *   <p className="py-14 text-center text-sm text-muted-foreground">…</p>
 *
 * Used in GoalsPanel, TransactionsPanel, CommitmentsPanel.
 */
export interface EmptyStateProps {
  /** Message to display. */
  message: string;
  /** Vertical padding preset: "sm" = py-8, "lg" = py-14. Default "sm". */
  size?: "sm" | "lg";
  className?: string;
  testid?: string;
}

const PADDING = { sm: "py-8", lg: "py-14" } as const;

export function EmptyState({
  message,
  size = "sm",
  className = "",
  testid,
}: EmptyStateProps) {
  return (
    <p
      className={`${PADDING[size]} text-center text-sm text-muted-foreground ${className}`}
      data-testid={testid}
    >
      {message}
    </p>
  );
}
