import math
from copy import deepcopy
from types import SimpleNamespace

import pytest

from app.game.events import apply_effects, choice_reasons, get_event, seeded_rng
from app.game.loader import load_definitions
from app.game.models import GameError, Ration

LIBRARY = load_definitions()
DECISIONS = [(event.id, choice.id) for event in LIBRARY.events.values() for choice in event.choices]


def test_fifteen_sourced_events_and_all_stations_have_the_complete_pool(definitions):
    assert len(definitions.events) == 15
    assert {event.category for event in definitions.events.values()} == {
        "hazard",
        "opportunity",
        "recovery",
    }
    for event in definitions.events.values():
        assert event.source_url.startswith(
            ("https://www.nasa.gov/", "https://science.nasa.gov/", "https://history.nasa.gov/")
        )
        assert len(event.science_context) >= 30
        assert any(not choice.requires_crew and not choice.costs for choice in event.choices)
    for mission in definitions.missions.values():
        assert set(mission.event_ids) == set(definitions.events)


@pytest.mark.parametrize("event_id,choice_id", DECISIONS)
@pytest.mark.parametrize("outcome_roll", [0.0, 0.999999])
def test_every_authored_choice_resolves_atomically_with_valid_supplies(
    engine, monkeypatch, event_id, choice_id, outcome_roll
):
    monkeypatch.setattr(
        "app.game.events.seeded_rng",
        lambda state, purpose: (
            SimpleNamespace(random=lambda: outcome_roll)
            if purpose.startswith("outcome:")
            else seeded_rng(state, purpose)
        ),
    )
    state = engine.create_game("alpha", ["alex", "maya", "lin", "sam"], {}, 42)
    state.current_event_id = event_id
    state.resources = {name: 100.0 for name in state.resources}
    state.solar_efficiency = state.oxygen_efficiency = 0.5
    for crew in state.crew:
        crew.health = 60
    event = engine.definitions.events[event_id]
    apply_effects(state, event.on_start, None)
    choice = next(
        choice for choice in get_event(state, engine.definitions).choices if choice.id == choice_id
    )
    actor = (
        next(
            (
                crew
                for crew in state.crew
                if not choice_reasons(state, choice, engine.definitions, crew)
            ),
            None,
        )
        if choice.requires_crew
        else None
    )
    assert not choice.requires_crew or actor is not None
    original = deepcopy(state)
    after, report = engine.advance_week(
        state,
        1,
        {crew.id: Ration("normal", "normal") for crew in state.crew},
        choice_id,
        actor.id if actor else None,
    )
    assert state == original
    assert report["event"]["event_id"] == event_id
    assert report["event"]["costs"] == choice.costs
    assert all(math.isfinite(value) and value >= 0 for value in after.resources.values())
    assert 0 <= after.solar_efficiency <= 1 and 0 <= after.oxygen_efficiency <= 1
    assert all(0 <= crew.health <= 100 for crew in after.crew)
    assert after.resources["scientific_tools"] == 100


def test_first_twelve_weeks_prioritize_distinct_eligible_events(engine):
    state = engine.create_game("alpha", ["alex", "maya"], {}, 42)
    seen = set()
    for week in range(1, 13):
        if week > 1:
            state.current_week = week
            engine.prepare_event(state)
        assert state.current_event_id not in seen
        seen.add(state.current_event_id)
        state.used_event_ids.append(state.current_event_id)


def test_missing_sealant_is_explained_without_spending_a_turn(engine):
    state = engine.create_game("alpha", ["alex"], {}, 42)
    state.current_event_id = "impact_puncture"
    original = deepcopy(state)
    with pytest.raises(GameError, match="sealant_packs"):
        engine.advance_week(state, 1, {"alex": Ration("normal", "normal")}, "seal_pressure", "alex")
    assert state == original


def test_science_yields_data_instead_of_survival_supplies(definitions):
    for event_id in ("geology_window", "seismic_signal"):
        for choice in definitions.events[event_id].choices:
            assert not (choice.success_effects.resources.keys() - {"research_data"})
