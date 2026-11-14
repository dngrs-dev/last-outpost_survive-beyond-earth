"""Pydantic HTTP contracts. Domain objects remain independent of these models."""

from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.game.rules import RationLevel

Identifier = Annotated[str, Field(strict=True, min_length=1, max_length=128)]
Quantity = Annotated[int, Field(strict=True, ge=0, le=1_000_000)]


class RequestModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CreateGameRequest(RequestModel):
    station_id: Identifier
    crew_ids: Annotated[list[Identifier], Field(min_length=1, max_length=8)]
    cargo: dict[Identifier, Quantity] = Field(default_factory=dict)
    random_seed: Annotated[int, Field(strict=True, ge=0, le=2**63 - 1)] | None = None


class RationRequest(RequestModel):
    food: RationLevel
    water: RationLevel


class AssignmentRequest(RequestModel):
    crew_id: Identifier
    activity_id: Identifier


class ProjectOrderRequest(RequestModel):
    project_id: Identifier
    action: Literal["pause", "resume", "interrupt"]


class SubmitTurnRequest(RequestModel):
    expected_week: Annotated[int, Field(strict=True, ge=1)]
    request_id: Identifier
    rations: dict[Identifier, RationRequest]
    event_choice_id: Identifier
    selected_crew_id: Identifier | None = None
    support_crew_ids: list[Identifier] = Field(default_factory=list, max_length=7)
    assignments: list[AssignmentRequest] = Field(default_factory=list, max_length=8)
    project_orders: list[ProjectOrderRequest] = Field(default_factory=list, max_length=8)
    power_priority: Literal["life_support", "research"] | None = None


class ErrorResponse(BaseModel):
    detail: str


class RationCost(BaseModel):
    food: float
    water: float


class CrewResponse(BaseModel):
    id: str
    name: str
    role: str
    health: int
    positive_trait: str
    negative_trait: str
    food_multiplier: float
    water_multiplier: float
    event_bonus: float
    injury_multiplier: float
    specialty: str
    training_source: str
    action_bonuses: dict[str, float]
    food_shortage_weeks: int
    water_shortage_weeks: int
    alive: bool
    ration_options: dict[RationLevel, RationCost]


class EffectsResponse(BaseModel):
    resources: dict[str, float]
    solar_efficiency: float
    oxygen_efficiency: float
    crew_health: int
    target: Literal["selected", "all"]


class CandidateResponse(BaseModel):
    crew_id: str
    available: bool
    unavailable_reasons: list[str]
    success_probability: float


class ObjectiveGainResponse(BaseModel):
    objective_id: str
    title: str
    amount: int


class ChoiceResponse(BaseModel):
    id: str
    action_type: Literal["event", "maintenance", "research"]
    objective_rewards: list[ObjectiveGainResponse]
    text: str
    description: str
    costs: dict[str, float]
    required_items: dict[str, int]
    requires_crew: bool
    role_bonus: dict[str, float]
    crew_role_bonus: dict[str, float]
    success_chance: float
    success_effects: EffectsResponse
    failure_effects: EffectsResponse
    required_role: str | None
    minimum_crew: int
    available: bool
    unavailable_reasons: list[str]
    eligible_crew: list[CandidateResponse]
    success_probability: float | None


class EventResponse(BaseModel):
    id: str
    title: str
    description: str
    category: Literal["hazard", "opportunity", "recovery"]
    science_context: str
    source_url: str
    on_start: EffectsResponse
    choices: list[ChoiceResponse]


class MissionDays(BaseModel):
    start: int
    end: int


class ObjectiveProgressResponse(BaseModel):
    id: str
    title: str
    description: str
    target: int
    qualifying_choices: list[str]
    source_url: str
    progress: int
    completed: bool


class ScienceResponse(BaseModel):
    status: Literal["not_started", "partial", "complete"]
    completed_objectives: int
    total_objectives: int
    research_data: float
    objectives: list[ObjectiveProgressResponse]


class ResultsResponse(BaseModel):
    ending: str
    weeks_survived: int
    initial_crew_size: int
    surviving_crew_ids: list[str]
    deceased_crew_ids: list[str]
    failure_reason: str | None
    science: ScienceResponse


class HealthChangeResponse(BaseModel):
    crew_id: str
    before: int
    after: int


class AppliedEffectsResponse(BaseModel):
    resources: dict[str, float]
    solar_efficiency: float
    oxygen_efficiency: float
    health_changes: list[HealthChangeResponse]


