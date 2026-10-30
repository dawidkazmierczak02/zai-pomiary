from fastapi import APIRouter, Depends, Response
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ..db import get_db
from ..dependencies import get_current_token
from ..errors import ApiError, problem_responses
from ..models import AuthToken, Measurement, Series
from ..schemas import SeriesInput, SeriesRead

router = APIRouter(
    prefix="/api/series",
    tags=["series"],
    responses=problem_responses(400, 401, 404, 409, 422),
)

def get_series_or_404(db: Session, series_id: int) -> Series:
    """Zwraca serię albo zgłasza 404, jeśli nie istnieje."""
    series = db.get(Series, series_id)
    if series is None:
        raise ApiError(404, "Seria o podanym identyfikatorze nie istnieje.")
    return series


@router.get("", response_model=list[SeriesRead])
def list_series(db: Session = Depends(get_db)):
    """Lista wszystkich serii (publiczna)."""
    return db.scalars(select(Series).order_by(Series.id)).all()


@router.get("/{series_id}", response_model=SeriesRead)
def read_series(series_id: int, db: Session = Depends(get_db)):
    """Odczyt jednej serii (publiczny)."""
    return get_series_or_404(db, series_id)


@router.post("", response_model=SeriesRead, status_code=201)
def create_series(
    data: SeriesInput,
    response: Response,
    _admin: AuthToken = Depends(get_current_token),
    db: Session = Depends(get_db),
):
    """Utworzenie serii (administrator)."""
    series = Series(**data.model_dump())
    db.add(series)
    db.commit()
    db.refresh(series)
    response.headers["Location"] = f"/api/series/{series.id}"
    return series


@router.put("/{series_id}", response_model=SeriesRead)
def update_series(
    series_id: int,
    data: SeriesInput,
    _admin: AuthToken = Depends(get_current_token),
    db: Session = Depends(get_db),
):
    """Pełna aktualizacja serii (administrator).

    Jeśli nowy przedział nie obejmuje wyników już zapisanych w serii 409 (F4).
    """
    series = get_series_or_404(db, series_id)

    out_of_range = db.scalar(
        select(func.count())
        .select_from(Measurement)
        .where(
            Measurement.series_id == series.id,
            or_(Measurement.value < data.min_value, Measurement.value > data.max_value),
        )
    )
    if out_of_range:
        raise ApiError(
            409,
            f"Nowy przedział wyklucza {out_of_range} zapisanych wyników tej serii.",
        )

    for field, value in data.model_dump().items():
        setattr(series, field, value)
    db.commit()
    db.refresh(series)
    return series


@router.delete("/{series_id}", status_code=204)
def delete_series(
    series_id: int,
    _admin: AuthToken = Depends(get_current_token),
    db: Session = Depends(get_db),
):
    """Usunięcie serii. Baza usuwa też jej wyniki i czujniki."""
    series = get_series_or_404(db, series_id)
    db.delete(series)
    db.commit()
    return Response(status_code=204)