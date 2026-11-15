# LAST OUTPOST

A turn-based lunar survival game. Select a crew, pack supplies within cargo limits,
and manage a fictional research station until the next crew rotation.

## Current status

Six fictional lunar outposts are playable, with missions lasting 8 to 18 weeks,
sixteen selectable specialists in four crew slots, twelve cargo types, fifteen shared narrative events, individual rationing,
oxygen and electricity simulation, crew health/death, and four mission endings.
Each mission also has a separate research brief: collect samples, analyze seismic
records, or restore research equipment. Science progress and the final assessment
are reported independently of survival. Each week combines an incident response
with separate research or maintenance assignments for available crew. Seismic
projects span deployment, three automatic recording weeks, and crew analysis;
projects can be paused, resumed, or reassigned without losing completed work.
NASA-based lunar timing and cached site longitudes drive weekly daylight forecasts;
finite batteries and selectable power priorities make dark-week preparation matter.
Powered water recovery, water-fed oxygen generation, and a separate CO2 scrubber
connect resource planning with maintenance and cabin health.
Accumulated nutrition and hydration deficits now restrict work and reduce risky-task
performance. Full provisions and optional crew rest provide gradual recovery;
health remains the overall condition indicator.
Named injuries and illnesses persist across weeks. Medical care reserves caregiver
and patient; self-care supports solo crews. Stabilization and supported recovery
affect work availability while interrupted research retains completed progress.
The game is playable through both the FastAPI REST backend and the React frontend.
All balancing values are fictional gameplay units.

The `/moon/` mission selector puts a large interactive Moon against a space backdrop.
Choose named outpost markers or browse missions from easier to harder. One compact
card shows the selected mission and opens crew selection; Oceanus is recommended
for first-time players. Detailed supplies, systems, history, and sources are available
on demand. The screen adapts to phones and laptops without a website header, footer,
or side directory.
The root `/` is now a full-screen title menu, with a rotating NASA Blue Marble Earth
above a real Apollo 17 panorama. Play opens Moon selection; Load resumes this
browser's last server-held mission. `/crew/` is a dedicated visual roster: inspect
sixteen original SVG astronauts, choose up to four unique teammates, then continue to
supplies at `/prepare/`. Portraits have role icons and selected checks, with a
full-body preview, traits, and ration costs. Wide screens use a 4-by-4 roster,
grouped by profession (four of each); smaller screens scroll internally. A shared
SVG rig supplies more adult proportions, detailed suits, contained hair/helmet
layers, and reusable poses/expressions. Four visible seats support swaps and
empty seats. Mission minimums still apply. Changing crew from supplies retains
packed cargo and the seed. Older root station links now open crew selection.
Direct preparation links still work (default Alpha). Load does not persist
games across backend restarts. Motion can be paused and respects reduced-motion
preferences. Scene credits explain the real imagery and illustrative composition.
Historical data and imagery remain sourced; outpost conditions are fictional game
values. No NASA API key or external request is needed during play.

Supplies now use a full-screen cargo bay with twelve matching original SVG item
illustrations, category filters, quantity controls, packed checks, and a cargo
manifest. Weight, space, and Launch stay visible while the inventory scrolls
internally. Item facts, research goals, outpost systems, sunlight forecasts, and
replay settings open on demand. Cargo/seed edits survive a preparation-page refresh
and crew changes; launch errors retain the loadout. Catalog and simulation rules
remain authoritative in the backend.

Active play at `/game/:gameId` now uses a full-screen station common room with
two curved seating tiers and a central table. Inspect crew or open Crew, Stores,
Systems, Science, and Log bookmarks. Four guided steps organize each week:
Incident, Crew, Food & water, and Review. Only End Week submits the combined plan;
known booking/budget conflicts block submission, and uncertain retries retain
the original request. Confirmed results show survival, science, crew work, and
next-discovery effects before continuing. Phone layouts keep navigation visible
while the active panel scrolls internally. Shared cabin outfits and activity poses
show planned indoor work, paired medical care, recovery, and suited surface crews.
Food shelves, tank fills, consumable stacks, retained equipment, and the battery
reflect confirmed supplies. Seismic indicators show actual phase progress and
queued controls without reserving a worker during automatic recording. Plan,
pending, and confirmed-recap labels keep previews distinct from resolved work.

