from copy import deepcopy
from types import SimpleNamespace

import pytest
from conftest import normal_rations

from app.game.events import event_view, seeded_rng
from app.game.models import GameError
from app.game.research import RESEARCH_CHOICES, science_view
from app.storage import GameStore


@pytest.fixture
def research_state(state):
    state.resources.update(scientific_tools=1, eva_batteries=10, repair_kits=10, electricity=100)
    return state


def force_roll(monkeypatch, roll):
    monkeypatch.setattr(
        "app.game.events.seeded_rng",
        lambda state, purpose: (
            SimpleNamespace(random=lambda: roll)
            if purpose.startswith("outcome:")
            else seeded_rng(state, purpose)
        ),
    )


@pytest.mark.parametrize("choice", RESEARCH_CHOICES, ids=lambda choice: choice.id)
@pytest.mark.parametrize("succeeded", [True, False])
def test_planned_work_credits_only_success_and_spends_real_supplies(
    quiet_engine, research_state, monkeypatch, choice, succeeded
):
    force_roll(monkeypatch, 0 if succeeded else 0.999999)
    before = deepcopy(research_state)
    after, report = quiet_engine.advance_week(
        research_state, 1, normal_rations(research_state), choice.id, "alex"
    )
    assert research_state == before
    assert report["event"]["success"] == succeeded
    assert report["event"]["costs"] == choice.costs
    assert after.resources["scientific_tools"] == 1
    assert after.resources["research_data"] == (2 if succeeded else 0)
    assert science_view(after, quiet_engine.definitions)["status"] == (
        "partial" if succeeded else "not_started"
    )
    assert sum(gain["amount"] for gain in report["event"]["objective_progress"]) == int(succeeded)
    assert after.weeks_completed == 1
    assert len(after.history) == 1


@pytest.mark.parametrize(
    "event_id,choice_id,objective_id",
    [
        ("geology_window", "kit_sampling", "geology"),
        ("geology_window", "basic_sampling", "geology"),
        ("seismic_signal", "analyze_seismic", "seismology"),
        ("antenna_drift", "align_antenna", "instruments"),
        ("antenna_drift", "remote_antenna", "instruments"),
    ],
)
def test_matching_event_actions_contribute_to_the_same_targets(
    quiet_engine, research_state, monkeypatch, event_id, choice_id, objective_id
):
    force_roll(monkeypatch, 0)
    research_state.current_event_id = event_id
    after, report = quiet_engine.advance_week(
        research_state, 1, normal_rations(research_state), choice_id, "alex"
    )
    assert report["event"]["objective_progress"][0]["objective_id"] == objective_id
    progress = science_view(after, quiet_engine.definitions)["objectives"]
    assert next(entry for entry in progress if entry["id"] == objective_id)["progress"] == 1


def test_points_and_archiving_do_not_substitute_for_objective_work(quiet_engine, research_state):
    research_state.resources["research_data"] = 100
    research_state.current_event_id = "seismic_signal"
    after, report = quiet_engine.advance_week(
        research_state, 1, normal_rations(research_state), "archive_seismic"
    )
    assert after.resources["research_data"] == 101
    assert report["event"]["objective_progress"] == []
    assert science_view(after, quiet_engine.definitions)["status"] == "not_started"


def test_missing_equipment_is_unavailable_and_rejection_is_atomic(quiet_engine, state):
    view = event_view(state, quiet_engine.definitions)
    choice = next(choice for choice in view["choices"] if choice["id"] == "research_geology")
    assert not choice["available"]
    assert any("Field science kit" in reason for reason in choice["unavailable_reasons"])
    before = deepcopy(state)
    with pytest.raises(GameError, match="Field science kit"):
        quiet_engine.advance_week(state, 1, normal_rations(state), "research_geology", "alex")
    assert state == before


def test_research_does_not_repair_the_current_incident(quiet_engine, research_state, monkeypatch):
    force_roll(monkeypatch, 0)
    research_state.current_event_id = "solar_failure"
    research_state.solar_efficiency = 0.75
    after, _ = quiet_engine.advance_week(
        research_state, 1, normal_rations(research_state), "research_geology", "alex"
    )
    assert after.solar_efficiency == 0.75
    assert after.resources["repair_kits"] == research_state.resources["repair_kits"]


