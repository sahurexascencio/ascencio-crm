from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import auth, leads, contacts, calls, bookings, intelligence, tasks, templates, messages

app = FastAPI(
    title="Ascencio CRM",
    description="Performance-based agency CRM",
    version="1.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
app.include_router(tasks.router)
app.include_router(templates.router)
app.include_router(messages.router)


@app.get("/health")
def health():
    return {"status": "ok", "version": "1.1.0"}
