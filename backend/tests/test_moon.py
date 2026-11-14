import hashlib
from copy import deepcopy
from pathlib import Path
from unittest.mock import patch

import pytest
from pydantic import ValidationError

from app.moon import MoonCatalog, load_moon_catalog
from sync_moon_data import OBJECTIVES, parse_coordinates, parse_facts


def test_archive_is_served_without_network_and_supports_conditional_cache(client):
    with patch("urllib.request.urlopen", side_effect=AssertionError("Unexpected network request")):
        response = client.get("/api/moon")
        assert response.status_code == 200
        assert response.headers["cache-control"] == "public, max-age=86400"
        unchanged = client.get("/api/moon", headers={"If-None-Match": response.headers["etag"]})
        assert unchanged.status_code == 304
        assert unchanged.content == b""
        assert client.get("/api/moon").json() == response.json()


def test_real_coordinates_dates_and_gameplay_bridge(client):
    data = client.get("/api/moon").json()
    assert len(data["sites"]) == 6
    sites = {site["id"]: site for site in data["sites"]}
    assert sites["apollo-11"]["latitude"] == 0.67416
    assert sites["apollo-12"]["longitude"] == -23.4219
    assert sites["apollo-16"]["landing_date"] == "1972-04-20"
    assert sites["apollo-17"]["landing_date"] == "1972-12-11"
    for site in sites.values():
        assert site["kind"] == "historical_landing_site"
        station = client.app.state.store.engine.definitions.stations[site["training_station_id"]]
        assert station.lunar_site_id == site["id"]
        assert site["training_mission_id"] == station.mission_id
        assert site["mission"]["source_url"].startswith("https://www.nasa.gov/")


def test_committed_texture_matches_source_manifest():
    catalog, _ = load_moon_catalog()
    texture = Path(__file__).resolve().parents[2] / "frontend/public/images/moon/lroc_color_2k.jpg"
    content = texture.read_bytes()
    assert len(content) == catalog.texture.bytes
    assert hashlib.sha256(content).hexdigest() == catalog.texture.sha256
    assert content.startswith(b"\xff\xd8")


@pytest.mark.parametrize(
    "field,value",
    [
        ("latitude", 91),
        ("longitude", -181),
        ("latitude", float("nan")),
        ("kind", "operating_station"),
    ],
)
def test_invalid_lunar_data_is_rejected(field, value):
    catalog, _ = load_moon_catalog()
    data = catalog.model_dump(mode="json")
    data["sites"][0][field] = value
    with pytest.raises(ValidationError):
        MoonCatalog.model_validate(data)


def test_duplicate_site_ids_are_rejected():
    catalog, _ = load_moon_catalog()
    data = catalog.model_dump(mode="json")
    data["sites"].append(deepcopy(data["sites"][0]))
    with pytest.raises(ValidationError, match="unique"):
        MoonCatalog.model_validate(data)


def test_coordinate_parser_preserves_east_positive_signed_coordinates():
    html = (
        "<table>"
        + "".join(
            f"<tr><td>Apollo {number}</td></tr>"
            "<tr><td>Lunar Module</td><td>-3.0128</td><td>-23.4219</td></tr>"
            for number in OBJECTIVES
        )
        + "</table>"
    )
    assert parse_coordinates(html)[12] == (-3.0128, -23.4219)


@pytest.mark.parametrize("parser", [parse_coordinates, parse_facts])
def test_changed_remote_table_structure_fails_instead_of_inventing_data(parser):
    with pytest.raises(ValueError, match="table changed"):
        parser("<html>No usable data</html>")
