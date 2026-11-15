import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GamePage } from '../pages/GamePage';
import * as api from '../api/game';
import { supportGame, parallelTurn, researchGame } from './fixtures/backend';
import { book, confirmIncident, chooseCrewTask, reviewWeek } from './helpers/station';
import { newWeekPlan, planIssues } from '../state/weeklyPlan';

function openGame() { render(<MemoryRouter initialEntries={['/game/fixture-game']}><Routes><Route path="/game/:gameId" element={<GamePage />} /></Routes></MemoryRouter>); }
describe('Incident crew and immutable assignments', () => {
  beforeEach(() => { vi.restoreAllMocks(); vi.spyOn(api, 'fetchGameState').mockResolvedValue(structuredClone(supportGame)); });
  it('requires explicit support before committing and submits free crew work in the same turn', async () => {
    const send = vi.spyOn(api, 'submitTurn').mockResolvedValue(structuredClone(parallelTurn)); openGame();
    const choice = supportGame.state.current_event!.choices.find(choice => choice.minimum_crew === 2)!;
    const actor = choice.eligible_crew.find(candidate => candidate.available)!.crew_id;
    const support = choice.support_candidates.find(candidate => candidate.available && candidate.crew_id !== actor)!.crew_id;
    await confirmIncident(supportGame, { choiceId: choice.id, leadId: actor, supportIds: [support] });
    const worker = supportGame.state.crew.find(person => person.id !== actor && person.id !== support)!;
    await chooseCrewTask(supportGame, worker.id, 'research_geology'); fireEvent.click(await reviewWeek(supportGame)); await screen.findByText(/WEEK .* DEBRIEF/);
    expect(send.mock.calls[0][1]).toMatchObject({ selected_crew_id: actor, support_crew_ids: [support], assignments: [{ crew_id: worker.id, activity_id: 'research_geology' }] });
  });
  it('rejects a response lead double-booked by an assignment before any submission', () => {
    const choice = supportGame.state.current_event!.choices.find(choice => choice.available && choice.requires_crew)!;
    const actor = choice.eligible_crew.find(candidate => candidate.available)!.crew_id;
    const plan = { ...newWeekPlan(supportGame.state), incidentConfirmed: true, event_choice_id: choice.id, selected_crew_id: actor, support_crew_ids: choice.support_candidates.filter(candidate => candidate.available && candidate.crew_id !== actor).slice(0, choice.minimum_crew - 1).map(candidate => candidate.crew_id), assignments: [{ crew_id: actor, activity_id: 'research_geology' }] };
    expect(planIssues(supportGame.state, plan, false)).toContain('Each astronaut can perform only one main job this week.');
  });
  it('prevents a second independently affordable job from overspending the combined budget', async () => {
    const fixture = structuredClone(researchGame); fixture.state.resources.oxygen = 2;
    vi.mocked(api.fetchGameState).mockResolvedValue(fixture); openGame(); await confirmIncident(fixture); await chooseCrewTask(fixture, 'lin', 'research_geology');
    fireEvent.click(screen.getByRole('button', { name: /^Inspect Alex Vega,/ })); fireEvent.click(book().getByRole('button', { name: 'Explore' }));
    const task = book().getByRole('button', { name: 'Collect moon rocks' });
    expect(task).toHaveAttribute('aria-disabled', 'true'); fireEvent.click(task);
    expect(book().getByRole('button', { name: 'Confirm assignment' })).toBeDisabled(); expect(book().getAllByText('Combined plan exceeds available oxygen.').length).toBeGreaterThan(0);
  });
});
