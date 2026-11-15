import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GamePage } from '../pages/GamePage';
import * as api from '../api/game';
import { book, confirmIncident, reviewWeek, provisions, closeBook, notebookPage } from './helpers/station';
import { ApiError } from '../api/client';
import { game, turn, treatment, completed, medicalGame } from './fixtures/backend';
import { reportPages } from '../components/station/reportPages';

function renderGame() {
  return render(<MemoryRouter initialEntries={['/game/fixture-game']}><Routes>
    <Route path="/game/:gameId" element={<GamePage />} />
    <Route path="/results/:gameId" element={<p>Final results route</p>} />
  </Routes></MemoryRouter>);
}
async function submit() { await confirmIncident(); fireEvent.click(await reviewWeek()); }

describe('Scene gameplay with real API fixtures', () => {
  beforeEach(() => { vi.restoreAllMocks(); vi.spyOn(api, 'fetchGameState').mockResolvedValue(structuredClone(game)); });

  it('shows real ration costs one person at a time, with presets for the whole crew', async () => {
    renderGame(); await confirmIncident(); await provisions();
    expect(book().getByRole('heading', { name: 'Alex Vega' })).toBeInTheDocument();
    expect(book().getByRole('option', { name: 'emergency (0.44u)' })).toBeInTheDocument();
    fireEvent.click(book().getByRole('button', { name: 'All reduced' }));
    expect(book().getByRole('combobox', { name: 'Food for Alex Vega' })).toHaveValue('reduced');
    fireEvent.click(book().getByRole('button', { name: 'Next page' }));
    expect(book().getByRole('combobox', { name: 'Water for Maya Okafor' })).toHaveValue('reduced');
  });

  it('paginates confirmed consequences without hiding injury or next-discovery accounting', async () => {
    vi.spyOn(api, 'submitTurn').mockResolvedValue(structuredClone(turn)); renderGame(); await submit();
    await screen.findByText('WEEK 1 DEBRIEF');
    notebookPage('Incident consequences');
    const pages = reportPages(turn.turn_outcome, Object.fromEntries(turn.state.crew.map(person => [person.id, person.name]))).map(page => page.text).join(' ');
    expect(pages).toMatch(/Alex Vega: 100.*75 HP/);
    expect(pages).toMatch(/Alex Vega: 75.*75 HP/);
    expect(pages).toContain('Health penalties: food 0, water 0, oxygen 0.');
    expect(pages).toContain('already included in the station view');
    expect(book().queryByText(/\[object Object\]/)).not.toBeInTheDocument();
  });

  it('uses actual treatment gains in the confirmed report', async () => {
    vi.mocked(api.fetchGameState).mockResolvedValue(structuredClone(medicalGame));
    vi.spyOn(api, 'submitTurn').mockResolvedValue(structuredClone(treatment));
    renderGame(); await confirmIncident(medicalGame); fireEvent.click(await reviewWeek(medicalGame)); await screen.findByText('WEEK 1 DEBRIEF');
    const pages = reportPages(treatment.turn_outcome, { alex: 'Alex Vega' }).map(page => page.text).join(' ');
    expect(pages).toMatch(/Alex Vega: 92.*97 HP/); expect(pages).toMatch(/Alex Vega: 97.*100 HP/);
  });

  it.each([new TypeError('Connection lost'), new ApiError(503, 'Temporarily unavailable'), new ApiError(408, 'Request timed out')])('retries the exact locked request after an uncertain failure: %s', async error => {
    const send = vi.spyOn(api, 'submitTurn').mockRejectedValueOnce(error).mockResolvedValueOnce(structuredClone(turn));
    vi.mocked(api.fetchGameState).mockResolvedValueOnce(structuredClone(game)).mockResolvedValueOnce({ game_id: turn.game_id, state: structuredClone(turn.state) });
    renderGame(); await submit();
    await screen.findByRole('button', { name: 'Retry week 1 submission' });
    const original = structuredClone(send.mock.calls[0][1]);
    closeBook();
    fireEvent.click(screen.getByRole('button', { name: /^Inspect Alex Vega,/ }));
    expect(book().queryByRole('button', { name: 'Choose assignment' })).not.toBeInTheDocument();
    closeBook(); fireEvent.click(screen.getByRole('button', { name: 'Recover week 1' }));
    fireEvent.click(book().getByRole('button', { name: 'Retry week 1 submission' }));
    await screen.findByText('WEEK 1 DEBRIEF'); expect(send.mock.calls[1][1]).toEqual(original);
    fireEvent.click(book().getByRole('button', { name: 'PROCEED TO WEEK 2' }));
    expect(await screen.findByRole('button', { name: 'See responses' })).toBeEnabled();
  });

  it('restores an unresolved request after a refresh, even when GET already shows the advanced week', async () => {
    const send = vi.spyOn(api, 'submitTurn').mockRejectedValueOnce(new TypeError('Response lost')).mockResolvedValueOnce(structuredClone(turn));
    const first = renderGame(); await submit(); await screen.findByRole('button', { name: 'Retry week 1 submission' });
    const original = structuredClone(send.mock.calls[0][1]); first.unmount();
    vi.mocked(api.fetchGameState).mockResolvedValue({ game_id: turn.game_id, state: structuredClone(turn.state) });
    renderGame(); fireEvent.click(await screen.findByRole('button', { name: 'Retry week 1 submission' }));
    await screen.findByText('WEEK 1 DEBRIEF'); expect(send.mock.calls[1][1]).toEqual(original);
  });

  it('only rebuilds locked choices after a definite rejection and explicit recovery', async () => {
    const send = vi.spyOn(api, 'submitTurn').mockRejectedValueOnce(new ApiError(422, 'Insufficient water for rations.')).mockResolvedValueOnce(structuredClone(turn));
    renderGame(); await submit();
    fireEvent.click(await screen.findByRole('button', { name: 'Rebuild rejected week' }));
    await confirmIncident(); await provisions(); fireEvent.click(book().getByRole('button', { name: 'All reduced' }));
    fireEvent.click(book().getByRole('button', { name: "Confirm week's rations" }));
    fireEvent.click(book().getByRole('button', { name: 'End week 1' })); await screen.findByText('WEEK 1 DEBRIEF');
    expect(send.mock.calls[1][1].rations.alex.water).toBe('reduced');
    expect(send.mock.calls[1][1].request_id).not.toBe(send.mock.calls[0][1].request_id);
  });

  it('refreshes a stale week without automatically sending another request', async () => {
    vi.mocked(api.fetchGameState).mockResolvedValueOnce(structuredClone(game)).mockResolvedValueOnce({ game_id: turn.game_id, state: structuredClone(turn.state) });
    const send = vi.spyOn(api, 'submitTurn').mockRejectedValue(new ApiError(409, 'Outdated turn.'));
    renderGame(); await submit(); expect(await screen.findByText('WEEK 2 / 12')).toBeInTheDocument();
    expect(await screen.findByText(/current mission state has been refreshed/)).toBeInTheDocument(); expect(send).toHaveBeenCalledTimes(1);
  });

  it('keeps the original request when conflict recovery also fails', async () => {
    vi.mocked(api.fetchGameState).mockResolvedValueOnce(structuredClone(game)).mockRejectedValueOnce(new TypeError('Offline')).mockResolvedValueOnce({ game_id: turn.game_id, state: structuredClone(turn.state) });
    const send = vi.spyOn(api, 'submitTurn').mockRejectedValueOnce(new ApiError(409, 'Outdated turn.')).mockResolvedValueOnce(structuredClone(turn));
    renderGame(); await submit(); fireEvent.click(await screen.findByRole('button', { name: 'Retry week 1 submission' }));
    await screen.findByText('WEEK 1 DEBRIEF'); expect(send.mock.calls[1][1]).toEqual(send.mock.calls[0][1]);
  });

  it('routes to results when conflict recovery finds a finished mission', async () => {
    vi.mocked(api.fetchGameState).mockResolvedValueOnce(structuredClone(game)).mockResolvedValueOnce(structuredClone(completed));
    vi.spyOn(api, 'submitTurn').mockRejectedValue(new ApiError(409, 'Mission finished.'));
    renderGame(); await submit(); expect(await screen.findByText('Final results route')).toBeInTheDocument();
  });

  it('never replaces newer state with an old retry receipt', async () => {
    vi.mocked(api.fetchGameState).mockResolvedValueOnce(structuredClone(game)).mockResolvedValueOnce(structuredClone(completed));
    const send = vi.spyOn(api, 'submitTurn').mockRejectedValueOnce(new TypeError('Lost')).mockResolvedValueOnce(structuredClone(turn));
    renderGame(); await submit(); fireEvent.click(await screen.findByRole('button', { name: 'Retry week 1 submission' }));
    expect(await screen.findByText('Final results route')).toBeInTheDocument(); expect(send.mock.calls[1][1]).toEqual(send.mock.calls[0][1]);
  });

  it('guards duplicate submission clicks', async () => {
    let resolve!: (response: typeof turn) => void;
    const send = vi.spyOn(api, 'submitTurn').mockImplementation(() => new Promise(done => { resolve = done; }));
    renderGame(); await confirmIncident(); const button = await reviewWeek(); fireEvent.click(button); fireEvent.click(button);
    expect(send).toHaveBeenCalledTimes(1); await act(async () => resolve(structuredClone(turn))); await screen.findByText('WEEK 1 DEBRIEF');
  });

  it('retries an initial connection failure', async () => {
    vi.mocked(api.fetchGameState).mockRejectedValueOnce(new ApiError(404, 'Game not found.')).mockResolvedValueOnce(structuredClone(game));
    renderGame(); await screen.findByText('Game not found.'); fireEvent.click(screen.getByRole('button', { name: 'Retry connection' }));
    expect(await screen.findByText('WEEK 1 / 12')).toBeInTheDocument();
  });
});
