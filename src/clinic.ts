// Clinic facts — the ONLY facts this app may state.
// Source: Refine Aesthetics by Dr. Areesha Wasay, Karachi.
// Treatment fees are never invented: consultation is FREE and every
// treatment fee is "Confirmed at consultation" unless the admin has
// explicitly set a price in Settings.

export const CLINIC = {
  name: "Refine Aesthetics by Dr. Areesha",
  doctor: "Dr. Areesha Wasay",
  tagline: "Aesthetics · Skincare · Dental — Karachi",
  consultation: "Consultation is completely FREE",
  bookingPhone: "0334 3151514",
  bookingPhoneWa: "923343151514",
  instagram: "@refineaestheticsbydrareeseha",
  instagramUrl: "https://www.instagram.com/refineaestheticsbydrareeseha/",
  branches: [
    {
      name: "Clifton",
      address: "Vincy Mall, Clifton Block 9, Karachi",
      mapQuery: "Vincy Mall, Clifton Block 9, Karachi",
    },
    {
      name: "Johar",
      address: "Al Khizra Heights, Gulistan-e-Johar, Karachi",
      mapQuery: "Al Khizra Heights, Gulistan-e-Johar, Karachi",
    },
  ],
  // Admin-saved hours (seed defaults). NOT 10 PM — the admin-saved
  // close is 9:00 PM.
  defaultHoursLabel: "Monday to Saturday, 3:00 PM – 9:00 PM",
  defaultOpenHour: 15,
  defaultCloseHour: 21,
  sundayNote: "Sunday timings are confirmed by the clinic on call",
  adminEmail: "itxmerajkhan3109@gmail.com",
} as const;

export type BranchName = "Clifton" | "Johar";

