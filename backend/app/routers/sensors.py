from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..dependencies import get_current_token
from ..errors import ApiError
from ..models import Sensor, Series
from ..schemas import SensorCreated, SensorInput, SensorRead
from ..security import generate_secret, sha256


router = APIRouter(
    prefix="/api/sensors",
    tags=["sensors"],
    dependencies=[Depends(get_current_token)],
)


def get_sensor_or_404(db: Session, sensor_id: int) -> Sensor:
    """Zwraca czujnik albo zgłasza 404, jeśli nie istnieje."""
    sensor = db.get(Sensor, sensor_id)
    if sensor is None:
        raise ApiError(404, "Czujnik o podanym identyfikatorze nie istnieje.")
    return sensor


@router.get("", response_model=list[SensorRead])
def list_sensors(db: Session = Depends(get_db)):
    """Lista zarejestrowanych czujników (bez kluczy API)."""
    return db.scalars(select(Sensor).order_by(Sensor.id)).all()


@router.get("/{sensor_id}", response_model=SensorRead)
def read_sensor(sensor_id: int, db: Session = Depends(get_db)):
    """Odczyt czujnika (bez klucza API)."""
    return get_sensor_or_404(db, sensor_id)


@router.post("", response_model=SensorCreated, status_code=201)
def register_sensor(data: SensorInput, response: Response, db: Session = Depends(get_db)):
    """Rejestracja czujnika. Klucz API jest zwracany tylko w tej odpowiedzi."""
    if db.get(Series, data.series_id) is None:
        # wskazanie nieistniejącej serii 422
        raise ApiError(
            422,
            "Wskazana seria nie istnieje.",
            errors=[{"field": "seriesId", "message": "Seria o podanym identyfikatorze nie istnieje."}],
        )

    api_key = generate_secret()
    sensor = Sensor(name=data.name, series_id=data.series_id, api_key_hash=sha256(api_key))
    db.add(sensor)
    db.commit()
    db.refresh(sensor)

    response.headers["Location"] = f"/api/sensors/{sensor.id}"
    return SensorCreated(
        id=sensor.id,
        name=sensor.name,
        series_id=sensor.series_id,
        created_at=sensor.created_at,
        last_measurement_at=sensor.last_measurement_at,
        api_key=api_key,
    )


@router.delete("/{sensor_id}", status_code=204)
def unregister_sensor(sensor_id: int, db: Session = Depends(get_db)):
    """Wyrejestrowanie czujnika. Klucz od razu przestaje działać, wyniki zostają."""
    sensor = get_sensor_or_404(db, sensor_id)
    db.delete(sensor)
    db.commit()
    return Response(status_code=204)