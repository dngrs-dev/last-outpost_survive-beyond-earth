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
class ResearchObjective(Definition):
    id: str
    title: str
    description: str
    target: int
    qualifying_choices: list[str]
    source_url: str


@dataclass(frozen=True)
class Mission(Definition):
    id: str
    name: str
    description: str
    duration_weeks: int
    event_ids: list[str]
    minimum_survivors: int
    science_objectives: list[ResearchObjective] = field(default_factory=list)


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
    specialty: str = "Mission operations"
    training_source: str = "https://www.nasa.gov/reference/jsc-crew-operations-training/"
    action_bonuses: dict[str, float] = field(default_factory=dict)

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
    max_quantity: int = 1000000
    inspiration_source: str = (
        "https://www.nasa.gov/centers-and-facilities/johnson/spacewalk-spacesuit-basics/"
    )


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
    category: Literal["hazard", "opportunity", "recovery"] = "hazard"
    science_context: str = "Original training scenario; numerical effects are fictional."
    source_url: str = "https://www.nasa.gov/reference/9-0-hardware-and-equipment-vol-2/"


@dataclass(frozen=True)
class Ration:
    food: RationLevel
    water: RationLevel


@dataclass
class ResearchProject:
    id: str
    kind: str
    phase_index: int = 0
    progress: int = 0
    status: Literal["active", "paused", "completed"] = "active"
    assigned_crew_id: str | None = None
    message: str = "Awaiting deployment."
    completed_week: int | None = None


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
    projects: list[ResearchProject] = field(default_factory=list)


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
