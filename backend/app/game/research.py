"""Mission science is credited by successful work, independently of survival."""

from dataclasses import asdict

from app.game.models import Definitions, Effects, EventChoice, GameState

# Alternatives to the current incident response, using the same atomic turn path.
# Each corresponds to one unit of work, not an entire mission objective.
RESEARCH_CHOICES = [
    EventChoice(
        id="research_geology",
        text="Survey a geological sample",
        description=(
            "Use the science kit to collect one sample and 2 research data on success. "
            "Scientists improve the odds; failure costs the worker 8 health. "
            "Uses this week's action; the incident's initial damage remains."
        ),
        costs={"eva_batteries": 1, "oxygen": 2},
        required_items={"scientific_tools": 1},
        requires_crew=True,
        role_bonus={"scientist": 0.2, "technician": 0.1},
        success_chance=0.75,
        success_effects=Effects(resources={"research_data": 2}),
        failure_effects=Effects(crew_health=-8),
    ),
    EventChoice(
        id="research_seismic",
        text="Analyze a seismic record",
        description=(
            "Use the science kit to complete one analysis and earn 2 research data on success. "
            "Scientists improve the odds; failure wastes 2 additional power. "
            "Uses this week's action; the incident's initial damage remains."
        ),
        costs={"electricity": 2},
        required_items={"scientific_tools": 1},
        requires_crew=True,
        role_bonus={"scientist": 0.2, "technician": 0.1},
        success_chance=0.75,
        success_effects=Effects(resources={"research_data": 2}),
        failure_effects=Effects(resources={"electricity": -2}),
    ),
    EventChoice(
        id="research_instrument",
        text="Restore the next research instrument",
        description=(
            "Use a repair kit and science kit to restore one instrument and earn 2 research data "
            "on success. Engineers and technicians improve the odds; failure costs the worker "
            "6 health. Uses this week's action; the incident's initial damage remains."
        ),
        costs={"repair_kits": 1, "electricity": 2},
        required_items={"scientific_tools": 1},
        requires_crew=True,
        role_bonus={"engineer": 0.2, "technician": 0.2, "scientist": 0.1},
        success_chance=0.7,
        success_effects=Effects(resources={"research_data": 2}),
        failure_effects=Effects(crew_health=-6),
    ),
]
RESEARCH_CHOICE_IDS = frozenset(choice.id for choice in RESEARCH_CHOICES)


def science_view(state: GameState, definitions: Definitions) -> dict:
    """Derive progress from committed turns; reads never grant credit."""
    totals: dict[str, int] = {}
    for turn in state.history:
        for gain in turn["event"].get("objective_progress", []):
            key = gain["objective_id"]
            totals[key] = totals.get(key, 0) + gain["amount"]
    objectives = []
    for objective in definitions.missions[state.mission_id].science_objectives:
        progress = min(objective.target, totals.get(objective.id, 0))
        objectives.append(
            {
                **asdict(objective),
                "progress": progress,
                "completed": progress >= objective.target,
            }
        )
    completed = sum(objective["completed"] for objective in objectives)
    status = (
        "complete"
        if objectives and completed == len(objectives)
        else "partial"
        if any(objective["progress"] for objective in objectives)
        else "not_started"
    )
    return {
        "status": status,
        "completed_objectives": completed,
        "total_objectives": len(objectives),
        "research_data": state.resources["research_data"],
        "objectives": objectives,
    }


def objective_rewards(state: GameState, definitions: Definitions, choice_id: str) -> list[dict]:
    """Potential credit for one successful action, capped at each mission target."""
    return [
        {"objective_id": objective["id"], "title": objective["title"], "amount": 1}
        for objective in science_view(state, definitions)["objectives"]
        if choice_id in objective["qualifying_choices"] and not objective["completed"]
    ]


def research_choices(state: GameState, definitions: Definitions) -> list[EventChoice]:
    pending_choices = {
        choice_id
        for objective in science_view(state, definitions)["objectives"]
        if not objective["completed"]
        for choice_id in objective["qualifying_choices"]
    }
    return [choice for choice in RESEARCH_CHOICES if choice.id in pending_choices]
