import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GamePage } from '../pages/GamePage';
import * as api from '../api/game';
import { planningStep, reviewWeek } from './helpers/station';
import { supportGame, parallelTurn } from './fixtures/backend';

function openGame() {
  render(<MemoryRouter initialEntries={['/game/fixture-game']}><Routes>
    <Route path="/game/:gameId" element={<GamePage />} />
  </Routes></MemoryRouter>);
}

describe('Independent weekly crew work', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, 'fetchGameState').mockResolvedValue(structuredClone(supportGame));
  });

  it('requires support crew and sends the response and free crew work together', async () => {
    const send = vi.spyOn(api, 'submitTurn').mockResolvedValue(structuredClone(parallelTurn));
    openGame();
    const response = supportGame.state.current_event!.choices.find(c => c.minimum_crew === 2)!;
    fireEvent.click(await screen.findByText(new RegExp(response.text)));
    const actor = [...response.eligible_crew].filter(c => c.available).sort((a, b) => b.success_probability - a.success_probability)[0].crew_id;
    const support = supportGame.state.crew.find(c => c.id !== actor)!;
    const worker = supportGame.state.crew.find(c => c.id !== actor && c.id !== support.id)!;
    expect(await reviewWeek()).toBeDisabled();
    await planningStep('Incident');
    fireEvent.click(screen.getByRole('checkbox', { name: support.name }));
    await planningStep('Crew');
    fireEvent.change(screen.getByRole('combobox', { name: `Assignment for ${worker.name}` }), { target: { value: 'research_geology' } });
    const submit = await reviewWeek();
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    await screen.findByText(/WEEK .* DEBRIEF/);
    expect(send).toHaveBeenCalledWith('fixture-game', expect.objectContaining({
      selected_crew_id: actor, support_crew_ids: [support.id],
      event_choice_id: response.id, assignments: [{ crew_id: worker.id, activity_id: 'research_geology' }],
    }));
  });

  it('blocks a previously assigned worker from becoming incident crew as well', async () => {
    openGame();
    const response = supportGame.state.current_event!.choices.find(c => !c.requires_crew)!;
    fireEvent.click(await screen.findByText(new RegExp(response.text)));
    await planningStep('Crew');
    fireEvent.change(screen.getByRole('combobox', { name: 'Assignment for Alex Vega' }), { target: { value: 'research_geology' } });
    const repair = supportGame.state.current_event!.choices.find(c => c.requires_crew)!;
    await planningStep('Incident');
    fireEvent.click(screen.getByText(new RegExp(repair.text)));
    fireEvent.change(screen.getByRole('combobox', { name: 'Response lead' }), { target: { value: 'alex' } });
    await planningStep('Crew');
    expect(screen.getByText('Each astronaut can perform only one main job this week.')).toBeInTheDocument();
    expect(await reviewWeek()).toBeDisabled();
    await planningStep('Crew');
    const panel = screen.getByRole('region', { name: 'Crew assignments' });
    expect(within(panel).getAllByRole('option', { name: 'Routine duties', selected: true })).toBeDefined();
  });
});
