// POST /api/integrations/reports/send — sends the browser-generated report through Resend.
// Security: the Resend API key never reaches the client, recipients are validated, and
// each client IP is limited to 3 report emails per UTC day (counter kept in Netlify Blobs).
import { json, store } from "./_shared/util.mjs";

const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const DAILY_LIMIT = 3;

export default async (req, context) => {
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
  if (String(subject).length > 160 || String(html).length > 200_000) return json({ detail: "Payload too large" }, 413);
  const to = recipient || process.env.REPORT_RECIPIENT_EMAIL;
  if (!to || !EMAIL_PATTERN.test(to)) return json({ detail: "A valid recipient email is required" }, 400);

  // Anti-spam rate limit: 3 emails per client IP per UTC day
  const clientIp = context?.ip || req.headers.get("x-nf-client-connection-ip") || "unknown";
  const day = new Date().toISOString().slice(0, 10);
  const rateKey = `report-rate/${day}/${clientIp}`;
  const blobs = store();
  const used = Number((await blobs.get(rateKey, { type: "text" })) || 0);
  if (used >= DAILY_LIMIT) return json({ detail: "Daily report email limit reached (3 per day)" }, 429);

  const displaySender = sender.includes("<") ? sender : `Esplant Reports <${sender}>`;
  const payload = { from: displaySender, to: [to], subject, html };
  if (pdfBase64) payload.attachments = [{ filename, content: pdfBase64 }];

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return json({ detail: "Resend rejected the report" }, 502);
  await blobs.set(rateKey, String(used + 1));
  const data = await response.json();
  return json({ sent: true, message_id: data.id || null });
};

export const config = { path: "/api/integrations/reports/send" };
