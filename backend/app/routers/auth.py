from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Response
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ..config import settings
from ..db import get_db
from ..dependencies import UNAUTHORIZED_HEADERS, get_current_token
from ..errors import ApiError
from ..models import Admin, AuthToken
from ..schemas import LoginRequest, LoginResponse, PasswordChange
from ..security import generate_secret, hash_password, sha256, verify_password

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    """Logowanie administratora – zwraca token Bearer z ograniczonym czasem ważności"""
    admin = db.scalar(select(Admin).where(Admin.username == data.username))
    if admin is None or not verify_password(admin.password_hash, data.password):
        # Ten sam komunikat dla złego loginu i złego hasła ze zględów bezpieczeństwa aby nie zdradzić czy jakieś konto juz istnieje
        raise ApiError(401, "Niepoprawny login lub hasło.", headers=UNAUTHORIZED_HEADERS)

    now = datetime.now(timezone.utc)
    
    db.execute(delete(AuthToken).where(AuthToken.expires_at <= now))

    token = generate_secret()
    db.add(
        AuthToken(
            token_hash=sha256(token),
            admin_id=admin.id,
            expires_at=now + timedelta(seconds=settings.token_ttl_seconds),
        )
    )
    db.commit()
    return LoginResponse(access_token=token, expires_in=settings.token_ttl_seconds)


@router.post("/logout", status_code=204)
def logout(token: AuthToken = Depends(get_current_token), db: Session = Depends(get_db)):
    """Wylogowanie – token zostaje usunięty i przestaje działać"""
    db.delete(token)
    db.commit()
    return Response(status_code=204)


@router.put("/password", status_code=204)
def change_password(
    data: PasswordChange,
    token: AuthToken = Depends(get_current_token),
    db: Session = Depends(get_db),
):
    """Zmiana hasła admina, który jest zzalogowany"""
    admin = db.get(Admin, token.admin_id)
    if admin is None or not verify_password(admin.password_hash, data.current_password):
        raise ApiError(403, "Podane bieżące hasło jest niepoprawne.")

    admin.password_hash = hash_password(data.new_password)
    db.commit()
    return Response(status_code=204)