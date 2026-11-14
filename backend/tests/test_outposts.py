from copy import deepcopy

import pytest
from fastapi.testclient import TestClient
from test_loader import data_dir as data_dir
from test_loader import mutate

from app.game.energy import daylight_fraction
from app.game.loader import ConfigurationError, load_definitions
from app.game.models import GameError, Ration
from app.main import create_app

OUTPOSTS = ["alpha", "oceanus", "fra_mauro", "hadley", "descartes", "taurus"]


@pytest.mark.parametrize("station_id", OUTPOSTS)
def test_station_parameters_initialize_the_real_simulation(quiet_engine, station_id):
    station = quiet_engine.definitions.stations[station_id]
    state = quiet_engine.create_game(station_id, ["alex", "maya"], {}, 42)
    assert state.resources == station.starting_resources
    assert state.solar_efficiency == station.solar_efficiency
    assert state.oxygen_efficiency == station.oxygen_efficiency
    rations = {crew.id: Ration("normal", "normal") for crew in state.crew}
    after, report = quiet_engine.advance_week(state, 1, rations, "continue")
    assert report["survival"]["electricity_generated"] == pytest.approx(
        station.energy_per_week
        * station.solar_efficiency
        * daylight_fraction(station, quiet_engine.definitions.lighting, 1)
    )
    # Launch oxygen stocks exceed the target reserve, so production waits.
    assert report["survival"]["oxygen_generated"] == 0
    assert after.current_week == 2
    view = quiet_engine.state_view(after)
    assert view["difficulty"] == station.difficulty
    assert view["difficulty_rank"] == station.difficulty_rank


@pytest.mark.parametrize("station_id", OUTPOSTS)
def test_every_mission_ends_at_its_own_deadline(quiet_engine, station_id):
    station = quiet_engine.definitions.stations[station_id]
    mission = quiet_engine.definitions.missions[station.mission_id]
    state = quiet_engine.create_game(
        station_id, ["alex", "maya"], {"food_packs": 8, "water_containers": 16}, 42
    )
    for week in range(1, mission.duration_weeks + 1):
        assert state.status == "running"
        state, _ = quiet_engine.advance_week(
            state, week, {crew.id: Ration("normal", "normal") for crew in state.crew}, "continue"
        )
    assert state.status == "completed"
    assert state.weeks_completed == mission.duration_weeks
    assert len(state.history) == mission.duration_weeks
    assert quiet_engine.state_view(state)["mission_days"]["end"] == mission.duration_weeks * 7


def test_missions_have_distinct_deadlines_and_difficulty_is_backed_by_conditions(engine):
    assert len({mission.duration_weeks for mission in engine.definitions.missions.values()}) == 6
    easy, extreme = (engine.definitions.stations[key] for key in ("oceanus", "taurus"))
    assert easy.difficulty_rank < extreme.difficulty_rank
    assert easy.solar_efficiency > extreme.solar_efficiency
    assert easy.oxygen_efficiency > extreme.oxygen_efficiency
    assert (
        engine.definitions.missions[easy.mission_id].duration_weeks
        < engine.definitions.missions[extreme.mission_id].duration_weeks
    )


def test_no_station_consumption_mutates_another_station(quiet_engine):
    before = deepcopy(quiet_engine.definitions.stations)
    state = quiet_engine.create_game("taurus", ["alex", "maya"], {}, 42)
    state.resources["food"] = 0
    state.solar_efficiency = 0
    assert quiet_engine.definitions.stations == before
    assert quiet_engine.create_game("oceanus", ["alex"], {}, 42).resources["food"] == 30


@pytest.mark.parametrize("station_id", ["hadley", "descartes", "taurus"])
def test_survivor_requirement_prevents_an_impossible_initial_crew(engine, station_id):
    with pytest.raises(GameError, match="at least 2"):
        engine.create_game(station_id, ["alex"], {})


def test_selected_site_creates_its_own_station_through_the_api(client):
    sites = client.get("/api/moon").json()["sites"]
    for site in sites:
        response = client.post(
            "/api/games",
            json={
                "station_id": site["training_station_id"],
                "crew_ids": ["alex", "maya"],
                "cargo": {},
                "random_seed": 42,
            },
        )
        assert response.status_code == 201
        assert response.json()["state"]["station_id"] == site["training_station_id"]
        assert response.json()["state"]["mission_id"] == site["training_mission_id"]


@pytest.mark.parametrize(
    "field,value", [("solar_efficiency", -0.1), ("oxygen_efficiency", 1.1), ("difficulty_rank", 5)]
)
def test_invalid_station_conditions_are_rejected(data_dir, field, value):
    mutate(data_dir, "stations", lambda entries: entries[0].update({field: value}))
    with pytest.raises(ConfigurationError):
        load_definitions(data_dir)


def test_startup_rejects_an_invalid_site_to_station_link(definitions):
    definitions.stations.pop("oceanus")
    with pytest.raises(ValueError, match="matching playable outpost"):
        with TestClient(create_app(definitions)):
            pass
