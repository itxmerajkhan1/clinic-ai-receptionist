# Clinic AI Receptionist — Refine Aesthetics by Dr. Areesha

A standalone, Vercel-deployable port of the Clinic AI Receptionist web app
for **Refine Aesthetics by Dr. Areesha Wasay** (Karachi).

- **Stack:** Vite + React + TypeScript + Firebase JS SDK (`firebase`).
  Firestore is the **sole** data layer — no other database, no fallback.
- **Serverless API:** `api/ask-sarah.ts` (Sarah / Gemini) and
  `api/test-gemini.ts` (one-off key test), Node runtime on Vercel.
- **Live site:** not deployed yet — this repo is code only.

## What it does

**Patient page (English):** hero with treatment dropdown + date picker +
"Find a time", stats row, 9 service cards with "Includes" lines and Book
buttons that pre-select the service, Prices & Payment (fees only where the
admin set them, otherwise "Confirmed at consultation"; no insurer names),
Dr. Areesha card, gallery lightbox (elegant CSS placeholder panels labelled
"Illustrative interior image — not a branch photo"), approved-reviews
carousel (starts empty — fake reviews are never seeded), FAQ accordion,
guided booking form with doctor preference, red emergency box
(call/WhatsApp 0334 3151514), branches with Google Maps embeds + Directions,
footer, callback form, and the Patient Portal (phone lookup, history,
reschedule, cancel).

**Booking:** real slot check against Firestore. Slots are generated
**inclusively** from the admin's saved hours (3–9 PM → 3, 4, 5, 6, 7, 8, 9 PM;
whatever the admin selects shows exactly). Sundays are blocked. A Firestore
**transaction** claims the slot in `availability/{branch}_{date}` and writes
the booking together, so no slot can ever be double-booked. Receipt with
booking ref, status "Pending — Clinic Confirmation", HOT-EMERGENCY flag for
emergencies, live receipt status via `onSnapshot` (flips to Confirmed /
Cancelled when the admin acts), "Confirm on WhatsApp" button, and "Make
another booking".

**Sarah AI receptionist:** floating chat, calls `/api/ask-sarah`. Primary
model `gemini-3.5-flash-lite`, fallback `gemini-3.5-flash`, ~220-token cap,
last 6 messages of context, 10s timeout → knowledge-base fallback, typing
indicator. English by default; replies in Urdu / Roman Urdu if the patient
writes in it. Never invents a price, never diagnoses or prescribes. Same
Confirm → Pending receipt flow inside the chat, plus a "Talk to staff"
handoff that creates an inquiry for the admin.

**Admin dashboard** (Firebase Email/Password: Sign up, Sign in, Forgot
password, email verification; dashboard only for the verified admin
`itxmerajkhan3109@gmail.com`): real-booking stats, search, CSV export,
approve / cancel / complete, HOT-EMERGENCY pinned at the top, Patients,
Doctors, Services (price editing), Locations, Reviews (approve before
public), Offers (add/edit/delete), Messages/Inquiries, Settings (clinic
timings + service prices + payment numbers + Gemini API key with Test
connection), WhatsApp reminder links, and advance-payment verification
("Advance pending verification" until the admin verifies).

**Firestore collections:** `bookings`, `inquiries`, `offers`, `reviews`,
`settings` (clinic timings/prices/payments in `settings/clinic`, Gemini key
in `settings/gemini`, doctors in `settings/doctor_*`), plus the
transactional slot cache `availability/{branch}_{date}` (`{ taken: [...] }`,
no patient data).

## Deploy — exact steps

### 1. Publish the Firestore rules (required — do this first)

`firestore.rules` is in this repo (owned by the rules worker — do not edit
it here). Until the rules are published, Firestore stays in locked mode and
the app cannot read or write:

1. Open the Firebase console → project `clinic-ai-receptionist-9ec3a` →
   Firestore Database → Rules.
2. Paste the contents of `firestore.rules` and click **Publish**.

> **Rules gap — read before publishing:** the staged `firestore.rules`
> does not yet cover two things this app's booking flow needs, so the
> rules worker must add them before (or at) publish time, or patient
> booking will be denied:
>
> 1. **The `availability` collection** (`availability/{branch}_{date}`,
>    `{ taken: ["4:00 PM", …] }`, no patient data): public read, and write
>    allowed inside the booking transaction — this is what prevents double
>    booking. Without it the booking transaction fails with
>    permission-denied.
> 2. **Patient status-only update of their own booking** (cancel /
>    reschedule): allow an unsigned-in patient to change only `status`
>    (to `Cancelled` / `Rescheduled`), nothing else — as in the original
>    app's rules. Without it, Patient Portal cancel/reschedule fails
>    (admin-side status changes still work).
>
> The client code is already aligned to the staged rules where it can be:
> booking creates write the `name` and `time` field names the rules
> validate, and review statuses are lowercase (`pending` / `approved` /
> `rejected`) because the rules only treat `status == 'approved'` as
> publicly readable. The Patient Portal's phone-number query is
> admin-only under the staged rules, so the portal falls back to the
> booking IDs saved on the patient's own device (receipt links still work).

### 2. Deploy to Vercel

```bash
npm install
npm run build        # must pass cleanly
```

