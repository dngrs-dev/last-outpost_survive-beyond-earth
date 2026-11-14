"""Pure weekly resource and health calculations. Inputs are never modified."""

from copy import deepcopy
from math import ceil

from app.game.energy import daylight_fraction
from app.game.models import CrewMember, GameError, GameState, LightingModel, Ration, Station
from app.game.projects import advance_recording
from app.game.rules import (
    FOOD_PENALTIES,
    RATION_MULTIPLIERS,
    WATER_PENALTIES,
    Rules,
)


def ration_cost(crew: CrewMember, ration: Ration, rules: Rules) -> dict[str, float]:
    return {
        "food": round(
            rules.food_per_week * crew.food_multiplier * RATION_MULTIPLIERS[ration.food], 6
        ),
        "water": round(
            rules.water_per_week * crew.water_multiplier * RATION_MULTIPLIERS[ration.water], 6
        ),
    }


def ration_requirements(
    state: GameState, rations: dict[str, Ration], rules: Rules
) -> dict[str, float]:
    living = {crew.id: crew for crew in state.crew if crew.alive}
    if rations.keys() != living.keys():
        raise GameError(
            "Rations must specify exactly every living astronaut, and no dead astronauts."
        )
    totals = {"food": 0.0, "water": 0.0}
    for crew_id, ration in rations.items():
        if ration.food not in RATION_MULTIPLIERS or ration.water not in RATION_MULTIPLIERS:
            raise GameError("Ration levels must be normal, reduced, or emergency.")
        for resource, amount in ration_cost(living[crew_id], ration, rules).items():
            totals[resource] += amount
    return {name: round(value, 6) for name, value in totals.items()}


def change_health(crew: CrewMember, amount: int) -> None:
    """Apply to a working copy only. Dead astronauts cannot be revived."""
    if crew.alive:
        damage = ceil(abs(amount) * crew.injury_multiplier) if amount < 0 else 0
        crew.health = max(0, min(100, crew.health + (amount if amount >= 0 else -damage)))


def permits_depletion(rations: dict[str, Ration], resource: str) -> bool:
    """Only all-emergency allocations can accept unavoidable starvation/dehydration."""
    return all(getattr(ration, resource) == "emergency" for ration in rations.values())


def simulate_week(
    state: GameState,
    station: Station,
    rations: dict[str, Ration],
    rules: Rules,
    *,
    lighting: LightingModel,
    original: GameState | None = None,
    project_log: list[dict] | None = None,
) -> tuple[GameState, dict]:
    """After event resolution: feed survivors, generate/use power, generate/use oxygen,
    then apply ration and oxygen penalties. Event casualties consume no weekly supplies.
    """
    result = deepcopy(state)
    living = [crew for crew in result.crew if crew.alive]
    active_rations = {crew.id: rations[crew.id] for crew in living}
    costs = ration_requirements(result, active_rations, rules)
    depletion_fractions = {}
    actual_costs = {}
    for name, amount in costs.items():
        available = result.resources[name]
        if available + 1e-6 < amount and not permits_depletion(active_rations, name):
            raise GameError(f"Insufficient {name} for the selected rations.")
        actual_costs[name] = min(available, amount)
        depletion_fractions[name] = max(0.0, 1 - available / amount) if amount else 0.0
        result.resources[name] = max(0.0, round(available - actual_costs[name], 6))

    sunlight = daylight_fraction(station, lighting, result.current_week)
    power_generated = station.energy_per_week * result.solar_efficiency * sunlight
    power_required = rules.base_electricity_use + rules.crew_electricity_use * len(living)
    available_power = result.resources["electricity"] + power_generated
    project_budget = (
        max(0, available_power - power_required)
        if result.power_priority == "life_support"
        else available_power
    )
    project_power = advance_recording(
        result, original or state, project_log if project_log is not None else [], project_budget
    )
    available_power -= project_power
    power_used = min(available_power, power_required)
    power_fraction = power_used / power_required if power_required else 1.0
    remainder = max(0.0, available_power - power_used)
    spilled = max(0.0, remainder - result.battery_capacity)
    result.resources["electricity"] = round(min(result.battery_capacity, remainder), 6)

    oxygen_generated = station.oxygen_per_week * result.oxygen_efficiency * power_fraction
    oxygen_required = rules.oxygen_per_week * len(living)
    available_oxygen = result.resources["oxygen"] + oxygen_generated
    oxygen_used = min(available_oxygen, oxygen_required)
    oxygen_shortage = max(0.0, oxygen_required - oxygen_used)
    oxygen_fraction = oxygen_shortage / oxygen_required if oxygen_required else 0.0
    oxygen_penalty = ceil(rules.oxygen_shortage_penalty * oxygen_fraction)
    result.resources["oxygen"] = round(max(0.0, available_oxygen - oxygen_used), 6)

    health_changes = []
    for crew in living:
        before = crew.health
        ration = rations[crew.id]
        penalties = {}
        for resource, level, schedule in (
            ("food", ration.food, FOOD_PENALTIES),
            ("water", ration.water, WATER_PENALTIES),
        ):
            field = f"{resource}_shortage_weeks"
            streak = getattr(crew, field) + 1 if level != "normal" else 0
            setattr(crew, field, streak)
            repeated = min(
                rules.max_ration_streak_penalty,
                max(0, streak - 1) * rules.repeated_ration_penalty,
            )
            depletion_penalty = (
                rules.food_depletion_penalty
                if resource == "food"
                else rules.water_depletion_penalty
            )
            penalties[resource] = (
                schedule[level] + repeated + ceil(depletion_penalty * depletion_fractions[resource])
            )
        crew.health = max(0, crew.health - sum(penalties.values()) - oxygen_penalty)
        health_changes.append(
            {
                "crew_id": crew.id,
                "before": before,
                "after": crew.health,
                "food_penalty": penalties["food"],
                "water_penalty": penalties["water"],
                "oxygen_penalty": oxygen_penalty,
                "died": not crew.alive,
            }
        )
    report = {
        "ration_requirements": costs,
        "ration_costs": actual_costs,
        "ration_depletion_fractions": depletion_fractions,
        "daylight_fraction": sunlight,
        "battery_capacity": result.battery_capacity,
        "electricity_curtailed": round(spilled, 6),
        "project_electricity_used": project_power,
        "power_priority": result.power_priority,
        "electricity_generated": round(power_generated, 6),
        "electricity_required": round(power_required, 6),
        "electricity_used": round(power_used, 6),
        "life_support_power_fraction": round(power_fraction, 6),
        "oxygen_generated": round(oxygen_generated, 6),
        "oxygen_required": round(oxygen_required, 6),
        "oxygen_used": round(oxygen_used, 6),
        "oxygen_shortage": round(oxygen_shortage, 6),
        "health_changes": health_changes,
    }
    return result, report
