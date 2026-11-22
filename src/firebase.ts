// Firebase layer — Firestore (SOLE data layer) + Firebase Auth.
// Project: clinic-ai-receptionist-9ec3a. The web config below is
// Firebase's PUBLIC web configuration (it identifies the project; it
// is not a secret — access is controlled by the Firestore security
// rules, published separately in the Firebase console).
//
// Firestore collections:
// - bookings/{id}        — appointments (list = admin only; a single
//                          doc can be fetched by its unguessable ID
//                          for the receipt / Patient Portal)
// - availability/{branch}_{date} — { taken: ["4:00 PM", …] } public
//                          slot availability; written inside the same
//                          transaction as the booking, so no slot can
//                          ever be double-booked
// - inquiries/{id}       — callback requests / AI handoffs
// - reviews/{id}         — public read only when status == "approved"
//                          (lowercase, per the staged security rules)
// - offers/{id}          — public read only when active == true
// - settings/clinic      — timings, Sunday note, service prices,
//                          payment accounts
// - settings/gemini      — admin-only Gemini API key (admin-only
//                          read/write per the rules file)
// - settings/doctors     — doctor list (admin-managed)
// - settings/site-content — website content the admin edits from the
//                          "Website Content" tab (headings, clinic
//                          identity, FAQs, lists, gallery, hero image).
//                          Pictures are image LINKS the admin pastes
//                          (e.g. a Google Drive share link) — no
//                          Firebase Storage, no Blaze upgrade.
//
// Real-time: reads below are onSnapshot subscriptions, so a change on
// any device appears everywhere immediately. There is NO fallback
// database — Firestore is the only store.

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  runTransaction,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
  type DocumentData,
} from "firebase/firestore";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  type User,
} from "firebase/auth";
import { useEffect, useState } from "react";
import {
  CLINIC,
  FAQS,
  HOW_IT_WORKS,
  WHY_CHOOSE_US,
  FIRST_VISIT,
  DENTAL_TIPS,
  DOCTOR_POINTS,
  buildSlotList,
  isSunday,
  karachiToday,
  hasEmergency,
  waDigits,
} from "./clinic";

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBq409a6njtCBpuWhkX2Z1iJ4v-_On0VMo",
  authDomain: "clinic-ai-receptionist-9ec3a.firebaseapp.com",
  projectId: "clinic-ai-receptionist-9ec3a",
  storageBucket: "clinic-ai-receptionist-9ec3a.firebasestorage.app",
  messagingSenderId: "381385691825",
  appId: "1:381385691825:web:489b900071a76458600890",
};

const app = initializeApp(FIREBASE_CONFIG);
export const db = getFirestore(app);
export const auth = getAuth(app);

/** The one admin identity: the admin account's email. */
export const ADMIN_EMAIL = CLINIC.adminEmail;
export function isAdminUser(u: User | null): boolean {
  return !!u && u.email === ADMIN_EMAIL && u.emailVerified;
}

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type BookingStatus =
  | "Pending"
  | "Confirmed"
  | "Cancelled"
  | "Completed"
  | "Rescheduled"
  | "No-show";

export type Booking = {
  id: string;
  patientName: string;
  phone: string;
  service: string;
  branch: string;
  date: string;
  timeSlot: string;
  status: BookingStatus;
  priority: "Normal" | "HOT-EMERGENCY";
  notes: string;
  doctorPreference: string;
  advanceMethod: "None" | "JazzCash" | "EasyPaisa";
  advanceTxnId: string;
  advanceStatus: "None" | "Pending verification" | "Verified";
  rescheduledFromId: string | null;
  createdAt: string;
  createdAtMs: number;
};