export const SERVICES: {
  name: string;
  category: "Skincare" | "Aesthetics" | "Dental";
  description: string;
  whoFor: string;
  duration: string;
  includes: string[];
}[] = [
  {
    name: "Skin Consultation",
    category: "Skincare",
    description:
      "The doctor examines your skin in detail — skin type, concerns and the products you already use — and recommends the right treatment plan.",
    whoFor:
      "Anyone who wants a proper diagnosis and plan for acne, pigmentation, dull skin or any other skin concern.",
    duration: "Typically 20–30 minutes",
    includes: [
      "Full skin examination by the doctor",
      "Review of the products and routine you already use",
      "A personalised treatment plan",
      "Treatment fee confirmed in full before you decide",
    ],
  },
  {
    name: "HydraFacial",
    category: "Skincare",
    description:
      "A gentle, multi-step facial that deep-cleanses, exfoliates and hydrates the skin — fresh, glowing skin with no downtime.",
    whoFor:
      "For dull, dry or tired-looking skin; also ideal before an event when you want an instant glow.",
    duration: "Typically 45–60 minutes",
    includes: [
      "Deep cleanse and gentle exfoliation",
      "Hydration with nourishing serums",
      "No downtime — you can resume your day right away",
    ],
  },
  {
    name: "Chemical Peel",
    category: "Skincare",
    description:
      "A special solution is applied to the skin that gently lifts the top dead layer, so clearer, fresher skin shows underneath.",
    whoFor:
      "For pigmentation, acne marks, uneven skin tone and fine lines — the doctor first checks your skin and decides the peel type.",
    duration: "Typically 30–45 minutes",
    includes: [
      "Skin assessment before the peel",
      "Peel type matched to your skin concern by the doctor",
      "Aftercare guidance after the session",
    ],
  },
  {
    name: "Laser Hair Removal",
    category: "Aesthetics",
    description:
      "Laser light targets unwanted hair follicles, so hair growth reduces over time. One area is treated per session.",
    whoFor:
      "For people tired of waxing or shaving who want long-term hair reduction.",
    duration: "15–60 minutes per session, depending on the area",
    includes: [
      "One area treated per session",
      "Suitability check by the doctor",
      "Guidance on how many sessions your area usually needs",
    ],
  },
  {
    name: "PRP Therapy",
    category: "Aesthetics",
    description:
      "Platelet-rich plasma is prepared from the patient's own blood and applied to the skin or scalp, supporting natural healing and growth.",
    whoFor:
      "For anyone wanting a natural approach for hair fall or skin rejuvenation — the doctor first checks suitability.",
    duration: "Typically 45–60 minutes",
    includes: [
      "PRP prepared from your own blood",
      "Applied to the skin or scalp as planned with the doctor",
      "Suitability check before the session",
    ],
  },
  {
    name: "Botox & Fillers Consultation",
    category: "Aesthetics",
    description:
      "A detailed consultation with the doctor — a plan for botox or fillers based on your facial features and goals. This visit is consultation only.",
    whoFor:
      "For anyone wanting expert advice about wrinkles, fine lines or facial volume.",
    duration: "Typically 20–30 minutes",
    includes: [
      "Detailed consultation with the doctor",
      "A plan based on your facial features and goals",
      "Consultation only — no treatment in this visit",
    ],
  },
  {
    name: "Dental Checkup & Cleaning",
    category: "Dental",
    description:
      "A full mouth examination with professional scaling and polishing — plaque and tartar are cleaned and the health of your teeth and gums is checked.",
    whoFor:
      "For everyone — dentists generally recommend a checkup and cleaning every 6 months.",
    duration: "Typically 30–45 minutes",
    includes: [
      "Full mouth examination",
      "Professional scaling and polishing",
      "Teeth and gum health check",
    ],
  },
  {
    name: "Teeth Whitening",
    category: "Dental",
    description:
      "A professional whitening treatment that reduces stains from tea, coffee and time, and brightens your smile.",
    whoFor:
      "For yellow or stained teeth when you want a brighter smile — suitability is confirmed with a dental checkup first.",
    duration: "Typically 45–60 minutes",
    includes: [
      "Professional whitening treatment",
      "Dental checkup first to confirm suitability",
      "Guidance on keeping your smile bright afterwards",
    ],
  },
  {
    name: "Dental Consultation",
    category: "Dental",
    description:
      "The doctor's assessment and treatment plan for pain, a cavity, sensitivity or any dental problem — the first step before any treatment begins.",
    whoFor:
      "For tooth pain, a cavity, a broken tooth or any dental concern.",
    duration: "Typically 20–30 minutes",
    includes: [
      "The doctor's assessment of your concern",
      "Treatment plan explained in detail",
      "Fee confirmed before any treatment begins",
    ],
  },
];

export const FAQS: { q: string; a: string }[] = [
  {
    q: "Is the consultation really free?",
    a: "Yes — your first consultation is completely free. The doctor examines you and explains the treatment plan; there are no charges.",
  },
  {
    q: "How do I book an appointment?",
    a: "Three ways: (1) use the booking form on this page, (2) message us on WhatsApp, or (3) call 0334 3151514. After booking, the status stays 'Pending Clinic Confirmation' until the clinic confirms.",
  },
  {
    q: "What are the clinic timings?",
    a: "Monday to Saturday, 3:00 PM to 9:00 PM. Sunday timings are confirmed by the clinic on call — ask on 0334 3151514.",
  },
  {
    q: "Where are the branches?",
    a: "Two branches: Clifton — Vincy Mall, Clifton Block 9, Karachi; and Johar — Al Khizra Heights, Gulistan-e-Johar, Karachi. The page has a Google Map and a Directions button for both branches.",
  },
  {
    q: "How much does a treatment cost?",
    a: "The consultation is free. The exact fee for each treatment is confirmed by the clinic after the doctor's consultation — fees vary by patient, skin/dental condition and number of sessions, so no price is quoted in advance.",
  },
  {
    q: "How is my booking confirmed?",
    a: "Your booking is saved with the status 'Pending Clinic Confirmation' and you get a receipt. The clinic team confirms it and lets you know — you can also confirm on WhatsApp.",
  },
  {
    q: "Can I cancel or change my booking?",
    a: "Yes. In the 'Patient Portal' section on this page, enter your mobile number — your bookings will appear; you can cancel there, or pick a new date and time to reschedule.",
  },
  {
    q: "What should I do in an emergency?",
    a: "Call 0334 3151514 immediately. Emergency bookings reach the clinic team with HOT-EMERGENCY priority so you are seen first.",
  },
  {
    q: "How does advance payment work?",
    a: "If the clinic has set JazzCash/EasyPaisa numbers, that option appears in the booking flow — choose the method and enter the transaction ID. The booking stays 'Advance pending verification' until the clinic verifies it. The clinic confirms the advance amount.",
  },
  {
    q: "Will I get a reminder before my appointment?",
    a: "Yes — the clinic sends a WhatsApp reminder to your number before your appointment. So please enter your correct mobile number when booking.",
  },
  {
    q: "Who is Sarah? Is she a real person?",
    a: "Sarah is the clinic's AI receptionist — not a human. She answers 24/7 about timings, services, branches, offers and bookings, and helps you book an appointment. For medical advice, always consult the doctor — Sarah never diagnoses or prescribes.",
  },
  {
    q: "Which doctor will I see?",
    a: "The clinic is run by Dr. Areesha Wasay — aesthetics, skincare and dental services are available at both branches. In the consultation, the doctor examines you and explains the plan.",
  },
];

