from copy import deepcopy
from types import SimpleNamespace

import pytest
from conftest import normal_rations

from app.game.events import seeded_rng
from app.game.models import GameError
from app.storage import GameStore


@pytest.fixture
def work_state(quiet_engine, monkeypatch):
    monkeypatch.setattr(
        "app.game.events.seeded_rng",
        lambda state, purpose: (
            SimpleNamespace(random=lambda: 0)
            if purpose.startswith("outcome:")
            else seeded_rng(state, purpose)
        ),
    )
    return quiet_engine.create_game(
        "alpha",
        ["alex", "lin", "sam", "maya"],
        {
            "scientific_tools": 1,
            "eva_batteries": 8,
            "repair_kits": 8,
            "food_packs": 8,
            "water_containers": 12,
        },
        42,
    )


def order(crew, activity="research_geology"):
    return {"crew_id": crew, "activity_id": activity}


def test_incident_and_three_assignments_resolve_together(quiet_engine, work_state):
    state = work_state
    state.current_event_id = "solar_failure"
    state.solar_efficiency = 0.75
    after, report = quiet_engine.advance_week(
        state,
        1,
        normal_rations(state),
        "engineer_repair",
        "alex",
        assignments=[order("lin"), order("sam"), order("maya", "research_seismic")],
    )
    assert after.solar_efficiency == 1
    assert len(report["assignments"]) == 3
    assert sum(g["amount"] for g in report["science_gains"]) == 2
    assert after.resources["eva_batteries"] == state.resources["eva_batteries"] - 4
    assert after.weeks_completed == 1
    assert quiet_engine.state_view(after)["science"]["objectives"][0]["progress"] == 2
    assert all(
        c["action_type"] == "event"
        for c in quiet_engine.state_view(state)["current_event"]["choices"]
    )


@pytest.mark.parametrize(
    "support,orders",
    [
        (["lin"], [order("lin")]),
        (["alex"], []),
        (["lin"], [order("sam"), order("sam", "research_seismic")]),
        ([], []),
        (["lin", "sam"], []),
        (["missing"], []),
    ],
)
def test_support_and_assignment_conflicts_reject_the_whole_plan(
    quiet_engine, work_state, support, orders
):
    state = work_state
    state.current_event_id = "oxygen_fault"
    before = deepcopy(state)
    with pytest.raises(GameError):
        quiet_engine.advance_week(
            state,
            1,
            normal_rations(state),
            "recalibrate",
            "alex",
            support_crew_ids=support,
            assignments=orders,
        )
    assert state == before


def test_explicit_support_is_occupied(quiet_engine, work_state):
    state = work_state
    state.current_event_id = "oxygen_fault"
    after, report = quiet_engine.advance_week(
        state,
        1,
        normal_rations(state),
        "recalibrate",
        "alex",
        support_crew_ids=["sam"],
        assignments=[order("lin")],
    )
    assert report["event"]["support_crew_ids"] == ["sam"]
    assert after.weeks_completed == 1


def test_combined_costs_are_reserved_and_cannot_use_future_generation(quiet_engine, work_state):
    state = work_state
    state.resources["electricity"] = 3
    before = deepcopy(state)
    with pytest.raises(GameError, match="all weekly actions"):
        quiet_engine.advance_week(
            state,
            1,
            normal_rations(state),
            "continue",
            assignments=[order("lin", "research_seismic"), order("sam", "research_instrument")],
        )
    assert state == before


def test_event_and_assignment_credit_share_the_same_cap(quiet_engine, work_state):
    state = work_state
    state.current_event_id = "geology_window"
    after, report = quiet_engine.advance_week(
        state,
        1,
        normal_rations(state),
        "kit_sampling",
        "lin",
        assignments=[order("alex"), order("sam")],
    )
    assert sum(g["amount"] for g in report["science_gains"]) == 2
    assert len(report["assignments"][1]["outcome"]["objective_progress"]) == 0
    assert quiet_engine.state_view(after)["science"]["objectives"][0]["progress"] == 2


def test_incident_death_cancels_work_and_refunds_reserved_cost(quiet_engine, work_state):
    state = work_state
    state.current_event_id = "solar_particle_alert"
    state.crew[1].health = 1
    before = state.resources["eva_batteries"]
    after, report = quiet_engine.advance_week(
        state, 1, normal_rations(state), "storm_wait", assignments=[order("lin")]
    )
    assert report["assignments"][0]["status"] == "cancelled"
    assert report["assignments"][0]["outcome"] is None
    assert after.resources["eva_batteries"] == before
    assert report["science_gains"] == []
    assert not any(
        c["crew_id"] == "lin"
        for a in quiet_engine.state_view(after)["assignment_options"]
        for c in a["eligible_crew"]
    )


def test_assignment_list_order_does_not_change_rng_or_results(quiet_engine, work_state):
    orders = [order("lin"), order("sam", "research_seismic")]
    first = quiet_engine.advance_week(
        work_state, 1, normal_rations(work_state), "continue", assignments=orders
    )
    second = quiet_engine.advance_week(
        work_state, 1, normal_rations(work_state), "continue", assignments=list(reversed(orders))
    )
    assert first == second


def test_parallel_week_replay_is_exact_and_does_not_award_again(quiet_engine, work_state):
    store = GameStore(quiet_engine)
    game = store.create("alpha", ["alex", "lin"], {"scientific_tools": 1}, 42)
    body = {
        "expected_week": 1,
        "request_id": "parallel",
        "selected_crew_id": None,
        "event_choice_id": "continue",
        "support_crew_ids": [],
        "assignments": [order("alex", "research_instrument"), order("lin", "research_seismic")],
        "rations": {id: {"food": "normal", "water": "normal"} for id in ("alex", "lin")},
    }
    first = store.submit(game["game_id"], body)
    assert store.submit(game["game_id"], body) == first
    assert store.get(game["game_id"])["state"]["history"] == [first["turn_outcome"]]
    with pytest.raises(GameError, match="already used"):
        store.submit(game["game_id"], {**body, "assignments": []})
