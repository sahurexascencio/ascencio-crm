// All colors are CSS variables — theme switching is handled by CSS
// Setting data-theme="dark" on <html> switches everything instantly

export const C = {
  bg:            "var(--c-bg)",
  surface:       "var(--c-surface)",
  card:          "var(--c-card)",
  border:        "var(--c-border)",
  subtle:        "var(--c-subtle)",
  text:          "var(--c-text)",
  muted:         "var(--c-muted)",
  accent:        "var(--c-accent)",
  accentDim:     "var(--c-accent-dim)",
  accentGlow:    "var(--c-accent-glow)",
  accentBorder:  "var(--c-accent-border)",
  new:           "var(--c-new)",
  callback:      "var(--c-callback)",
  confirmed:     "var(--c-confirmed)",
  dead:          "var(--c-dead)",
  in_progress:   "var(--c-in-progress)",
  newBg:         "var(--c-new-bg)",
  callbackBg:    "var(--c-callback-bg)",
  confirmedBg:   "var(--c-confirmed-bg)",
  deadBg:        "var(--c-dead-bg)",
  inProgressBg:  "var(--c-in-progress-bg)",
};

export const T = {
  heading: { fontFamily: "'Syne', sans-serif" },
  body:    { fontFamily: "'DM Sans', sans-serif" },
  mono:    { fontFamily: "'DM Mono', monospace" },
};

export const STATUS_META = {
  new:         { label: "New",         color: "var(--c-new)",         bg: "var(--c-new-bg)" },
  in_progress: { label: "In Progress", color: "var(--c-in-progress)", bg: "var(--c-in-progress-bg)" },
  callback:    { label: "Callback",    color: "var(--c-callback)",    bg: "var(--c-callback-bg)" },
  confirmed:   { label: "Confirmed",   color: "var(--c-confirmed)",   bg: "var(--c-confirmed-bg)" },
  dead:        { label: "Dead",        color: "var(--c-dead)",        bg: "var(--c-dead-bg)" },
};

export const ALL_STATUSES = ["new", "in_progress", "callback", "confirmed", "dead"];

// Theme helpers
export function getTheme() {
  if (typeof window === "undefined") return "light";
  return document.documentElement.getAttribute("data-theme") || "light";
}

export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("ascencio_theme", theme);
}

export function initTheme() {
  if (typeof window === "undefined") return;
  const saved = localStorage.getItem("ascencio_theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
}
