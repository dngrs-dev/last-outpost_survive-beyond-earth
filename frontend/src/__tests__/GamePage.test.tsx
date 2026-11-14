import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GamePage } from '../pages/GamePage';
import * as gameApi from '../api/game';
import { ApiError } from '../api/client';
import { game, turn, treatment, completed, medicalGame } from './fixtures/backend';

function renderGame() {
  render(<MemoryRouter initialEntries={['/game/fixture-game']}><Routes>
    <Route path="/game/:gameId" element={<GamePage />} />
    <Route path="/results/:gameId" element={<p>Final results route</p>} />
  </Routes></MemoryRouter>);
}

async function submit() {
  const button = await screen.findByRole('button', { name: /SUBMIT WEEK 1 DECISIONS/ });
  await act(async () => { fireEvent.click(button); });
}

describe('GamePage with real API fixtures', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(gameApi, 'fetchGameState').mockResolvedValue(structuredClone(game));
  });

  it('renders actual ration costs and applies ration changes', async () => {
    renderGame();
    expect(await screen.findByText('WEEK 1 / 12')).toBeInTheDocument();
    expect(screen.getByText('Alex Vega')).toBeInTheDocument();
    expect(screen.getAllByRole('option', { name: 'Emergency (0.44u)' })).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: 'ALL REDUCED' }));
    expect(screen.getAllByRole('combobox').every((select) => (select as HTMLSelectElement).value === 'reduced')).toBe(true);
  });

  it('renders event injuries, survival penalties, and next-event discovery', async () => {
    vi.spyOn(gameApi, 'submitTurn').mockResolvedValue(structuredClone(turn));
    renderGame();
    await submit();
    expect(await screen.findByText('WEEK 1 DEBRIEF')).toBeInTheDocument();
    expect(screen.getByText(/Alex Vega: 100.*75 HP/)).toBeInTheDocument();
    expect(screen.getByText(/Alex Vega: 75.*73 HP/)).toBeInTheDocument();
    expect(screen.getByText('Health penalties: food 2, water 0, oxygen 0.')).toBeInTheDocument();
    expect(screen.getByText(/Next week's discovery:/)).toBeInTheDocument();
    expect(screen.queryByText(/\[object Object\]/)).not.toBeInTheDocument();
  });

  it('renders actual treatment health gains', async () => {
    vi.mocked(gameApi.fetchGameState).mockResolvedValue(structuredClone(medicalGame));
    vi.spyOn(gameApi, 'submitTurn').mockResolvedValue(structuredClone(treatment));
    renderGame();
    await submit();
    expect(await screen.findByText(/Alex Vega: 92.*100 HP/)).toBeInTheDocument();
  });

  it.each([new TypeError('Connection lost'), new ApiError(503, 'Temporarily unavailable'), new ApiError(408, 'Request timed out')])(
    'retries the exact saved decision after an uncertain failure: %s', async (error) => {
      const send = vi.spyOn(gameApi, 'submitTurn').mockRejectedValueOnce(error)
        .mockResolvedValueOnce(structuredClone(turn));
      vi.mocked(gameApi.fetchGameState).mockResolvedValueOnce(structuredClone(game))
        .mockResolvedValueOnce({ game_id: turn.game_id, state: structuredClone(turn.state) });
      renderGame();
      await submit();
      const retry = await screen.findByRole('button', { name: /Retry week 1 submission/ });
      expect(screen.getByRole('button', { name: 'ALL EMERGENCY' })).toBeDisabled();
      expect(screen.getAllByRole('combobox').every((select) => (select as HTMLSelectElement).disabled)).toBe(true);
      const original = structuredClone(send.mock.calls[0][1]);
      await act(async () => { fireEvent.click(retry); });
      await screen.findByText('WEEK 1 DEBRIEF');
      expect(send.mock.calls[1][1]).toEqual(original);
      fireEvent.click(screen.getByRole('button', { name: /PROCEED TO WEEK 2/ }));
      expect(screen.getByRole('button', { name: 'ALL NORMAL' })).not.toBeDisabled();
    }
  );

  it('unlocks editing after a definite validation failure', async () => {
    const send = vi.spyOn(gameApi, 'submitTurn')
      .mockRejectedValueOnce(new ApiError(422, 'Insufficient water for rations.'))
      .mockResolvedValueOnce(structuredClone(turn));
    renderGame();
    await submit();
    await screen.findByText('Insufficient water for rations.');
    fireEvent.click(screen.getByRole('button', { name: 'ALL REDUCED' }));
    await submit();
    await screen.findByText('WEEK 1 DEBRIEF');
    expect(send.mock.calls[1][1].rations.alex.water).toBe('reduced');
    expect(send.mock.calls[1][1].request_id).not.toBe(send.mock.calls[0][1].request_id);
  });

  it('refreshes stale state without automatically submitting another turn', async () => {
    vi.mocked(gameApi.fetchGameState).mockResolvedValueOnce(structuredClone(game))
      .mockResolvedValueOnce({ game_id: turn.game_id, state: structuredClone(turn.state) });
    const send = vi.spyOn(gameApi, 'submitTurn').mockRejectedValue(new ApiError(409, 'Outdated turn.'));
    renderGame();
    await submit();
    expect(await screen.findByText('WEEK 2 / 12')).toBeInTheDocument();
    expect(screen.getByText(/current mission state has been refreshed/)).toBeInTheDocument();
    expect(send).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'ALL NORMAL' })).not.toBeDisabled();
  });

  it('preserves the saved decision if conflict recovery also fails', async () => {
    vi.mocked(gameApi.fetchGameState).mockResolvedValueOnce(structuredClone(game))
      .mockRejectedValueOnce(new TypeError('Offline'));
    const send = vi.spyOn(gameApi, 'submitTurn').mockRejectedValueOnce(new ApiError(409, 'Outdated turn.'))
      .mockResolvedValueOnce(structuredClone(turn));
    renderGame();
    await submit();
    const retry = await screen.findByRole('button', { name: /Retry week 1 submission/ });
    await act(async () => { fireEvent.click(retry); });
    await screen.findByText('WEEK 1 DEBRIEF');
    expect(send.mock.calls[1][1]).toEqual(send.mock.calls[0][1]);
  });

  it('routes to results when conflict recovery finds a finished mission', async () => {
    vi.mocked(gameApi.fetchGameState).mockResolvedValueOnce(structuredClone(game))
      .mockResolvedValueOnce(structuredClone(completed));
    vi.spyOn(gameApi, 'submitTurn').mockRejectedValue(new ApiError(409, 'Mission finished.'));
    renderGame();
    await submit();
    expect(await screen.findByText('Final results route')).toBeInTheDocument();
  });

  it('does not replace a newer mission state with an old retry receipt', async () => {
    vi.mocked(gameApi.fetchGameState).mockResolvedValueOnce(structuredClone(game))
      .mockResolvedValueOnce(structuredClone(completed));
    const send = vi.spyOn(gameApi, 'submitTurn').mockRejectedValueOnce(new TypeError('Response lost'))
      .mockResolvedValueOnce(structuredClone(turn));
    renderGame();
    await submit();
    const retry = await screen.findByRole('button', { name: /Retry week 1 submission/ });
    await act(async () => { fireEvent.click(retry); });
    expect(await screen.findByText('Final results route')).toBeInTheDocument();
    expect(send.mock.calls[1][1]).toEqual(send.mock.calls[0][1]);
  });

  it('prevents duplicate clicks while a submission is in flight', async () => {
    let resolve!: (value: typeof turn) => void;
    const send = vi.spyOn(gameApi, 'submitTurn').mockImplementation(() => new Promise((done) => { resolve = done; }));
    renderGame();
    const button = await screen.findByRole('button', { name: /SUBMIT WEEK 1 DECISIONS/ });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(send).toHaveBeenCalledTimes(1);
    await act(async () => { resolve(structuredClone(turn)); });
    await screen.findByText('WEEK 1 DEBRIEF');
  });

  it('shows fetch errors and allows retrying the initial connection', async () => {
    vi.mocked(gameApi.fetchGameState).mockRejectedValueOnce(new ApiError(404, 'Game not found.'))
      .mockResolvedValueOnce(structuredClone(game));
    renderGame();
    await screen.findByText('Game not found.');
    fireEvent.click(screen.getByRole('button', { name: 'Retry connection' }));
    expect(await screen.findByText('WEEK 1 / 12')).toBeInTheDocument();
  });
});
