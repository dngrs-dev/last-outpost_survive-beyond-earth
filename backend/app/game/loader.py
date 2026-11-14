"""Load and validate static content once at application startup."""

import math
import sys
from pathlib import Path

from pydantic import TypeAdapter, ValidationError

from app.game.models import (
    CrewMember,
    Definitions,
    Effects,
    Event,
    Item,
    LightingModel,
    Mission,
    Station,
)
from app.game.research import RESEARCH_CHOICE_IDS
from app.game.rules import RESOURCE_NAMES, ROLES

SOURCE_DATA = Path(__file__).resolve().parents[2] / "data"
DEFAULT_DATA = SOURCE_DATA if SOURCE_DATA.is_dir() else Path(sys.prefix) / "share" / "last-outpost"


class ConfigurationError(ValueError):
    """Invalid authored game data; never caused by a player decision."""


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise ConfigurationError(message)


def _number(value: float, low: float = 0, high: float = math.inf) -> bool:
    return math.isfinite(value) and low <= value <= high


def _resources(values: dict[str, float], context: str, signed: bool = False) -> None:
    _require(not (values.keys() - RESOURCE_NAMES), f"{context}: unknown resource")
    _require(
        all(_number(n, -math.inf if signed else 0) for n in values.values()),
        f"{context}: invalid resource amount",
    )
    for name in (
        "medicine",
        "repair_kits",
        "eva_batteries",
        "dust_kits",
        "oxygen_regulators",
        "diagnostic_tools",
        "sealant_packs",
        "scientific_tools",
        "research_data",
    ):
        if name in values:
            _require(values[name].is_integer(), f"{context}: {name} must be whole units")


def _effects(effect: Effects, context: str, requires_crew: bool) -> None:
    _resources(effect.resources, context, signed=True)
    for name in ("solar_efficiency", "oxygen_efficiency"):
        _require(_number(getattr(effect, name), -1, 1), f"{context}: invalid {name}")
    _require(-100 <= effect.crew_health <= 100, f"{context}: invalid health effect")
    _require(
        not effect.crew_health or effect.target == "all" or requires_crew,
        f"{context}: selected health effect requires an astronaut",
    )


