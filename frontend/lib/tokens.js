export const C = {
  bg: "#EDF0F5", surface: "#FFFFFF", card: "#FFFFFF", border: "#D8DEE9",
  accent: "#9A7A30", accentDim: "rgba(154,122,48,0.10)", accentGlow: "rgba(154,122,48,0.05)",
  text: "#141E2C", muted: "#7888A0", subtle: "#F0F3F8",
  new: "#2E7BC4", callback: "#C4760A", confirmed: "#2A9455", dead: "#6B7B8D", in_progress: "#6650B8",
  newBg: "rgba(46,123,196,0.10)", callbackBg: "rgba(196,118,10,0.10)", confirmedBg: "rgba(42,148,85,0.10)",
  deadBg: "rgba(107,123,141,0.12)", inProgressBg: "rgba(102,80,184,0.10)",
};

export const T = {
  heading: { fontFamily: "'Syne', sans-serif" },
  body: { fontFamily: "'DM Sans', sans-serif" },
  mono: { fontFamily: "'DM Mono', monospace" },
};

export const STATUS_META = {
  new:         { label: "New",         color: C.new,         bg: C.newBg },
  in_progress: { label: "In Progress", color: C.in_progress, bg: C.inProgressBg },
  callback:    { label: "Callback",    color: C.callback,    bg: C.callbackBg },
  confirmed:   { label: "Confirmed",   color: C.confirmed,   bg: C.confirmedBg },
  dead:        { label: "Dead",        color: C.dead,        bg: C.deadBg },
};

export const ALL_STATUSES = ["new", "in_progress", "callback", "confirmed", "dead"];
