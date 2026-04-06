const BASE = process.env.NEXT_PUBLIC_API_URL || "https://ascencio-crm-production.up.railway.app";

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("ascencio_token");
}

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401) {
    localStorage.removeItem("ascencio_token");
    window.location.href = "/login";
    return;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail || "Request failed");
  }

  if (res.status === 204) return null;
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
export const auth = {
  login: (email, password) =>
    request(`/auth/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`, { method: "POST" }),
};

// ── Leads ─────────────────────────────────────────────────────────────────────
export const leads = {
  list: (status, assignedTo) => {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (assignedTo) params.append("assigned_to", assignedTo);
    return request(`/leads?${params}`);
  },
  get: (id) => request(`/leads/${id}`),
  create: (data) => request("/leads", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => request(`/leads/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  updateStatus: (id, status, notes) =>
    request(`/leads/${id}/status`, { method: "POST", body: JSON.stringify({ status, notes }) }),
  history: (id) => request(`/leads/${id}/history`),
  delete: (id) => request(`/leads/${id}`, { method: "DELETE" }),
};

// ── Contacts ──────────────────────────────────────────────────────────────────
export const contacts = {
  forLead: (leadId) => request(`/contacts/lead/${leadId}`),
  create: (data) => request("/contacts", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => request(`/contacts/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id) => request(`/contacts/${id}`, { method: "DELETE" }),
};

// ── Calls ─────────────────────────────────────────────────────────────────────
export const calls = {
  forLead: (leadId) => request(`/calls/lead/${leadId}`),
  initiate: (data) => request("/calls/initiate", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => request(`/calls/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
};

// ── Intelligence ──────────────────────────────────────────────────────────────
export const intelligence = {
  get: (leadId) => request(`/intelligence/${leadId}`),
  brief: (leadId) => request(`/intelligence/${leadId}/brief`),
  refresh: (leadId) => request(`/intelligence/${leadId}/refresh`, { method: "POST" }),
};

// ── Bookings ──────────────────────────────────────────────────────────────────
export const bookings = {
  list: (status, leadId) => {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (leadId) params.append("lead_id", leadId);
    return request(`/bookings?${params}`);
  },
  summary: () => request("/bookings/summary"),
  create: (data) => request("/bookings", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => request(`/bookings/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
};

// ── Tasks ─────────────────────────────────────────────────────────────────────
export const tasks = {
  forLead: (leadId) => request(`/tasks/lead/${leadId}`),
  upcoming: () => request("/tasks/upcoming"),
  create: (data) => request("/tasks", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => request(`/tasks/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id) => request(`/tasks/${id}`, { method: "DELETE" }),
};

// ── Templates ─────────────────────────────────────────────────────────────────
export const templates = {
  list: (type) => request(`/templates${type ? `?type=${type}` : ""}`),
  create: (data) => request("/templates", { method: "POST", body: JSON.stringify(data) }),
  update: (id, data) => request(`/templates/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  delete: (id) => request(`/templates/${id}`, { method: "DELETE" }),
};

// ── Messages ──────────────────────────────────────────────────────────────────
export const messages = {
  forLead: (leadId) => request(`/messages/lead/${leadId}`),
  sendSMS: (data) => request("/messages/sms", { method: "POST", body: JSON.stringify(data) }),
};
