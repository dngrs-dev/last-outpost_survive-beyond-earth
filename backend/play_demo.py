"""Play a reproducible twelve-week example through the running HTTP API.

Usage: python play_demo.py [http://127.0.0.1:8000] [seed]
"""

import json
import sys
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen
from uuid import uuid4


def api(base_url: str, path: str, body: dict | None = None) -> dict:
    request = Request(
        f"{base_url.rstrip('/')}/api{path}",
        data=json.dumps(body).encode() if body is not None else None,
        headers={"Content-Type": "application/json"},
    )
    with urlopen(request, timeout=10) as response:
        return json.load(response)


def main() -> None:
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"
    seed = int(sys.argv[2]) if len(sys.argv) > 2 else 42
    game = api(
        base_url,
        "/games",
        {
            "station_id": "alpha",
            "crew_ids": ["alex", "maya", "lin", "sam"],
            "cargo": {
                "food_packs": 8,
                "water_containers": 16,
                "repair_kits": 7,
                "eva_batteries": 7,
                "medicine_kits": 7,
            },
            "random_seed": seed,
        },
    )
    print(f"Game {game['game_id']} | seed {seed}")
    state = game["state"]
    while state["status"] == "running":
        event = state["current_event"]
        choice = next(choice for choice in event["choices"] if choice["available"])
        selected = None
        if choice["requires_crew"]:
            selected = max(
                (candidate for candidate in choice["eligible_crew"] if candidate["available"]),
                key=lambda candidate: candidate["success_probability"],
            )["crew_id"]
        living = [crew for crew in state["crew"] if crew["alive"]]
        levels = {}
        for resource in ("food", "water"):
            normal_cost = sum(crew["ration_options"]["normal"][resource] for crew in living)
            levels[resource] = (
                "normal" if state["resources"][resource] >= normal_cost else "emergency"
            )
        response = api(
            base_url,
            f"/games/{game['game_id']}/turn",
            {
                "expected_week": state["current_week"],
                "request_id": str(uuid4()),
                "rations": {crew["id"]: levels for crew in living},
                "event_choice_id": choice["id"],
                "selected_crew_id": selected,
            },
        )
        outcome = response["turn_outcome"]
        result = "success" if outcome["event"]["success"] else "failure"
        print(f"Week {state['current_week']:2}: {event['title']} | {choice['text']} | {result}")
        state = response["state"]
    print(json.dumps(state["results"], indent=2))


if __name__ == "__main__":
    try:
        main()
    except HTTPError as error:
        sys.exit(f"API error {error.code}: {error.read().decode()}")
    except URLError as error:
        sys.exit(f"Cannot reach the backend: {error.reason}. Start uvicorn first.")
