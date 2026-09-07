import { TriangleAlert, HeartPulse, ShieldCheck, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { FinanceState } from "@/lib/localDb";
import { applyDataHealthFix, runDataHealth } from "@/lib/dataHealth";

export function DataHealthPanel({ state, onSave }: { state: FinanceState; onSave: (next: FinanceState) => void }) {
  const report = runDataHealth(state);
  const isId = state.locale === "id";
  const fixableCount = report.issues.filter((issue) => issue.fixable).length;

  const handleFix = () => {
    const { state: next, fixed } = applyDataHealthFix(state);
    if (!fixed) {
      toast.info(isId ? "Tidak ada yang bisa diperbaiki otomatis." : "Nothing can be auto-fixed.");
      return;
    }
    onSave(next);
    toast.success(isId ? `${fixed} masalah diperbaiki otomatis.` : `${fixed} issues auto-fixed.`);
  };

  return (
    <Card className="border-border/70 bg-card/75 p-5 backdrop-blur-xl sm:p-6" data-testid="data-health-panel">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className={`grid size-10 place-items-center rounded-xl ${report.ok ? "bg-emerald-500/12 text-emerald-400" : "bg-amber-500/12 text-amber-400"}`}>
            <HeartPulse size={18} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{isId ? "Rekonsiliasi otomatis" : "Automatic reconciliation"}</p>
            <h2 className="font-heading text-xl font-bold">Data Health</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {isId
                ? "Memeriksa konsistensi saldo akun vs riwayat transaksi, duplikat, dan nilai yang tidak valid."
                : "Checks account balances against transaction history, duplicates, and invalid values."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {report.ok ? (
            <Badge className="gap-1 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/15" data-testid="data-health-status-badge">
              <ShieldCheck size={12} /> {isId ? "Semua konsisten" : "All consistent"}
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1 bg-amber-500/15 text-amber-400" data-testid="data-health-status-badge">
              <TriangleAlert size={12} /> {report.errors + report.warnings} {isId ? "temuan" : "findings"}
            </Badge>
          )}
          {fixableCount > 0 && (
            <Button size="sm" variant="outline" className="gap-1.5 border-primary/40 text-primary hover:bg-primary/8" onClick={handleFix} data-testid="data-health-autofix-button">
              <Wrench size={13} /> {isId ? "Perbaiki otomatis" : "Auto-fix"} ({fixableCount})
            </Button>
          )}
        </div>
      </div>
      {report.ok ? (
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-muted-foreground" data-testid="data-health-ok-message">
          {isId
            ? `Semua ${state.accounts.length} akun tersinkron dengan ${state.transactions.length} transaksi. Tidak ada inkonsistensi terdeteksi.`
            : `All ${state.accounts.length} accounts reconcile with ${state.transactions.length} transactions. No inconsistencies detected.`}
        </div>
      ) : (
        <div className="space-y-2" data-testid="data-health-issues-list">
          {report.issues.map((issue) => (
            <div key={issue.id} className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/35 p-3" data-testid={`data-health-issue-${issue.id}`}>
              <div className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg ${issue.severity === "error" ? "bg-rose-500/12 text-rose-400" : "bg-amber-500/12 text-amber-400"}`}>
                <TriangleAlert size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">{isId ? issue.title : issue.titleEn}</p>
                  <Badge variant="outline" className="text-[9px] uppercase">{issue.severity}</Badge>
                  {issue.fixable && <Badge variant="secondary" className="text-[9px]">{isId ? "bisa diperbaiki" : "fixable"}</Badge>}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{isId ? issue.detail : issue.detailEn}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
