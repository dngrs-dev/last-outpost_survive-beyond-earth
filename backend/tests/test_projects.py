from copy import deepcopy
from types import SimpleNamespace

import pytest
from conftest import normal_rations

from app.game.events import seeded_rng
from app.game.models import GameError
from app.storage import GameStore


@pytest.fixture
def project_state(quiet_engine, monkeypatch):
    force_roll(monkeypatch, 0)
    return quiet_engine.create_game(
        "alpha",
        ["alex", "lin", "sam"],
        {
            "scientific_tools": 1,
            "eva_batteries": 8,
            "food_packs": 8,
            "water_containers": 16,
            "repair_kits": 5,
        },
        42,
    )


def force_roll(monkeypatch, roll):
    monkeypatch.setattr(
        "app.game.events.seeded_rng",
        lambda state, purpose: (
            SimpleNamespace(random=lambda: roll)
            if purpose.startswith("outcome:")
            else seeded_rng(state, purpose)
        ),
    )


def week(engine, state, work=None, crew="lin", controls=None):
    return engine.advance_week(
        state,
        state.current_week,
        normal_rations(state),
        "continue",
        assignments=[{"crew_id": crew, "activity_id": work}] if work else [],
        project_orders=controls,
    )


def control(state, action):
    return [{"project_id": state.projects[0].id, "action": action}]


def test_five_week_lifecycle_frees_recording_crew_and_awards_only_on_completion(
    quiet_engine, project_state
):
    original = deepcopy(project_state)
    state, report = week(quiet_engine, project_state, "research_seismic")
    assert project_state == original
    assert report["science_gains"] == []
    assert state.resources["research_data"] == 0
    assert state.projects[0].phase_index == 1
    assert state.projects[0].progress == 0  # no recording during deployment
    assert state.projects[0].assigned_crew_id is None
    assert quiet_engine.state_view(state)["research_projects"][0]["estimated_completion_week"] == 5
    for count in range(1, 4):
        state, report = week(quiet_engine, state, "research_geology" if count < 3 else None)
        assert sum(u["electricity_used"] for u in report["project_updates"]) == 2
        assert state.projects[0].progress == (count if count < 3 else 0)
        assert not any(g["objective_id"] == "seismology" for g in report["science_gains"])
    assert state.projects[0].phase_index == 2
    state, report = week(quiet_engine, state, "project:seismic-1", crew="alex")
    assert state.projects[0].status == "completed"
    assert report["science_gains"][0]["objective_id"] == "seismology"
    assert state.weeks_completed == 5
    before_data = state.resources["research_data"]
    state, report = week(quiet_engine, state)
    assert state.resources["research_data"] == before_data
    assert report["science_gains"] == []
    assert quiet_engine.state_view(state)["research_projects"][0]["estimated_completion_week"] == 5


@pytest.mark.parametrize("action", ["pause", "interrupt"])
def test_pause_interrupt_and_resume_preserve_recordings(quiet_engine, project_state, action):
    state, _ = week(quiet_engine, project_state, "research_seismic")
    state, _ = week(quiet_engine, state)
    state, report = week(quiet_engine, state, controls=control(state, action))
    assert state.projects[0].status == "paused" and state.projects[0].progress == 1
    assert sum(u["electricity_used"] for u in report["project_updates"]) == 0
    assert (
        quiet_engine.state_view(state)["research_projects"][0]["estimated_completion_week"] is None
    )
    state, _ = week(quiet_engine, state)
    assert state.projects[0].progress == 1
    state, _ = week(quiet_engine, state, controls=control(state, "resume"))
    assert state.projects[0].progress == 2


def test_power_shortage_waits_without_charging_then_solar_recovery_resumes(
    quiet_engine, project_state
):
    state, _ = week(quiet_engine, project_state, "research_seismic")
    state.resources["electricity"] = 1
    state.solar_efficiency = 0
    state, report = week(quiet_engine, state)
    assert state.projects[0].progress == 0
    assert report["project_updates"][0]["electricity_used"] == 0
    # Restore the array; partial dusk and night still cannot fund recording.
    state.solar_efficiency = 1
    for _ in range(3):
        state, _ = week(quiet_engine, state)
    assert state.projects[0].progress == 1


def test_failed_deployment_can_be_interrupted_and_reassigned(
    quiet_engine, project_state, monkeypatch
):
    force_roll(monkeypatch, 0.999999)
    state, report = week(quiet_engine, project_state, "research_seismic")
    assert state.projects[0].phase_index == 0 and state.resources["research_data"] == 0
    assert state.resources["eva_batteries"] == project_state.resources["eva_batteries"] - 1
    assert report["science_gains"] == []
    state, _ = week(quiet_engine, state, controls=control(state, "interrupt"))
    force_roll(monkeypatch, 0)
    state, _ = week(quiet_engine, state, "project:seismic-1", crew="sam")
    assert len(state.projects) == 1 and state.projects[0].phase_index == 1


def test_dead_worker_is_released_but_work_is_retained(quiet_engine, project_state, monkeypatch):
    project_state.crew[1].health = 1
    force_roll(monkeypatch, 0.999999)
    state, _ = week(quiet_engine, project_state, "research_seismic")
    assert not state.crew[1].alive
    assert state.projects[0].assigned_crew_id is None
    assert state.projects[0].phase_index == 0
    force_roll(monkeypatch, 0)
    state, _ = week(quiet_engine, state, "project:seismic-1", crew="alex")
    assert state.projects[0].phase_index == 1


