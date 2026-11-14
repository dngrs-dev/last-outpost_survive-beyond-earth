"""Authoritative mission setup and atomic weekly operations."""

import secrets
from copy import deepcopy
from dataclasses import asdict
from math import isfinite

from app.game.events import (
    apply_effects,
    choice_reasons,
    event_view,
    get_event,
    resolve_choice,
    select_event,
)
from app.game.models import Definitions, GameError, GameState, Ration
from app.game.rules import DEFAULT_RULES, RATION_MULTIPLIERS, Rules
from app.game.survival import permits_depletion, ration_cost, ration_requirements, simulate_week


class GameEngine:
    def __init__(self, definitions: Definitions, rules: Rules = DEFAULT_RULES):
        if not 1 <= rules.max_crew <= rules.max_supported_crew:
            raise ValueError("Crew limit must be within the supported capacity.")
        self.definitions = definitions
        self.rules = rules

    def calculate_cargo(self, cargo: dict[str, int]) -> dict[str, float]:
        mass, volume = 0.0, 0.0
        for item_id, quantity in cargo.items():
            if item_id not in self.definitions.items:
                raise GameError(f"Unknown cargo item: {item_id}.")
            if type(quantity) is not int or not 0 <= quantity <= 1_000_000:
                raise GameError("Cargo quantities must be whole numbers between 0 and 1000000.")
            item = self.definitions.items[item_id]
            mass += item.weight_kg * quantity
            volume += item.volume_l * quantity
        if not isfinite(mass) or mass > self.rules.max_cargo_mass_kg:
            raise GameError(f"Cargo exceeds mass limit of {self.rules.max_cargo_mass_kg:g} kg.")
        if not isfinite(volume) or volume > self.rules.max_cargo_volume_l:
            raise GameError(
                f"Cargo exceeds volume limit of {self.rules.max_cargo_volume_l:g} litres."
            )
        return {"mass_kg": round(mass, 6), "volume_l": round(volume, 6)}

    def create_game(
        self,
        station_id: str,
        crew_ids: list[str],
        cargo: dict[str, int],
        random_seed: int | None = None,
    ) -> GameState:
        if station_id not in self.definitions.stations:
            raise GameError(f"Unknown station: {station_id}.", 404)
        if not 1 <= len(crew_ids) <= self.rules.max_crew:
            raise GameError(f"Select between 1 and {self.rules.max_crew} astronauts.")
        if len(set(crew_ids)) != len(crew_ids):
            raise GameError("Duplicate astronaut IDs are not allowed.")
        if any(crew_id not in self.definitions.crew for crew_id in crew_ids):
            raise GameError("Unknown astronaut in crew selection.")
        self.calculate_cargo(cargo)
        station = self.definitions.stations[station_id]
        mission = self.definitions.missions[station.mission_id]
        if len(crew_ids) < mission.minimum_survivors:
            raise GameError(
                f"This mission requires at least {mission.minimum_survivors} astronauts."
            )
        resources = station.starting_resources.copy()
        for item_id, quantity in cargo.items():
            item = self.definitions.items[item_id]
            resources[item.resource] += item.resource_amount * quantity
        state = GameState(
            station_id=station.id,
            mission_id=station.mission_id,
            current_week=1,
            crew=[deepcopy(self.definitions.crew[crew_id]) for crew_id in crew_ids],
            resources=resources,
            solar_efficiency=station.solar_efficiency,
            oxygen_efficiency=station.oxygen_efficiency,
            current_event_id=None,
            used_event_ids=[],
            flags={},
            history=[],
            status="running",
            random_seed=random_seed if random_seed is not None else secrets.randbits(63),
            initial_crew_size=len(crew_ids),
        )
        self.prepare_event(state)
        self.check_game_over(state)
        return state

    def prepare_event(self, state: GameState) -> dict:
        event = select_event(state, self.definitions, self.rules)
        state.current_event_id = event.id
        changes = apply_effects(state, event.on_start, None)
        return {"event_id": event.id, "title": event.title, "effects": changes}

    def advance_week(
        self,
        original: GameState,
        expected_week: int,
        rations: dict[str, Ration],
        event_choice_id: str,
        selected_crew_id: str | None = None,
    ) -> tuple[GameState, dict]:
        if original.status != "running":
            raise GameError("The mission has already finished.", 409)
        if expected_week != original.current_week:
            raise GameError(f"Outdated turn: current week is {original.current_week}.", 409)
        costs = ration_requirements(original, rations, self.rules)
        event = get_event(original, self.definitions)
        choice = next((choice for choice in event.choices if choice.id == event_choice_id), None)
        if choice is None:
            raise GameError("Unknown choice for the current event.")
        selected = next((crew for crew in original.crew if crew.id == selected_crew_id), None)
        if selected_crew_id is not None and (selected is None or not selected.alive):
            raise GameError("Selected astronaut must exist and be alive.")
        reasons = choice_reasons(original, choice, self.definitions, selected)
        if reasons:
            raise GameError(" ".join(reasons))
        for resource in original.resources:
            required = costs.get(resource, 0) + choice.costs.get(resource, 0)
            if original.resources[resource] + 1e-6 < required:
                if resource not in ("food", "water") or not permits_depletion(rations, resource):
                    raise GameError(
                        f"Insufficient {resource} for rations and event costs combined."
                    )

        state = deepcopy(original)
        selected = next((crew for crew in state.crew if crew.id == selected_crew_id), None)
        event_result = resolve_choice(state, choice, selected)
        state, survival = simulate_week(
            state, self.definitions.stations[state.station_id], rations, self.rules
        )
        state.weeks_completed += 1
        state.used_event_ids.append(event.id)
        report = {
            "week": state.current_week,
            "event": event_result,
            "rations": {crew_id: asdict(ration) for crew_id, ration in rations.items()},
            "survival": survival,
            "resource_changes": {
                name: round(value - original.resources[name], 6)
                for name, value in state.resources.items()
            },
            "deaths": [
                crew.id
                for crew, before in zip(state.crew, original.crew, strict=True)
                if before.alive and not crew.alive
            ],
        }
        self.check_game_over(state)
        if state.status == "running":
            state.current_week += 1
            report["next_event"] = self.prepare_event(state)
            self.check_game_over(state)
        report["ending"] = state.ending
        state.history.append(deepcopy(report))
        return state, report

    def check_game_over(self, state: GameState) -> None:
        survivors = [crew for crew in state.crew if crew.alive]
        if not survivors:
            state.status, state.ending = "failed", "mission_failure"
            state.flags["failure_reason"] = "All astronauts have died."
        elif (
            state.solar_efficiency == 0
            and state.oxygen_efficiency == 0
            and state.resources["oxygen"] <= 0
            and state.resources["electricity"] <= 0
        ):
            state.status, state.ending = "failed", "mission_failure"
            state.flags["failure_reason"] = (
                "Station uninhabitable: both life-support systems are destroyed, "
                "with no oxygen or electricity reserves."
            )
        elif state.weeks_completed >= self.definitions.missions[state.mission_id].duration_weeks:
            normal = ration_requirements(
                state, {crew.id: Ration("normal", "normal") for crew in survivors}, self.rules
            )
            efficiency = min(state.solar_efficiency, state.oxygen_efficiency)
            reserve = min(
                state.resources["food"] / normal["food"],
                state.resources["water"] / normal["water"],
                state.resources["oxygen"] / (len(survivors) * self.rules.oxygen_per_week),
            )
            mission = self.definitions.missions[state.mission_id]
            if (
                len(survivors) == state.initial_crew_size
                and all(crew.health >= self.rules.perfect_health for crew in survivors)
                and efficiency >= self.rules.perfect_efficiency
                and reserve >= self.rules.perfect_reserve_weeks
                and state.resources["electricity"] >= self.rules.base_electricity_use
                and all(state.resources[name] >= 1 for name in ("medicine", "repair_kits"))
            ):
                state.ending = "perfect_handover"
            elif (
                len(survivors) >= mission.minimum_survivors
                and efficiency >= self.rules.operational_efficiency
                and reserve >= self.rules.emergency_reserve_weeks
            ):
                state.ending = "successful_handover"
            else:
                state.ending = "emergency_handover"
            state.status = "completed"
        if state.status != "running":
            state.current_event_id = None

    def catalog(self) -> dict:
        return {
            "stations": [asdict(item) for item in self.definitions.stations.values()],
            "missions": [asdict(item) for item in self.definitions.missions.values()],
            "crew": [asdict(item) for item in self.definitions.crew.values()],
            "items": [asdict(item) for item in self.definitions.items.values()],
            "limits": {
                "min_crew": 1,
                "max_crew": self.rules.max_crew,
                "max_cargo_mass_kg": self.rules.max_cargo_mass_kg,
                "max_cargo_volume_l": self.rules.max_cargo_volume_l,
            },
            "ration_multipliers": RATION_MULTIPLIERS.copy(),
            "balance_note": "All values are fictional gameplay units, not NASA measurements.",
        }

    def state_view(self, state: GameState) -> dict:
        mission = self.definitions.missions[state.mission_id]
        crew_views = []
        for crew in state.crew:
            crew_views.append(
                {
                    **asdict(crew),
                    "alive": crew.alive,
                    "ration_options": (
                        {
                            level: ration_cost(crew, Ration(level, level), self.rules)
                            for level in RATION_MULTIPLIERS
                        }
                        if crew.alive
                        else {}
                    ),
                }
            )
        minimum_rations = ration_requirements(
            state,
            {crew.id: Ration("emergency", "emergency") for crew in state.crew if crew.alive},
            self.rules,
        )
        return {
            **asdict(state),
            "crew": crew_views,
            "station_name": self.definitions.stations[state.station_id].name,
            "difficulty": self.definitions.stations[state.station_id].difficulty,
            "difficulty_rank": self.definitions.stations[state.station_id].difficulty_rank,
            "mission_name": mission.name,
            "duration_weeks": mission.duration_weeks,
            "minimum_survivors": mission.minimum_survivors,
            "weeks_remaining": max(0, mission.duration_weeks - state.weeks_completed),
            "mission_days": {
                "start": (state.current_week - 1) * 7 + 1,
                "end": state.current_week * 7,
            },
            "current_event": event_view(state, self.definitions),
            "emergency_ration_requirements": minimum_rations,
            "depleted_provisions": [
                name for name, amount in minimum_rations.items() if state.resources[name] < amount
            ],
            "results": (
                {
                    "ending": state.ending,
                    "weeks_survived": state.weeks_completed,
                    "initial_crew_size": state.initial_crew_size,
                    "surviving_crew_ids": [crew.id for crew in state.crew if crew.alive],
                    "deceased_crew_ids": [crew.id for crew in state.crew if not crew.alive],
                    "failure_reason": state.flags.get("failure_reason"),
                }
                if state.status != "running"
                else None
            ),
        }
