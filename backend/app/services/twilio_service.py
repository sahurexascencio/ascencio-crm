from twilio.rest import Client
from twilio.twiml.voice_response import VoiceResponse, Dial
from app.config import settings

_client: Client | None = None


def get_twilio() -> Client:
    global _client
    if _client is None:
        _client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
    return _client


def initiate_call(to_number: str, caller_number: str, webhook_url: str) -> str:
    """
    Click-to-call: bridges the caller's phone to the lead's number.
    Returns the Twilio CallSid.
    """
    client = get_twilio()

    # First leg: call the caller
    call = client.calls.create(
        to=caller_number,
        from_=settings.twilio_phone_number,
        url=f"{webhook_url}/calls/twiml/connect?to={to_number}",
        status_callback=f"{webhook_url}/calls/webhook/status",
        status_callback_method="POST",
        record=True,
        recording_status_callback=f"{webhook_url}/calls/webhook/recording",
    )
    return call.sid


def build_connect_twiml(to_number: str) -> str:
    """TwiML to connect the caller to the lead once they pick up."""
    response = VoiceResponse()
    dial = Dial(
        record="record-from-answer",
        recording_status_callback="/calls/webhook/recording",
    )
    dial.number(to_number)
    response.append(dial)
    return str(response)


def send_callback_sms(to_number: str, business_name: str) -> None:
    """Send a follow-up SMS after a callback is scheduled."""
    client = get_twilio()
    client.messages.create(
        to=to_number,
        from_=settings.twilio_phone_number,
        body=f"Hi, we spoke briefly about advertising services for {business_name}. We'll be in touch shortly. Talk soon.",
    )
