"""Objective equipment minima, derived from the canonical planned research routes."""

from math import ceil

from app.game.models import Definitions, Mission
from app.game.research import RESEARCH_CHOICES

RENEWABLE = frozenset({"electricity", "oxygen", "water", "food"})


def objective_requirements(mission: Mission) -> dict[str, float]:
    """One attempt per target; reusable tools are retained, consumables are summed.

    Event opportunities remain an alternative during play. Launch readiness must
    not depend on drawing those events. This is equipment readiness, not a promise
    of success or sufficient provisions for survival and failed attempts.
    """
    required: dict[str, float] = {}
    for objective in mission.science_objectives:
        routes = [c for c in RESEARCH_CHOICES if c.id in objective.qualifying_choices]
        if not routes:
            continue  # Event-only objectives have no independent equipment route.
        choice = routes[0]
        for resource, amount in choice.required_items.items():
            required[resource] = max(required.get(resource, 0), amount)
        for resource, amount in choice.costs.items():
            if resource not in RENEWABLE:
                required[resource] = required.get(resource, 0) + amount * objective.target
    return required


def minimum_cargo(definitions: Definitions, station_id: str) -> dict[str, int]:
    """Equipment deficits only; no automatic packing takes place in create_game."""
    station = definitions.stations[station_id]
    mission = definitions.missions[station.mission_id]
    cargo = {}
    for resource, required in objective_requirements(mission).items():
        deficit = required - station.starting_resources.get(resource, 0)
        if deficit > 0:
            item = next(i for i in definitions.items.values() if i.resource == resource)
            cargo[item.id] = ceil(deficit / item.resource_amount)
    return cargo
