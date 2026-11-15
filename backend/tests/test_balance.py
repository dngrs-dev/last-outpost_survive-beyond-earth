import json
from copy import deepcopy
from pathlib import Path

import pytest

from app.game.launch import minimum_cargo, recommended_cargo
from balance_missions import (
    OPERATIONAL_ENDINGS,
    benchmark,
    decision,
    model_digest,
    simulate,
    stars,
    wilson,
)


@pytest.mark.parametrize(
    "station_id", ["alpha", "oceanus", "fra_mauro", "hadley", "descartes", "taurus"]
)
def test_recommendations_fit_and_cover_objectives(engine, station_id):
    cargo = recommended_cargo(engine.definitions, station_id)
    engine.calculate_cargo(cargo)
    for item, quantity in minimum_cargo(engine.definitions, station_id).items():
        assert cargo[item] >= quantity
    assert (
        next(s for s in engine.catalog()["stations"] if s["id"] == station_id)["recommended_cargo"]
        == cargo
    )


@pytest.mark.parametrize(
    "station_id", ["alpha", "oceanus", "fra_mauro", "hadley", "descartes", "taurus"]
)
@pytest.mark.parametrize("policy", ["basic", "careful"])
def test_every_mission_has_legal_reproducible_complete_playthroughs(engine, station_id, policy):
    before = deepcopy(engine.definitions)
    first = simulate(engine, station_id, 10003, policy)
    assert first == simulate(engine, station_id, 10003, policy)
    assert first.status in {"completed", "failed"}
    assert 0 <= stars(first, engine.definitions) <= 3
    assert len(first.history) == first.weeks_completed
    assert engine.definitions == before


def test_strategy_improves_extreme_outcomes_without_reading_future_rng(engine):
    basic = [simulate(engine, "taurus", n, "basic") for n in range(20)]
    careful = [simulate(engine, "taurus", n, "careful") for n in range(20)]
    assert sum(s.ending in OPERATIONAL_ENDINGS for s in careful) > sum(
        s.ending in OPERATIONAL_ENDINGS for s in basic
    )
    state = engine.create_game(
        "alpha", ["alex", "maya", "lin", "sam"], recommended_cargo(engine.definitions, "alpha"), 1
    )
    before = deepcopy(state)
    first = decision(engine, state, "careful")
    state.random_seed = 999
    assert decision(engine, state, "careful") == first
    state.random_seed = before.random_seed
    assert state == before


def test_forgiving_easy_mission_smoke_and_separate_science(engine):
    report = benchmark(engine, 20, 10000, ["oceanus"])
    assert report["results"][0]["operational_success"] >= 0.9
    assert report["results"][1]["science"] >= report["results"][0]["science"]
    assert sum(report["results"][0]["stars"].values()) == 20


def test_wilson_endpoints_and_validation():
    assert wilson(0, 100) == [0, 0.037]
    assert wilson(100, 100) == [0.963, 1]
    assert wilson(50, 100) == [0.4038, 0.5962]
    for successes, trials in [(0, 0), (-1, 10), (11, 10)]:
        with pytest.raises(ValueError):
            wilson(successes, trials)


def test_no_survivors_cannot_receive_science_stars(engine):
    state = simulate(engine, "oceanus", 10000)
    assert stars(state, engine.definitions) == 3
    state.crew[0].health = 0
    assert stars(state, engine.definitions) == 2
    for person in state.crew:
        person.health = 0
    assert stars(state, engine.definitions) == 0


@pytest.mark.parametrize(
    "crew", [["alex", "lin"], ["maya", "nora", "sam"], ["rhea", "priya", "theo", "hao"]]
)
def test_alternative_teams_can_complete_a_legal_campaign(engine, crew):
    for station in ("oceanus", "taurus"):
        state = simulate(engine, station, 30000, "careful", crew)
        assert state.status != "running"
        assert state.initial_crew_size == len(crew)


def test_committed_balance_report_matches_current_definitions(engine):
    report = json.loads(
        (Path(__file__).parents[2] / "docs/mission-balance.json").read_text(encoding="utf-8")
    )
    assert report["model_digest"] == model_digest(engine), "Regenerate the backend balance report"
    assert report["runs_per_policy"] >= 200
    assert len(report["results"]) == 12
    rows = {(r["station"], r["policy"]): r for r in report["results"]}
    assert rows["oceanus", "basic"]["operational_success"] >= 0.9
    assert 0 < rows["taurus", "basic"]["operational_success"] <= 0.12
    assert (
        rows["taurus", "careful"]["operational_success"]
        > rows["taurus", "basic"]["operational_success"]
    )
    for row in report["results"]:
        assert sum(row["stars"].values()) == row["runs"]
        assert sum(row["endings"].values()) == row["runs"]
