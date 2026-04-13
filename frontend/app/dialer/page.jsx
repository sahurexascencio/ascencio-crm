"use client";
import { useState, useEffect, useRef } from "react";
import Shell from "@/components/Shell";
import { C, T } from "@/lib/tokens";

const BASE = "http://localhost:8000";
const getToken = () => typeof window !== "undefined" ? localStorage.getItem("ascencio_token") : null;
const req = (path, opts = {}) => fetch(`${BASE}${path}`, {
  ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...(opts.headers || {}) }
}).then(r => r.json());

const OUTCOMES = [
  { value: "completed",          label: "Connected" },
  { value: "no_answer",          label: "No answer" },
  { value: "voicemail",          label: "Voicemail" },
  { value: "callback_scheduled", label: "Callback" },
  { value: "not_interested",     label: "Not interested" },
  { value: "wrong_number",       label: "Wrong number" },
];

function fmt(s) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function timeAgo(d) {
  const diff = Math.floor((Date.now() - new Date(d)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export default function DialerPage() {
  const [number, setNumber]     = useState("");
  const [note, setNote]         = useState("");
  const [device, setDevice]     = useState(null);
  const [call, setCall]         = useState(null);
  const [status, setStatus]     = useState("idle"); // idle | connecting | ringing | in_call | ended
  const [muted, setMuted]       = useState(false);
  const [seconds, setSeconds]   = useState(0);
  const [outcome, setOutcome]   = useState("completed");
  const [callSid, setCallSid]   = useState(null);
  const [saving, setSaving]     = useState(false);
  const [log, setLog]           = useState([]);
  const timerRef = useRef(null);
  const startRef = useRef(null);

  // Init Twilio device
  useEffect(() => {
    let dev;
    (async () => {
      try {
        const { Device } = await import("@twilio/voice-sdk");
        const data = await req("/calls/token");
        if (data.detail) return;
        dev = new Device(data.token, { logLevel: 1, codecPreferences: ["opus", "pcmu"] });
        dev.on("error", () => setStatus("idle"));
        dev.on("disconnect", () => { setStatus("ended"); clearInterval(timerRef.current); });
        await dev.register();
        setDevice(dev);
      } catch {}
    })();
    loadLog();
    return () => { dev?.destroy(); clearInterval(timerRef.current); };
  }, []);

  const loadLog = () => {
    req("/calls/recent").then(setLog).catch(() => {});
  };

  const startCall = async () => {
    if (!device || !number.trim()) return;
    setStatus("connecting");
    setSeconds(0);
    try {
      const c = await device.connect({ params: { To: number.trim() } });
      setCall(c);
      c.on("ringing", () => setStatus("ringing"));
      c.on("accept", (conn) => {
        setStatus("in_call");
        setCallSid(conn?.parameters?.CallSid || null);
        startRef.current = Date.now();
        timerRef.current = setInterval(() => setSeconds(Math.floor((Date.now() - startRef.current) / 1000)), 1000);
      });
      c.on("disconnect", () => { setStatus("ended"); clearInterval(timerRef.current); });
      c.on("error", () => { setStatus("idle"); clearInterval(timerRef.current); });
    } catch { setStatus("idle"); }
  };

  const endCall = () => {
    call?.disconnect();
    device?.disconnectAll();
    setStatus("ended");
    clearInterval(timerRef.current);
  };

  const logCall = async () => {
    setSaving(true);
    try {
      await req("/calls/log_manual", {
        method: "POST",
        body: JSON.stringify({ phone_number: number.trim(), twilio_call_sid: callSid, direction: "outbound", duration_seconds: seconds, outcome, notes: note, called_at: new Date().toISOString() }),
      });
      setCall(null);
      setCallSid(null);
      setStatus("idle");
      setNote("");
      setSeconds(0);
      setMuted(false);
      setOutcome("completed");
      loadLog();
    } catch (e) { alert("Failed to log: " + e.message); }
    finally { setSaving(false); }
  };

  const dialPad = ["1","2","3","4","5","6","7","8","9","*","0","#"];

  const statusColor = { idle: C.muted, connecting: C.callback, ringing: C.callback, in_call: C.confirmed, ended: C.dead };
  const statusLabel = { idle: device ? "Ready" : "Loading...", connecting: "Connecting...", ringing: "Ringing...", in_call: `In call  ${fmt(seconds)}`, ended: `Ended  ${fmt(seconds)}` };

  return (
    <Shell topbarText="Dialer">
      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20, height: "calc(100vh - 120px)" }}>

        {/* LEFT — Call log */}
        <div style={{ background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ ...T.mono, fontSize: 11, color: C.muted, letterSpacing: "0.08em" }}>CALL LOG</div>
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {log.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", ...T.body, fontSize: 13, color: C.muted }}>No calls yet</div>
            )}
            {log.map((c, i) => {
              const outcomeColor = { completed: C.confirmed, no_answer: C.callback, not_interested: C.dead, voicemail: "#6650B8", callback_scheduled: "#2E7BC4", wrong_number: C.muted }[c.outcome] || C.muted;
              return (
                <div key={i} style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, cursor: "pointer" }}
                  onClick={() => setNumber(c.phone_number || "")}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ ...T.body, fontSize: 13, fontWeight: 500, color: C.text }}>{c.business_name || c.phone_number || "—"}</div>
                    <div style={{ ...T.mono, fontSize: 10, color: C.muted }}>{timeAgo(c.called_at)}</div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                    <div style={{ ...T.mono, fontSize: 11, color: C.muted }}>{c.phone_number}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ ...T.mono, fontSize: 10, color: C.muted }}>{fmt(c.duration_seconds || 0)}</span>
                      <span style={{ ...T.mono, fontSize: 10, color: outcomeColor, background: outcomeColor + "18", padding: "2px 7px", borderRadius: 4 }}>{c.outcome}</span>
                    </div>
                  </div>
                  {c.notes && <div style={{ ...T.body, fontSize: 11, color: C.muted, marginTop: 3, fontStyle: "italic" }}>{c.notes}</div>}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT — Dialer */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 24 }}>
          <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, padding: 32, width: 340, display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Status */}
            <div style={{ textAlign: "center" }}>
              <div style={{ ...T.mono, fontSize: 12, color: statusColor[status], fontWeight: 600, letterSpacing: "0.06em" }}>{statusLabel[status]}</div>
            </div>

            {/* Number input */}
            <input
              value={number}
              onChange={e => setNumber(e.target.value)}
              placeholder="+447..."
              style={{ width: "100%", padding: "14px 16px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 10, ...T.mono, fontSize: 20, color: C.text, outline: "none", textAlign: "center", letterSpacing: "0.05em" }}
            />

            {/* Dial pad */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
              {dialPad.map(d => (
                <button key={d} onClick={() => setNumber(n => n + d)}
                  style={{ padding: "14px", borderRadius: 10, border: `1px solid ${C.border}`, background: C.subtle, color: C.text, ...T.mono, fontSize: 18, fontWeight: 500, cursor: "pointer" }}>
                  {d}
                </button>
              ))}
            </div>

            {/* Backspace */}
            <button onClick={() => setNumber(n => n.slice(0, -1))}
              style={{ padding: "8px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, ...T.mono, fontSize: 12, cursor: "pointer" }}>
              ⌫ Delete
            </button>

            {/* Call / End button */}
            {status === "idle" && (
              <button onClick={startCall} disabled={!device || !number.trim()}
                style={{ padding: "16px", borderRadius: 12, border: "none", background: !device || !number.trim() ? C.border : C.confirmed, color: "#FFF", ...T.body, fontSize: 16, fontWeight: 700, cursor: !device || !number.trim() ? "not-allowed" : "pointer" }}>
                📞 Call
              </button>
            )}
            {(status === "connecting" || status === "ringing") && (
              <button onClick={endCall}
                style={{ padding: "16px", borderRadius: 12, border: "none", background: C.dead, color: "#FFF", ...T.body, fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
                Cancel
              </button>
            )}
            {status === "in_call" && (
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => { call?.mute(!muted); setMuted(m => !m); }}
                  style={{ flex: 1, padding: "14px", borderRadius: 10, border: `1px solid ${C.border}`, background: muted ? C.callbackBg : C.subtle, color: muted ? C.callback : C.muted, ...T.body, fontSize: 14, cursor: "pointer" }}>
                  {muted ? "🔇 Muted" : "🎤 Mute"}
                </button>
                <button onClick={endCall}
                  style={{ flex: 2, padding: "14px", borderRadius: 10, border: "none", background: "rgba(220,50,50,0.9)", color: "#FFF", ...T.body, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  ☎ End  {fmt(seconds)}
                </button>
              </div>
            )}

            {/* Post-call logging */}
            {status === "ended" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, borderTop: `1px solid ${C.border}`, paddingTop: 16 }}>
                <div style={{ ...T.mono, fontSize: 10, color: C.accent, letterSpacing: "0.08em" }}>LOG CALL — {fmt(seconds)}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {OUTCOMES.map(o => (
                    <button key={o.value} onClick={() => setOutcome(o.value)}
                      style={{ ...T.mono, fontSize: 11, padding: "5px 10px", borderRadius: 6, border: `1px solid ${outcome === o.value ? C.accent : C.border}`, background: outcome === o.value ? C.accentDim : "transparent", color: outcome === o.value ? C.accent : C.muted, cursor: "pointer" }}>
                      {o.label}
                    </button>
                  ))}
                </div>
                <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Notes..." rows={2}
                  style={{ width: "100%", padding: "8px 10px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 8, ...T.body, fontSize: 13, color: C.text, outline: "none", resize: "none" }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => { setCall(null); setCallSid(null); setStatus("idle"); setSeconds(0); setMuted(false); }}
                    style={{ padding: "10px 16px", borderRadius: 8, border: `1px solid ${C.border}`, background: "transparent", color: C.muted, ...T.body, fontSize: 13, cursor: "pointer" }}>
                    Skip
                  </button>
                  <button onClick={logCall} disabled={saving}
                    style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: C.accent, color: "#FFF", ...T.body, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                    {saving ? "Saving..." : "Log & done"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}