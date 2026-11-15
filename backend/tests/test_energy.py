import json
from copy import deepcopy

import pytest
from conftest import launch_cargo, normal_rations

from app.game.energy import daylight_fraction
from app.game.loader import DEFAULT_DATA
from app.game.models import GameError, ResearchProject
from app.storage import GameStore


def test_sourced_period_and_cached_site_longitudes(definitions):
    assert definitions.lighting.solar_day_earth_days == 29.5306
    archive = json.loads((DEFAULT_DATA / "moon.json").read_text(encoding="utf-8"))
    for station in definitions.stations.values():
        site = next(site for site in archive["sites"] if site["id"] == station.lunar_site_id)
        assert station.longitude_deg == site["longitude"]


def test_weekly_daylight_integration_at_dawn_dusk_and_night(definitions):
    station = definitions.stations["alpha"]
    lighting = definitions.lighting
    assert daylight_fraction(station, lighting, 1) == 1
    assert daylight_fraction(station, lighting, 2) == 1
    assert daylight_fraction(station, lighting, 3) == pytest.approx(
        (29.5306 / 2 - 14) / 7, abs=1e-6
    )
    assert daylight_fraction(station, lighting, 4) == 0
    assert 0 < daylight_fraction(station, lighting, 5) < 1
    # Across many cycles, a smooth non-polar horizon is illuminated half the time.
    assert sum(
        daylight_fraction(station, lighting, w) for w in range(1, 1001)
    ) / 1000 == pytest.approx(0.5, abs=0.002)


def test_longitude_changes_local_lighting_not_seed(definitions, engine):
    alpha = definitions.stations["alpha"]
    oceanus = definitions.stations["oceanus"]
    assert daylight_fraction(oceanus, definitions.lighting, 1) < daylight_fraction(
        alpha, definitions.lighting, 1
    )
    first = engine.create_game("alpha", ["alex"], launch_cargo(engine, "alpha", {}), 1)
    second = engine.create_game("alpha", ["alex"], launch_cargo(engine, "alpha", {}), 200)
    assert (
        engine.state_view(first)["energy"]["forecast"][3]["daylight_fraction"]
        == engine.state_view(second)["energy"]["forecast"][3]["daylight_fraction"]
        == 0
    )


def test_battery_overflow_conserves_energy_and_cannot_be_stored(quiet_engine, state):
    state.resources["electricity"] = 99
    after, report = quiet_engine.advance_week(state, 1, normal_rations(state), "continue")
    power = report["survival"]
    assert after.resources["electricity"] == state.battery_capacity == 100
    assert power["electricity_curtailed"] == 18
    assert (
        99 + power["electricity_generated"]
        == power["electricity_used"]
        + power["project_electricity_used"]
        + power["electricity_curtailed"]
        + after.resources["electricity"]
    )


def test_full_darkness_drains_the_battery_without_solar(quiet_engine, state):
    state.current_week = 4
    state.resources["electricity"] = 40
    after, report = quiet_engine.advance_week(state, 4, normal_rations(state), "continue")
    assert report["survival"]["electricity_generated"] == 0
    assert after.resources["electricity"] == 28


def test_priority_trades_recording_against_oxygen_in_a_low_battery_night(quiet_engine, state):
    state.current_week = 4
    state.resources["electricity"] = 17
    state.resources["oxygen"] = 0
    state.oxygen_efficiency = 0.4
    state.projects = [ResearchProject(id="seismic-1", kind="seismic", phase_index=1)]
    before = deepcopy(state)
    life, life_report = quiet_engine.advance_week(
        state, 4, normal_rations(state), "continue", power_priority="life_support"
    )
    research, research_report = quiet_engine.advance_week(
        state, 4, normal_rations(state), "continue", power_priority="research"
    )
    assert state == before
    assert life.projects[0].progress == 0
    assert research.projects[0].progress == 1
    assert life_report["survival"]["life_support_power_fraction"] == 1
    assert research_report["survival"]["life_support_power_fraction"] == 0.9375
    assert life.crew[0].health > research.crew[0].health


def test_solar_generation_can_fund_recording_under_selected_priority(quiet_engine, state):
    state.resources["electricity"] = 0
    state.projects = [ResearchProject(id="seismic-1", kind="seismic", phase_index=1)]
    after, report = quiet_engine.advance_week(state, 1, normal_rations(state), "continue")
    assert after.projects[0].progress == 1
    assert report["survival"]["project_electricity_used"] == 2


def test_starting_power_cells_and_event_gains_obey_capacity(quiet_engine):
    state = quiet_engine.create_game(
        "alpha", ["alex"], launch_cargo(quiet_engine, "alpha", {"power_cells": 10}), 42
    )
    assert state.resources["electricity"] == state.battery_capacity
    from app.game.events import apply_effects
    from app.game.models import Effects

    apply_effects(state, Effects(resources={"electricity": 20}), None)
    assert state.resources["electricity"] == state.battery_capacity


def test_priority_replay_is_exact_and_changed_priority_with_same_id_rejected(quiet_engine):
    store = GameStore(quiet_engine)
    game = store.create("alpha", ["alex"], launch_cargo(store.engine, "alpha", {}), 42)
    body = {
        "expected_week": 1,
        "request_id": "power",
        "event_choice_id": "continue",
        "selected_crew_id": None,
        "power_priority": "research",
        "rations": {"alex": {"food": "normal", "water": "normal"}},
    }
    result = store.submit(game["game_id"], body)
    assert store.submit(game["game_id"], body) == result
    assert result["state"]["energy"]["priority"] == "research"
    with pytest.raises(GameError, match="already used"):
        store.submit(game["game_id"], {**body, "power_priority": "life_support"})
