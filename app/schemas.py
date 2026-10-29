from datetime import datetime, timezone

from pydantic import BaseModel, ConfigDict, Field, field_validator


class MeasurementCreate(BaseModel):
    station_id: str = Field(min_length=1, max_length=64)
    observed_at: datetime | None = None
    wind_speed: float = Field(ge=0, le=100, allow_inf_nan=False)
    wind_direction: float = Field(ge=0, le=360, allow_inf_nan=False)
    temperature: float = Field(ge=-100, le=100, allow_inf_nan=False)
    humidity: float = Field(ge=0, le=100, allow_inf_nan=False)
    co2: float = Field(ge=0, le=100_000, allow_inf_nan=False)
    pm25: float = Field(ge=0, le=10_000, allow_inf_nan=False)
    pm10: float = Field(ge=0, le=10_000, allow_inf_nan=False)

    @field_validator("station_id")
    @classmethod
    def validate_station_id(cls, value: str) -> str:
        station_id = value.strip()
        if not station_id:
            raise ValueError("station_id must not be blank")
        return station_id

    @field_validator("observed_at")
    @classmethod
    def normalize_observed_at(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("observed_at must include a timezone")
        return value.astimezone(timezone.utc)


class MeasurementRead(MeasurementCreate):
    model_config = ConfigDict(from_attributes=True)

    id: int
    observed_at: datetime
    received_at: datetime

    @field_validator("observed_at", "received_at", mode="before")
    @classmethod
    def ensure_utc(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)


class HealthRead(BaseModel):
    status: str
