from copy import deepcopy
from dataclasses import replace

import pytest

from app.game.launch import minimum_cargo, objective_requirements
from app.game.models import GameError


@pytest.mark.parametrize(
    "station_id", ["alpha", "oceanus", "fra_mauro", "hadley", "descartes", "taurus"]
)
def test_all_missions_require_usable_objective_equipment(engine, station_id):
    cargo = minimum_cargo(engine.definitions, station_id)
    before = deepcopy(engine.definitions)
    with pytest.raises(GameError, match="objective equipment"):
        engine.create_game(station_id, ["alex", "lin"], {}, 1)
    state = engine.create_game(station_id, ["alex", "lin"], cargo, 1)
    assert state.resources["scientific_tools"] == 1
    assert engine.definitions == before
    for item_id, quantity in cargo.items():
        with pytest.raises(GameError, match="objective equipment"):
            engine.create_game(station_id, ["alex", "lin"], {**cargo, item_id: quantity - 1}, 1)


def test_shared_tools_and_summed_consumables(engine):
    mission = engine.definitions.missions["alpha_rotation"]
    assert objective_requirements(mission) == {
        "scientific_tools": 1,
        "eva_batteries": 3,
        "repair_kits": 1,
    }
    station = engine.definitions.stations["alpha"]
    engine.definitions.stations["alpha"] = replace(
        station,
        starting_resources={
            **station.starting_resources,
            "scientific_tools": 1,
            "eva_batteries": 3,
        },
    )
    assert minimum_cargo(engine.definitions, "alpha") == {}
    engine.create_game("alpha", ["alex"], {}, 1)


def test_http_cannot_bypass_equipment_validation(client):
    body = {"station_id": "alpha", "crew_ids": ["alex"], "cargo": {}, "random_seed": 1}
    response = client.post("/api/games", json=body)
    assert response.status_code == 422
    assert "objective equipment" in response.text
    assert (
        client.post(
            "/api/games", json={**body, "cargo": {"scientific_tools": 1, "eva_batteries": 2}}
        ).status_code
        == 201
    )
    mission = next(
        m for m in client.get("/api/catalog").json()["missions"] if m["id"] == "alpha_rotation"
    )
    assert mission["required_resources"]["eva_batteries"] == 3
