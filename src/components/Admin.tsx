// Admin dashboard — behind Firebase Email/Password login.
// Dashboard ONLY for the verified admin (itxmerajkhan3109@gmail.com,
// email verified). An unverified signed-in admin sees the verify-email
// screen with a Resend button.

import { useEffect, useMemo, useState } from "react";
import {
  CLINIC,
  SERVICES,
  slotHourLabel,
  prettyDate,
  waDigits,
} from "../clinic";
import {
  useAuth,
  useBookings,
  useInquiries,
  useOffers,
  useReviews,
  useDoctors,
  useClinicSettings,
  useSiteContent,
  saveSiteContent,
  toDirectImageUrl,
  seedDefaultsIfMissing,
  saveClinicSettings,
  setBookingStatus,
  setAdvanceStatus,
  deleteBooking,
  setInquiryStatus,
  deleteInquiry,
  setReviewStatus,
  deleteReview,
  saveOffer,
  deleteOffer,
  saveDoctor,
  deleteDoctor,
  saveGeminiKey,
  getGeminiKeyTail,
  fbSignIn,
  fbSignUp,
  fbSendPasswordReset,
  fbResendVerification,
  fbRefreshUser,
  fbSignOut,
  reminderUrl,
  shortRef,
  type Booking,
  type BookingStatus,
  type Offer,
  type GalleryImage,
  type FaqItem,
  type TitleTextItem,
} from "../firebase";

type Tab =
  | "Overview"
  | "Appointments"
  | "Patients"
  | "Doctors"
  | "Services"
  | "Locations"
  | "Reviews"
  | "Offers"
  | "Messages"
  | "Website Content"
  | "Settings";

const TABS: Tab[] = [
  "Overview",
  "Appointments",
  "Patients",
  "Doctors",
  "Services",
  "Locations",
  "Reviews",
  "Offers",
  "Messages",
  "Website Content",
  "Settings",
];

export function Admin({ onBack }: { onBack: () => void }) {
  const authState = useAuth();
  const [seeded, setSeeded] = useState(false);

  // Seed defaults on first verified admin sign-in (only if the docs
  // don't exist yet — never overwrites, never seeds test data).
  useEffect(() => {
    if (authState.status === "in" && !seeded) {
      setSeeded(true);
      seedDefaultsIfMissing().catch(() => undefined);
    }
  }, [authState.status, seeded]);

  if (authState.status === "loading") {
    return <div className="auth-box"><p>Loading admin…</p></div>;
  }
  if (authState.status === "out" || authState.status === "not-admin") {
    return (
      <AuthBox
        onBack={onBack}
        notAdmin={authState.status === "not-admin"}
      />
    );
  }
  if (authState.status === "unverified") {
    return <VerifyBox onBack={onBack} email={authState.user?.email ?? ""} />;
  }
  return <Dashboard onBack={onBack} />;
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

function AuthBox({ onBack, notAdmin }: { onBack: () => void; notAdmin: boolean }) {
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState<string>(CLINIC.adminEmail);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    setBusy(true);
    try {
      if (mode === "signin") await fbSignIn(email, password);
      else if (mode === "signup") {
        await fbSignUp(email, password);
        setMsg("Account created — check your email for the verification link, then sign in.");
      } else {
        await fbSendPasswordReset(email);
        setMsg("Password reset email sent — check your inbox.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-box">
      <h1>Admin — {CLINIC.name}</h1>
      <p className="muted">Clinic staff only. Sign in with the admin account.</p>
      {notAdmin && (
        <div className="error">
          That account is not the clinic admin. Please sign in with {CLINIC.adminEmail}.
        </div>
      )}
      <div className="tabs-row">
        <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => setMode("signin")}>Sign in</button>
        <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => setMode("signup")}>Sign up</button>
        <button type="button" className={mode === "forgot" ? "active" : ""} onClick={() => setMode("forgot")}>Forgot password</button>
      </div>
      {error && <div className="error">{error}</div>}
      {msg && <div className="notice">{msg}</div>}
      <form onSubmit={(e) => void submit(e)}>
        <label htmlFor="ad-email">Email</label>
        <input id="ad-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        {mode !== "forgot" && (
          <>
            <label htmlFor="ad-pass" style={{ marginTop: 12 }}>Password</label>
            <input id="ad-pass" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </>
        )}
        <button className="btn block" type="submit" disabled={busy} style={{ marginTop: 16 }}>
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset email"}
        </button>
      </form>
      <p style={{ marginTop: 16 }}>
        <button className="btn ghost small" type="button" onClick={onBack}>← Back to website</button>
      </p>
    </div>
  );
}

function VerifyBox({ onBack, email }: { onBack: () => void; email: string }) {
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function resend() {
    setError("");
    setMsg("");
    setBusy(true);
    try {
      await fbResendVerification();
      setMsg("Verification email sent — check your inbox (and spam).");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend.");
    } finally {
      setBusy(false);
    }
  }

  async function checkNow() {
    setError("");
    const verified = await fbRefreshUser();
    if (!verified) setError("Not verified yet — click the link in the email first, then try again.");
  }

  return (
    <div className="auth-box">
      <h1>Verify your email</h1>
      <p>
        You are signed in as <b>{email}</b>, but the email is not verified yet.
        The dashboard unlocks after verification.
      </p>
      {msg && <div className="notice">{msg}</div>}
      {error && <div className="error">{error}</div>}
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button className="btn" type="button" onClick={() => void resend()} disabled={busy}>
          {busy ? "Sending…" : "Resend verification email"}
        </button>
        <button className="btn ghost" type="button" onClick={() => void checkNow()}>
          I've verified — check now
        </button>
        <button className="btn ghost" type="button" onClick={() => void fbSignOut()}>
          Sign out
        </button>
      </div>
      <p style={{ marginTop: 16 }}>
        <button className="btn ghost small" type="button" onClick={onBack}>← Back to website</button>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                           */
/* ------------------------------------------------------------------ */

function Dashboard({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<Tab>("Overview");
  const inquiries = useInquiries();
  const newCount = inquiries.filter((i) => i.status === "New").length;

  return (
    <div className="admin-shell">
      <aside className="admin-side">
        <h2>Refine Aesthetics</h2>
        <div className="sub">Admin dashboard · {CLINIC.adminEmail}</div>
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={tab === t ? "active" : ""}
            onClick={() => setTab(t)}
          >
            {t}
            {t === "Messages" && newCount > 0 ? ` (${newCount})` : ""}
            {t === "Reviews" ? "" : ""}
          </button>
        ))}
        <button type="button" onClick={onBack}>← Back to website</button>
        <button type="button" onClick={() => void fbSignOut()}>Sign out</button>
      </aside>
      <main className="admin-main">
        {tab === "Overview" && <OverviewTab onGo={setTab} />}
        {tab === "Appointments" && <AppointmentsTab />}
        {tab === "Patients" && <PatientsTab />}
        {tab === "Doctors" && <DoctorsTab />}
        {tab === "Services" && <ServicesTab />}
        {tab === "Locations" && <LocationsTab />}
        {tab === "Reviews" && <ReviewsTab />}
        {tab === "Offers" && <OffersTab />}
        {tab === "Messages" && <MessagesTab />}
        {tab === "Website Content" && <WebsiteContentTab />}
        {tab === "Settings" && <SettingsTab />}
      </main>
    </div>
  );
}

