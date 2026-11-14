"""Seeded selection and a small, explicit vocabulary of event effects."""

import random
from dataclasses import asdict

from app.game.models import (
    CrewMember,
    Definitions,
    Effects,
    Event,
    EventChoice,
    GameError,
    GameState,
)
from app.game.rules import Rules
from app.game.survival import change_health

QUIET_WEEK = Event(
    id="quiet_week",
    title="Routine Maintenance",
    description="No major incident this week. Review supplies and maintain the station.",
    weight=1,
    min_week=1,
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
    return seeded_rng(state, "event").choices(
        candidates, weights=[event.weight for event in candidates], k=1
    )[0]


def get_event(state: GameState, definitions: Definitions) -> Event:
    if state.current_event_id == QUIET_WEEK.id:
        return QUIET_WEEK
    if state.current_event_id not in definitions.events:
        raise GameError("There is no active event.", 409)
    return definitions.events[state.current_event_id]


def apply_effects(state: GameState, effects: Effects, selected: CrewMember | None) -> dict:
    before_resources = state.resources.copy()
    before_health = {crew.id: crew.health for crew in state.crew}
    before_solar, before_oxygen = state.solar_efficiency, state.oxygen_efficiency
    for resource, amount in effects.resources.items():
        state.resources[resource] = round(max(0.0, state.resources[resource] + amount), 6)
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
    return reasons


def success_probability(
    state: GameState, choice: EventChoice, selected: CrewMember | None
) -> float:
    # Guaranteed choices stay guaranteed, regardless of a negative character trait.
    if choice.success_chance in (0, 1):
        return choice.success_chance
    bonus = choice.role_bonus.get(selected.role, 0) + selected.event_bonus if selected else 0
    living_roles = {crew.role for crew in state.crew if crew.alive}
    bonus += sum(choice.crew_role_bonus.get(role, 0) for role in living_roles)
    return round(min(0.95, max(0.05, choice.success_chance + bonus)), 6)


def event_view(state: GameState, definitions: Definitions) -> dict | None:
    if state.status != "running":
        return None
    event = get_event(state, definitions)
    choices = []
    for choice in event.choices:
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
                "available": available,
                "unavailable_reasons": reasons,
                "eligible_crew": candidates,
                "success_probability": (
                    None if choice.requires_crew else success_probability(state, choice, None)
                ),
            }
        )
    return {
        "id": event.id,
        "title": event.title,
        "description": event.description,
        "on_start": asdict(event.on_start),
        "choices": choices,
    }


def resolve_choice(state: GameState, choice: EventChoice, selected: CrewMember | None) -> dict:
    """Mutate a validated working copy only. Costs apply on either outcome."""
    probability = success_probability(state, choice, selected)
    succeeded = seeded_rng(state, f"outcome:{state.current_event_id}").random() < probability
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
