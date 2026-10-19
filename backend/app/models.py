from datetime import datetime

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    Double,
    ForeignKey,
    Index,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base

# Wszystkie znaczniki czasu zapisujemy ze strefą czasową (timestamptz)
# więc "ta sama chwila" jest jednoznaczna 
TZDateTime = DateTime(timezone=True)


class Admin(Base):
    """Konto administratora (F8)."""

    __tablename__ = "admins"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))  # Argon2id, nigdy jawne hasło (T5.1)
    created_at: Mapped[datetime] = mapped_column(TZDateTime, server_default=func.now())


class AuthToken(Base):
    """Token logowania administratora. W bazie tylko skrót SHA-256 tokenu."""

    __tablename__ = "auth_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    admin_id: Mapped[int] = mapped_column(
        ForeignKey("admins.id", ondelete="CASCADE"), index=True
    )
    expires_at: Mapped[datetime] = mapped_column(TZDateTime)  # ograniczony czas ważności (T5.3)
    created_at: Mapped[datetime] = mapped_column(TZDateTime, server_default=func.now())


class Series(Base):
    """Seria pomiarowa (F2): nazwa, przedział min/max, kolor, ikona, jednostka."""

    __tablename__ = "series"
    __table_args__ = (
        CheckConstraint("min_value < max_value", name="ck_series_min_lt_max"),
        CheckConstraint("color ~ '^#[0-9A-Fa-f]{6}$'", name="ck_series_color_hex"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    min_value: Mapped[float] = mapped_column(Double)
    max_value: Mapped[float] = mapped_column(Double)
    color: Mapped[str] = mapped_column(String(7))
    icon: Mapped[str | None] = mapped_column(String(50))
    unit: Mapped[str | None] = mapped_column(String(20))
    created_at: Mapped[datetime] = mapped_column(TZDateTime, server_default=func.now())


class Sensor(Base):
    """Czujnik przypisany do serii (F12), klucz API tylko jako skrót SHA-256."""

    __tablename__ = "sensors"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    # Usunięcie serii usuwa jej czujniki (wymóg kontraktu).
    series_id: Mapped[int] = mapped_column(
        ForeignKey("series.id", ondelete="CASCADE"), index=True
    )
    api_key_hash: Mapped[str] = mapped_column(String(64), unique=True)
    created_at: Mapped[datetime] = mapped_column(TZDateTime, server_default=func.now())
    last_measurement_at: Mapped[datetime | None] = mapped_column(TZDateTime)


class Measurement(Base):
    """Wynik pomiaru (F1), nie da się go edytować ani usunąć przez API"""

    __tablename__ = "measurements"
    __table_args__ = (
        # Indeksy dla zapytań "wyniki serii w przedziale czasu" (T4).
        Index("ix_measurements_series_timestamp", "series_id", "timestamp"),
        Index("ix_measurements_timestamp", "timestamp"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    # Usunięcie serii usuwa jej wyniki.
    series_id: Mapped[int] = mapped_column(ForeignKey("series.id", ondelete="CASCADE"))
    # Wyrejestrowanie czujnika NIE usuwa wyników – tylko zeruje odnośnik (F12).
    sensor_id: Mapped[int | None] = mapped_column(
        ForeignKey("sensors.id", ondelete="SET NULL")
    )
    value: Mapped[float] = mapped_column(Double)
    timestamp: Mapped[datetime] = mapped_column(TZDateTime)
    created_at: Mapped[datetime] = mapped_column(TZDateTime, server_default=func.now())


class RejectedMeasurement(Base):
    """Log błędów (F4): wyniki odrzucone przez serwer wraz z powodem"""

    __tablename__ = "rejected_measurements"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    series_id: Mapped[int | None] = mapped_column(
        ForeignKey("series.id", ondelete="CASCADE"), index=True
    )
    sensor_id: Mapped[int | None] = mapped_column(
        ForeignKey("sensors.id", ondelete="SET NULL")
    )
    sensor_name: Mapped[str | None] = mapped_column(String(100))  # zostaje po wyrejestrowaniu
    value: Mapped[float | None] = mapped_column(Double)
    timestamp: Mapped[datetime | None] = mapped_column(TZDateTime)
    reason: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        TZDateTime, server_default=func.now(), index=True
    )