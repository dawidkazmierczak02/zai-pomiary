from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Ustawienia aplikacji wczytywane ze zmiennych środowiskowych lub pliku .env"""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    admin_username: str = "admin"
    admin_password: str
    token_ttl_seconds: int = 3600

    @field_validator("database_url")
    @classmethod
    def use_psycopg_driver(cls, value: str) -> str:
        
        if value.startswith("postgres://"):
            value = "postgresql://" + value.removeprefix("postgres://")
        if value.startswith("postgresql://"):
            value = "postgresql+psycopg://" + value.removeprefix("postgresql://")
        return value


settings = Settings()