export const HOW_IT_WORKS = [
  {
    title: "Chat with Sarah",
    text: "Chat with Sarah right here on this page — ask about services, timings or anything else. Sarah replies 24/7, and the booking flow starts here too.",
  },
  {
    title: "Pick your slot",
    text: "Choose your service, preferred branch (Clifton or Johar), date and time. Slots that are already booked are automatically shown as unavailable — no double booking.",
  },
  {
    title: "Confirm",
    text: "Your booking is saved with the status 'Pending Clinic Confirmation' and you get a receipt. The clinic team confirms it and lets you know; you can also confirm on WhatsApp.",
  },
  {
    title: "Visit the clinic",
    text: "Come to your branch at your appointment time — your first consultation is completely free. You also get a WhatsApp reminder before your appointment.",
  },
];

export const WHY_CHOOSE_US = [
  {
    title: "Consultation is completely FREE",
    text: "No charges for your first consultation — meet the doctor, understand your treatment plan, then decide in your own time.",
  },
  {
    title: "2 branches — Clifton and Johar",
    text: "The Clifton branch is at Vincy Mall, Clifton Block 9, and the Johar branch is at Al Khizra Heights, Gulistan-e-Johar — book whichever is closer to you.",
  },
  {
    title: "Evening hours, Mon–Sat 3–9 PM",
    text: "The clinic is open Monday to Saturday, 3:00 PM to 9:00 PM — easy to visit after office or college.",
  },
  {
    title: "Emergency care gets priority",
    text: "In an emergency such as severe pain, swelling or bleeding, your booking reaches the clinic team instantly with a HOT-EMERGENCY flag — and you can also call 0334 3151514 right away.",
  },
  {
    title: "Sarah — AI receptionist, 24/7",
    text: "Day or night, Sarah answers anytime: timings, services, branches, offers and booking — all in this chat, with no waiting on a call.",
  },
  {
    title: "Booking and reminders on WhatsApp",
    text: "Confirm your booking on WhatsApp after booking, and the clinic also sends a WhatsApp reminder before your appointment — no chance of forgetting your visit.",
  },
];

export const FIRST_VISIT = [
  {
    title: "Book your appointment first",
    text: "Book your slot by the form on this page, WhatsApp or a call (0334 3151514). Your booking is final once the clinic confirms it.",
  },
  {
    title: "Arrive at your branch on time",
    text: "It's best to arrive 5–10 minutes before your slot — Clifton (Vincy Mall) or Johar (Al Khizra Heights), whichever branch you chose.",
  },
  {
    title: "Free consultation",
    text: "The doctor examines your skin or dental health and listens to your concerns and goals. This consultation is completely free — no charges at all.",
  },
  {
    title: "You get a treatment plan",
    text: "The doctor explains the right treatment, its sessions and the full fee in detail. The clinic confirms the fee at this point — no price is quoted before this.",
  },
  {
    title: "The decision is yours",
    text: "Understand the plan and decide in your own time. Start treatment the same day or take a later appointment — there's no pressure.",
  },
];