export type Review = {
  id: string;
  patientName: string;
  service: string;
  rating: number;
  text: string;
  // Lowercase in Firestore — the security rules only treat
  // status == 'approved' as publicly readable.
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

export type Offer = {
  id: string;
  title: string;
  description: string;
  discount: string;
  validUntil: string;
  active: boolean;
  createdAt: string;
};

export type Inquiry = {
  id: string;
  name: string;
  phone: string;
  message: string;
  source: string;
  status: "New" | "Contacted" | "Resolved";
  createdAt: string;
};

export type ClinicSettings = {
  hours: string;
  sunday: string;
  openHour: number;
  closeHour: number;
  prices: Record<string, string>;
  jazzcashNumber: string;
  jazzcashTitle: string;
  easypaisaNumber: string;
  easypaisaTitle: string;
  updatedAtMs: number;
  paymentsUpdatedAtMs: number;
};

export type DoctorRow = {
  id: string;
  name: string;
  role: string;
  note: string;
};

/** Seed defaults — written on first admin sign-in ONLY when the
 *  settings doc does not exist yet. No test data is ever seeded. */
export const SEED_SETTINGS: ClinicSettings = {
  hours: CLINIC.defaultHoursLabel,
  sunday: CLINIC.sundayNote,
  openHour: CLINIC.defaultOpenHour,
  closeHour: CLINIC.defaultCloseHour,
  prices: {},
  jazzcashNumber: "03265877959",
  jazzcashTitle: "Muhammed Mubeen khan",
  easypaisaNumber: "03265877959",
  easypaisaTitle: "Muhammed Mubeen khan",
  updatedAtMs: Date.now(),
  paymentsUpdatedAtMs: Date.now(),
};

export const SEED_OFFER: Omit<Offer, "id" | "createdAt"> = {
  title: "Free Consultation",
  description:
    "Your first consultation is completely free — meet the doctor, discuss your treatment plan, no charges at all.",
  discount: "100% FREE",
  validUntil: "",
  active: true,
};

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

export function shortRef(id: string): string {
  return id.length > 8 ? id.slice(-6).toUpperCase() : id;
}

function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function docToBooking(id: string, d: DocumentData): Booking {
  const createdAt = str(d.createdAt, new Date().toISOString());
  return {
    id,
    // Field aliases: the staged Firestore rules validate `name` and
    // `time` on create; the app reads either spelling.
    patientName: str(d.patientName) || str(d.name),
    phone: str(d.phone),
    service: str(d.service),
    branch: str(d.branch),
    date: str(d.date),
    timeSlot: str(d.timeSlot) || str(d.time),
    status: (str(d.status, "Pending") as BookingStatus) || "Pending",
    priority: d.priority === "HOT-EMERGENCY" ? "HOT-EMERGENCY" : "Normal",
    notes: str(d.notes),
    doctorPreference: str(d.doctorPreference),
    advanceMethod:
      d.advanceMethod === "JazzCash" || d.advanceMethod === "EasyPaisa"
        ? d.advanceMethod
        : "None",
    advanceTxnId: str(d.advanceTxnId),
    advanceStatus:
      d.advanceStatus === "Pending verification" || d.advanceStatus === "Verified"
        ? d.advanceStatus
        : "None",
    rescheduledFromId:
      d.rescheduledFromId != null ? String(d.rescheduledFromId) : null,
    createdAt,
    createdAtMs: num(d.createdAtMs, Date.parse(createdAt) || Date.now()),
  };
}

function docToReview(id: string, d: DocumentData): Review {
  const raw = str(d.status, "pending").toLowerCase();
  return {
    id,
    patientName: str(d.patientName) || str(d.name),
    service: str(d.service),
    rating: num(d.rating, 5),
    text: str(d.text),
    // Review status is lowercase in Firestore: the staged security
    // rules only treat status == 'approved' as publicly readable.
    status: raw === "approved" || raw === "rejected" ? raw : "pending",
    createdAt: str(d.createdAt, new Date().toISOString()),
  };
}

function docToOffer(id: string, d: DocumentData): Offer {
  return {
    id,
    title: str(d.title),
    description: str(d.description),
    discount: str(d.discount),
    validUntil: str(d.validUntil),
    active: d.active === true,
    createdAt: str(d.createdAt, new Date().toISOString()),
  };
}

function docToInquiry(id: string, d: DocumentData): Inquiry {
  return {
    id,
    name: str(d.name),
    phone: str(d.phone),
    message: str(d.message),
    source: str(d.source, "Callback request"),
    status:
      d.status === "Contacted" || d.status === "Resolved" ? d.status : "New",
    createdAt: str(d.createdAt, new Date().toISOString()),
  };
}

export function reminderUrl(b: Booking): string {
  const text =
    `Hello ${b.patientName}, this is a reminder from Refine Aesthetics: ` +
    `your ${b.service} appointment is on ${b.date} at ${b.timeSlot} at the ${b.branch} branch. ` +
    `Status: ${b.status}. If anything changes, just reply on this number. Thank you!`;
  return `https://wa.me/${waDigits(b.phone)}?text=${encodeURIComponent(text)}`;
}

export function whatsappConfirmUrl(b: Booking): string {
  const text =
    `Hello Refine Aesthetics, I would like to confirm my appointment.\n` +
    `Booking ref: ${shortRef(b.id)}\nName: ${b.patientName}\nService: ${b.service}\n` +
    `Branch: ${b.branch}\nDate: ${b.date}\nTime: ${b.timeSlot}\n` +
    `Status: Pending — Clinic Confirmation`;
  return `https://wa.me/${CLINIC.bookingPhoneWa}?text=${encodeURIComponent(text)}`;
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export type AuthState = {
  status: "loading" | "out" | "unverified" | "in" | "not-admin";
  user: User | null;
};

export function useAuth(): AuthState {
  const [state, setState] = useState<AuthState>({ status: "loading", user: null });
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) setState({ status: "out", user: null });
      else if (u.email !== ADMIN_EMAIL) setState({ status: "not-admin", user: u });
      else if (!u.emailVerified) setState({ status: "unverified", user: u });
      else setState({ status: "in", user: u });
    });
    return unsub;
  }, []);
  return state;
}