def load_definitions(data_dir: Path = DEFAULT_DATA) -> Definitions:
    loaded = {}
    for filename, model in (
        ("stations", Station),
        ("missions", Mission),
        ("crew", CrewMember),
        ("items", Item),
        ("events", Event),
    ):
        try:
            entries = TypeAdapter(list[model]).validate_json(
                (data_dir / f"{filename}.json").read_text(encoding="utf-8"), strict=True
            )
        except (OSError, ValidationError) as exc:
            raise ConfigurationError(f"Cannot load {filename}.json: {exc}") from exc
        ids = [entry.id for entry in entries]
        _require(bool(entries), f"{filename}: definitions must not be empty")
        _require(all(ids) and len(set(ids)) == len(ids), f"{filename}: duplicate or empty IDs")
        loaded[filename] = {entry.id: entry for entry in entries}
    try:
        lighting = TypeAdapter(LightingModel).validate_json(
            (data_dir / "lighting.json").read_text(encoding="utf-8"), strict=True
        )
    except (OSError, ValidationError) as exc:
        raise ConfigurationError(f"Cannot load lighting.json: {exc}") from exc
    _require(_number(lighting.solar_day_earth_days, 25, 35), "Invalid lunar solar period")
    _require(_number(lighting.reference_longitude_deg, -180, 180), "Invalid reference longitude")
    _require(
        lighting.source_url.startswith("https://svs.gsfc.nasa.gov/")
        and lighting.context_url.startswith("https://science.nasa.gov/")
        and bool(lighting.assumption.strip()),
        "Missing lighting provenance",
    )
    definitions = Definitions(**loaded, lighting=lighting)

    site_ids = [s.lunar_site_id for s in definitions.stations.values() if s.lunar_site_id]
    _require(len(site_ids) == len(set(site_ids)), "Stations must have unique lunar landing sites")

    for station in definitions.stations.values():
        _require(station.mission_id in definitions.missions, f"{station.id}: unknown mission")
        _require(_number(station.longitude_deg, -180, 180), f"{station.id}: invalid longitude")
        _require(_number(station.battery_capacity, 1), f"{station.id}: invalid battery capacity")
        _require(
            station.starting_resources.get("electricity", math.inf) <= station.battery_capacity,
            f"{station.id}: starting battery exceeds capacity",
        )
        _resources(station.starting_resources, station.id)
        _require(
            station.starting_resources.keys() == RESOURCE_NAMES,
            f"{station.id}: starting resources must define all resource types",
        )
        _require(
            _number(station.energy_per_week) and _number(station.oxygen_per_week),
            f"{station.id}: invalid production",
        )
        _require(
            _number(station.solar_efficiency, 0, 1) and _number(station.oxygen_efficiency, 0, 1),
            f"{station.id}: invalid starting system condition",
        )
        difficulty_ranks = {"easy": 1, "standard": 2, "hard": 3, "severe": 4, "extreme": 5}
        _require(
            station.difficulty_rank == difficulty_ranks[station.difficulty],
            f"{station.id}: difficulty label and rank do not match",
        )
    for mission in definitions.missions.values():
        _require(mission.duration_weeks > 0, f"{mission.id}: invalid duration")
        _require(1 <= mission.minimum_survivors <= 8, f"{mission.id}: invalid survivor target")
        _require(
            len(set(mission.event_ids)) == len(mission.event_ids)
            and all(event_id in definitions.events for event_id in mission.event_ids),
            f"{mission.id}: duplicate or unknown event reference",
        )
        objective_ids = [objective.id for objective in mission.science_objectives]
        _require(
            bool(objective_ids)
            and all(objective_ids)
            and len(set(objective_ids)) == len(objective_ids),
            f"{mission.id}: missing or duplicate science objectives",
        )
        qualifying_choices = set()
        mission_choices = {
            choice.id
            for event_id in mission.event_ids
            for choice in definitions.events[event_id].choices
        } | RESEARCH_CHOICE_IDS
        for objective in mission.science_objectives:
            context = f"{mission.id}/{objective.id}"
            _require(
                bool(objective.title.strip()) and bool(objective.description.strip()),
                f"{context}: missing research brief",
            )
            _require(
                0 < objective.target <= mission.duration_weeks, f"{context}: invalid science target"
            )
            choices = set(objective.qualifying_choices)
            _require(
                len(choices) == len(objective.qualifying_choices)
                and not choices - mission_choices
                and not choices & qualifying_choices,
                f"{context}: duplicate or unknown qualifying choice",
            )
            _require(
                bool(choices & RESEARCH_CHOICE_IDS), f"{context}: requires a planned research task"
            )
            _require(
                objective.source_url.startswith(
                    (
                        "https://www.nasa.gov/",
                        "https://science.nasa.gov/",
                        "https://history.nasa.gov/",
                    )
                ),
                f"{context}: expected an official NASA source",
            )
            qualifying_choices.update(choices)
        _require(
            sum(objective.target for objective in mission.science_objectives)
            <= mission.duration_weeks,
            f"{mission.id}: science targets exceed available weeks",
        )
    for crew in definitions.crew.values():
        _require(0 < crew.health <= 100, f"{crew.id}: invalid starting health")
        _require(crew.role in ROLES, f"{crew.id}: unknown profession")
        choice_ids = {
            choice.id for event in definitions.events.values() for choice in event.choices
        }
        choice_ids |= RESEARCH_CHOICE_IDS
        _require(
            not (crew.action_bonuses.keys() - choice_ids)
            and all(_number(value, -0.3, 0.3) for value in crew.action_bonuses.values()),
            f"{crew.id}: invalid specialty action bonus",
        )
        _require(
            crew.training_source.startswith("https://www.nasa.gov/"),
            f"{crew.id}: training source must be an official NASA reference",
        )
        _require(_number(crew.event_bonus, -1, 1), f"{crew.id}: invalid event bonus")
        for name in ("food_multiplier", "water_multiplier", "injury_multiplier"):
            _require(_number(getattr(crew, name), 0.1, 3), f"{crew.id}: invalid {name}")
        _require(
            crew.food_shortage_weeks == crew.water_shortage_weeks == 0,
            f"{crew.id}: starting ration streak must be zero",
        )
    for item in definitions.items.values():
        _require(item.max_quantity > 0, f"{item.id}: invalid cargo quantity limit")
        _require(
            item.inspiration_source.startswith(
                ("https://www.nasa.gov/", "https://history.nasa.gov/")
            ),
            f"{item.id}: equipment source must be an official NASA reference",
        )
        _require(item.resource in RESOURCE_NAMES, f"{item.id}: unknown resource")
        for name in ("weight_kg", "volume_l", "resource_amount"):
            _require(_number(getattr(item, name), 0.001), f"{item.id}: invalid {name}")
        _resources({item.resource: item.resource_amount}, item.id)
    for event in definitions.events.values():
        _require(
            event.source_url.startswith(
                ("https://www.nasa.gov/", "https://science.nasa.gov/", "https://history.nasa.gov/")
            ),
            f"{event.id}: expected an official NASA source",
        )
        _require(bool(event.science_context.strip()), f"{event.id}: missing science context")
        _require(event.id != "quiet_week", "quiet_week is reserved for the neutral fallback")
        _require(_number(event.weight, 0.001), f"{event.id}: invalid weight")
        _require(event.min_week > 0, f"{event.id}: invalid earliest week")
        _require(2 <= len(event.choices) <= 4, f"{event.id}: expected two to four choices")
        ids = [choice.id for choice in event.choices]
        _require(all(ids) and len(set(ids)) == len(ids), f"{event.id}: duplicate choice IDs")
        _effects(event.on_start, event.id, requires_crew=False)
        for choice in event.choices:
            context = f"{event.id}/{choice.id}"
            _require(
                choice.id not in {"clean_array", "install_regulator"} | RESEARCH_CHOICE_IDS
                and not choice.id.startswith("project:"),
                f"{context}: reserved weekly action ID",
            )
            _resources(choice.costs, context)
            _require(_number(choice.success_chance, 0, 1), f"{context}: invalid probability")
            _require(
                1 <= choice.minimum_crew <= 8,
                f"{context}: invalid minimum crew",
            )
            _require(
                choice.required_role is None
                or (choice.requires_crew and choice.required_role in ROLES),
                f"{context}: invalid required role",
            )
            for bonuses in (choice.role_bonus, choice.crew_role_bonus):
                _require(
                    not (bonuses.keys() - ROLES)
                    and all(_number(n, -1, 1) for n in bonuses.values()),
                    f"{context}: invalid profession bonus",
                )
            for item_id, quantity in choice.required_items.items():
                _require(
                    item_id in definitions.items and quantity > 0,
                    f"{context}: unknown item or invalid required quantity",
                )
            _effects(choice.success_effects, context, choice.requires_crew)
            _effects(choice.failure_effects, context, choice.requires_crew)
    return definitions
