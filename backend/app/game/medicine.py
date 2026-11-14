"""Small deterministic medical lifecycle. All rates and timelines are fictional."""

from dataclasses import asdict, dataclass

from app.game.models import CrewMember, Effects, EventChoice, MedicalCondition

MEDICAL_SOURCE = (
    "https://www.nasa.gov/reference/appendix-e-health-and-medical-care-technical-requirements/"
)
DUST_SOURCE = "https://www.nasa.gov/reference/jsc-dust/"


@dataclass(frozen=True)
class ConditionRule:
    title: str
    recovery: int
    penalty: float
    damage: int = 0
    source: str = MEDICAL_SOURCE


CONDITIONS = {
    "sprain": ConditionRule("Musculoskeletal sprain", 3, 0.08),
    "bleeding_wound": ConditionRule("Bleeding wound", 3, 0.1, 6),
    "dust_irritation": ConditionRule(
        "Dust-related respiratory irritation", 2, 0.05, 1, DUST_SOURCE
    ),
    "gastrointestinal_illness": ConditionRule("Gastrointestinal illness", 3, 0.08, 3),
}
MEDICAL_CHOICES = [
    EventChoice(
        id="medical_care",
        text="Provide medical care",
        workload="light",
        description=(
            "Reserve caregiver and patient for one week, plus 1 medicine. Stabilizes the chosen "
            "condition immediately. A fit medic earns 2 recovery points; another fit caregiver "
            "earns 1 (2 with a retained diagnostic scanner). Progress needs full actual provisions "
            "and safe air. Both crew are occupied, even if recovery stalls."
        ),
        costs={"medicine": 1},
        required_items={},
        requires_crew=True,
        role_bonus={},
        success_chance=1,
        success_effects=Effects(),
        failure_effects=Effects(),
    ),
    EventChoice(
        id="self_care",
        text="Self-care and stabilization",
        workload="rest",
        description=(
            "One astronaut and 1 medicine. Available even when critically unfit; treats only "
            "their own chosen condition. Stabilizes immediately and earns 1 recovery point "
            "with full actual provisions and safe air. No work or incident duty that week."
        ),
        costs={"medicine": 1},
        required_items={},
        requires_crew=True,
        role_bonus={},
        success_chance=1,
        success_effects=Effects(),
        failure_effects=Effects(),
    ),
]
MEDICAL_IDS = frozenset(c.id for c in MEDICAL_CHOICES)


def urgent(case: MedicalCondition) -> bool:
    return case.kind == "bleeding_wound" and not case.stabilized


def restrictions(crew: CrewMember, workload: str) -> list[str]:
    if any(urgent(c) for c in crew.medical_conditions):
        return ["Urgent bleeding wound: stabilize before active work; self-care remains available."]
    if any(c.kind == "dust_irritation" for c in crew.medical_conditions) and workload == "eva":
        return [
            "Respiratory irritation: EVA unavailable until recovered; indoor work remains possible."
        ]
    restricted = any(
        c.kind != "dust_irritation"
        and (
            workload == "eva"
            or workload == "strenuous"
            and (c.kind != "gastrointestinal_illness" or c.remaining > 1)
        )
        for c in crew.medical_conditions
    )
    if restricted:
        return ["Active injury or illness: light duties only until the condition resolves."]
    return []


def add_condition(crew: CrewMember, kind: str, week: int) -> dict | None:
    if not crew.alive:
        return None
    case = next((c for c in crew.medical_conditions if c.kind == kind), None)
    before = asdict(case) if case else None
    if case:
        case.remaining = max(case.remaining, CONDITIONS[kind].recovery)
        case.acquired_week, case.stabilized = week, False
        case.care_week, case.care_points = 0, 0
    else:
        case = MedicalCondition(kind=kind, remaining=CONDITIONS[kind].recovery, acquired_week=week)
        crew.medical_conditions.append(case)
    return {
        "crew_id": crew.id,
        "kind": kind,
        "action": "worsened" if before else "acquired",
        "before": before,
        "after": asdict(case),
    }


def provide_care(crew: CrewMember, week: int, points: int, kind: str | None = None) -> dict | None:
    cases = sorted(crew.medical_conditions, key=lambda c: (not urgent(c), c.kind))
    case = next((c for c in cases if kind is None or c.kind == kind), None)
    if not crew.alive or not case:
        return None
    before = asdict(case)
    case.stabilized = True
    case.care_points = max(case.care_points if case.care_week == week else 0, points)
    case.care_week = week
    return {
        "crew_id": crew.id,
        "kind": case.kind,
        "action": "stabilized",
        "before": before,
        "after": asdict(case),
    }


def progress_conditions(crew: CrewMember, week: int, *, supported: bool, resting: bool) -> dict:
    changes, damage = [], 0
    for case in list(crew.medical_conditions):
        before = asdict(case)
        treated = case.care_week == week
        points = case.care_points if treated else 1 if resting and not urgent(case) else 0
        if supported:
            case.remaining = max(0, case.remaining - points)
        if case.remaining == 0:
            crew.medical_conditions.remove(case)
        else:
            # New conditions are announced before their first ongoing damage tick.
            ongoing = CONDITIONS[case.kind].damage if case.acquired_week < week else 0
            if case.kind == "bleeding_wound" and case.stabilized:
                ongoing = 0
            damage += ongoing
        stalled = points > 0 and not supported
        if asdict(case) != before or case.remaining == 0 or stalled:
            changes.append(
                {
                    "crew_id": crew.id,
                    "kind": case.kind,
                    "action": "resolved"
                    if case.remaining == 0
                    else "stalled"
                    if stalled
                    else "recovering",
                    "reason": "Recovery needs full actual provisions, safe air, and no active work."
                    if stalled
                    else None,
                    "before": before,
                    "after": None if case.remaining == 0 else asdict(case),
                }
            )
    return {"medical_penalty": damage, "medical_changes": changes}


def medical_views(crew: CrewMember) -> list[dict]:
    return [
        {
            **asdict(case),
            "title": CONDITIONS[case.kind].title,
            "urgent": urgent(case),
            "rest_weeks": None if urgent(case) else case.remaining,
            "medic_weeks": (case.remaining + 1) // 2,
            "untreated_damage": CONDITIONS[case.kind].damage
            if case.kind != "bleeding_wound" or not case.stabilized
            else 0,
            "source_url": CONDITIONS[case.kind].source,
        }
        for case in crew.medical_conditions
    ]
