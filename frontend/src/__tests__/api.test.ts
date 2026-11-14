import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCatalog, createGame, fetchGameState, submitTurn } from '../api/game';
import { ApiError } from '../api/client';

describe('API Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchCatalog calls /api/catalog and returns data', async () => {
    const mockCatalog = { stations: [], missions: [], crew: [], items: [], limits: {} };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockCatalog,
    } as any);

    const result = await fetchCatalog();
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/catalog', expect.objectContaining({
      headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
    }));
    expect(result).toEqual(mockCatalog);
  });

  it('createGame posts to /api/games with json payload', async () => {
    const mockResponse = { game_id: 'test-123', state: {} };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    } as any);

    const payload = {
      station_id: 'alpha',
      crew_ids: ['alex', 'maya'],
      cargo: { food_packs: 5 },
    };

    const result = await createGame(payload);
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/games', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(payload),
    }));
    expect(result).toEqual(mockResponse);
  });

  it('fetchGameState gets /api/games/:gameId', async () => {
    const mockState = { game_id: 'g-42', state: { current_week: 1 } };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockState,
    } as any);

    const result = await fetchGameState('g-42');
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/games/g-42', expect.anything());
    expect(result).toEqual(mockState);
  });

  it('submitTurn posts turn decision to /api/games/:gameId/turn', async () => {
    const mockTurnResult = { game_id: 'g-42', state: {}, turn_outcome: {} };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockTurnResult,
    } as any);

    const turnPayload = {
      expected_week: 1,
      request_id: 'req-1',
      rations: { alex: { food: 'normal' as const, water: 'normal' as const } },
      event_choice_id: 'engineer_repair',
      selected_crew_id: 'alex',
    };

    const result = await submitTurn('g-42', turnPayload);
    expect(globalThis.fetch).toHaveBeenCalledWith('/api/games/g-42/turn', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(turnPayload),
    }));
    expect(result).toEqual(mockTurnResult);
  });

  it('throws ApiError with detail on HTTP error status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ detail: 'Outdated turn: current week is 2.' }),
    } as any);

    await expect(fetchGameState('old-game')).rejects.toThrow(ApiError);
    await expect(fetchGameState('old-game')).rejects.toThrow('Outdated turn: current week is 2.');
  });
});