function authErrorMessage(e: unknown): string {
  const code =
    e && typeof e === "object" && "code" in e ? String((e as { code: unknown }).code) : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Email or password is incorrect — please check and try again.";
    case "auth/email-already-in-use":
      return "An account with this email already exists — use Sign in instead.";
    case "auth/weak-password":
      return "That password is too weak — use at least 6 characters.";
    case "auth/invalid-email":
      return "That email address doesn't look valid.";
    case "auth/too-many-requests":
      return "Too many attempts — please wait a few minutes and try again.";
    case "auth/network-request-failed":
      return "Network problem — check your connection and try again.";
    case "auth/operation-not-allowed":
      return "Email/Password sign-in is not enabled for this Firebase project.";
    default:
      return e instanceof Error ? e.message : "Something went wrong — please try again.";
  }
}

export async function fbSignIn(email: string, password: string): Promise<void> {
  try {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  } catch (e) {
    throw new Error(authErrorMessage(e));
  }
}

export async function fbSignUp(email: string, password: string): Promise<void> {
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await sendEmailVerification(cred.user);
  } catch (e) {
    throw new Error(authErrorMessage(e));
  }
}

export async function fbSendPasswordReset(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email.trim());
  } catch (e) {
    throw new Error(authErrorMessage(e));
  }
}

export async function fbResendVerification(): Promise<void> {
  const u = auth.currentUser;
  if (!u) throw new Error("You are not signed in.");
  try {
    await sendEmailVerification(u);
  } catch (e) {
    throw new Error(authErrorMessage(e));
  }
}

export async function fbRefreshUser(): Promise<boolean> {
  const u = auth.currentUser;
  if (!u) return false;
  try {
    await u.reload();
  } catch {
    /* keep cached state */
  }
  return !!auth.currentUser?.emailVerified;
}

export async function fbSignOut(): Promise<void> {
  await signOut(auth);
}

/* ------------------------------------------------------------------ */
/* Settings + seeding (first admin sign-in only)                       */
/* ------------------------------------------------------------------ */

export function useClinicSettings(): {
  settings: ClinicSettings | null;
  loading: boolean;
  error: string | null;
} {
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "settings", "clinic"),
      (snap) => {
        setLoading(false);
        if (!snap.exists()) {
          setSettings(null);
          return;
        }
        const d = snap.data();
        setSettings({
          hours: str(d.hours, CLINIC.defaultHoursLabel),
          sunday: str(d.sunday, CLINIC.sundayNote),
          openHour: num(d.openHour, CLINIC.defaultOpenHour),
          closeHour: num(d.closeHour, CLINIC.defaultCloseHour),
          prices:
            d.prices && typeof d.prices === "object"
              ? (d.prices as Record<string, string>)
              : {},
          jazzcashNumber: str(d.jazzcashNumber),
          jazzcashTitle: str(d.jazzcashTitle),
          easypaisaNumber: str(d.easypaisaNumber),
          easypaisaTitle: str(d.easypaisaTitle),
          updatedAtMs: num(d.updatedAtMs, 0),
          paymentsUpdatedAtMs: num(d.paymentsUpdatedAtMs, 0),
        });
        setError(null);
      },
      (e) => {
        setLoading(false);
        setError(e.message);
      },
    );
    return unsub;
  }, []);
  return { settings, loading, error };
}

/** Seed defaults the first time the admin signs in, only if the docs
 *  do not exist yet. Never overwrites, never seeds test data. */
export async function seedDefaultsIfMissing(): Promise<void> {
  const clinicRef = doc(db, "settings", "clinic");
  const snap = await getDoc(clinicRef);
  if (!snap.exists()) {
    await setDoc(clinicRef, { ...SEED_SETTINGS, createdAt: serverTimestamp() });
  }
  const offersSnap = await getDocs(
    query(collection(db, "offers"), limit(1)),
  );
  if (offersSnap.empty) {
    await addDoc(collection(db, "offers"), {
      ...SEED_OFFER,
      createdAt: new Date().toISOString(),
    });
  }
}

export async function saveClinicSettings(
  patch: Partial<ClinicSettings> & { payments?: boolean },
): Promise<void> {
  const { payments, ...rest } = patch;
  const data: Record<string, unknown> = { ...rest };
  if (payments) data.paymentsUpdatedAtMs = Date.now();
  else data.updatedAtMs = Date.now();
  await setDoc(doc(db, "settings", "clinic"), data, { merge: true });
}

/* ------------------------------------------------------------------ */
/* Website content (Admin "Website Content" tab)                       */
/*                                                                     */
/* One Firestore doc, settings/site-content, holds everything the      */
/* admin can change about the public site: headings, clinic identity,  */
/* FAQ / content lists, the hero image and the gallery. The patient    */
/* page reads it live and falls back to the clinic.ts defaults for     */
/* any field the admin has never saved, so the site never renders      */
/* blank. Firestore rules already allow public get + admin-only write  */
/* on settings/{docId} (except settings/gemini), so no rules change    */
/* is needed for this doc. Pictures are image LINKS the admin pastes   */
/* (a Google Drive share link is converted to a direct image URL) —    */
/* there is no Firebase Storage on this project (Spark plan).          */
/* ------------------------------------------------------------------ */

