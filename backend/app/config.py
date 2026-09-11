from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    mongo_uri: str = "mongodb://localhost:27017"
    db_name: str = "moksha_shop"

    jwt_secret: str = "change-me"
    jwt_expire_minutes: int = 60 * 24 * 7  # 7 days

    google_client_id: str = ""
    admin_emails: str = ""  # comma separated

    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""

    gemini_api_key: str = ""

    frontend_url: str = "http://localhost:5173"

    @property
    def admin_email_list(self) -> list[str]:
        return [e.strip().lower() for e in self.admin_emails.split(",") if e.strip()]


settings = Settings()
