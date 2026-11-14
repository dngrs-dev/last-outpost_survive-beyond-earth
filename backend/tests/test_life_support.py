from copy import deepcopy

import pytest
from conftest import normal_rations

from app.game.events import apply_effects
from app.game.models import Effects, GameError, Ration


def step(engine, state, **kwargs):
    return engine.advance_week(
        state, state.current_week, normal_rations(state), "continue", **kwargs
    )


def test_recovery_uses_only_existing_wastewater_and_respects_water_accounting(quiet_engine, state):
    state.resources["oxygen"] = 0
    before = deepcopy(state)
    after, turn = step(quiet_engine, state)
    systems = turn["survival"]["life_support"]
    assert state == before
    assert systems["wastewater_processed"] == 4
    assert systems["water_recovered"] == 3.2
    assert systems["water_for_oxygen"] == 1.4
    assert after.resources["water"] == pytest.approx(32 - 4.2 + 3.2 - 1.4)
    assert after.resources["wastewater"] == pytest.approx(12 - 4 + 4.2 * 0.8)
    assert systems["co2_removed"] == 2


def test_newly_captured_water_waits_until_next_week(quiet_engine, state):
    state.resources["wastewater"] = 0
    after, report = step(quiet_engine, state)
    assert report["survival"]["life_support"]["water_recovered"] == 0
    assert after.resources["wastewater"] == pytest.approx(4.2 * 0.8)
    after, report = step(quiet_engine, after)
    assert report["survival"]["life_support"]["water_recovered"] > 0


def test_no_water_means_no_oxygen_production_even_with_power(quiet_engine, state):
    state.resources.update(water=0, wastewater=0, oxygen=0)
    rations = {c.id: Ration("normal", "emergency") for c in state.crew}
    after, report = quiet_engine.advance_week(state, 1, rations, "continue")
    assert report["survival"]["electricity_used"] > 0
    assert report["survival"]["oxygen_generated"] == 0
    assert report["survival"]["life_support"]["water_for_oxygen"] == 0


def test_water_limited_electrolysis_never_overdraws_the_reserve(quiet_engine, state):
    state.resources.update(water=4.3, wastewater=0, oxygen=0)
    after, report = step(quiet_engine, state)
    assert report["survival"]["oxygen_generated"] == pytest.approx(1)
    assert report["survival"]["life_support"]["water_for_oxygen"] == pytest.approx(0.1)
    assert after.resources["water"] == 0


def test_reserve_target_conserves_water_and_generator_power(quiet_engine, state):
    after, report = step(quiet_engine, state)
    assert report["survival"]["oxygen_generated"] == 0
    assert report["survival"]["life_support"]["power_components"]["oxygen_generation"] == 0
    assert after.resources["oxygen"] == 24


def test_blackout_stops_recovery_generation_and_removal(quiet_engine, state):
    state.resources.update(electricity=0, oxygen=0)
    state.solar_efficiency = 0
    after, report = step(quiet_engine, state)
    systems = report["survival"]["life_support"]
    assert systems["water_recovered"] == systems["oxygen_generated"] == systems["co2_removed"] == 0
    assert after.water_recovery_efficiency == state.water_recovery_efficiency
    assert after.co2_efficiency == state.co2_efficiency


def test_co2_can_hurt_crew_despite_plentiful_oxygen(quiet_engine, state):
    state.resources.update(oxygen=100, co2=4)
    state.co2_efficiency = 0
    after, report = step(quiet_engine, state)
    assert report["survival"]["oxygen_shortage"] == 0
    assert report["survival"]["health_changes"][0]["co2_penalty"] == 4
    assert after.crew[0].health == 96
    assert after.resources["co2"] == 6


@pytest.mark.parametrize(
    "activity,field",
    [
        ("service_water_recovery", "water_recovery_efficiency"),
        ("service_co2_scrubber", "co2_efficiency"),
    ],
)
def test_servicing_repairs_and_then_normal_use_wears_the_system(
    quiet_engine, state, activity, field
):
    setattr(state, field, 0.5)
    after, turn = step(
        quiet_engine, state, assignments=[{"crew_id": "alex", "activity_id": activity}]
    )
    assert 0.77 <= getattr(after, field) < 0.8
    assert turn["assignments"][0]["outcome"]["success"]
    assert after.resources["repair_kits"] == state.resources["repair_kits"] - 1
    assert turn["science_gains"] == []


def test_maintenance_rejection_is_atomic_and_full_condition_is_explained(quiet_engine, state):
    before = deepcopy(state)
    with pytest.raises(GameError, match="full condition"):
        step(
            quiet_engine,
            state,
            assignments=[{"crew_id": "alex", "activity_id": "service_co2_scrubber"}],
        )
    assert state == before
    state.co2_efficiency = 0.5
    state.resources["repair_kits"] = 0
    before = deepcopy(state)
    with pytest.raises(GameError, match="repair_kits"):
        step(
            quiet_engine,
            state,
            assignments=[{"crew_id": "alex", "activity_id": "service_co2_scrubber"}],
        )
    assert state == before


def test_scrubber_incident_affects_its_own_condition(quiet_engine, state):
    event = quiet_engine.definitions.events["scrubber_load"]
    effects = next(c for c in event.choices if c.id == "scrubber_risk").success_effects
    apply_effects(state, effects, None)
    assert state.co2_efficiency == 0.8
    assert state.oxygen_efficiency == 1
    apply_effects(state, Effects(co2_efficiency=10, water_recovery_efficiency=-10), None)
    assert state.co2_efficiency == 1
    assert state.water_recovery_efficiency == 0


def test_unhealthy_air_prevents_a_good_handover(quiet_engine, state):
    state.weeks_completed = 12
    state.resources["co2"] = 20
    quiet_engine.check_game_over(state)
    assert state.ending == "emergency_handover"


def test_a_death_does_not_change_the_cabins_co2_warning_threshold(quiet_engine, state):
    before = quiet_engine.state_view(state)["life_support"]["co2_warning_level"]
    state.crew[0].health = 0
    assert quiet_engine.state_view(state)["life_support"]["co2_warning_level"] == before == 4
