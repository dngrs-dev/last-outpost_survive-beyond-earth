"""ISS-inspired relationships; all rates and health thresholds are fictional."""

from app.game.models import Effects, EventChoice, GameState, Station
from app.game.rules import Rules

SOURCE = "https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/"

MAINTENANCE = [
    EventChoice(
        id="service_water_recovery",
        text="Service the water recovery processor",
        description=(
            "One repair kit and 2 power guarantee +30 water-recovery condition points. "
            "Recovered water comes from the wastewater stock "
            "and is available after this week's rations."
        ),
        costs={"repair_kits": 1, "electricity": 2},
        required_items={},
        requires_crew=True,
        role_bonus={},
        success_chance=1,
        success_effects=Effects(water_recovery_efficiency=0.3),
        failure_effects=Effects(),
    ),
    EventChoice(
        id="service_co2_scrubber",
        text="Service the carbon dioxide scrubber",
        description=(
            "One repair kit and 2 power guarantee +30 scrubber condition points. "
            "Removal still requires power; oxygen reserves do not remove CO2."
        ),
        costs={"repair_kits": 1, "electricity": 2},
        required_items={},
        requires_crew=True,
        role_bonus={},
        success_chance=1,
        success_effects=Effects(co2_efficiency=0.3),
        failure_effects=Effects(),
    ),
]
MAINTENANCE_IDS = frozenset(choice.id for choice in MAINTENANCE)


def operating_plan(state: GameState, station: Station, rules: Rules) -> dict:
    living = sum(c.alive for c in state.crew)
    oxygen_demand = living * rules.oxygen_per_week
    oxygen_target = min(
        station.oxygen_per_week * state.oxygen_efficiency,
        max(0, oxygen_demand * (1 + rules.oxygen_reserve_weeks) - state.resources["oxygen"]),
    )
    recoverable = min(
        state.resources["wastewater"],
        rules.water_recovery_capacity * state.water_recovery_efficiency,
    )
    potential_water = state.resources["water"] + recoverable * rules.water_recovery_yield
    if potential_water <= 0:
        oxygen_target = 0
    components = {
        "habitat": rules.base_electricity_use + rules.crew_electricity_use * living,
        "water_recovery": rules.water_recovery_power if recoverable > 0 else 0,
        "oxygen_generation": rules.oxygen_generation_power if oxygen_target > 0 else 0,
        "co2_removal": rules.co2_removal_power
        if (living or state.resources["co2"]) and state.co2_efficiency > 0
        else 0,
    }
    return {
        "power": components,
        "power_required": sum(components.values()),
        "oxygen_target": oxygen_target,
        "recoverable": recoverable,
    }


def process_systems(
    state: GameState,
    station: Station,
    rules: Rules,
    plan: dict,
    power_fraction: float,
    drinking_used: float,
) -> dict:
    # Only prior wastewater is processed; this week's captured water waits until next week.
    processed = plan["recoverable"] * power_fraction
    recovered = processed * rules.water_recovery_yield
    state.resources["wastewater"] = round(max(0, state.resources["wastewater"] - processed), 6)
    state.resources["water"] += recovered
    oxygen = min(
        plan["oxygen_target"] * power_fraction, state.resources["water"] / rules.water_per_oxygen
    )
    electrolyzed = oxygen * rules.water_per_oxygen
    state.resources["water"] = round(max(0, state.resources["water"] - electrolyzed), 6)
    captured = drinking_used * rules.wastewater_capture
    state.resources["wastewater"] = round(state.resources["wastewater"] + captured, 6)
    living = sum(c.alive for c in state.crew)
    produced = living * rules.co2_per_crew
    removed = min(
        state.resources["co2"] + produced,
        station.co2_removal_per_week * state.co2_efficiency * power_fraction,
    )
    state.resources["co2"] = round(max(0, state.resources["co2"] + produced - removed), 6)
    if processed > 0:
        state.water_recovery_efficiency = round(
            max(0, state.water_recovery_efficiency - rules.water_recovery_wear), 6
        )
    if plan["power"]["co2_removal"] > 0 and power_fraction > 0:
        state.co2_efficiency = round(max(0, state.co2_efficiency - rules.co2_wear), 6)
    return {
        "wastewater_processed": round(processed, 6),
        "water_recovered": round(recovered, 6),
        "water_for_oxygen": round(electrolyzed, 6),
        "wastewater_captured": round(captured, 6),
        "oxygen_generated": round(oxygen, 6),
        "co2_produced": produced,
        "co2_removed": round(removed, 6),
        "co2_remaining": state.resources["co2"],
        "power_components": plan["power"],
    }


def life_support_view(state: GameState, station: Station, rules: Rules) -> dict:
    return {
        "source_url": SOURCE,
        "water_recovery_condition": state.water_recovery_efficiency,
        "co2_condition": state.co2_efficiency,
        "wastewater": state.resources["wastewater"],
        "co2_burden": state.resources["co2"],
        "co2_warning_level": rules.co2_warning_burden,
        "recovery_capacity": rules.water_recovery_capacity,
        "recovery_yield": rules.water_recovery_yield,
        "water_per_oxygen": rules.water_per_oxygen,
        "oxygen_reserve_weeks": rules.oxygen_reserve_weeks,
        "water_recovery_wear": rules.water_recovery_wear,
        "co2_wear": rules.co2_wear,
        "co2_removal_capacity": station.co2_removal_per_week,
        "power_components": operating_plan(state, station, rules)["power"],
    }
