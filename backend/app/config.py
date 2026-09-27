from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Roshanaye Barvari API"
    database_url: str = "sqlite+aiosqlite:///./data/glow.db"
    secret_key: str = "change-me-in-production-please-really"
    access_token_expire_minutes: int = 60 * 24 * 14
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    class Config:
        env_file = ".env"


settings = Settings()
