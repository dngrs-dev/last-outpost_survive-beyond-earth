"""Run with: uvicorn app.main:app --reload --port 8000 (from backend/)."""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router
from app.game.engine import GameEngine
from app.game.loader import load_definitions
from app.game.models import Definitions, GameError
from app.moon import load_moon_catalog
from app.storage import GameStore


def create_app(definitions: Definitions | None = None) -> FastAPI:
    @asynccontextmanager
    async def lifespan(application: FastAPI):
        application.state.store = GameStore(GameEngine(definitions or load_definitions()))
        application.state.moon, application.state.moon_etag = load_moon_catalog()
        stations = application.state.store.engine.definitions.stations
        for site in application.state.moon.sites:
            station = stations.get(site.training_station_id)
            if station is None or station.lunar_site_id != site.id:
                raise ValueError(f"Lunar site {site.id} has no matching playable outpost")
            if station.mission_id != site.training_mission_id:
                raise ValueError(f"Lunar site {site.id} has an incorrect mission reference")
        yield

    application = FastAPI(title="LAST OUTPOST", version="0.1.0", lifespan=lifespan)
    origins = os.getenv("LAST_OUTPOST_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[origin.strip() for origin in origins.split(",") if origin.strip()],
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )

    @application.exception_handler(GameError)
    async def game_error_handler(request: Request, exc: GameError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content={"detail": str(exc)})

    application.include_router(router)
    return application


app = create_app()
