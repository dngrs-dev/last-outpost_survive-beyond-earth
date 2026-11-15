from copy import deepcopy

import pytest
from conftest import launch_cargo, normal_rations

from app.game.events import choice_views, success_probability
from app.game.health import REST, capacity_reasons, condition_view, resolve_provisions
from app.game.models import GameError, Ration
from app.game.projects import clear_unavailable_workers, finish_manual_work
from app.game.research import RESEARCH_CHOICES
from app.game.survival import simulate_week
from app.storage import GameStore


def simulate(engine, state, rations=None, **kwargs):
    return simulate_week(
        state,
        engine.definitions.stations[state.station_id],
        rations or normal_rations(state),
        engine.rules,
        lighting=engine.definitions.lighting,
        **kwargs,
    )


def test_food_debt_accumulates_before_damage_and_full_provisions_recover_gradually(
    quiet_engine,
    state,
):
    reduced = {c.id: Ration("reduced", "normal") for c in state.crew}
    for _ in range(3):
        state, report = simulate(quiet_engine, state, reduced)
        assert report["health_changes"][0]["food_penalty"] == 0
    assert state.crew[0].nutrition_deficit == 0.9
    state, report = simulate(quiet_engine, state, reduced)
    assert state.crew[0].nutrition_deficit == 1.2
    assert report["health_changes"][0]["food_penalty"] == 2
    after, report = simulate(quiet_engine, state)
    assert after.crew[0].nutrition_deficit == 0.95
    assert report["health_changes"][0]["food_penalty"] == 0
    assert after.crew[0].health == 100


def test_actual_stock_depletion_counts_against_individual_normal_needs(quiet_engine, state):
    state.resources["food"] = 0.2  # normal roster need 2; emergency request 0.8
    rations = {c.id: Ration("emergency", "normal") for c in state.crew}
    after, report = simulate(quiet_engine, state, rations)
    assert report["ration_costs"]["food"] == 0.2
    for crew, change in zip(after.crew, report["health_changes"], strict=True):
        assert change["food_received_fraction"] == 0.1
        assert crew.nutrition_deficit == 0.9
        assert crew.hydration_deficit == 0


@pytest.mark.parametrize(
    "working,resting,recovery,nutrition,hydration",
    [
        (False, False, 2, 0.75, 0.3),
        (False, True, 5, 0.6, 0.05),
        (True, False, 0, 0.75, 0.3),
    ],
)
def test_recovery_requires_time_and_rest_gives_a_limited_bonus(
    quiet_engine,
    state,
    working,
    resting,
    recovery,
    nutrition,
    hydration,
):
    actor = state.crew[0]
    actor.health, actor.nutrition_deficit, actor.hydration_deficit = 60, 1, 0.8
    after, report = simulate(
        quiet_engine,
        state,
        working_crew={actor.id} if working else set(),
        resting_crew={actor.id} if resting else set(),
    )
    change = report["health_changes"][0]
    assert after.crew[0].health == 60 + recovery
    assert change["recovery"] == recovery
    assert after.crew[0].nutrition_deficit == nutrition
    assert after.crew[0].hydration_deficit == hydration
    assert state.crew[0].health == 60


@pytest.mark.parametrize(
    "safe,food,water,alive",
    [
        (False, 1, 1, True),
        (True, 0.7, 1, True),
        (True, 1, 0.7, True),
        (True, 1, 1, False),
    ],
)
def test_rest_never_heals_through_ongoing_deprivation_unsafe_air_or_death(
    state,
    safe,
    food,
    water,
    alive,
):
    actor = state.crew[0]
    actor.health = 50 if alive else 0
    result = resolve_provisions(actor, food, water, safe=safe, working=False, resting=True)
    assert result["recovery"] == 0