class EventOutcomeResponse(BaseModel):
    support_crew_ids: list[str]
    event_id: str
    choice_id: str
    choice_text: str
    selected_crew_id: str | None
    success: bool
    success_probability: float
    costs: dict[str, float]
    effects: AppliedEffectsResponse
    objective_progress: list[ObjectiveGainResponse]


class SurvivalHealthResponse(HealthChangeResponse):
    food_penalty: int
    water_penalty: int
    oxygen_penalty: int
    died: bool


class SurvivalResponse(BaseModel):
    daylight_fraction: float
    battery_capacity: float
    electricity_curtailed: float
    project_electricity_used: float
    power_priority: Literal["life_support", "research"]
    ration_requirements: RationCost
    ration_costs: RationCost
    ration_depletion_fractions: RationCost
    electricity_generated: float
    electricity_required: float
    electricity_used: float
    life_support_power_fraction: float
    oxygen_generated: float
    oxygen_required: float
    oxygen_used: float
    oxygen_shortage: float
    health_changes: list[SurvivalHealthResponse]


class NextEventResponse(BaseModel):
    event_id: str
    title: str
    effects: AppliedEffectsResponse


class AssignmentOutcomeResponse(BaseModel):
    crew_id: str
    activity_id: str
    status: Literal["completed", "cancelled"]
    outcome: EventOutcomeResponse | None
    reason: str | None


class ProjectUpdateResponse(BaseModel):
    project_id: str
    message: str
    electricity_used: float


class TurnOutcomeResponse(BaseModel):
    project_updates: list[ProjectUpdateResponse]
    assignments: list[AssignmentOutcomeResponse]
    science_gains: list[ObjectiveGainResponse]
    week: int
    event: EventOutcomeResponse
    rations: dict[str, RationRequest]
    survival: SurvivalResponse
    resource_changes: dict[str, float]
    deaths: list[str]
    next_event: NextEventResponse | None = None
    ending: str | None = None


class ProjectResponse(BaseModel):
    id: str
    kind: str
    status: Literal["active", "paused", "completed"]
    phase: str
    phase_index: int
    phase_progress: int
    phase_weeks: int
    remaining_weeks: int
    estimated_completion_week: int | None
    within_rotation: bool
    crew_required: int
    costs: dict[str, float]
    required_items: dict[str, int]
    assigned_crew_id: str | None
    message: str


class SunlightWeekResponse(BaseModel):
    week: int
    daylight_fraction: float
    daylight_days: float
    darkness_days: float
    phase: Literal["daylight", "darkness", "mixed"]
    electricity_generated: float


class LightingResponse(BaseModel):
    solar_day_earth_days: float
    reference_longitude_deg: float
    source_url: str
    context_url: str
    assumption: str


class EnergyResponse(BaseModel):
    battery_capacity: float
    stored: float
    priority: Literal["life_support", "research"]
    life_support_required: float
    solar_day_earth_days: float
    source_url: str
    assumption: str
    forecast: list[SunlightWeekResponse]


class GameStateResponse(BaseModel):
    energy: EnergyResponse
    battery_capacity: float
    power_priority: Literal["life_support", "research"]
    research_projects: list[ProjectResponse]
    station_id: str
    station_name: str
    difficulty: str
    difficulty_rank: int
    mission_id: str
    mission_name: str
    current_week: int
    duration_weeks: int
    minimum_survivors: int
    weeks_remaining: int
    mission_days: MissionDays
    crew: list[CrewResponse]
    resources: dict[str, float]
    solar_efficiency: float
    oxygen_efficiency: float
    current_event_id: str | None
    current_event: EventResponse | None
    emergency_ration_requirements: RationCost
    depleted_provisions: list[str]
    used_event_ids: list[str]
    flags: dict[str, str]
    history: list[TurnOutcomeResponse]
    status: Literal["running", "completed", "failed"]
    random_seed: int
    initial_crew_size: int
    weeks_completed: int
    ending: str | None
    results: ResultsResponse | None
    science: ScienceResponse
    assignment_options: list[ChoiceResponse]


class GameResponse(BaseModel):
    game_id: str
    state: GameStateResponse


class TurnResponse(GameResponse):
    turn_outcome: TurnOutcomeResponse


class CatalogResponse(BaseModel):
    lighting: LightingResponse
    sunlight_forecasts: dict[str, list[SunlightWeekResponse]]
    stations: list[dict[str, Any]]
    missions: list[dict[str, Any]]
    crew: list[dict[str, Any]]
    items: list[dict[str, Any]]
    limits: dict[str, float | int]
    ration_multipliers: dict[RationLevel, float]
    balance_note: str
