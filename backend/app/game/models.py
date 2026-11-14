"""Lightweight domain data. Definitions are copied before use in a game."""

from dataclasses import dataclass, field
from typing import Literal

from app.game.rules import RationLevel


class Definition:
    # Used by Pydantic's loader; domain calculations do not depend on Pydantic.
    __pydantic_config__ = {"extra": "forbid"}


@dataclass(frozen=True)
class Station(Definition):
    id: str
    name: str
    description: str
    mission_id: str
    starting_resources: dict[str, float]
    energy_per_week: float
    oxygen_per_week: float
    solar_efficiency: float = 1.0
    oxygen_efficiency: float = 1.0
    difficulty: Literal["easy", "standard", "hard", "severe", "extreme"] = "standard"
    difficulty_rank: int = 2
    challenge: str = "Balanced supplies and equipment failures."
    lunar_site_id: str | None = None


@dataclass(frozen=True)
class Mission(Definition):
    id: str
    name: str
    description: str
    duration_weeks: int
    event_ids: list[str]
    minimum_survivors: int


@dataclass
class CrewMember(Definition):
    id: str
    name: str
    role: str
    health: int
    positive_trait: str
    negative_trait: str
    food_multiplier: float = 1.0
    water_multiplier: float = 1.0
    event_bonus: float = 0.0
    injury_multiplier: float = 1.0
    food_shortage_weeks: int = 0
    water_shortage_weeks: int = 0

    @property
    def alive(self) -> bool:
        return self.health > 0


@dataclass(frozen=True)
class Item(Definition):
    id: str
    name: str
    description: str
    weight_kg: float
    volume_l: float
    unit: str
    category: str
    resource: str
    resource_amount: float


@dataclass(frozen=True)
class Effects(Definition):
    resources: dict[str, float] = field(default_factory=dict)
    solar_efficiency: float = 0.0
    oxygen_efficiency: float = 0.0
    crew_health: int = 0
    target: Literal["selected", "all"] = "selected"


@dataclass(frozen=True)
class EventChoice(Definition):
    id: str
    text: str
    description: str
    costs: dict[str, float]
    required_items: dict[str, int]
    requires_crew: bool
    role_bonus: dict[str, float]
    success_chance: float
    success_effects: Effects
    failure_effects: Effects
    required_role: str | None = None
    minimum_crew: int = 1
    crew_role_bonus: dict[str, float] = field(default_factory=dict)


@dataclass(frozen=True)
class Event(Definition):
    id: str
    title: str
    description: str
    choices: list[EventChoice]
    weight: float
    min_week: int
    on_start: Effects = field(default_factory=Effects)


@dataclass(frozen=True)
class Ration:
    food: RationLevel
    water: RationLevel


@dataclass
class GameState:
    station_id: str
    mission_id: str
    current_week: int
    crew: list[CrewMember]
    resources: dict[str, float]
    solar_efficiency: float
    oxygen_efficiency: float
    current_event_id: str | None
    used_event_ids: list[str]
    flags: dict[str, str]
    history: list[dict]
    status: str
    random_seed: int
    initial_crew_size: int
    weeks_completed: int = 0
    ending: str | None = None


@dataclass(frozen=True)
class Definitions:
    stations: dict[str, Station]
    missions: dict[str, Mission]
    crew: dict[str, CrewMember]
    items: dict[str, Item]
    events: dict[str, Event]


class GameError(ValueError):
    def __init__(self, message: str, status_code: int = 422):
        super().__init__(message)
        self.status_code = status_code
