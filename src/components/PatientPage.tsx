// Patient-facing page: hero, services, prices, doctor, gallery,
// reviews, FAQ, booking, portal, branches, footer.

import { useState } from "react";
import { CLINIC, SERVICES, karachiToday } from "../clinic";
import {
  useClinicSettings,
  useSiteContent,
  useOffers,
  useReviews,
  submitInquiry,
  submitReview,
} from "../firebase";
import { BookingForm, PatientPortal, type BookingPrefill } from "./Booking";
import { ChatPanel } from "./ChatPanel";

export function PatientPage() {
  const { settings } = useClinicSettings();
  const { content: site } = useSiteContent();
  const hasRealPhotos = site.gallery.some((g) => g.url);
  const offers = useOffers(false);
  const reviews = useReviews(false);
  const [prefill, setPrefill] = useState<BookingPrefill>({});
  const [heroService, setHeroService] = useState(SERVICES[0].name);
  const [heroDate, setHeroDate] = useState(karachiToday());
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // Callback / inquiry form
  const [cbName, setCbName] = useState("");
  const [cbPhone, setCbPhone] = useState("");
  const [cbMsg, setCbMsg] = useState("");
  const [cbDone, setCbDone] = useState(false);
  const [cbError, setCbError] = useState("");

  // Leave-a-review form
  const [rvName, setRvName] = useState("");
  const [rvService, setRvService] = useState(SERVICES[0].name);
  const [rvRating, setRvRating] = useState(5);
  const [rvText, setRvText] = useState("");
  const [rvDone, setRvDone] = useState(false);
  const [rvError, setRvError] = useState("");

  function findTime() {
    setPrefill({ service: heroService, date: heroDate });
    document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
  }

  function bookService(name: string) {
    setPrefill({ service: name, date: karachiToday() });
    document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" });
  }

  async function submitCallback(e: React.FormEvent) {
    e.preventDefault();
    setCbError("");
    if (cbName.trim().length < 2 || cbPhone.replace(/\D/g, "").length < 10) {
      setCbError("Please enter your name and a valid mobile number.");
      return;
    }
    try {
      await submitInquiry({
        name: cbName.trim(),
        phone: cbPhone.trim(),
        message: cbMsg.trim() || "Callback request from the website.",
        source: "Callback request",
      });
      setCbDone(true);
    } catch {
      setCbError(`Could not send — please call ${site.bookingPhone} instead.`);
    }
  }

  async function submitReviewForm(e: React.FormEvent) {
    e.preventDefault();
    setRvError("");
    if (rvName.trim().length < 2) return setRvError("Please enter your name.");
    if (rvText.trim().length < 10) return setRvError("Please write a few words about your visit.");
    try {
      await submitReview({ patientName: rvName.trim(), service: rvService, rating: rvRating, text: rvText.trim() });
      setRvDone(true);
    } catch {
      setRvError("Could not send your review — please try again.");
    }
  }

  const hoursLabel = settings?.hours ?? CLINIC.defaultHoursLabel;
  const prices = settings?.prices ?? {};

  return (
    <>
      <header className="topbar">
        <div className="topbar-in">
          <a className="brand" href="#top">
            {site.clinicName.split(" by ")[0]}<small>by {site.doctorName} · Karachi</small>
          </a>
          <nav className="topnav">
            <a href="#services">Services</a>
            <a href="#prices">Prices</a>
            <a href="#reviews">Reviews</a>
            <a href="#faq">FAQ</a>
            <a href="#branches">Branches</a>
            <a href="#booking" className="btn small">Book now</a>
            <a href="#admin" className="linklike">Admin</a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="hero" id="top">
        <div className="wrap">
          <h1>{site.heroHeading}</h1>
          <p>{site.heroSub}</p>
          {site.heroImageUrl && (
            <img src={site.heroImageUrl} alt="" style={{ width: "100%", maxHeight: 280, objectFit: "cover", borderRadius: 12, marginBottom: 16 }} />
          )}
          <div className="hero-badges">
            <span className="pill">{site.consultationLine}</span>
            <span className="pill">{hoursLabel}</span>
            <span className="pill">Clifton &amp; Johar</span>
          </div>
          <div className="hero-card">
            <div className="field">
              <label htmlFor="hero-service">Treatment</label>
              <select id="hero-service" value={heroService} onChange={(e) => setHeroService(e.target.value)}>
                {SERVICES.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="hero-date">Date</label>
              <input id="hero-date" type="date" value={heroDate} min={karachiToday()} onChange={(e) => setHeroDate(e.target.value)} />
            </div>
            <div className="field">
              <label>Branch</label>
              <div style={{ display: "flex", gap: 8 }}>
                <a className="btn ghost small" href="#branches" style={{ flex: 1 }}>Clifton</a>
                <a className="btn ghost small" href="#branches" style={{ flex: 1 }}>Johar</a>
              </div>
            </div>
            <button className="btn" type="button" onClick={findTime}>Find a time →</button>
          </div>
        </div>
      </section>

      {/* Stats */}
      <div className="wrap">
        <div className="stats">
          <div className="stat"><b>2</b><span>Branches — Clifton &amp; Johar</span></div>
          <div className="stat"><b>9</b><span>Services — skin, aesthetics &amp; dental</span></div>
          <div className="stat"><b>FREE</b><span>First consultation</span></div>
          <div className="stat"><b>Mon–Sat</b><span>3:00 PM – 9:00 PM</span></div>
        </div>
      </div>

      {/* How it works */}
      <section className="section">
        <div className="wrap">
          <div className="eyebrow">How it works</div>
          <h2>{site.headings.howItWorks}</h2>
          <div className="grid cols-2" style={{ marginTop: 18 }}>
            {site.howItWorks.map((s, i) => (
              <div className="card" key={s.title}>
                <span className="tag">Step {i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="section alt" id="services">
        <div className="wrap">
          <div className="eyebrow">Our services</div>
          <h2>{site.headings.treatments}</h2>
          <p className="lead">
            Every service starts with a free consultation — the doctor examines
            you, explains the plan, and confirms the fee before anything begins.
          </p>
          <div className="grid cols-3" style={{ marginTop: 20 }}>
            {SERVICES.map((s) => (
              <div className="card" key={s.name}>
                <span className="tag">{s.category}</span>
                <h3>{s.name}</h3>
                <p>{s.description}</p>
                <p className="muted" style={{ fontSize: 13 }}>{s.whoFor}</p>
                <p className="muted" style={{ fontSize: 13 }}>⏱ {s.duration}</p>
                <ul className="includes">
                  {s.includes.map((inc) => <li key={inc}>{inc}</li>)}
                </ul>
                <p className="price-line">
                  Fee: <span>{prices[s.name] ? prices[s.name] : "Confirmed at consultation"}</span>
                </p>
                <button className="btn block" type="button" onClick={() => bookService(s.name)}>
                  Book {s.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Prices & payment + offers */}
      <section className="section" id="prices">
        <div className="wrap">
          <div className="eyebrow">Prices &amp; payment</div>
          <h2>{site.headings.pricing}</h2>
          <div className="grid cols-2" style={{ marginTop: 18 }}>
            <div className="card">
              <h3>Treatment fees</h3>
              <p>
                The consultation is <b>completely free</b>. For every other
                treatment, the exact fee is confirmed by the clinic after the
                doctor's consultation — fees vary by patient, skin/dental
                condition and number of sessions, so no price is quoted in advance.
              </p>
              <table className="data" style={{ minWidth: 0 }}>
                <tbody>
                  {SERVICES.map((s) => (
                    <tr key={s.name}>
                      <td>{s.name}</td>
                      <td style={{ textAlign: "right", fontWeight: 700 }}>
                        {prices[s.name] ? prices[s.name] : "Confirmed at consultation"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <div className="card" style={{ marginBottom: 16 }}>
                <h3>Advance payment</h3>
                {settings?.jazzcashNumber || settings?.easypaisaNumber ? (
                  <>
                    <p>You can pay an advance during booking with JazzCash or EasyPaisa. Choose the method and enter the transaction ID — the booking stays “Advance pending verification” until the clinic verifies it. The clinic confirms the advance amount.</p>
                    {settings.jazzcashNumber && (
                      <p><b>JazzCash:</b> {settings.jazzcashNumber}{settings.jazzcashTitle ? ` (${settings.jazzcashTitle})` : ""}</p>
                    )}
                    {settings.easypaisaNumber && (
                      <p><b>EasyPaisa:</b> {settings.easypaisaNumber}{settings.easypaisaTitle ? ` (${settings.easypaisaTitle})` : ""}</p>
                    )}
                  </>
                ) : (
                  <p>Advance payment details are shared by the clinic on call or WhatsApp ({site.bookingPhone}).</p>
                )}
              </div>
              <div className="card">
                <h3>Current offers</h3>
                {offers.length === 0 ? (
                  <p className="muted">The consultation is completely free — no other offer is currently active.</p>
                ) : (
                  offers.map((o) => (
                    <div key={o.id} style={{ marginBottom: 12 }}>
                      <b>{o.title}</b> {o.discount && <span className="tag">{o.discount}</span>}
                      <p className="muted">{o.description}</p>
                      {o.validUntil && <p className="muted" style={{ fontSize: 13 }}>Valid till {o.validUntil}</p>}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Doctor */}
      <section className="section alt">
        <div className="wrap">
          <div className="eyebrow">Your doctor</div>
          <h2>{site.doctorName}</h2>
          <div className="card">
            <p><b>Founder and lead doctor of the clinic</b> — Refine Aesthetics runs under her name.</p>
            <ul className="includes">
              {site.doctorPoints.map((p) => <li key={p}>{p}</li>)}
            </ul>
            <p className="muted">For details about the rest of the team, contact the clinic on {site.bookingPhone}.</p>
          </div>
        </div>
      </section>

      {/* Why choose us + first visit */}
      <section className="section">
        <div className="wrap">
          <div className="eyebrow">Why patients choose us</div>
          <h2>{site.headings.whyUs}</h2>
          <div className="grid cols-3" style={{ marginTop: 18 }}>
            {site.whyChooseUs.map((s) => (
              <div className="card" key={s.title}><h3>{s.title}</h3><p>{s.text}</p></div>
            ))}
          </div>
          <h2 style={{ marginTop: 40 }}>{site.headings.firstVisit}</h2>
          <div className="grid cols-3" style={{ marginTop: 18 }}>
            {site.firstVisit.map((s) => (
              <div className="card" key={s.title}><h3>{s.title}</h3><p>{s.text}</p></div>
            ))}
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="section alt">
        <div className="wrap">
          <div className="eyebrow">Inside the clinic</div>
          <h2>{site.headings.gallery}</h2>
          <p className="lead">
            {hasRealPhotos
              ? "Tap any image to view it larger."
              : "Tap any image to view it larger. These are illustrative interior images, not photos of the branches."}
          </p>
          <div className="gallery" style={{ marginTop: 18 }}>
            {site.gallery.map((g, i) => (
              <button key={`${g.title}-${i}`} className="gallery-tile" type="button" onClick={() => setLightbox(i)} aria-label={`View ${g.title}`}>
                {g.url ? (
                  <img src={g.url} alt={g.title} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                ) : null}
                <span className="tile-title">{g.title}</span>
                <span className="tile-label">{g.url ? "Clinic photo" : "Illustrative interior image — not a branch photo"}</span>
              </button>
            ))}
          </div>
        </div>
      </section>
      {lightbox !== null && (
        <div className="lightbox" onClick={() => setLightbox(null)} role="dialog" aria-label="Image preview">
          <div className="lightbox-in" onClick={(e) => e.stopPropagation()}>
            {site.gallery[lightbox].url ? (
              <img src={site.gallery[lightbox].url} alt={site.gallery[lightbox].title} style={{ width: "100%", maxHeight: 420, objectFit: "contain", borderRadius: 8 }} />
            ) : (
              <div className="ph gallery-tile" style={{ height: 220, position: "relative" }}>
                <span className="tile-title">{site.gallery[lightbox].title}</span>
                <span className="tile-label">Illustrative interior image — not a branch photo</span>
              </div>
            )}
            <p className="muted">
              {site.gallery[lightbox].url ? site.gallery[lightbox].title : "Illustrative interior image — not a branch photo. Real branch photos are not published on this page."}
            </p>
            <button className="btn" type="button" onClick={() => setLightbox(null)}>Close</button>
          </div>
        </div>
      )}

      {/* Reviews */}
      <section className="section" id="reviews">
        <div className="wrap">
          <div className="eyebrow">Patient reviews</div>
          <h2>{site.headings.reviews}</h2>
          {reviews.length === 0 ? (
            <div className="empty-note" style={{ marginTop: 18 }}>
              No reviews yet — be the first to share your experience after your visit.
              Reviews appear here only after the clinic approves them.
            </div>
          ) : (
            <div className="grid cols-3" style={{ marginTop: 18 }}>
              {reviews.map((r) => (
                <div className="card review-card" key={r.id}>
                  <div className="stars">{"★".repeat(Math.max(1, Math.min(5, r.rating)))}{"☆".repeat(5 - Math.max(1, Math.min(5, r.rating)))}</div>
                  <blockquote>“{r.text}”</blockquote>
                  <div className="review-meta">{r.patientName} · {r.service}</div>
                </div>
              ))}
            </div>
          )}
          <div className="card" style={{ marginTop: 20 }}>
            <h3>Leave a review</h3>
            {rvDone ? (
              <div className="notice">Thank you! Your review was sent — it will appear here after the clinic approves it.</div>
            ) : (
              <form onSubmit={(e) => void submitReviewForm(e)}>
                {rvError && <div className="error">{rvError}</div>}
                <div className="form-grid">
                  <div>
                    <label htmlFor="rv-name">Your name</label>
                    <input id="rv-name" value={rvName} onChange={(e) => setRvName(e.target.value)} placeholder="Your name" />
                  </div>
                  <div>
                    <label htmlFor="rv-service">Service</label>
                    <select id="rv-service" value={rvService} onChange={(e) => setRvService(e.target.value)}>
                      {SERVICES.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="rv-rating">Rating</label>
                    <select id="rv-rating" value={rvRating} onChange={(e) => setRvRating(Number(e.target.value))}>
                      {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} star{n > 1 ? "s" : ""}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="rv-text">Your review</label>
                    <input id="rv-text" value={rvText} onChange={(e) => setRvText(e.target.value)} placeholder="How was your visit?" />
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <button className="btn" type="submit">Submit review</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Dental tips */}
      <section className="section alt">
        <div className="wrap">
          <div className="eyebrow">General dental care</div>
          <h2>{site.headings.dentalTips}</h2>
          <div className="grid cols-3" style={{ marginTop: 18 }}>
            {site.dentalTips.map((t) => (
              <div className="card" key={t.title}><h3>{t.title}</h3><p>{t.text}</p></div>
            ))}
          </div>
          <p className="muted" style={{ marginTop: 14 }}>These are general education tips only — for advice about your own teeth, see the doctor.</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="section" id="faq">
        <div className="wrap">
          <div className="eyebrow">FAQ</div>
          <h2>{site.headings.faq}</h2>
          <div style={{ marginTop: 18 }}>
            {site.faqs.map((f, i) => (
              <div className="faq-item" key={f.q}>
                <button className="faq-q" type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  {f.q} <span>{openFaq === i ? "−" : "+"}</span>
                </button>
                {openFaq === i && <div className="faq-a">{f.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Booking */}
      <section className="section alt" id="booking">
        <div className="wrap">
          <div className="eyebrow">Book an appointment</div>
          <h2>{site.headings.booking}</h2>
          <p className="lead">
            Open {hoursLabel}. {settings?.sunday ?? site.sundayNote}.
          </p>
          <div style={{ marginTop: 18 }}>
            <BookingForm key={`${prefill.service ?? ""}|${prefill.date ?? ""}`} prefill={prefill} />
          </div>

          {/* Emergency box */}
          <div className="emergency" style={{ marginTop: 20 }}>
            <div>
              <h3>Emergency?</h3>
              <p>
                Severe pain, bleeding or swelling — call <b>{site.bookingPhone}</b> right away.
                Emergency bookings get HOT-EMERGENCY priority so you are seen first.
              </p>
            </div>
            <a className="btn danger" href={`tel:${site.bookingPhone.replace(/\s/g, "")}`}>Call {site.bookingPhone}</a>
            <a className="btn" href={`https://wa.me/${site.bookingPhoneWa}?text=${encodeURIComponent("Hello, I have a dental emergency and need an urgent appointment.")}`} target="_blank" rel="noreferrer">WhatsApp</a>
          </div>
        </div>
      </section>

      {/* Patient Portal */}
      <section className="section" id="portal">
        <div className="wrap">
          <div className="eyebrow">Patient Portal</div>
          <h2>{site.headings.portal}</h2>
          <div style={{ marginTop: 18 }}>
            <PatientPortal />
          </div>
        </div>
      </section>

      {/* Callback */}
      <section className="section alt">
        <div className="wrap">
          <div className="eyebrow">Prefer a call back?</div>
          <h2>Request a callback</h2>
          <div className="card" style={{ marginTop: 18, maxWidth: 640 }}>
            {cbDone ? (
              <div className="notice">Thank you — the clinic team will call you back on your number.</div>
            ) : (
              <form onSubmit={(e) => void submitCallback(e)}>
                {cbError && <div className="error">{cbError}</div>}
                <div className="form-grid">
                  <div>
                    <label htmlFor="cb-name">Your name</label>
                    <input id="cb-name" value={cbName} onChange={(e) => setCbName(e.target.value)} placeholder="Your name" />
                  </div>
                  <div>
                    <label htmlFor="cb-phone">Mobile number</label>
                    <input id="cb-phone" value={cbPhone} onChange={(e) => setCbPhone(e.target.value)} placeholder="0334 1234567" inputMode="tel" />
                  </div>
                  <div className="full">
                    <label htmlFor="cb-msg">Message (optional)</label>
                    <textarea id="cb-msg" rows={2} value={cbMsg} onChange={(e) => setCbMsg(e.target.value)} placeholder="What is this about?" />
                  </div>
                </div>
                <div style={{ marginTop: 12 }}>
                  <button className="btn" type="submit">Request callback</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* Branches */}
      <section className="section" id="branches">
        <div className="wrap">
          <div className="eyebrow">Visit us</div>
          <h2>Two branches in Karachi</h2>
          <div className="grid cols-2" style={{ marginTop: 18 }}>
            {CLINIC.branches.map((b) => (
              <div className="card" key={b.name}>
                <h3>{b.name} branch</h3>
                <p>{b.address}</p>
                <p className="muted">Open {hoursLabel}</p>
                <iframe
                  title={`Map — ${b.name} branch`}
                  className="branch-map"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://www.google.com/maps?q=${encodeURIComponent(b.mapQuery)}&output=embed`}
                />
                <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
                  <a className="btn small" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(b.mapQuery)}`} target="_blank" rel="noreferrer">Directions</a>
                  <a className="btn ghost small" href={`tel:${site.bookingPhone.replace(/\s/g, "")}`}>Call {site.bookingPhone}</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer" id="admin">
        <div className="wrap footer-grid">
          <div>
            <h3>{site.clinicName}</h3>
            <p>{site.tagline}</p>
            <p>{site.consultationLine}.</p>
          </div>
          <div>
            <h3>Contact</h3>
            <p>Phone / WhatsApp: <a href={`tel:${site.bookingPhone.replace(/\s/g, "")}`}>{site.bookingPhone}</a></p>
            <p>Instagram: <a href={site.instagramUrl} target="_blank" rel="noreferrer">{site.instagram}</a></p>
            <p>Hours: {hoursLabel}<br />{settings?.sunday ?? site.sundayNote}.</p>
          </div>
          <div>
            <h3>Branches</h3>
            {CLINIC.branches.map((b) => <p key={b.name}><b>{b.name}:</b> {b.address}</p>)}
            <p style={{ marginTop: 12 }}>
              <a href="#top" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new CustomEvent("refine:open-admin")); }}>
                Clinic staff? Open the Admin dashboard →
              </a>
            </p>
          </div>
        </div>
      </footer>

      <ChatPanel />
    </>
  );
}
