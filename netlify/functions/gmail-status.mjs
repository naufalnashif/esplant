// GET /api/integrations/gmail/status — reports whether Gmail is connected.
import { json, loadTokens } from "./_shared/util.mjs";

export default async () => json({ connected: Boolean(await loadTokens()) });

export const config = { path: "/api/integrations/gmail/status" };
