import { useState } from "react";
import { FileUp, MailCheck } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import type { FinanceState, Transaction } from "@/lib/localDb";
import { sendReportEmail } from "@/lib/integrationsApi";

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const money = (value: number, state: FinanceState) =>
  new Intl.NumberFormat(state.locale === "id" ? "id-ID" : "en-US", {
    style: "currency",
    currency: state.baseCurrency,
    maximumFractionDigits: state.baseCurrency === "IDR" ? 0 : 2,
  }).format(value / (state.exchangeRates[state.baseCurrency] || 1));

const escapeHtml = (value: string) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

function buildEmailHtml(state: FinanceState, dateLabel: string, summary: { balance: number; income: number; spent: number; monthSpent: number }, items: Transaction[], accountName: (id: string) => string) {
  const isId = state.locale === "id";
  const net = summary.income - summary.spent;
  const row = (label: string, value: string, strong = false, color = "#262626") =>
    `<tr><td style="padding:8px 0;color:#737373;font-size:13px">${label}</td><td style="padding:8px 0;text-align:right;font-size:13px;font-weight:${strong ? "700" : "600"};color:${color}">${value}</td></tr>`;
  const txRows = items.slice(0, 15).map((item) => `
    <tr>
      <td style="padding:9px 10px;border-bottom:1px solid #f0f0f0;font-size:12.5px;color:#262626">${escapeHtml(item.description)}<br><span style="color:#9e9e9e;font-size:11px">${escapeHtml(item.category)} · ${escapeHtml(accountName(item.accountId))}</span></td>
      <td style="padding:9px 10px;border-bottom:1px solid #f0f0f0;text-align:right;font-size:12.5px;font-weight:700;white-space:nowrap;color:${item.kind === "income" ? "#2cbb5d" : "#ef4743"}">${item.kind === "income" ? "+" : "−"}${money(item.baseAmount, state)}</td>
    </tr>`).join("");
  return `<!DOCTYPE html><html><body style="margin:0;padding:24px 12px;background:#f7f8fa">
  <div style="max-width:560px;margin:0 auto;font-family:Arial,Helvetica,sans-serif">
    <div style="background:#1a1a1a;border-radius:12px 12px 0 0;padding:22px 26px">
      <div style="font-size:19px;font-weight:800"><span style="color:#ffa116">Esplant</span> <span style="color:#eff1f6">· ${isId ? "Laporan Harian" : "Daily Report"}</span></div>
      <div style="color:#9e9e9e;font-size:12px;margin-top:5px">${dateLabel}</div>
    </div>
    <div style="background:#ffffff;border:1px solid #e5e5e5;border-top:0;border-radius:0 0 12px 12px;padding:24px 26px">
      <table width="100%" cellpadding="0" cellspacing="0" style="border-bottom:1px solid #f0f0f0;margin-bottom:18px">
        ${row(isId ? "Total saldo" : "Total balance", money(summary.balance, state), true)}
        ${row(isId ? "Pemasukan hari ini" : "Income today", `+${money(summary.income, state)}`, false, "#2cbb5d")}
        ${row(isId ? "Pengeluaran hari ini" : "Spending today", `−${money(summary.spent, state)}`, false, "#ef4743")}
        ${row(isId ? "Arus bersih hari ini" : "Net flow today", `${net >= 0 ? "+" : "−"}${money(Math.abs(net), state)}`, true, net >= 0 ? "#2cbb5d" : "#ef4743")}
        ${row(isId ? "Total pengeluaran bulan ini" : "Spending this month", money(summary.monthSpent, state))}
      </table>
      <div style="font-size:13px;font-weight:700;color:#262626;margin-bottom:8px">${isId ? "Transaksi hari ini" : "Today's transactions"} (${items.length})</div>
      ${items.length ? `<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f0f0f0;border-radius:8px">${txRows}</table>` : `<div style="padding:14px;background:#f7f8fa;border-radius:8px;color:#9e9e9e;font-size:12.5px">${isId ? "Belum ada transaksi tercatat hari ini." : "No transactions recorded today."}</div>`}
      <div style="margin-top:20px;padding-top:14px;border-top:1px solid #f0f0f0;color:#9e9e9e;font-size:11px;line-height:1.6">
        ${isId ? "Email ini dibuat otomatis oleh Esplant dari data di perangkat Anda. Lampiran PDF tersedia untuk arsip. Esplant tidak menyimpan data finansial Anda di server." : "This email was generated automatically by Esplant from data on your device. A PDF attachment is included for your records. Esplant does not store your financial data on any server."}
      </div>
    </div>
  </div></body></html>`;
}

export function ReportSendButton({ state }: { state: FinanceState }) {
  const isId = state.locale === "id";
  const [recipient, setRecipient] = useState(state.schedule.email || "");
  const send = useMutation({
    mutationFn: sendReportEmail,
    onSuccess: () => toast.success(isId ? "Laporan harian terkirim ke email." : "Daily summary email sent."),
    onError: (error) => toast.error(error instanceof Error ? error.message : isId ? "Email laporan gagal dikirim." : "Report email failed to send."),
  });
  const accountName = (accountId: string) => state.accounts.find((account) => account.id === accountId)?.name ?? "—";

  const handleSend = () => {
    const email = recipient.trim();
    if (email && !EMAIL_PATTERN.test(email)) {
      toast.error(isId ? "Format email tujuan tidak valid." : "Recipient email format is invalid.");
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    const dateLabel = new Intl.DateTimeFormat(isId ? "id-ID" : "en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${today}T00:00:00`));
    const items = state.transactions.filter((item) => item.date === today);
    const spent = items.filter((item) => item.kind === "expense").reduce((sum, item) => sum + item.baseAmount, 0);
    const income = items.filter((item) => item.kind === "income").reduce((sum, item) => sum + item.baseAmount, 0);
    const monthSpent = state.transactions.filter((item) => item.date.slice(0, 7) === month && item.kind === "expense").reduce((sum, item) => sum + item.baseAmount, 0);
    const balance = state.accounts.reduce((sum, account) => sum + account.balance * (state.exchangeRates[account.currency] || 1), 0);

    const doc = new jsPDF();
    doc.setFontSize(18); doc.setTextColor(26, 26, 26); doc.text("Esplant — Laporan Harian", 20, 22);
    doc.setFontSize(10); doc.setTextColor(120, 120, 120); doc.text(dateLabel, 20, 30);
    doc.setDrawColor(230, 230, 230); doc.line(20, 36, 190, 36);
    doc.setFontSize(11); doc.setTextColor(26, 26, 26);
    const summaryLines = [
      [isId ? "Total saldo" : "Total balance", money(balance, state)],
      [isId ? "Pemasukan hari ini" : "Income today", `+${money(income, state)}`],
      [isId ? "Pengeluaran hari ini" : "Spending today", `-${money(spent, state)}`],
      [isId ? "Arus bersih" : "Net flow", money(income - spent, state)],
      [isId ? "Pengeluaran bulan ini" : "Spending this month", money(monthSpent, state)],
    ];
    summaryLines.forEach(([label, value], index) => { doc.text(String(label), 20, 46 + index * 8); doc.text(String(value), 190, 46 + index * 8, { align: "right" }); });
    doc.line(20, 90, 190, 90);
    doc.setFontSize(12); doc.text(isId ? "Transaksi hari ini" : "Today's transactions", 20, 100);
    doc.setFontSize(10);
    if (items.length) {
      items.slice(0, 18).forEach((item, index) => {
        const y = 110 + index * 8;
        doc.text(`${item.kind === "income" ? "+" : "-"} ${item.description} (${item.category})`, 20, y);
        doc.text(money(item.baseAmount, state), 190, y, { align: "right" });
      });
    } else {
      doc.setTextColor(140, 140, 140); doc.text(isId ? "Belum ada transaksi tercatat hari ini." : "No transactions recorded today.", 20, 110);
    }
    const pdfBase64 = doc.output("datauristring").split(",")[1];
    const html = buildEmailHtml(state, dateLabel, { balance, income, spent, monthSpent }, items, accountName);
    send.mutate({
      subject: isId ? `Laporan Harian Esplant — ${dateLabel}` : `Esplant Daily Report — ${dateLabel}`,
      html,
      pdf_base64: pdfBase64,
      filename: `esplant-daily-${today}.pdf`,
      recipient: email || undefined,
    });
  };

  return (
    <section className="mt-6 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:p-6" data-testid="report-email-send">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary"><MailCheck size={18} /></div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Resend delivery</p>
            <h2 className="font-heading text-lg font-bold">{isId ? "Kirim laporan harian via email" : "Send today's report by email"}</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {isId
                ? "Email profesional berisi tabel ringkasan + transaksi hari ini, dengan lampiran PDF. Dibuat di browser, dikirim aman lewat server."
                : "A professional email with a summary table + today's transactions, plus a PDF attachment. Generated in your browser, sent securely."}
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
          ? "Perlindungan spam: maksimum 3 email per hari. Selama domain belum diverifikasi di Resend, pengirim sandbox (Esplant Reports · onboarding@resend.dev) hanya dapat mengirim ke email pemilik akun Resend."
          : "Spam protection: maximum 3 emails per day. While your domain is unverified in Resend, the sandbox sender (Esplant Reports · onboarding@resend.dev) can only deliver to the Resend account owner's email."}
      </p>
    </section>
  );
}
