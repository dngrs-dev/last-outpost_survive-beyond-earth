import json
import shutil

import pytest

from app.game.loader import DEFAULT_DATA, ConfigurationError, load_definitions


@pytest.fixture
def data_dir(tmp_path):
    target = tmp_path / "data"
    shutil.copytree(DEFAULT_DATA, target)
    return target


def mutate(path, filename, change):
    file = path / f"{filename}.json"
    entries = json.loads(file.read_text(encoding="utf-8"))
    change(entries)
    file.write_text(json.dumps(entries), encoding="utf-8")


def test_complete_content(definitions):
    assert len(definitions.stations) == 1
    assert len(definitions.missions) == 1
    assert len(definitions.crew) == 4
    assert len(definitions.items) == 6
    assert len(definitions.events) == 3


@pytest.mark.parametrize("filename", ["stations", "missions", "crew", "items", "events"])
def test_duplicate_ids(data_dir, filename):
    mutate(data_dir, filename, lambda entries: entries.append(entries[0]))
    with pytest.raises(ConfigurationError, match="duplicate"):
        load_definitions(data_dir)


@pytest.mark.parametrize(
    "filename,field,value",
    [
        ("stations", "mission_id", "missing"),
        ("missions", "event_ids", ["missing"]),
        ("items", "resource", "fuel"),
        ("crew", "role", "pilot"),
        ("events", "weight", -1),
        ("events", "weight", float("inf")),
        ("missions", "duration_weeks", 0),
        ("crew", "health", 101),
        ("items", "volume_l", -2),
        ("items", "resource_amount", 0),
        ("stations", "energy_per_week", -1),
        ("crew", "unexpected", True),
    ],
)
def test_invalid_configuration(data_dir, filename, field, value):
    mutate(data_dir, filename, lambda entries: entries[0].update({field: value}))
    with pytest.raises(ConfigurationError):
        load_definitions(data_dir)


@pytest.mark.parametrize(
    "field,value",
    [
        ("success_chance", 1.5),
        ("costs", {"food": -1}),
        ("costs", {"medicine": 0.5}),
        ("required_items", {"missing": 1}),
        ("role_bonus", {"pilot": 0.2}),
        ("success_effects", {"execute": "bad()"}),
        ("success_effects", {"oxygen_efficiency": 3}),
        ("success_effects", {"resources": {"fuel": 2}}),
    ],
)
def test_invalid_event_choices(data_dir, field, value):
    mutate(data_dir, "events", lambda entries: entries[0]["choices"][0].update({field: value}))
    with pytest.raises(ConfigurationError):
        load_definitions(data_dir)


def test_selected_effect_requires_actor(data_dir):
    def change(entries):
        entries[0]["choices"][-1]["success_effects"] = {"crew_health": -10}

    mutate(data_dir, "events", change)
    with pytest.raises(ConfigurationError, match="requires an astronaut"):
        load_definitions(data_dir)


def test_missing_file(data_dir):
    (data_dir / "crew.json").unlink()
    with pytest.raises(ConfigurationError, match="crew.json"):
        load_definitions(data_dir)


def test_malformed_json(data_dir):
    (data_dir / "events.json").write_text("{", encoding="utf-8")
    with pytest.raises(ConfigurationError, match="events.json"):
        load_definitions(data_dir)
