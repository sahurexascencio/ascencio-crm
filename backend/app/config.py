from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_key: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    twilio_account_sid: Optional[str] = None
    twilio_auth_token: Optional[str] = None
    twilio_phone_number: Optional[str] = "+16624934617"
    twilio_api_key: Optional[str] = None
    twilio_api_secret: Optional[str] = None
    twilio_twiml_app_sid: Optional[str] = None

    app_env: str = "development"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()