import { useState } from "react";
import { Link } from "react-router-dom";
import { MoreHorizontal, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BottomSheet } from "@/components/mobile/BottomSheet";

export interface NavItem<K extends string> { key: K; label: string; icon: LucideIcon }
export interface NavAction {
  key: string;
  label: string;
  icon: LucideIcon;
  testid: string;
  href?: string;
  external?: boolean;
  onClick?: () => void;
}

/** Mobile bottom navigation: 4 primary tabs + "Lainnya" sheet, plus a floating add button. */
export function MobileNav<K extends string>({
  tab,
  setTab,
  main,
  more,
  moreActions = [],
  moreLabel,
  moreHint,
  showFab,
  onAdd,
  addLabel,
}: {
  tab: K;
  setTab: (tab: K) => void;
  main: NavItem<K>[];
  more: NavItem<K>[];
  moreActions?: NavAction[];
  moreLabel: string;
  moreHint: string;
  showFab: boolean;
  onAdd: () => void;
  addLabel: string;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = more.some((item) => item.key === tab);
  const itemClass = (active: boolean) =>
    `flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold transition-colors ${active ? "text-primary" : "text-muted-foreground"}`;

  return (
    <>
      {showFab && (
        <button
          type="button"
          data-testid="mobile-add-transaction-fab"
          aria-label={addLabel}
          onClick={onAdd}
          className="fixed bottom-[84px] right-4 z-30 grid size-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 transition-transform active:scale-95 lg:hidden"
        >
          <Plus size={24} />
        </button>
      )}
      <nav
        className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-5 border-t border-border/70 bg-card/95 px-1 pb-[max(6px,env(safe-area-inset-bottom))] pt-1 backdrop-blur-xl lg:hidden"
        data-testid="mobile-navigation"
      >
        {main.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.key} type="button" data-testid={`mobile-nav-${item.key}-button`} onClick={() => setTab(item.key)} className={itemClass(tab === item.key)}>
              <Icon size={19} />
              <span className="max-w-full truncate px-0.5">{item.label}</span>
            </button>
          );
        })}
        <button type="button" data-testid="mobile-nav-more-button" onClick={() => setMoreOpen(true)} className={itemClass(moreActive)} aria-haspopup="dialog">
          <MoreHorizontal size={19} />
          <span className="max-w-full truncate px-0.5">{moreLabel}</span>
        </button>
      </nav>
      <BottomSheet open={moreOpen} onClose={() => setMoreOpen(false)} title={moreLabel} description={moreHint} testid="mobile-more-sheet" maxWidth="sm:max-w-md">
        <div className="grid grid-cols-2 gap-3 pb-1">
          {more.map((item) => {
            const Icon = item.icon;
            const active = tab === item.key;
            return (
              <button
                key={item.key}
                type="button"
                data-testid={`mobile-nav-${item.key}-button`}
                onClick={() => { setTab(item.key); setMoreOpen(false); }}
                className={`flex min-h-[84px] flex-col items-start justify-between rounded-2xl border p-4 text-left transition-colors ${active ? "border-primary bg-primary/8" : "border-border/70 bg-background/40 hover:border-primary/50"}`}
              >
                <span className={`grid size-9 place-items-center rounded-xl ${active ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}><Icon size={18} /></span>
                <span className="text-sm font-semibold leading-tight">{item.label}</span>
              </button>
            );
          })}
          {moreActions.map((item) => {
            const Icon = item.icon;
            const className = "flex min-h-[84px] flex-col items-start justify-between rounded-2xl border border-border/70 bg-background/40 p-4 text-left transition-colors hover:border-primary/50";
            const inner = (
              <>
                <span className="grid size-9 place-items-center rounded-xl bg-secondary text-muted-foreground"><Icon size={18} /></span>
                <span className="text-sm font-semibold leading-tight">{item.label}</span>
              </>
            );
            if (item.href && item.external) {
              return (
                <a key={item.key} href={item.href} target="_blank" rel="noopener noreferrer" data-testid={item.testid} className={className}>
                  {inner}
                </a>
              );
            }
            if (item.href) {
              return (
                <Link key={item.key} to={item.href} data-testid={item.testid} onClick={() => setMoreOpen(false)} className={className}>
                  {inner}
                </Link>
              );
            }
            return (
              <button
                key={item.key}
                type="button"
                data-testid={item.testid}
                onClick={() => { item.onClick?.(); setMoreOpen(false); }}
                className={className}
              >
                {inner}
              </button>
            );
          })}
        </div>
      </BottomSheet>
    </>
  );
}