## Run locally

### Backend

Requires Python 3.11 or later. From the repository root in Windows PowerShell:

```powershell
cd backend
python -m venv .venv
.venv/Scripts/python.exe -m pip install -e '.[dev]'
.venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000
```

On macOS/Linux, use `.venv/bin/python` instead of `.venv/Scripts/python.exe`.
Open [interactive API documentation](http://127.0.0.1:8000/docs).
To play a complete example mission via CLI, run this in a second terminal from `backend/`:

```powershell
.venv/Scripts/python.exe play_demo.py
```

Games are stored in memory: restarting or reloading the server loses them.
Use one backend worker.

### Frontend

Requires Node.js 18 or later. In a new terminal, from the repository root:

```powershell
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.
Configure `VITE_API_BASE_URL` if the backend is hosted at an alternate URL (defaults to `http://localhost:8000` via Vite proxy).

## Verify

Run backend verification from `backend/`:

```powershell
.venv/Scripts/python.exe -m pytest
.venv/Scripts/python.exe -m ruff check .
.venv/Scripts/python.exe -m ruff format --check .
```

If the system temporary directory is restricted, pass `--basetemp=.pytest-tmp`
to Pytest.

Run frontend verification from `frontend/`:

```powershell
npm test
npm run build
```

## Project documentation

- [Game design and technical specification](docs/game-design.md): mechanics,
  architecture, intended project structure, scope, and development roadmap.
- [Backend guide](docs/backend.md): API examples, turn order, balancing rules,
  configuration, and prototype limitations.
- [Lunar data guide](docs/lunar-data.md): sources, cached downloads, coordinate
  conventions, and manual refresh instructions.
- [Title screen](docs/title-screen.md): Earth and Apollo imagery, motion, routes,
  and Load's resume behavior and storage limits.
- [Crew and equipment](docs/crew-and-equipment.md): research inspiration, fictional
  character profiles, cargo tradeoffs, and maintenance actions.
- [Supplies screen](docs/supplies.md): item artwork, packing controls, capacity,
  mission information, draft preservation, and launch validation.
- [Station gameplay](docs/station-gameplay.md): room layout, four-step weekly
  planning, bookmarks, confirmed results, and retry behavior.
- [Event library](docs/events.md): all fifteen scenarios, NASA references, equipment,
  research rewards, and gameplay boundaries.
- [Connected life support](docs/life-support.md): the ISS-inspired water/oxygen/CO2
  loop, fictional rates, maintenance, and health consequences.
- [Crew condition](docs/health.md): nutrition/hydration deficits, workload restrictions,
  ration projections, gradual recovery, and the boundary between research and game rules.
- [Medical care](docs/medicine.md): named conditions, caregiver/patient bookings,
  stabilization, recovery, interruptions, and current weekly emergency limits.
- [Sunlight and energy](docs/energy.md): NASA-based timing, explicit model assumptions,
  batteries, forecasts, and power priorities.
- [Research projects](docs/projects.md): seismic phases, controls, power, failure,
  and completion rewards.
- [Weekly assignments](docs/assignments.md): crew capacity, support roles, costs,
  and atomic weekly resolution.
- [Research objectives](docs/research.md): mission targets, planned research work,
  progress rules, and the separate scientific assessment.
- [Third-party notices](THIRD_PARTY_NOTICES.md): attribution and reuse terms for the
  committed NASA imagery and factual data.
- [Agent instructions](AGENTS.md): workflow for coding agents working in this repository.

The backend uses Python and FastAPI. The frontend uses React, TypeScript,
and Vite. See the game specification for future work; planned features are not
necessarily implemented.
