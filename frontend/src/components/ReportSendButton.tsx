import { useState } from "react";
import { FileUp, MailCheck } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import type { FinanceState } from "@/lib/localDb";
import { sendReportEmail } from "@/lib/integrationsApi";

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const currency = (value: number, state: FinanceState) =>
  new Intl.NumberFormat(state.locale === "id" ? "id-ID" : "en-US", {
    style: "currency",
    currency: state.baseCurrency,
    maximumFractionDigits: state.baseCurrency === "IDR" ? 0 : 2,
  }).format(value / (state.exchangeRates[state.baseCurrency] || 1));

export function ReportSendButton({ state }: { state: FinanceState }) {
  const isId = state.locale === "id";
  const [recipient, setRecipient] = useState(state.schedule.email || "");
  const send = useMutation({
    mutationFn: sendReportEmail,
    onSuccess: () => toast.success(isId ? "Laporan harian terkirim ke email." : "Daily summary email sent."),
    onError: (error) => toast.error(error instanceof Error ? error.message : isId ? "Email laporan gagal dikirim." : "Report email failed to send."),
  });

  const handleSend = () => {
    const email = recipient.trim();
    if (email && !EMAIL_PATTERN.test(email)) {
      toast.error(isId ? "Format email tujuan tidak valid." : "Recipient email format is invalid.");
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const items = state.transactions.filter((item) => item.date === today);
    const spent = items.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.baseAmount, 0);
    const income = items.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.baseAmount, 0);
    const top = items.filter((item) => item.kind === "expense").slice(0, 5);
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Esplant · Financial Tracker", 20, 22);
    doc.setFontSize(13);
    doc.text("Daily financial summary", 20, 32);
    doc.setFontSize(10);
    doc.text(`Date: ${today}`, 20, 42);
    doc.text(`Today spending: ${currency(spent, state)}`, 20, 56);
    doc.text(`Today income: ${currency(income, state)}`, 20, 64);
    doc.text(`Today net flow: ${currency(income - spent, state)}`, 20, 72);
    doc.text("Recent transactions:", 20, 88);
    top.forEach((item, index) => doc.text(`${index + 1}. ${item.description} · ${currency(item.baseAmount, state)}`, 24, 98 + index * 8));
    const pdfBase64 = doc.output("datauristring").split(",")[1];
    const html = `<h1>Esplant · Daily financial summary</h1><p>${today}</p><p><strong>Today spending:</strong> ${currency(spent, state)}</p><p><strong>Today income:</strong> ${currency(income, state)}</p><p><strong>Today net flow:</strong> ${currency(income - spent, state)}</p><h3>Recent transactions</h3><ul>${top.map((item) => `<li>${item.description} · ${currency(item.baseAmount, state)}</li>`).join("")}</ul>`;
    send.mutate({ subject: `Esplant daily summary · ${today}`, html, pdf_base64: pdfBase64, filename: `esplant-daily-${today}.pdf`, recipient: email || undefined });
  };

  return (
    <section className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6" data-testid="report-email-send">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary"><MailCheck size={18} /></div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Resend delivery</p>
            <h2 className="font-heading text-lg font-bold">{isId ? "Kirim ringkasan hari ini via email" : "Send today's summary email"}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {isId
                ? "Laporan PDF dibuat di browser dan dikirim aman lewat server. Kosongkan email untuk memakai penerima default."
                : "The PDF report is generated in your browser and sent securely. Leave the email empty to use the default recipient."}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            data-testid="report-recipient-input"
            type="email"
            value={recipient}
            onChange={(event) => setRecipient(event.target.value)}
            placeholder={isId ? "Email tujuan (opsional)" : "Recipient email (optional)"}
            className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary sm:w-64"
          />
          <Button data-testid="report-send-email-button" onClick={handleSend} disabled={send.isPending} className="h-10 gap-2 shrink-0">
            <FileUp size={15} />
            {send.isPending ? (isId ? "Mengirim..." : "Sending...") : isId ? "Kirim laporan harian" : "Send daily report"}
          </Button>
        </div>
      </div>
      <p className="mt-3 text-[10px] leading-relaxed text-muted-foreground">
        {isId
          ? "Catatan: selama domain belum diverifikasi di Resend, pengirim sandbox (onboarding@resend.dev) hanya dapat mengirim ke email pemilik akun Resend."
          : "Note: while your domain is unverified in Resend, the sandbox sender (onboarding@resend.dev) can only deliver to the Resend account owner's email."}
      </p>
    </section>
  );
}
