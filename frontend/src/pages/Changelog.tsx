import { History, Sparkles, CheckCircle2, Wrench, RefreshCw, Trash2, Zap } from "lucide-react";
import { DocLayout, DocSection } from "@/components/DocLayout";
import { useDocumentTitle } from "@/hooks/useReveal";
import { CHANGELOG, getTypeLabel, APP_VERSION, type ChangelogEntry } from "@/lib/version";
import { Badge } from "@/components/ui/badge";

const TYPE_ICON: Record<ChangelogEntry["changes"][number]["type"], typeof Sparkles> = {
  added: Sparkles,
  fixed: Wrench,
  changed: RefreshCw,
  removed: Trash2,
  improved: Zap,
};

const TYPE_TONE: Record<ChangelogEntry["changes"][number]["type"], string> = {
  added: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  fixed: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  changed: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
  removed: "border-rose-500/30 bg-rose-500/10 text-rose-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400",
  improved: "border-primary/30 bg-primary/10 text-primary",
};

export default function Changelog() {
  useDocumentTitle(`Changelog v${APP_VERSION} — _self.manage`);

  return (
    <DocLayout
      testid="changelog-page"
      icon={<History size={22} />}
      title="Changelog"
      subtitle="Riwayat perubahan, perbaikan, dan fitur baru di setiap versi _self.manage."
    >
      {CHANGELOG.map((entry, entryIndex) => (
        <DocSection key={entry.version} title="">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
              v{entry.version}
            </h2>
            {entryIndex === 0 && (
              <Badge className="gap-1 bg-primary/15 text-primary border-primary/30 text-[10px] font-bold">
                <CheckCircle2 size={11} /> Terbaru
              </Badge>
            )}
          </div>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">
            {new Date(`${entry.date}T00:00:00`).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          {entry.title && (
            <p className="mt-3 font-heading text-base font-bold text-foreground">{entry.title}</p>
          )}

          <div className="mt-5 space-y-2.5">
            {entry.changes.map((change, changeIndex) => {
              const Icon = TYPE_ICON[change.type];
              return (
                <div
                  key={`${entry.version}-${changeIndex}`}
                  className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/50 p-3 sm:p-4"
                >
                  <div
                    className={`grid size-7 shrink-0 place-items-center rounded-lg border ${TYPE_TONE[change.type]}`}
                  >
                    <Icon size={13} />
                  </div>
                  <div className="min-w-0">
                    <span
                      className={`inline-block rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest ${TYPE_TONE[change.type]}`}
                    >
                      {getTypeLabel(change.type)}
                    </span>
                    <p className="mt-1 text-sm leading-relaxed text-foreground">{change.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </DocSection>
      ))}
    </DocLayout>
  );
}
