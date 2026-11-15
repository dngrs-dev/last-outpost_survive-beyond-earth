# Title screen

`/` is the full-screen game menu: **LAST OUTPOST**, **survive beyond earth**, Play,
and Load. Play opens `/moon/`; a selected outpost opens `/crew/` with its station
and landing-site query parameters. Crew selection continues to supplies at
`/prepare/`. Old root links with `station` or `lunar_site` redirect to crew
selection, preserving the query. Direct `/prepare/` still defaults
to Alpha. Active games and results retain their existing URLs and API contracts.

## Earth viewed from the Moon

The foreground is a real Apollo 17 panorama, with a rotating, textured Earth
composited above it. These are two independent NASA assets, not one historical
photograph of Earth above that horizon. Earth size, orientation, shading, framing,
stars, and the observer's view are illustrative. This screen does not calculate
the Moon's current sky or use the mission's lighting simulation.

| Asset | Local file | Primary source and credit |
|---|---|---|
| Blue Marble satellite mosaic, 2048 by 1024 PNG | `frontend/public/images/title/earth-blue-marble.png` | [NASA/GSFC Scientific Visualization Studio, Blue Marble](https://svs.gsfc.nasa.gov/2915/); data courtesy Reto Stockli, NASA GSFC / Earth Observatory |
| Apollo 17 Station 7, EVA 3 surface panorama, original JPEG | `frontend/public/images/title/apollo17-surface.jpg` | [NASA/JSC image jsc2004e52775](https://images.nasa.gov/details/jsc2004e52775), assembled from frames AS17-146-22339 through AS17-146-22363 |

Both downloaded files are stored unchanged. CSS crops and shades the panorama;
WebGL wraps the Earth mosaic on a smooth sphere. The Earth map is a cloud-free
visualization mosaic, not a live satellite feed. The panorama is a photograph,
not a 3D terrain model. The original panorama is about 7.9 MB to retain foreground
detail; scene images load independently of the menu controls. The committed source
manifest records download URLs, file sizes, and SHA-256 hashes. Source credits
and NASA reuse guidance are accessible from the menu's Scene credits panel.

No NASA key or external API request is required during play. To refresh an asset,
download its published URL from `frontend/public/images/title/sources.json`, inspect
the image and source terms, and update its recorded size/hash and notices. Keep
attribution with the assets. See [third-party notices](../THIRD_PARTY_NOTICES.md)
for the reuse basis; NASA does not endorse this game.

## Motion and fallback

Earth turns at one degree per second: a fictional six-minute rotation, deliberately
faster than reality. Rendering reuses the Moon selector's small WebGL sphere
renderer, caps draw frequency at 30 fps and device pixel ratio at 2, and stops
animation when the document is hidden. Renderer resources and animation callbacks
are released when leaving the menu. There are no new rendering dependencies.

Pause motion stops the globe. Reduced-motion preferences start the screen still;
the player may explicitly resume it. If WebGL or the Earth image fails, a CSS
fallback keeps the menu usable and disables the motion control. The background
is decorative and hidden from assistive technology. The responsive layout keeps
the title above center and Play/Load accessible without document scrolling.

## Load is a resume bookmark

Successful mission creation and valid game/report visits remember only the game
ID in local storage under `last-outpost:last-mission`. Load fetches that ID from
the backend, then opens the active game or its completed report. It never restores
resources, random outcomes, or pending decisions from browser storage.

- No bookmark: Load is disabled; Play remains available.
- Backend returns 404: remove that bookmark and offer a new adventure. A newer
  bookmark written by another tab is retained.
- Connection/server failure: retain the bookmark and allow another Load attempt.
- Malformed or blocked local storage: keep Play usable.
- Storage changes in another tab: refresh Load availability.

The backend still holds missions in memory. Restarting/reloading it clears games,
and clearing browser storage loses the bookmark. Load is not an exported save,
cross-device storage, or a durable save system. An unsubmitted weekly plan remains
page-local; Load resumes the server's latest resolved state. Durable saves and
multiple save slots remain future work.
