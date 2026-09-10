import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/** Mobile-only "Lihat selengkapnya" wrapper; on ≥md the children render untouched. */
export function MobileDisclosure({
  title,
  hint,
  children,
  testid,
  defaultOpen = false,
  showLabel = "Lihat selengkapnya",
  hideLabel = "Sembunyikan",
}: {
  title: string;
  hint?: string;
  children: ReactNode;
  testid: string;
  defaultOpen?: boolean;
  showLabel?: string;
  hideLabel?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div data-testid={testid}>
      <button
        type="button"
        data-testid={`${testid}-toggle`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/75 px-4 py-2.5 text-left md:hidden"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold">{title}</span>
          {hint && <span className="block truncate text-[11px] text-muted-foreground">{hint}</span>}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-primary">
          {open ? hideLabel : showLabel}
          <ChevronDown size={14} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </span>
      </button>
      <div className={open ? "mt-3 md:mt-0" : "hidden md:block"}>{children}</div>
    </div>
  );
}
