import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GamePage } from '../pages/GamePage';
import { book, confirmIncident, chooseCrewTask, reviewWeek } from './helpers/station';
import { CrewCard } from '../components/CrewCard';
import * as api from '../api/game';
import { underfedGame, recuperationTurn, dehydratedGame } from './fixtures/backend';

function openGame() {
  render(<MemoryRouter initialEntries={['/game/fixture-game']}><Routes>
    <Route path="/game/:gameId" element={<GamePage />} />
  </Routes></MemoryRouter>);
}

describe('Nutrition, hydration, and recovery with real API fixtures', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('shows persistent deficits and prevents demanding work while retaining rest', async () => {
    vi.spyOn(api, 'fetchGameState').mockResolvedValue(structuredClone(underfedGame));
    openGame();
    await confirmIncident(underfedGame);
    fireEvent.click(screen.getByRole('button', { name: /^Inspect Alex Vega,/ }));
    fireEvent.click(book().getByRole('button', { name: 'Explore' }));
    const geology = book().getByRole('button', { name: 'Collect moon rocks' });
    expect(geology).toHaveAttribute('aria-disabled', 'true'); fireEvent.click(geology);
    expect(book().getByRole('button', { name: 'Confirm assignment' })).toBeDisabled();
    expect(book().getAllByText(/No outside work/).length).toBeGreaterThan(0);
    fireEvent.click(book().getByRole('button', { name: 'Restore science tools' }));
    expect(book().getAllByText(/Light work only/).length).toBeGreaterThan(0);
  });

  it('submits a rest assignment alongside provisions and reports gradual recovery', async () => {
    vi.spyOn(api, 'fetchGameState').mockResolvedValue(structuredClone(underfedGame));
    const send = vi.spyOn(api, 'submitTurn').mockResolvedValue(structuredClone(recuperationTurn));
    openGame();
    await confirmIncident(underfedGame);
    const free = underfedGame.state.current_event!.choices.find(c => c.available && !c.requires_crew)!;
    await chooseCrewTask(underfedGame, 'alex', 'crew_rest');
    fireEvent.click(await reviewWeek(underfedGame));
    await screen.findByText('WEEK 5 DEBRIEF');
    expect(send).toHaveBeenCalledWith('fixture-game', expect.objectContaining({
      event_choice_id: free.id,
      assignments: [{ crew_id: 'alex', activity_id: 'crew_rest' }],
      rations: { alex: { food: 'normal', water: 'normal' }, lin: { food: 'normal', water: 'normal' } },
    }));
    fireEvent.click(book().getByRole('button', { name: 'Details' }));
    expect(book().getByText(/Hunger 1.2 → 0.8/)).toBeInTheDocument();
    expect(recuperationTurn.turn_outcome.survival.health_changes.find(change => change.crew_id === 'alex')!.rested).toBe(true);
  });

  it('warns when continued water restriction could be fatal', () => {
    const crew = dehydratedGame.state.crew[0];
    expect(crew.hydration_deficit).toBe(0.6);
    render(<CrewCard crew={crew} rations={{ food: 'normal', water: 'emergency' }} onRationChange={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/could be fatal/);
    expect(screen.getByText(/Hydration: dehydrated/)).toBeInTheDocument();
  });
});
