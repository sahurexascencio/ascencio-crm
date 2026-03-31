from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, leads, contacts, calls, bookings, intelligence

app = FastAPI(
    title="Agency CRM",
    description="Performance-based agency CRM with Twilio and lead intelligence",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Lock down to frontend URL post-deploy
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(leads.router)
app.include_router(contacts.router)
app.include_router(calls.router)
app.include_router(bookings.router)
app.include_router(intelligence.router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}