export type GalleryImage = { url: string; title: string };
export type FaqItem = { q: string; a: string };
export type TitleTextItem = { title: string; text: string };

export type SiteHeadings = {
  howItWorks: string;
  treatments: string;
  pricing: string;
  whyUs: string;
  firstVisit: string;
  gallery: string;
  reviews: string;
  dentalTips: string;
  faq: string;
  booking: string;
  portal: string;
};

export type SiteContent = {
  clinicName: string;
  tagline: string;
  heroHeading: string;
  heroSub: string;
  heroImageUrl: string;
  doctorName: string;
  consultationLine: string;
  bookingPhone: string;
  bookingPhoneWa: string;
  instagram: string;
  instagramUrl: string;
  sundayNote: string;
  headings: SiteHeadings;
  gallery: GalleryImage[];
  faqs: FaqItem[];
  howItWorks: TitleTextItem[];
  whyChooseUs: TitleTextItem[];
  firstVisit: TitleTextItem[];
  dentalTips: TitleTextItem[];
  doctorPoints: string[];
  updatedAtMs: number;
};

export const DEFAULT_SITE_CONTENT: SiteContent = {
  clinicName: CLINIC.name,
  tagline: CLINIC.tagline,
  heroHeading: "Aesthetics, skincare & dental — with a free consultation.",
  heroSub: `Refine Aesthetics by ${CLINIC.doctor}, Karachi. Evening hours, two branches, and Sarah — our AI receptionist — answering 24/7.`,
  heroImageUrl: "",
  doctorName: CLINIC.doctor,
  consultationLine: CLINIC.consultation,
  bookingPhone: CLINIC.bookingPhone,
  bookingPhoneWa: CLINIC.bookingPhoneWa,
  instagram: CLINIC.instagram,
  instagramUrl: CLINIC.instagramUrl,
  sundayNote: CLINIC.sundayNote,
  headings: {
    howItWorks: "Booking takes 4 steps",
    treatments: "Treatments at Refine Aesthetics",
    pricing: "Clear on cost, before you decide",
    whyUs: "Care that puts you first",
    firstVisit: "Your first visit",
    gallery: "A look around",
    reviews: "What patients say",
    dentalTips: "Simple habits, healthier teeth",
    faq: "Questions, answered",
    booking: "Pick your slot",
    portal: "Manage your bookings",
  },
  gallery: [
    { url: "", title: "Reception" },
    { url: "", title: "Treatment Room" },
    { url: "", title: "Dental Suite" },
  ],
  faqs: FAQS,
  howItWorks: HOW_IT_WORKS,
  whyChooseUs: WHY_CHOOSE_US,
  firstVisit: FIRST_VISIT,
  dentalTips: DENTAL_TIPS,
  doctorPoints: DOCTOR_POINTS,
  updatedAtMs: 0,
};

function asTitleText(v: unknown): TitleTextItem[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({ title: str(x.title), text: str(x.text) }))
    .filter((x) => x.title || x.text);
  return out;
}

function asFaqs(v: unknown): FaqItem[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({ q: str(x.q), a: str(x.a) }))
    .filter((x) => x.q || x.a);
  return out;
}

function asGallery(v: unknown): GalleryImage[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v
    .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
    .map((x) => ({ url: str(x.url), title: str(x.title) }))
    .filter((x) => x.url || x.title);
  return out;
}

function asStrings(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  return v.filter((x): x is string => typeof x === "string");
}

function mergeSiteContent(d: DocumentData | null): SiteContent {
  const base = DEFAULT_SITE_CONTENT;
  if (!d) return base;
  const headings = (d.headings ?? {}) as Record<string, unknown>;
  return {
    clinicName: str(d.clinicName, base.clinicName),
    tagline: str(d.tagline, base.tagline),
    heroHeading: str(d.heroHeading, base.heroHeading),
    heroSub: str(d.heroSub, base.heroSub),
    heroImageUrl: str(d.heroImageUrl, base.heroImageUrl),
    doctorName: str(d.doctorName, base.doctorName),
    consultationLine: str(d.consultationLine, base.consultationLine),
    bookingPhone: str(d.bookingPhone, base.bookingPhone),
    bookingPhoneWa: str(d.bookingPhoneWa, base.bookingPhoneWa),
    instagram: str(d.instagram, base.instagram),
    instagramUrl: str(d.instagramUrl, base.instagramUrl),
    sundayNote: str(d.sundayNote, base.sundayNote),
    headings: {
      howItWorks: str(headings.howItWorks, base.headings.howItWorks),
      treatments: str(headings.treatments, base.headings.treatments),
      pricing: str(headings.pricing, base.headings.pricing),
      whyUs: str(headings.whyUs, base.headings.whyUs),
      firstVisit: str(headings.firstVisit, base.headings.firstVisit),
      gallery: str(headings.gallery, base.headings.gallery),
      reviews: str(headings.reviews, base.headings.reviews),
      dentalTips: str(headings.dentalTips, base.headings.dentalTips),
      faq: str(headings.faq, base.headings.faq),
      booking: str(headings.booking, base.headings.booking),
      portal: str(headings.portal, base.headings.portal),
    },
    gallery: asGallery(d.gallery) ?? base.gallery,
    faqs: asFaqs(d.faqs) ?? base.faqs,
    howItWorks: asTitleText(d.howItWorks) ?? base.howItWorks,
    whyChooseUs: asTitleText(d.whyChooseUs) ?? base.whyChooseUs,
    firstVisit: asTitleText(d.firstVisit) ?? base.firstVisit,
    dentalTips: asTitleText(d.dentalTips) ?? base.dentalTips,
    doctorPoints: asStrings(d.doctorPoints) ?? base.doctorPoints,
    updatedAtMs: num(d.updatedAtMs, 0),
  };
}

