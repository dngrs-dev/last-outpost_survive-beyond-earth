# Backend guide

The backend implements Stages 1–5 and later expansions in [the game specification](game-design.md): six outposts, ten selectable astronauts,
twelve cargo types, configurable weekly missions, fifteen JSON events, rationing, health, and all
four endings. A React frontend consumes this API. All balancing values are
fictional gameplay units.

Missions also define a separate [research brief](research.md). `GET /api/catalog`
includes `science_objectives` for preparation. Game states expose `science`
(status, completed/total objectives, research data, and per-objective progress),
and terminal `results.science` records the same assessment separately from the
survival ending. Status is `not_started`, `partial`, or `complete`.

Weekly turns contain one incident response plus independent crew assignments.
[Seismic projects](projects.md) persist across turns: manual phases use assignments,
automatic recording uses stored power without crew, and controls use optional
`project_orders` (project ID plus pause/resume/interrupt). States expose
`research_projects`; turn outcomes expose `project_updates`. Only successful final
analysis grants project seismic credit.
Sunlight, batteries, and power priorities now follow the [energy model](energy.md).
Turns accept optional `power_priority` (`life_support` or `research`); omission
retains the prior setting. State `energy` includes a forecast and storage limits.
Catalog `lighting` and `sunlight_forecasts` support launch preparation.

Connected [life support](life-support.md) adds `wastewater` and abstract `co2`
stocks, water-recovery and scrubber conditions, maintenance assignments, a water
cost for oxygen, and a two-week oxygen reserve policy. State `life_support`
provides conditions/rates/source; survival `life_support` reports the actual loop.
Each survival health record includes `co2_penalty`. Processor power budgets are
part of essential demand, and new processor condition effects use the same typed
effect/report contract. All stocks, wear, and exposure resolve within the atomic turn.

Each astronaut has one main job. See [weekly assignments](assignments.md) for the
request contract, support-crew rules, supply reservations, resolution order, and
cancellation policy. Research credit from both paths is combined in the turn's
`science_gains`, with per-action gains retained for debriefing. Science remains
independent of survival.

[Crew condition](health.md) adds `nutrition_deficit`, `hydration_deficit`, derived
`condition`, and fully funded `ration_outlook` to crew state. Choices expose
`workload` and `support_candidates`; `action_type` additionally accepts `rest`.
Use `crew_rest` in the existing assignment structure. Survival health records
include actual received fractions, before/after deficits, recovery, and work/rest
flags. Work restrictions apply to leads, support, and assignments atomically.

[Medical care](medicine.md) adds persistent crew `medical_conditions`, with typed
case histories in `medical_changes` and a separate survival `medical_penalty`.
Medical assignments add `patient_id` and `condition_id`, reserve both crew slots,
and reuse existing medicine/scanner stocks. Assignment outcomes return those IDs;
choices add action type `medical`. Authored effects add optional `condition` and
`treatment`. Stabilization occurs during care; supported recovery during survival.

Requires Python 3.11 or later. From the repository root on Windows PowerShell:

```powershell
cd backend
python -m venv .venv
.venv/Scripts/python.exe -m pip install -e '.[dev]'
.venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000
```

