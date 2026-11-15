import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ResultsPage, missionRating } from '../pages/ResultsPage';
import * as gameApi from '../api/game';
import { ApiError } from '../api/client';
import { completed, failed, game } from './fixtures/backend';

function renderResults() {
  render(<MemoryRouter initialEntries={['/results/fixture-game']}><Routes>
    <Route path="/results/:gameId" element={<ResultsPage />} />
    <Route path="/game/:gameId" element={<p>Active mission route</p>} />
    <Route path="/moon/" element={<p>Choose a mission</p>} />
  </Routes></MemoryRouter>);
}
describe('Compact mission results', () => {
  beforeEach(() => { vi.restoreAllMocks(); vi.spyOn(gameApi, 'fetchGameState').mockResolvedValue(structuredClone(completed)); });
  it('shows main outcomes and portraits without logs or system panels', async () => {
    renderResults(); await screen.findByRole('region', { name: 'Mission results' });
    expect(screen.getByRole('img', { name: `${missionRating(completed.state.results!).stars} out of 3 stars` })).toBeInTheDocument();
    expect(screen.getByText('12 / 12')).toBeInTheDocument(); expect(screen.getByText('2 / 2')).toBeInTheDocument();
    expect(screen.getByRole('listitem', { name: 'Alex Vega, survived' })).toBeInTheDocument();
    expect(screen.queryByText(/MISSION CHRONICLE|Weekly Decision Log/)).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Power|Life support/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('link', { name: 'Play again' })); expect(screen.getByText('Choose a mission')).toBeInTheDocument();
  });
  it('redirects an active mission instead of inventing an ending', async () => {
    vi.mocked(gameApi.fetchGameState).mockResolvedValue(structuredClone(game)); renderResults();
    expect(await screen.findByText('Active mission route')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /out of 3 stars/ })).not.toBeInTheDocument();
  });
  it('shows zero stars and lost crew for a real failed mission', async () => {
    vi.mocked(gameApi.fetchGameState).mockResolvedValue(structuredClone(failed)); renderResults();
    expect(await screen.findByRole('heading', { name: 'Mission ended' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '0 out of 3 stars' })).toBeInTheDocument();
    expect(screen.getAllByText('Lost')).toHaveLength(4);
  });
  it('allows retry after a retrieval error without inventing a rating', async () => {
    vi.mocked(gameApi.fetchGameState).mockRejectedValueOnce(new ApiError(404, 'Game not found.')).mockResolvedValueOnce(structuredClone(completed)); renderResults();
    expect(await screen.findByText('Game not found.')).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /out of 3 stars/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' })); expect(await screen.findByRole('region', { name: 'Mission results' })).toBeInTheDocument();
  });
  it.each([
    [0, 4, false, 2, 0], [0, 4, true, 2, 0], [1, 4, false, 2, 1],
    [1, 4, true, 2, 2], [4, 4, false, 2, 2], [4, 4, true, 2, 3],
    [1, 1, true, 2, 3], [4, 4, true, 0, 2],
  ] as const)('rates %i of %i crew, science=%s, goals=%i as %i stars', (alive, initial, science, goals, stars) => {
    const result = structuredClone(completed.state.results!);
    result.initial_crew_size = initial; result.surviving_crew_ids = Array.from({ length: alive }, (_, index) => `crew-${index}`);
    result.science.status = science ? 'complete' : 'partial'; result.science.total_objectives = goals;
    expect(missionRating(result).stars).toBe(stars);
  });
});
