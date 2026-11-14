"""Read-only, validated lunar archive. Serving it never contacts an external service."""

import hashlib
from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, HttpUrl, model_validator

from app.game.loader import DEFAULT_DATA


class ArchiveModel(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)


class MoonSource(ArchiveModel):
    id: str
    title: str
    url: HttpUrl
    credit: str
    usage: str


class HistoricalMission(ArchiveModel):
    name: str
    theme: str
    objective: str
    source_url: HttpUrl


class MoonSite(ArchiveModel):
    id: str
    name: str
    region: str
    latitude: float = Field(ge=-90, le=90, allow_inf_nan=False)
    longitude: float = Field(ge=-180, le=180, allow_inf_nan=False)
    kind: Literal["historical_landing_site"]
    landing_date: date
    eva_hours: float = Field(gt=0, allow_inf_nan=False)
    sample_return_kg: float = Field(gt=0, allow_inf_nan=False)
    mission: HistoricalMission
    training_station_id: str
    training_mission_id: str


class MoonTexture(ArchiveModel):
    path: Literal["/images/moon/lroc_color_2k.jpg"]
    source_url: HttpUrl
    credit: str
    sha256: str = Field(pattern=r"^[a-f0-9]{64}$")
    bytes: int = Field(gt=0, le=2_000_000)
    note: str


class MoonCatalog(ArchiveModel):
    schema_version: Literal[2]
    retrieved_at: date
    coordinate_frame: str
    sources: list[MoonSource] = Field(min_length=1)
    texture: MoonTexture
    sites: list[MoonSite] = Field(min_length=1)

    @model_validator(mode="after")
    def unique_ids(self):
        for entries in (self.sites, self.sources):
            ids = [entry.id for entry in entries]
            if len(ids) != len(set(ids)):
                raise ValueError("Lunar archive IDs must be unique")
        return self


def load_moon_catalog() -> tuple[MoonCatalog, str]:
    content = (DEFAULT_DATA / "moon.json").read_bytes()
    return MoonCatalog.model_validate_json(content), f'"{hashlib.sha256(content).hexdigest()}"'
