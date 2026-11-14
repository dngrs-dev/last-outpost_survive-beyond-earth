"""Small phased project lifecycle. Durations and costs are fictional game values."""

from dataclasses import dataclass, replace

from app.game.models import Definitions, Effects, EventChoice, GameError, GameState, ResearchProject
from app.game.research import RESEARCH_CHOICES


@dataclass(frozen=True)
class ProjectPhase:
    title: str
    weeks: int
    work: EventChoice | None = None
    power: float = 0


DEPLOY = next(choice for choice in RESEARCH_CHOICES if choice.id == "research_seismic")
ANALYZE = EventChoice(
    id="seismic_analysis",
    text="Analyze seismic recordings",
    description=(
        "One crew week. Success completes the project and earns 2 data; "
        "failure wastes 2 extra power. Failed attempts retain all recordings."
    ),
    costs={"electricity": 2},
    required_items={"scientific_tools": 1},
    requires_crew=True,
    role_bonus={"scientist": 0.2, "technician": 0.1},
    success_chance=0.75,
    success_effects=Effects(resources={"research_data": 2}),
    failure_effects=Effects(resources={"electricity": -2}),
)
PROJECT_PHASES = {
    "seismic": (
        ProjectPhase("Deploy or service sensors", 1, DEPLOY),
        ProjectPhase("Record seismic activity", 3, power=2),
        ProjectPhase("Analyze recordings", 1, ANALYZE),
    ),
}


def apply_project_orders(state: GameState, orders: list[dict]) -> None:
    seen = set()
    for order in orders:
        project = next((p for p in state.projects if p.id == order["project_id"]), None)
        if not project or project.status == "completed" or project.id in seen:
            raise GameError("Unknown, completed, or duplicate project order.")
        seen.add(project.id)
        action = order["action"]
        if action not in {"pause", "resume", "interrupt"}:
            raise GameError("Unknown project control.")
        project.status = "active" if action == "resume" else "paused"
        project.assigned_crew_id = None
        project.message = {
            "pause": "Paused by command; progress retained.",
            "interrupt": "Work interrupted; crew released and progress retained.",
            "resume": "Resumed; manual phases need a weekly crew assignment.",
        }[action]


def project_choices(state: GameState) -> list[EventChoice]:
    choices = []
    for project in state.projects:
        if project.status == "completed":
            continue
        phase = PROJECT_PHASES[project.kind][project.phase_index]
        if phase.work:
            choices.append(
                replace(
                    phase.work,
                    id=f"project:{project.id}",
                    text=f"{phase.title} ({project.id})",
                    description=phase.work.description + " Assigning a worker resumes paused work.",
                )
            )
    return choices


def finish_manual_work(
    state: GameState, activity_id: str, crew_id: str, success: bool
) -> str | None:
    """Advance only after a successful full manual week; return completion credit ID."""
    if activity_id == "research_seismic":
        project = ResearchProject(id=f"seismic-{len(state.projects) + 1}", kind="seismic")
        state.projects.append(project)
    elif activity_id.startswith("project:"):
        project = next(p for p in state.projects if p.id == activity_id.removeprefix("project:"))
    else:
        return None
    project.status = "active"
    project.assigned_crew_id = crew_id
    if not success:
        project.message = (
            "Attempt failed; supplies spent, phase retained. Assign any living worker to retry."
        )
        return None
    phase = PROJECT_PHASES[project.kind][project.phase_index]
    project.progress += 1
    project.message = "Manual work advanced."
    if project.progress >= phase.weeks:
        project.phase_index += 1
        project.progress = 0
        project.assigned_crew_id = None
        if project.phase_index == len(PROJECT_PHASES[project.kind]):
            project.status = "completed"
            project.completed_week = state.current_week
            project.message = "Project complete; science recorded."
            return "research_seismic"
        project.message = "Phase complete; next phase begins next week."
    return None


def advance_recording(state: GameState, original: GameState, log: list[dict]) -> None:
    for project in state.projects:
        previous = next((p for p in original.projects if p.id == project.id), None)
        if (
            project.status != "active"
            or not previous
            or previous.phase_index != project.phase_index
        ):
            continue
        phase = PROJECT_PHASES[project.kind][project.phase_index]
        if phase.work:
            continue
        if state.resources["electricity"] + 1e-6 < phase.power:
            project.message = "Waiting for stored power; no charge or recording progress."
            log.append(
                {"project_id": project.id, "message": project.message, "electricity_used": 0}
            )
            continue
        state.resources["electricity"] = round(
            max(0, state.resources["electricity"] - phase.power), 6
        )
        project.progress += 1
        project.message = "Recorded one week of seismic activity; no crew occupied."
        log.append(
            {"project_id": project.id, "message": project.message, "electricity_used": phase.power}
        )
        if project.progress >= phase.weeks:
            project.phase_index += 1
            project.progress = 0
            project.message = "Recording complete; assign a worker for analysis next week."


def clear_dead_workers(state: GameState, log: list[dict]) -> None:
    living = {c.id for c in state.crew if c.alive}
    for project in state.projects:
        if project.assigned_crew_id and project.assigned_crew_id not in living:
            project.assigned_crew_id = None
            project.message += " Previous worker died; completed work retained."
            log.append(
                {"project_id": project.id, "message": project.message, "electricity_used": 0}
            )


def project_views(state: GameState, definitions: Definitions) -> list[dict]:
    duration = definitions.missions[state.mission_id].duration_weeks
    views = []
    for project in state.projects:
        phases = PROJECT_PHASES[project.kind]
        complete = project.status == "completed"
        phase = phases[-1] if complete else phases[project.phase_index]
        remaining = (
            0
            if complete
            else sum(p.weeks for p in phases[project.phase_index :]) - project.progress
        )
        estimate = (
            project.completed_week
            if complete
            else None
            if project.status == "paused"
            else state.current_week + remaining - 1
        )
        views.append(
            {
                "id": project.id,
                "kind": project.kind,
                "status": project.status,
                "phase": "Complete" if complete else phase.title,
                "phase_index": project.phase_index,
                "phase_progress": project.progress,
                "phase_weeks": 0 if complete else phase.weeks,
                "remaining_weeks": remaining,
                "estimated_completion_week": estimate,
                "within_rotation": estimate is not None and estimate <= duration,
                "crew_required": 0 if complete or not phase.work else 1,
                "costs": {}
                if complete
                else phase.work.costs
                if phase.work
                else {"electricity": phase.power},
                "required_items": {} if complete or not phase.work else phase.work.required_items,
                "assigned_crew_id": project.assigned_crew_id,
                "message": project.message,
            }
        )
    return views


def potential_project_credit(state: GameState, activity_id: str) -> str | None:
    if activity_id == "research_seismic":
        return None
    if activity_id.startswith("project:"):
        project = next(p for p in state.projects if p.id == activity_id.removeprefix("project:"))
        return (
            "research_seismic"
            if project.phase_index == len(PROJECT_PHASES[project.kind]) - 1
            else None
        )
    return activity_id
