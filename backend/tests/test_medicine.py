from copy import deepcopy
from types import SimpleNamespace

import pytest
from conftest import launch_cargo, normal_rations

from app.game.events import apply_effects, seeded_rng
from app.game.health import capacity_reasons
from app.game.medicine import CONDITIONS, add_condition, provide_care
from app.game.models import Effects, GameError, Ration


@pytest.fixture
def medical_state(quiet_engine, monkeypatch):
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
        ["alex", "maya", "lin", "sam"],
        launch_cargo(
            quiet_engine,
            "alpha",
            {
                "medicine_kits": 5,
                "scientific_tools": 1,
                "eva_batteries": 4,
                "repair_kits": 4,
                "food_packs": 8,
                "water_containers": 16,
            },
        ),
        42,
    )


def care(worker="maya", patient="alex", kind="sprain", activity="medical_care"):
    return {"crew_id": worker, "activity_id": activity, "patient_id": patient, "condition_id": kind}


def week(engine, state, orders, rations=None, event="continue", actor=None, support=None):
    return engine.advance_week(
        state,
        state.current_week,
        rations or normal_rations(state),
        event,
        actor,
        assignments=orders,
        support_crew_ids=support,
    )


@pytest.mark.parametrize("kind", CONDITIONS)
def test_authored_onset_is_visible_restrictive_and_does_not_stack(
    quiet_engine, medical_state, kind
):
    state = medical_state
    actor = state.crew[0]
    report = apply_effects(state, Effects(condition=kind), actor)
    assert report["medical_changes"][0]["action"] == "acquired"
    assert capacity_reasons(actor, "eva")
    assert not capacity_reasons(actor, "rest")
    provide_care(actor, 1, 1, kind)
    apply_effects(state, Effects(condition=kind), actor)
    assert len(actor.medical_conditions) == 1
    assert not actor.medical_conditions[0].stabilized
    assert actor.medical_conditions[0].care_points == 0
    view = quiet_engine.state_view(state)
    assert view["crew"][0]["medical_conditions"][0]["source_url"].startswith(
        "https://www.nasa.gov/"
    )
    assert view["crew"][0]["condition"]["status"] in {"critical", "serious"}


@pytest.mark.parametrize(
    "worker,scanner,remaining",
    [
        ("maya", 0, 1),
        ("sam", 0, 2),
        ("sam", 1, 1),
    ],
)
def test_care_reserves_medicine_and_both_slots_with_gradual_recovery(
    quiet_engine,
    medical_state,
    worker,
    scanner,
    remaining,
):
    state = medical_state
    patient = state.crew[0]
    patient.health = 70
    caregiver = next(c for c in state.crew if c.id == worker)
    caregiver.health = 70
    state.resources["diagnostic_tools"] = scanner
    add_condition(patient, "sprain", 0)
    before = deepcopy(state)
    after, report = week(quiet_engine, state, [care(worker=worker)])
    assert state == before
    assert after.crew[0].medical_conditions[0].remaining == remaining
    assert after.crew[0].health == 75
    assert next(c for c in after.crew if c.id == worker).health == 70
    assert after.resources["medicine"] == state.resources["medicine"] - 1
    assert after.resources["diagnostic_tools"] == scanner
    assert report["assignments"][0]["patient_id"] == "alex"
    assert report["science_gains"] == []


@pytest.mark.parametrize(
    "extra,event,actor,support",
    [
        ([{"crew_id": "alex", "activity_id": "crew_rest"}], "continue", None, []),
        ([care(worker="sam")], "continue", None, []),
        ([{"crew_id": "maya", "activity_id": "crew_rest"}], "continue", None, []),
        ([], "crew_repair", "alex", []),
        ([], "recalibrate", "sam", ["alex"]),
    ],
)
def test_patient_and_caregiver_cannot_be_double_booked(
    quiet_engine,
    medical_state,
    extra,
    event,
    actor,
    support,
):
    state = medical_state
    add_condition(state.crew[0], "sprain", 0)
    if event == "crew_repair":
        state.current_event_id = "solar_failure"
        # Light incident work still occupies the patient even though heavy work is restricted.
        event, actor = "remote_antenna", "alex"
        state.current_event_id = "antenna_drift"
    if event == "recalibrate":
        # Use an internal light two-person response to test support occupancy independently.
        state.current_event_id = "medical_emergency"
        event, actor = "team_treatment", "maya"
        support = ["alex"]
    before = deepcopy(state)
    with pytest.raises(GameError, match="more than one"):
        week(quiet_engine, state, [care(), *extra], event=event, actor=actor, support=support)
    assert state == before