@pytest.mark.parametrize(
    "health,nutrition,hydration,light,eva",
    [
        (100, 0, 0, True, True),
        (49, 0, 0, True, False),
        (100, 1, 0, True, False),
        (100, 0, 0.5, True, False),
        (24, 0, 0, False, False),
        (100, 2.5, 0, False, False),
        (100, 0, 1, False, False),
    ],
)
def test_capacity_depends_on_condition_and_each_deficit(
    state,
    health,
    nutrition,
    hydration,
    light,
    eva,
):
    actor = state.crew[0]
    actor.health, actor.nutrition_deficit, actor.hydration_deficit = health, nutrition, hydration
    assert (not capacity_reasons(actor, "light")) == light
    assert (not capacity_reasons(actor, "eva")) == eva
    assert (not capacity_reasons(actor, "strenuous")) == eva
    assert capacity_reasons(actor, "rest") == capacity_reasons(actor, "care") == []


def test_risky_work_loses_performance_but_patient_treatment_is_not_penalized(quiet_engine, state):
    actor = state.crew[0]
    work = next(c for c in RESEARCH_CHOICES if c.id == "research_geology")
    care = quiet_engine.definitions.events["medical_emergency"].choices[0]
    initial_work = success_probability(state, work, actor)
    initial_care = success_probability(state, care, actor)
    actor.health, actor.nutrition_deficit = 60, 0.9
    assert success_probability(state, work, actor) < initial_work
    assert success_probability(state, care, actor) == initial_care
    assert success_probability(state, REST, actor) == 1


def test_unfit_support_rejects_entire_week_without_mutation(quiet_engine):
    state = quiet_engine.create_game(
        "alpha", ["alex", "lin", "maya", "sam"], launch_cargo(quiet_engine, "alpha", {}), 42
    )
    state.current_event_id = "oxygen_fault"
    state.crew[1].nutrition_deficit = 1
    before = deepcopy(state)
    with pytest.raises(GameError, match="Support crew"):
        quiet_engine.advance_week(
            state,
            1,
            normal_rations(state),
            "recalibrate",
            "alex",
            support_crew_ids=["lin"],
        )
    assert state == before
    choice = next(
        c
        for c in quiet_engine.state_view(state)["current_event"]["choices"]
        if c["id"] == "recalibrate"
    )
    assert not next(c for c in choice["support_candidates"] if c["crew_id"] == "lin")["available"]


def test_every_incident_retains_a_no_crew_escape_for_a_critical_roster(quiet_engine, state):
    for crew in state.crew:
        crew.health = 20
        crew.nutrition_deficit, crew.hydration_deficit = 3, 1.1
    for event in quiet_engine.definitions.events.values():
        choices = choice_views(state, quiet_engine.definitions, event.choices)
        assert any(c["available"] and not c["requires_crew"] for c in choices), event.id
    assert all(c["available"] for c in choice_views(state, quiet_engine.definitions, [REST]))


def test_critical_crew_can_rest_but_cannot_work_or_double_book(quiet_engine, state):
    state.crew[0].nutrition_deficit = 2.6
    original = deepcopy(state)
    with pytest.raises(GameError, match="Critical"):
        quiet_engine.advance_week(
            state,
            1,
            normal_rations(state),
            "continue",
            assignments=[{"crew_id": "alex", "activity_id": "research_geology"}],
        )
    assert state == original
    with pytest.raises(GameError, match="more than one"):
        quiet_engine.advance_week(
            state,
            1,
            normal_rations(state),
            "continue",
            assignments=[{"crew_id": "alex", "activity_id": REST.id}] * 2,
        )
    after, report = quiet_engine.advance_week(
        state,
        1,
        normal_rations(state),
        "continue",
        assignments=[{"crew_id": "alex", "activity_id": REST.id}],
    )
    assert after.crew[0].nutrition_deficit == 2.2
    assert report["assignments"][0]["status"] == "completed"
    assert report["science_gains"] == []


def test_incident_injury_cancels_newly_unfit_work_and_returns_supplies(quiet_engine):
    state = quiet_engine.create_game(
        "alpha", ["alex", "lin"], launch_cargo(quiet_engine, "alpha", {"scientific_tools": 1}), 42
    )
    state.crew[1].health = 50
    state.current_event_id = "solar_particle_alert"
    batteries = state.resources["eva_batteries"]
    after, report = quiet_engine.advance_week(
        state,
        1,
        normal_rations(state),
        "storm_wait",
        assignments=[{"crew_id": "lin", "activity_id": "research_geology"}],
    )
    assert after.crew[1].alive
    assert report["assignments"][0]["status"] == "cancelled"
    assert "unfit" in report["assignments"][0]["reason"]
    assert after.resources["eva_batteries"] == batteries
    assert not report["science_gains"]
    assert not report["survival"]["health_changes"][1]["worked"]


