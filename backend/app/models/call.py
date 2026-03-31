from pydantic import BaseModel
from enum import Enum
from datetime import datetime
from uuid import UUID
from typing import Optional


class CallDirection(str, Enum):
    inbound = "inbound"
    outbound = "outbound"


class CallOutcome(str, Enum):
    no_answer = "no_answer"
    voicemail = "voicemail"
    callback_scheduled = "callback_scheduled"
    interested = "interested"
    confirmed = "confirmed"
    dead = "dead"
    in_progress = "in_progress"


class CallCreate(BaseModel):
    lead_id: UUID
    contact_id: Optional[UUID] = None
    direction: CallDirection = CallDirection.outbound
    notes: Optional[str] = None


class CallUpdate(BaseModel):
    outcome: Optional[CallOutcome] = None
    notes: Optional[str] = None
    duration_seconds: Optional[int] = None


class CallOut(BaseModel):
    id: UUID
    lead_id: UUID
    contact_id: Optional[UUID]
    caller_id: UUID
    twilio_call_sid: Optional[str]
    direction: CallDirection
    duration_seconds: Optional[int]
    recording_url: Optional[str]
    outcome: Optional[CallOutcome]
    notes: Optional[str]
    called_at: datetime

    class Config:
        from_attributes = True


class TwilioCallbackPayload(BaseModel):
    CallSid: str
    CallStatus: str
    Duration: Optional[str] = None
    RecordingUrl: Optional[str] = None
    To: Optional[str] = None
    From: Optional[str] = None
