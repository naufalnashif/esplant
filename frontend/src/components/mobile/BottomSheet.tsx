import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/** Mobile: bottom-sheet (max 85% tinggi, sticky header/footer, scroll internal). ≥sm: centered modal. */
export function BottomSheet({
  open,
  onClose,
  title,
  eyebrow,
  description,
  children,
  footer,
  testid,
  maxWidth = "sm:max-w-xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  testid: string;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  // Rendered via a portal straight into <body> — an ancestor with any CSS `transform` (e.g. the
  // `.animate-rise-in` entrance animation used across dashboard panels) turns into a containing
  // block for `position: fixed` descendants, which silently breaks viewport centering and made
  // this sheet appear anchored to the panel's scroll position instead of the screen on desktop.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      data-testid={testid}
    >
      <button type="button" aria-label="Tutup" onClick={onClose} className="absolute inset-0 cursor-default" data-testid={`${testid}-backdrop`} />
      <div
        className={`animate-sheet-up relative flex max-h-[85svh] w-[calc(100%-16px)] flex-col overflow-hidden rounded-t-3xl border border-border bg-card shadow-2xl sm:max-h-[92vh] sm:w-full sm:rounded-2xl ${maxWidth}`}
        data-testid={`${testid}-panel`}
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 shrink-0 rounded-full bg-border sm:hidden" aria-hidden="true" />
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border/60 px-5 pb-3 pt-3 sm:border-0 sm:px-7 sm:pb-2 sm:pt-6">
          <div className="min-w-0">
            {eyebrow && <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-primary sm:mb-2">{eyebrow}</p>}
            <h2 className="font-heading text-lg font-extrabold leading-tight sm:text-2xl">{title}</h2>
            {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
          </div>
          <button
            type="button"
            data-testid={`${testid}-close-button`}
            onClick={onClose}
            aria-label="Tutup"
            className="grid size-10 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-secondary sm:size-8"
          >
            <X size={17} />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 sm:px-7 sm:py-5" data-testid={`${testid}-scroll-area`}>
          {children}
        </div>
        {footer && (
          <footer className="shrink-0 border-t border-border/60 bg-card px-5 py-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:border-0 sm:px-7 sm:pb-6 sm:pt-0">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  );
}
