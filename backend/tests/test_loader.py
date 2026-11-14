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
    assert len(definitions.stations) == 6
    assert len(definitions.missions) == 6
    assert len(definitions.crew) == 10
    assert len(definitions.items) == 12
    assert len(definitions.events) == 15


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
        ("stations", "battery_capacity", 0),
        ("stations", "longitude_deg", 181),
        ("stations", "water_recovery_efficiency", 1.5),
        ("stations", "co2_efficiency", -0.1),
        ("stations", "co2_removal_per_week", 0),
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
        ("id", "project:seismic-1"),
        ("success_chance", 1.5),
        ("costs", {"food": -1}),
        ("costs", {"medicine": 0.5}),
        ("required_items", {"missing": 1}),
        ("role_bonus", {"pilot": 0.2}),
        ("success_effects", {"execute": "bad()"}),
        ("success_effects", {"oxygen_efficiency": 3}),
        ("success_effects", {"water_recovery_efficiency": 2}),
        ("success_effects", {"co2_efficiency": -2}),
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


@pytest.mark.parametrize(
    "field,value",
    [
        ("target", 0),
        ("target", 13),
        ("target", 1.5),
        ("qualifying_choices", ["missing"]),
        ("qualifying_choices", ["kit_sampling"]),
        ("qualifying_choices", ["research_geology", "research_geology"]),
        ("source_url", "https://example.com"),
        ("title", ""),
    ],
)
def test_invalid_science_objectives(data_dir, field, value):
    mutate(
        data_dir,
        "missions",
        lambda entries: entries[0]["science_objectives"][0].update({field: value}),
    )
    with pytest.raises(ConfigurationError):
        load_definitions(data_dir)


def test_duplicate_objectives_and_overlapping_credit_are_rejected(data_dir):
    def duplicate(entries):
        entries[0]["science_objectives"].append(entries[0]["science_objectives"][0])

    mutate(data_dir, "missions", duplicate)
    with pytest.raises(ConfigurationError, match="duplicate science"):
        load_definitions(data_dir)


def test_one_action_cannot_complete_two_objectives(data_dir):
    def overlap(entries):
        entries[0]["science_objectives"][1]["qualifying_choices"].append("research_geology")

    mutate(data_dir, "missions", overlap)
    with pytest.raises(ConfigurationError, match="qualifying choice"):
        load_definitions(data_dir)


@pytest.mark.parametrize(
    "field,value",
    [
        ("solar_day_earth_days", 0),
        ("solar_day_earth_days", float("nan")),
        ("reference_longitude_deg", 181),
        ("assumption", ""),
        ("source_url", "https://example.com"),
    ],
)
def test_invalid_lighting_model(data_dir, field, value):
    path = data_dir / "lighting.json"
    content = json.loads(path.read_text(encoding="utf-8"))
    content[field] = value
    path.write_text(json.dumps(content), encoding="utf-8")
    with pytest.raises(ConfigurationError):
        load_definitions(data_dir)
