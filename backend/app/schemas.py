from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel


class ApiModel(BaseModel):
   

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


# ---------- Uwierzytelnianie ----------

class LoginRequest(ApiModel):
    username: str
    password: str


class LoginResponse(ApiModel):
    access_token: str
    token_type: Literal["Bearer"] = "Bearer"
    expires_in: int  # czas ważności tokenu 


class PasswordChange(ApiModel):
    current_password: str
    new_password: str = Field(min_length=8)




# ---------- Serie ----------

class SeriesInput(ApiModel):
    """Dane serii wysyłane przy tworzeniu (POST) i pełnej aktualizacji (PUT)."""

    name: str = Field(min_length=1, max_length=100)
    min_value: float = Field(allow_inf_nan=False)
    max_value: float = Field(allow_inf_nan=False)
    color: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")
    icon: str | None = Field(default=None, max_length=50)
    unit: str | None = Field(default=None, max_length=20)

    @model_validator(mode="after")
    def check_range(self):
        """Reguła z kontraktu: minValue < maxValue (inaczej 422)."""
        if self.min_value >= self.max_value:
            raise ValueError("minValue musi być mniejsze niż maxValue.")
        return self


class SeriesRead(ApiModel):
    """Seria zwracana przez API."""

    id: int
    name: str
    min_value: float
    max_value: float
    color: str
    icon: str | None = None
    unit: str | None = None




# ---------- Czujniki ----------

class SensorInput(ApiModel):
    """Dane potrzebne do rejestracji czujnika."""

    name: str = Field(min_length=1, max_length=100)
    series_id: int


class SensorRead(ApiModel):
    """Czujnik zwracany przez API – bez klucza API."""

    id: int
    name: str
    series_id: int
    created_at: datetime
    last_measurement_at: datetime | None = None


class SensorCreated(SensorRead):
    """Odpowiedź na rejestrację – jedyne miejsce, gdzie pojawia się klucz API."""

    api_key: str




# ---------- Wyniki pomiarów ----------

class MeasurementInput(ApiModel):
    """Wynik przesyłany przez czujnik. Seria wynika z klucza API, więc jej tu nie ma."""

    value: float = Field(allow_inf_nan=False)
    timestamp: datetime | None = None  # brak = bieżący czas serwera


class MeasurementRead(ApiModel):
    """Wynik zwracany przez API."""

    id: int
    series_id: int
    sensor_id: int | None = None
    value: float
    timestamp: datetime