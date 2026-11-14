"""Fictional deprivation and recovery model, not clinical survival predictions."""

from math import ceil

from app.game.models import CrewMember, Effects, EventChoice
from app.game.rules import RATION_MULTIPLIERS

SOURCE = "https://www.nasa.gov/reference/risk-of-inadequate-food-and-nutrition/"
REST = EventChoice(
    id="crew_rest",
    text="Rest and recuperate",
    description=(
        "One week without active work. Adequate actual food and water improve deficit recovery "
        "and allow up to 5 condition points of recovery in safe air. Rest creates no supplies "
        "and cannot compensate for continued deprivation."
    ),
    costs={},
    required_items={},
    requires_crew=True,
    role_bonus={},
    success_chance=1,
    success_effects=Effects(),
    failure_effects=Effects(),
    workload="rest",
)


def next_deficit(before: float, received: float, hydration: bool, resting=False) -> float:
    if received < 1 - 1e-6:
        return round(before + 1 - received, 6)
    recovery = (0.5 if hydration else 0.25) + ((0.25 if hydration else 0.15) if resting else 0)
    return round(max(0, before - recovery), 6)


def deprivation_damage(deficit: float, received: float, hydration: bool) -> int:
    if received >= 1 - 1e-6:
        return 0  # resolving deprivation does not continue dealing starvation damage
    threshold, scale, maximum = (0.25, 80, 80) if hydration else (1, 6, 20)
    return min(maximum, ceil(max(0, (deficit - threshold) * scale - 1e-6)))


def capacity_reasons(crew: CrewMember, workload: str) -> list[str]:
    if not crew.alive:
        return ["Requires a living astronaut."]
    if workload in {"care", "rest"}:
        return []
    if crew.health < 25 or crew.nutrition_deficit >= 2.5 or crew.hydration_deficit >= 1:
        return ["Critical condition: active work unavailable; restore provisions and rest."]
    if workload in {"eva", "strenuous"} and (
        crew.health < 50 or crew.nutrition_deficit >= 1 or crew.hydration_deficit >= 0.5
    ):
        return ["Condition permits light duties only; EVA and strenuous work are unavailable."]
    return []


def performance_penalty(crew: CrewMember) -> float:
    return round(
        min(
            0.35,
            max(0, crew.nutrition_deficit - 0.25) * 0.05
            + max(0, crew.hydration_deficit - 0.1) * 0.15
            + max(0, 70 - crew.health) * 0.003,
        ),
        6,
    )


def condition_view(crew: CrewMember) -> dict:
    if not crew.alive:
        status = "deceased"
    elif capacity_reasons(crew, "light"):
        status = "critical"
    elif capacity_reasons(crew, "eva"):
        status = "serious"
    elif crew.health < 80 or crew.nutrition_deficit >= 0.25 or crew.hydration_deficit >= 0.1:
        status = "impaired"
    else:
        status = "fit"
    return {
        "status": status,
        "nutrition_status": "adequate"
        if crew.nutrition_deficit < 0.25
        else "underfed"
        if crew.nutrition_deficit < 1
        else "depleted",
        "hydration_status": "adequate"
        if crew.hydration_deficit < 0.1
        else "thirsty"
        if crew.hydration_deficit < 0.5
        else "dehydrated",
        "can_work": not capacity_reasons(crew, "light"),
        "can_do_eva": not capacity_reasons(crew, "eva"),
        "performance_penalty": performance_penalty(crew) if crew.alive else 0,
        "restrictions": capacity_reasons(crew, "light") or capacity_reasons(crew, "eva"),
        "nutrition_recovery_weeks": ceil(crew.nutrition_deficit / 0.25),
        "hydration_recovery_weeks": ceil(crew.hydration_deficit / 0.5),
        "source_url": SOURCE,
    }


def ration_outlook(crew: CrewMember) -> dict:
    return {
        level: {
            "nutrition_deficit": next_deficit(crew.nutrition_deficit, fraction, False),
            "hydration_deficit": next_deficit(crew.hydration_deficit, fraction, True),
            "food_damage": deprivation_damage(
                next_deficit(crew.nutrition_deficit, fraction, False), fraction, False
            ),
            "water_damage": deprivation_damage(
                next_deficit(crew.hydration_deficit, fraction, True), fraction, True
            ),
        }
        for level, fraction in RATION_MULTIPLIERS.items()
    }


def resolve_provisions(
    crew: CrewMember, food: float, water: float, *, safe: bool, working: bool, resting: bool
) -> dict:
    before_food, before_water = crew.nutrition_deficit, crew.hydration_deficit
    crew.nutrition_deficit = next_deficit(before_food, food, False, resting)
    crew.hydration_deficit = next_deficit(before_water, water, True, resting)
    crew.food_shortage_weeks = crew.food_shortage_weeks + 1 if food < 1 - 1e-6 else 0
    crew.water_shortage_weeks = crew.water_shortage_weeks + 1 if water < 1 - 1e-6 else 0
    food_damage = deprivation_damage(crew.nutrition_deficit, food, False)
    water_damage = deprivation_damage(crew.hydration_deficit, water, True)
    recovered = 0
    if crew.alive and food >= 1 - 1e-6 and water >= 1 - 1e-6 and safe and not working:
        recovered = min(100 - crew.health, 5 if resting else 2)
    return {
        "food_received_fraction": round(food, 6),
        "water_received_fraction": round(water, 6),
        "nutrition_before": before_food,
        "nutrition_after": crew.nutrition_deficit,
        "hydration_before": before_water,
        "hydration_after": crew.hydration_deficit,
        "food_penalty": food_damage,
        "water_penalty": water_damage,
        "recovery": recovered,
        "worked": working,
        "rested": resting,
    }