Then either:

- **Vercel dashboard:** import this repo (or drag the folder) → Framework
  preset **Vite** → Deploy. No build-command override is needed
  (`npm run build`, output `dist`).
- **Vercel CLI:** `npx vercel` (first deploy) / `npx vercel --prod`.

### 3. Gemini key for Sarah (optional but recommended)

Sarah works without a key (she answers from the built-in clinic knowledge
base), but for real AI answers set **one** of these:

- **Easiest — Vercel env var:** Vercel → Project → Settings → Environment
  Variables → add `GEMINI_API_KEY` → redeploy. The key is never committed
  or logged.
- **Firestore-stored key:** in Admin → Settings, paste the key and click
  **Test connection**, then **Save key to Firestore**. It is stored in the
  admin-only doc `settings/gemini` and only the last 4 characters are ever
  shown. The server can only read this stored key if you also set
  `FIREBASE_SERVICE_ACCOUNT` in Vercel env vars (the whole JSON of a
  Firebase service-account key, as one line). Never commit that JSON.

### 4. First admin sign-in (seeds the defaults)

1. Open the deployed site → footer → **"Clinic staff? Open the Admin
   dashboard"** (or load the site and switch to Admin).
2. Sign in with `itxmerajkhan3109@gmail.com` (the existing admin account,
   UID `rYYk4PIaG8Xt0YY9L5NetkCde8K2`). If the account was never verified,
   click the verification link in its inbox first — the dashboard stays
   locked behind a verify-email screen until then.
3. On the first verified sign-in the app seeds **only if the docs do not
   exist yet** (never overwrites, never seeds test data):
   - `settings/clinic`: hours **Monday to Saturday, 3:00 PM – 9:00 PM**
     (openHour 15, closeHour 21), empty prices, JazzCash **and** EasyPaisa
     number **03265877959**, account title **Muhammed Mubeen khan**.
   - `offers`: one active offer — **"Free Consultation", 100% FREE**,
     "Your first consultation is completely free — meet the doctor, discuss
     your treatment plan, no charges at all."
   - Firestore otherwise starts **clean and empty**: no bookings, no
     reviews, no inquiries, no test data.

## Local development

```bash
npm install
npm run dev        # http://localhost:5173
```

The `/api/*` routes only run on Vercel (or `npx vercel dev`). Locally,
Sarah answers from the knowledge base unless you run `vercel dev`.

## Clinic facts (do not change without the clinic)

- Refine Aesthetics by Dr. Areesha Wasay, Karachi.
- Branches: Clifton (Vincy Mall, Clifton Block 9) · Johar (Al Khizra
  Heights, Gulistan-e-Johar).
- Consultation **FREE**. Bookings: **0334 3151514**. Instagram
  **@refineaestheticsbydrareeseha**. WhatsApp `wa.me/923343151514`.
- Hours: Monday–Saturday, 3:00 PM – 9:00 PM (admin-saved; Sundays confirmed on call).
- 9 services, prices blank = "Confirmed at consultation": Skin Consultation,
  HydraFacial, Chemical Peel, Laser Hair Removal, PRP Therapy, Botox &
  Fillers Consultation, Dental Checkup & Cleaning, Teeth Whitening, Dental
  Consultation. Never invent a price, doctor, review, insurer, address or
  phone number.

## Project structure

```
api/
  ask-sarah.ts        POST /api/ask-sarah — Gemini chat (env key → Admin-SDK
                      Firestore key → { aiConnected: false })
  test-gemini.ts      POST /api/test-gemini — one-off key test, key never stored/logged
  _gemini.ts          Shared Gemini call + key resolution (primary
                      gemini-3.5-flash-lite, fallback gemini-3.5-flash)
  _types.ts           Minimal Vercel request/response types
src/
  main.tsx            Entry point
  App.tsx             Patient page ↔ Admin switch
  clinic.ts           Clinic facts, services, FAQs, slot helpers, Sarah KB
  firebase.ts         Firebase init, auth, Firestore reads/writes,
                      transactions, real-time hooks, seeding
  styles.css          Mint/teal theme
  components/
    PatientPage.tsx   Hero, services, prices, doctor, gallery, reviews,
                      FAQ, branches, footer, callback form
    Booking.tsx       Booking form, live receipt, Patient Portal
    ChatPanel.tsx     Sarah chat + in-chat booking + staff handoff
    Admin.tsx         Auth + dashboard (all tabs)
```

## Notes / known limits

- The Gemini key is **never** in this repo, in any file, or in any log.
  There is no key bundled with this project.
- `firestore.rules` is in this repo but owned by the rules worker — do
  not edit it here. It must be published in the Firebase console before
  the app works live, **and** it still needs the two additions listed in
  the README ("Rules gap"): the `availability` collection and patient
  status-only booking updates.
- The Patient Portal's primary lookup queries `bookings` by phone number;
  if the published rules do not allow that query, it falls back to the
  booking IDs saved on the patient's own device when the bookings were made.
- Gallery images are CSS/gradient placeholder panels, labelled illustrative
  — no branch photos are bundled or presented as real.
- No GitHub or Vercel action has been taken from this repo; deploy prep is
  handled separately.