export const DENTAL_TIPS = [
  {
    title: "Brush twice a day",
    text: "Brush in the morning and before bed at night, for at least 2 minutes, with fluoride toothpaste. Clean your tongue too — it's a major cause of bad breath.",
  },
  {
    title: "Floss every day",
    text: "A brush can't reach between your teeth. Flossing once a day removes the plaque and food stuck there — protecting you from cavities and gum disease.",
  },
  {
    title: "Soft brush, gentle hand",
    text: "Use a soft-bristle brush and don't scrub hard — a hard brush and force damage the enamel. Replace your brush every 3–4 months.",
  },
  {
    title: "Cut down on sugar and fizzy drinks",
    text: "Sugar and soft drinks cause acid attacks on your teeth. If you drink them, have them with a meal and rinse with plain water afterwards.",
  },
  {
    title: "Dental checkup every 6 months",
    text: "Even without pain, get a regular checkup and professional cleaning — small problems caught early save you a bigger treatment and a bigger bill.",
  },
  {
    title: "Don't ignore pain",
    text: "Tooth pain, swelling or bleeding doesn't fix itself. The sooner you see the doctor, the easier the treatment — in an emergency, call 0334 3151514 right away.",
  },
];

export const DOCTOR_POINTS = [
  "Aesthetics, skincare and dental — a clinic for all three services under one roof",
  "Every patient's first consultation is with the doctor herself, and it is completely free",
  "The treatment plan and fee are confirmed in detail during the consultation — no estimated price is given beforehand",
  "Services are available at both branches — Clifton (Vincy Mall, Block 9) and Johar (Al Khizra Heights)",
];

// ---------------------------------------------------------------------------
// Slot helpers
// ---------------------------------------------------------------------------

/** "3:00 PM" style label for an hour of the day (0–24). */
export function slotHourLabel(hour24: number): string {
  const h = ((hour24 + 11) % 12) + 1;
  return `${h}:00 ${hour24 % 24 >= 12 ? "PM" : "AM"}`;
}

/** Hourly slots from openHour through closeHour, INCLUSIVE. */
export function buildSlotList(openHour: number, closeHour: number): string[] {
  const out: string[] = [];
  for (let h = openHour; h <= closeHour; h++) out.push(slotHourLabel(h));
  return out;
}

export function isSunday(dateStr: string): boolean {
  return new Date(`${dateStr}T12:00:00`).getDay() === 0;
}

