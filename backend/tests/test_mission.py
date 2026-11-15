from copy import deepcopy
from dataclasses import replace

import pytest
from conftest import launch_cargo, normal_rations

from app.game.engine import GameEngine
from app.game.models import GameError, Ration


def test_week_progression(quiet_engine, state, rations):
    before = deepcopy(state)
    after, report = quiet_engine.advance_week(state, 1, rations, "continue")
    assert state == before
    assert after.current_week == 2
    assert after.weeks_completed == 1
    assert after.history == [report]
    assert after.used_event_ids == ["quiet_week"]
    assert quiet_engine.state_view(after)["mission_days"] == {"start": 8, "end": 14}


def test_full_twelve_week_perfect_handover(quiet_engine):
    state = quiet_engine.create_game(
        "alpha",
        ["alex", "maya"],
        launch_cargo(
            quiet_engine, "alpha", {"food_packs": 5, "water_containers": 8, "repair_kits": 2}
        ),
        42,
    )
    for week in range(1, 13):
        state, _ = quiet_engine.advance_week(
            state,
            week,
            normal_rations(state),
            "continue",
            assignments=[{"crew_id": "alex", "activity_id": "service_water_recovery"}]
            if week == 8
            else [{"crew_id": "alex", "activity_id": "service_co2_scrubber"}]
            if week == 7
            else [],
        )
    assert state.status == "completed"
    assert state.ending == "perfect_handover"
    assert state.current_week == 12
    assert state.weeks_completed == 12
    assert len(state.history) == 12
    assert state.current_event_id is None
    view = quiet_engine.state_view(state)
    assert view["current_event"] is None
    assert view["weeks_remaining"] == 0
    assert view["results"]["surviving_crew_ids"] == ["alex", "maya"]


def test_successful_handover(quiet_engine, state):
    state.weeks_completed = 12
    state.current_week = 12
    state.solar_efficiency = 0.6
    quiet_engine.check_game_over(state)
    assert state.ending == "successful_handover"


@pytest.mark.parametrize("damage", ["systems", "provisions", "survivor_target"])
def test_emergency_handover(quiet_engine, state, damage):
    state.weeks_completed = 12
    state.current_week = 12
    if damage == "systems":
        state.solar_efficiency = 0.25
    elif damage == "provisions":
        state.resources["food"] = 0
    else:
        state.crew[0].health = 0
        missions = {
            key: replace(value, minimum_survivors=2)
            for key, value in quiet_engine.definitions.missions.items()
        }
        quiet_engine = GameEngine(replace(quiet_engine.definitions, missions=missions))
    quiet_engine.check_game_over(state)
    assert state.status == "completed"
    assert state.ending == "emergency_handover"


def test_total_crew_death(quiet_engine, state):
    state.resources["oxygen"] = 0
    state.oxygen_efficiency = 0
    for crew in state.crew:
        crew.health = 1
    state, _ = quiet_engine.advance_week(state, 1, normal_rations(state), "continue")
    assert state.status == "failed"
    assert state.ending == "mission_failure"
    assert all(not crew.alive for crew in state.crew)
    assert "All astronauts" in state.flags["failure_reason"]


def test_catastrophic_station_failure(quiet_engine, state):
    state.solar_efficiency = state.oxygen_efficiency = 0
    state.resources["oxygen"] = state.resources["electricity"] = 0
    state, _ = quiet_engine.advance_week(state, 1, normal_rations(state), "continue")
    assert any(crew.alive for crew in state.crew)
    assert state.status == "failed"
    assert "uninhabitable" in state.flags["failure_reason"]


def test_cannot_advance_completed_game(quiet_engine, state):
    state.weeks_completed = 12
    quiet_engine.check_game_over(state)
    with pytest.raises(GameError) as error:
        quiet_engine.advance_week(state, 1, normal_rations(state), "continue")
    assert error.value.status_code == 409


def test_stale_week(quiet_engine, state, rations):
    with pytest.raises(GameError) as error:
        quiet_engine.advance_week(state, 2, rations, "continue")
    assert error.value.status_code == 409


def test_event_death_removes_weekly_consumption(engine, state):
    state.current_event_id = "solar_failure"
    state.crew[0].health = 50
    state.crew[0].injury_multiplier = 3
    event = engine.definitions.events["solar_failure"]
    choices = [replace(event.choices[0], success_chance=0), *event.choices[1:]]
    events = {**engine.definitions.events, event.id: replace(event, choices=choices)}
    engine = GameEngine(replace(engine.definitions, events=events))
    after, report = engine.advance_week(state, 1, normal_rations(state), "engineer_repair", "alex")
    assert not after.crew[0].alive
    assert report["survival"]["oxygen_required"] == 3
    assert report["survival"]["ration_costs"]["food"] == 0.9
    assert report["deaths"] == ["alex"]


def test_combined_event_and_ration_budget(engine, state):
    event = engine.definitions.events["medical_emergency"]
    choices = [replace(event.choices[0], costs={"food": 1}), *event.choices[1:]]
    events = {**engine.definitions.events, event.id: replace(event, choices=choices)}
    engine = GameEngine(replace(engine.definitions, events=events))
    state.current_event_id = event.id
    state.resources["food"] = 2.5
    original = deepcopy(state)
    with pytest.raises(GameError, match="combined"):
        engine.advance_week(state, 1, normal_rations(state), "treat", "alex")
    assert state == original


def test_no_provision_softlock(quiet_engine, state):
    state.resources["food"] = state.resources["water"] = 0
    for _ in range(3):
        rations = {crew.id: Ration("emergency", "emergency") for crew in state.crew if crew.alive}
        state, _ = quiet_engine.advance_week(state, state.current_week, rations, "continue")
        if state.status != "running":
            break
    assert state.status == "failed"


def test_event_mission_reproducible_and_winnable(engine):
    def play():
        state = engine.create_game(
            "alpha",
            list(engine.definitions.crew)[:4],
            launch_cargo(
                engine,
                "alpha",
                {
                    "food_packs": 8,
                    "water_containers": 16,
                    "repair_kits": 7,
                    "eva_batteries": 7,
                    "medicine_kits": 7,
                },
            ),
            42,
        )
        for _ in range(12):
            if state.status != "running":
                break
            view = engine.state_view(state)
            choices = view["current_event"]["choices"]
            choice = next(choice for choice in choices if choice["available"])
            selected = None
            if choice["requires_crew"]:
                selected = max(
                    (c for c in choice["eligible_crew"] if c["available"]),
                    key=lambda c: c["success_probability"],
                )["crew_id"]
            state, _ = engine.advance_week(
                state,
                state.current_week,
                normal_rations(state),
                choice["id"],
                selected,
                support_crew_ids=[
                    c["crew_id"]
                    for c in choice["support_candidates"]
                    if c["available"] and c["crew_id"] != selected
                ][: max(0, choice["minimum_crew"] - 1)]
                if choice["requires_crew"]
                else [],
            )
        return state

    first = play()
    assert first == play()
    assert first.status == "completed"
    assert first.ending in {"perfect_handover", "successful_handover"}
