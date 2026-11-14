"""Manually refresh the checked-in lunar archive; never runs during gameplay.

Uses public NASA downloads, not api.nasa.gov. No API key is required or accepted.
Successful downloads are cached; pass --refresh to intentionally download again.
"""

import argparse
import hashlib
import json
import re
from datetime import date, datetime
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".uv-cache" / "moon-sources"
COORDINATES = "https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html"
FACTS = "https://nssdc.gsfc.nasa.gov/planetary/lunar/apolloland.html"
TEXTURE = "https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg"
SVS = "https://svs.gsfc.nasa.gov/4720/"
OBJECTIVES = {
    11: ("First footsteps", "Land a crew, explore the surface, and return safely to Earth."),
    12: ("Precision and persistence", "Study the surface and recover hardware from Surveyor 3."),
    14: ("Into the highlands", "Explore and collect samples in the Fra Mauro highlands."),
    15: ("Beyond walking distance", "Explore the Hadley-Apennine region with a lunar rover."),
    16: (
        "Reading ancient rocks",
        "Survey and sample the Descartes highlands and deploy experiments.",
    ),
    17: ("A scientist on the Moon", "Investigate the geology of the Taurus-Littrow valley."),
}


class Tables(HTMLParser):
    def __init__(self):
        super().__init__()
        self.rows = []
        self.row = None
        self.cell = None

    def handle_starttag(self, tag, attrs):
        if tag == "tr":
            self.row = []
        elif tag in ("td", "th") and self.row is not None:
            self.cell = []

    def handle_data(self, data):
        if self.cell is not None:
            self.cell.append(data)

    def handle_endtag(self, tag):
        if tag in ("td", "th") and self.cell is not None:
            self.row.append(" ".join(" ".join(self.cell).split()))
            self.cell = None
        elif tag == "tr" and self.row is not None:
            self.rows.append(self.row)
            self.row = None


def fetch(url: str, refresh: bool) -> bytes:
    path = CACHE / hashlib.sha256(url.encode()).hexdigest()
    if path.exists() and not refresh:
        return path.read_bytes()
    with urlopen(
        Request(url, headers={"User-Agent": "LastOutpostEducationalPrototype/0.1"}), timeout=30
    ) as response:
        data = response.read(2_000_001)
    if len(data) > 2_000_000:
        raise ValueError("Unexpectedly large source download")
    CACHE.mkdir(parents=True, exist_ok=True)
    path.write_bytes(data)
    return data


def parse_coordinates(html: str) -> dict[int, tuple[float, float]]:
    parser = Tables()
    parser.feed(html)
    result = {}
    mission = None
    for row in parser.rows:
        match = re.search(r"Apollo\s*(\d+)", " ".join(row))
        if match:
            mission = int(match[1])
        if "Lunar Module" in row and mission in OBJECTIVES:
            index = row.index("Lunar Module")
            result[mission] = (float(row[index + 1]), float(row[index + 2]))
    if result.keys() != OBJECTIVES.keys():
        raise ValueError("NASA coordinate table changed; expected six Lunar Module rows")
    return result


def parse_facts(html: str) -> dict[int, dict]:
    parser = Tables()
    parser.feed(html)
    result = {}
    for row in parser.rows:
        if row and row[0].isdigit() and int(row[0]) in OBJECTIVES and len(row) == 9:
            number = int(row[0])
            result[number] = {
                "region": row[3],
                "landing_date": datetime.strptime(row[2], "%d %b %Y").date().isoformat(),
                "eva_hours": float(row[6]),
                "sample_return_kg": float(row[8]),
            }
    if result.keys() != OBJECTIVES.keys():
        raise ValueError("NASA mission table changed; expected six landing records")
    return result


def sync(refresh: bool = False) -> None:
    from app.game.loader import load_definitions

    stations = {station.lunar_site_id: station for station in load_definitions().stations.values()}
    coordinates = parse_coordinates(fetch(COORDINATES, refresh).decode("utf-8"))
    facts = parse_facts(fetch(FACTS, refresh).decode("utf-8"))
    texture = fetch(TEXTURE, refresh)
    if not texture.startswith(b"\xff\xd8"):
        raise ValueError("Expected a JPEG Moon texture")
    sites = []
    for number, (theme, objective) in OBJECTIVES.items():
        station = stations[f"apollo-{number}"]
        latitude, longitude = coordinates[number]
        sites.append(
            {
                "id": f"apollo-{number}",
                "name": f"Apollo {number}",
                "latitude": latitude,
                "longitude": longitude,
                "kind": "historical_landing_site",
                **facts[number],
                "mission": {
                    "name": f"Apollo {number}",
                    "theme": theme,
                    "objective": objective,
                    "source_url": f"https://www.nasa.gov/mission/apollo-{number}/",
                },
                "training_station_id": station.id,
                "training_mission_id": station.mission_id,
            }
        )
    snapshot = {
        "schema_version": 2,
        "retrieved_at": min(
            date.fromtimestamp((CACHE / hashlib.sha256(url.encode()).hexdigest()).stat().st_mtime)
            for url in (COORDINATES, FACTS, TEXTURE)
        ).isoformat(),
        "coordinate_frame": (
            "Planetocentric DE421 Mean Earth/Polar Axis; degrees north and east-positive "
            "longitude; Lunar Module positions."
        ),
        "sources": [
            {
                "id": "coordinates",
                "title": "Apollo Landing Site Coordinates",
                "url": COORDINATES,
                "credit": "NASA NSSDCA / GSFC",
                "usage": "Factual coordinate data; NASA source attribution retained.",
            },
            {
                "id": "mission-facts",
                "title": "Apollo Lunar Landings (1969-1972)",
                "url": FACTS,
                "credit": "NASA NSSDCA / GSFC",
                "usage": "Factual mission data; descriptions are project-authored summaries.",
            },
            {
                "id": "moon-texture",
                "title": "CGI Moon Kit",
                "url": SVS,
                "credit": "NASA's Scientific Visualization Studio; LRO / LROC / LOLA",
                "usage": (
                    "SVS public-domain content unless otherwise noted; "
                    "no third-party restriction is stated for this map."
                ),
            },
        ],
        "texture": {
            "path": "/images/moon/lroc_color_2k.jpg",
            "source_url": TEXTURE,
            "credit": "NASA's Scientific Visualization Studio",
            "sha256": hashlib.sha256(texture).hexdigest(),
            "bytes": len(texture),
            "note": (
                "Visualization-optimized color map; not a scientific measurement layer. "
                "Lighting is illustrative."
            ),
        },
        "sites": sites,
    }
    # Validate before replacing either committed output.
    from app.moon import MoonCatalog

    MoonCatalog.model_validate(snapshot)
    asset = ROOT / "frontend/public/images/moon/lroc_color_2k.jpg"
    asset.parent.mkdir(parents=True, exist_ok=True)
    asset.write_bytes(texture)
    (ROOT / "backend/data/moon.json").write_text(
        json.dumps(snapshot, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Saved {len(sites)} sites and {len(texture)} texture bytes. NASA Open API calls: 0.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh", action="store_true")
    sync(parser.parse_args().refresh)
