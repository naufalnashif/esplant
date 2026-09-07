import { FileUp, MailCheck } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import type { FinanceState } from "@/lib/localDb";
import { sendReportEmail } from "@/lib/integrationsApi";

const currency = (value: number, state: FinanceState) => new Intl.NumberFormat(state.locale === "id" ? "id-ID" : "en-US", { style: "currency", currency: state.baseCurrency, maximumFractionDigits: state.baseCurrency === "IDR" ? 0 : 2 }).format(value / (state.exchangeRates[state.baseCurrency] || 1));

export function ReportSendButton({ state }: { state: FinanceState }) {
  const send = useMutation({ mutationFn: sendReportEmail, onSuccess: () => toast.success("Daily summary email sent."), onError: (error) => toast.error(error instanceof Error ? error.message : "Email report gagal dikirim.") });
  const handleSend = () => {
    const today = new Date().toISOString().slice(0, 10); const items = state.transactions.filter((item) => item.date === today); const spent = items.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.baseAmount, 0); const income = items.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.baseAmount, 0); const top = items.filter((item) => item.kind === "expense").slice(0, 5);
    const doc = new jsPDF(); doc.setFontSize(18); doc.text("Esplant · Financial Tracker", 20, 22); doc.setFontSize(13); doc.text("Daily financial summary", 20, 32); doc.setFontSize(10); doc.text(`Date: ${today}`, 20, 42); doc.text(`Today spending: ${currency(spent, state)}`, 20, 56); doc.text(`Today income: ${currency(income, state)}`, 20, 64); doc.text(`Today net flow: ${currency(income - spent, state)}`, 20, 72); doc.text("Recent transactions:", 20, 88); top.forEach((item, index) => doc.text(`${index + 1}. ${item.description} · ${currency(item.baseAmount, state)}`, 24, 98 + index * 8));
    const pdfBase64 = doc.output("datauristring").split(",")[1]; const html = `<h1>Esplant · Daily financial summary</h1><p>${today}</p><p><strong>Today spending:</strong> ${currency(spent, state)}</p><p><strong>Today income:</strong> ${currency(income, state)}</p><p><strong>Today net flow:</strong> ${currency(income - spent, state)}</p><h3>Recent transactions</h3><ul>${top.map((item) => `<li>${item.description} · ${currency(item.baseAmount, state)}</li>`).join("")}</ul>`;
    send.mutate({ subject: `Esplant daily summary · ${today}`, html, pdf_base64: pdfBase64, filename: `esplant-daily-${today}.pdf` });
  };
  return <section className="mt-6 flex flex-col justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:p-6" data-testid="report-email-send"><div className="flex items-start gap-3"><div className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary"><MailCheck size={18} /></div><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Resend delivery</p><h2 className="font-heading text-lg font-bold">Send today’s summary email</h2><p className="mt-1 text-xs text-muted-foreground">Kirim langsung ke recipient yang ada di environment, dengan PDF attachment.</p></div></div><Button data-testid="report-send-email-button" onClick={handleSend} disabled={send.isPending} className="gap-2"><FileUp size={15} />{send.isPending ? "Sending..." : "Send daily report"}</Button></section>;
}