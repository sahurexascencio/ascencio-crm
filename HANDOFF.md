# Ascencio CRM — Complete Setup Guide

> **For the developer:** You have been added as a collaborator on the GitHub repo at `https://github.com/sahurexascencio/ascencio-crm`. Clone it and start from **Step 2**. You do not need to create a new GitHub repo.
>
> After Railway is live, update **one file** before deploying the frontend:
> Open `frontend/lib/api.js` line 1 and replace the hardcoded Railway URL with your own Railway URL.
>
> Also add the three new route files to `backend/app/routes/`: `tasks.py`, `templates.py`, `messages.py` and run `backend/schema_v1_1.sql` in Supabase after the main schema.

---

This guide takes you from zero to a fully live CRM. Follow every step in order. Do not skip anything.

Estimated 2.5 hours

---

## Before you start — accounts to create

Create accounts on all four platforms before touching any code. Use the same email address for all of them to keep things simple.

- [supabase.com](https://supabase.com) — database
- [railway.app](https://railway.app) — backend hosting
- [vercel.com](https://vercel.com) — frontend hosting
- [twilio.com](https://twilio.com) — calls and SMS

---

## Step 1 — GitHub

You need Git installed on your machine.

**Install Git:**
- Windows: download from [git-scm.com/download/win](https://git-scm.com/download/win) and install with all default settings
- Mac: run `xcode-select --install` in Terminal

**Create your GitHub account** at [github.com](https://github.com) if you don't have one.

**Create a new private repository:**
1. GitHub → New repository → name it `ascencio-crm` → Private → Create
2. Do not initialize with README

**Get the code:**

Download the project folder from your delivery. Place it somewhere on your machine like `C:\ascencio-crm` on Windows or `~/ascencio-crm` on Mac.

Open a terminal in that folder and run:

```bash
git init
git add .
git commit -m "init: ascencio CRM"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/ascencio-crm.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username. Your code is now on GitHub.

---

## Step 2 — Supabase (database)

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Choose a name, pick a region close to your users (Europe West for UK), set a strong password → **Create project**
3. Wait 2 minutes for it to provision
4. Go to **SQL Editor** in the left sidebar
5. Click the **+** button to open a new query tab
6. Open `backend/schema.sql` from the project folder → copy everything → paste into Supabase SQL editor → click **Run**
7. You should see "Success. No rows returned" — this is correct
8. Open a **second** query tab → paste the contents of `backend/schema_v1_1.sql` → click **Run**
9. Go to **Settings → API** → copy these two values:
   - **Project URL** → save as `SUPABASE_URL`
   - **service_role** key (click reveal) → save as `SUPABASE_SERVICE_KEY`

**Important:** Never share the service_role key publicly. It has full database access.

---

## Step 3 — Twilio (calls and SMS)

1. Go to [twilio.com](https://twilio.com) → sign up
2. Complete phone verification during signup
3. From the console dashboard, copy:
   - **Account SID** → save as `TWILIO_ACCOUNT_SID`
   - **Auth Token** (click reveal) → save as `TWILIO_AUTH_TOKEN`
4. Go to **Phone Numbers → Manage → Buy a number**
   - Search for a UK number (+44)
   - Make sure it has Voice and SMS capabilities
   - Buy it (~£1/month)
   - Copy the number in E.164 format e.g. `+447700900123` → save as `TWILIO_PHONE_NUMBER`
5. **Enable international calling:**
   - Go to **Voice → Settings → General**
   - Scroll to **Geographic Permissions**
   - Enable all countries you need to call (UK, Egypt, Spain etc)
6. **Verify your personal number** (required on trial accounts):
   - Go to **Phone Numbers → Verified Caller IDs**
   - Click **Add a new Caller ID**
   - Enter your personal number → Twilio calls you → enter the verification code
7. **Add your personal number to your user profile** in Supabase after creating your admin account (Step 6)

---

## Step 4 — Railway (backend)

**Critical:** Sign up to Railway using **Continue with GitHub** — use the same GitHub account where you pushed the code. This prevents deployment permission errors.

1. Go to [railway.app](https://railway.app) → **Login with GitHub**
2. Click **New Project → Deploy from GitHub repo**
3. Select your `ascencio-crm` repository
4. When Railway asks for the **Root Directory** → type `backend` → confirm
5. Railway will start building — it will fail the first time because variables aren't set yet. That is expected.
6. Go to your service → **Variables** tab → click **Raw Editor** → paste all of this:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhb...your-service-role-key
JWT_SECRET=pick-any-long-random-string-minimum-32-characters
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=480
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_PHONE_NUMBER=+447700900123
APP_ENV=production
PORT=8000
```

Fill in your real values. JWT_SECRET can be anything long — example: `ascencioCRM2026agencySecretKey99`

7. Save → Railway redeploys automatically
8. Go to **Settings → Networking → Generate Domain** → copy your Railway URL e.g. `https://ascencio-crm-production.up.railway.app`
9. Test it works — open in your browser:
   ```
   https://your-railway-url.up.railway.app/health
   ```
   You should see: `{"status":"ok","version":"1.1.0"}`

10. **Update the webhook URL in the code:**
    - Open `backend/app/routes/calls.py`
    - Find `WEBHOOK_BASE` on line 14
    - Replace the placeholder with your Railway URL
    - Save → commit → push → Railway redeploys

11. **Set Twilio webhooks:**
    - Twilio console → Phone Numbers → your number → click it
    - Under **Voice & Fax → A call comes in** → set to:
      `https://your-railway-url.up.railway.app/calls/twiml/connect`
    - Under **Messaging → A message comes in** → set to:
      `https://your-railway-url.up.railway.app/messages/webhook/sms`

---

## Step 5 — Vercel (frontend)

**Critical:** Sign up to Vercel using **Continue with GitHub** — use the same GitHub account. This is required for automatic deployments to work.

1. Go to [vercel.com](https://vercel.com) → **Login with GitHub**
2. Click **Add New → Project**
3. Import your `ascencio-crm` repository
4. Before deploying, set the **Root Directory** → click Edit → type `frontend` → Save
5. **Framework Preset** → select **Next.js** from the dropdown
6. Add environment variable:
   - Name: `NEXT_PUBLIC_API_URL`
   - Value: `https://your-railway-url.up.railway.app`
   - Tick all three boxes: Production, Preview, Development
7. Click **Deploy**
8. Wait ~2 minutes → you get a URL like `https://ascencio-crm.vercel.app`
9. Open it — you should see the login page

---

## Step 6 — Create your admin account

Once Railway and Supabase are both live, create your first user.

**On Windows (PowerShell):**
```powershell
$r = Invoke-WebRequest -Uri "https://your-railway-url.up.railway.app/auth/register" -Method POST -ContentType "application/json" -Body '{"name":"Your Name","email":"your@email.com","password":"your-secure-password","role":"admin"}'
$r.Content
```

**On Mac/Linux (Terminal):**
```bash
curl -X POST "https://your-railway-url.up.railway.app/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"name":"Your Name","email":"your@email.com","password":"your-secure-password","role":"admin"}'
```

You should get back a JSON response with your user details. This only works once without a token — after the first user is created, all new users require an admin token.

**Add your phone number to Supabase:**
- Supabase → Table Editor → users table
- Find your row → edit → add your phone number in E.164 format e.g. `+447700900123`
- This is the number Twilio calls when you initiate a call from the CRM

---

## Step 7 — Create team accounts

Log in at your Vercel URL first to get a token, then create accounts for each team member.

**Get your token:**
```powershell
$r = Invoke-WebRequest -Uri "https://your-railway-url.up.railway.app/auth/login?email=your@email.com&password=your-password" -Method POST
$r.Content
```

Copy the `access_token` from the response.

**Create a team member:**
```powershell
$r = Invoke-WebRequest -Uri "https://your-railway-url.up.railway.app/auth/register?token=YOUR_TOKEN" -Method POST -ContentType "application/json" -Body '{"name":"Caller Name","email":"caller@email.com","password":"their-password","role":"caller"}'
$r.Content
```

**Available roles:**
| Role | Access |
|---|---|
| `admin` | Full access |
| `caller` | Pipeline, calls, leads assigned to them |
| `success_manager` | All leads, bookings, revenue |
| `junior` | Read-only access |

**Add each team member's phone number** in Supabase → users table after creating their account.

---

## Step 8 — Test a call

1. Log in at your Vercel URL
2. Create a lead: Pipeline → Add Lead
3. Add a contact with a real phone number to that lead
4. Go to Pre-Call Brief → select the lead → click **Call Now**
5. Your phone rings first → pick up → you hear the connection → the lead's number rings

---

## Common issues and fixes

**"Application failed to respond" on Railway**
- Check Variables tab — make sure all variables are set with no extra spaces
- Check Deployments → View logs for the specific error

**"Failed to fetch" in the frontend**
- Make sure `NEXT_PUBLIC_API_URL` starts with `https://` not `http://`
- Redeploy Vercel with build cache disabled after changing env variables

**Call goes to voicemail or no answer**
- Make sure your personal number is verified in Twilio (Verified Caller IDs)
- Make sure the destination country is enabled in Twilio Geographic Permissions
- Make sure your phone number is saved in the users table in Supabase

**"Could not validate token"**
- Your token expired (valid for 8 hours) — log in again to get a fresh one

**SMS not sending**
- Twilio trial accounts can only send SMS to verified numbers
- Upgrade Twilio account or verify the recipient number first

---

## API documentation

Once Railway is live, full interactive API docs are available at:
```
https://your-railway-url.up.railway.app/docs
```

You can test every endpoint directly from the browser here.

---

## For the developer

The codebase structure:

```
ascencio-crm/
├── backend/
│   ├── app/
│   │   ├── main.py          entry point
│   │   ├── config.py        environment variables
│   │   ├── db.py            supabase client
│   │   ├── middleware/
│   │   │   └── auth.py      JWT authentication
│   │   ├── models/          pydantic schemas
│   │   ├── routes/          API endpoints
│   │   └── services/        twilio, scraper
│   ├── schema.sql           initial database schema
│   ├── schema_v1_1.sql      additional tables
│   └── requirements.txt     python dependencies
└── frontend/
    ├── app/                 Next.js pages
    ├── components/          shared UI components
    ├── lib/
    │   ├── api.js           all API calls
    │   └── tokens.js        colors and design tokens
    └── hooks/
        └── useAuth.js       authentication state
```

Every future deploy is automatic — push to GitHub and both Railway and Vercel redeploy within 2 minutes.