def test_unfit_project_worker_released_without_losing_phase_progress(quiet_engine, state):
    finish_manual_work(state, "research_seismic", "alex", False)
    state.crew[0].nutrition_deficit = 1
    log = []
    clear_unavailable_workers(state, log)
    assert state.projects[0].assigned_crew_id is None
    assert state.projects[0].phase_index == 0
    assert len(log) == 1
    state.resources["scientific_tools"] = 1
    options = quiet_engine.state_view(state)["assignment_options"]
    work = next(a for a in options if a["id"] == "project:seismic-1")
    assert not next(c for c in work["eligible_crew"] if c["crew_id"] == "alex")["available"]
    assert next(c for c in work["eligible_crew"] if c["crew_id"] == "maya")["available"]


def test_idempotent_retries_and_reads_do_not_repeat_debt_or_recovery(quiet_engine):
    store = GameStore(quiet_engine)
    game = store.create("alpha", ["alex", "maya"], launch_cargo(store.engine, "alpha", {}), 42)
    body = {
        "expected_week": 1,
        "request_id": "debt",
        "event_choice_id": "continue",
        "selected_crew_id": None,
        "rations": {c: {"food": "reduced", "water": "reduced"} for c in ["alex", "maya"]},
    }
    first = store.submit(game["game_id"], body)
    assert first["state"]["crew"][0]["nutrition_deficit"] == 0.3
    next_body = {
        **body,
        "expected_week": 2,
        "request_id": "recover",
        "rations": {c: {"food": "normal", "water": "normal"} for c in ["alex", "maya"]},
        "assignments": [{"crew_id": "alex", "activity_id": REST.id}],
    }
    second = store.submit(game["game_id"], next_body)
    assert store.submit(game["game_id"], body) == first
    assert store.submit(game["game_id"], next_body) == second
    assert store.get(game["game_id"])["state"] == second["state"]
    assert store.get(game["game_id"])["state"]["crew"][1]["nutrition_deficit"] == 0.05


def test_condition_reads_and_ration_outlook_are_pure_and_match_funded_rations(quiet_engine, state):
    state.crew[0].nutrition_deficit = 0.9
    original = deepcopy(state)
    view = quiet_engine.state_view(state)
    forecast = view["crew"][0]["ration_outlook"]["reduced"]
    after, report = simulate(
        quiet_engine, state, {c.id: Ration("reduced", "reduced") for c in state.crew}
    )
    assert forecast["nutrition_deficit"] == after.crew[0].nutrition_deficit
    assert forecast["water_damage"] == report["health_changes"][0]["water_penalty"]
    assert condition_view(state.crew[0])["nutrition_recovery_weeks"] == 4
    assert state == original


def test_unsafe_air_blocks_condition_recovery_even_while_resting(quiet_engine, state):
    state.crew[0].health = 80
    state.resources["co2"] = 30
    state.co2_efficiency = 0
    after, report = simulate(quiet_engine, state, resting_crew={"alex"})
    assert after.crew[0].health < 80
    assert report["health_changes"][0]["recovery"] == 0


def test_large_debt_prevents_perfect_handover_despite_high_health(quiet_engine, state):
    for key in ("food", "water", "oxygen", "electricity", "medicine", "repair_kits"):
        state.resources[key] = 100
    state.weeks_completed = quiet_engine.definitions.missions[state.mission_id].duration_weeks
    healthy = deepcopy(state)
    quiet_engine.check_game_over(healthy)
    assert healthy.ending == "perfect_handover"
    state.crew[0].nutrition_deficit = 1
    quiet_engine.check_game_over(state)
    assert state.ending != "perfect_handover"
