// DELETE /api/integrations/gmail — disconnects Gmail by removing stored tokens.
import { json, store } from "./_shared/util.mjs";

export default async (req) => {
  if (req.method !== "DELETE") return json({ detail: "Method not allowed" }, 405);
  await store().delete("gmail-tokens/default");
  return json({ connected: false });
};

export const config = { path: "/api/integrations/gmail" };
