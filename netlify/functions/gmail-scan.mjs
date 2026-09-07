// POST /api/integrations/gmail/scan — scans recent e-banking/QRIS emails and returns
// normalized transaction candidates. Mirrors backend/routers/integrations.py parsing.
import { json, loadTokens, refreshAccessToken } from "./_shared/util.mjs";

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

function decodePart(part) {
  const data = part?.body?.data;
  if (data) {
    try {
      return Buffer.from(data.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf-8");
    } catch {
      return "";
    }
  }
  return (part?.parts || []).map(decodePart).join("");
}

function parseAmount(text) {
  const match = text.match(/(?:Rp\.?\s?|IDR\s?)([\d.,]+)/i);
  if (!match) return null;
  const digits = match[1].replace(/\D/g, "");
  return digits ? Number(digits) : null;
}

function parseCandidate(message) {
  const payload = message.payload || {};
  const headers = Object.fromEntries((payload.headers || []).map((item) => [String(item.name || "").toLowerCase(), item.value || ""]));
  const subject = headers.subject || "";
  const sourceText = `${subject}\n${decodePart(payload)}`;
  const amount = parseAmount(sourceText);
  if (amount === null) return null;
  let parsedDate = new Date().toISOString().slice(0, 10);
  if (headers.date) {
    const stamp = new Date(headers.date);
    if (!Number.isNaN(stamp.getTime())) parsedDate = stamp.toISOString().slice(0, 10);
  }
  const merchantMatch = sourceText.match(/(?:di|at|ke)\s+([A-Za-z0-9][A-Za-z0-9 .&'_-]{2,60})/i);
  const merchant = merchantMatch ? merchantMatch[1].replace(/[ .,-]+$/, "") : subject.slice(0, 80) || "QRIS merchant";
  const bankMatch = sourceText.match(/\b(BCA|BNI|BRI|Mandiri|Blu|Wondr|Livin|GoPay|DANA|ShopeePay|OVO)\b/i);
  const category = /kopi|makan|resto|cafe|food/i.test(sourceText) ? "Food" : "Other";
  return {
    external_id: message.id,
    merchant,
    amount,
    currency: "IDR",
    date: parsedDate,
    category,
    account_hint: bankMatch ? bankMatch[1] : null,
    source: "gmail",
  };
}

export default async (req) => {
  if (req.method !== "POST") return json({ detail: "Method not allowed" }, 405);
  let tokens = await loadTokens();
  if (!tokens) return json({ detail: "Gmail is not connected" }, 401);
  try {
    tokens = await refreshAccessToken(tokens);
  } catch {
    return json({ detail: "Stored Gmail authorization is invalid" }, 401);
  }
  const authHeaders = { authorization: `Bearer ${tokens.access_token}` };
  const query = encodeURIComponent("newer_than:90d (QRIS OR pembayaran OR transaksi)");
  const listResponse = await fetch(`${GMAIL_API}/messages?q=${query}&maxResults=50`, { headers: authHeaders });
  if (!listResponse.ok) return json({ detail: "Gmail API request failed" }, 502);
  const list = await listResponse.json();
  const candidates = [];
  for (const item of list.messages || []) {
    const messageResponse = await fetch(`${GMAIL_API}/messages/${item.id}?format=full`, { headers: authHeaders });
    if (!messageResponse.ok) continue;
    const candidate = parseCandidate(await messageResponse.json());
    if (candidate) candidates.push(candidate);
  }
  return json({ candidates, scanned: (list.messages || []).length });
};

export const config = { path: "/api/integrations/gmail/scan" };
