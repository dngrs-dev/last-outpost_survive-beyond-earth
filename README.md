# LAST OUTPOST

A turn-based lunar survival game. Select a crew, pack supplies within cargo limits,
and manage a fictional research station until the next crew rotation.

## Current status

The first playable backend is complete: Station Alpha, four selectable astronauts,
six cargo types, twelve weekly turns, three narrative events, individual rationing,
oxygen and electricity simulation, crew health/death, and four mission endings.
The game is playable through the REST API. The React frontend is planned.
All balancing values are fictional gameplay units.

## Run locally

Requires Python 3.11 or later. From the repository root in Windows PowerShell:

```powershell
cd backend
python -m venv .venv
.venv/Scripts/python.exe -m pip install -e '.[dev]'
.venv/Scripts/python.exe -m uvicorn app.main:app --reload --port 8000
```

On macOS/Linux, use `.venv/bin/python` instead of `.venv/Scripts/python.exe`.
Open [interactive API documentation](http://127.0.0.1:8000/docs).
To play a complete example mission, run this in a second terminal from `backend/`:

```powershell
.venv/Scripts/python.exe play_demo.py
```

Games are stored in memory: restarting or reloading the server loses them.
Use one backend worker.

## Verify

Run from `backend/`:

```powershell
.venv/Scripts/python.exe -m pytest
.venv/Scripts/python.exe -m ruff check .
.venv/Scripts/python.exe -m ruff format --check .
```

If the system temporary directory is restricted, pass `--basetemp=.pytest-tmp`
to Pytest.

## Project documentation

- [Game design and technical specification](docs/game-design.md): mechanics,
  architecture, intended project structure, scope, and development roadmap.
- [Backend guide](docs/backend.md): API examples, turn order, balancing rules,
  configuration, and prototype limitations.
- [Agent instructions](AGENTS.md): workflow for coding agents working in this repository.

The backend uses Python and FastAPI. The planned frontend uses React, TypeScript,
and Vite. See the game specification for future work; planned features are not
necessarily implemented.