/** Live site content: any save in Admin appears on the site at once. */
export function useSiteContent(): { content: SiteContent } {
  const [content, setContent] = useState<SiteContent>(DEFAULT_SITE_CONTENT);
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "settings", "site-content"),
      (snap) => setContent(mergeSiteContent(snap.exists() ? snap.data() : null)),
      () => setContent(DEFAULT_SITE_CONTENT),
    );
    return unsub;
  }, []);
  return { content };
}

export async function saveSiteContent(patch: Partial<SiteContent>): Promise<void> {
  await setDoc(
    doc(db, "settings", "site-content"),
    { ...patch, updatedAtMs: Date.now() },
    { merge: true },
  );
}

/** Turn a pasted image link into a URL an <img> can load. Google Drive
 *  share links need converting (drive.google.com/file/d/<id>/view ->
 *  drive.google.com/uc?export=view&id=<id>); direct image links pass
 *  through unchanged. The Drive file must be shared as "Anyone with
 *  the link" or visitors will not see it. */
export function toDirectImageUrl(url: string): string {
  const u = url.trim();
  const fileMatch = u.match(/drive\.google\.com\/file\/d\/([^/?#]+)/);
  if (fileMatch) return `https://drive.google.com/uc?export=view&id=${fileMatch[1]}`;
  const openMatch = u.match(/drive\.google\.com\/open\?[^#]*\bid=([^&#]+)/);
  if (openMatch) return `https://drive.google.com/uc?export=view&id=${openMatch[1]}`;
  return u;
}

/** Slot list generated from the admin-saved hours (inclusive). */
export function slotListFor(settings: ClinicSettings | null): string[] {
  if (!settings) return buildSlotList(CLINIC.defaultOpenHour, CLINIC.defaultCloseHour);
  return buildSlotList(settings.openHour, settings.closeHour);
}

/* ------------------------------------------------------------------ */
/* Availability (public slot docs, transaction-guarded)                */
/*                                                                     */
/* NOTE — rules dependency: this design needs the published Firestore  */
/* rules to allow the `availability` collection (public read; write    */
/* inside the booking transaction) and to allow patients a             */
/* status-only update of their own booking (cancel / reschedule).      */
/* The staged firestore.rules in this repo does NOT yet allow either  */
/* — see README "Firestore rules" — so until the rules worker adds    */
/* those two allowances, patient booking writes will be denied and    */
/* the Patient Portal cancel/reschedule will fail. The code below is  */
/* written for the intended rules, not the staged draft.               */
/* ------------------------------------------------------------------ */

function availDocId(branch: string, date: string): string {
  return `${branch}_${date}`;
}

export function useAvailability(
  branch: string,
  date: string,
  enabled: boolean,
): { taken: string[]; closed: boolean; loading: boolean } {
  const [taken, setTaken] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const closed = !!date && isSunday(date);
  useEffect(() => {
    if (!enabled || !date || closed) {
      setTaken([]);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      doc(db, "availability", availDocId(branch, date)),
      (snap) => {
        setLoading(false);
        const data = snap.data();
        setTaken(
          snap.exists() && Array.isArray(data?.taken) ? (data.taken as string[]) : [],
        );
      },
      () => setLoading(false),
    );
    return unsub;
  }, [branch, date, enabled, closed]);
  return { taken, closed, loading };
}

/* ------------------------------------------------------------------ */
/* Bookings — create / cancel / reschedule / live receipt               */
/* ------------------------------------------------------------------ */

export type CreateBookingInput = {
  patientName: string;
  phone: string;
  service: string;
  branch: string;
  date: string;
  timeSlot: string;
  notes: string;
  doctorPreference: string;
  emergency: boolean;
  advanceMethod: "None" | "JazzCash" | "EasyPaisa";
  advanceTxnId: string;
  settings: ClinicSettings | null;
};

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  if (isSunday(input.date)) {
    throw new Error(
      "Sunday timings are confirmed by the clinic on call — please choose another day or call 0334 3151514.",
    );
  }
  if (input.date < karachiToday()) {
    throw new Error("That date has already passed — please choose today or a future day.");
  }
  let advanceStatus: Booking["advanceStatus"] = "None";
  if (input.advanceMethod !== "None") {
    if (!input.advanceTxnId.trim()) {
      throw new Error("A transaction ID is required for advance payment.");
    }
    const configured =
      input.advanceMethod === "JazzCash"
        ? input.settings?.jazzcashNumber
        : input.settings?.easypaisaNumber;
    if (!configured) {
      throw new Error(
        "The clinic has not set a number for this payment method yet — please choose another method or call the clinic.",
      );
    }
    advanceStatus = "Pending verification";
  }
  const priority =
    input.emergency || hasEmergency(input.notes) ? "HOT-EMERGENCY" : "Normal";

  const bookingRef = doc(collection(db, "bookings"));
  const availRef = doc(db, "availability", availDocId(input.branch, input.date));
  const now = new Date();
  const fields = {
    patientName: input.patientName.trim(),
    // `name` / `time` aliases: the staged Firestore rules validate
    // these field names on booking create.
    name: input.patientName.trim(),
    phone: input.phone.trim(),
    service: input.service,
    branch: input.branch,
    date: input.date,
    timeSlot: input.timeSlot,
    time: input.timeSlot,
    status: "Pending" as const,
    priority,
    notes: input.notes.trim(),
    doctorPreference: input.doctorPreference.trim(),
    advanceMethod: input.advanceMethod,
    advanceTxnId: input.advanceTxnId.trim(),
    advanceStatus,
    rescheduledFromId: null,
    createdAt: now.toISOString(),
    createdAtMs: now.getTime(),
  };
  // One transaction: the slot is claimed AND the booking is written
  // together. If the slot is already taken, the whole write fails —
  // no double booking is possible.
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(availRef);
    const taken: string[] =
      snap.exists() && Array.isArray(snap.data()?.taken)
        ? (snap.data().taken as string[])
        : [];
    if (taken.includes(input.timeSlot)) {
      throw new Error(
        "That slot was just booked by another patient — please choose a different time.",
      );
    }
    tx.set(availRef, { taken: arrayUnion(input.timeSlot) }, { merge: true });
    tx.set(bookingRef, fields);
  });
  rememberPortalBooking(input.phone.trim(), bookingRef.id);
  return docToBooking(bookingRef.id, fields);
}

export async function cancelBooking(booking: Booking): Promise<void> {
  // One transaction: the booking is marked Cancelled AND its slot is
  // released together. If either write fails, neither lands and the
  // error reaches the caller (the UI shows it). The old two-write
  // version silently swallowed a failed slot release, which is exactly
  // what left #RGNRN1's 3:00 PM slot blocked after it was cancelled
  // on 22 Nov 2026 — a cancelled booking must never keep its slot.
  await runTransaction(db, async (tx) => {
    tx.update(doc(db, "bookings", booking.id), { status: "Cancelled" });
    tx.set(doc(db, "availability", availDocId(booking.branch, booking.date)), {
      taken: arrayRemove(booking.timeSlot),
    }, { merge: true });
  });
}

export async function rescheduleBooking(
  booking: Booking,
  date: string,
  timeSlot: string,
): Promise<Booking> {
  if (
    booking.status === "Cancelled" ||
    booking.status === "Completed" ||
    booking.status === "Rescheduled" ||
    booking.status === "No-show"
  ) {
    throw new Error(`This booking is ${booking.status} — it cannot be rescheduled.`);
  }
  if (booking.date === date && booking.timeSlot === timeSlot) {
    throw new Error("That same date and time is already booked — please choose a different slot.");
  }
  if (isSunday(date)) {
    throw new Error("Sunday timings are confirmed by the clinic on call — please choose another day.");
  }
  if (date < karachiToday()) {
    throw new Error("That date has already passed — please choose today or a future day.");
  }
  const newRef = doc(collection(db, "bookings"));
  const availRef = doc(db, "availability", availDocId(booking.branch, date));
  const now = new Date();
  const fields = {
    patientName: booking.patientName,
    name: booking.patientName,
    phone: booking.phone,
    service: booking.service,
    branch: booking.branch,
    date,
    timeSlot,
    time: timeSlot,
    status: "Pending" as const,
    priority: booking.priority,
    notes: booking.notes,
    doctorPreference: booking.doctorPreference,
    advanceMethod: booking.advanceMethod,
    advanceTxnId: booking.advanceTxnId,
    advanceStatus: booking.advanceStatus,
    rescheduledFromId: booking.id,
    createdAt: now.toISOString(),
    createdAtMs: now.getTime(),
  };
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(availRef);
    const taken: string[] =
      snap.exists() && Array.isArray(snap.data()?.taken)
        ? (snap.data().taken as string[])
        : [];
    if (taken.includes(timeSlot)) {
      throw new Error("That slot has been taken by another patient — please choose a different time.");
    }
    if (booking.date === date) {
      // Same day: release the old slot and claim the new one in one
      // write, so the old slot can never stay blocked.
      tx.set(availRef, { taken: [...taken.filter((s) => s !== booking.timeSlot), timeSlot] }, { merge: true });
    } else {
      tx.set(availRef, { taken: arrayUnion(timeSlot) }, { merge: true });
      // Release the old day's slot in the same transaction — the old
      // version did this outside the transaction and silently swallowed
      // failures, leaving cancelled/rescheduled slots blocked.
      tx.set(doc(db, "availability", availDocId(booking.branch, booking.date)), {
        taken: arrayRemove(booking.timeSlot),
      }, { merge: true });
    }
    tx.set(newRef, fields);
    tx.update(doc(db, "bookings", booking.id), { status: "Rescheduled" });
  });
  rememberPortalBooking(booking.phone, newRef.id);
  return docToBooking(newRef.id, fields);
}

