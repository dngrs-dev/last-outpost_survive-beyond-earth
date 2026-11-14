from copy import deepcopy
from dataclasses import replace

import pytest
from conftest import with_event

from app.game.events import (
    QUIET_WEEK,
    apply_effects,
    choice_reasons,
    eligible_events,
    event_view,
    resolve_choice,
    select_event,
    success_probability,
)
from app.game.models import Effects, GameError, Ration


def test_event_eligibility_and_cooldown(engine, state):
    first = {event.id for event in eligible_events(state, engine.definitions, engine.rules)}
    assert first == {"solar_failure", "medical_emergency"}
    state.current_week = 3
    state.used_event_ids = ["solar_failure", "medical_emergency"]
    eligible = {e.id for e in eligible_events(state, engine.definitions, engine.rules)}
    assert eligible == set(engine.definitions.events) - {"solar_failure", "medical_emergency"}


def test_neutral_fallback(engine, state):
    state.used_event_ids = ["solar_failure", "medical_emergency"]
    assert select_event(state, engine.definitions, engine.rules) == QUIET_WEEK


def test_seeded_selection(engine):
    first = engine.create_game("alpha", ["alex"], {}, 123)
    second = engine.create_game("alpha", ["alex"], {}, 123)
    assert first == second
    assert {
        engine.create_game("alpha", ["alex"], {}, seed).current_event_id for seed in range(30)
    } == {"solar_failure", "medical_emergency"}


def test_selection_uses_relative_weights(engine, state):
    events = {
        key: replace(event, weight=1000 if key == "solar_failure" else 1)
        for key, event in engine.definitions.events.items()
    }
    definitions = replace(engine.definitions, events=events)
    selected = []
    for seed in range(100):
        state.random_seed = seed
        selected.append(select_event(state, definitions, engine.rules).id)
    assert selected.count("solar_failure") > 95


def test_profession_and_trait_bonuses(engine, state):
    choice = engine.definitions.events["solar_failure"].choices[1]
    assert success_probability(state, choice, state.crew[0]) == 0.8
    assert success_probability(state, choice, state.crew[1]) == 0.5


def test_living_medic_improves_treatment(engine, state):
    choice = engine.definitions.events["medical_emergency"].choices[0]
    assert success_probability(state, choice, state.crew[0]) == 0.95
    state.crew[1].health = 0
    assert success_probability(state, choice, state.crew[0]) == 0.75


def test_choice_requirements(engine, state):
    choice = engine.definitions.events["solar_failure"].choices[0]
    assert not choice_reasons(state, choice, engine.definitions, state.crew[0])
    assert "engineer" in " ".join(choice_reasons(state, choice, engine.definitions, state.crew[1]))
    state.crew[0].health = 0
    assert "living astronaut" in " ".join(
        choice_reasons(state, choice, engine.definitions, state.crew[0])
    )


def test_required_items_are_retained(engine, state):
    choice = replace(
        engine.definitions.events["solar_failure"].choices[0],
        required_items={"medicine_kits": 2},
    )
    reasons = choice_reasons(state, choice, engine.definitions, state.crew[0])
    assert any("Medicine kits" in reason for reason in reasons)
    state.resources["medicine"] = 2
    assert not choice_reasons(state, choice, engine.definitions, state.crew[0])
    resolve_choice(state, choice, state.crew[0])
    assert state.resources["medicine"] == 2


def test_crew_size_requirement(engine, state):
    state.crew[1].health = 0
    choice = engine.definitions.events["oxygen_fault"].choices[1]
    assert any(
        "2 living" in reason
        for reason in choice_reasons(state, choice, engine.definitions, state.crew[0])
    )


@pytest.mark.parametrize("probability,succeeded", [(0, False), (1, True)])
def test_guaranteed_outcomes_and_costs(engine, state, probability, succeeded):
    state.current_event_id = "solar_failure"
    state.solar_efficiency = 0.5
    choice = replace(
        engine.definitions.events["solar_failure"].choices[0], success_chance=probability
    )
    report = resolve_choice(state, choice, state.crew[0])
    assert report["success"] is succeeded
    assert state.resources["repair_kits"] == 0
    assert state.resources["eva_batteries"] == 0
    assert state.resources["oxygen"] == 28
    assert state.solar_efficiency == (0.75 if succeeded else 0.5)
    assert state.crew[0].health == (100 if succeeded else 75)


def test_seeded_outcomes(engine, state):
    state.current_event_id = "solar_failure"
    second = deepcopy(state)
    choice = engine.definitions.events["solar_failure"].choices[0]
    assert resolve_choice(state, choice, state.crew[0]) == resolve_choice(
        second, choice, second.crew[0]
    )
    assert state == second


def test_persistent_effect_and_no_read_mutations(engine, state):
    state = with_event(state, "solar_failure")
    apply_effects(state, Effects(solar_efficiency=-0.25), None)
    before = deepcopy(state)
    assert event_view(state, engine.definitions) == event_view(state, engine.definitions)
    assert state == before
    after, report = engine.advance_week(
        state, 1, {crew.id: Ration("normal", "normal") for crew in state.crew}, "ignore"
    )
    assert report["survival"]["electricity_generated"] == 18
    assert after.solar_efficiency <= 0.75


def test_effects_clamp_health_and_resources(state):
    state.crew[1].health = 0
    apply_effects(state, Effects(crew_health=100, target="all", solar_efficiency=2), None)
    assert state.crew[0].health == 100
    assert state.crew[1].health == 0
    assert state.solar_efficiency == 1
    apply_effects(state, Effects(resources={"food": -1000}, oxygen_efficiency=-2), None)
    assert state.resources["food"] == 0
    assert state.oxygen_efficiency == 0


def test_injury_traits(engine):
    state = engine.create_game("alpha", ["lin", "sam"], {}, 42)
    for crew in state.crew:
        crew.health = 100
    apply_effects(state, Effects(crew_health=-10, target="all"), None)
    assert [crew.health for crew in state.crew] == [88, 92]


def test_unavailable_choices_explain_why(engine, state):
    state = with_event(state, "solar_failure")
    state.resources["repair_kits"] = 0
    view = event_view(state, engine.definitions)
    assert not view["choices"][0]["available"]
    assert "repair_kits" in " ".join(view["choices"][0]["unavailable_reasons"])
    assert next(choice for choice in view["choices"] if choice["id"] == "ignore")["available"]


def test_invalid_decision_atomic(engine, state):
    state = with_event(state, "solar_failure")
    before = deepcopy(state)
    with pytest.raises(GameError, match="engineer"):
        engine.advance_week(
            state,
            1,
            {crew.id: Ration("normal", "normal") for crew in state.crew},
            "engineer_repair",
            "maya",
        )
    assert state == before
