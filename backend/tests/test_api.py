from concurrent.futures import ThreadPoolExecutor
from copy import deepcopy

import pytest
from conftest import turn_body
from fastapi.testclient import TestClient

from app.game.models import GameError
from app.main import create_app


def create_game(client, **changes):
    body = {"station_id": "alpha", "crew_ids": ["alex", "maya"], "cargo": {}, "random_seed": 42}
    body.update(changes)
    return client.post("/api/games", json=body)


def test_catalog(client):
    response = client.get("/api/catalog")
    assert response.status_code == 200
    catalog = response.json()
    assert len(catalog["stations"]) == 6
    assert len({station["lunar_site_id"] for station in catalog["stations"]}) == 6
    assert len(catalog["crew"]) == 10
    assert len(catalog["items"]) == 10
    assert catalog["limits"]["max_crew"] == 4
    assert catalog["missions"][0]["duration_weeks"] == 12


def test_creation_retrieval_and_turn(client):
    response = create_game(client)
    assert response.status_code == 201
    game = response.json()
    url = f"/api/games/{game['game_id']}"
    assert client.get(url).json() == game
    assert "ration_options" in game["state"]["crew"][0]
    after = client.post(f"{url}/turn", json=turn_body(game["state"]))
    assert after.status_code == 200
    assert after.json()["state"]["current_week"] == 2
    assert after.json()["turn_outcome"]["week"] == 1
    assert client.get(url).json()["state"] == after.json()["state"]


@pytest.mark.parametrize(
    "changes",
    [
        {"crew_ids": []},
        {"crew_ids": ["alex", "alex"]},
        {"crew_ids": ["nobody"]},
        {"crew_ids": ["alex"] * 5},
        {"cargo": {"food_packs": -1}},
        {"cargo": {"food_packs": 0.5}},
        {"cargo": {"food_packs": True}},
        {"cargo": {"food_packs": "1"}},
        {"cargo": {"bad_item": 1}},
        {"cargo": {"oxygen_tanks": 21}},
        {"random_seed": -1},
        {"random_seed": True},
        {"admin": True},
    ],
)
def test_invalid_creation_requests(client, changes):
    assert create_game(client, **changes).status_code == 422


def test_unknown_station(client):
    assert create_game(client, station_id="beta").status_code == 404


def test_unknown_game(client):
    assert client.get("/api/games/missing").status_code == 404
    game = create_game(client).json()
    assert client.post("/api/games/missing/turn", json=turn_body(game["state"])).status_code == 404


@pytest.mark.parametrize(
    "change",
    [
        "missing_ration",
        "unknown_crew",
        "bad_ration",
        "bad_choice",
        "bad_actor",
        "extra_field",
        "wrong_week",
        "bool_week",
    ],
)
def test_invalid_turn_does_not_change_state(client, change):
    game = create_game(client).json()
    url = f"/api/games/{game['game_id']}"
    body = turn_body(game["state"])
    expected_status = 422
    if change == "missing_ration":
        body["rations"].pop("alex")
    elif change == "unknown_crew":
        body["rations"]["missing"] = {"food": "normal", "water": "normal"}
    elif change == "bad_ration":
        body["rations"]["alex"]["food"] = "none"
    elif change == "bad_choice":
        body["event_choice_id"] = "made_up"
    elif change == "bad_actor":
        body["selected_crew_id"] = "nobody"
    elif change == "extra_field":
        body["succeeded"] = True
    elif change == "bool_week":
        body["expected_week"] = True
    else:
        body["expected_week"] = 2
        expected_status = 409
    response = client.post(f"{url}/turn", json=body)
    assert response.status_code == expected_status
    assert client.get(url).json() == game
    assert "Traceback" not in response.text


def test_duplicate_request_replays_original_result(client):
    game = create_game(client).json()
    url = f"/api/games/{game['game_id']}"
    body = turn_body(game["state"])
    first = client.post(f"{url}/turn", json=body)
    assert first.status_code == 200
    assert client.post(f"{url}/turn", json=body).json() == first.json()
    # Even after another week, retry returns the original response without reverting state.
    second_body = turn_body(first.json()["state"], "turn-2")
    second = client.post(f"{url}/turn", json=second_body)
    assert second.status_code == 200
    assert client.post(f"{url}/turn", json=body).json() == first.json()
    assert client.get(url).json()["state"]["current_week"] == 3


