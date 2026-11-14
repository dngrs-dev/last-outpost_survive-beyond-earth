"""Seeded selection and a small, explicit vocabulary of event effects."""

import random
from dataclasses import asdict

from app.game.life_support import MAINTENANCE_IDS
from app.game.models import (
    CrewMember,
    Definitions,
    Effects,
    Event,
    EventChoice,
    GameError,
    GameState,
)
from app.game.projects import potential_project_credit
from app.game.research import RESEARCH_CHOICE_IDS, objective_rewards
from app.game.rules import Rules
from app.game.survival import change_health

QUIET_WEEK = Event(
    id="quiet_week",
    title="Routine Maintenance",
    description="No major incident this week. Review supplies and maintain the station.",
    weight=1,
    min_week=1,
    category="recovery",
    choices=[
        EventChoice(
            id="continue",
            text="Continue routine operations",
            description="Only the normal weekly resource costs apply.",
            costs={},
            required_items={},
            requires_crew=False,
            role_bonus={},
            success_chance=1,
            success_effects=Effects(),
            failure_effects=Effects(),
        )
    ],
)

MAINTENANCE_CHOICES = [
    EventChoice(
        id="clean_array",
        text="Clean the solar array",
        description=(
            "Guaranteed +20 percentage points solar condition. Uses a dust kit and EVA supplies; "
            "One-week crew assignment; incident response is separate."
        ),
        costs={"dust_kits": 1, "eva_batteries": 1, "oxygen": 2},
        required_items={},
        requires_crew=True,
        role_bonus={},
        success_chance=1,
        success_effects=Effects(solar_efficiency=0.2),
        failure_effects=Effects(),
    ),
    EventChoice(
        id="install_regulator",
        text="Install an oxygen regulator",
        description=(
            "Guaranteed +20 percentage points oxygen condition. Uses a regulator and 2 power; "
            "One-week crew assignment; incident response is separate."
        ),
        costs={"oxygen_regulators": 1, "electricity": 2},
        required_items={},
        requires_crew=True,
        role_bonus={},
        success_chance=1,
        success_effects=Effects(oxygen_efficiency=0.2),
        failure_effects=Effects(),
    ),
]


def seeded_rng(state: GameState, purpose: str) -> random.Random:
    # Separate streams ensure reads and failed requests never consume randomness.
    return random.Random(f"{state.random_seed}:{state.current_week}:{purpose}")


def eligible_events(state: GameState, definitions: Definitions, rules: Rules) -> list[Event]:
    recent = (
        state.used_event_ids[-rules.event_cooldown_weeks :] if rules.event_cooldown_weeks else []
    )
    return [
        definitions.events[event_id]
        for event_id in definitions.missions[state.mission_id].event_ids
        if definitions.events[event_id].min_week <= state.current_week and event_id not in recent
    ]


def select_event(state: GameState, definitions: Definitions, rules: Rules) -> Event:
    candidates = eligible_events(state, definitions, rules)
    if not candidates:
        return QUIET_WEEK
    # With the larger collection, see every eligible incident before repeating one.
    unseen = [event for event in candidates if event.id not in state.used_event_ids]
    if unseen:
        candidates = unseen
    return seeded_rng(state, "event").choices(
        candidates, weights=[event.weight for event in candidates], k=1
    )[0]


def get_event(state: GameState, definitions: Definitions) -> Event:
    if state.current_event_id == QUIET_WEEK.id:
        event = QUIET_WEEK
    elif state.current_event_id in definitions.events:
        event = definitions.events[state.current_event_id]
    else:
        raise GameError("There is no active event.", 409)
    return event


def apply_effects(state: GameState, effects: Effects, selected: CrewMember | None) -> dict:
    before_resources = state.resources.copy()
    before_health = {crew.id: crew.health for crew in state.crew}
    before_solar, before_oxygen = state.solar_efficiency, state.oxygen_efficiency
    before_water, before_co2 = state.water_recovery_efficiency, state.co2_efficiency
    for field in ("water_recovery_efficiency", "co2_efficiency"):
        setattr(
            state, field, round(max(0, min(1, getattr(state, field) + getattr(effects, field))), 6)
        )
    for resource, amount in effects.resources.items():
        state.resources[resource] = round(max(0.0, state.resources[resource] + amount), 6)
    state.resources["electricity"] = min(state.battery_capacity, state.resources["electricity"])
    state.solar_efficiency = round(min(1.0, max(0.0, before_solar + effects.solar_efficiency)), 6)
    state.oxygen_efficiency = round(
        min(1.0, max(0.0, before_oxygen + effects.oxygen_efficiency)), 6
    )
    targets = state.crew if effects.target == "all" else ([selected] if selected else [])
    for crew in targets:
        change_health(crew, effects.crew_health)
    return {
        "resources": {
            name: round(state.resources[name] - value, 6)
            for name, value in before_resources.items()
            if state.resources[name] != value
        },
        "solar_efficiency": round(state.solar_efficiency - before_solar, 6),
        "water_recovery_efficiency": round(state.water_recovery_efficiency - before_water, 6),
        "co2_efficiency": round(state.co2_efficiency - before_co2, 6),
        "oxygen_efficiency": round(state.oxygen_efficiency - before_oxygen, 6),
        "health_changes": [
            {"crew_id": crew.id, "before": before_health[crew.id], "after": crew.health}
            for crew in state.crew
            if before_health[crew.id] != crew.health
        ],
    }