/** Live copy of one booking for the receipt: the status flips on its
 *  own when the admin approves (or cancels) it in the dashboard. */
export function useLiveBooking(booking: Booking | null): Booking | null {
  const [live, setLive] = useState<Booking | null>(null);
  useEffect(() => {
    setLive(null);
    if (!booking) return;
    const unsub = onSnapshot(
      doc(db, "bookings", booking.id),
      (snap) => {
        if (snap.exists()) setLive(docToBooking(snap.id, snap.data()));
      },
      () => undefined,
    );
    return unsub;
  }, [booking?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!booking) return null;
  return live ?? booking;
}

/* ------------------------------------------------------------------ */
/* Patient Portal — this device's booking references (localStorage)    */
/* ------------------------------------------------------------------ */

const PORTAL_KEY = "refine.portal.v1";

type PortalRef = { phone: string; id: string };

function readPortalRefs(): PortalRef[] {
  try {
    const raw = localStorage.getItem(PORTAL_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter(
          (r): r is PortalRef =>
            !!r &&
            typeof r === "object" &&
            typeof (r as PortalRef).phone === "string" &&
            typeof (r as PortalRef).id === "string",
        )
      : [];
  } catch {
    return [];
  }
}

export function rememberPortalBooking(phone: string, id: string): void {
  try {
    const refs = readPortalRefs().filter((r) => !(r.phone === phone && r.id === id));
    refs.push({ phone, id });
    localStorage.setItem(PORTAL_KEY, JSON.stringify(refs.slice(-40)));
  } catch {
    /* private mode etc. — portal lookup is best-effort */
  }
}

/** A patient's own bookings. Primary lookup: a query by phone number.
 *  If that query is denied (or returns nothing) we fall back to the
 *  booking IDs saved on this device when the bookings were made. */
export function useMyBookings(phone: string): {
  bookings: Booking[];
  loading: boolean;
  error: string | null;
} {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (phone.trim().length < 7) {
      setBookings([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    const q = query(
      collection(db, "bookings"),
      where("phone", "==", phone.trim()),
      orderBy("createdAt", "desc"),
      limit(50),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setLoading(false);
        setBookings(snap.docs.map((d) => docToBooking(d.id, d.data())));
      },
      () => {
        // Phone query not allowed by the rules (or needs an index):
        // fall back to this device's saved booking IDs.
        const ids = readPortalRefs()
          .filter((r) => r.phone === phone.trim())
          .map((r) => r.id);
        if (ids.length === 0) {
          setLoading(false);
          setBookings([]);
          setError(
            "Could not look up bookings by phone number. Bookings made on this device can still be found — please use the receipt link from your booking.",
          );
          return;
        }
        const byId = new Map<string, Booking>();
        const unsubs = ids.map((id) =>
          onSnapshot(doc(db, "bookings", id), (snap) => {
            if (snap.exists()) byId.set(id, docToBooking(id, snap.data()));
            else byId.delete(id);
            setBookings(
              [...byId.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
            );
            setLoading(false);
          }),
        );
        return () => unsubs.forEach((u) => u());
      },
    );
    return unsub;
  }, [phone]);

  return { bookings, loading, error };
}

/* ------------------------------------------------------------------ */
/* Admin lists (real-time)                                             */
/* ------------------------------------------------------------------ */

export function useBookings(): Booking[] {
  const [rows, setRows] = useState<Booking[]>([]);
  useEffect(() => {
    const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"), limit(300));
    const unsub = onSnapshot(q, (snap) =>
      setRows(snap.docs.map((d) => docToBooking(d.id, d.data()))),
    );
    return unsub;
  }, []);
  return rows;
}

export function useInquiries(): Inquiry[] {
  const [rows, setRows] = useState<Inquiry[]>([]);
  useEffect(() => {
    const q = query(collection(db, "inquiries"), orderBy("createdAt", "desc"), limit(200));
    const unsub = onSnapshot(q, (snap) =>
      setRows(snap.docs.map((d) => docToInquiry(d.id, d.data()))),
    );
    return unsub;
  }, []);
  return rows;
}

export function useReviews(admin: boolean): Review[] {
  const [rows, setRows] = useState<Review[]>([]);
  useEffect(() => {
    const base = collection(db, "reviews");
    const q = admin
      ? query(base, orderBy("createdAt", "desc"), limit(100))
      : query(base, where("status", "==", "approved"), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => docToReview(d.id, d.data()));
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setRows(list);
    });
    return unsub;
  }, [admin]);
  return rows;
}

export function useOffers(admin: boolean): Offer[] {
  const [rows, setRows] = useState<Offer[]>([]);
  useEffect(() => {
    const base = collection(db, "offers");
    const q = admin
      ? query(base, orderBy("createdAt", "desc"), limit(100))
      : query(base, where("active", "==", true), limit(50));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => docToOffer(d.id, d.data()));
      list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setRows(list);
    });
    return unsub;
  }, [admin]);
  return rows;
}

