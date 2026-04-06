// All colour values reference CSS variables so dark/light mode works automatically.
export const C = {
  bg:        "var(--bg-primary)",
  surface:   "var(--bg-secondary)",
  card:      "var(--bg-card)",
  border:    "var(--border)",
  accent:    "var(--gold)",
  accentDim: "var(--gold-dim)",
  accentGlow:"var(--gold-glow)",
  text:      "var(--text-primary)",
  muted:     "var(--text-secondary)",

  // Status colours — intentionally theme-independent
  new:         "#3B82F6",
  callback:    "#F59E0B",
  confirmed:   "#10B981",
  dead:        "#6B7B8D",
  in_progress: "#8B5CF6",

  newBg:        "rgba(59,130,246,0.12)",
  callbackBg:   "rgba(245,158,11,0.12)",
  confirmedBg:  "rgba(16,185,129,0.12)",
  deadBg:       "rgba(107,123,141,0.12)",
  inProgressBg: "rgba(139,92,246,0.12)",
};

export const T = {
  heading: { fontFamily: "'Syne', sans-serif" },
  body:    { fontFamily: "'DM Sans', sans-serif" },
  mono:    { fontFamily: "'DM Mono', monospace" },
};

export const STATUS_META = {
  new:         { label: "New",         color: C.new,         bg: C.newBg },
  in_progress: { label: "In Progress", color: C.in_progress, bg: C.inProgressBg },
  callback:    { label: "Callback",    color: C.callback,    bg: C.callbackBg },
  confirmed:   { label: "Confirmed",   color: C.confirmed,   bg: C.confirmedBg },
  dead:        { label: "Dead",        color: C.dead,        bg: C.deadBg },
};

export const ALL_STATUSES = ["new", "in_progress", "callback", "confirmed", "dead"];
