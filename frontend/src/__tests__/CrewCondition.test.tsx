import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GamePage } from '../pages/GamePage';
import { planningStep, reviewWeek, fullReport } from './helpers/station';
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
    await planningStep('Crew');
    const select = screen.getByRole('combobox', { name: 'Assignment for Alex Vega' });
    const options = Array.from((select as HTMLSelectElement).options);
    expect(options.find(o => o.value === 'research_geology')).toBeDisabled();
    expect(options.find(o => o.value === 'research_instrument')).toBeDisabled();
    expect(options.find(o => o.value === 'crew_rest')).toBeEnabled();
    expect(screen.getAllByText(/light duties only/).length).toBeGreaterThan(0);
    await planningStep('Food & water');
    expect(screen.getAllByText(/Nutrition: depleted/)).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: /Inspect Alex Vega/ }));
    expect(screen.getByText(/Nutrition deficit 1.20/i)).toBeInTheDocument();
  });

  it('submits a rest assignment alongside provisions and reports gradual recovery', async () => {
    vi.spyOn(api, 'fetchGameState').mockResolvedValue(structuredClone(underfedGame));
    const send = vi.spyOn(api, 'submitTurn').mockResolvedValue(structuredClone(recuperationTurn));
    openGame();
    await screen.findByRole('region', { name: 'Incident response' });
    const free = underfedGame.state.current_event!.choices.find(c => c.available && !c.requires_crew)!;
    fireEvent.click(screen.getByRole('button', { name: free.text }));
    await planningStep('Crew');
    fireEvent.change(screen.getByRole('combobox', { name: 'Assignment for Alex Vega' }), { target: { value: 'crew_rest' } });
    fireEvent.click(await reviewWeek());
    await fullReport(5);
    expect(send).toHaveBeenCalledWith('fixture-game', expect.objectContaining({
      event_choice_id: free.id,
      assignments: [{ crew_id: 'alex', activity_id: 'crew_rest' }],
      rations: { alex: { food: 'normal', water: 'normal' }, lin: { food: 'normal', water: 'normal' } },
    }));
    expect(screen.getByText(/nutrition 1.2 to 0.8/)).toBeInTheDocument();
    expect(screen.getByText(/Recovery:.*with rest/)).toBeInTheDocument();
  });

  it('warns when continued water restriction could be fatal', () => {
    const crew = dehydratedGame.state.crew[0];
    expect(crew.hydration_deficit).toBe(0.6);
    render(<CrewCard crew={crew} rations={{ food: 'normal', water: 'emergency' }} onRationChange={vi.fn()} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/could be fatal/);
    expect(screen.getByText(/Hydration: dehydrated/)).toBeInTheDocument();
  });
});