export function useDoctors(): DoctorRow[] {
  const [rows, setRows] = useState<DoctorRow[]>([]);
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "settings"), (snap) => {
      const docs = snap.docs.filter((d) => d.id.startsWith("doctor_"));
      setRows(
        docs.map((d) => ({
          id: d.id,
          name: str(d.data().name, "Dr. Areesha Wasay"),
          role: str(d.data().role, "Founder & Lead Doctor"),
          note: str(d.data().note),
        })),
      );
    });
    return unsub;
  }, []);
  return rows;
}

/* ------------------------------------------------------------------ */
/* Writers (admin + public)                                            */
/* ------------------------------------------------------------------ */

export async function setBookingStatus(id: string, status: BookingStatus): Promise<void> {
  await updateDoc(doc(db, "bookings", id), { status });
}

export async function setAdvanceStatus(id: string, status: "Verified" | "Pending verification"): Promise<void> {
  await updateDoc(doc(db, "bookings", id), { advanceStatus: status });
}

export async function deleteBooking(booking: Booking): Promise<void> {
  // Deleting a booking must also free its slot, in the same
  // transaction. The old version only removed the booking doc, leaving
  // the slot blocked forever — that is what happened on 22 Nov 2026,
  // when #RGNRN1 and #5OPUMF were deleted from Admin while their
  // 3:00 PM slot stayed taken.
  await runTransaction(db, async (tx) => {
    tx.delete(doc(db, "bookings", booking.id));
    tx.set(doc(db, "availability", availDocId(booking.branch, booking.date)), {
      taken: arrayRemove(booking.timeSlot),
    }, { merge: true });
  });
}

