// GET /api/integrations/gmail/start — returns the Google OAuth consent URL.
import crypto from "node:crypto";
import { json, redirectUri, store } from "./_shared/util.mjs";

export default async () => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return json({ detail: "Gmail OAuth credentials are not configured" }, 503);
  }
  const state = crypto.randomBytes(24).toString("hex");
  await store().setJSON(`oauth-state/${state}`, { createdAt: Date.now() });
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "https://www.googleapis.com/auth/gmail.readonly",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return json({ authorization_url: `https://accounts.google.com/o/oauth2/v2/auth?${params}` });
};

export const config = { path: "/api/integrations/gmail/start" };