def test_completed_work_is_capped_and_its_planned_task_is_removed(
    quiet_engine, research_state, monkeypatch
):
    force_roll(monkeypatch, 0)
    state = research_state
    for _ in range(2):
        state, _ = quiet_engine.advance_week(
            state, state.current_week, normal_rations(state), "research_geology", "alex"
        )
    progress = science_view(state, quiet_engine.definitions)["objectives"][0]
    assert progress["completed"] and progress["progress"] == progress["target"] == 2
    assert not any(
        c["id"] == "research_geology"
        for c in event_view(state, quiet_engine.definitions)["choices"]
    )
    with pytest.raises(GameError, match="Unknown choice"):
        quiet_engine.advance_week(
            state, state.current_week, normal_rations(state), "research_geology", "alex"
        )
    state.current_event_id = "geology_window"
    state, report = quiet_engine.advance_week(
        state, state.current_week, normal_rations(state), "basic_sampling", "alex"
    )
    assert report["event"]["objective_progress"] == []
    assert science_view(state, quiet_engine.definitions)["objectives"][0]["progress"] == 2


def test_science_can_be_complete_even_when_survival_fails(
    quiet_engine, research_state, monkeypatch
):
    force_roll(monkeypatch, 0)
    state = research_state
    for choice_id in (
        "research_geology",
        "research_geology",
        "research_seismic",
        "research_instrument",
    ):
        state, _ = quiet_engine.advance_week(
            state, state.current_week, normal_rations(state), choice_id, "alex"
        )
    assert science_view(state, quiet_engine.definitions)["status"] == "complete"
    for crew in state.crew:
        crew.health = 1
    state.resources["oxygen"] = 0
    state.oxygen_efficiency = 0
    state, _ = quiet_engine.advance_week(
        state, state.current_week, normal_rations(state), "continue"
    )
    result = quiet_engine.state_view(state)["results"]
    assert result["ending"] == "mission_failure"
    assert result["science"]["status"] == "complete"
    assert result["science"]["completed_objectives"] == 3


def test_survival_can_be_perfect_without_scientific_progress(quiet_engine):
    state = quiet_engine.create_game(
        "alpha", ["alex", "maya"], {"food_packs": 5, "water_containers": 8}, 42
    )
    for _ in range(12):
        state, _ = quiet_engine.advance_week(
            state, state.current_week, normal_rations(state), "continue"
        )
    result = quiet_engine.state_view(state)["results"]
    assert result["ending"] == "perfect_handover"
    assert result["science"]["status"] == "not_started"


def test_retries_reads_and_stale_turns_never_duplicate_science(quiet_engine, monkeypatch):
    force_roll(monkeypatch, 0)
    store = GameStore(quiet_engine)
    game = store.create("alpha", ["alex"], {"scientific_tools": 1, "eva_batteries": 3}, 42)
    game_id = game["game_id"]
    body = {
        "request_id": "science-first",
        "expected_week": 1,
        "rations": {"alex": {"food": "normal", "water": "normal"}},
        "event_choice_id": "research_geology",
        "selected_crew_id": "alex",
    }
    first = store.submit(game_id, body)
    second = store.submit(game_id, {**body, "request_id": "science-second", "expected_week": 2})
    assert store.submit(game_id, body) == first
    with pytest.raises(GameError, match="Outdated"):
        store.submit(game_id, {**body, "request_id": "stale"})
    assert (
        store.get(game_id) == store.get(game_id) == {"game_id": game_id, "state": second["state"]}
    )
    assert second["state"]["science"]["objectives"][0]["progress"] == 2
    assert len(second["state"]["history"]) == 2


def test_http_contract_previews_and_returns_committed_objective_credit(client, monkeypatch):
    force_roll(monkeypatch, 0)
    response = client.post(
        "/api/games",
        json={
            "station_id": "alpha",
            "crew_ids": ["alex"],
            "cargo": {"scientific_tools": 1, "eva_batteries": 2},
            "random_seed": 42,
        },
    )
    assert response.status_code == 201
    game = response.json()
    choice = next(
        c for c in game["state"]["current_event"]["choices"] if c["id"] == "research_geology"
    )
    assert choice["action_type"] == "research"
    assert choice["objective_rewards"][0]["objective_id"] == "geology"
    body = {
        "expected_week": 1,
        "request_id": "api-science",
        "rations": {"alex": {"food": "normal", "water": "normal"}},
        "event_choice_id": "research_geology",
        "selected_crew_id": "alex",
    }
    path = f"/api/games/{game['game_id']}/turn"
    response = client.post(path, json=body)
    assert response.status_code == 200
    result = response.json()
    assert result["state"]["science"]["objectives"][0]["progress"] == 1
    assert result["turn_outcome"]["event"]["objective_progress"] == choice["objective_rewards"]
    assert client.post(path, json=body).json() == result
