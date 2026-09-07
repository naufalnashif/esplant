import { ArrowDownRight, ArrowUpRight, Lightbulb, ShieldAlert, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import type { FinanceState } from "@/lib/localDb";

const monthKey = (date: string) => date.slice(0, 7);
const money = (value: number, locale: FinanceState["locale"]) => new Intl.NumberFormat(locale === "id" ? "id-ID" : "en-US", { style: "currency", currency: "IDR", maximumFractionDigits: 0, notation: "compact" }).format(value);

export function InsightsPanel({ state, currentMonth }: { state: FinanceState; currentMonth: string }) {
  const lastMonth = (() => { const date = new Date(`${currentMonth}-01T00:00:00`); date.setMonth(date.getMonth() - 1); return date.toISOString().slice(0, 7); })();
  const categories = Array.from(new Set([...state.transactions.map((item) => item.category), ...state.budgets.map((item) => item.category)]));
  const insights = categories.map((category) => {
    const current = state.transactions.filter((item) => item.kind === "expense" && item.category === category && monthKey(item.date) === currentMonth).reduce((sum, item) => sum + item.baseAmount, 0);
    const previous = state.transactions.filter((item) => item.kind === "expense" && item.category === category && monthKey(item.date) === lastMonth).reduce((sum, item) => sum + item.baseAmount, 0);
    const budget = state.budgets.find((item) => item.category === category);
    const change = previous ? Math.round(((current - previous) / previous) * 100) : 0;
    const ratio = budget ? current / budget.limit : 0;
    if (budget && ratio >= 1) return { category, tone: "rose", icon: ShieldAlert, title: `${category} melewati budget`, detail: `Kurangi ${money(current - budget.limit, state.locale)} agar kembali ke batas.` };
    if (budget && ratio >= 0.8) return { category, tone: "amber", icon: Lightbulb, title: `${category} hampir penuh`, detail: `${Math.max(0, Math.round((budget.limit - current) / Math.max(1, budget.limit) * 100))}% ruang budget tersisa bulan ini.` };
    if (change >= 15) return { category, tone: "amber", icon: ArrowUpRight, title: `${category} naik ${change}%`, detail: `Bandingkan transaksi terbesar sebelum menambah pengeluaran berikutnya.` };
    if (change <= -15) return { category, tone: "teal", icon: ArrowDownRight, title: `${category} turun ${Math.abs(change)}%`, detail: `Kebiasaan ini menghemat ${money(previous - current, state.locale)} dibanding bulan lalu.` };
    return { category, tone: "indigo", icon: Sparkles, title: `${category} tetap terkendali`, detail: budget ? `Masih ada ${money(Math.max(0, budget.limit - current), state.locale)} ruang.` : "Pertimbangkan menetapkan budget agar lebih terarah." };
  }).sort((a, b) => (a.tone === "rose" ? -1 : 0) - (b.tone === "rose" ? -1 : 0)).slice(0, 4);
  return <Card className="mt-6 border-border/70 bg-card/75 p-5 shadow-sm backdrop-blur-xl sm:p-6" data-testid="spending-insights-panel"><div className="mb-5 flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Coach / monthly trends</p><h2 className="mt-1 font-heading text-xl font-bold">Spending insights</h2><p className="mt-1 text-xs text-muted-foreground">Rekomendasi berdasarkan perubahan kategori dan guardrails bulan ini.</p></div><Badge variant="secondary">Auto</Badge></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{insights.map((insight) => { const Icon = insight.icon; return <div key={insight.category} className={`rounded-xl border p-4 ${insight.tone === "rose" ? "border-rose-400/20 bg-rose-400/5" : insight.tone === "amber" ? "border-amber-400/20 bg-amber-400/5" : insight.tone === "teal" ? "border-primary/20 bg-primary/5" : "border-indigo-400/20 bg-indigo-400/5"}`}><div className="mb-3 flex items-center justify-between"><Icon size={18} className={insight.tone === "rose" ? "text-rose-400" : insight.tone === "amber" ? "text-amber-400" : insight.tone === "teal" ? "text-primary" : "text-indigo-400"} /><span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{insight.category}</span></div><p className="text-sm font-bold">{insight.title}</p><p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{insight.detail}</p></div>; })}</div></Card>;
}