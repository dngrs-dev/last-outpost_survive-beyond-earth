"""Regenerate frontend contract fixtures through the real FastAPI endpoints.

Run from backend/: .venv/Scripts/python.exe export_frontend_fixtures.py
Requires the backend dev dependencies. Never edit the generated fixtures manually.
"""

import argparse
import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import create_app

TARGET = Path(__file__).resolve().parent.parent / "frontend/src/__tests__/fixtures/backend.ts"
CARGO = {
    "food_packs": 8,
    "water_containers": 16,
    "repair_kits": 7,
    "eva_batteries": 7,
    "medicine_kits": 7,
}


def checked(response):
    response.raise_for_status()
    return response.json()


def decision(state, request_id, ignore=False, choice_id=None):
    activity = next((a for a in state["assignment_options"] if a["id"] == choice_id), None)
    choice = next(
        c
        for c in state["current_event"]["choices"]
        if c["available"]
        and (not (ignore or activity) or not c["requires_crew"])
        and (choice_id is None or activity or c["id"] == choice_id)
    )
    living = [c for c in state["crew"] if c["alive"]]
    levels = {
        resource: "normal"
        if state["resources"][resource]
        >= sum(c["ration_options"]["normal"][resource] for c in living)
        + choice["costs"].get(resource, 0)
        else "emergency"
        for resource in ("food", "water")
    }
    selected = max(
        (c for c in choice["eligible_crew"] if c["available"]),
        key=lambda c: c["success_probability"],
        default=None,
    )
    support = (
        [
            c["crew_id"]
            for c in choice["support_candidates"]
            if c["available"] and (not selected or c["crew_id"] != selected["crew_id"])
        ][: max(0, choice["minimum_crew"] - 1)]
        if choice["requires_crew"]
        else []
    )
    work = []
    if activity:
        actor = max(
            (c for c in activity["eligible_crew"] if c["available"]),
            key=lambda c: c["success_probability"],
        )
        work = [{"crew_id": actor["crew_id"], "activity_id": activity["id"]}]
    return {
        "support_crew_ids": support,
        "assignments": work,
        "expected_week": state["current_week"],
        "request_id": request_id,
        "rations": {c["id"]: levels.copy() for c in living},
        "event_choice_id": choice["id"],
        "selected_crew_id": selected["crew_id"] if selected else None,
    }