@pytest.mark.parametrize(
    "order",
    [
        {"crew_id": "maya", "activity_id": "medical_care"},
        care(patient="missing"),
        care(kind="dust_irritation"),
        care(worker="alex"),
        care(activity="self_care"),
        {"crew_id": "sam", "activity_id": "crew_rest", "patient_id": "alex"},
    ],
)
def test_invalid_medical_targets_reject_atomically(quiet_engine, medical_state, order):
    add_condition(medical_state.crew[0], "sprain", 0)
    before = deepcopy(medical_state)
    with pytest.raises(GameError):
        week(quiet_engine, medical_state, [order])
    assert medical_state == before


def test_critical_solo_crew_can_stabilize_and_recover_using_self_care(quiet_engine):
    state = quiet_engine.create_game("alpha", ["alex"], launch_cargo(quiet_engine, "alpha", {}), 42)
    state.crew[0].health = 20
    add_condition(state.crew[0], "bleeding_wound", 0)
    assert capacity_reasons(state.crew[0], "light")
    after, report = week(
        quiet_engine, state, [care("alex", activity="self_care", kind="bleeding_wound")]
    )
    case = after.crew[0].medical_conditions[0]
    assert case.stabilized and case.remaining == 2
    assert after.crew[0].health == 25
    assert report["survival"]["health_changes"][0]["medical_penalty"] == 0
    assert report["assignments"][0]["status"] == "completed"


def test_urgent_wound_has_an_announced_onset_week_before_ongoing_damage(
    quiet_engine, medical_state
):
    state = medical_state
    add_condition(state.crew[0], "bleeding_wound", 1)
    once, report = week(quiet_engine, state, [])
    assert report["survival"]["health_changes"][0]["medical_penalty"] == 0
    twice, report = week(quiet_engine, once, [])
    assert twice.crew[0].medical_conditions[0].remaining == 3
    assert report["survival"]["health_changes"][0]["medical_penalty"] == 6
    assert twice.crew[0].health == 94


@pytest.mark.parametrize("unsafe", ["water", "air"])
def test_care_stabilizes_but_cannot_advance_recovery_without_support(
    quiet_engine,
    medical_state,
    unsafe,
):
    state = medical_state
    add_condition(state.crew[0], "bleeding_wound", 0)
    rations = normal_rations(state)
    if unsafe == "water":
        state.resources["water"] = state.resources["wastewater"] = 0
        rations = {c.id: Ration("normal", "emergency") for c in state.crew}
    else:
        state.resources["co2"], state.co2_efficiency = 20, 0
    after, report = week(quiet_engine, state, [care(kind="bleeding_wound")], rations)
    case = after.crew[0].medical_conditions[0]
    assert case.stabilized and case.remaining == 3
    assert after.resources["medicine"] == state.resources["medicine"] - 1
    assert report["survival"]["health_changes"][0]["recovery"] == 0
    assert report["survival"]["health_changes"][0]["medical_changes"][0]["action"] == "stalled"


def test_unstabilized_wounds_cannot_heal_and_can_be_fatal_after_warning(
    quiet_engine, medical_state
):
    state = medical_state
    state.crew[0].health = 5
    add_condition(state.crew[0], "bleeding_wound", 1)
    state, report = week(quiet_engine, state, [{"crew_id": "alex", "activity_id": "crew_rest"}])
    assert state.crew[0].health == 5
    assert report["survival"]["health_changes"][0]["recovery"] == 0
    state, report = week(quiet_engine, state, [])
    assert not state.crew[0].alive
    assert report["deaths"] == ["alex"]
    assert "alex" not in {
        c["crew_id"]
        for a in quiet_engine.state_view(state)["assignment_options"]
        for c in a["eligible_crew"]
    }


