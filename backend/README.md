# Agency CRM — Backend

Performance-based agency CRM with Twilio click-to-call and automated lead intelligence.

## Stack
- **FastAPI** — backend API
- **Supabase** — PostgreSQL database + auth
- **Twilio** — click-to-call, call recording, SMS
- **Railway** — hosting

---

## Setup

### 1. Database
- Create a new project at [supabase.com](https://supabase.com)
- Open the SQL editor and run `schema.sql` — this creates all tables, enums, indexes, and RLS policies

### 2. Environment
```bash
cp .env.example .env
# Fill in your Supabase URL, service key, JWT secret, and Twilio credentials
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Run locally
```bash
uvicorn app.main:app --reload
```

API docs available at: `http://localhost:8000/docs`

---

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login, returns JWT |
| POST | `/auth/register` | Admin creates team members |
| GET | `/leads` | List leads (callers see own only) |
| POST | `/leads` | Create lead + auto-triggers scrape |
| POST | `/leads/{id}/status` | Move lead between buckets |
| GET | `/leads/{id}/history` | Full status change history |
| GET | `/contacts/lead/{id}` | All contacts for a lead |
| POST | `/calls/initiate` | Click-to-call via Twilio |
| POST | `/calls/webhook/status` | Twilio posts call status here |
| POST | `/calls/webhook/recording` | Twilio posts recording URL here |
| GET | `/intelligence/{id}/brief` | Pre-call brief with pain points |
| POST | `/intelligence/{id}/refresh` | Re-scrape a lead |
| POST | `/bookings` | Log confirmed booking |
| GET | `/bookings/summary` | Revenue + commission + ROI summary |

---

## Lead Buckets

| Status | Meaning |
|--------|---------|
| `new` | Just added, not yet called |
| `in_progress` | Active conversation |
| `callback` | Scheduled callback |
| `confirmed` | Booking confirmed |
| `dead` | Not interested / unqualified |

---

## Deploy to Railway

1. Push to GitHub
2. Connect repo in [railway.app](https://railway.app)
3. Add all `.env` variables in Railway dashboard
4. Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Update `WEBHOOK_BASE` in `app/routes/calls.py` with your Railway URL
6. In Twilio console, point your number's webhook to `https://your-app.up.railway.app/calls/webhook/status`

---

## For the Frontend (Junior)

All endpoints return JSON. Auth is JWT — include `Authorization: Bearer <token>` on every request.

The most important flow:
1. `POST /leads` — creates lead and kicks off scrape automatically
2. `GET /intelligence/{id}/brief` — call this before dialling to get pain points
3. `POST /calls/initiate` — starts the call
4. `POST /leads/{id}/status` — move to callback / confirmed / dead after the call
5. `POST /bookings` — when success manager confirms a booking
