import { request } from './client';
import type {
  CatalogResponse,
  CreateGameRequest,
  GameResponse,
  SubmitTurnRequest,
  TurnResponse,
} from '../types/game';

export async function fetchCatalog(): Promise<CatalogResponse> {
  return request<CatalogResponse>('/catalog');
}

export async function createGame(payload: CreateGameRequest): Promise<GameResponse> {
  return request<GameResponse>('/games', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchGameState(gameId: string): Promise<GameResponse> {
  return request<GameResponse>(`/games/${gameId}`);
}

export async function submitTurn(
  gameId: string,
  payload: SubmitTurnRequest
): Promise<TurnResponse> {
  return request<TurnResponse>(`/games/${gameId}/turn`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