def test_dust_permits_internal_work_and_gastrointestinal_recovery_restores_capacity(medical_state):
    actor = medical_state.crew[0]
    add_condition(actor, "dust_irritation", 0)
    assert not capacity_reasons(actor, "strenuous")
    assert capacity_reasons(actor, "eva")
    actor.medical_conditions.clear()
    add_condition(actor, "gastrointestinal_illness", 0)
    assert capacity_reasons(actor, "strenuous")
    actor.medical_conditions[0].remaining = 1
    assert not capacity_reasons(actor, "strenuous")
    assert capacity_reasons(actor, "eva")


@pytest.mark.parametrize("who", ["caregiver", "patient"])
def test_incident_can_interrupt_care_and_refund_reserved_medicine(quiet_engine, medical_state, who):
    state = medical_state
    add_condition(state.crew[0], "sprain", 0)
    if who == "caregiver":
        state.crew[1].health = 25
    else:
        state.crew[0].health = 1
    state.current_event_id = "solar_particle_alert"
    after, report = week(quiet_engine, state, [care()], event="storm_wait")
    assert report["assignments"][0]["status"] == "cancelled"
    assert after.resources["medicine"] == state.resources["medicine"]
    assert after.crew[0].medical_conditions[0].remaining == 3
    assert not any(c.care_points for c in after.crew[0].medical_conditions)


def test_rest_retains_untreated_illness_until_supported_progress_completes(
    quiet_engine, medical_state
):
    state = medical_state
    add_condition(state.crew[0], "gastrointestinal_illness", 0)
    original_medicine = state.resources["medicine"]
    for remaining in (2, 1, 0):
        state, report = week(quiet_engine, state, [{"crew_id": "alex", "activity_id": "crew_rest"}])
        assert (state.crew[0].medical_conditions[0].remaining if remaining else 0) == remaining
    assert not state.crew[0].medical_conditions
    assert state.resources["medicine"] == original_medicine
    assert report["survival"]["health_changes"][0]["medical_changes"][0]["action"] == "resolved"


def test_care_and_independent_research_are_deterministic_in_any_order(quiet_engine, medical_state):
    add_condition(medical_state.crew[0], "sprain", 0)
    orders = [care(), {"crew_id": "sam", "activity_id": "research_geology"}]
    first = week(quiet_engine, medical_state, orders)
    assert first == week(quiet_engine, medical_state, list(reversed(orders)))
    assert first[1]["science_gains"][0]["objective_id"] == "geology"
    assert first[0].crew[0].medical_conditions[0].remaining == 1


def test_health_healing_does_not_erase_named_conditions(quiet_engine, medical_state):
    state = medical_state
    state.crew[0].health = 50
    add_condition(state.crew[0], "sprain", 0)
    apply_effects(state, Effects(crew_health=100), state.crew[0])
    assert state.crew[0].health == 100
    assert capacity_reasons(state.crew[0], "eva")
    before = deepcopy(state)
    quiet_engine.state_view(state)
    quiet_engine.state_view(state)
    assert state == before


def test_medical_http_contract_and_retries_do_not_repeat_care(client):
    game = client.post(
        "/api/games",
        json={
            "station_id": "alpha",
            "crew_ids": ["alex", "maya", "lin"],
            "cargo": {"medicine_kits": 2, "scientific_tools": 1, "eva_batteries": 2},
            "random_seed": 42,
        },
    ).json()
    body = {
        "expected_week": 1,
        "request_id": "medical-week",
        "event_choice_id": "rest",
        "rations": {c: {"food": "normal", "water": "normal"} for c in ("alex", "maya", "lin")},
        "assignments": [care(kind="dust_irritation")],
    }
    path = f"/api/games/{game['game_id']}/turn"
    response = client.post(path, json=body)
    assert response.status_code == 200, response.text
    result = response.json()
    assert not result["state"]["crew"][0]["medical_conditions"]
    assert result["turn_outcome"]["assignments"][0]["patient_id"] == "alex"
    assert client.post(path, json=body).json() == result
    assert client.get(f"/api/games/{game['game_id']}").json()["state"] == result["state"]
    assert client.post(path, json={**body, "assignments": []}).status_code == 409