def test_failed_analysis_retains_three_recorded_weeks(quiet_engine, project_state, monkeypatch):
    state, _ = week(quiet_engine, project_state, "research_seismic")
    for _ in range(3):
        state, _ = week(quiet_engine, state)
    force_roll(monkeypatch, 0.999999)
    failed, report = week(quiet_engine, state, "project:seismic-1")
    assert failed.projects[0].phase_index == 2
    assert failed.projects[0].status == "active" and report["science_gains"] == []
    force_roll(monkeypatch, 0)
    done, _ = week(quiet_engine, failed, "project:seismic-1", crew="sam")
    assert done.projects[0].status == "completed"


def test_illegal_project_orders_are_atomic(quiet_engine, project_state):
    state, _ = week(quiet_engine, project_state, "research_seismic")
    before = deepcopy(state)
    for controls in ([{"project_id": "missing", "action": "resume"}], control(state, "pause") * 2):
        with pytest.raises(GameError):
            week(quiet_engine, state, controls=controls)
        assert state == before
    with pytest.raises(GameError, match="Only one worker"):
        quiet_engine.advance_week(
            project_state,
            1,
            normal_rations(project_state),
            "continue",
            assignments=[
                {"crew_id": id, "activity_id": "research_seismic"} for id in ("alex", "lin")
            ],
        )


def test_project_retry_and_reads_never_repeat_progress_or_cost(quiet_engine, project_state):
    store = GameStore(quiet_engine)
    game = store.create("alpha", ["lin"], {"scientific_tools": 1, "eva_batteries": 2}, 42)
    body = {
        "expected_week": 1,
        "request_id": "deploy",
        "event_choice_id": "continue",
        "selected_crew_id": None,
        "assignments": [{"crew_id": "lin", "activity_id": "research_seismic"}],
        "rations": {"lin": {"food": "normal", "water": "normal"}},
    }
    first = store.submit(game["game_id"], body)
    second = store.submit(
        game["game_id"], {**body, "expected_week": 2, "request_id": "record", "assignments": []}
    )
    assert store.submit(game["game_id"], body) == first
    assert store.get(game["game_id"])["state"] == second["state"]
    assert second["state"]["research_projects"][0]["phase_progress"] == 1


def test_recording_continues_after_the_deployment_astronaut_dies(quiet_engine, project_state):
    state, _ = week(quiet_engine, project_state, "research_seismic")
    state.crew[1].health = 1
    state.current_event_id = "solar_particle_alert"
    after, _ = quiet_engine.advance_week(
        state, state.current_week, normal_rations(state), "storm_wait"
    )
    assert not after.crew[1].alive
    assert after.projects[0].progress == 1
    assert after.projects[0].assigned_crew_id is None


def test_completed_project_reward_and_control_replays_are_exact(quiet_engine, project_state):
    store = GameStore(quiet_engine)
    game = store.create("alpha", ["lin"], {"scientific_tools": 1, "eva_batteries": 2}, 42)
    for number, activity in enumerate(
        ("research_seismic", None, None, None, "project:seismic-1"), 1
    ):
        body = {
            "expected_week": number,
            "request_id": f"project-{number}",
            "event_choice_id": "continue",
            "selected_crew_id": None,
            "assignments": [{"crew_id": "lin", "activity_id": activity}] if activity else [],
            "rations": {"lin": {"food": "normal", "water": "normal"}},
        }
        result = store.submit(game["game_id"], body)
    assert result["state"]["research_projects"][0]["status"] == "completed"
    assert result["state"]["resources"]["research_data"] == 2
    assert store.submit(game["game_id"], body) == result
    assert store.get(game["game_id"])["state"]["resources"]["research_data"] == 2
    with pytest.raises(GameError, match="completed"):
        store.submit(
            game["game_id"],
            {
                **body,
                "expected_week": 6,
                "request_id": "late-control",
                "assignments": [],
                "project_orders": [{"project_id": "seismic-1", "action": "resume"}],
            },
        )
    assert store.get(game["game_id"])["state"] == result["state"]


def test_interruption_and_manual_work_conflict_is_atomic(quiet_engine, project_state, monkeypatch):
    force_roll(monkeypatch, 0.999999)
    state, _ = week(quiet_engine, project_state, "research_seismic")
    before = deepcopy(state)
    with pytest.raises(GameError, match="paused or interrupted"):
        week(quiet_engine, state, "project:seismic-1", controls=control(state, "interrupt"))
    assert state == before


def test_project_completion_and_event_credit_share_a_single_target(quiet_engine, project_state):
    state, _ = week(quiet_engine, project_state, "research_seismic")
    for _ in range(3):
        state, _ = week(quiet_engine, state)
    state.current_event_id = "seismic_signal"
    after, report = quiet_engine.advance_week(
        state,
        state.current_week,
        normal_rations(state),
        "analyze_seismic",
        "alex",
        support_crew_ids=["sam"],
        assignments=[{"crew_id": "lin", "activity_id": "project:seismic-1"}],
    )
    assert after.projects[0].status == "completed"
    assert (
        sum(g["amount"] for g in report["science_gains"] if g["objective_id"] == "seismology") == 1
    )
    assert report["assignments"][0]["outcome"]["objective_progress"] == []