def generate(check: bool = False) -> None:
    fixtures = {}
    with TestClient(create_app()) as client:
        fixtures["catalog"] = ("CatalogResponse", checked(client.get("/api/catalog")))
        fixtures["moonArchive"] = ("MoonCatalog", checked(client.get("/api/moon")))

        def create(seed, crew=None, cargo=None):
            return checked(
                client.post(
                    "/api/games",
                    json={
                        "station_id": "alpha",
                        "crew_ids": crew or ["alex", "maya"],
                        "cargo": CARGO if cargo is None else cargo,
                        "random_seed": seed,
                    },
                )
            )

        def turn(game, body):
            return checked(client.post(f"/api/games/{game['game_id']}/turn", json=body))

        priority_game = create(42)
        priority_body = decision(priority_game["state"], "fixture-priority")
        priority_body["power_priority"] = "research"
        fixtures["energyPriorityGame"] = ("GameResponse", priority_game)
        fixtures["energyPriorityTurn"] = ("TurnResponse", turn(priority_game, priority_body))

        thirsty = create(0)
        body = decision(thirsty["state"], "fixture-thirst", ignore=True)
        for ration in body["rations"].values():
            ration.update(food="normal", water="emergency")
        result = turn(thirsty, body)
        fixtures["dehydratedGame"] = (
            "GameResponse",
            {"game_id": result["game_id"], "state": result["state"]},
        )

        for seed in range(100):
            depleted = create(seed, ["alex", "lin"], {**CARGO, "scientific_tools": 1})
            for week in range(4):
                body = decision(depleted["state"], f"fixture-underfed-{week}", ignore=True)
                for ration in body["rations"].values():
                    ration.update(food="reduced", water="normal")
                result = turn(depleted, body)
                depleted = {"game_id": result["game_id"], "state": result["state"]}
            if all(c["health"] >= 60 for c in depleted["state"]["crew"]):
                fixtures["underfedGame"] = ("GameResponse", depleted)
                body = decision(depleted["state"], "fixture-recuperation", ignore=True)
                body["assignments"] = [{"crew_id": "alex", "activity_id": "crew_rest"}]
                fixtures["recuperationTurn"] = ("TurnResponse", turn(depleted, body))
                break
        else:
            raise RuntimeError("No underfed crew fixture found")

        for seed in range(1000):
            game = create(seed)
            if game["state"]["current_event_id"] != "solar_failure":
                continue
            body = decision(game["state"], "fixture-turn")
            body["rations"]["alex"]["food"] = "reduced"
            result = turn(game, body)
            if not result["turn_outcome"]["event"]["success"]:
                fixtures["game"] = ("GameResponse", game)
                fixtures["turn"] = ("TurnResponse", result)
                break
        else:
            raise RuntimeError("No failed repair fixture found")

        medical = create(42)
        assert medical["state"]["current_event_id"] == "medical_emergency"
        fixtures["medicalGame"] = ("GameResponse", medical)
        fixtures["treatment"] = (
            "TurnResponse",
            turn(medical, decision(medical["state"], "fixture-treatment")),
        )
        paired = create(42, ["alex", "maya", "lin"])
        paired_body = decision(paired["state"], "fixture-paired-care", ignore=True)
        paired_body["assignments"] = [
            {
                "crew_id": "maya",
                "activity_id": "medical_care",
                "patient_id": "alex",
                "condition_id": "dust_irritation",
            },
            {"crew_id": "lin", "activity_id": "crew_rest"},
        ]
        fixtures["medicalAssignmentGame"] = ("GameResponse", paired)
        fixtures["medicalAssignmentTurn"] = ("TurnResponse", turn(paired, paired_body))
        for seed in range(100):
            initial = create(seed)
            result = turn(initial, decision(initial["state"], "fixture-opportunity", ignore=True))
            if result["state"]["current_event"]["category"] == "opportunity":
                fixtures["opportunityGame"] = (
                    "GameResponse",
                    {"game_id": result["game_id"], "state": result["state"]},
                )
                break
        else:
            raise RuntimeError("No opportunity fixture found")
        research_cargo = {**CARGO, "scientific_tools": 1, "eva_batteries": 9, "repair_kits": 9}
        for seed in range(100):
            initial = create(seed, ["alex", "lin"], research_cargo)
            if not next(
                a for a in initial["state"]["assignment_options"] if a["id"] == "research_geology"
            )["available"]:
                continue
            result = turn(
                initial, decision(initial["state"], "fixture-science", choice_id="research_geology")
            )
            if result["turn_outcome"]["assignments"][0]["outcome"]["success"]:
                fixtures["researchGame"] = ("GameResponse", initial)
                fixtures["researchTurn"] = ("TurnResponse", result)
                break
        else:
            raise RuntimeError("No successful research fixture found")
        while result["state"]["status"] == "running":
            state = result["state"]
            choices = state["assignment_options"]
            work = next(
                (
                    c
                    for c in choices
                    if c["available"]
                    and (
                        c["objective_rewards"]
                        or c["id"] == "research_seismic"
                        or c["id"].startswith("project:")
                    )
                ),
                None,
            )
            body = decision(
                state,
                f"fixture-science-{state['current_week']}",
                choice_id=work["id"] if work else None,
                ignore=not work,
            )
            occupied = {
                body["selected_crew_id"],
                *body["support_crew_ids"],
                *(a["crew_id"] for a in body["assignments"]),
            }
            body["assignments"].extend(
                {"crew_id": c["id"], "activity_id": "crew_rest"}
                for c in state["crew"]
                if c["alive"] and c["medical_conditions"] and c["id"] not in occupied
            )
            result = turn(result, body)
        assert result["state"]["science"]["status"] == "complete"
        fixtures["researchCompleted"] = (
            "GameResponse",
            {"game_id": result["game_id"], "state": result["state"]},
        )

        for seed in range(100):
            initial = create(seed, ["alex", "lin", "sam", "maya"], research_cargo)
            next_week = turn(
                initial, decision(initial["state"], "fixture-support-discovery", ignore=True)
            )
            response = next(
                (
                    c
                    for c in next_week["state"]["current_event"]["choices"]
                    if c["minimum_crew"] == 2
                ),
                None,
            )
            if (
                response
                and response["available"]
                and all(
                    c["condition"]["can_do_eva"] for c in next_week["state"]["crew"] if c["alive"]
                )
            ):
                fixtures["supportGame"] = (
                    "GameResponse",
                    {"game_id": next_week["game_id"], "state": next_week["state"]},
                )
                body = decision(next_week["state"], "fixture-parallel", choice_id=response["id"])
                occupied = [body["selected_crew_id"], *body["support_crew_ids"]]
                free = [
                    c["id"]
                    for c in next_week["state"]["crew"]
                    if c["alive"] and c["id"] not in occupied
                ]
                body["assignments"] = [
                    {"crew_id": free[0], "activity_id": "research_geology"},
                    {"crew_id": free[1], "activity_id": "research_instrument"},
                ]
                fixtures["parallelTurn"] = ("TurnResponse", turn(next_week, body))
                break
        else:
            raise RuntimeError("No support crew fixture found")

        for seed in range(50):
            initial = create(seed, ["alex", "lin"], research_cargo)
            if not next(
                a for a in initial["state"]["assignment_options"] if a["id"] == "research_seismic"
            )["available"]:
                continue
            deployed = turn(
                initial, decision(initial["state"], "project-deploy", choice_id="research_seismic")
            )
            if not deployed["turn_outcome"]["assignments"][0]["outcome"]["success"]:
                continue
            pid = deployed["state"]["research_projects"][0]["id"]
            pause_body = decision(deployed["state"], "project-pause", ignore=True)
            pause_body["project_orders"] = [{"project_id": pid, "action": "pause"}]
            paused = turn(deployed, pause_body)
            resume_body = decision(paused["state"], "project-resume", ignore=True)
            resume_body["project_orders"] = [{"project_id": pid, "action": "resume"}]
            recording = turn(paused, resume_body)
            for count in range(2):
                recording = turn(
                    recording, decision(recording["state"], f"project-record-{count}", ignore=True)
                )
            finished = turn(
                recording,
                decision(recording["state"], "project-analyze", choice_id=f"project:{pid}"),
            )
            if finished["state"]["research_projects"][0]["status"] != "completed":
                continue
            for name, response in (
                ("projectRecording", deployed),
                ("projectPaused", paused),
                ("projectAnalysis", recording),
                ("projectCompleted", finished),
            ):
                fixtures[name] = (
                    "GameResponse",
                    {"game_id": response["game_id"], "state": response["state"]},
                )
            fixtures["projectPauseTurn"] = ("TurnResponse", paused)
            break
        else:
            raise RuntimeError("No complete phased project fixture found")

        for name, crew, cargo in (
            ("completed", ["alex", "maya"], CARGO),
            ("failed", ["alex", "maya", "lin", "sam"], {}),
        ):
            game = create(42, crew, cargo)
            while game["state"]["status"] == "running":
                body = decision(
                    game["state"],
                    f"fixture-{game['state']['current_week']}",
                    ignore=name == "failed",
                )
                result = turn(game, body)
                game = {"game_id": result["game_id"], "state": result["state"]}
            fixtures[name] = ("GameResponse", game)

    # Stable IDs keep regeneration diffs focused on actual contract/content changes.
    lines = [
        "// Generated by backend/export_frontend_fixtures.py. Do not edit manually.",
        "import type { CatalogResponse, GameResponse, TurnResponse } from '../../types/game';",
        "import type { MoonCatalog } from '../../types/moon';",
        "",
    ]
    for name, (type_name, data) in fixtures.items():
        if "game_id" in data:
            data["game_id"] = "fixture-game"
        lines.append(f"export const {name}: {type_name} = {json.dumps(data, indent=2)};\n")
    content = "\n".join(lines)
    if check:
        if not TARGET.exists() or TARGET.read_text(encoding="utf-8") != content:
            raise AssertionError("Frontend fixtures are stale. Run export_frontend_fixtures.py.")
    else:
        TARGET.parent.mkdir(parents=True, exist_ok=True)
        TARGET.write_text(content, encoding="utf-8")
        print(f"Generated {TARGET}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check", action="store_true", help="Check committed fixtures without writing"
    )
    generate(check=parser.parse_args().check)
