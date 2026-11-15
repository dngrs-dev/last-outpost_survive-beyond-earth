"""Backend-only deterministic policy benchmark. No API, network, or future RNG access.

Run from backend/: .venv/Scripts/python.exe balance_missions.py --help
"""

import argparse
import hashlib
import json
from collections import Counter
from dataclasses import asdict
from math import sqrt
from pathlib import Path

from app.game.engine import GameEngine
from app.game.events import choice_views, get_event
from app.game.launch import recommended_cargo
from app.game.loader import load_definitions
from app.game.models import Ration
from app.game.research import science_view
from app.game.survival import ration_cost

CREW = ["alex", "maya", "lin", "sam"]
OPERATIONAL_ENDINGS = {"perfect_handover", "successful_handover"}


def stars(state, definitions):
    survivors = sum(c.alive for c in state.crew)
    if not survivors:
        return 0
    return (
        1
        + (survivors == state.initial_crew_size)
        + (science_view(state, definitions)["status"] == "complete")
    )


def wilson(successes, trials):
    """95% Wilson score interval, including meaningful endpoints for 0/n and n/n."""
    if trials <= 0 or not 0 <= successes <= trials:
        raise ValueError("Require 0 <= successes <= positive trials")
    z = 1.959963984540054
    p = successes / trials
    scale = 1 + z * z / trials
    center = (p + z * z / (2 * trials)) / scale
    half = z * sqrt(p * (1 - p) / trials + z * z / (4 * trials * trials)) / scale
    return [round(max(0, center - half), 4), round(min(1, center + half), 4)]


def decision(engine, state, policy):
    """Use only present public action previews and committed mission state."""
    living = [c for c in state.crew if c.alive]
    budget = state.resources.copy()
    # Normal until unaffordable, then explicit emergency depletion; never assume
    # that generated water or incident rewards can fund this week's reservations.
    levels = {}
    for resource in ("food", "water"):
        total = sum(
            ration_cost(c, Ration("normal", "normal"), engine.rules)[resource] for c in living
        )
        levels[resource] = "normal" if budget[resource] + 1e-6 >= total else "emergency"
        budget[resource] = max(
            0, budget[resource] - total * (1 if levels[resource] == "normal" else 0.4)
        )
    rations = {c.id: Ration(**levels) for c in living}
    busy = set()

    def affordable(choice):
        return all(budget.get(r, 0) + 1e-6 >= n for r, n in choice["costs"].items())

    def actor(choice):
        eligible = [
            c for c in choice["eligible_crew"] if c["available"] and c["crew_id"] not in busy
        ]
        return max(eligible, key=lambda c: c["success_probability"], default=None)

    def score(choice, candidate):
        p = candidate["success_probability"] if candidate else choice["success_probability"]
        weights = {
            "food": 1,
            "water": 1,
            "oxygen": 0.5,
            "electricity": 0.3,
            "medicine": 2,
            "repair_kits": 3,
            "eva_batteries": 2,
            "dust_kits": 2,
            "oxygen_regulators": 2,
            "sealant_packs": 1,
        }
        value = -sum(weights.get(r, 0) * n for r, n in choice["costs"].items())
        for key, chance in (("success_effects", p), ("failure_effects", 1 - p)):
            effect = choice[key]
            value += chance * sum(weights.get(r, 0) * n for r, n in effect["resources"].items())
            for field, weight in (
                ("solar_efficiency", 80),
                ("oxygen_efficiency", 70),
                ("water_recovery_efficiency", 50),
                ("co2_efficiency", 90),
            ):
                delta = (
                    min(1 - getattr(state, field), effect[field])
                    if effect[field] > 0
                    else effect[field]
                )
                value += chance * delta * weight
            targets = (
                living
                if effect["target"] == "all"
                else [c for c in living if candidate and c.id == candidate["crew_id"]]
            )
            value += (
                chance * effect["crew_health"] * sum(1 if c.health < 60 else 0.25 for c in targets)
            )
            if effect.get("condition"):
                value -= chance * 10 * len(targets)
            if effect.get("treatment"):
                value += (
                    chance
                    * effect["treatment"]
                    * sum(bool(c.medical_conditions) for c in targets)
                    * 2
                )
        value += p * 5 * len(choice.get("objective_rewards", []))
        return value

    choices = choice_views(state, engine.definitions, get_event(state, engine.definitions).choices)
    responses = []
    for choice in choices:
        if not choice["available"] or not affordable(choice):
            continue
        candidate = actor(choice) if choice["requires_crew"] else None
        if choice["requires_crew"] and candidate is None:
            continue
        supporters = [
            c["crew_id"]
            for c in choice["support_candidates"]
            if c["available"] and c["crew_id"] != (candidate or {}).get("crew_id")
        ]
        needed = max(0, choice["minimum_crew"] - 1) if choice["requires_crew"] else 0
        if len(supporters) < needed:
            continue
        responses.append((choice, candidate, supporters[:needed]))
    if not responses:
        raise RuntimeError("No legal incident response")
    response = (
        responses[0] if policy == "basic" else max(responses, key=lambda row: score(row[0], row[1]))
    )
    choice, candidate, supporters = response
    if candidate:
        busy.add(candidate["crew_id"])
    busy.update(supporters)
    for resource, n in choice["costs"].items():
        budget[resource] -= n
    assignments = []
    if policy == "careful":
        options = choice_views(state, engine.definitions, engine.assignment_choices(state))
        while len(busy) < len(living):
            candidates = []
            for activity in options:
                if not activity["available"] or not affordable(activity):
                    continue
                worker = actor(activity)
                if worker is None:
                    continue
                if activity["id"] in {"medical_care", "self_care"}:
                    continue  # handled below with explicit patient occupancy
                if activity["id"] == "crew_rest":
                    continue
                if any(a["activity_id"] == activity["id"] for a in assignments):
                    continue
                priority = score(activity, worker)
                if activity["id"].startswith("project:") or activity["id"] == "research_seismic":
                    priority += 5
                # No first deployment if analysis cannot finish before relief.
                if (
                    activity["id"] == "research_seismic"
                    and engine.definitions.missions[state.mission_id].duration_weeks
                    - state.current_week
                    < 4
                ):
                    continue
                if priority > 0:
                    candidates.append((priority, activity, worker))
            # Care reserves patient and caregiver in the very same weekly plan.
            medical = next(
                (
                    a
                    for a in options
                    if a["id"] == "medical_care" and a["available"] and affordable(a)
                ),
                None,
            )
            if medical:
                worker = actor(medical)
                patients = [
                    c
                    for c in living
                    if c.id not in busy
                    and worker
                    and c.id != worker["crew_id"]
                    and c.medical_conditions
                ]
                if worker and patients:
                    patient = min(patients, key=lambda c: c.health)
                    assignments.append(
                        {
                            "crew_id": worker["crew_id"],
                            "activity_id": "medical_care",
                            "patient_id": patient.id,
                            "condition_id": patient.medical_conditions[0].kind,
                        }
                    )
                    busy.update((worker["crew_id"], patient.id))
                    for resource, n in medical["costs"].items():
                        budget[resource] -= n
                    continue
            if not candidates:
                break
            _, activity, worker = max(candidates, key=lambda row: row[0])
            assignments.append({"crew_id": worker["crew_id"], "activity_id": activity["id"]})
            busy.add(worker["crew_id"])
            for resource, n in activity["costs"].items():
                budget[resource] -= n
        # Explicit rest provides gradual recovery instead of invented healing.
        for crew in living:
            if crew.id not in busy:
                assignments.append({"crew_id": crew.id, "activity_id": "crew_rest"})
    return dict(
        expected_week=state.current_week,
        rations=rations,
        event_choice_id=choice["id"],
        selected_crew_id=candidate["crew_id"] if candidate else None,
        support_crew_ids=supporters,
        assignments=assignments,
    )