def test_conflicting_request_id_and_stale_week(client):
    game = create_game(client).json()
    url = f"/api/games/{game['game_id']}"
    body = turn_body(game["state"])
    assert client.post(f"{url}/turn", json=body).status_code == 200
    conflict = deepcopy(body)
    conflict["rations"]["alex"]["food"] = "reduced"
    assert client.post(f"{url}/turn", json=conflict).status_code == 409
    body["request_id"] = "different-request"
    assert client.post(f"{url}/turn", json=body).status_code == 409
    assert client.get(url).json()["state"]["current_week"] == 2


def test_simultaneous_different_turns_only_commit_once(client):
    game = create_game(client).json()
    store = client.app.state.store
    first = turn_body(game["state"], "first")
    second = turn_body(game["state"], "second")

    def submit(body):
        try:
            return store.submit(game["game_id"], body)
        except GameError as error:
            return error.status_code

    with ThreadPoolExecutor(max_workers=2) as pool:
        responses = list(pool.map(submit, [first, second]))
    assert sum(isinstance(response, dict) for response in responses) == 1
    assert 409 in responses
    assert store.get(game["game_id"])["state"]["weeks_completed"] == 1


def test_simultaneous_retries_have_identical_results(client):
    game = create_game(client).json()
    store = client.app.state.store
    body = turn_body(game["state"])
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(lambda _: store.submit(game["game_id"], body), range(2)))
    assert results[0] == results[1]
    assert store.get(game["game_id"])["state"]["weeks_completed"] == 1


def test_games_and_responses_are_isolated(client):
    first, second = create_game(client).json(), create_game(client).json()
    store = client.app.state.store
    body = turn_body(first["state"])
    result = store.submit(first["game_id"], body)
    result["state"]["resources"]["food"] = -100
    assert store.get(first["game_id"])["state"]["resources"]["food"] >= 0
    assert store.submit(first["game_id"], body)["state"]["resources"]["food"] >= 0
    assert store.get(second["game_id"])["state"]["current_week"] == 1


def test_cors_and_openapi(client):
    response = client.options(
        "/api/games",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
            "Access-Control-Request-Headers": "Content-Type",
        },
    )
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    schema = client.get("/openapi.json").json()
    assert "/api/games/{game_id}/turn" in schema["paths"]
    assert "GameStateResponse" in schema["components"]["schemas"]


def test_complete_api_mission_terminal_rejection_and_final_retry(quiet_engine):
    with TestClient(create_app(quiet_engine.definitions)) as client:
        game = create_game(client, cargo={"food_packs": 5, "water_containers": 8}).json()
        game_url = f"/api/games/{game['game_id']}"
        state = game["state"]
        for week in range(1, 13):
            body = turn_body(state, f"week-{week}")
            response = client.post(f"{game_url}/turn", json=body)
            assert response.status_code == 200
            state = response.json()["state"]
        assert state["status"] == "completed"
        assert state["ending"] == "perfect_handover"
        assert state["current_event"] is None
        assert len(state["history"]) == 12
        assert client.post(f"{game_url}/turn", json=body).json() == response.json()
        body["request_id"] = "after-completion"
        assert client.post(f"{game_url}/turn", json=body).status_code == 409
        assert client.get(game_url).json()["state"] == state


def test_unexpected_error_before_commit_does_not_mutate_game(client, monkeypatch):
    game = create_game(client).json()
    store = client.app.state.store
    body = turn_body(game["state"])
    original_view = store.engine.state_view

    def broken_view(state):
        raise RuntimeError("Simulated response construction error")

    monkeypatch.setattr(store.engine, "state_view", broken_view)
    with pytest.raises(RuntimeError, match="construction"):
        store.submit(game["game_id"], body)
    monkeypatch.setattr(store.engine, "state_view", original_view)
    assert store.get(game["game_id"]) == game
    assert store.submit(game["game_id"], body)["state"]["weeks_completed"] == 1
