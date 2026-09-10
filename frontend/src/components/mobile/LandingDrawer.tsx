import { Link } from "react-router-dom";
import { useEffect } from "react";
import { FileSpreadsheet, HardDrive, LayoutGrid, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/BrandMark";

export interface DrawerMenuItem { label: string; href: string; type: "anchor" | "route" }

/** Right-side navigation drawer for the landing page on mobile (<md). */
export function LandingDrawer({
  open,
  onClose,
  menu,
  onboarded,
  onDemo,
  onConnect,
  onDashboard,
}: {
  open: boolean;
  onClose: () => void;
  menu: DrawerMenuItem[];
  onboarded: boolean;
  onDemo: () => void;
  onConnect: () => void;
  onDashboard: () => void;
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
  const linkClass = "flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground";

  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu" data-testid="landing-drawer">
      <button type="button" aria-label="Tutup menu" onClick={onClose} className="absolute inset-0 bg-black/55 backdrop-blur-sm" data-testid="landing-drawer-backdrop" />
      <aside className="animate-drawer-in absolute inset-y-0 right-0 flex w-[82%] max-w-xs flex-col border-l border-border/70 bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <BrandMark size="sm" />
          <button type="button" data-testid="landing-drawer-close" onClick={onClose} aria-label="Tutup menu" className="grid size-11 place-items-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground">
            <X size={18} />
          </button>
        </div>
        <nav className="flex flex-col gap-1 px-3 py-4" data-testid="landing-drawer-menu">
          {menu.map((item) =>
            item.type === "route" ? (
              <Link key={item.label} to={item.href} onClick={onClose} data-testid={`landing-drawer-${item.label.toLowerCase()}`} className={linkClass}>{item.label}</Link>
            ) : (
              <a key={item.label} href={item.href} onClick={onClose} data-testid={`landing-drawer-${item.label.toLowerCase()}`} className={linkClass}>{item.label}</a>
            ),
          )}
        </nav>
        <div className="mt-auto flex flex-col gap-2 border-t border-border/60 px-4 pt-4 pb-[max(16px,env(safe-area-inset-bottom))]">
          {onboarded && (
            <Button variant="outline" data-testid="landing-drawer-dashboard-button" onClick={() => { onClose(); onDashboard(); }} className="h-11 w-full gap-2 text-sm font-bold">
              <LayoutGrid size={15} /> Buka Dashboard
            </Button>
          )}
          <Button variant="outline" data-testid="landing-drawer-demo-button" onClick={() => { onClose(); onDemo(); }} className="h-11 w-full gap-2 text-sm font-bold">
            <HardDrive size={15} /> Coba Demo (Local DB)
          </Button>
          <Button data-testid="landing-drawer-connect-button" onClick={() => { onClose(); onConnect(); }} className="h-11 w-full gap-2 text-sm font-bold shadow-lg shadow-primary/20">
            <FileSpreadsheet size={15} /> Connect Google Sheet
          </Button>
        </div>
      </aside>
    </div>
  );
}
