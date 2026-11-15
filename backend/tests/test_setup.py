from copy import deepcopy
from dataclasses import replace

import pytest
from conftest import launch_cargo

from app.game.engine import GameEngine
from app.game.models import GameError


@pytest.mark.parametrize("count", [1, 2, 3, 4])
def test_valid_crew_selection(quiet_engine, count):
    crew_ids = list(quiet_engine.definitions.crew)[:count]
    state = quiet_engine.create_game("alpha", crew_ids, launch_cargo(quiet_engine, "alpha", {}), 42)
    assert len(state.crew) == count
    assert all(crew.health == 100 for crew in state.crew)
    assert state.current_week == 1


@pytest.mark.parametrize(
    "crew_ids, message",
    [
        ([], "between"),
        (["alex"] * 5, "between"),
        (["alex", "alex"], "Duplicate"),
        (["stranger"], "Unknown"),
    ],
)
def test_invalid_crew(quiet_engine, crew_ids, message):
    with pytest.raises(GameError, match=message):
        quiet_engine.create_game("alpha", crew_ids, launch_cargo(quiet_engine, "alpha", {}))


def test_unknown_station(engine):
    with pytest.raises(GameError) as error:
        engine.create_game("beta", ["alex"], launch_cargo(engine, "beta", {}))
    assert error.value.status_code == 404


def test_cargo_totals(quiet_engine):
    assert quiet_engine.calculate_cargo({"food_packs": 2, "oxygen_tanks": 1}) == {
        "mass_kg": 8,
        "volume_l": 20,
    }


@pytest.mark.parametrize("quantity", [-1, 1.5, True, "2", 1_000_001])
def test_invalid_quantities(quiet_engine, quantity):
    with pytest.raises(GameError, match="whole numbers"):
        quiet_engine.calculate_cargo({"food_packs": quantity})


def test_unknown_cargo(quiet_engine):
    with pytest.raises(GameError, match="Unknown cargo"):
        quiet_engine.calculate_cargo({"fuel": 0})


def test_mass_limit_independent_of_volume(quiet_engine):
    with pytest.raises(GameError, match="mass limit"):
        quiet_engine.calculate_cargo({"water_containers": 37})


def test_volume_limit_independent_of_mass(quiet_engine):
    with pytest.raises(GameError, match="volume limit"):
        quiet_engine.calculate_cargo({"oxygen_tanks": 21})


def test_exact_limits(quiet_engine):
    assert quiet_engine.calculate_cargo({"water_containers": 36})["mass_kg"] == 180
    assert quiet_engine.calculate_cargo({"oxygen_tanks": 20})["volume_l"] == 240


def test_starting_resources_and_isolation(quiet_engine):
    before = deepcopy(quiet_engine.definitions)
    first = quiet_engine.create_game(
        "alpha", ["alex"], launch_cargo(quiet_engine, "alpha", {"water_containers": 2}), 42
    )
    second = quiet_engine.create_game(
        "alpha", ["alex"], launch_cargo(quiet_engine, "alpha", {}), 42
    )
    assert first.resources["water"] == 42
    assert second.resources["water"] == 32
    first.crew[0].health = 0
    first.resources["food"] = 0
    assert second.crew[0].health == 100
    assert quiet_engine.definitions == before


def test_architecture_supports_eight_crew(quiet_engine):
    definitions = deepcopy(quiet_engine.definitions)
    for index in range(4):
        crew = replace(definitions.crew["alex"], id=f"extra-{index}")
        definitions.crew[crew.id] = crew
    expanded = GameEngine(definitions, replace(quiet_engine.rules, max_crew=8))
    assert (
        len(
            expanded.create_game(
                "alpha", list(definitions.crew)[:8], launch_cargo(expanded, "alpha", {})
            ).crew
        )
        == 8
    )
