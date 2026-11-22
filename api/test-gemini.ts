// POST /api/test-gemini — one-off Gemini key test from Admin → Settings.
// Body: { key: string } — the key comes from the admin's own browser,
// is used for ONE tiny Gemini call, and is never stored or logged.
// Success: { ok: true, model } / Failure: { ok: false, error }

import type { VercelRequest, VercelResponse } from "./_types";
import { callGeminiOnce, GEMINI_MODEL, GEMINI_FALLBACK_MODEL, isOverloadError } from "./_gemini";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const key = String(((req.body ?? {}) as { key?: unknown }).key ?? "").trim();
  if (!key) {
    res.status(400).json({ ok: false, error: "No key provided" });
    return;
  }
  const system = "You are a test. Reply with exactly the word OK.";
  try {
    const text = await callGeminiOnce(
      GEMINI_MODEL,
      key,
      system,
      [{ role: "user", text: "Say OK" }],
      10,
      10000,
    );
    res.status(200).json({ ok: true, model: GEMINI_MODEL, reply: text });
  } catch (e) {
    if (isOverloadError(e)) {
      try {
        const text = await callGeminiOnce(
          GEMINI_FALLBACK_MODEL,
          key,
          system,
          [{ role: "user", text: "Say OK" }],
          10,
          8000,
        );
        res.status(200).json({ ok: true, model: GEMINI_FALLBACK_MODEL, reply: text });
        return;
      } catch {
        /* fall through to the failure response */
      }
    }
    const message =
      e instanceof Error ? e.message : "Gemini did not answer";
    res.status(200).json({ ok: false, error: message });
  }
}