export async function submitInquiry(input: {
  name: string;
  phone: string;
  message: string;
  source: string;
}): Promise<void> {
  await addDoc(collection(db, "inquiries"), {
    ...input,
    status: "New",
    createdAt: new Date().toISOString(),
  });
}

export async function setInquiryStatus(id: string, status: Inquiry["status"]): Promise<void> {
  await updateDoc(doc(db, "inquiries", id), { status });
}

export async function deleteInquiry(id: string): Promise<void> {
  await deleteDoc(doc(db, "inquiries", id));
}

export async function submitReview(input: {
  patientName: string;
  service: string;
  rating: number;
  text: string;
}): Promise<void> {
  await addDoc(collection(db, "reviews"), {
    ...input,
    name: input.patientName,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
}

export async function setReviewStatus(id: string, status: Review["status"]): Promise<void> {
  await updateDoc(doc(db, "reviews", id), { status });
}

export async function deleteReview(id: string): Promise<void> {
  await deleteDoc(doc(db, "reviews", id));
}

export async function saveOffer(offer: Omit<Offer, "id" | "createdAt"> & { id?: string }): Promise<void> {
  if (offer.id) {
    const { id, ...rest } = offer;
    await updateDoc(doc(db, "offers", id), rest);
  } else {
    await addDoc(collection(db, "offers"), {
      ...offer,
      createdAt: new Date().toISOString(),
    });
  }
}

export async function deleteOffer(id: string): Promise<void> {
  await deleteDoc(doc(db, "offers", id));
}

export async function saveDoctor(d: Omit<DoctorRow, "id"> & { id?: string }): Promise<void> {
  if (d.id) {
    await setDoc(doc(db, "settings", d.id), { name: d.name, role: d.role, note: d.note });
  } else {
    // Doctor docs live under settings/ with a "doctor_" id prefix so
    // useDoctors() can pick them out of the settings collection.
    await setDoc(doc(db, "settings", `doctor_${Date.now()}`), {
      name: d.name,
      role: d.role,
      note: d.note,
    });
  }
}

export async function deleteDoctor(id: string): Promise<void> {
  await deleteDoc(doc(db, "settings", id));
}

/** Save the Gemini API key to the admin-only Firestore doc
 *  settings/gemini. The key itself is never displayed again — the
 *  client only ever shows its last 4 characters. */
export async function saveGeminiKey(key: string): Promise<void> {
  await setDoc(doc(db, "settings", "gemini"), {
    key,
    updatedAtMs: Date.now(),
  });
}

export async function getGeminiKeyTail(): Promise<string> {
  const snap = await getDoc(doc(db, "settings", "gemini"));
  if (!snap.exists()) return "";
  const key = str(snap.data()?.key);
  return key ? key.slice(-4) : "";
}
