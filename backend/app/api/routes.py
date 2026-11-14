from typing import Annotated

from fastapi import APIRouter, Depends, Request, Response

from app.api.schemas import (
    CatalogResponse,
    CreateGameRequest,
    ErrorResponse,
    GameResponse,
    SubmitTurnRequest,
    TurnResponse,
)
from app.moon import MoonCatalog
from app.storage import GameStore

router = APIRouter(prefix="/api")


def get_store(request: Request) -> GameStore:
    return request.app.state.store


Store = Annotated[GameStore, Depends(get_store)]
ERRORS = {404: {"model": ErrorResponse}, 409: {"model": ErrorResponse}}


@router.get("/moon", response_model=MoonCatalog)
def moon_catalog(request: Request, response: Response):
    headers = {"Cache-Control": "public, max-age=86400", "ETag": request.app.state.moon_etag}
    if request.headers.get("if-none-match") == request.app.state.moon_etag:
        return Response(status_code=304, headers=headers)
    response.headers.update(headers)
    return request.app.state.moon


@router.get("/catalog", response_model=CatalogResponse)
def catalog(store: Store) -> dict:
    return store.engine.catalog()


@router.post("/games", response_model=GameResponse, status_code=201, responses=ERRORS)
def create_game(request: CreateGameRequest, store: Store) -> dict:
    return store.create(**request.model_dump())


@router.get("/games/{game_id}", response_model=GameResponse, responses=ERRORS)
def get_game(game_id: str, store: Store) -> dict:
    return store.get(game_id)


@router.post("/games/{game_id}/turn", response_model=TurnResponse, responses=ERRORS)
def submit_turn(game_id: str, request: SubmitTurnRequest, store: Store) -> dict:
    return store.submit(game_id, request.model_dump())
