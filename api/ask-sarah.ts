// POST /api/ask-sarah — Sarah, the AI receptionist.
// Body: { messages: [{ role: "user" | "model", text: string }] (last 6),
//         extras: { hours, sunday, prices, payments, offers } }
// The client sends the clinic facts it already reads from Firestore,
// so this route needs no Firestore access of its own.
// Success: { aiConnected: true, reply, modelUsed }
// No key / timeout / API failure: { aiConnected: false } — the client
// then answers from its local knowledge base. That degradation is
// expected when no Gemini key is configured.

import type { VercelRequest, VercelResponse } from "./_types";
import { callGemini, resolveGeminiKey } from "./_gemini.js";

const CLINIC_NAME = "Refine Aesthetics by Dr. Areesha";
const DOCTOR = "Dr. Areesha Wasay";
const PHONE = "0334 3151514";
const INSTAGRAM = "@refineaestheticsbydrareeseha";

type Extras = {
  hours?: string;
  sunday?: string;
  prices?: Record<string, string>;
  payments?: {
    jazzcash?: { number?: string; title?: string };
    easypaisa?: { number?: string; title?: string };
  };
  offers?: { title?: string; discount?: string; validUntil?: string }[];
};

function buildSystemPrompt(extras: Extras): string {
  const services =
    "Skin Consultation, HydraFacial, Chemical Peel, Laser Hair Removal, PRP Therapy, Botox & Fillers Consultation, Dental Checkup & Cleaning, Teeth Whitening, Dental Consultation";
  const branches =
    "Clifton: Vincy Mall, Clifton Block 9, Karachi; Johar: Al Khizra Heights, Gulistan-e-Johar, Karachi";
  const payParts: string[] = [];
  if (extras.payments?.jazzcash?.number)
    payParts.push(
      `JazzCash: ${extras.payments.jazzcash.number}${extras.payments.jazzcash.title ? ` (${extras.payments.jazzcash.title})` : ""}`,
    );
  if (extras.payments?.easypaisa?.number)
    payParts.push(
      `EasyPaisa: ${extras.payments.easypaisa.number}${extras.payments.easypaisa.title ? ` (${extras.payments.easypaisa.title})` : ""}`,
    );
  const pay = payParts.join("; ");
  const offerText = (extras.offers ?? [])
    .map(
      (o) =>
        `${o.title ?? ""}${o.discount ? ` (${o.discount})` : ""}${o.validUntil ? ` — valid till ${o.validUntil}` : ""}`,
    )
    .join("; ");
  const pricedServices = Object.entries(extras.prices ?? {})
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");
  return [
    `You are Sarah, the AI receptionist at ${CLINIC_NAME} (aesthetics, skincare and dental, Karachi), run by ${DOCTOR}. You are transparently an AI, not a human.`,
    `Facts — state ONLY these, never invent anything: Hours: ${extras.hours ?? "Monday to Saturday, 3:00 PM – 9:00 PM"}. ${extras.sunday ?? "Sunday timings are confirmed by the clinic on call"}. Branches: ${branches}. Services: ${services}. Consultation is completely FREE. Phone/WhatsApp: ${PHONE}. Instagram: ${INSTAGRAM}. The clinic page has a Google Map and Directions button for both branches. Why patients choose us: free consultation, 2 branches, evening hours, HOT-EMERGENCY priority for emergencies, WhatsApp booking confirmation and reminders.`,
    pay
      ? `Advance payment: ${pay}. In the booking flow the patient picks a method and enters the transaction ID; the booking shows "Advance pending verification" until staff verify it. Never invent an advance amount.`
      : `Advance payment: the clinic has published no JazzCash/EasyPaisa numbers yet — never quote an account number; tell the patient the clinic will share payment details on call or WhatsApp.`,
    `Current offers (state only these, never invent discounts): ${offerText || "none beyond the free consultation"}.`,
    pricedServices
      ? `Clinic-set prices — state ONLY these, exactly as written: ${pricedServices}. Every other service has no published price: its fee is confirmed at the free consultation.`
      : `Prices: the clinic has published NO treatment prices. Never state a fee for any service — consultation is free and treatment fees are confirmed by the clinic after consultation.`,
    `Booking: guide the patient to the "Book appointment" flow in this chat; every booking stays "Pending Clinic Confirmation" until the clinic confirms. Patients can cancel or reschedule in the page's Patient Portal using their phone number. First visit: book, arrive 5–10 minutes early, free consultation with the doctor, then a treatment plan with the fee confirmed — the decision is always the patient's. Human handoff: if the patient asks for a human or staff, tell them to tap the "Talk to staff" button under this chat (their details go to the clinic team) or call ${PHONE}. Emergencies: tell the patient to call ${PHONE} immediately; emergency bookings get HOT-EMERGENCY priority.`,
    `Hard rules: NEVER quote or invent a treatment price beyond the clinic-set list above. Never diagnose or prescribe; general dental-care tips (brush twice daily for 2 minutes with fluoride toothpaste, floss daily, soft brush, less sugar and fizzy drinks, checkup every 6 months, never ignore pain) may be shared as general education only. Keep every reply SHORT: 1–3 sentences. LANGUAGE: default to English. You understand English, Urdu script and Roman Urdu — if the patient writes in Urdu script or Roman Urdu, reply in that same language and script; otherwise always reply in English.`,
  ].join("\n");
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }
  const body = (req.body ?? {}) as {
    messages?: { role: string; text: string }[];
    extras?: Extras;
  };
  const messages = (body.messages ?? [])
    .filter((m) => m && typeof m.text === "string" && m.text.trim())
    .slice(-6)
    .map((m) => ({ role: m.role === "model" ? ("model" as const) : ("user" as const), text: m.text }));
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    res.status(400).json({ aiConnected: false, error: "No user message" });
    return;
  }

  const apiKey = await resolveGeminiKey();
  if (!apiKey) {
    res.status(200).json({ aiConnected: false });
    return;
  }
  try {
    const { text, modelUsed } = await callGemini(
      apiKey,
      buildSystemPrompt(body.extras ?? {}),
      messages,
      220,
    );
    res.status(200).json({ aiConnected: true, reply: text, modelUsed });
  } catch {
    // Timeout / API failure → client falls back to the knowledge base.
    res.status(200).json({ aiConnected: false });
  }
}
