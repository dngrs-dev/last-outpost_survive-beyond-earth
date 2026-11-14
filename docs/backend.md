# Backend guide

The backend implements Stages 1–5 in [the game specification](game-design.md): Station Alpha, four selectable astronauts,
six cargo types, twelve weekly turns, three JSON events, rationing, health, and all
four endings. The React frontend is not implemented yet. All balancing values are
fictional gameplay units.

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
ration and event costs.

Turn order and prototype rules:

- At the beginning of a week, select a weighted event and apply its announced
  discovery effects once. Do not repeat either of the previous two events;
  use a quiet week when nothing is eligible.
- Validate the entire decision before resolving it on a copy. Charge event costs,
  resolve success/injury, feed surviving crew, generate/use electricity, then
  generate/use oxygen. Apply ration and oxygen health penalties and check endings.
  Event casualties consume no weekly provisions. A surviving crew then advances
  to the next event. The journal records both the turn and next event's discovery.
- Repeat rationing increases penalties; normal rations reset the respective
  streak. Water penalties exceed food penalties. There is no automatic healing.
- If even emergency rations are unaffordable, select emergency for every living
  astronaut for the depleted resource. Remaining stock is shared proportionally,
  with additional starvation/dehydration damage. This prevents a mission from
  becoming stuck at zero food or water. Normal/reduced overspending is rejected.
- Perfect handover requires all original crew, health at least 70, both systems
  at least 80%, two weeks of food/water/oxygen reserves, at least 12 electricity,
  and a medicine and repair kit. Successful handover requires the mission's
  survivor target, both systems at least 40%, and half a week of provisions and
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
variable; see `backend/.env.example`. No frontend installation/run command applies
yet; Stage 6 in [the game specification](game-design.md) describes that future work.
