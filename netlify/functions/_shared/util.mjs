// Shared helpers for Esplant Netlify Functions.
// Files inside _shared/ are NOT registered as functions by Netlify.
import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";

export const store = () => getStore({ name: "esplant-integrations", consistency: "strong" });

const encryptionKey = () =>
  crypto.createHash("sha256").update(process.env.GOOGLE_CLIENT_SECRET || "esplant-local-secret").digest();

export function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf-8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}

export function decrypt(payload) {
  const raw = Buffer.from(payload, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf-8");
}

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

export const siteUrl = () => (process.env.URL || "").replace(/\/$/, "");

export const redirectUri = () => `${siteUrl()}/api/integrations/gmail/callback`;

export async function loadTokens() {
  const record = await store().get("gmail-tokens/default", { type: "text" });
  if (!record) return null;
  try {
    return JSON.parse(decrypt(record));
  } catch {
    return null;
  }
}

export async function saveTokens(tokens) {
  await store().set("gmail-tokens/default", encrypt(JSON.stringify(tokens)));
}

export async function refreshAccessToken(tokens) {
  if (tokens.expires_at && Date.now() < tokens.expires_at - 60_000) return tokens;
  if (!tokens.refresh_token) return tokens;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: tokens.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!response.ok) throw new Error("Unable to refresh Gmail access token");
  const data = await response.json();
  const next = { ...tokens, access_token: data.access_token, expires_at: Date.now() + (data.expires_in || 3600) * 1000 };
  await saveTokens(next);
  return next;
}