export function karachiToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function prettyDate(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Normalises a Pakistani mobile number to wa.me digits (92…). */
export function waDigits(phone: string): string {
  let d = phone.replace(/\D/g, "");
  if (d.startsWith("0")) d = `92${d.slice(1)}`;
  if (d.startsWith("3") && d.length === 10) d = `92${d}`;
  return d;
}

const EMERGENCY_WORDS = [
  "emergency",
  "severe pain",
  "bleeding",
  "swelling",
  "accident",
  "urgent",
  "bohat dard",
  "khoon",
  "soojan",
  "daant toot",
];

export function hasEmergency(text: string): boolean {
  const t = text.toLowerCase();
  return EMERGENCY_WORDS.some((w) => t.includes(w));
}

// ---------------------------------------------------------------------------
// Sarah knowledge base (client-side fallback — used when /api/ask-sarah
// reports aiConnected: false, i.e. no Gemini key is configured, Gemini
// timed out, or the API call failed). Mirrors the server prompt facts.
// ---------------------------------------------------------------------------

export type KbExtras = {
  hours: string;
  sunday: string;
  prices: Record<string, string>;
  payments: { jazzcash: { number: string; title: string }; easypaisa: { number: string; title: string } };
  offers: { title: string; discount: string; validUntil: string }[];
};

function paymentSummary(p: KbExtras["payments"]): string {
  const parts: string[] = [];
  if (p.jazzcash.number)
    parts.push(`JazzCash: ${p.jazzcash.number}${p.jazzcash.title ? ` (${p.jazzcash.title})` : ""}`);
  if (p.easypaisa.number)
    parts.push(`EasyPaisa: ${p.easypaisa.number}${p.easypaisa.title ? ` (${p.easypaisa.title})` : ""}`);
  return parts.join("; ");
}

export function knowledgeBaseAnswer(raw: string, extras: KbExtras): string {
  const t = raw.toLowerCase();
  if (hasEmergency(raw)) {
    return `This sounds like an emergency — please call ${CLINIC.bookingPhone} right away. Emergency cases get a priority slot and the clinic team receives a HOT-EMERGENCY alert.`;
  }
  if (/(whatsapp|whats app|message kar|chat kar)/.test(t)) {
    return `You can also message the clinic on WhatsApp: ${CLINIC.bookingPhone} — or tap the WhatsApp button at the bottom of this page. After booking, you also get a confirmation on WhatsApp and a reminder before your appointment.`;
  }
  if (/(advance|jazzcash|easypaisa|easy paisa|payment|pay kar|online pay)/.test(t)) {
    const pay = paymentSummary(extras.payments);
    return pay
      ? `You can pay an advance during booking: ${pay}. Choose the method and enter the transaction ID — the booking stays "Advance pending verification" until the clinic verifies it. The clinic confirms the advance amount.`
      : `The clinic has not published its JazzCash/EasyPaisa numbers on this page yet — for details, call or WhatsApp ${CLINIC.bookingPhone}.`;
  }
  if (/(offer|deal|discount|package|sale)/.test(t)) {
    const list = extras.offers
      .map((o) => `${o.title}${o.discount ? ` (${o.discount})` : ""}${o.validUntil ? `, valid till ${o.validUntil}` : ""}`)
      .join("; ");
    return list
      ? `These offers are currently on: ${list}. I can't invent any other discount — and the consultation is completely free.`
      : `The consultation is completely free — apart from that, no offer is currently active.`;
  }
  if (/(how it works|procedure|booking kaise|book karne ka|step|tareeqa)/.test(t)) {
    return `Booking takes 4 steps: 1) Chat — talk to Sarah in this chat. 2) Pick a slot — choose the service, branch, date and time (booked slots automatically show as unavailable). 3) Confirm — the booking is saved as "Pending Clinic Confirmation" and you get a receipt; you can also confirm on WhatsApp. 4) Visit the clinic — come to your branch at your time; your first consultation is completely free.`;
  }
  if (/(first visit|pehli visit|pehli dafa|first time|pehli baar|pehle visit)/.test(t)) {
    return `On your first visit: book an appointment first, then arrive at your branch at your slot time. In the free consultation the doctor examines your skin/dental health and confirms the treatment plan along with the full fee — there are no charges for the consultation. The decision is yours: start treatment the same day or take a later appointment.`;
  }
  if (/(tip|brush|floss|dental care|daant.*(saaf|khyal|care)|care tip)/.test(t)) {
    return `General dental care tips: brush twice a day (morning and night) for 2 minutes with fluoride toothpaste; floss once a day; use a soft brush with a gentle hand and replace it every 3–4 months; cut down on sugar and fizzy drinks; and get a dental checkup every 6 months even if nothing hurts. If you have pain, swelling or bleeding, don't ignore it — see the clinic.`;
  }
  if (/(why|kyun|choose|khubi|khaas|faida|best)/.test(t)) {
    return `Why patients choose Refine Aesthetics: the consultation is completely FREE; there are 2 branches — Clifton and Johar; the clinic is open ${extras.hours}, which suits visits after office or college; emergencies get HOT-EMERGENCY priority; and I (Sarah, the AI receptionist) answer 24/7. You also get booking confirmation and a reminder on WhatsApp.`;
  }
  if (/(cancel|reschedule|change kar|tabdeel|date change|time change)/.test(t)) {
    return `To cancel or reschedule, enter your mobile number in the "Patient Portal" section on this page — your bookings will appear, and you can cancel there or pick a new date and time to reschedule.`;
  }
  const detailMatch = SERVICES.find((s) => {
    const firstWord = s.name.toLowerCase().split(" ")[0] ?? "";
    const named =
      t.includes(s.name.toLowerCase()) || (firstWord.length >= 5 && t.includes(firstWord));
    return (
      named &&
      /(der|duration|time lag|kya hai|kis ke liye|detail|tafseel|kaise hota|kitna time)/.test(t)
    );
  });
  if (detailMatch) {
    return `${detailMatch.name}: ${detailMatch.description} Who it's for: ${detailMatch.whoFor} Duration: ${detailMatch.duration}. The fee is confirmed by the clinic at the consultation — no price is given in advance.`;
  }
  if (/(staff|human|insaan|real person|banday se|team se baat|agent se|someone real)/.test(t)) {
    return `Of course — tap the "Talk to staff" button below this chat, enter your name and number, and your request goes to the clinic team as an AI handoff; staff will contact you themselves. For something urgent, call ${CLINIC.bookingPhone}.`;
  }
  if (/(timing|time|hour|open|close|band|khul|kab)/.test(t)) {
    return `The clinic is open ${extras.hours}. ${extras.sunday} — to confirm, call ${CLINIC.bookingPhone}.`;
  }
  if (/(price|cost|fee|fees|charge|rate|kitne|pais)/.test(t)) {
    const priced = SERVICES.filter((s) => extras.prices[s.name]).map(
      (s) => `${s.name}: ${extras.prices[s.name]}`,
    );
    if (priced.length > 0) {
      return `The consultation is completely free. The clinic has set these prices — ${priced.join("; ")}. For other services, the fee is confirmed by the clinic after the doctor's consultation.`;
    }
    return `The consultation is completely free. The exact treatment fee is confirmed by the clinic after the doctor's consultation — I can't guess a price.`;
  }
  if (/(location|address|branch|kahan|direction|map|clifton|johar|raste|pohanch)/.test(t)) {
    return `We have 2 branches: Clifton — ${CLINIC.branches[0].address}; Johar — ${CLINIC.branches[1].address}. The page has a Google Map and a Directions button for both branches — you can reach us easily from there.`;
  }
  if (/(service|treatment|facial|laser|prp|botox|filler|peel|dental|teeth|skin)/.test(t)) {
    return `Our services: ${SERVICES.map((s) => s.name).join(", ")}. The consultation is completely free — which service would you like an appointment for?`;
  }
  if (/(doctor|areesha|dermatologist|dentist|team)/.test(t)) {
    return `The clinic is run by ${CLINIC.doctor} — aesthetics, skincare and dental services are available at both branches, and your first consultation is with the doctor and completely free. For details about the rest of the team, contact ${CLINIC.bookingPhone}.`;
  }
  if (/(phone|number|contact|call)/.test(t)) {
    return `Call to book: ${CLINIC.bookingPhone}. WhatsApp is on the same number. Instagram: ${CLINIC.instagram}.`;
  }
  if (/(reminder|yaad)/.test(t)) {
    return `The clinic sends you a WhatsApp reminder before your appointment — so please enter your correct mobile number when booking.`;
  }
  if (/(book|appointment|slot|visit)/.test(t)) {
    return `For an appointment, use the "Book appointment" flow below — choose the service, branch, day and time. Every booking is "Pending Clinic Confirmation"; the clinic confirms it and lets you know.`;
  }
  if (/(salam|hello|hi|aoa|assalam)/.test(t)) {
    return `Hello! I'm Sarah, the AI receptionist at ${CLINIC.name}. Would you like to ask about timings, branches, services or an appointment?`;
  }
  return `I can help with timings, branches, services, the free consultation and appointments. Ask something specific, or call ${CLINIC.bookingPhone} directly.`;
}
