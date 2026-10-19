import hashlib
import secrets

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

# PasswordHasher domyślnie używa algorytmu Argon2id (wymaganie T5.1)
_password_hasher = PasswordHasher()


def hash_password(password: str) -> str:
    """Zwraca skrót hasła do zapisania w bazie."""
    return _password_hasher.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    """Sprawdza, czy hasło pasuje do zapisanego skrótu."""
    try:
        return _password_hasher.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


def generate_secret() -> str:
    """Losowy, bezpieczny ciąg znaków – na tokeny i klucze API (T5.5)."""
    return secrets.token_urlsafe(32)


def sha256(value: str) -> str:
    """Skrót SHA-256 – w bazie trzymane są tylko skróty tokenów i kluczy API."""
    return hashlib.sha256(value.encode("utf-8")).hexdigest()