def simulate(engine, station_id, seed, policy="careful", crew=None):
    if policy not in {"basic", "careful"}:
        raise ValueError("Unknown policy")
    state = engine.create_game(
        station_id, crew or CREW, recommended_cargo(engine.definitions, station_id), seed
    )
    while state.status == "running":
        state, _ = engine.advance_week(state, **decision(engine, state, policy))
    return state


def model_digest(engine):
    content = json.dumps(
        {"definitions": asdict(engine.definitions), "rules": asdict(engine.rules)}, sort_keys=True
    )
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def benchmark(engine, runs, seed_start, stations=None, crew=None):
    if runs <= 0 or seed_start < 0:
        raise ValueError("Use positive runs and nonnegative seed start")
    results = []
    for station_id in stations or engine.definitions.stations:
        station = engine.definitions.stations[station_id]
        for policy in ("basic", "careful"):
            states = [
                simulate(engine, station_id, seed, policy, crew)
                for seed in range(seed_start, seed_start + runs)
            ]
            success = sum(s.ending in OPERATIONAL_ENDINGS for s in states)
            results.append(
                dict(
                    station=station_id,
                    difficulty=station.difficulty,
                    policy=policy,
                    runs=runs,
                    operational_success=success / runs,
                    success_interval_95=wilson(success, runs),
                    survival=sum(any(c.alive for c in s.crew) for s in states) / runs,
                    full_crew=sum(all(c.alive for c in s.crew) for s in states) / runs,
                    science=sum(
                        science_view(s, engine.definitions)["status"] == "complete" for s in states
                    )
                    / runs,
                    stars=dict(
                        sorted(Counter(str(stars(s, engine.definitions)) for s in states).items())
                    ),
                    endings=dict(sorted(Counter(s.ending for s in states).items())),
                )
            )
    return dict(
        version=1,
        seed_start=seed_start,
        runs_per_policy=runs,
        crew=crew or CREW,
        model_digest=model_digest(engine),
        equipment={
            s: recommended_cargo(engine.definitions, s)
            for s in stations or engine.definitions.stations
        },
        results=results,
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--runs", type=int, default=200)
    parser.add_argument("--seed-start", type=int, default=10000)
    parser.add_argument("--stations", nargs="+")
    parser.add_argument("--crew", nargs="+", default=CREW)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    engine = GameEngine(load_definitions())
    report = benchmark(engine, args.runs, args.seed_start, args.stations, args.crew)
    if args.output:
        args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    for row in report["results"]:
        print(
            f"{row['station']:12} {row['policy']:8} "
            f"success={row['operational_success']:.1%} survival={row['survival']:.1%} "
            f"science={row['science']:.1%} stars={row['stars']}",
            flush=True,
        )


if __name__ == "__main__":
    main()
