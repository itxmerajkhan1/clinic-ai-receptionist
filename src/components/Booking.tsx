// Booking form + live receipt + Patient Portal.

import { useEffect, useMemo, useState } from "react";
import {
  CLINIC,
  SERVICES,
  buildSlotList,
  isSunday,
  karachiToday,
  prettyDate,
  waDigits,
} from "../clinic";
import {
  useAvailability,
  useClinicSettings,
  useLiveBooking,
  useMyBookings,
  slotListFor,
  createBooking,
  cancelBooking,
  rescheduleBooking,
  whatsappConfirmUrl,
  shortRef,
  type Booking,
  type ClinicSettings,
} from "../firebase";

/* ------------------------------------------------------------------ */
/* Booking form                                                        */
/* ------------------------------------------------------------------ */

export type BookingPrefill = { service?: string; date?: string };

export function BookingForm({ prefill }: { prefill: BookingPrefill }) {
  const { settings } = useClinicSettings();
  const [service, setService] = useState(prefill.service ?? SERVICES[0].name);
  const [branch, setBranch] = useState("Clifton");
  const [date, setDate] = useState(prefill.date ?? karachiToday());
  const [timeSlot, setTimeSlot] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [doctorPreference, setDoctorPreference] = useState("No preference");
  const [emergency, setEmergency] = useState(false);
  const [advanceMethod, setAdvanceMethod] = useState<"None" | "JazzCash" | "EasyPaisa">("None");
  const [advanceTxnId, setAdvanceTxnId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [booked, setBooked] = useState<Booking | null>(null);

  useEffect(() => {
    if (prefill.service) setService(prefill.service);
    if (prefill.date) setDate(prefill.date);
  }, [prefill.service, prefill.date]);

  const slots = useMemo(() => slotListFor(settings), [settings]);
  const { taken, closed } = useAvailability(branch, date, true);

  const paymentsConfigured =
    !!settings?.jazzcashNumber || !!settings?.easypaisaNumber;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim() || name.trim().length < 2) return setError("Please enter your full name.");
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 13)
      return setError("Please enter a valid mobile number (e.g. 0334 1234567).");
    if (!date) return setError("Please choose a date.");
    if (isSunday(date))
      return setError("The clinic is closed on Sundays — please choose another day or call 0334 3151514.");
    if (date < karachiToday()) return setError("That date has already passed.");
    if (!timeSlot) return setError("Please choose a time slot.");
    setSubmitting(true);
    try {
      const b = await createBooking({
        patientName: name,
        phone,
        service,
        branch,
        date,
        timeSlot,
        notes,
        doctorPreference,
        emergency,
        advanceMethod,
        advanceTxnId,
        settings,
      });
      setBooked(b);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed — please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (booked) {
    return (
      <Receipt
        booking={booked}
        onAnother={() => {
          setBooked(null);
          setTimeSlot("");
          setNotes("");
          setAdvanceTxnId("");
          setAdvanceMethod("None");
          setEmergency(false);
        }}
      />
    );
  }

  return (
    <form onSubmit={submit} className="card">
      <h3>Book an appointment</h3>
      <p className="muted">
        Your booking is saved as <b>Pending — Clinic Confirmation</b>. The clinic
        confirms it and lets you know. Your first consultation is completely free.
      </p>
      {error && <div className="error">{error}</div>}
      {closed && (
        <div className="info-note">
          Sundays: {settings?.sunday ?? CLINIC.sundayNote} — please choose another day or call {CLINIC.bookingPhone}.
        </div>
      )}
      <div className="form-grid">
        <div>
          <label htmlFor="bk-service">Treatment</label>
          <select id="bk-service" value={service} onChange={(e) => setService(e.target.value)}>
            {SERVICES.map((s) => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="bk-branch">Branch</label>
          <select id="bk-branch" value={branch} onChange={(e) => setBranch(e.target.value)}>
            <option value="Clifton">Clifton — Vincy Mall, Block 9</option>
            <option value="Johar">Johar — Al Khizra Heights</option>
          </select>
        </div>
        <div>
          <label htmlFor="bk-date">Date</label>
          <input
            id="bk-date"
            type="date"
            value={date}
            min={karachiToday()}
            onChange={(e) => { setDate(e.target.value); setTimeSlot(""); }}
          />
        </div>
        <div>
          <label htmlFor="bk-doctor">Doctor preference</label>
          <select
            id="bk-doctor"
            value={doctorPreference}
            onChange={(e) => setDoctorPreference(e.target.value)}
          >
            <option value="No preference">No preference</option>
            <option value="Dr. Areesha Wasay">Dr. Areesha Wasay</option>
            <option value="First available doctor">First available doctor</option>
          </select>
        </div>
        <div className="full">
          <label>Available times — {date ? prettyDate(date) : "pick a date"}</label>
          {closed ? (
            <p className="muted">Closed on Sunday.</p>
          ) : (
            <div className="slot-grid">
              {slots.map((s) => (
                <button
                  type="button"
                  key={s}
                  className={`slot${timeSlot === s ? " selected" : ""}`}
                  disabled={taken.includes(s)}
                  onClick={() => setTimeSlot(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <p className="muted">Times are generated from the clinic's opening hours — booked slots show as unavailable.</p>
        </div>
        <div>
          <label htmlFor="bk-name">Your full name</label>
          <input id="bk-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ayesha Khan" />
        </div>
        <div>
          <label htmlFor="bk-phone">Mobile number</label>
          <input
            id="bk-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0334 1234567"
            inputMode="tel"
          />
        </div>
        <div className="full">
          <label htmlFor="bk-notes">Anything the doctor should know? (optional)</label>
          <textarea id="bk-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. sensitive skin, tooth pain since yesterday…" />
        </div>
        <div className="full">
          <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={emergency}
              onChange={(e) => setEmergency(e.target.checked)}
              style={{ width: "auto" }}
            />
            This is an emergency (severe pain, bleeding, swelling)
          </label>
          {emergency && (
            <p className="muted" style={{ color: "#dc2626", fontWeight: 600 }}>
              Emergency bookings get HOT-EMERGENCY priority — and please also call {CLINIC.bookingPhone} right away.
            </p>
          )}
        </div>
        {paymentsConfigured && (
          <div className="full">
            <label htmlFor="bk-pay">Advance payment (optional)</label>
            <select
              id="bk-pay"
              value={advanceMethod}
              onChange={(e) => setAdvanceMethod(e.target.value as "None" | "JazzCash" | "EasyPaisa")}
            >
              <option value="None">Pay at the clinic</option>
              {settings?.jazzcashNumber && <option value="JazzCash">JazzCash — {settings.jazzcashNumber}{settings.jazzcashTitle ? ` (${settings.jazzcashTitle})` : ""}</option>}
              {settings?.easypaisaNumber && <option value="EasyPaisa">EasyPaisa — {settings.easypaisaNumber}{settings.easypaisaTitle ? ` (${settings.easypaisaTitle})` : ""}</option>}
            </select>
            {advanceMethod !== "None" && (
              <div style={{ marginTop: 10 }}>
                <label htmlFor="bk-txn">Transaction ID</label>
                <input
                  id="bk-txn"
                  value={advanceTxnId}
                  onChange={(e) => setAdvanceTxnId(e.target.value)}
                  placeholder="Enter the transaction ID from your payment app"
                />
                <p className="muted">Your booking stays “Advance pending verification” until the clinic verifies it.</p>
              </div>
            )}
          </div>
        )}
      </div>
      <div style={{ marginTop: 16 }}>
        <button className="btn block" type="submit" disabled={submitting}>
          {submitting ? "Saving your booking…" : "Confirm booking"}
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/* Receipt (live status via onSnapshot)                                */
/* ------------------------------------------------------------------ */

export function Receipt({ booking, onAnother }: { booking: Booking; onAnother: () => void }) {
  const live = useLiveBooking(booking) ?? booking;
  return (
    <div className="receipt">
      <h3>Your booking receipt</h3>
      <p>
        Booking ref: <b>#{shortRef(live.id)}</b>{" "}
        {live.priority === "HOT-EMERGENCY" && <span className="hot-flag">HOT-EMERGENCY</span>}
      </p>
      <dl>
        <dt>Name</dt><dd>{live.patientName}</dd>
        <dt>Service</dt><dd>{live.service}</dd>
        <dt>Branch</dt><dd>{live.branch}</dd>
        <dt>Date</dt><dd>{prettyDate(live.date)}</dd>
        <dt>Time</dt><dd>{live.timeSlot}</dd>
        <dt>Doctor</dt><dd>{live.doctorPreference || "No preference"}</dd>
        <dt>Status</dt>
        <dd>
          <span className={`status-badge ${live.status}`}>{live.status}</span>{" "}
          {live.status === "Pending" && <span className="muted">(Pending — Clinic Confirmation)</span>}
        </dd>
        {live.advanceMethod !== "None" && (
          <>
            <dt>Advance</dt>
            <dd>
              {live.advanceMethod} — Txn {live.advanceTxnId || "—"} —{" "}
              <b>{live.advanceStatus === "Verified" ? "Verified" : "Advance pending verification"}</b>
            </dd>
          </>
        )}
      </dl>
      <p className="muted">
        This receipt updates live — when the clinic confirms your booking, the
        status above changes on its own. Please arrive 5–10 minutes early.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <a className="btn" href={whatsappConfirmUrl(live)} target="_blank" rel="noreferrer">
          Confirm on WhatsApp
        </a>
        <a className="btn ghost" href={`tel:${CLINIC.bookingPhone.replace(/\s/g, "")}`}>
          Call {CLINIC.bookingPhone}
        </a>
        <button className="btn ghost" type="button" onClick={onAnother}>
          Make another booking
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Patient Portal                                                      */
/* ------------------------------------------------------------------ */

export function PatientPortal() {
  const [phone, setPhone] = useState("");
  const [submittedPhone, setSubmittedPhone] = useState("");
  const { bookings, loading, error } = useMyBookings(submittedPhone);
  const { settings } = useClinicSettings();
  const [rescheduleFor, setRescheduleFor] = useState<Booking | null>(null);
  const [actionError, setActionError] = useState("");
  const [actionMsg, setActionMsg] = useState("");
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  function lookup(e: React.FormEvent) {
    e.preventDefault();
    setActionError("");
    setActionMsg("");
    setSubmittedPhone(phone.trim());
  }

  async function doCancel(b: Booking) {
    // No native window.confirm here on purpose: the browser's own
    // confirm dialog cannot be accepted by automated checks (and it
    // looks out of place in the app). Confirmation is a two-step inline
    // button instead — see the Cancel button below.
    setActionError("");
    setActionMsg("");
    try {
      await cancelBooking(b);
      setActionMsg("Booking cancelled.");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not cancel — please try again.");
    }
  }

  return (
    <div className="card">
      <h3>Patient Portal</h3>
      <p className="muted">
        Enter the mobile number you booked with to see your booking history,
        reschedule, or cancel.
      </p>
      <form onSubmit={lookup} style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="0334 1234567"
          inputMode="tel"
          style={{ flex: 1, minWidth: 180 }}
        />
        <button className="btn" type="submit">Find my bookings</button>
      </form>
      {loading && <p className="muted" style={{ marginTop: 12 }}>Looking up your bookings…</p>}
      {error && <div className="error" style={{ marginTop: 12 }}>{error}</div>}
      {actionError && <div className="error" style={{ marginTop: 12 }}>{actionError}</div>}
      {actionMsg && <div className="notice" style={{ marginTop: 12 }}>{actionMsg}</div>}
      {submittedPhone && !loading && bookings.length === 0 && !error && (
        <p className="muted" style={{ marginTop: 12 }}>
          No bookings found for {submittedPhone}. Check the number, or use the
          receipt link from your booking.
        </p>
      )}
      {bookings.length > 0 && (
        <div className="table-wrap" style={{ marginTop: 16 }}>
          <table className="data">
            <thead>
              <tr>
                <th>Ref</th><th>Service</th><th>Branch</th><th>Date</th><th>Time</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>#{shortRef(b.id)}{b.priority === "HOT-EMERGENCY" && <div><span className="hot-flag">HOT-EMERGENCY</span></div>}</td>
                  <td>{b.service}</td>
                  <td>{b.branch}</td>
                  <td>{prettyDate(b.date)}</td>
                  <td>{b.timeSlot}</td>
                  <td><span className={`status-badge ${b.status}`}>{b.status}</span></td>
                  <td>
                    <div className="row-actions">
                      {(b.status === "Pending" || b.status === "Confirmed") && (
                        <>
                          <button className="mini-btn" type="button" onClick={() => setRescheduleFor(b)}>Reschedule</button>
                          {confirmCancelId === b.id ? (
                            <>
                              <button className="mini-btn danger" type="button" onClick={() => { setConfirmCancelId(null); void doCancel(b); }}>Yes, cancel it</button>
                              <button className="mini-btn" type="button" onClick={() => setConfirmCancelId(null)}>Keep booking</button>
                            </>
                          ) : (
                            <button className="mini-btn danger" type="button" onClick={() => setConfirmCancelId(b.id)}>Cancel</button>
                          )}
                        </>
                      )}
                      <a className="mini-btn" href={`https://wa.me/${waDigits(b.phone)}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>WhatsApp</a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rescheduleFor && (
        <RescheduleBox
          booking={rescheduleFor}
          settings={settings}
          onClose={() => setRescheduleFor(null)}
          onDone={(nb) => {
            setRescheduleFor(null);
            setActionMsg(`Rescheduled — new booking ref #${shortRef(nb.id)} on ${prettyDate(nb.date)} at ${nb.timeSlot}.`);
          }}
        />
      )}
    </div>
  );
}

function RescheduleBox({
  booking,
  settings,
  onClose,
  onDone,
}: {
  booking: Booking;
  settings: ClinicSettings | null;
  onClose: () => void;
  onDone: (nb: Booking) => void;
}) {
  const [date, setDate] = useState(booking.date);
  const [timeSlot, setTimeSlot] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const slots = buildSlotList(settings?.openHour ?? 15, settings?.closeHour ?? 21);
  const { taken, closed } = useAvailability(booking.branch, date, true);

  async function submit() {
    setError("");
    if (!timeSlot) return setError("Please choose a new time.");
    if (date === booking.date && timeSlot === booking.timeSlot)
      return setError("That is your current slot — please choose a different one.");
    setBusy(true);
    try {
      const nb = await rescheduleBooking(booking, date, timeSlot);
      onDone(nb);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reschedule failed — please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginTop: 16, borderColor: "var(--teal)" }}>
      <h4>Reschedule — {booking.service} ({booking.branch})</h4>
      <p className="muted">Current: {prettyDate(booking.date)} at {booking.timeSlot}. Your old booking becomes “Rescheduled” and a new Pending booking is created.</p>
      {error && <div className="error">{error}</div>}
      <div className="form-grid">
        <div>
          <label>New date</label>
          <input type="date" value={date} min={karachiToday()} onChange={(e) => { setDate(e.target.value); setTimeSlot(""); }} />
        </div>
        <div>
          <label>New time</label>
          {closed ? (
            <p className="muted">Closed on Sunday.</p>
          ) : (
            <div className="slot-grid">
              {slots.map((s) => (
                <button
                  type="button"
                  key={s}
                  className={`slot${timeSlot === s ? " selected" : ""}`}
                  disabled={taken.includes(s) || (date === booking.date && s === booking.timeSlot)}
                  onClick={() => setTimeSlot(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
        <button className="btn" type="button" onClick={() => void submit()} disabled={busy}>
          {busy ? "Rescheduling…" : "Confirm reschedule"}
        </button>
        <button className="btn ghost" type="button" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
