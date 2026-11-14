"""Authoritative mission setup and atomic weekly operations."""

import secrets
from copy import deepcopy
from dataclasses import asdict
from math import isfinite

from app.game.energy import energy_view, sunlight_week
from app.game.events import (
    MAINTENANCE_CHOICES,
    apply_effects,
    choice_reasons,
    choice_views,
    event_view,
    get_event,
    resolve_choice,
    select_event,
)
from app.game.health import REST, capacity_reasons, condition_view, ration_outlook
from app.game.life_support import MAINTENANCE, life_support_view
from app.game.medicine import MEDICAL_CHOICES, MEDICAL_IDS, medical_views, provide_care
from app.game.models import Definitions, GameError, GameState, Ration
from app.game.projects import (
    apply_project_orders,
    clear_unavailable_workers,
    finish_manual_work,
    project_choices,
    project_views,
)
from app.game.research import objective_rewards, research_choices, science_view
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
            if quantity > item.max_quantity:
                raise GameError(f"At most {item.max_quantity} {item.name} may be packed.")
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
        resources["electricity"] = min(station.battery_capacity, resources["electricity"])
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
            battery_capacity=station.battery_capacity,
            water_recovery_efficiency=station.water_recovery_efficiency,
            co2_efficiency=station.co2_efficiency,
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
        support_crew_ids: list[str] | None = None,
        assignments: list[dict] | None = None,
        project_orders: list[dict] | None = None,
        power_priority: str | None = None,
    ) -> tuple[GameState, dict]:
        if original.status != "running":
            raise GameError("The mission has already finished.", 409)
        if expected_week != original.current_week:
            raise GameError(f"Outdated turn: current week is {original.current_week}.", 409)
        if power_priority is not None and power_priority not in {"life_support", "research"}:
            raise GameError("Unknown power priority.")
        planning = deepcopy(original)
        if power_priority is not None:
            planning.power_priority = power_priority
        apply_project_orders(planning, project_orders or [])
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
        support = support_crew_ids or []
        orders = assignments or []
        required_support = max(0, choice.minimum_crew - 1) if choice.requires_crew else 0
        if len(support) != required_support:
            raise GameError(f"This response requires {required_support} support astronauts.")
        for crew_id in support:
            supporter = next((c for c in original.crew if c.id == crew_id and c.alive), None)
            if supporter and capacity_reasons(supporter, choice.workload):
                raise GameError(
                    "Support crew: " + " ".join(capacity_reasons(supporter, choice.workload))
                )
        occupied = ([selected_crew_id] if choice.requires_crew else []) + support
        living_ids = {crew.id for crew in original.crew if crew.alive}
        activities = {activity.id: activity for activity in self.assignment_choices(planning)}
        planned = []
        patient_orders = {}
        for order in orders:
            actor = next((crew for crew in original.crew if crew.id == order["crew_id"]), None)
            activity = activities.get(order["activity_id"])
            if activity is None:
                raise GameError("Unknown or completed assignment activity.")
            reasons = choice_reasons(original, activity, self.definitions, actor)
            if reasons:
                raise GameError(" ".join(reasons))
            if activity.id in MEDICAL_IDS:
                patient = next(
                    (c for c in original.crew if c.id == order.get("patient_id") and c.alive), None
                )
                kind = order.get("condition_id")
                if not patient or not any(c.kind == kind for c in patient.medical_conditions):
                    raise GameError("Select a living patient and their active medical condition.")
                if (activity.id == "self_care") != (patient.id == actor.id):
                    raise GameError(
                        "Self-care requires the worker as patient; "
                        "medical care needs a different patient."
                    )
                patient_orders[actor.id] = (patient.id, kind)
                if patient.id != actor.id:
                    occupied.append(patient.id)
            elif order.get("patient_id") is not None or order.get("condition_id") is not None:
                raise GameError("Only medical assignments accept patient and condition fields.")
            occupied.append(order["crew_id"])
            planned.append((activity, order["crew_id"]))
        project_work = [
            a.id for a, _ in planned if a.id == "research_seismic" or a.id.startswith("project:")
        ]
        if len(set(project_work)) != len(project_work):
            raise GameError("Only one worker may advance each project per week.")
        paused = {
            o["project_id"] for o in project_orders or [] if o["action"] in {"pause", "interrupt"}
        }
        if any(a.removeprefix("project:") in paused for a in project_work):
            raise GameError("Cannot assign work to a project paused or interrupted this week.")
        if any(crew_id not in living_ids for crew_id in occupied):
            raise GameError("Only living astronauts can be assigned.")
        if len(set(occupied)) != len(occupied):
            raise GameError("An astronaut cannot be booked for more than one job.")
        action_costs = choice.costs.copy()
        for activity, _ in planned:
            for resource, amount in activity.costs.items():
                action_costs[resource] = action_costs.get(resource, 0) + amount
        for resource in original.resources:
            required = costs.get(resource, 0) + action_costs.get(resource, 0)
            if original.resources[resource] + 1e-6 < required:
                if (
                    original.resources[resource] < action_costs.get(resource, 0)
                    or resource not in ("food", "water")
                    or not permits_depletion(rations, resource)
                ):
                    raise GameError(
                        f"Insufficient {resource} for rations and all weekly actions combined."
                    )

        state = planning
        project_log = [
            {
                "project_id": order["project_id"],
                "message": next(p.message for p in state.projects if p.id == order["project_id"]),
                "electricity_used": 0,
            }
            for order in project_orders or []
        ]
        # Reserve every action's base cost before any outcome can consume supplies.
        for resource, amount in action_costs.items():
            state.resources[resource] = max(0.0, round(state.resources[resource] - amount, 6))
        selected = next((crew for crew in state.crew if crew.id == selected_crew_id), None)
        event_result = resolve_choice(state, choice, selected, charge_costs=False)
        event_result["support_crew_ids"] = support.copy()
        gains = (
            objective_rewards(state, self.definitions, choice.id) if event_result["success"] else []
        )
        event_result["objective_progress"] = gains.copy()
        assignment_results = []
        # Canonical crew order makes results independent of request-list ordering.
        planned.sort(
            key=lambda plan: (
                plan[0].id not in MEDICAL_IDS,
                next(i for i, crew in enumerate(state.crew) if crew.id == plan[1]),
            )
        )
        for activity, crew_id in planned:
            actor = next(crew for crew in state.crew if crew.id == crew_id)
            patient_id, condition_id = patient_orders.get(crew_id, (None, None))
            patient = next((c for c in state.crew if c.id == patient_id), None)
            restrictions = capacity_reasons(actor, activity.workload)
            if patient and not patient.alive:
                restrictions.append("Patient died before care began; reserved supplies returned.")
            if restrictions:
                for resource, amount in activity.costs.items():
                    state.resources[resource] += amount
                assignment_results.append(
                    {
                        "crew_id": crew_id,
                        "activity_id": activity.id,
                        "patient_id": patient_id,
                        "condition_id": condition_id,
                        "status": "cancelled",
                        "outcome": None,
                        "reason": (
                            "Astronaut died before work began; reserved supplies returned."
                            if not actor.alive
                            else "Patient died before care began; reserved supplies returned."
                            if patient and not patient.alive
                            else "Astronaut became unfit before work began; reserved supplies "
                            "returned. " + " ".join(restrictions)
                        ),
                    }
                )
                continue
            outcome = resolve_choice(
                state,
                activity,
                actor,
                purpose=f"outcome:assignment:{crew_id}:{activity.id}",
                charge_costs=False,
            )
            if patient:
                points = (
                    2
                    if activity.id == "medical_care"
                    and (actor.role == "medic" or state.resources["diagnostic_tools"] > 0)
                    else 1
                )
                change = provide_care(patient, state.current_week, points, condition_id)
                if change:
                    outcome["effects"]["medical_changes"].append(change)
            project_activity = activity.id == "research_seismic" or activity.id.startswith(
                "project:"
            )
            completed_project = finish_manual_work(state, activity.id, crew_id, outcome["success"])
            credit = (
                objective_rewards(
                    state,
                    self.definitions,
                    completed_project if project_activity else activity.id,
                    gains,
                )
                if outcome["success"] and (not project_activity or completed_project)
                else []
            )
            if project_activity:
                project = (
                    state.projects[-1]
                    if activity.id == "research_seismic"
                    else next(
                        p for p in state.projects if p.id == activity.id.removeprefix("project:")
                    )
                )
                project_log.append(
                    {"project_id": project.id, "message": project.message, "electricity_used": 0}
                )
            outcome["objective_progress"] = credit
            outcome["support_crew_ids"] = []
            gains.extend(credit)
            assignment_results.append(
                {
                    "crew_id": crew_id,
                    "activity_id": activity.id,
                    "patient_id": patient_id,
                    "condition_id": condition_id,
                    "status": "completed",
                    "outcome": outcome,
                    "reason": None,
                }
            )
        resting = {
            r["crew_id"]
            for r in assignment_results
            if r["activity_id"] == REST.id and r["status"] == "completed"
        }
        resting.update(
            r["patient_id"]
            for r in assignment_results
            if r["patient_id"] and r["status"] == "completed"
        )
        if choice.workload == "care" and selected_crew_id:
            resting.add(selected_crew_id)
        working = (
            set(([selected_crew_id] if choice.requires_crew else []) + support)
            if choice.workload not in {"care", "rest"}
            else set()
        )
        cancelled = {r["crew_id"] for r in assignment_results if r["status"] == "cancelled"}
        working.update(
            crew_id
            for activity, crew_id in planned
            if crew_id not in cancelled and activity.workload not in {"care", "rest"}
        )
        state, survival = simulate_week(
            state,
            self.definitions.stations[state.station_id],
            rations,
            self.rules,
            lighting=self.definitions.lighting,
            original=original,
            project_log=project_log,
            working_crew=working,
            resting_crew=resting,
        )
        clear_unavailable_workers(state, project_log)
        state.weeks_completed += 1
        state.used_event_ids.append(event.id)
        report = {
            "week": state.current_week,
            "event": event_result,
            "assignments": assignment_results,
            "project_updates": project_log,
            "science_gains": gains,
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
            clear_unavailable_workers(state, project_log)
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
                "Station uninhabitable: solar power and oxygen generation are destroyed, "
                "with no oxygen or electricity reserves."
            )
        elif state.weeks_completed >= self.definitions.missions[state.mission_id].duration_weeks:
            normal = ration_requirements(
                state, {crew.id: Ration("normal", "normal") for crew in survivors}, self.rules
            )
            efficiency = min(
                state.solar_efficiency,
                state.oxygen_efficiency,
                state.water_recovery_efficiency,
                state.co2_efficiency,
            )
            reserve = min(
                state.resources["food"] / normal["food"],
                state.resources["water"] / normal["water"],
                state.resources["oxygen"] / (len(survivors) * self.rules.oxygen_per_week),
            )
            mission = self.definitions.missions[state.mission_id]
            breathable = state.resources["co2"] <= self.rules.co2_warning_burden
            if (
                breathable
                and len(survivors) == state.initial_crew_size
                and all(
                    crew.health >= self.rules.perfect_health
                    and not crew.medical_conditions
                    and crew.nutrition_deficit < 0.25
                    and crew.hydration_deficit < 0.1
                    for crew in survivors
                )
                and efficiency >= self.rules.perfect_efficiency
                and reserve >= self.rules.perfect_reserve_weeks
                and state.resources["electricity"] >= self.rules.perfect_electricity_reserve
                and all(state.resources[name] >= 1 for name in ("medicine", "repair_kits"))
            ):
                state.ending = "perfect_handover"
            elif (
                breathable
                and len(survivors) >= mission.minimum_survivors
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
            "lighting": asdict(self.definitions.lighting),
            "sunlight_forecasts": {
                station.id: [
                    sunlight_week(
                        station, self.definitions.lighting, week, station.solar_efficiency
                    )
                    for week in range(
                        1, self.definitions.missions[station.mission_id].duration_weeks + 1
                    )
                ]
                for station in self.definitions.stations.values()
            },
            "crew": [
                {
                    **asdict(item),
                    "normal_ration_cost": ration_cost(item, Ration("normal", "normal"), self.rules),
                }
                for item in self.definitions.crew.values()
            ],
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

    def assignment_choices(self, state: GameState):
        return [
            REST,
            *(MEDICAL_CHOICES if any(c.alive and c.medical_conditions for c in state.crew) else []),
            *MAINTENANCE_CHOICES,
            *MAINTENANCE,
            *research_choices(state, self.definitions),
            *project_choices(state),
        ]

    def state_view(self, state: GameState) -> dict:
        mission = self.definitions.missions[state.mission_id]
        science = science_view(state, self.definitions)
        crew_views = []
        for crew in state.crew:
            crew_views.append(
                {
                    **asdict(crew),
                    "alive": crew.alive,
                    "condition": condition_view(crew),
                    "medical_conditions": medical_views(crew),
                    "ration_outlook": ration_outlook(crew) if crew.alive else {},
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
            **{key: value for key, value in asdict(state).items() if key != "projects"},
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
            "research_projects": project_views(state, self.definitions),
            "life_support": life_support_view(
                state, self.definitions.stations[state.station_id], self.rules
            ),
            "energy": energy_view(state, self.definitions, self.rules),
            "current_event": event_view(state, self.definitions),
            "assignment_options": choice_views(
                state, self.definitions, self.assignment_choices(state)
            )
            if state.status == "running"
            else [],
            "science": science,
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
                    "science": science,
                }
                if state.status != "running"
                else None
            ),
        }
