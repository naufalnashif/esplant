/**
 * ShowMoreButton — Dashed-border "show all / show less" toggle button.
 *
 * Replaces the identical pattern in:
 * - AccountsPanel.tsx (accounts list)
 * - CommitmentsPanel.tsx (bills list + debts list)
 * - TransactionsPanel.tsx (mobile transactions list)
 */
import { ChevronDown, ChevronUp } from "lucide-react";

export interface ShowMoreButtonProps {
  /** Whether the list is currently expanded. */
  expanded: boolean;
  /** Toggle callback. */
  onToggle: () => void;
  /** Labels for both states. */
  label: {
    show: string;   // e.g. "Show all accounts"
    hide: string;   // e.g. "Show less"
  };
  /** If provided, appended as "(N)" to the show label. */
  count?: number;
  /** data-testid on the button element. */
  testid?: string;
  className?: string;
}

export function ShowMoreButton({
  expanded,
  onToggle,
  label,
  count,
  testid,
  className = "",
}: ShowMoreButtonProps) {
  return (
    <button
      type="button"
      data-testid={testid}
      onClick={onToggle}
      className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary/35 text-xs font-bold text-primary transition-colors hover:bg-primary/5 ${className}`}
    >
      {expanded ? (
        <>
          <span>{label.hide}</span>
          <ChevronUp size={14} />
        </>
      ) : (
        <>
          <span>
            {count !== undefined ? `${label.show} (${count})` : label.show}
          </span>
          <ChevronDown size={14} />
        </>
      )}
    </button>
  );
}
