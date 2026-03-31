from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_key: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    twilio_account_sid: str
    twilio_auth_token: str
    twilio_phone_number: str

    app_env: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()
