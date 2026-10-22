"""Runtime configuration.

Secure by default: the app runs in production mode and refuses to start without a
strong SECRET_KEY. Set APP_ENV=dev for local work (a random per-process key is used).
"""
import secrets
from typing import Literal

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_KNOWN_WEAK = {
    "change-me-in-production-please-really",
    "replace-with-a-long-random-string",
    "change-me",
    "changeme",
    "secret",
}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Roshanaye Barvari API"
    app_env: Literal["dev", "test", "production"] = "production"
    database_url: str = "sqlite+aiosqlite:///./data/glow.db"
    secret_key: str = ""
    access_token_expire_minutes: int = Field(60 * 24 * 7, ge=5, le=60 * 24 * 30)
    cors_origins: str = "http://localhost:3036,http://127.0.0.1:3036"
    demo_mode: bool = False
    enable_docs: bool = False
    bcrypt_rounds: int = Field(12, ge=4, le=16)
    log_level: str = "INFO"

    # abuse limits (per process; see docs/threat-model.md for the scale-out note)
    login_max_attempts: int = 8          # per (ip, email) per window
    login_ip_max_attempts: int = 40      # per ip per window
    login_window_seconds: int = 300
    login_account_max_failures: int = 30   # attempts per account per hour from any address (successes are refunded)
    bcrypt_concurrency: int = Field(4, ge=1, le=32)  # simultaneous password hashes (CPU bound)
    register_max_per_hour: int = 10      # per ip
    write_max_per_minute: int = 90       # per user
    max_cycles_per_user: int = 600
    max_logs_per_user: int = 20_000
    max_body_bytes: int = Field(64 * 1024, ge=1024)  # every legitimate request is far smaller

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip().rstrip("/") for o in self.cors_origins.split(",") if o.strip()]

    @model_validator(mode="after")
    def _harden(self) -> "Settings":
        if self.secret_key in _KNOWN_WEAK or len(self.secret_key) < 32:
            if self.app_env == "dev":
                self.secret_key = secrets.token_urlsafe(48)  # ephemeral: sessions end on restart
            else:
                raise ValueError(
                    "SECRET_KEY must be a random value of at least 32 characters "
                    "(generate one with: openssl rand -base64 48)"
                )
        if "*" in self.cors_origin_list:
            raise ValueError("CORS_ORIGINS must list explicit origins; '*' is not allowed")
        if self.app_env == "production" and self.bcrypt_rounds < 10:
            raise ValueError("BCRYPT_ROUNDS must be at least 10 in production")
        return self


settings = Settings()
