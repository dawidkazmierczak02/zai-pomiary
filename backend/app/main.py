from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import select

from .config import settings
from .db import SessionLocal
from .errors import register_error_handlers
from .models import Admin
from .routers import auth, series
from .security import hash_password


def ensure_admin_exists() -> None:
    """Zakłada konto administratora z .env, jeśli jeszcze nie istnieje.

    Istniejącego konta nie nadpisujemy poniewa wtedy zmiana hasła
    byłaby cofana przy każdym restarcie aplikacjid.
    """
    with SessionLocal() as db:
        exists = db.scalar(select(Admin).where(Admin.username == settings.admin_username))
        if exists is None:
            db.add(
                Admin(
                    username=settings.admin_username,
                    password_hash=hash_password(settings.admin_password),
                )
            )
            db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    ensure_admin_exists()
    yield


# Główny obiekt aplikacji
app = FastAPI(title="ZAI – Serie pomiarowe", version="1.0.0", lifespan=lifespan)

register_error_handlers(app)
app.include_router(auth.router)
app.include_router(series.router)


@app.get("/api/health", tags=["system"])
def health():
    """Sprawdzenie dostępności aplikacji (wymagane przez kontrakt)."""
    return {"status": "ok"}