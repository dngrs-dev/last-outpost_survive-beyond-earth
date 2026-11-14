"""Fictional balancing values, not engineering or medical measurements."""

from dataclasses import dataclass
from typing import Literal

RationLevel = Literal["normal", "reduced", "emergency"]
RESOURCE_NAMES = frozenset(
    {
        "food",
        "water",
        "oxygen",
        "electricity",
        "medicine",
        "repair_kits",
        "eva_batteries",
        "dust_kits",
        "oxygen_regulators",
        "diagnostic_tools",
        "sealant_packs",
        "scientific_tools",
        "research_data",
        "wastewater",
        "co2",
    }
)
ROLES = frozenset({"engineer", "medic", "scientist", "technician"})
RATION_MULTIPLIERS = {"normal": 1.0, "reduced": 0.7, "emergency": 0.4}
FOOD_PENALTIES = {"normal": 0, "reduced": 2, "emergency": 6}
WATER_PENALTIES = {"normal": 0, "reduced": 4, "emergency": 10}


@dataclass(frozen=True)
class Rules:
    max_crew: int = 4  # Can be raised to eight when the roster expands.
    max_supported_crew: int = 8
    max_cargo_mass_kg: float = 180.0
    max_cargo_volume_l: float = 240.0
    food_per_week: float = 1.0
    water_per_week: float = 2.0
    oxygen_per_week: float = 3.0
    base_electricity_use: float = 4.0
    crew_electricity_use: float = 2.0
    water_recovery_power: float = 2
    oxygen_generation_power: float = 4
    co2_removal_power: float = 2
    water_recovery_capacity: float = 4
    water_recovery_yield: float = 0.8
    wastewater_capture: float = 0.8
    water_per_oxygen: float = 0.1
    oxygen_reserve_weeks: float = 2
    co2_per_crew: float = 1
    co2_warning_burden: float = 4
    co2_penalty_per_excess: float = 8
    co2_max_penalty: int = 30
    water_recovery_wear: float = 0.02
    co2_wear: float = 0.015
    oxygen_shortage_penalty: int = 60
    food_depletion_penalty: int = 20
    water_depletion_penalty: int = 35
    repeated_ration_penalty: int = 2
    max_ration_streak_penalty: int = 12
    event_cooldown_weeks: int = 2
    perfect_electricity_reserve: float = 12
    perfect_health: int = 70
    perfect_efficiency: float = 0.8
    operational_efficiency: float = 0.4
    perfect_reserve_weeks: float = 2.0
    emergency_reserve_weeks: float = 0.5


DEFAULT_RULES = Rules()
