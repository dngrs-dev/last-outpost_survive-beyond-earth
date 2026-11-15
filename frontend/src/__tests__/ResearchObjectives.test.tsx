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

  it('keeps research targets in the optional mission brief', async () => {
    vi.spyOn(gameApi, 'fetchCatalog').mockResolvedValue(structuredClone(catalog));
    render(<MemoryRouter><SetupPage /></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Mission brief' }));
    const brief = screen.getByRole('region', { name: 'Research objectives' });
    expect(within(brief).getByText('Baseline sample collection')).toBeInTheDocument();
    expect(within(brief).getByText('Target: 2')).toBeInTheDocument();
    expect(within(brief).getByText(/Pack a field science kit/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Change mission' })).toHaveAttribute('href', '/moon/?site=apollo-11');
  });

  it('submits a planned research task and shows earned objective progress', async () => {
    vi.spyOn(gameApi, 'fetchGameState').mockResolvedValue(structuredClone(researchGame));
    const send = vi.spyOn(gameApi, 'submitTurn').mockResolvedValue(structuredClone(researchTurn));
    render(<MemoryRouter initialEntries={['/game/fixture-game']}><Routes>
      <Route path="/game/:gameId" element={<GamePage />} />
    </Routes></MemoryRouter>);
    fireEvent.change(await screen.findByRole('combobox', { name: 'Assignment for Lin Park' }), { target: { value: 'research_geology' } });
    const response = researchGame.state.current_event!.choices.find(c => !c.requires_crew)!;
    fireEvent.click(screen.getByText(new RegExp(response.text)));
    fireEvent.click(screen.getByRole('button', { name: /SUBMIT WEEK 1 DECISIONS/ }));
    expect(await screen.findByText('Research objective: Baseline sample collection +1.')).toBeInTheDocument();
    expect(send).toHaveBeenCalledWith('fixture-game', expect.objectContaining({
      assignments: [{ crew_id: 'lin', activity_id: 'research_geology' }], expected_week: 1,
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
