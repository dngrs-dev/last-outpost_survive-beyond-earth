# Lunar archive: sources, caching, and reuse

## What is real

`/moon/` displays the six historical Apollo landing sites. These are not operating
stations. The coordinates are Lunar Module positions in the planetocentric
DE421 Mean Earth/Polar Axis reference frame, using degrees north and east-positive
longitude. Mission landing dates, surface EVA times, and sample-return masses are
historical facts. Short mission descriptions are project-authored summaries with
links to the individual mission records.

The viewer uses a smooth sphere and a color texture. It is not a terrain/elevation
model. Illumination is illustrative, not a calculation of current lunar lighting.
The SVS map is optimized for visualization rather than scientific measurements.
Leaders separate nearby site labels while the dots retain their actual coordinates.

Every landing site now has a distinct fictional outpost and survival contract.
The launch button opens, for example, `/?station=hadley&lunar_site=apollo-15`.
Preparation selects that outpost and its actual mission duration; game creation
sends that station ID to the backend. Station IDs, difficulty, supplies, generation,
and initial damage are authored gameplay configuration, not historical NASA data.
The importer derives site-to-station links from `backend/data/stations.json` and
startup verifies those references. Archive schema version 2 uses a versioned client
URL to avoid the earlier cached Alpha-only links.

## Game selection screen

The Moon is the main visual on `/moon/`, with a space backdrop, named outpost
markers, and a single selected-mission card. The website header, footer, and left
directory have been removed. Selection is available by marker, keyboard, or
previous/next mission buttons; the latter remain usable even after rotating away
from the near side or losing 3D support. A lightweight illustrated fallback retains
mission selection when the surface texture or WebGL cannot load.

Missions browse in ascending authored difficulty. Without a valid `site` query,
the selector recommends the easiest outpost, currently Oceanus. Explicit deep links
still select their requested site. This is a presentation change; starting stocks,
mission durations, difficulty ranks, and simulation rules are unchanged. Friendly
labels map ranks 1-5 to Easy, Balanced, Challenging, Hard, and Extreme.

Phones keep the Moon above a compact selection card; wide screens place the card
beside it. Small-phone unselected markers use icons with accessible mission names.
Controls have touch-sized targets. The document stays within the viewport; detailed
information can scroll inside an optional native modal. That modal retains Mission,
Systems, and History tabs, keyboard navigation, source links, and reuse notices.
Escape/Close returns focus to its opener. No new imagery or rendering dependency
is required. The title/Play/Load screen remains a separate future milestone; the
existing root preparation and game routes continue to work.

## Sources

| Material | Primary source |
|---|---|
| Precise Lunar Module coordinates | [NASA NSSDCA landing-site coordinates](https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html) |
| Landing dates, EVA time, sample masses | [NASA NSSDCA Apollo landing table](https://nssdc.gsfc.nasa.gov/planetary/lunar/apolloland.html) |
| Mission context | Individual NASA mission pages linked in `backend/data/moon.json` |
| Color texture, 2048 × 1024 JPEG | [NASA Scientific Visualization Studio CGI Moon Kit](https://svs.gsfc.nasa.gov/4720/) |

The supplied [2026 challenge](https://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/?tab=resources)
resource page could not be verified during implementation: the web reader failed,
and the local HTTP client rejected its certificate chain. TLS verification was not
disabled. These are independently verified official NASA resources, not a claim
that every one appears in the challenge's Resources tab. Check challenge-specific
requirements against that page when it becomes accessible.

## Downloads and cache

Runtime requests only fetch `GET /api/moon` from this backend and a local frontend
texture. The validated snapshot is loaded once at startup. It is served with an
ETag and a one-day browser cache lifetime. There are **zero external NASA calls per
page visit or game**, and no NASA Open API calls or API key are needed.

To intentionally rebuild the snapshot, run from `backend/`:

```powershell
.venv/Scripts/python.exe sync_moon_data.py
```

Three public downloads (two source tables and one JPEG) are reused from the ignored
`.uv-cache/moon-sources/` directory when present. Use `--refresh` to redownload them.
The snapshot date records the earliest cached source download, not the rebuild time.
The importer checks the table structure, validates the complete dataset, and records
the texture's byte count and SHA-256. Inspect the resulting diff before committing.
It never stores or accepts an API key. Refreshing the source snapshot requires
regenerating the frontend fixtures with `export_frontend_fixtures.py`.

Commit `backend/data/moon.json`, the texture, the source/rights notices, and generated
test fixtures. Do not commit caches, environments, or credentials.

## Reuse assessment

The factual dataset and this chosen SVS texture can be committed and redistributed
with the notices in [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md). SVS explicitly
states that its content is public domain unless otherwise noted; the selected map
has no separate third-party restriction stated on its entry. This is an asset-specific
assessment, not a blanket license for every item on a NASA website. Retain source
credits and avoid suggesting NASA endorsement. The project's own code still needs
its own license if you want to grant reuse rights to others.
