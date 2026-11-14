import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GamePage } from '../pages/GamePage';
import { ResultsPage } from '../pages/ResultsPage';
import { SetupPage } from '../pages/SetupPage';
import * as gameApi from '../api/game';
import { catalog, completed, researchGame, researchTurn, researchCompleted } from './fixtures/backend';

describe('Mission research with real API fixtures', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('briefs the selected outpost and updates targets when switching missions', async () => {
    vi.spyOn(gameApi, 'fetchCatalog').mockResolvedValue(structuredClone(catalog));
    render(<MemoryRouter><SetupPage /></MemoryRouter>);
    const brief = await screen.findByRole('region', { name: 'Research objectives' });
    expect(within(brief).getByText('Baseline sample collection')).toBeInTheDocument();
    expect(within(brief).getByText('Target: 2')).toBeInTheDocument();
    expect(within(brief).getByText(/Pack a field science kit/)).toBeInTheDocument();
    fireEvent.change(screen.getByRole('combobox', { name: 'Outpost' }), { target: { value: 'oceanus' } });
    expect(within(brief).getByText('First field sample')).toBeInTheDocument();
    expect(within(brief).queryByText('Seismic baseline')).not.toBeInTheDocument();
  });

  it('submits a planned research task and shows earned objective progress', async () => {
    vi.spyOn(gameApi, 'fetchGameState').mockResolvedValue(structuredClone(researchGame));
    const send = vi.spyOn(gameApi, 'submitTurn').mockResolvedValue(structuredClone(researchTurn));
    render(<MemoryRouter initialEntries={['/game/fixture-game']}><Routes>
      <Route path="/game/:gameId" element={<GamePage />} />
    </Routes></MemoryRouter>);
    fireEvent.click(await screen.findByText(/Survey a geological sample/));
    fireEvent.click(screen.getByRole('button', { name: /Astronaut LIN/ }));
    fireEvent.click(screen.getByRole('button', { name: /SUBMIT WEEK 1 DECISIONS/ }));
    expect(await screen.findByText('Research objective: Baseline sample collection +1.')).toBeInTheDocument();
    expect(send).toHaveBeenCalledWith('fixture-game', expect.objectContaining({
      event_choice_id: 'research_geology', selected_crew_id: 'lin', expected_week: 1,
    }));
    expect(screen.getByRole('progressbar', { name: 'Baseline sample collection progress' })).toHaveAttribute('value', '1');
  });

  it.each([
    [completed, 'Research program partially completed'],
    [researchCompleted, 'Research program complete'],
  ] as const)('reports science separately from the actual survival ending', async (fixture, assessment) => {
    vi.spyOn(gameApi, 'fetchGameState').mockResolvedValue(structuredClone(fixture));
    render(<MemoryRouter initialEntries={['/results/fixture-game']}><Routes>
      <Route path="/results/:gameId" element={<ResultsPage />} />
    </Routes></MemoryRouter>);
    const science = await screen.findByRole('region', { name: 'Scientific achievement' });
    expect(within(science).getByText(assessment)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Survival outcome' })).toBeInTheDocument();
    expect(screen.getByText(fixture.state.ending!.replace(/_/g, ' ').toUpperCase())).toBeInTheDocument();
    for (const objective of fixture.state.results!.science.objectives) {
      expect(within(science).getByRole('progressbar', { name: `${objective.title} progress` }))
        .toHaveAttribute('value', String(objective.progress));
    }
  });
});
