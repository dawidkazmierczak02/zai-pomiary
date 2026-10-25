from datetime import datetime, timezone

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import get_db
from .errors import ApiError
from .models import AuthToken
from .security import sha256


bearer_scheme = HTTPBearer(auto_error=False, description="Token z /api/auth/login")

UNAUTHORIZED_HEADERS = {"WWW-Authenticate": "Bearer"}


def get_current_token(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> AuthToken:
    """Zwraca ważny token zalogowanego administratora albo zgłasza 401."""
    if credentials is None:
        raise ApiError(401, "Wymagane uwierzytelnienie tokenem Bearer.", headers=UNAUTHORIZED_HEADERS)

    token = db.scalar(
        select(AuthToken).where(
            AuthToken.token_hash == sha256(credentials.credentials),
            AuthToken.expires_at > datetime.now(timezone.utc),
        )
    )
    if token is None:
        raise ApiError(401, "Token jest nieprawidłowy lub wygasł.", headers=UNAUTHORIZED_HEADERS)
    return token