"use client";
import { useState, useEffect, useRef } from "react";
import Shell from "@/components/Shell";
import { C, T } from "@/lib/tokens";

const BASE = "http://localhost:8000";
const getToken = () => typeof window !== "undefined" ? localStorage.getItem("ascencio_token") : null;
const req = (path, opts = {}) => fetch(`${BASE}${path}`, {
  ...opts,
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}`, ...(opts.headers || {}) }
}).then(r => r.json());

const CHANNEL_META = {
  sms:   { label: "SMS",   icon: "💬", color: C.new },
  email: { label: "Email", icon: "✉",  color: C.accent },
  note:  { label: "Note",  icon: "📝", color: C.muted },
};

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function fmtTime(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long" });
}

export default function InboxPage() {
  const [allLeads, setAllLeads]         = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedId, setSelectedId]     = useState(null);
  const [messages, setMessages]         = useState([]);
  const [leadInfo, setLeadInfo]         = useState(null);
  const [contacts, setContacts]         = useState([]);
  const [search, setSearch]             = useState("");
  const [compose, setCompose]           = useState("");
  const [channel, setChannel]           = useState("sms");
  const [emailSubject, setEmailSubject] = useState("");
  const [toNumber, setToNumber]         = useState("");
  const [toEmail, setToEmail]           = useState("");
  const [sending, setSending]           = useState(false);
  const bottomRef                       = useRef(null);
  const pollRef                         = useRef(null);

  useEffect(() => {
    // Read lead from URL manually — avoids useSearchParams re-render issues
    const params = new URLSearchParams(window.location.search);
    const leadId = params.get("lead");
    if (leadId) setSelectedId(leadId);

    loadAll();
    pollRef.current = setInterval(loadConversations, 15000);
    return () => clearInterval(pollRef.current);
  }, []);

  const loadAll = () => {
    loadConversations();
    req("/leads?limit=500&sort_by=business_name&sort_dir=asc")
      .then(setAllLeads).catch(() => {});
  };

  const loadConversations = () => {
    req("/messages/conversations").then(setConversations).catch(() => {});
  };

  // Merge conversations + all leads
  const mergedList = (() => {
    const convMap = {};
    conversations.forEach(c => { convMap[c.lead_id] = c; });
    const withConv = conversations;
    const withoutConv = allLeads
      .filter(l => !convMap[l.id])
      .map(l => ({ lead_id: l.id, business_name: l.business_name, city: l.city, last_message: null, channel: null, created_at: null }));
    return [...withConv, ...withoutConv];
  })();

  const filtered = mergedList.filter(c =>
    (c.business_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.city || "").toLowerCase().includes(search.toLowerCase())
  );

  // Load messages + lead info when selected
  useEffect(() => {
    if (!selectedId) return;
    loadMessages();
    req(`/leads/${selectedId}`).then(setLeadInfo).catch(() => {});
    req(`/contacts/lead/${selectedId}`).then(setContacts).catch(() => {});
    req(`/messages/lead/${selectedId}/read`, { method: "POST" }).catch(() => {});
  }, [selectedId]);

  // Auto-fill to number from contacts
  useEffect(() => {
    if (!contacts.length) return;
    const primary = contacts.find(c => c.is_primary) || contacts[0];
    if (primary?.phone && primary.phone !== "N/A") setToNumber(primary.phone);
    if (primary?.email) setToEmail(primary.email);
  }, [contacts]);

  const loadMessages = () => {
    if (!selectedId) return;
    req(`/messages/lead/${selectedId}`)
      .then(msgs => {
        setMessages(msgs || []);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
      }).catch(() => {});
  };

  const send = async () => {
    if (!compose.trim() || !selectedId) return;
    setSending(true);
    try {
      if (channel === "sms") {
        if (!toNumber) { alert("No phone number. Add one in the lead detail panel."); return; }
        await req("/messages/sms", { method: "POST", body: JSON.stringify({ lead_id: selectedId, to_number: toNumber, body: compose }) });
      } else if (channel === "email") {
        if (!toEmail) { alert("No email. Add one in the lead detail panel."); return; }
        await req("/messages/email", { method: "POST", body: JSON.stringify({ lead_id: selectedId, to_email: toEmail, subject: emailSubject || "(no subject)", body: compose }) });
      } else {
        await req("/messages/note", { method: "POST", body: JSON.stringify({ lead_id: selectedId, body: compose }) });
      }
      setCompose(""); setEmailSubject("");
      loadMessages(); loadConversations();
    } catch (e) { alert("Failed: " + e.message); }
    finally { setSending(false); }
  };

  const grouped = messages.reduce((acc, msg) => {
    const key = fmtDate(msg.created_at);
    if (!acc[key]) acc[key] = [];
    acc[key].push(msg);
    return acc;
  }, {});

  const selectedName = leadInfo?.business_name || mergedList.find(c => c.lead_id === selectedId)?.business_name || "";

  return (
    <Shell topbarText={`Inbox · ${conversations.length} conversations`}>
      <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", height: "calc(100vh - 120px)", background: C.surface, borderRadius: 12, border: `1px solid ${C.border}`, overflow: "hidden" }}>

        {/* Left panel */}
        <div style={{ borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
            <div style={{ ...T.heading, fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 10 }}>Conversations</div>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search all leads..."
              style={{ width: "100%", padding: "7px 10px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 7, ...T.body, fontSize: 13, color: C.text, outline: "none" }} />
          </div>
          <div style={{ flex: 1, overflowY: "auto" }}>
            {filtered.map(conv => {
              const active = selectedId === conv.lead_id;
              const ch = CHANNEL_META[conv.channel] || null;
              return (
                <button key={conv.lead_id}
                  onClick={() => { setSelectedId(conv.lead_id); setMessages([]); setLeadInfo(null); setContacts([]); setToNumber(""); setToEmail(""); }}
                  style={{ width: "100%", padding: "11px 16px", border: "none", borderBottom: `1px solid ${C.border}`, background: active ? C.accentDim : "transparent", cursor: "pointer", textAlign: "left" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 3 }}>
                    <span style={{ ...T.body, fontSize: 13, fontWeight: 500, color: active ? C.accent : C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180 }}>{conv.business_name}</span>
                    {conv.created_at && <span style={{ ...T.mono, fontSize: 10, color: C.muted, flexShrink: 0 }}>{timeAgo(conv.created_at)}</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    {ch && <span style={{ fontSize: 11 }}>{ch.icon}</span>}
                    <span style={{ ...T.body, fontSize: 12, color: C.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {conv.last_message || conv.city || "No messages yet"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right panel */}
        {!selectedId ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
            <span style={{ fontSize: 40 }}>💬</span>
            <span style={{ ...T.body, fontSize: 14, color: C.muted }}>Select a lead to start messaging</span>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
            {/* Header */}
            <div style={{ padding: "14px 20px", borderBottom: `1px solid ${C.border}`, flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ ...T.heading, fontSize: 15, fontWeight: 700, color: C.text }}>{selectedName}</div>
                <div style={{ ...T.mono, fontSize: 11, color: C.muted, marginTop: 2 }}>
                  {toNumber && `📞 ${toNumber}`}{toNumber && toEmail && " · "}{toEmail && `✉ ${toEmail}`}
                </div>
              </div>
              <a href={`/pipeline`} style={{ ...T.mono, fontSize: 11, color: C.accent, textDecoration: "none" }}>← Pipeline</a>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", minHeight: 0 }}>
              {messages.length === 0 && (
                <div style={{ textAlign: "center", padding: "40px 0", ...T.body, fontSize: 13, color: C.muted }}>
                  No messages yet. Send the first one below.
                </div>
              )}
              {Object.entries(grouped).map(([date, msgs]) => (
                <div key={date}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
                    <div style={{ flex: 1, height: 1, background: C.border }} />
                    <span style={{ ...T.mono, fontSize: 10, color: C.muted }}>{date}</span>
                    <div style={{ flex: 1, height: 1, background: C.border }} />
                  </div>
                  {msgs.map(msg => {
                    const isOut  = msg.direction === "outbound";
                    const isNote = msg.channel === "note";
                    const ch     = CHANNEL_META[msg.channel] || CHANNEL_META.sms;

                    if (isNote) {
                      return (
                        <div key={msg.id} style={{ margin: "8px 0", display: "flex", justifyContent: "center" }}>
                          <div style={{ padding: "5px 14px", background: C.subtle, borderRadius: 20, border: `1px solid ${C.border}`, maxWidth: "70%" }}>
                            <span style={{ fontSize: 11 }}>📝 </span>
                            <span style={{ ...T.body, fontSize: 12, color: C.muted }}>{msg.body}</span>
                            <span style={{ ...T.mono, fontSize: 10, color: C.muted, marginLeft: 8 }}>{fmtTime(msg.created_at)}</span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={msg.id} style={{ margin: "8px 0", display: "flex", flexDirection: "column", alignItems: isOut ? "flex-end" : "flex-start" }}>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, flexDirection: isOut ? "row-reverse" : "row" }}>
                          <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.subtle, border: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>
                            {ch.icon}
                          </div>
                          <div style={{ maxWidth: "65%", padding: "10px 14px", borderRadius: isOut ? "16px 16px 4px 16px" : "16px 16px 16px 4px", background: isOut ? C.accent : C.subtle, color: isOut ? "#FFF" : C.text }}>
                            {msg.subject && <div style={{ ...T.mono, fontSize: 10, opacity: 0.8, marginBottom: 4 }}>Re: {msg.subject}</div>}
                            <span style={{ ...T.body, fontSize: 13, lineHeight: 1.5, whiteSpace: "pre-wrap" }}>{msg.body}</span>
                          </div>
                        </div>
                        <div style={{ ...T.mono, fontSize: 10, color: C.muted, marginTop: 3, paddingLeft: isOut ? 0 : 28, paddingRight: isOut ? 28 : 0 }}>
                          {fmtTime(msg.created_at)} · {isOut ? (msg.status || "sent") : "received"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
              <div ref={bottomRef} style={{ height: 8 }} />
            </div>

            {/* Compose */}
            <div style={{ borderTop: `1px solid ${C.border}`, padding: "12px 20px", flexShrink: 0 }}>
              <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                {Object.entries(CHANNEL_META).map(([ch, meta]) => (
                  <button key={ch} onClick={() => setChannel(ch)}
                    style={{ ...T.mono, fontSize: 11, padding: "4px 12px", borderRadius: 20, border: `1px solid ${channel === ch ? C.accent : C.border}`, background: channel === ch ? C.accentDim : "transparent", color: channel === ch ? C.accent : C.muted, cursor: "pointer" }}>
                    {meta.icon} {meta.label}
                  </button>
                ))}
              </div>

              {channel === "sms" && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ ...T.mono, fontSize: 11, color: C.muted, flexShrink: 0 }}>To:</span>
                  <input value={toNumber} onChange={e => setToNumber(e.target.value)} placeholder="+44... or +20..."
                    style={{ flex: 1, padding: "6px 10px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 7, ...T.mono, fontSize: 12, color: C.text, outline: "none" }} />
                </div>
              )}

              {channel === "email" && (
                <>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ ...T.mono, fontSize: 11, color: C.muted, flexShrink: 0 }}>To:</span>
                    <input value={toEmail} onChange={e => setToEmail(e.target.value)} placeholder="email@clinic.com"
                      style={{ flex: 1, padding: "6px 10px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 7, ...T.body, fontSize: 12, color: C.text, outline: "none" }} />
                  </div>
                  <input value={emailSubject} onChange={e => setEmailSubject(e.target.value)} placeholder="Subject..."
                    style={{ width: "100%", padding: "6px 10px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 7, ...T.body, fontSize: 13, color: C.text, outline: "none", marginBottom: 8 }} />
                </>
              )}

              <div style={{ display: "flex", gap: 8 }}>
                <textarea value={compose} onChange={e => setCompose(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && channel !== "email") { e.preventDefault(); send(); } }}
                  placeholder={channel === "note" ? "Add a note..." : channel === "email" ? "Write email... (Shift+Enter for new line)" : "Type a message... (Enter to send)"}
                  rows={channel === "email" ? 4 : 2}
                  style={{ flex: 1, padding: "9px 12px", background: C.subtle, border: `1px solid ${C.border}`, borderRadius: 10, ...T.body, fontSize: 13, color: C.text, outline: "none", resize: "none" }} />
                <button onClick={send} disabled={!compose.trim() || sending}
                  style={{ padding: "9px 18px", borderRadius: 10, border: "none", background: compose.trim() ? C.accent : C.border, color: "#FFF", cursor: compose.trim() ? "pointer" : "not-allowed", ...T.body, fontSize: 13, fontWeight: 500, alignSelf: "flex-end" }}>
                  {sending ? "..." : channel === "note" ? "Add" : "Send"}
                </button>
              </div>
              {channel === "sms" && (
                <div style={{ ...T.mono, fontSize: 10, color: C.muted, marginTop: 5 }}>
                  From +16624934617 · {compose.length}/160
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}