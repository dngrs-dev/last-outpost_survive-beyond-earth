from copy import deepcopy

import pytest

from app.game.events import get_event, success_probability
from app.game.models import GameError, Ration


def rations(state):
    return {crew.id: Ration("normal", "normal") for crew in state.crew if crew.alive}


def test_ten_distinct_researched_profiles_and_individual_costs(engine):
    catalog = engine.catalog()
    assert len(catalog["crew"]) == len({crew["id"] for crew in catalog["crew"]}) == 10
    assert len({crew["specialty"] for crew in catalog["crew"]}) == 10
    for crew in catalog["crew"]:
        assert crew["training_source"].startswith("https://www.nasa.gov/")
        assert crew["normal_ration_cost"]["food"] == pytest.approx(crew["food_multiplier"])
        assert crew["normal_ration_cost"]["water"] == pytest.approx(2 * crew["water_multiplier"])


def test_specialist_bonus_applies_to_the_assigned_astronaut(engine):
    state = engine.create_game("alpha", ["inez", "sam"], {}, 42)
    choice = engine.definitions.events["solar_failure"].choices[1]
    assert success_probability(state, choice, state.crew[0]) == 0.85
    assert success_probability(state, choice, state.crew[1]) == 0.6


def test_medical_specialist_helps_other_patients_only_while_alive(engine):
    state = engine.create_game("alpha", ["sam", "elena"], {}, 42)
    choice = engine.definitions.events["medical_emergency"].choices[0]
    assert success_probability(state, choice, state.crew[0]) == 0.95
    state.crew[1].health = 0
    assert success_probability(state, choice, state.crew[0]) == 0.65


def test_power_cells_add_energy_without_changing_generation(quiet_engine):
    state = quiet_engine.create_game("alpha", ["nora"], {"power_cells": 2}, 42)
    assert state.resources["electricity"] == 54
    assert state.solar_efficiency == 1


@pytest.mark.parametrize(
    "choice_id,resource,system",
    [
        ("clean_array", "dust_kits", "solar_efficiency"),
        ("install_regulator", "oxygen_regulators", "oxygen_efficiency"),
    ],
)
def test_maintenance_consumes_equipment_once_and_persists(
    quiet_engine, choice_id, resource, system
):
    state = quiet_engine.create_game("alpha", ["jules"], {resource: 1}, 42)
    setattr(state, system, 0.5)
    after, outcome = quiet_engine.advance_week(state, 1, rations(state), choice_id, "jules")
    assert outcome["event"]["success"]
    assert getattr(after, system) == 0.7
    assert after.resources[resource] == 0
    assert state.resources[resource] == 1
    before = deepcopy(after)
    with pytest.raises(GameError, match=resource):
        quiet_engine.advance_week(after, 2, rations(after), choice_id, "jules")
    assert after == before


def test_cannot_spend_maintenance_supplies_on_a_fully_working_system(quiet_engine):
    state = quiet_engine.create_game("alpha", ["alex"], {"dust_kits": 1}, 42)
    with pytest.raises(GameError, match="full condition"):
        quiet_engine.advance_week(state, 1, rations(state), "clean_array", "alex")
    assert state.resources["dust_kits"] == 1


def test_scanner_is_retained_but_medicine_is_consumed(engine):
    state = engine.create_game("alpha", ["alex"], {"diagnostic_tools": 1}, 42)
    state.crew[0].health = 40
    assert get_event(state, engine.definitions).id == "medical_emergency"
    medicine = state.resources["medicine"]
    after, report = engine.advance_week(state, 1, rations(state), "guided_treatment", "alex")
    assert report["event"]["effects"]["health_changes"][0]["after"] == 60
    assert after.resources["diagnostic_tools"] == 1
    assert after.resources["medicine"] == medicine - 1


def test_scanner_cargo_limit_and_missing_equipment_are_authoritative(engine):
    with pytest.raises(GameError, match="At most 1"):
        engine.create_game("alpha", ["alex"], {"diagnostic_tools": 2})
    state = engine.create_game("alpha", ["alex"], {}, 42)
    with pytest.raises(GameError, match="scanner"):
        engine.advance_week(state, 1, rations(state), "guided_treatment", "alex")
