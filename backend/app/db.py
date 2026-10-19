from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from .config import settings

# Silnik - zarządza połączeniami z bazą, pool_pre_ping sprawdza, czy połączenie wciąż jest aktynwe
engine = create_engine(settings.database_url, pool_pre_ping=True)

# Fabryka sesji, każde żądanie HTTP dostaje własną sesję
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


class Base(DeclarativeBase):
    """Klasa bazowa dla wszystkich modeli"""


def get_db():
    """Daje sesję bazy na czas jednego żądania i zawsze ją zamyka"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()