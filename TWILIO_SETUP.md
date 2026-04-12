# Twilio Browser Calling Setup — 5 minutes

## Step 1 — Get your Account SID and Auth Token
Go to: https://console.twilio.com
Copy Account SID and Auth Token from the dashboard.

## Step 2 — Create an API Key
Go to: Console → Account → API Keys & Tokens → Create API Key
- Type: Standard
- Name: ascencio-crm
Copy the KEY SID (starts with SK) and SECRET — you only see the secret once!

## Step 3 — Create a TwiML App
Go to: Console → Explore Products → Voice → TwiML Apps → Create
- Name: Ascencio CRM
- Voice Request URL: http://localhost:8000/calls/twiml
- Method: POST
Copy the TwiML App SID (starts with AP)

## Step 4 — Add to your .env file
Open: C:\Users\khale\ascencio-crm\backend\.env

Add these lines:
TWILIO_ACCOUNT_SID=ACxxxxxxx
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+16624934617
TWILIO_API_KEY=SKxxxxxxx
TWILIO_API_SECRET=your_secret
TWILIO_TWIML_APP_SID=APxxxxxxx

## Step 5 — Install Twilio Python package
cd C:\Users\khale\ascencio-crm\backend
py -3.12 -m pip install twilio --break-system-packages

## Step 6 — Install Twilio JS SDK
cd C:\Users\khale\ascencio-crm\frontend
npm install @twilio/voice-sdk

## Step 7 — Restart backend
py -3.12 -m uvicorn app.main:app --reload

## Trial account note
With a trial account, you can only call VERIFIED numbers.
To verify a number: Console → Phone Numbers → Verified Caller IDs → Add a number
Verify your own mobile first to test end-to-end.

## Cost tracking
Twilio trial gives ~$15.50 credit.
Outbound calls to UK mobiles cost ~$0.045/min.
The CRM tracks your total minutes and estimated spend automatically.
