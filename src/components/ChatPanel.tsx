// Sarah — AI receptionist chat.
// Calls /api/ask-sarah (Gemini). When the route reports
// aiConnected: false (no key configured, timeout, or API failure),
// answers come from the local knowledge base — expected behaviour.

import { useEffect, useRef, useState } from "react";
import {
  CLINIC,
  SERVICES,
  karachiToday,
  knowledgeBaseAnswer,
  type KbExtras,
} from "../clinic";
import {
  useClinicSettings,
  useOffers,
  slotListFor,
  createBooking,
  submitInquiry,
  shortRef,
  type Booking,
} from "../firebase";
import { Receipt } from "./Booking";

type ChatMsg = { role: "user" | "model"; text: string };
type FlowStep =
  | "idle"
  | "service"
  | "branch"
  | "date"
  | "time"
  | "name"
  | "phone"
  | "confirm";

export function ChatPanel() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    {
      role: "model",
      text: `Hello! I'm Sarah, the AI receptionist at ${CLINIC.name}. I can help with timings, branches, services and appointments — or tap "Book appointment" to start booking.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [aiConnected, setAiConnected] = useState<boolean | null>(null);
  const [flow, setFlow] = useState<FlowStep>("idle");
  const [flowData, setFlowData] = useState({
    service: SERVICES[0].name,
    branch: "Clifton",
    date: karachiToday(),
    timeSlot: "",
    name: "",
    phone: "",
  });
  const [flowError, setFlowError] = useState("");
  const [flowBusy, setFlowBusy] = useState(false);
  const [flowBooking, setFlowBooking] = useState<Booking | null>(null);
  const [staffForm, setStaffForm] = useState(false);
  const [staffName, setStaffName] = useState("");
  const [staffPhone, setStaffPhone] = useState("");
  const [staffMsg, setStaffMsg] = useState("");
  const [staffDone, setStaffDone] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const { settings } = useClinicSettings();
  const offers = useOffers(false);

  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight });
  }, [msgs, typing, flow, flowBooking]);

  function extras(): KbExtras {
    return {
      hours: settings?.hours ?? CLINIC.defaultHoursLabel,
      sunday: settings?.sunday ?? CLINIC.sundayNote,
      prices: settings?.prices ?? {},
      payments: {
        jazzcash: { number: settings?.jazzcashNumber ?? "", title: settings?.jazzcashTitle ?? "" },
        easypaisa: { number: settings?.easypaisaNumber ?? "", title: settings?.easypaisaTitle ?? "" },
      },
      offers: offers.map((o) => ({ title: o.title, discount: o.discount, validUntil: o.validUntil })),
    };
  }

  async function askSarah(userText: string) {
    const history = [...msgs, { role: "user" as const, text: userText }].slice(-6);
    setTyping(true);
    try {
      const res = await fetch("/api/ask-sarah", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, extras: extras() }),
        signal: AbortSignal.timeout(12000),
      });
      const data = (await res.json()) as { aiConnected?: boolean; reply?: string };
      if (data.aiConnected && data.reply) {
        setAiConnected(true);
        setMsgs((m) => [...m, { role: "model", text: data.reply as string }]);
      } else {
        setAiConnected(false);
        setMsgs((m) => [...m, { role: "model", text: knowledgeBaseAnswer(userText, extras()) }]);
      }
    } catch {
      setAiConnected(false);
      setMsgs((m) => [...m, { role: "model", text: knowledgeBaseAnswer(userText, extras()) }]);
    } finally {
      setTyping(false);
    }
  }

  function send(text: string) {
    const t = text.trim();
    if (!t || typing) return;
    setMsgs((m) => [...m, { role: "user", text: t }]);
    setInput("");
    void askSarah(t);
  }

  function startBooking() {
    setFlowBooking(null);
    setFlowError("");
    setFlow("service");
    setMsgs((m) => [
      ...m,
      { role: "model", text: "Great — let's book your appointment. Which treatment would you like?" },
    ]);
  }

  function flowNext() {
    setFlowError("");
    if (flow === "service") setFlow("branch");
    else if (flow === "branch") setFlow("date");
    else if (flow === "date") {
      if (!flowData.date) return setFlowError("Please choose a date.");
      setFlow("time");
    } else if (flow === "time") {
      if (!flowData.timeSlot) return setFlowError("Please choose a time.");
      setFlow("name");
    } else if (flow === "name") {
      if (flowData.name.trim().length < 2) return setFlowError("Please enter your full name.");
      setFlow("phone");
    } else if (flow === "phone") {
      const digits = flowData.phone.replace(/\D/g, "");
      if (digits.length < 10 || digits.length > 13)
        return setFlowError("Please enter a valid mobile number (e.g. 0334 1234567).");
      setFlow("confirm");
    }
  }

  async function flowConfirm() {
    setFlowBusy(true);
    setFlowError("");
    try {
      const b = await createBooking({
        patientName: flowData.name,
        phone: flowData.phone,
        service: flowData.service,
        branch: flowData.branch,
        date: flowData.date,
        timeSlot: flowData.timeSlot,
        notes: "",
        doctorPreference: "No preference",
        emergency: false,
        advanceMethod: "None",
        advanceTxnId: "",
        settings,
      });
      setFlowBooking(b);
      setFlow("idle");
      setMsgs((m) => [
        ...m,
        {
          role: "model",
          text: `Done! Your booking is saved as "Pending Clinic Confirmation" — ref #${shortRef(b.id)}. Your receipt is below; you can also confirm on WhatsApp.`,
        },
      ]);
    } catch (err) {
      setFlowError(err instanceof Error ? err.message : "Booking failed — please try again.");
    } finally {
      setFlowBusy(false);
    }
  }

  async function submitStaff() {
    if (staffName.trim().length < 2 || staffPhone.replace(/\D/g, "").length < 10) {
      setFlowError("Please enter your name and a valid mobile number.");
      return;
    }
    try {
      await submitInquiry({
        name: staffName.trim(),
        phone: staffPhone.trim(),
        message: staffMsg.trim() || "Patient asked to talk to staff (from Sarah chat).",
        source: "Sarah chat — Talk to staff",
      });
      setStaffDone(true);
      setStaffForm(false);
      setMsgs((m) => [
        ...m,
        { role: "model", text: "Thank you — your request has gone to the clinic team. Staff will contact you on your number. For anything urgent, call 0334 3151514." },
      ]);
    } catch {
      setFlowError("Could not send — please try again or call 0334 3151514.");
    }
  }

  const slots = slotListFor(settings);

  return (
    <>
      <button className="chat-fab" type="button" onClick={() => setOpen((o) => !o)}>
        {open ? "Close chat ✕" : "💬 Chat with Sarah"}
      </button>
      {open && (
        <div className="chat-panel" role="dialog" aria-label="Chat with Sarah">
          <div className="chat-head">
            <b>Sarah — AI receptionist</b>
            <span>
              {CLINIC.name} · replies 24/7 ·{" "}
              {aiConnected === true ? "AI connected" : aiConnected === false ? "answering from clinic info" : "online"}
            </span>
          </div>
          <div className="chat-body" ref={bodyRef}>
            {msgs.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                {m.text}
                {m.role === "model" && (
                  <span className="sys">Sarah · AI receptionist (not a human)</span>
                )}
              </div>
            ))}
            {typing && <div className="typing">Sarah is typing…</div>}
            {flowBooking && (
              <div style={{ background: "#fff", borderRadius: 12, padding: 4 }}>
                <Receipt booking={flowBooking} onAnother={() => { setFlowBooking(null); startBooking(); }} />
              </div>
            )}
            {flow !== "idle" && !flowBooking && (
              <div className="msg sarah" style={{ maxWidth: "100%" }}>
                <b>Book appointment</b>
                {flowError && <div className="error" style={{ marginTop: 8 }}>{flowError}</div>}
                {flow === "service" && (
                  <>
                    <label style={{ marginTop: 8 }}>Treatment</label>
                    <select value={flowData.service} onChange={(e) => setFlowData({ ...flowData, service: e.target.value })}>
                      {SERVICES.map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}
                    </select>
                  </>
                )}
                {flow === "branch" && (
                  <>
                    <label style={{ marginTop: 8 }}>Branch</label>
                    <select value={flowData.branch} onChange={(e) => setFlowData({ ...flowData, branch: e.target.value })}>
                      <option value="Clifton">Clifton — Vincy Mall, Block 9</option>
                      <option value="Johar">Johar — Al Khizra Heights</option>
                    </select>
                  </>
                )}
                {flow === "date" && (
                  <>
                    <label style={{ marginTop: 8 }}>Date</label>
                    <input type="date" value={flowData.date} min={karachiToday()} onChange={(e) => setFlowData({ ...flowData, date: e.target.value })} />
                  </>
                )}
                {flow === "time" && (
                  <>
                    <label style={{ marginTop: 8 }}>Time</label>
                    <div className="slot-grid">
                      {slots.map((s) => (
                        <button type="button" key={s} className={`slot${flowData.timeSlot === s ? " selected" : ""}`} onClick={() => setFlowData({ ...flowData, timeSlot: s })}>{s}</button>
                      ))}
                    </div>
                  </>
                )}
                {flow === "name" && (
                  <>
                    <label style={{ marginTop: 8 }}>Your full name</label>
                    <input value={flowData.name} onChange={(e) => setFlowData({ ...flowData, name: e.target.value })} placeholder="e.g. Ayesha Khan" />
                  </>
                )}
                {flow === "phone" && (
                  <>
                    <label style={{ marginTop: 8 }}>Mobile number</label>
                    <input value={flowData.phone} onChange={(e) => setFlowData({ ...flowData, phone: e.target.value })} placeholder="0334 1234567" inputMode="tel" />
                  </>
                )}
                {flow === "confirm" && (
                  <div style={{ marginTop: 8, fontSize: 14 }}>
                    <b>{flowData.service}</b><br />
                    {flowData.branch} · {flowData.date} · {flowData.timeSlot}<br />
                    {flowData.name} · {flowData.phone}<br />
                    Status after confirming: <b>Pending — Clinic Confirmation</b>
                  </div>
                )}
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  {flow === "confirm" ? (
                    <button className="btn small" type="button" onClick={() => void flowConfirm()} disabled={flowBusy}>
                      {flowBusy ? "Saving…" : "Confirm booking"}
                    </button>
                  ) : (
                    <button className="btn small" type="button" onClick={flowNext}>Next</button>
                  )}
                  <button className="btn ghost small" type="button" onClick={() => setFlow("idle")}>Cancel</button>
                </div>
              </div>
            )}
            {staffForm && (
              <div className="msg sarah" style={{ maxWidth: "100%" }}>
                <b>Talk to staff</b>
                <p style={{ fontSize: 13, margin: "6px 0" }}>Leave your details — the clinic team will contact you.</p>
                {flowError && <div className="error">{flowError}</div>}
                <label>Your name</label>
                <input value={staffName} onChange={(e) => setStaffName(e.target.value)} placeholder="Your name" />
                <label style={{ marginTop: 8 }}>Mobile number</label>
                <input value={staffPhone} onChange={(e) => setStaffPhone(e.target.value)} placeholder="0334 1234567" inputMode="tel" />
                <label style={{ marginTop: 8 }}>Message (optional)</label>
                <textarea rows={2} value={staffMsg} onChange={(e) => setStaffMsg(e.target.value)} placeholder="What do you need help with?" />
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button className="btn small" type="button" onClick={() => void submitStaff()}>Send to staff</button>
                  <button className="btn ghost small" type="button" onClick={() => setStaffForm(false)}>Cancel</button>
                </div>
              </div>
            )}
            {staffDone && <div className="msg sarah">Your request is with the clinic team. ✅</div>}
          </div>
          <div className="chat-quick">
            <button type="button" onClick={startBooking}>Book appointment</button>
            <button type="button" onClick={() => send("What are the clinic timings?")}>Timings</button>
            <button type="button" onClick={() => send("What services do you offer?")}>Services</button>
            <button type="button" onClick={() => send("Where are the branches?")}>Branches</button>
            <button type="button" onClick={() => { setStaffForm(true); setStaffDone(false); }}>Talk to staff</button>
          </div>
          <div className="chat-input">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") send(input); }}
              placeholder="Ask Sarah anything…"
              aria-label="Message Sarah"
            />
            <button type="button" onClick={() => send(input)} disabled={typing}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}
