import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCatalog, createGame, fetchGameState, submitTurn } from '../api/game';
import { ApiError } from '../api/client';
import { catalog, game, turn } from './fixtures/backend';

function mockResponse(data: unknown, status = 200) {
  const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json' },
  }));
  vi.stubGlobal('fetch', fetch);
  return fetch;
}

describe('API service', () => {
  beforeEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); });

  it('fetches the real catalog shape', async () => {
    const fetch = mockResponse(catalog);
    expect(await fetchCatalog()).toEqual(catalog);
    expect(fetch).toHaveBeenCalledWith('/api/catalog', expect.anything());
  });

  it('creates games with the given setup', async () => {
    const fetch = mockResponse(game);
    const body = { station_id: 'alpha', crew_ids: ['alex'], cargo: { food_packs: 5 } };
    expect(await createGame(body)).toEqual(game);
    expect(fetch).toHaveBeenCalledWith('/api/games', expect.objectContaining({ method: 'POST', body: JSON.stringify(body) }));
  });

  it('fetches authoritative game state', async () => {
    const fetch = mockResponse(game);
    expect(await fetchGameState(game.game_id)).toEqual(game);
    expect(fetch).toHaveBeenCalledWith(`/api/games/${game.game_id}`, expect.anything());
  });

  it('submits a decision and returns actual turn details', async () => {
    const fetch = mockResponse(turn);
    const body = { expected_week: 1, request_id: 'req-1', rations: turn.turn_outcome.rations,
      event_choice_id: turn.turn_outcome.event.choice_id, selected_crew_id: 'alex' };
    expect(await submitTurn(game.game_id, body)).toEqual(turn);
    expect(fetch).toHaveBeenCalledWith(`/api/games/${game.game_id}/turn`, expect.objectContaining({ method: 'POST', body: JSON.stringify(body) }));
  });

  it('preserves HTTP status and readable domain errors', async () => {
    mockResponse({ detail: 'Outdated turn: current week is 2.' }, 409);
    await expect(fetchGameState('old')).rejects.toMatchObject({
      name: 'ApiError', status: 409, message: 'Outdated turn: current week is 2.',
    });
  });

  it('formats FastAPI validation errors with the affected fields', async () => {
    mockResponse({ detail: [{ loc: ['body', 'rations', 'alex', 'food'], msg: 'Invalid ration level', type: 'literal_error' }] }, 422);
    await expect(fetchGameState('bad')).rejects.toThrow('rations.alex.food: Invalid ration level');
  });

  it('reads a non-JSON error body only once', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Service unavailable', { status: 503 })));
    await expect(fetchGameState('bad')).rejects.toMatchObject({ status: 503, message: 'Service unavailable' });
  });

  it('retains the status when a server returns an empty error body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 500 })));
    await expect(fetchGameState('bad')).rejects.toThrow(ApiError);
  });
});
