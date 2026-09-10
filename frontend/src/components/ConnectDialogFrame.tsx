import { useEffect, useRef, type ReactNode } from "react";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { FileSpreadsheet, X } from "lucide-react";
import { Dialog, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import "./connect-dialog.css";

export const ConnectDialogFrame = ({ open, onClose, children }: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) => {
  const viewportRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const viewport = window.visualViewport;
    let frame = 0;
    const updateViewport = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        // Leave pinch zoom to the browser; follow only keyboard/browser-chrome resizing.
        if (viewport && viewport.scale === 1) {
          viewportRef.current?.style.setProperty("--connect-height", `${viewport.height}px`);
          viewportRef.current?.style.setProperty("--connect-top", `${viewport.offsetTop}px`);
        }
      });
    };
    updateViewport();
    viewport?.addEventListener("resize", updateViewport);
    viewport?.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);
    return () => {
      cancelAnimationFrame(frame);
      viewport?.removeEventListener("resize", updateViewport);
      viewport?.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
    };
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose(); }}>
      <DialogPortal>
        <DialogOverlay className="bg-black/55 backdrop-blur-sm" data-testid="connect-dialog-overlay" />
        <div ref={viewportRef} className="connect-sheet-viewport" data-testid="connect-dialog-viewport">
          <DialogPrimitive.Popup
            initialFocus={false}
            finalFocus={returnFocusRef}
            data-testid="connect-dialog"
            className="connect-sheet-panel rounded-t-3xl border border-border/70 bg-card shadow-2xl outline-none sm:rounded-3xl"
          >
            <header className="connect-sheet-header flex items-start gap-2 sm:gap-3" data-testid="connect-dialog-header">
              <div className="grid size-9 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary sm:size-11" aria-hidden="true">
                <FileSpreadsheet size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-base font-bold leading-tight sm:text-lg" data-testid="connect-dialog-title">
                  Hubungkan spreadsheet
                </DialogTitle>
                <DialogDescription className="mt-1 text-xs leading-relaxed" data-testid="connect-dialog-description">
                  Data tinggal di Google Drive Anda sendiri.
                </DialogDescription>
              </div>
              <button type="button" data-testid="connect-dialog-close" onClick={onClose}
                className="grid size-11 shrink-0 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-2 focus-visible:outline-primary"
                aria-label="Tutup">
                <X size={16} />
              </button>
            </header>
            <div className="connect-sheet-body" data-testid="connect-dialog-scroll-area">{children}</div>
          </DialogPrimitive.Popup>
        </div>
      </DialogPortal>
    </Dialog>
  );
};