function csvDownload(filename: string, rows: string[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function OverviewTab({ onGo }: { onGo: (t: Tab) => void }) {
  const bookings = useBookings();
  const today = new Date().toISOString().slice(0, 10);
  const total = bookings.length;
  const pending = bookings.filter((b) => b.status === "Pending").length;
  const confirmed = bookings.filter((b) => b.status === "Confirmed").length;
  const completed = bookings.filter((b) => b.status === "Completed").length;
  const cancelled = bookings.filter((b) => b.status === "Cancelled").length;
  const hot = bookings.filter((b) => b.priority === "HOT-EMERGENCY" && b.status !== "Cancelled" && b.status !== "Completed").length;
  const todayCount = bookings.filter((b) => b.date === today && b.status !== "Cancelled").length;
  const advancePending = bookings.filter((b) => b.advanceStatus === "Pending verification").length;
  const upcoming = bookings
    .filter((b) => (b.status === "Pending" || b.status === "Confirmed") && b.date >= today)
    .sort((a, b) => `${a.date} ${a.timeSlot}`.localeCompare(`${b.date} ${b.timeSlot}`))
    .slice(0, 10);

  return (
    <div>
      <h1>Overview</h1>
      <p className="muted">All figures come from real bookings in Firestore — nothing is invented.</p>
      <div className="kpi-grid">
        <div className="kpi"><b>{total}</b><span>Total bookings</span></div>
        <div className="kpi"><b>{pending}</b><span>Pending confirmation</span></div>
        <div className="kpi"><b>{confirmed}</b><span>Confirmed</span></div>
        <div className="kpi"><b>{completed}</b><span>Completed</span></div>
        <div className="kpi"><b>{hot}</b><span>HOT-EMERGENCY open</span></div>
        <div className="kpi"><b>{todayCount}</b><span>Appointments today</span></div>
        <div className="kpi"><b>{advancePending}</b><span>Advances pending verification</span></div>
        <div className="kpi"><b>{cancelled}</b><span>Cancelled</span></div>
      </div>
      {hot > 0 && (
        <div className="error">
          {hot} HOT-EMERGENCY booking{hot > 1 ? "s" : ""} need{hot > 1 ? "" : "s"} attention — see Appointments.
        </div>
      )}
      <h2 style={{ marginTop: 24 }}>Upcoming appointments</h2>
      {upcoming.length === 0 ? (
        <p className="muted">No upcoming appointments.</p>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Patient</th><th>Service</th><th>Branch</th><th>Date</th><th>Time</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {upcoming.map((b) => (
                <tr key={b.id}>
                  <td>{b.patientName}<div className="muted">{b.phone}</div>{b.priority === "HOT-EMERGENCY" && <span className="hot-flag">HOT-EMERGENCY</span>}</td>
                  <td>{b.service}</td>
                  <td>{b.branch}</td>
                  <td>{prettyDate(b.date)}</td>
                  <td>{b.timeSlot}</td>
                  <td><span className={`status-badge ${b.status}`}>{b.status}</span></td>
                  <td>
                    <a className="mini-btn" href={reminderUrl(b)} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>
                      WhatsApp reminder
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ marginTop: 16 }}>
        <button className="btn ghost small" type="button" onClick={() => onGo("Appointments")}>Open all appointments →</button>
      </p>
    </div>
  );
}

function AppointmentsTab() {
  const bookings = useBookings();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return bookings.filter((b) => {
      if (statusFilter !== "All" && b.status !== statusFilter) return false;
      if (!q) return true;
      return (
        b.patientName.toLowerCase().includes(q) ||
        b.phone.includes(q) ||
        b.service.toLowerCase().includes(q) ||
        b.branch.toLowerCase().includes(q) ||
        b.date.includes(q) ||
        shortRef(b.id).toLowerCase().includes(q)
      );
    });
  }, [bookings, query, statusFilter]);

  // HOT-EMERGENCY first, then newest.
  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const aHot = a.priority === "HOT-EMERGENCY" && a.status !== "Cancelled" && a.status !== "Completed" ? 0 : 1;
        const bHot = b.priority === "HOT-EMERGENCY" && b.status !== "Cancelled" && b.status !== "Completed" ? 0 : 1;
        return aHot - bHot || b.createdAtMs - a.createdAtMs;
      }),
    [filtered],
  );

  async function changeStatus(b: Booking, status: BookingStatus) {
    setError("");
    setBusyId(b.id);
    try {
      await setBookingStatus(b.id, status);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status.");
    } finally {
      setBusyId("");
    }
  }

  function exportCsv() {
    csvDownload(`refine-bookings-${new Date().toISOString().slice(0, 10)}.csv`, [
      ["Ref", "Patient", "Phone", "Service", "Branch", "Date", "Time", "Status", "Priority", "Doctor preference", "Advance method", "Advance txn", "Advance status", "Notes", "Created"],
      ...sorted.map((b) => [
        shortRef(b.id), b.patientName, b.phone, b.service, b.branch, b.date, b.timeSlot,
        b.status, b.priority, b.doctorPreference, b.advanceMethod, b.advanceTxnId,
        b.advanceStatus, b.notes, b.createdAt,
      ]),
    ]);
  }

  return (
    <div>
      <h1>Appointments</h1>
      <p className="muted">HOT-EMERGENCY bookings are pinned at the top. Status changes update the patient's receipt live.</p>
      {error && <div className="error">{error}</div>}
      <div className="toolbar">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, phone, service, ref…" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {["All", "Pending", "Confirmed", "Completed", "Cancelled", "Rescheduled", "No-show"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button className="btn ghost small" type="button" onClick={exportCsv}>Export CSV</button>
      </div>
      {sorted.length === 0 ? (
        <p className="muted">No bookings yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr><th>Ref / Patient</th><th>Service</th><th>Branch · Date · Time</th><th>Status</th><th>Advance</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {sorted.map((b) => (
                <tr key={b.id}>
                  <td>
                    #{shortRef(b.id)}<br /><b>{b.patientName}</b>
                    <div className="muted">{b.phone}</div>
                    {b.priority === "HOT-EMERGENCY" && <span className="hot-flag">HOT-EMERGENCY</span>}
                    {b.doctorPreference && <div className="muted">Prefers: {b.doctorPreference}</div>}
                    {b.notes && <div className="muted">“{b.notes}”</div>}
                  </td>
                  <td>{b.service}</td>
                  <td>{b.branch}<br />{prettyDate(b.date)}<br />{b.timeSlot}</td>
                  <td><span className={`status-badge ${b.status}`}>{b.status}</span></td>
                  <td>
                    {b.advanceMethod === "None" ? (
                      <span className="muted">None</span>
                    ) : (
                      <>
                        {b.advanceMethod} — {b.advanceTxnId || "no txn ID"}<br />
                        <b>{b.advanceStatus === "Verified" ? "Verified ✓" : "Advance pending verification"}</b>
                        {b.advanceStatus === "Pending verification" && (
                          <div style={{ marginTop: 6 }}>
                            <button
                              className="mini-btn"
                              type="button"
                              disabled={busyId === b.id}
                              onClick={() => {
                                setBusyId(b.id);
                                setAdvanceStatus(b.id, "Verified").catch(() => setError("Could not verify advance.")).finally(() => setBusyId(""));
                              }}
                            >
                              Mark advance verified
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </td>
                  <td>
                    <div className="row-actions">
                      {b.status === "Pending" && (
                        <button className="mini-btn" type="button" disabled={busyId === b.id} onClick={() => void changeStatus(b, "Confirmed")}>Approve</button>
                      )}
                      {b.status !== "Completed" && b.status !== "Cancelled" && (
                        <button className="mini-btn" type="button" disabled={busyId === b.id} onClick={() => void changeStatus(b, "Completed")}>Complete</button>
                      )}
                      {b.status !== "Cancelled" && (
                        <button className="mini-btn danger" type="button" disabled={busyId === b.id} onClick={() => void changeStatus(b, "Cancelled")}>Cancel</button>
                      )}
                      {b.status === "Cancelled" && (
                        <button className="mini-btn danger" type="button" disabled={busyId === b.id} onClick={() => {
                          if (window.confirm("Delete this booking permanently?")) {
                            setBusyId(b.id);
                            deleteBooking(b).catch(() => setError("Could not delete.")).finally(() => setBusyId(""));                           }
                        }}>Delete</button>
                      )}
                      <a className="mini-btn" href={reminderUrl(b)} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>WhatsApp reminder</a>
                      <a className="mini-btn" href={`https://wa.me/${waDigits(b.phone)}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>Chat</a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PatientsTab() {
  const bookings = useBookings();
  const [query, setQuery] = useState("");
  const patients = useMemo(() => {
    const map = new Map<string, { phone: string; name: string; count: number; last: string; services: Set<string> }>();
    for (const b of bookings) {
      const key = b.phone;
      const p = map.get(key) ?? { phone: key, name: b.patientName, count: 0, last: b.date, services: new Set<string>() };
      p.count += 1;
      p.services.add(b.service);
      if (b.date > p.last) p.last = b.date;
      map.set(key, p);
    }
    return [...map.values()].sort((a, b) => b.count - a.count);
  }, [bookings]);
  const filtered = patients.filter((p) => {
    const q = query.trim().toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || p.phone.includes(q);
  });

  return (
    <div>
      <h1>Patients</h1>
      <p className="muted">Patients are grouped from real bookings by phone number.</p>
      <div className="toolbar">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or phone…" />
      </div>
      {filtered.length === 0 ? (
        <p className="muted">No patients yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Name</th><th>Phone</th><th>Bookings</th><th>Services</th><th>Last visit</th><th></th></tr></thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.phone}>
                  <td>{p.name}</td>
                  <td>{p.phone}</td>
                  <td>{p.count}</td>
                  <td>{[...p.services].join(", ")}</td>
                  <td>{prettyDate(p.last)}</td>
                  <td>
                    <a className="mini-btn" href={`https://wa.me/${waDigits(p.phone)}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>WhatsApp</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DoctorsTab() {
  const doctors = useDoctors();
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [note, setNote] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    if (name.trim().length < 2) return setError("Please enter the doctor's name.");
    setBusy(true);
    try {
      await saveDoctor({ id: editingId ?? undefined, name: name.trim(), role: role.trim() || "Doctor", note: note.trim() });
      setMsg("Doctor saved.");
      setName("");
      setRole("");
      setNote("");
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1>Doctors</h1>
      <p className="muted">The clinic is run by Dr. Areesha Wasay. Add other doctors here only if they really work at the clinic — never invent names.</p>
      {error && <div className="error">{error}</div>}
      {msg && <div className="notice">{msg}</div>}
      {doctors.length === 0 && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3>{CLINIC.doctor}</h3>
          <p className="muted">Founder and lead doctor — aesthetics, skincare and dental, at both branches.</p>
          <button
            className="btn small"
            type="button"
            onClick={() => {
              setName(CLINIC.doctor);
              setRole("Founder & Lead Doctor");
              setNote("Aesthetics, skincare and dental — both branches.");
            }}
          >
            Add Dr. Areesha to the list
          </button>
        </div>
      )}
      {doctors.length > 0 && (
        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <table className="data">
            <thead><tr><th>Name</th><th>Role</th><th>Note</th><th></th></tr></thead>
            <tbody>
              {doctors.map((d) => (
                <tr key={d.id}>
                  <td><b>{d.name}</b></td>
                  <td>{d.role}</td>
                  <td>{d.note}</td>
                  <td>
                    <div className="row-actions">
                      <button className="mini-btn" type="button" onClick={() => { setEditingId(d.id); setName(d.name); setRole(d.role); setNote(d.note); }}>Edit</button>
                      <button className="mini-btn danger" type="button" onClick={() => {
                        if (window.confirm(`Remove ${d.name}?`)) deleteDoctor(d.id).catch(() => setError("Could not delete."));
                      }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="card">
        <h3>{editingId ? "Edit doctor" : "Add a doctor"}</h3>
        <form onSubmit={(e) => void save(e)}>
          <div className="form-grid">
            <div>
              <label htmlFor="dr-name">Name</label>
              <input id="dr-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Dr. Areesha Wasay" />
            </div>
            <div>
              <label htmlFor="dr-role">Role</label>
              <input id="dr-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Founder & Lead Doctor" />
            </div>
            <div className="full">
              <label htmlFor="dr-note">Note</label>
              <input id="dr-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Aesthetics, skincare and dental — both branches." />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button className="btn" type="submit" disabled={busy}>{busy ? "Saving…" : editingId ? "Save changes" : "Add doctor"}</button>
            {editingId && <button className="btn ghost" type="button" onClick={() => { setEditingId(null); setName(""); setRole(""); setNote(""); }}>Cancel edit</button>}
          </div>
        </form>
      </div>
    </div>
  );
}

function ServicesTab() {
  const { settings, loading } = useClinicSettings();
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!loading && !loaded) {
      setPrices(settings?.prices ?? {});
      setLoaded(true);
    }
  }, [loading, settings, loaded]);

  async function save() {
    setError("");
    setMsg("");
    setBusy(true);
    try {
      await saveClinicSettings({ prices });
      setMsg("Prices saved — the patient page now shows these fees. Blank means “Confirmed at consultation”.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1>Services</h1>
      <p className="muted">
        The 9 real services. Leave a price blank and the page shows
        “Confirmed at consultation” — never invent a fee.
      </p>
      {error && <div className="error">{error}</div>}
      {msg && <div className="notice">{msg}</div>}
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th>Service</th><th>Category</th><th>Duration</th><th>Price (leave blank = confirmed at consultation)</th></tr></thead>
          <tbody>
            {SERVICES.map((s) => (
              <tr key={s.name}>
                <td><b>{s.name}</b></td>
                <td>{s.category}</td>
                <td>{s.duration}</td>
                <td>
                  <input
                    value={prices[s.name] ?? ""}
                    onChange={(e) => setPrices({ ...prices, [s.name]: e.target.value })}
                    placeholder="e.g. Rs 5,000"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ marginTop: 14 }}>
        <button className="btn" type="button" onClick={() => void save()} disabled={busy}>
          {busy ? "Saving…" : "Save prices"}
        </button>
      </div>
    </div>
  );
}

function LocationsTab() {
  return (
    <div>
      <h1>Locations</h1>
      <p className="muted">The clinic's two real branches. Addresses come from the clinic's own details.</p>
      <div className="grid cols-2">
        {CLINIC.branches.map((b) => (
          <div className="card" key={b.name}>
            <h3>{b.name} branch</h3>
            <p>{b.address}</p>
            <p className="muted">Open {CLINIC.defaultHoursLabel}</p>
            <a className="btn ghost small" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(b.mapQuery)}`} target="_blank" rel="noreferrer">Directions</a>
          </div>
        ))}
      </div>
      <p className="muted" style={{ marginTop: 14 }}>
        Branch details are fixed clinic facts and are edited in the code, not here — so a wrong address can never be typed into the live page by mistake.
      </p>
    </div>
  );
}

function ReviewsTab() {
  const reviews = useReviews(true);
  const [error, setError] = useState("");
  const pending = reviews.filter((r) => r.status === "pending");

  return (
    <div>
      <h1>Reviews</h1>
      <p className="muted">
        {pending.length} review{pending.length === 1 ? "" : "s"} waiting for approval. Only approved reviews appear on the public page.
      </p>
      {error && <div className="error">{error}</div>}
      {reviews.length === 0 ? (
        <p className="muted">No reviews yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Patient</th><th>Service</th><th>Rating</th><th>Review</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {reviews.map((r) => (
                <tr key={r.id}>
                  <td>{r.patientName}</td>
                  <td>{r.service}</td>
                  <td>{"★".repeat(Math.max(1, Math.min(5, r.rating)))}</td>
                  <td>{r.text}</td>
                  <td><span className={`status-badge ${r.status === "approved" ? "Confirmed" : r.status === "rejected" ? "Cancelled" : ""}`}>{r.status}</span></td>
                  <td>
                    <div className="row-actions">
                      {r.status !== "approved" && (
                        <button className="mini-btn" type="button" onClick={() => setReviewStatus(r.id, "approved").catch(() => setError("Could not approve."))}>Approve</button>
                      )}
                      {r.status !== "rejected" && (
                        <button className="mini-btn" type="button" onClick={() => setReviewStatus(r.id, "rejected").catch(() => setError("Could not reject."))}>Reject</button>
                      )}
                      <button className="mini-btn danger" type="button" onClick={() => {
                        if (window.confirm("Delete this review?")) deleteReview(r.id).catch(() => setError("Could not delete."));
                      }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function OffersTab() {
  const offers = useOffers(true);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [discount, setDiscount] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [active, setActive] = useState(true);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  function startEdit(o: Offer) {
    setEditing(o);
    setTitle(o.title);
    setDescription(o.description);
    setDiscount(o.discount);
    setValidUntil(o.validUntil);
    setActive(o.active);
  }

  function reset() {
    setEditing(null);
    setTitle("");
    setDescription("");
    setDiscount("");
    setValidUntil("");
    setActive(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMsg("");
    if (title.trim().length < 2) return setError("Please enter an offer title.");
    setBusy(true);
    try {
      await saveOffer({
        id: editing?.id,
        title: title.trim(),
        description: description.trim(),
        discount: discount.trim(),
        validUntil: validUntil.trim(),
        active,
      });
      setMsg(editing ? "Offer updated." : "Offer added.");
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1>Offers</h1>
      <p className="muted">Only active offers show on the patient page. The seeded “Free Consultation” offer is created on first admin sign-in.</p>
      {error && <div className="error">{error}</div>}
      {msg && <div className="notice">{msg}</div>}
      {offers.length > 0 && (
        <div className="table-wrap" style={{ marginBottom: 16 }}>
          <table className="data">
            <thead><tr><th>Offer</th><th>Discount</th><th>Valid till</th><th>Active</th><th>Actions</th></tr></thead>
            <tbody>
              {offers.map((o) => (
                <tr key={o.id}>
                  <td><b>{o.title}</b><div className="muted">{o.description}</div></td>
                  <td>{o.discount || "—"}</td>
                  <td>{o.validUntil || "—"}</td>
                  <td>{o.active ? "Yes" : "No"}</td>
                  <td>
                    <div className="row-actions">
                      <button className="mini-btn" type="button" onClick={() => startEdit(o)}>Edit</button>
                      <button className="mini-btn danger" type="button" onClick={() => {
                        if (window.confirm(`Delete the offer “${o.title}”?`)) deleteOffer(o.id).catch(() => setError("Could not delete."));
                      }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="card">
        <h3>{editing ? "Edit offer" : "Add an offer"}</h3>
        <form onSubmit={(e) => void save(e)}>
          <div className="form-grid">
            <div>
              <label htmlFor="of-title">Title</label>
              <input id="of-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Free Consultation" />
            </div>
            <div>
              <label htmlFor="of-discount">Discount / label</label>
              <input id="of-discount" value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="e.g. 100% FREE" />
            </div>
            <div className="full">
              <label htmlFor="of-desc">Description</label>
              <textarea id="of-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What does the patient get?" />
            </div>
            <div>
              <label htmlFor="of-valid">Valid until (optional)</label>
              <input id="of-valid" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} placeholder="e.g. 31 Dec 2026" />
            </div>
            <div>
              <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 24 }}>
                <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} style={{ width: "auto" }} />
                Active (show on the website)
              </label>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <button className="btn" type="submit" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Add offer"}</button>
            {editing && <button className="btn ghost" type="button" onClick={reset}>Cancel edit</button>}
          </div>
        </form>
      </div>
    </div>
  );
}

function MessagesTab() {
  const inquiries = useInquiries();
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const filtered = inquiries.filter((i) => {
    const q = query.trim().toLowerCase();
    return !q || i.name.toLowerCase().includes(q) || i.phone.includes(q) || i.message.toLowerCase().includes(q) || i.source.toLowerCase().includes(q);
  });

  return (
    <div>
      <h1>Messages / Inquiries</h1>
      <p className="muted">Callback requests from the website and “Talk to staff” handoffs from Sarah chat.</p>
      {error && <div className="error">{error}</div>}
      <div className="toolbar">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, phone, message…" />
      </div>
      {filtered.length === 0 ? (
        <p className="muted">No messages yet.</p>
      ) : (
        <div className="table-wrap">
          <table className="data">
            <thead><tr><th>Name</th><th>Phone</th><th>Message</th><th>Source</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id}>
                  <td>{i.name}</td>
                  <td>{i.phone}</td>
                  <td>{i.message}<div className="muted">{i.createdAt ? new Date(i.createdAt).toLocaleString() : ""}</div></td>
                  <td>{i.source}</td>
                  <td><span className={`status-badge ${i.status === "New" ? "" : i.status === "Resolved" ? "Confirmed" : "Completed"}`}>{i.status}</span></td>
                  <td>
                    <div className="row-actions">
                      {i.status === "New" && (
                        <button className="mini-btn" type="button" onClick={() => setInquiryStatus(i.id, "Contacted").catch(() => setError("Could not update."))}>Mark contacted</button>
                      )}
                      {i.status !== "Resolved" && (
                        <button className="mini-btn" type="button" onClick={() => setInquiryStatus(i.id, "Resolved").catch(() => setError("Could not update."))}>Resolve</button>
                      )}
                      <a className="mini-btn" href={`https://wa.me/${waDigits(i.phone)}?text=${encodeURIComponent(`Hello ${i.name}, this is Refine Aesthetics — you asked us to get in touch. How can we help?`)}`} target="_blank" rel="noreferrer" style={{ textDecoration: "none" }}>WhatsApp</a>
                      <button className="mini-btn danger" type="button" onClick={() => {
                        if (window.confirm("Delete this message?")) deleteInquiry(i.id).catch(() => setError("Could not delete."));
                      }}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SettingsTab() {
  const { settings, loading } = useClinicSettings();
  const [openHour, setOpenHour] = useState(15);
  const [closeHour, setCloseHour] = useState(21);
  const [jazzcashNumber, setJazzcashNumber] = useState("");
  const [jazzcashTitle, setJazzcashTitle] = useState("");
  const [easypaisaNumber, setEasypaisaNumber] = useState("");
  const [easypaisaTitle, setEasypaisaTitle] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Gemini key
  const [geminiKey, setGeminiKey] = useState("");
  const [geminiTail, setGeminiTail] = useState("");
  const [geminiMsg, setGeminiMsg] = useState("");
  const [geminiError, setGeminiError] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!loading && !loaded) {
      setOpenHour(settings?.openHour ?? 15);
      setCloseHour(settings?.closeHour ?? 21);
      setJazzcashNumber(settings?.jazzcashNumber ?? "");
      setJazzcashTitle(settings?.jazzcashTitle ?? "");
      setEasypaisaNumber(settings?.easypaisaNumber ?? "");
      setEasypaisaTitle(settings?.easypaisaTitle ?? "");
      setLoaded(true);
      getGeminiKeyTail().then(setGeminiTail).catch(() => undefined);
    }
  }, [loading, settings, loaded]);

  const hoursLabel = `Monday to Saturday, ${slotHourLabel(openHour)} – ${slotHourLabel(closeHour)}`;

  async function saveTimings() {
    setError("");
    setMsg("");
    if (closeHour <= openHour) return setError("Closing hour must be after the opening hour.");
    if (closeHour - openHour > 16) return setError("The opening window is too wide.");
    setBusy(true);
    try {
      await saveClinicSettings({ openHour, closeHour, hours: hoursLabel, sunday: CLINIC.sundayNote });
      setMsg(`Timings saved — patients now see slots from ${slotHourLabel(openHour)} to ${slotHourLabel(closeHour)} (inclusive).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save timings.");
    } finally {
      setBusy(false);
    }
  }

  async function savePayments() {
    setError("");
    setMsg("");
    setBusy(true);
    try {
      await saveClinicSettings({
        jazzcashNumber: jazzcashNumber.trim(),
        jazzcashTitle: jazzcashTitle.trim(),
        easypaisaNumber: easypaisaNumber.trim(),
        easypaisaTitle: easypaisaTitle.trim(),
        payments: true,
      });
      setMsg("Payment numbers saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save payment numbers.");
    } finally {
      setBusy(false);
    }
  }

  async function saveKey() {
    setGeminiError("");
    setGeminiMsg("");
    if (geminiKey.trim().length < 10) return setGeminiError("Paste the full Gemini API key first.");
    setBusy(true);
    try {
      await saveGeminiKey(geminiKey.trim());
      setGeminiTail(geminiKey.trim().slice(-4));
      setGeminiKey("");
      setGeminiMsg("Key saved to Firestore (admin-only). Only the last 4 characters are ever shown. Note: the server can only use this stored key if FIREBASE_SERVICE_ACCOUNT is set in Vercel — otherwise set GEMINI_API_KEY in Vercel env vars (easiest).");
    } catch (err) {
      setGeminiError(err instanceof Error ? err.message : "Could not save the key.");
    } finally {
      setBusy(false);
    }
  }

  async function testKey() {
    setGeminiError("");
    setGeminiMsg("");
    const key = geminiKey.trim();
    if (key.length < 10) return setGeminiError("Paste the key in the field above first, then test it.");
    setTesting(true);
    try {
      const res = await fetch("/api/test-gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
        signal: AbortSignal.timeout(15000),
      });
      const data = (await res.json()) as { ok?: boolean; model?: string; error?: string };
      if (data.ok) setGeminiMsg(`Connection works — ${data.model ?? "Gemini"} answered. You can now save the key.`);
      else setGeminiError(`Test failed: ${data.error ?? "Gemini did not answer"}. Check the key and try again.`);
    } catch {
      setGeminiError("Test failed — the server did not answer. Try again.");
    } finally {
      setTesting(false);
    }
  }

  const hourOptions = Array.from({ length: 24 }, (_, h) => h);

  return (
    <div>
      <h1>Settings</h1>
      {error && <div className="error">{error}</div>}
      {msg && <div className="notice">{msg}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Clinic timings</h3>
        <p className="muted">
          Slots are generated hourly from the opening hour through the closing hour, <b>inclusive</b> — e.g. 3–9 PM gives 3, 4, 5, 6, 7, 8 and 9 PM.
          Sundays are always closed.
        </p>
        <div className="form-grid">
          <div>
            <label htmlFor="st-open">Opens at</label>
            <select id="st-open" value={openHour} onChange={(e) => setOpenHour(Number(e.target.value))}>
              {hourOptions.map((h) => <option key={h} value={h}>{slotHourLabel(h)}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="st-close">Closes at (last slot)</label>
            <select id="st-close" value={closeHour} onChange={(e) => setCloseHour(Number(e.target.value))}>
              {hourOptions.map((h) => <option key={h} value={h}>{slotHourLabel(h)}</option>)}
            </select>
          </div>
        </div>
        <p style={{ marginTop: 10 }}>Preview: <b>{hoursLabel}</b></p>
        <button className="btn" type="button" onClick={() => void saveTimings()} disabled={busy}>
          {busy ? "Saving…" : "Save timings"}
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Payment numbers (advance payment)</h3>
        <p className="muted">Shown to patients in the booking flow. The booking stays “Advance pending verification” until you verify it in Appointments.</p>
        <div className="form-grid">
          <div>
            <label htmlFor="st-jc-num">JazzCash number</label>
            <input id="st-jc-num" value={jazzcashNumber} onChange={(e) => setJazzcashNumber(e.target.value)} placeholder="03xx xxxxxxx" inputMode="tel" />
          </div>
          <div>
            <label htmlFor="st-jc-title">JazzCash account title</label>
            <input id="st-jc-title" value={jazzcashTitle} onChange={(e) => setJazzcashTitle(e.target.value)} placeholder="Account holder name" />
          </div>
          <div>
            <label htmlFor="st-ep-num">EasyPaisa number</label>
            <input id="st-ep-num" value={easypaisaNumber} onChange={(e) => setEasypaisaNumber(e.target.value)} placeholder="03xx xxxxxxx" inputMode="tel" />
          </div>
          <div>
            <label htmlFor="st-ep-title">EasyPaisa account title</label>
            <input id="st-ep-title" value={easypaisaTitle} onChange={(e) => setEasypaisaTitle(e.target.value)} placeholder="Account holder name" />
          </div>
        </div>
        <div style={{ marginTop: 12 }}>
          <button className="btn" type="button" onClick={() => void savePayments()} disabled={busy}>
            {busy ? "Saving…" : "Save payment numbers"}
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Sarah — Gemini API key</h3>
        <p className="muted">
          Sarah (the AI receptionist) needs a Gemini API key. Easiest: set <b>GEMINI_API_KEY</b> in
          Vercel → Project → Settings → Environment Variables. Alternatively, save the key here — it
          is stored in the admin-only Firestore doc <code>settings/gemini</code> and the server can
          use it only if <b>FIREBASE_SERVICE_ACCOUNT</b> is also set in Vercel. Without any key,
          Sarah answers from the clinic knowledge base — that is expected, not an error.
        </p>
        {geminiError && <div className="error">{geminiError}</div>}
        {geminiMsg && <div className="notice">{geminiMsg}</div>}
        <p>
          Saved key:{" "}
          {geminiTail ? (
            <b>••••••••{geminiTail}</b>
          ) : (
            <span className="muted">none saved in Firestore</span>
          )}
        </p>
        <label htmlFor="st-key">Gemini API key (paste to save or test — never shared or logged)</label>
        <input
          id="st-key"
          type="password"
          value={geminiKey}
          onChange={(e) => setGeminiKey(e.target.value)}
          placeholder="Paste the Gemini API key here"
          autoComplete="off"
        />
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button className="btn" type="button" onClick={() => void testKey()} disabled={testing}>
            {testing ? "Testing…" : "Test connection"}
          </button>
          <button className="btn ghost" type="button" onClick={() => void saveKey()} disabled={busy}>
            {busy ? "Saving…" : "Save key to Firestore"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Website Content tab — the admin edits the public site itself.       */
/* Everything saved here appears on the live site at once (the         */
/* patient page reads settings/site-content live). Text that was never  */
/* saved falls back to the built-in defaults, so nothing renders       */
/* blank. Pictures are image LINKS the admin pastes — a Google Drive   */
/* share link works (it is converted to a direct image URL); the Drive  */
/* file must be shared as "Anyone with the link". No upload, no        */
/* Firebase Storage — the project stays on the free Spark plan.        */
/* ------------------------------------------------------------------ */

function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ display: "block", fontWeight: 600, marginBottom: 4 }}>{label}</label>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          style={{ width: "100%" }}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ width: "100%" }}
        />
      )}
    </div>
  );
}

function PairRows({
  items,
  onChange,
  titlePh,
  textPh,
}: {
  items: { title: string; text: string }[];
  onChange: (v: { title: string; text: string }[]) => void;
  titlePh: string;
  textPh: string;
}) {
  const set = (i: number, patch: Partial<{ title: string; text: string }>) =>
    onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  return (
    <div>
      {items.map((it, i) => (
        <div key={i} className="card" style={{ marginBottom: 10, padding: 12 }}>
          <Field label="Title" value={it.title} onChange={(v) => set(i, { title: v })} placeholder={titlePh} />
          <Field label="Text" value={it.text} onChange={(v) => set(i, { text: v })} placeholder={textPh} textarea />
          <button className="mini-btn danger" type="button" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            Remove
          </button>
        </div>
      ))}
      <button className="btn ghost" type="button" onClick={() => onChange([...items, { title: "", text: "" }])}>
        + Add item
      </button>
    </div>
  );
}

function FaqRows({
  items,
  onChange,
}: {
  items: FaqItem[];
  onChange: (v: FaqItem[]) => void;
}) {
  const set = (i: number, patch: Partial<FaqItem>) =>
    onChange(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  return (
    <div>
      {items.map((it, i) => (
        <div key={i} className="card" style={{ marginBottom: 10, padding: 12 }}>
          <Field label="Question" value={it.q} onChange={(v) => set(i, { q: v })} placeholder="What should patients ask?" />
          <Field label="Answer" value={it.a} onChange={(v) => set(i, { a: v })} placeholder="The answer patients see" textarea />
          <button className="mini-btn danger" type="button" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            Remove
          </button>
        </div>
      ))}
      <button className="btn ghost" type="button" onClick={() => onChange([...items, { q: "", a: "" }])}>
        + Add question
      </button>
    </div>
  );
}

function StringRows({
  items,
  onChange,
  placeholder,
}: {
  items: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div>
      {items.map((it, i) => (
        <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            value={it}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))}
            placeholder={placeholder}
            style={{ flex: 1 }}
          />
          <button className="mini-btn danger" type="button" onClick={() => onChange(items.filter((_, j) => j !== i))}>
            Remove
          </button>
        </div>
      ))}
      <button className="btn ghost" type="button" onClick={() => onChange([...items, ""])}>
        + Add point
      </button>
    </div>
  );
}

const HEADING_LABELS: { key: keyof import("../firebase").SiteHeadings; label: string }[] = [
  { key: "howItWorks", label: "How it works section" },
  { key: "treatments", label: "Treatments section" },
  { key: "pricing", label: "Prices section" },
  { key: "whyUs", label: "Why choose us section" },
  { key: "firstVisit", label: "First visit section" },
  { key: "gallery", label: "Gallery section" },
  { key: "reviews", label: "Reviews section" },
  { key: "dentalTips", label: "Dental tips section" },
  { key: "faq", label: "FAQ section" },
  { key: "booking", label: "Booking section" },
  { key: "portal", label: "Patient Portal section" },
];

function WebsiteContentTab() {
  const { content, loading } = useSiteContent();
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Clinic identity
  const [clinicName, setClinicName] = useState("");
  const [tagline, setTagline] = useState("");
  const [heroHeading, setHeroHeading] = useState("");
  const [heroSub, setHeroSub] = useState("");
  const [doctorName, setDoctorName] = useState("");
  const [consultationLine, setConsultationLine] = useState("");
  const [bookingPhone, setBookingPhone] = useState("");
  const [bookingPhoneWa, setBookingPhoneWa] = useState("");
  const [instagram, setInstagram] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [sundayNote, setSundayNote] = useState("");

  // Section headings
  const [headings, setHeadings] = useState(content.headings);

  // Images (link-based)
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [heroUrlDraft, setHeroUrlDraft] = useState("");
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [newPhotoUrl, setNewPhotoUrl] = useState("");
  const [newPhotoTitle, setNewPhotoTitle] = useState("");

  // Lists
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [howItWorks, setHowItWorks] = useState<TitleTextItem[]>([]);
  const [whyChooseUs, setWhyChooseUs] = useState<TitleTextItem[]>([]);
  const [firstVisit, setFirstVisit] = useState<TitleTextItem[]>([]);
  const [dentalTips, setDentalTips] = useState<TitleTextItem[]>([]);
  const [doctorPoints, setDoctorPoints] = useState<string[]>([]);

  useEffect(() => {
    if (loading || loaded) return;
    setClinicName(content.clinicName);
    setTagline(content.tagline);
    setHeroHeading(content.heroHeading);
    setHeroSub(content.heroSub);
    setDoctorName(content.doctorName);
    setConsultationLine(content.consultationLine);
    setBookingPhone(content.bookingPhone);
    setBookingPhoneWa(content.bookingPhoneWa);
    setInstagram(content.instagram);
    setInstagramUrl(content.instagramUrl);
    setSundayNote(content.sundayNote);
    setHeadings(content.headings);
    setHeroImageUrl(content.heroImageUrl);
    setHeroUrlDraft(content.heroImageUrl);
    setGallery(content.gallery);
    setFaqs(content.faqs);
    setHowItWorks(content.howItWorks);
    setWhyChooseUs(content.whyChooseUs);
    setFirstVisit(content.firstVisit);
    setDentalTips(content.dentalTips);
    setDoctorPoints(content.doctorPoints);
    setLoaded(true);
  }, [content, loading, loaded]);

  async function save(patch: Parameters<typeof saveSiteContent>[0], note: string) {
    setError("");
    setMsg("");
    setBusy(true);
    try {
      await saveSiteContent(patch);
      setMsg(note);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function useHeroUrl() {
    setError("");
    setMsg("");
    const url = toDirectImageUrl(heroUrlDraft);
    if (!/^https?:\/\//.test(url)) return setError("Paste a full image link starting with https://");
    setBusy(true);
    try {
      setHeroImageUrl(url);
      await saveSiteContent({ heroImageUrl: url });
      setMsg("Hero image saved — it is live on the site now.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function addGalleryPhoto() {
    setError("");
    setMsg("");
    const url = toDirectImageUrl(newPhotoUrl);
    if (!/^https?:\/\//.test(url)) return setError("Paste a full image link starting with https://");
    const next = [...gallery, { url, title: newPhotoTitle.trim() || "New photo" }];
    setBusy(true);
    try {
      setGallery(next);
      setNewPhotoUrl("");
      setNewPhotoTitle("");
      await saveSiteContent({ gallery: next });
      setMsg("Photo added — it is live in the gallery now.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  const cleanPairs = (items: TitleTextItem[]) => items.filter((x) => x.title.trim() || x.text.trim());
  const cleanFaqs = (items: FaqItem[]) => items.filter((x) => x.q.trim() || x.a.trim());

  return (
    <div>
      <h1>Website Content</h1>
      <p className="muted">
        Everything here changes the live public site the moment you save it. Pictures work by link: paste an image
        link (a Google Drive share link works — share the file as &quot;Anyone with the link&quot; first, the link is
        converted automatically). Anything you leave untouched keeps the current text and pictures.
      </p>
      {error && <div className="error">{error}</div>}
      {msg && <div className="notice">{msg}</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Clinic &amp; hero</h2>
        <Field label="Clinic name" value={clinicName} onChange={setClinicName} />
        <Field label="Tagline (under the clinic name)" value={tagline} onChange={setTagline} />
        <Field label="Hero heading (big title)" value={heroHeading} onChange={setHeroHeading} textarea />
        <Field label="Hero subheading" value={heroSub} onChange={setHeroSub} textarea />
        <Field label="Doctor name" value={doctorName} onChange={setDoctorName} />
        <Field label="Consultation line" value={consultationLine} onChange={setConsultationLine} />
        <Field label="Booking phone" value={bookingPhone} onChange={setBookingPhone} />
        <Field label="WhatsApp number (country code, no +)" value={bookingPhoneWa} onChange={setBookingPhoneWa} />
        <Field label="Instagram handle" value={instagram} onChange={setInstagram} />
        <Field label="Instagram URL" value={instagramUrl} onChange={setInstagramUrl} />
        <Field label="Sunday note" value={sundayNote} onChange={setSundayNote} textarea />
        <button
          className="btn"
          type="button"
          disabled={busy}
          onClick={() =>
            void save(
              {
                clinicName: clinicName.trim(),
                tagline: tagline.trim(),
                heroHeading: heroHeading.trim(),
                heroSub: heroSub.trim(),
                doctorName: doctorName.trim(),
                consultationLine: consultationLine.trim(),
                bookingPhone: bookingPhone.trim(),
                bookingPhoneWa: bookingPhoneWa.trim(),
                instagram: instagram.trim(),
                instagramUrl: instagramUrl.trim(),
                sundayNote: sundayNote.trim(),
              },
              "Clinic & hero saved — live on the site now.",
            )
          }
        >
          Save clinic &amp; hero
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Hero image</h2>
        {heroImageUrl ? (
          <img src={heroImageUrl} alt="Hero" style={{ maxWidth: 320, borderRadius: 8, display: "block", marginBottom: 10 }} />
        ) : (
          <p className="muted">No hero image yet — the hero shows the headline only.</p>
        )}
        <Field label="Image link" value={heroUrlDraft} onChange={setHeroUrlDraft} placeholder="https://drive.google.com/file/d/... or a direct image link" />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn" type="button" disabled={busy} onClick={() => void useHeroUrl()}>
            Use this image
          </button>
          {heroImageUrl && (
            <button
              className="btn ghost"
              type="button"
              disabled={busy}
              onClick={() => {
                setHeroImageUrl("");
                setHeroUrlDraft("");
                void save({ heroImageUrl: "" }, "Hero image removed.");
              }}
            >
              Remove image
            </button>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Section headings</h2>
        {HEADING_LABELS.map(({ key, label }) => (
          <Field key={key} label={label} value={headings[key]} onChange={(v) => setHeadings({ ...headings, [key]: v })} />
        ))}
        <button className="btn" type="button" disabled={busy} onClick={() => void save({ headings }, "Headings saved — live on the site now.")}>
          Save headings
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Gallery photos</h2>
        <p className="muted">Paste an image link to add a photo. Edit a title, then save the gallery. Removing a photo here removes it from the site.</p>
        {gallery.length === 0 && <p className="muted">No gallery photos yet.</p>}
        {gallery.map((g, i) => (
          <div key={i} className="card" style={{ marginBottom: 10, padding: 12 }}>
            {g.url && <img src={g.url} alt={g.title || "Gallery photo"} style={{ maxWidth: 220, borderRadius: 8, display: "block", marginBottom: 8 }} />}
            <Field
              label="Photo title"
              value={g.title}
              onChange={(v) => setGallery(gallery.map((x, j) => (j === i ? { ...x, title: v } : x)))}
            />
            <button className="mini-btn danger" type="button" onClick={() => setGallery(gallery.filter((_, j) => j !== i))}>
              Remove photo
            </button>
          </div>
        ))}
        <Field label="New photo link" value={newPhotoUrl} onChange={setNewPhotoUrl} placeholder="https://drive.google.com/file/d/... or a direct image link" />
        <Field label="New photo title" value={newPhotoTitle} onChange={setNewPhotoTitle} placeholder="e.g. Reception" />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="btn" type="button" disabled={busy} onClick={() => void addGalleryPhoto()}>
            Add photo
          </button>
          <button className="btn ghost" type="button" disabled={busy} onClick={() => void save({ gallery }, "Gallery saved — live on the site now.")}>
            Save gallery
          </button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>FAQs</h2>
        <FaqRows items={faqs} onChange={setFaqs} />
        <button className="btn" type="button" disabled={busy} onClick={() => void save({ faqs: cleanFaqs(faqs) }, "FAQs saved — live on the site now.")} style={{ marginTop: 10 }}>
          Save FAQs
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>How it works</h2>
        <PairRows items={howItWorks} onChange={setHowItWorks} titlePh="Step title" textPh="Step description" />
        <button className="btn" type="button" disabled={busy} onClick={() => void save({ howItWorks: cleanPairs(howItWorks) }, "Saved — live on the site now.")} style={{ marginTop: 10 }}>
          Save how it works
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Why choose us</h2>
        <PairRows items={whyChooseUs} onChange={setWhyChooseUs} titlePh="Reason title" textPh="Reason description" />
        <button className="btn" type="button" disabled={busy} onClick={() => void save({ whyChooseUs: cleanPairs(whyChooseUs) }, "Saved — live on the site now.")} style={{ marginTop: 10 }}>
          Save why choose us
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Your first visit</h2>
        <PairRows items={firstVisit} onChange={setFirstVisit} titlePh="Point title" textPh="Point description" />
        <button className="btn" type="button" disabled={busy} onClick={() => void save({ firstVisit: cleanPairs(firstVisit) }, "Saved — live on the site now.")} style={{ marginTop: 10 }}>
          Save first visit
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Dental tips</h2>
        <PairRows items={dentalTips} onChange={setDentalTips} titlePh="Tip title" textPh="Tip text" />
        <button className="btn" type="button" disabled={busy} onClick={() => void save({ dentalTips: cleanPairs(dentalTips) }, "Saved — live on the site now.")} style={{ marginTop: 10 }}>
          Save dental tips
        </button>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Doctor points</h2>
        <p className="muted">Short points shown under the doctor&apos;s name.</p>
        <StringRows items={doctorPoints} onChange={setDoctorPoints} placeholder="e.g. 10+ years of experience" />
        <button
          className="btn"
          type="button"
          disabled={busy}
          onClick={() => void save({ doctorPoints: doctorPoints.map((s) => s.trim()).filter(Boolean) }, "Saved — live on the site now.")}
          style={{ marginTop: 10 }}
        >
          Save doctor points
        </button>
      </div>
    </div>
  );
}
