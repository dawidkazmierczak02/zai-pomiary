from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..errors import problem_responses
from ..db import get_db
from ..dependencies import get_current_token
from ..models import RejectedMeasurement
from ..schemas import RejectedMeasurementRead

# Log tylko dla admina token wymagany dla całego routera
router = APIRouter(
    prefix="/api/rejected-measurements",
    tags=["rejected-measurements"],
    dependencies=[Depends(get_current_token)],
    responses=problem_responses(400, 401),
)


@router.get("", response_model=list[RejectedMeasurementRead])
def list_rejected_measurements(
    series: int | None = Query(default=None, description="Identyfikator serii; brak = wszystkie"),
    limit: int = Query(default=100, ge=1, le=1000),
    db: Session = Depends(get_db),
):
    """Log błędów (F4): odrzucone wyniki, od najnowszych."""
    query = select(RejectedMeasurement)
    if series is not None:
        query = query.where(RejectedMeasurement.series_id == series)
    query = query.order_by(
        RejectedMeasurement.created_at.desc(), RejectedMeasurement.id.desc()
    ).limit(limit)
    return db.scalars(query).all()