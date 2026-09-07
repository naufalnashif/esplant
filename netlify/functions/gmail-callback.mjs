// GET /api/integrations/gmail/callback — exchanges the OAuth code and stores encrypted tokens.
import { json, redirectUri, saveTokens, siteUrl, store } from "./_shared/util.mjs";

export default async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return json({ detail: "Missing code or state" }, 400);

  const blobs = store();
  const record = await blobs.get(`oauth-state/${state}`, { type: "json" });
  await blobs.delete(`oauth-state/${state}`);
  if (!record || Date.now() - record.createdAt > 10 * 60 * 1000) {
    return json({ detail: "OAuth state expired" }, 400);
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) return json({ detail: "Google rejected the authorization code" }, 502);
  const data = await response.json();
  await saveTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + (data.expires_in || 3600) * 1000,
  });
  const origin = siteUrl();
  const html = `<script>window.opener?.postMessage({type:'esplant-gmail-connected'}, '${origin}'); window.close();</script><p>Gmail connected. You can close this window.</p>`;
  return new Response(html, { status: 200, headers: { "content-type": "text/html" } });
};

export const config = { path: "/api/integrations/gmail/callback" };