On macOS/Linux, substitute `.venv/bin/python` for `.venv/Scripts/python.exe`.
Open [interactive API documentation](http://127.0.0.1:8000/docs) to play manually.
With the server running, a second terminal can play a complete example mission:

```powershell
cd backend
.venv/Scripts/python.exe play_demo.py
# Optional: play_demo.py http://127.0.0.1:8000 123
```

Run verification from `backend/`:

```powershell
.venv/Scripts/python.exe -m pytest
.venv/Scripts/python.exe -m ruff check .
.venv/Scripts/python.exe -m ruff format --check .
```

If your environment restricts the system temporary folder, pass
`--basetemp=.pytest-tmp` to Pytest. That directory is disposable test output.

API workflow:

1. `GET /api/catalog` returns station/mission/crew/item definitions and cargo limits.
2. `POST /api/games` creates a mission, returning `{ "game_id": "...", "state": {...} }`.
3. `GET /api/games/{game_id}` returns the current authoritative state.
4. `POST /api/games/{game_id}/turn` submits one week's decision and returns
   `{ "game_id": "...", "state": {...}, "turn_outcome": {...} }`.

Example creation body:

```json
{
  "station_id": "alpha",
  "crew_ids": ["alex", "maya", "lin", "sam"],
  "cargo": {
    "food_packs": 8,
    "water_containers": 16,
    "repair_kits": 7,
    "eva_batteries": 7,
    "medicine_kits": 7
  },
  "random_seed": 42
}
```

`random_seed` is optional; omitting it generates a seed returned in the state.
For a turn, send the state's `current_week` as `expected_week`, a unique string
`request_id`, a `rations` map with exactly the living crew IDs, an
`event_choice_id` from the current event, and `selected_crew_id` when required:

```json
{
  "expected_week": 1,
  "request_id": "my-game-week-1",
  "rations": {
    "alex": {"food": "normal", "water": "reduced"}
  },
  "event_choice_id": "engineer_repair",
  "selected_crew_id": "alex"
}
```

This turn shape illustrates a one-person crew and a solar event; use the actual
crew and event in the returned state. Ration levels are `normal`, `reduced`, and
`emergency`, independently for food and water. The state includes per-person
ration costs, emergency provision requirements, depleted provisions, and every
event choice's requirements, costs, risk effects, eligible crew, success
probabilities, and reasons for unavailability. Choice affordability is checked
against current supplies; the submitted turn additionally validates combined
ration, response, and assignment costs.

Turn order and prototype rules:

- At the beginning of a week, select a weighted event and apply its announced
  discovery effects once. Prioritize unseen eligible events, preserving weighted
  selection within that group. Do not repeat either of the previous two events;
  use a quiet week when nothing is eligible.
- Validate the entire decision before resolving it on a copy. Charge event costs,
  resolve the incident, medical care, and other assignments, feed surviving crew, allocate solar/battery
  power, recover water, generate oxygen from water, remove CO2, and capture wastewater. Apply ration and oxygen health penalties and check endings.
  Event casualties consume no weekly provisions. A surviving crew then advances
  to the next event. The journal records both the turn and next event's discovery.
- Actual provision fractions accumulate separate nutrition/hydration deficits.
  Full provision reduces debt gradually; rest speeds recovery. Deprivation first
  reduces task performance, then restricts demanding/active work and causes
  escalating damage. Safe air, full provisions, and no active work permit limited
  health recovery. See [crew condition](health.md) for exact fictional thresholds.
- If even emergency rations are unaffordable, select emergency for every living
  astronaut for the depleted resource. Remaining stock is shared proportionally,
  with the unsupplied portion added to each deficit. This prevents a mission from
  becoming stuck at zero food or water. Normal/reduced overspending is rejected.
- Perfect handover requires all original crew, health at least 70, nutrition deficit
  below 0.25 and hydration deficit below 0.1 per survivor, all four systems
  at least 80%, two weeks of food/water/oxygen reserves, at least 12 electricity,
  and a medicine and repair kit. No survivor may have an active named medical case.
  Successful handover requires the mission's
  survivor target, all four systems at least 40%, and half a week of provisions and
  oxygen. Other surviving crews at rotation receive an emergency handover.
  All crew dying, or both systems reaching zero with empty oxygen/electricity
  reserves, causes mission failure.
- Retrying the same `request_id` and body returns the original response, including
  after later turns. Reusing that ID for a different decision or submitting an
  outdated week returns `409`. Invalid input returns `422`; missing games or
  stations return `404`. Failed validation leaves game state unchanged.

Balance settings live in `backend/app/game/rules.py`; authored definitions and
effects live in `backend/data/*.json` and are validated at startup. Random draws
use the seed, week, and purpose, so reads and invalid submissions do not change
future outcomes. Crew traits affect consumption, event probability, or injuries.

Use one backend worker: storage and idempotency receipts are in memory, and a
server restart (including reload) loses games. Games are serialized under a lock
within the process. No authentication or persistent saves are included.

Local CORS defaults to `http://localhost:5173` and `http://127.0.0.1:5173`.
Override it with the comma-separated `LAST_OUTPOST_CORS_ORIGINS` environment
variable; see `backend/.env.example`. See the root README for frontend run commands.

## Frontend contract verification

Turn outcomes and journal entries have explicit Pydantic response schemas exposed
in OpenAPI. They include event costs and applied effects, per-astronaut health
records (`crew_id`, `before`, `after`), survival penalty breakdowns, and the next
event's discovery effects. The UI displays these separate stages rather than
assuming health changes are a dictionary of numeric deltas.

Frontend tests use committed fixtures generated through the real FastAPI endpoints.
From `backend/`, regenerate them after an intentional contract or content change:

```powershell
.venv/Scripts/python.exe export_frontend_fixtures.py
```

Do not edit `frontend/src/__tests__/fixtures/backend.ts` manually. Backend tests
check that the fixtures still match the API; the frontend build type-checks their
contents against the TypeScript response interfaces. Run both suites after
regeneration.

The frontend keeps an unresolved turn's exact payload and request ID in page
memory after a network error, timeout, or server error. Editing is locked until
retry resolves that submission. A definite validation rejection unlocks editing;
a `409` triggers a fresh game-state fetch. Reloading the page fetches current
server state, but does not preserve unsent form edits. Active missions opened
through a results URL redirect to gameplay.

## Playable outpost contracts

The shared engine supports six missions. Definitions are in `stations.json` and
`missions.json`; each site maps to one unique station. These are fictional game
configurations. Difficulty is an authored 1-5 rating, not a NASA environmental metric
or a guarantee of outcome. Crew size, loadout, and decisions remain significant.

| Outpost | Landing site | Weeks | Difficulty | Food / water | Solar / oxygen condition | Full-daylight solar / oxygen capacity per week |
|---|---|---:|---|---|---|---|
| Alpha | Apollo 11 | 12 | Standard (2) | 20 / 32 | 100% / 100% | 48 / 14 |
| Oceanus | Apollo 12 | 8 | Easy (1) | 30 / 52 | 95% / 95% | 56 / 16 |
| Fra Mauro | Apollo 14 | 10 | Standard (2) | 26 / 36 | 85% / 90% | 48 / 15 |
| Hadley | Apollo 15 | 14 | Hard (3) | 32 / 46 | 80% / 80% | 52 / 15 |
| Descartes | Apollo 16 | 16 | Severe (4) | 38 / 54 | 70% / 85% | 48 / 16 |
| Taurus | Apollo 17 | 18 | Extreme (5) | 44 / 62 | 65% / 75% | 50 / 15 |

Solar capacity is multiplied by current condition and weekly daylight fraction.
Battery storage is finite; see `energy.md` for the capacities. Oxygen output
also depends on power availability. Starting efficiencies apply before the first
event's discovery damage. Cargo is added to the selected station's reserves.
The three longest contracts require at least two astronauts at launch and two
survivors for a successful handover; one survivor can still earn an emergency
handover. End conditions use the selected mission's duration rather than a
hardcoded twelve weeks. Game responses include difficulty alongside station and
mission identity.

The viewport-sized deployment console uses independent roster, globe, briefing,
and launch modules. Mission / Systems / History tabs keep details in place;
constrained screens can scroll the active information module without moving the
launch bar, and mobile users switch between map and briefing.