def choice_reasons(
    state: GameState,
    choice: EventChoice,
    definitions: Definitions,
    selected: CrewMember | None,
) -> list[str]:
    reasons = []
    if sum(crew.alive for crew in state.crew) < choice.minimum_crew:
        reasons.append(f"Requires at least {choice.minimum_crew} living astronauts.")
    if choice.requires_crew:
        if selected is None or not selected.alive:
            reasons.append("Select a living astronaut.")
        elif choice.required_role and selected.role != choice.required_role:
            reasons.append(f"Requires a living {choice.required_role}.")
    elif selected is not None:
        reasons.append("This choice does not use a selected astronaut.")
    for resource, amount in choice.costs.items():
        if state.resources[resource] + 1e-6 < amount:
            reasons.append(
                f"Requires {amount:g} {resource}; available {state.resources[resource]:g}."
            )
    for item_id, quantity in choice.required_items.items():
        item = definitions.items[item_id]
        required = quantity * item.resource_amount
        if state.resources[item.resource] + 1e-6 < required:
            reasons.append(f"Requires {quantity} {item.name} (not consumed).")
    if choice.id == "clean_array" and state.solar_efficiency >= 1:
        reasons.append("The solar array is already at full condition.")
    if choice.id == "install_regulator" and state.oxygen_efficiency >= 1:
        reasons.append("The oxygen system is already at full condition.")
    for activity_id, field in (
        ("service_water_recovery", "water_recovery_efficiency"),
        ("service_co2_scrubber", "co2_efficiency"),
    ):
        if choice.id == activity_id and getattr(state, field) >= 1:
            reasons.append("This processor is already at full condition.")
    return reasons


def success_probability(
    state: GameState, choice: EventChoice, selected: CrewMember | None
) -> float:
    # Guaranteed choices stay guaranteed, regardless of a negative character trait.
    if choice.success_chance in (0, 1):
        return choice.success_chance
    bonus = choice.role_bonus.get(selected.role, 0) + selected.event_bonus if selected else 0
    if choice.id == "treat":
        # The selected astronaut is the patient, not necessarily the medical officer.
        bonus += max(
            (
                crew.action_bonuses.get("treat", 0)
                for crew in state.crew
                if crew.alive and crew.role == "medic"
            ),
            default=0,
        )
    elif selected:
        bonus += selected.action_bonuses.get(choice.id, 0)
    living_roles = {crew.role for crew in state.crew if crew.alive}
    bonus += sum(choice.crew_role_bonus.get(role, 0) for role in living_roles)
    return round(min(0.95, max(0.05, choice.success_chance + bonus)), 6)


def choice_views(
    state: GameState, definitions: Definitions, actions: list[EventChoice]
) -> list[dict]:
    choices = []
    for choice in actions:
        candidates = []
        if choice.requires_crew:
            for crew in state.crew:
                if crew.alive:
                    reasons = choice_reasons(state, choice, definitions, crew)
                    candidates.append(
                        {
                            "crew_id": crew.id,
                            "available": not reasons,
                            "unavailable_reasons": reasons,
                            "success_probability": success_probability(state, choice, crew),
                        }
                    )
        reasons = choice_reasons(state, choice, definitions, None)
        available = any(c["available"] for c in candidates) if choice.requires_crew else not reasons
        if choice.requires_crew and not available:
            reasons = list(dict.fromkeys(r for c in candidates for r in c["unavailable_reasons"]))
            if not candidates:
                reasons = ["Requires a living astronaut."]
        elif available:
            reasons = []
        choices.append(
            {
                **asdict(choice),
                "action_type": (
                    "research"
                    if choice.id in RESEARCH_CHOICE_IDS or choice.id.startswith("project:")
                    else "maintenance"
                    if choice in MAINTENANCE_CHOICES or choice.id in MAINTENANCE_IDS
                    else "event"
                ),
                "objective_rewards": objective_rewards(
                    state, definitions, potential_project_credit(state, choice.id)
                )
                if potential_project_credit(state, choice.id)
                else [],
                "available": available,
                "unavailable_reasons": reasons,
                "eligible_crew": candidates,
                "success_probability": (
                    None if choice.requires_crew else success_probability(state, choice, None)
                ),
            }
        )
    return choices


def event_view(state: GameState, definitions: Definitions) -> dict | None:
    if state.status != "running":
        return None
    event = get_event(state, definitions)
    return {
        "id": event.id,
        "title": event.title,
        "description": event.description,
        "category": event.category,
        "science_context": event.science_context,
        "source_url": event.source_url,
        "on_start": asdict(event.on_start),
        "choices": choice_views(state, definitions, event.choices),
    }


def resolve_choice(
    state: GameState,
    choice: EventChoice,
    selected: CrewMember | None,
    purpose: str | None = None,
    charge_costs: bool = True,
) -> dict:
    """Mutate a validated working copy only. Costs apply on either outcome."""
    probability = success_probability(state, choice, selected)
    succeeded = (
        seeded_rng(state, purpose or f"outcome:{state.current_event_id}").random() < probability
    )
    if charge_costs:
        for resource, amount in choice.costs.items():
            state.resources[resource] = max(0.0, round(state.resources[resource] - amount, 6))
    changes = apply_effects(
        state, choice.success_effects if succeeded else choice.failure_effects, selected
    )
    return {
        "event_id": state.current_event_id,
        "choice_id": choice.id,
        "choice_text": choice.text,
        "selected_crew_id": selected.id if selected else None,
        "success": succeeded,
        "success_probability": probability,
        "costs": choice.costs.copy(),
        "effects": changes,
    }
