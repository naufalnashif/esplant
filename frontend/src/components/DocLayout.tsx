import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

const NAV = [
  { to: "/docs", label: "Panduan", testid: "doc-nav-docs" },
  { to: "/faq", label: "FAQ", testid: "doc-nav-faq" },
  { to: "/privacy", label: "Privasi", testid: "doc-nav-privacy" },
  { to: "/terms", label: "Ketentuan", testid: "doc-nav-terms" },
];

/** Shared shell for the /docs, /faq, /privacy, /terms routes — same brand, one nav. */
export function DocLayout({
  title,
  subtitle,
  icon,
  testid,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  testid?: string;
  children: ReactNode;
}) {
  const { pathname } = useLocation();

  return (
    <div className="relative min-h-svh overflow-hidden bg-background text-foreground" data-testid={testid}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-40 -top-52 size-[620px] rounded-full bg-primary/[0.06] blur-[130px]" />
        <div className="absolute -bottom-52 -left-40 size-[520px] rounded-full bg-emerald-500/[0.04] blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-[880px] px-5 pb-24 pt-7 sm:px-8">
        <header className="flex items-center justify-between gap-3">
          <Link to="/" data-testid="doc-brand-home" className="transition-opacity hover:opacity-80">
            <BrandMark size="lg" showTagline />
          </Link>
          <Link
            to="/"
            data-testid="doc-back-to-app"
            className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Kembali ke aplikasi</span>
            <span className="sm:hidden">Aplikasi</span>
          </Link>
        </header>

        <nav
          data-testid="doc-nav"
          className="no-scrollbar mt-8 flex gap-1.5 overflow-x-auto rounded-2xl border border-border/70 bg-card/70 p-1.5 backdrop-blur-xl"
        >
          {NAV.map((item) => {
            const active = pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                data-testid={item.testid}
                aria-current={active ? "page" : undefined}
                className={`shrink-0 rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                  active ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <section className="animate-rise-in mt-10">
          {icon && (
            <div className="mb-5 grid size-12 place-items-center rounded-2xl bg-primary/12 text-primary">{icon}</div>
          )}
          <h1 className="font-heading text-4xl font-extrabold tracking-tight sm:text-5xl">{title}</h1>
          {subtitle && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">{subtitle}</p>}
        </section>

        <div className="mt-10 space-y-10">{children}</div>

        <footer className="mt-16 flex flex-col items-center justify-between gap-4 border-t border-border/60 pt-7 sm:flex-row">
          <BrandMark size="sm" />
          <p className="text-[11px] font-semibold text-muted-foreground">
            Status: <span className="text-amber-500">Beta</span> · Data tetap milik Anda
          </p>
        </footer>
      </div>
    </div>
  );
}

/** A titled documentation block used inside the doc pages. */
export function DocSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-border/70 bg-card/60 p-6 backdrop-blur-xl sm:p-8">
      <h2 className="font-heading text-lg font-bold tracking-tight text-foreground md:text-lg">{title}</h2>
      <div className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

/** Ordered "do this, then that" step list with amber numbering. */
export function DocSteps({ steps }: { steps: { title: string; body: string }[] }) {
  return (
    <ol className="space-y-4">
      {steps.map((step, index) => (
        <li key={step.title} className="flex gap-4">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary/15 font-data text-xs font-bold text-primary">
            {index + 1}
          </span>
          <div>
            <p className="font-semibold text-foreground">{step.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
