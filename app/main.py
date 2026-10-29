from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.config import APP_NAME, CORS_ORIGINS
from app.database import Base, engine, get_db
from app.models import Measurement, utc_now
from app.schemas import HealthRead, MeasurementCreate, MeasurementRead


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    title=APP_NAME,
    version="1.0.0",
    description="校园风速、风向、温湿度、二氧化碳和颗粒物监测接口",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials="*" not in CORS_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


def _query_time(value: datetime | None, field_name: str) -> datetime | None:
    if value is None:
        return None
    if value.tzinfo is None or value.utcoffset() is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name} must include a timezone",
        )
    return value.astimezone(timezone.utc)


def _station_filter(value: str | None) -> str | None:
    if value is None:
        return None
    station_id = value.strip()
    if not station_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="station_id must not be blank",
        )
    return station_id


@app.get("/health", response_model=HealthRead, tags=["system"])
def health(db: Session = Depends(get_db)) -> HealthRead:
    db.execute(text("SELECT 1"))
    return HealthRead(status="ok")


@app.post(
    "/api/v1/measurements",
    response_model=MeasurementRead,
    status_code=status.HTTP_201_CREATED,
    tags=["measurements"],
)
def create_measurement(
    payload: MeasurementCreate,
    db: Session = Depends(get_db),
) -> Measurement:
    measurement = Measurement(
        **payload.model_dump(exclude={"observed_at"}),
        observed_at=payload.observed_at or utc_now(),
    )
    db.add(measurement)
    db.commit()
    db.refresh(measurement)
    return measurement


@app.get(
    "/api/v1/measurements",
    response_model=list[MeasurementRead],
    tags=["measurements"],
)
def list_measurements(
    station_id: str | None = Query(None, min_length=1, max_length=64),
    start: datetime | None = Query(None, description="ISO 8601 起始时间"),
    end: datetime | None = Query(None, description="ISO 8601 结束时间"),
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1_000),
    db: Session = Depends(get_db),
) -> list[Measurement]:
    start_utc = _query_time(start, "start")
    end_utc = _query_time(end, "end")
    station = _station_filter(station_id)
    if start_utc and end_utc and start_utc > end_utc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="start must not be later than end",
        )

    query = select(Measurement)
    if station:
        query = query.where(Measurement.station_id == station)
    if start_utc:
        query = query.where(Measurement.observed_at >= start_utc)
    if end_utc:
        query = query.where(Measurement.observed_at <= end_utc)
    query = query.order_by(Measurement.observed_at.desc(), Measurement.id.desc())
    return list(db.scalars(query.offset(offset).limit(limit)))


@app.get(
    "/api/v1/measurements/latest",
    response_model=MeasurementRead,
    tags=["measurements"],
)
def latest_measurement(
    station_id: str | None = Query(None, min_length=1, max_length=64),
    db: Session = Depends(get_db),
) -> Measurement:
    query = select(Measurement)
    station = _station_filter(station_id)
    if station:
        query = query.where(Measurement.station_id == station)
    query = query.order_by(Measurement.observed_at.desc(), Measurement.id.desc())
    measurement = db.scalars(query.limit(1)).first()
    if measurement is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No measurement found",
        )
    return measurement
