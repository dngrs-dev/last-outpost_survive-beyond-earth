from copy import deepcopy

import pytest

from app.game.models import GameError, Ration
from app.game.survival import ration_cost, ration_requirements, simulate_week


def run_week(engine, state, rations):
    return simulate_week(state, engine.definitions.stations["alpha"], rations, engine.rules)


def test_normal_consumption_and_pure_calculation(quiet_engine, state, rations):
    original = deepcopy(state)
    after, report = run_week(quiet_engine, state, rations)
    assert state == original
    assert report["ration_costs"] == {"food": 2.0, "water": 4.2}
    assert after.resources["food"] == 18
    assert after.resources["water"] == pytest.approx(27.8)
    assert after.resources["oxygen"] == 38  # 30 + 14 - 6
    assert after.resources["electricity"] == 38  # 30 + 24 - 16
    assert [crew.health for crew in after.crew] == [100, 100]


@pytest.mark.parametrize(
    "level,multiplier,food_penalty,water_penalty",
    [("normal", 1, 0, 0), ("reduced", 0.7, 2, 4), ("emergency", 0.4, 6, 10)],
)
def test_ration_levels(quiet_engine, state, level, multiplier, food_penalty, water_penalty):
    rations = {crew.id: Ration(level, level) for crew in state.crew}
    after, report = run_week(quiet_engine, state, rations)
    assert report["ration_costs"]["food"] == pytest.approx(2 * multiplier)
    assert report["ration_costs"]["water"] == pytest.approx(4.2 * multiplier)
    assert after.crew[0].health == 100 - food_penalty - water_penalty


def test_food_and_water_independent(quiet_engine, state):
    rations = {crew.id: Ration("normal", "reduced") for crew in state.crew}
    after, report = run_week(quiet_engine, state, rations)
    assert report["ration_costs"] == {"food": 2, "water": 2.94}
    assert after.crew[0].health == 96


def test_traits_change_ration_costs(quiet_engine, state):
    alex = ration_cost(state.crew[0], Ration("normal", "normal"), quiet_engine.rules)
    maya = ration_cost(state.crew[1], Ration("normal", "normal"), quiet_engine.rules)
    assert alex == {"food": 1.1, "water": 2}
    assert maya == {"food": 0.9, "water": 2.2}


def test_repeated_rationing_and_recovery(quiet_engine, state):
    reduced = {crew.id: Ration("reduced", "reduced") for crew in state.crew}
    once, _ = run_week(quiet_engine, state, reduced)
    twice, report = run_week(quiet_engine, once, reduced)
    assert report["health_changes"][0]["food_penalty"] == 4
    assert report["health_changes"][0]["water_penalty"] == 6
    assert twice.crew[0].food_shortage_weeks == 2
    normal = {crew.id: Ration("normal", "normal") for crew in twice.crew}
    recovered, _ = run_week(quiet_engine, twice, normal)
    assert recovered.crew[0].food_shortage_weeks == 0
    assert recovered.crew[0].water_shortage_weeks == 0


def test_power_shortage_reduces_oxygen(quiet_engine, state, rations):
    state.solar_efficiency = 0.25
    state.resources["electricity"] = 0
    after, report = run_week(quiet_engine, state, rations)
    assert report["electricity_generated"] == 6
    assert report["life_support_power_fraction"] == 0.375
    assert report["oxygen_generated"] == 5.25
    assert after.resources["electricity"] == 0


def test_oxygen_efficiency(quiet_engine, state, rations):
    state.oxygen_efficiency = 0.5
    _, report = run_week(quiet_engine, state, rations)
    assert report["oxygen_generated"] == 7


def test_oxygen_shortage_and_death(quiet_engine, state, rations):
    state.resources["oxygen"] = 0
    state.oxygen_efficiency = 0
    state.crew[0].health = 20
    after, report = run_week(quiet_engine, state, rations)
    assert report["oxygen_shortage"] == 6
    assert after.crew[0].health == 0
    assert after.crew[1].health == 40
    assert report["health_changes"][0]["died"]


def test_dead_crew_consume_nothing(quiet_engine, state):
    state.crew[1].health = 0
    after, report = run_week(quiet_engine, state, {"alex": Ration("normal", "normal")})
    assert report["oxygen_required"] == 3
    assert report["ration_costs"] == {"food": 1.1, "water": 2}
    assert after.crew[1].health == 0


@pytest.mark.parametrize(
    "invalid",
    [
        {},
        {"alex": Ration("normal", "normal")},
        {"alex": Ration("no", "normal"), "maya": Ration("normal", "normal")},
    ],
)
def test_invalid_allocations(quiet_engine, state, invalid):
    with pytest.raises(GameError):
        ration_requirements(state, invalid, quiet_engine.rules)


def test_no_rations_for_dead_crew(quiet_engine, state, rations):
    state.crew[0].health = 0
    with pytest.raises(GameError, match="living astronaut"):
        ration_requirements(state, rations, quiet_engine.rules)


def test_unaffordable_normal_rations_rejected(quiet_engine, state, rations):
    state.resources["food"] = 0
    with pytest.raises(GameError, match="Insufficient food"):
        run_week(quiet_engine, state, rations)


def test_depleted_provisions_allow_starvation_instead_of_softlock(quiet_engine, state):
    state.resources = {key: 0 for key in state.resources}
    state.solar_efficiency = state.oxygen_efficiency = 0
    rations = {crew.id: Ration("emergency", "emergency") for crew in state.crew}
    after, report = run_week(quiet_engine, state, rations)
    assert all(value >= 0 for value in after.resources.values())
    assert report["ration_depletion_fractions"] == {"food": 1, "water": 1}
    assert report["ration_costs"] == {"food": 0, "water": 0}
    assert all(crew.health == 0 for crew in after.crew)
