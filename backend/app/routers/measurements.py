from datetime import datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..dependencies import get_current_sensor
from ..errors import ApiError, problem_responses
from ..models import Measurement, RejectedMeasurement, Sensor, Series
from ..schemas import MeasurementInput, MeasurementRead

router = APIRouter(
    prefix="/api/measurements",
    tags=["measurements"],
    responses=problem_responses(400, 401, 404, 405, 422),
)

#znacznik czasu późniejszy niż 5 minut od czasu serwera -> 422
MAX_FUTURE_OFFSET = timedelta(minutes=5)


def as_utc_aware(value: datetime) -> datetime:
    """Czas bez strefy traktujemy jako UTC, żeby porównania były jednoznaczne."""
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def reject(
    db: Session, sensor: Sensor, value: float, timestamp: datetime, reason: str, field: str
) -> ApiError:
    """Zapisuje odrzucony wynik w logu błędów (F4) i zwraca błąd 422 do zgłoszenia."""
    db.add(
        RejectedMeasurement(
            series_id=sensor.series_id,
            sensor_id=sensor.id,
            sensor_name=sensor.name,
            value=value,
            timestamp=timestamp,
            reason=reason,
        )
    )
    db.commit()
    return ApiError(422, reason, errors=[{"field": field, "message": reason}])


@router.post("", response_model=MeasurementRead, status_code=201, response_model_exclude_none=True)
def create_measurement(
    data: MeasurementInput,
    response: Response,
    sensor: Sensor = Depends(get_current_sensor),
    db: Session = Depends(get_db),
):
    """Przesłanie wyniku przez czujnik (nagłówek X-API-Key). Seria wynika z klucza."""
    now = datetime.now(timezone.utc)
    timestamp = as_utc_aware(data.timestamp) if data.timestamp else now
    series = db.get(Series, sensor.series_id)

    if timestamp > now + MAX_FUTURE_OFFSET:
        raise reject(
            db, sensor, data.value, timestamp,
            "Znacznik czasu jest późniejszy niż 5 minut od bieżącego czasu serwera.",
            "timestamp",
        )
    if not series.min_value <= data.value <= series.max_value:
        raise reject(
            db, sensor, data.value, timestamp,
            f"Wartość {data.value} jest spoza przedziału serii "
            f"[{series.min_value}, {series.max_value}].",
            "value",
        )

    measurement = Measurement(
        series_id=series.id, sensor_id=sensor.id, value=data.value, timestamp=timestamp
    )
    db.add(measurement)
    sensor.last_measurement_at = now
    db.commit()
    db.refresh(measurement)

    response.headers["Location"] = f"/api/measurements/{measurement.id}"
    return measurement


@router.get("", response_model=list[MeasurementRead], response_model_exclude_none=True)
def list_measurements(
    series: str | None = Query(
        default=None, description="Identyfikatory serii rozdzielone przecinkami; brak = wszystkie"
    ),
    from_: datetime | None = Query(default=None, alias="from"),
    to: datetime | None = None,
    sort: Literal["timestamp", "-timestamp"] = "timestamp",
    limit: int = Query(default=1000, ge=1, le=10000),
    db: Session = Depends(get_db),
):
    """Wyniki wybranych serii w przedziale czasu (publiczne). Przedział domknięty."""
    query = select(Measurement)

    if series:
        try:
            series_ids = [int(part) for part in series.split(",") if part.strip()]
        except ValueError:
            raise ApiError(
                400, "Parametr series musi być listą liczbowych identyfikatorów rozdzielonych przecinkami."
            )
        if series_ids:
            query = query.where(Measurement.series_id.in_(series_ids))

    if from_ and to and as_utc_aware(from_) > as_utc_aware(to):
        raise ApiError(400, "Parametr from nie może być późniejszy niż to.")
    if from_:
        query = query.where(Measurement.timestamp >= as_utc_aware(from_))
    if to:
        query = query.where(Measurement.timestamp <= as_utc_aware(to))

    if sort == "timestamp":
        query = query.order_by(Measurement.timestamp.asc(), Measurement.id.asc())
    else:
        query = query.order_by(Measurement.timestamp.desc(), Measurement.id.desc())

    return db.scalars(query.limit(limit)).all()


@router.get("/{measurement_id}", response_model=MeasurementRead, response_model_exclude_none=True)
def read_measurement(measurement_id: int, db: Session = Depends(get_db)):
    """Odczyt pojedynczego wyniku (publiczny). Wyników nie można zmieniać ani usuwać."""
    measurement = db.get(Measurement, measurement_id)
    if measurement is None:
        raise ApiError(404, "Wynik o podanym identyfikatorze nie istnieje.")
    return measurement