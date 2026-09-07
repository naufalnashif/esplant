// POST /api/integrations/reports/send — sends the browser-generated report through Resend.
// The Resend API key never reaches the client.
import { json } from "./_shared/util.mjs";

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default async (req) => {
  if (req.method !== "POST") return json({ detail: "Method not allowed" }, 405);
  const apiKey = process.env.RESEND_API_KEY;
  const sender = process.env.REPORT_FROM_EMAIL;
  if (!apiKey || !sender) return json({ detail: "Resend report credentials are not configured" }, 503);

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ detail: "Invalid JSON body" }, 400);
  }
  const { subject, html, pdf_base64: pdfBase64, filename = "esplant-daily-summary.pdf", recipient } = body || {};
  if (!subject || !html) return json({ detail: "subject and html are required" }, 400);
  const to = recipient || process.env.REPORT_RECIPIENT_EMAIL;
  if (!to || !EMAIL_PATTERN.test(to)) return json({ detail: "A valid recipient email is required" }, 400);

  const payload = { from: sender, to: [to], subject, html };
  if (pdfBase64) payload.attachments = [{ filename, content: pdfBase64 }];

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return json({ detail: "Resend rejected the report" }, 502);
  const data = await response.json();
  return json({ sent: true, message_id: data.id || null });
};

export const config = { path: "/api/integrations/reports/send" };
