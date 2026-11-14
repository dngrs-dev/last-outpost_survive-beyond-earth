# LAST OUTPOST

A turn-based lunar survival game. Select a crew, pack supplies within cargo limits,
and manage a fictional research station until the next crew rotation.

## Current status

Six fictional lunar outposts are playable, with missions lasting 8 to 18 weeks,
ten selectable specialists in four crew slots, twelve cargo types, fifteen shared narrative events, individual rationing,
oxygen and electricity simulation, crew health/death, and four mission endings.
The game is playable through both the FastAPI REST backend and the React frontend.
All balancing values are fictional gameplay units.

The `/moon/` deployment console places a distinct fictional outpost at each real
Apollo landing site. Compare difficulty, reserves, system condition, generation,
and relief deadlines using Mission / Systems / History modules. The launch bar
opens preparation for the selected outpost. The selector fits the viewport; small
screens switch between the map and briefing. The root page still defaults to Alpha.
Historical data and imagery remain sourced; outpost conditions are fictional game
values. No NASA API key or external request is needed during play.

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
- [Crew and equipment](docs/crew-and-equipment.md): research inspiration, fictional
  character profiles, cargo tradeoffs, and maintenance actions.
- [Event library](docs/events.md): all fifteen scenarios, NASA references, equipment,
  research rewards, and gameplay boundaries.
- [Third-party notices](THIRD_PARTY_NOTICES.md): attribution and reuse terms for the
  committed NASA texture and factual data.
- [Agent instructions](AGENTS.md): workflow for coding agents working in this repository.

The backend uses Python and FastAPI. The frontend uses React, TypeScript,
and Vite. See the game specification for future work; planned features are not
necessarily implemented.
