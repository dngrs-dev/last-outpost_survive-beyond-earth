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


def recommended_cargo(definitions: Definitions, station_id: str) -> dict[str, int]:
    """A capacity-safe starting suggestion for four default crew, not a winning solution."""
    station = definitions.stations[station_id]
    mission = definitions.missions[station.mission_id]
    cargo = {
        **minimum_cargo(definitions, station_id),
        "scientific_tools": 1,
        "food_packs": max(
            2, ceil((mission.duration_weeks * 4.1 + 8 - station.starting_resources["food"]) / 4)
        ),
        "water_containers": max(
            2, ceil((mission.duration_weeks * 6 + 12 - station.starting_resources["water"]) / 5)
        ),
        "medicine_kits": 4,
        "repair_kits": 6,
        "eva_batteries": max(5, minimum_cargo(definitions, station_id).get("eva_batteries", 0) + 3),
        "dust_kits": 3,
        "oxygen_regulators": 2,
        "diagnostic_tools": 1,
        "sealant_packs": 4,
        "oxygen_tanks": 2,
        "power_cells": 2,
    }
    # Keep the complete tool selection; trim provisions if cargo is tight.
    for item_id, quantity in cargo.items():
        cargo[item_id] = min(quantity, definitions.items[item_id].max_quantity)

    def within_limits():
        return all(
            sum(getattr(definitions.items[i], field) * n for i, n in cargo.items()) <= limit
            for field, limit in (("weight_kg", 180), ("volume_l", 240))
        )

    while not within_limits():
        candidates = [i for i in ("water_containers", "food_packs") if cargo[i] > 2]
        if not candidates:
            raise ValueError("Recommended equipment does not fit cargo limits")
        cargo[max(candidates, key=lambda i: cargo[i] * definitions.items[i].weight_kg)] -= 1
    return cargo
