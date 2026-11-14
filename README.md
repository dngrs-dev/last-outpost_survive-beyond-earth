# LAST OUTPOST

A turn-based lunar survival game. Select a crew, pack supplies within cargo limits,
and manage a fictional research station until the next crew rotation.

## Current status

The first playable version is complete: Station Alpha, four selectable astronauts,
six cargo types, twelve weekly turns, three narrative events, individual rationing,
oxygen and electricity simulation, crew health/death, and four mission endings.
The game is playable through both the FastAPI REST backend and the React frontend.
All balancing values are fictional gameplay units.

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
- [Agent instructions](AGENTS.md): workflow for coding agents working in this repository.

The backend uses Python and FastAPI. The planned frontend uses React, TypeScript,
and Vite. See the game specification for future work; planned features are not
necessarily implemented.
