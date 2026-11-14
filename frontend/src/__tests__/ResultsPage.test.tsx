import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ResultsPage } from '../pages/ResultsPage';
import * as gameApi from '../api/game';
import { ApiError } from '../api/client';
import { completed, failed, game } from './fixtures/backend';

function renderResults() {
  render(<MemoryRouter initialEntries={['/results/fixture-game']}><Routes>
    <Route path="/results/:gameId" element={<ResultsPage />} />
    <Route path="/game/:gameId" element={<p>Active mission route</p>} />
  </Routes></MemoryRouter>);
}

describe('ResultsPage with real API fixtures', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(gameApi, 'fetchGameState').mockResolvedValue(structuredClone(completed));
  });

  it('renders the actual final ending and crew statistics', async () => {
    renderResults();
    expect(await screen.findByText(completed.state.ending!.replace(/_/g, ' ').toUpperCase())).toBeInTheDocument();
    expect(screen.getByText('12 / 12')).toBeInTheDocument();
    expect(screen.getByText('2 / 2')).toBeInTheDocument();
    expect(screen.getByText('Alex Vega')).toBeInTheDocument();
  });

  it('shows backend consequences in the mission chronicle', async () => {
    renderResults();
    await screen.findByText(/MISSION CHRONICLE/);
    fireEvent.click(screen.getAllByText('View consequences')[0]);
    expect(screen.getAllByText(/Alex Vega: 92.*100 HP/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/\[object Object\]/)).not.toBeInTheDocument();
  });

  it('redirects an active mission instead of inventing a successful ending', async () => {
    vi.mocked(gameApi.fetchGameState).mockResolvedValue(structuredClone(game));
    renderResults();
    expect(await screen.findByText('Active mission route')).toBeInTheDocument();
    expect(screen.queryByText('SUCCESSFUL HANDOVER')).not.toBeInTheDocument();
  });

  it('renders a real failure reason and deceased crew', async () => {
    vi.mocked(gameApi.fetchGameState).mockResolvedValue(structuredClone(failed));
    renderResults();
    expect(await screen.findByText('MISSION FAILURE')).toBeInTheDocument();
    expect(screen.getByText(failed.state.results!.failure_reason!)).toBeInTheDocument();
    expect(screen.getAllByText('DECEASED')).toHaveLength(4);
  });

  it('shows retrieval errors without rendering an ending', async () => {
    vi.mocked(gameApi.fetchGameState).mockRejectedValue(new ApiError(404, 'Game not found.'));
    renderResults();
    expect(await screen.findByText('Game not found.')).toBeInTheDocument();
    expect(screen.queryByText('SUCCESSFUL HANDOVER')).not.toBeInTheDocument();
  });
});
