"use client";
import { useState, useEffect, useRef } from "react";
import { C, T } from "@/lib/tokens";

const BASE = "http://localhost:8000";
const getToken = () => typeof window !== "undefined" ? localStorage.getItem("ascencio_token") : null;

const OUTCOMES = [
  { value: "completed",          label: "Connected" },
  { value: "no_answer",          label: "No answer" },
  { value: "voicemail",          label: "Voicemail" },
  { value: "callback_scheduled", label: "Callback scheduled" },
  { value: "not_interested",     label: "Not interested" },
  { value: "wrong_number",       label: "Wrong number" },
];

export default function CallBar({ lead, contact, onClose, onCallLogged }) {
  const [device, setDevice]         = useState(null);
  const [call, setCall]             = useState(null);
  const [status, setStatus]         = useState("idle"); // idle | connecting | ringing | in_call | ended
  const [muted, setMuted]           = useState(false);
  const [seconds, setSeconds]       = useState(0);
  const [outcome, setOutcome]       = useState("completed");
  const [notes, setNotes]           = useState("");
  const [saving, setSaving]         = useState(false);
  const [callSid, setCallSid]       = useState(null);
  const timerRef                    = useRef(null);
  const startTimeRef                = useRef(null);

  const phoneNumber = contact?.phone || lead?.phone;

  // Load Twilio SDK + get token
  useEffect(() => {
    let dev;
    let cancelled = false;

    const init = async () => {
      try {
        const { Device } = await import("@twilio/voice-sdk");
        const res = await fetch(`${BASE}/calls/token`, {
          headers: { Authorization: `Bearer ${getToken()}` }
        });
        const data = await res.json();
        if (data.detail) throw new Error(data.detail);
        if (cancelled) return;

        dev = new Device(data.token, {
          logLevel: 1,
          codecPreferences: ["opus", "pcmu"],
          edge: ["dublin", "frankfurt", "ashburn"],
        });
        dev.on("error", (err) => {
          console.error("Twilio error:", err);
          setStatus("idle");
        });
        dev.on("disconnect", () => { setStatus("ended"); stopTimer(); });
        await dev.register();
        if (!cancelled) setDevice(dev);
      } catch (e) {
        if (!cancelled) {
          console.error("Twilio init failed:", e?.message || e);
          // Retry once after 3 seconds
          setTimeout(() => { if (!cancelled) init(); }, 3000);
        }
      }
    };

    init();
    return () => { cancelled = true; dev?.destroy(); stopTimer(); };
  }, []);

  const startTimer = () => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  };

  const stopTimer = () => {
    clearInterval(timerRef.current);
  };

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  const startCall = async () => {
    if (!device || !phoneNumber) return;
    setStatus("connecting");
    try {
      const c = await device.connect({
        params: { To: phoneNumber }
      });
      setCall(c);
      c.on("ringing", () => setStatus("ringing"));
      c.on("accept", () => { setStatus("in_call"); startTimer(); });
      c.on("disconnect", () => { setStatus("ended"); stopTimer(); });
      c.on("error", (e) => { console.error(e); setStatus("ended"); stopTimer(); });
      // Grab call SID when available
      c.on("accept", (conn) => {
        setCallSid(conn?.parameters?.CallSid || null);
      });
    } catch (e) {
      console.error("Call failed:", e);
      setStatus("idle");
    }
  };

  const endCall = () => {
    call?.disconnect();
    device?.disconnectAll();
    setStatus("ended");
    stopTimer();
  };

  const toggleMute = () => {
    if (!call) return;
    if (muted) { call.mute(false); setMuted(false); }
    else { call.mute(true); setMuted(true); }
  };

  const logAndClose = async () => {
    setSaving(true);
    try {
      await fetch(`${BASE}/calls/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({
          lead_id: lead.id,
          contact_id: contact?.id || null,
          twilio_call_sid: callSid,
          direction: "outbound",
          duration_seconds: seconds,
          outcome,
          notes,
          called_at: new Date().toISOString(),
        }),
      });
      onCallLogged?.();
      onClose();
    } catch (e) {
      alert("Failed to log call: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  const statusColors = {
    idle:       C.muted,
    connecting: C.callback,
    ringing:    C.callback,
    in_call:    C.confirmed,
    ended:      C.dead,
    error:      C.dead,
  };

  const statusLabels = {
    idle:       device ? "Ready" : "Loading...",
    connecting: "Connecting...",
    ringing:    "Ringing...",
    in_call:    `In call  ${fmt(seconds)}`,
    ended:      `Call ended  ${fmt(seconds)}`,
    error:      "Setup error — check .env",
  };

  return (
    <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 500, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 28px", boxShadow: "0 16px 48px rgba(0,0,0,0.18)", minWidth: 480, display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ ...T.heading, fontSize: 16, fontWeight: 700, color: C.text }}>{lead.business_name}</div>
          <div style={{ ...T.mono, fontSize: 12, color: C.muted, marginTop: 2 }}>
            {contact?.name ? `${contact.name} · ` : ""}{phoneNumber || "No phone number"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ ...T.mono, fontSize: 11, color: statusColors[status], fontWeight: 500 }}>
            {statusLabels[status]}
          </span>
          {status !== "in_call" && status !== "connecting" && status !== "ringing" && (
            <button onClick={onClose} style={{ background: "transparent", border: "none", color: C.muted, cursor: "pointer", fontSize: 18 }}>✕</button>
          )}
        </div>
      </div>

      {/* Call controls */}
      {status !== "ended" ? (
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {status === "idle" && (
            <button onClick={startCall} disabled={!device || !phoneNumber}
              style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: !device || !phoneNumber ? C.border : C.confirmed, color: "#FFF", ...T.body, fontSize: 14, fontWeight: 600, cursor: !device || !phoneNumber ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {!device ? "⏳ Connecting..." : `📞 Call ${phoneNumber || "—"}`}
            </button>
          )}

          {(status === "connecting" || status === "ringing") && (
            <button onClick={endCall}
              style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: C.dead, color: "#FFF", ...T.body, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              Cancel
            </button>
          )}

          {status === "in_call" && (
            <>
              <button onClick={toggleMute}
                style={{ padding: "12px 20px", borderRadius: 10, border: `1px solid ${C.border}`, background: muted ? C.callbackBg : C.subtle, color: muted ? C.callback : C.muted, ...T.body, fontSize: 13, cursor: "pointer" }}>
                {muted ? "🔇 Muted" : "🎤 Mute"}
              </button>
              <button onClick={endCall}
                style={{ flex: 1, padding: "12px", borderRadius: 10, border: "none", background: "rgba(220,50,50,0.9)", color: "#FFF", ...T.body, fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                ☎ End call  {fmt(seconds)}
              </button>
            </>
          )}
        </div>
      ) : (
        /* Post-call logging */
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ ...T.mono, fontSize: 10, color: C.accent, letterSpacing: "0.08em" }}>LOG THIS CALL — {fmt(seconds)}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {OUTCOMES.map(o => (
              <button key={o.value} onClick={() => setOutcome(o.value)}
                style={{ ...T.mono, fontSize: 11, padding: "4px 10px", borderRadius: 6, border: `1px solid ${outcome === o.value ? C.accent : C.border}`, background: outcome === o.value ? C.accentDim : "transparent", color: outcome === o.value ? C.accent : C.muted, cursor: "pointer" }}>
                {o.label}
              </button>
            ))}
          </div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes about the call..."
            rows={2}
            style={{ width: "100%", padding: "8px 10px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 8, ...T.body, fontSize: 13, color: C.text, outline: "none", resize: "none" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={{ ...T.body, fontSize: 13, padding: "8px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, cursor: "pointer" }}>
              Skip
            </button>
            <button onClick={logAndClose} disabled={saving}
              style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: C.accent, color: "#FFF", ...T.body, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              {saving ? "Saving..." : "Log call & close"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}