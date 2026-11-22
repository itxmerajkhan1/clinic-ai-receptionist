// Shared Gemini helpers for the Vercel serverless routes.
// The Gemini API key NEVER appears in this repo or in any log.
// Key resolution order:
//   1. process.env.GEMINI_API_KEY (set in the Vercel dashboard)
//   2. Firebase Admin SDK (only when FIREBASE_SERVICE_ACCOUNT is set),
//      reading the admin-only Firestore doc settings/gemini
//   3. Neither → the caller returns { aiConnected: false } and the
//      client answers from its local knowledge base (expected).

export const GEMINI_MODEL = "gemini-3.5-flash-lite";
export const GEMINI_FALLBACK_MODEL = "gemini-3.5-flash";
const CHAT_TIMEOUT_MS = 10000;
const FALLBACK_TIMEOUT_MS = 8000;

export class GeminiError extends Error {
  status: number;
  apiStatus: string;
  constructor(status: number, apiStatus: string, message: string) {
    super(message);
    this.status = status;
    this.apiStatus = apiStatus;
  }
}

export function isOverloadError(e: unknown): boolean {
  if (!(e instanceof GeminiError)) return false;
  return (
    e.status === 503 ||
    e.apiStatus === "UNAVAILABLE" ||
    /high demand|overloaded/i.test(e.message)
  );
}

export async function callGeminiOnce(
  model: string,
  apiKey: string,
  system: string,
  contents: { role: "user" | "model"; text: string }[],
  maxOutputTokens: number,
  timeoutMs: number,
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: contents.map((c) => ({ role: c.role, parts: [{ text: c.text }] })),
      generationConfig: { maxOutputTokens, temperature: 0.4 },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const err =
      typeof data === "object" && data !== null && "error" in data
        ? (data as { error?: { message?: unknown; status?: unknown } }).error
        : undefined;
    throw new GeminiError(
      res.status,
      typeof err?.status === "string" ? err.status : "",
      String(err?.message ?? `Gemini error ${res.status}`),
    );
  }
  const text = (
    data as { candidates?: { content?: { parts?: { text?: string }[] } }[] } | null
  )?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  if (!text) throw new Error("Gemini returned an empty reply");
  return text;
}

/** Primary model, one retry on the fallback model only when the
 *  primary is overloaded (503 / high demand). A timeout is NOT
 *  retried — it propagates so the caller can fall back to the
 *  knowledge base at once. */
export async function callGemini(
  apiKey: string,
  system: string,
  contents: { role: "user" | "model"; text: string }[],
  maxOutputTokens = 220,
): Promise<{ text: string; modelUsed: string }> {
  try {
    const text = await callGeminiOnce(
      GEMINI_MODEL,
      apiKey,
      system,
      contents,
      maxOutputTokens,
      CHAT_TIMEOUT_MS,
    );
    return { text, modelUsed: GEMINI_MODEL };
  } catch (e) {
    if (!isOverloadError(e)) throw e;
    const text = await callGeminiOnce(
      GEMINI_FALLBACK_MODEL,
      apiKey,
      system,
      contents,
      maxOutputTokens,
      FALLBACK_TIMEOUT_MS,
    );
    return { text, modelUsed: GEMINI_FALLBACK_MODEL };
  }
}

let adminApp: unknown = null;

/** Resolve the Gemini key. Returns null when no key is configured
 *  anywhere — the caller then answers { aiConnected: false }. */
export async function resolveGeminiKey(): Promise<string | null> {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!sa) return null;
  try {
    const admin = await import("firebase-admin");
    if (!adminApp) {
      const credential = JSON.parse(sa) as Parameters<
        typeof admin.credential.cert
      >[0];
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(credential),
      });
    }
    const firestore = (adminApp as { firestore: () => unknown }).firestore() as {
      doc: (path: string) => { get: () => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }> };
    };
    const snap = await firestore.doc("settings/gemini").get();
    const key = snap.exists ? String(snap.data()?.key ?? "") : "";
    return key || null;
  } catch {
    return null;
  }
}
