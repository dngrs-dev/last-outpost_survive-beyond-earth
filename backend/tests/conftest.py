from copy import deepcopy
from dataclasses import replace

import pytest
from fastapi.testclient import TestClient

from app.game.engine import GameEngine
from app.game.loader import load_definitions
from app.game.models import Ration
from app.main import create_app


@pytest.fixture
def definitions():
    return load_definitions()


@pytest.fixture
def engine(definitions):
    return GameEngine(definitions)


@pytest.fixture
def quiet_engine(definitions):
    missions = {
        key: replace(mission, event_ids=[]) for key, mission in definitions.missions.items()
    }
    return GameEngine(replace(definitions, missions=missions))


@pytest.fixture
def state(quiet_engine):
    return quiet_engine.create_game("alpha", ["alex", "maya"], {}, random_seed=42)


@pytest.fixture
def rations(state):
    return {crew.id: Ration("normal", "normal") for crew in state.crew if crew.alive}


@pytest.fixture
def client(definitions):
    with TestClient(create_app(definitions)) as session:
        yield session


def normal_rations(state):
    return {crew.id: Ration("normal", "normal") for crew in state.crew if crew.alive}


def turn_body(state, request_id="turn-1"):
    event = state["current_event"]
    choice = next(choice for choice in event["choices"] if not choice["requires_crew"])
    return {
        "expected_week": state["current_week"],
        "request_id": request_id,
        "rations": {
            crew["id"]: {"food": "normal", "water": "normal"}
            for crew in state["crew"]
            if crew["alive"]
        },
        "event_choice_id": choice["id"],
        "selected_crew_id": None,
    }


def with_event(state, event_id):
    result = deepcopy(state)
    result.current_event_id = event_id
    return result
