"""Single-process in-memory games with serialized, idempotent commits."""

from copy import deepcopy
from dataclasses import dataclass, field
from threading import RLock
from uuid import uuid4

from app.game.engine import GameEngine
from app.game.models import GameError, GameState, Ration


@dataclass
class StoredGame:
    state: GameState
    # request_id -> (canonical decision, exact historical response)
    receipts: dict[str, tuple[dict, dict]] = field(default_factory=dict)


class GameStore:
    def __init__(self, engine: GameEngine):
        self.engine = engine
        self._games: dict[str, StoredGame] = {}
        self._lock = RLock()

    def _find(self, game_id: str) -> StoredGame:
        if game_id not in self._games:
            raise GameError("Game not found.", 404)
        return self._games[game_id]

    def create(
        self, station_id: str, crew_ids: list[str], cargo: dict[str, int], random_seed: int | None
    ) -> dict:
        state = self.engine.create_game(station_id, crew_ids, cargo, random_seed)
        game_id = str(uuid4())
        response = {"game_id": game_id, "state": self.engine.state_view(state)}
        with self._lock:
            self._games[game_id] = StoredGame(state)
        return response

    def get(self, game_id: str) -> dict:
        with self._lock:
            return {"game_id": game_id, "state": self.engine.state_view(self._find(game_id).state)}

    def submit(self, game_id: str, decision: dict) -> dict:
        with self._lock:
            game = self._find(game_id)
            request_id = decision["request_id"]
            if request_id in game.receipts:
                original_decision, response = game.receipts[request_id]
                if decision != original_decision:
                    raise GameError("request_id was already used for a different decision.", 409)
                return deepcopy(response)
            state, outcome = self.engine.advance_week(
                game.state,
                expected_week=decision["expected_week"],
                rations={key: Ration(**value) for key, value in decision["rations"].items()},
                event_choice_id=decision["event_choice_id"],
                selected_crew_id=decision["selected_crew_id"],
                support_crew_ids=decision.get("support_crew_ids", []),
                assignments=decision.get("assignments", []),
                project_orders=decision.get("project_orders", []),
                power_priority=decision.get("power_priority"),
            )
            response = {
                "game_id": game_id,
                "state": self.engine.state_view(state),
                "turn_outcome": outcome,
            }
            # Build the response before committing, so exceptions cannot leave a partial turn.
            receipt = (deepcopy(decision), deepcopy(response))
            game.state = state
            game.receipts[request_id] = receipt
            return response
