"""Sourced lunar period with explicit, fictional lighting and battery simplifications."""

from math import floor

from app.game.life_support import operating_plan
from app.game.models import Definitions, GameState, LightingModel, Station
from app.game.rules import DEFAULT_RULES, Rules


def daylight_fraction(station: Station, lighting: LightingModel, week: int) -> float:
    period = lighting.solar_day_earth_days
    offset = (station.longitude_deg - lighting.reference_longitude_deg) / 360 * period

    def illuminated_days(day):
        cycles = floor(day / period)
        phase = day - cycles * period
        return cycles * period / 2 + min(phase, period / 2)

    start = (week - 1) * 7 + offset
    return round(max(0, min(1, (illuminated_days(start + 7) - illuminated_days(start)) / 7)), 6)


def sunlight_week(station: Station, lighting: LightingModel, week: int, efficiency: float) -> dict:
    fraction = daylight_fraction(station, lighting, week)
    return {
        "week": week,
        "daylight_fraction": fraction,
        "daylight_days": round(7 * fraction, 4),
        "darkness_days": round(7 * (1 - fraction), 4),
        "phase": "daylight"
        if fraction >= 0.999999
        else "darkness"
        if fraction <= 0.000001
        else "mixed",
        "electricity_generated": round(station.energy_per_week * efficiency * fraction, 6),
    }


def energy_view(state: GameState, definitions: Definitions, rules: Rules = DEFAULT_RULES) -> dict:
    station = definitions.stations[state.station_id]
    duration = definitions.missions[state.mission_id].duration_weeks
    return {
        "battery_capacity": state.battery_capacity,
        "stored": state.resources["electricity"],
        "priority": state.power_priority,
        "life_support_required": operating_plan(state, station, rules)["power_required"],
        "solar_day_earth_days": definitions.lighting.solar_day_earth_days,
        "source_url": definitions.lighting.source_url,
        "assumption": definitions.lighting.assumption,
        "forecast": [
            sunlight_week(station, definitions.lighting, week, state.solar_efficiency)
            for week in range(state.current_week, duration + 1)
        ],
    }
