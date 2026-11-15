import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GamePage } from '../pages/GamePage';
import * as api from '../api/game';
import { completed, game, researchGame, researchTurn, medicalAssignmentGame, projectRecording } from './fixtures/backend';
import { planningStep, reviewWeek } from './helpers/station';

function openGame() {
  render(<MemoryRouter initialEntries={['/game/fixture-game']}><Routes>
    <Route path="/game/:gameId" element={<GamePage />} />
    <Route path="/results/:gameId" element={<p>Final results route</p>} />
  </Routes></MemoryRouter>);
}

function bookmark(name: string) {
  fireEvent.click(within(screen.getByRole('navigation', { name: 'Station bookmarks' })).getByRole('button', { name }));
}

describe('Station room and guided weekly planning', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, 'fetchGameState').mockResolvedValue(structuredClone(researchGame));
  });

  it('starts with one focused incident step and accessible room and bookmark controls', async () => {
    openGame();
    await screen.findByRole('region', { name: 'Incident response' });
    expect(screen.getByRole('region', { name: 'Station common room' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Step 1: Incident' })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('navigation', { name: 'Station bookmarks' }).querySelectorAll('button')).toHaveLength(5);
    expect(screen.queryByRole('combobox', { name: 'Assignment for Lin Park' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^End week/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/NASA Space Apps Challenge 2026/)).not.toBeInTheDocument();
  });

  it('preserves a draft across all four steps, inspection and bookmarks without sending a turn', async () => {
    const send = vi.spyOn(api, 'submitTurn');
    openGame();
    const free = researchGame.state.current_event!.choices.find(choice => choice.available && !choice.requires_crew)!;
    fireEvent.click(await screen.findByRole('button', { name: free.text }));
    await planningStep('Crew');
    fireEvent.change(screen.getByRole('combobox', { name: 'Assignment for Lin Park' }), { target: { value: 'research_geology' } });
    await planningStep('Food & water');
    fireEvent.change(screen.getByRole('combobox', { name: 'Water for Lin Park' }), { target: { value: 'reduced' } });
    fireEvent.click(screen.getByRole('button', { name: /Inspect Lin Park/ }));
    expect(screen.getByRole('region', { name: 'Condition of Lin Park' })).toBeInTheDocument();
    bookmark('Stores');
    expect(screen.getByRole('heading', { name: 'Station stores' })).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Condition of Lin Park' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Return to plan' }));
    expect(screen.getByRole('combobox', { name: 'Water for Lin Park' })).toHaveValue('reduced');
    await planningStep('Crew');
    expect(screen.getByRole('combobox', { name: 'Assignment for Lin Park' })).toHaveValue('research_geology');
    await reviewWeek();
    expect(screen.getByRole('region', { name: 'Review weekly plan' })).toHaveTextContent('normal food / reduced water');
    expect(screen.getByRole('group', { name: 'Confirmed station resources' })).toHaveTextContent(String(researchGame.state.resources.food));
    expect(send).not.toHaveBeenCalled();
  });

  it('keeps incident crew and medical patients unavailable for another assignment', async () => {
    vi.mocked(api.fetchGameState).mockResolvedValue(structuredClone(medicalAssignmentGame));
    openGame();
    await screen.findByRole('region', { name: 'Incident response' });
    const lead = (screen.getByRole('combobox', { name: 'Response lead' }) as HTMLSelectElement).value;
    const leadName = medicalAssignmentGame.state.crew.find(person => person.id === lead)!.name;
    await planningStep('Crew');
    const occupied = screen.getByRole('combobox', { name: `Assignment for ${leadName}` });
    expect(Array.from((occupied as HTMLSelectElement).options).find(option => option.value === 'crew_rest')).toBeDisabled();
    await planningStep('Incident');
    const free = medicalAssignmentGame.state.current_event!.choices.find(choice => choice.available && !choice.requires_crew)!;
    fireEvent.click(screen.getByRole('button', { name: free.text }));
    await planningStep('Crew');
    fireEvent.change(screen.getByRole('combobox', { name: 'Assignment for Maya Okafor' }), { target: { value: 'medical_care' } });
    const patient = screen.getByRole('combobox', { name: 'Assignment for Alex Vega' });
    expect(within(patient).getByRole('option', { name: 'Receiving medical care', selected: true })).toBeInTheDocument();
    expect(Array.from((patient as HTMLSelectElement).options).filter(option => option.value).every(option => option.disabled)).toBe(true);
  });

  it('revalidates combined spending when independently affordable assignments are combined', async () => {
    // Isolated budget boundary, using the API fixture's actual choices and costs.
    const fixture = structuredClone(researchGame);
    const sample = fixture.state.assignment_options.find(option => option.id === 'research_geology')!;
    fixture.state.resources.oxygen = sample.costs.oxygen;
    vi.mocked(api.fetchGameState).mockResolvedValue(fixture);
    openGame();
    const free = fixture.state.current_event!.choices.find(choice => choice.available && !choice.requires_crew)!;
    fireEvent.click(await screen.findByRole('button', { name: free.text }));
    await planningStep('Crew');
    for (const person of fixture.state.crew) fireEvent.change(screen.getByRole('combobox', { name: `Assignment for ${person.name}` }), { target: { value: sample.id } });
    expect(await reviewWeek()).toBeDisabled();
    expect(screen.getByText('Combined plan exceeds available oxygen.')).toBeInTheDocument();
    await planningStep('Crew');
    fireEvent.change(screen.getByRole('combobox', { name: `Assignment for ${fixture.state.crew[0].name}` }), { target: { value: '' } });
    expect(await reviewWeek()).toBeEnabled();
  });

  it('shows queued project orders without changing confirmed phase or consuming stock', async () => {
    const send = vi.spyOn(api, 'submitTurn');
    vi.mocked(api.fetchGameState).mockResolvedValue(structuredClone(projectRecording));
    openGame();
    await screen.findByRole('region', { name: 'Incident response' });
    bookmark('Science');
    const project = projectRecording.state.research_projects[0];
    fireEvent.change(screen.getByRole('combobox', { name: `Project control for ${project.id}` }), { target: { value: 'pause' } });
    expect(screen.getByText(/Planned order: pause/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: `${project.id} phase progress` })).toHaveAttribute('value', String(project.phase_progress));
    await reviewWeek();
    expect(screen.getByText(`${project.id}: pause scheduled for this turn.`)).toBeInTheDocument();
    expect(send).not.toHaveBeenCalled();
  });

  it('updates only from confirmed results, separates science from survival and retains the journal', async () => {
    vi.spyOn(api, 'submitTurn').mockResolvedValue(structuredClone(researchTurn));
    openGame();
    fireEvent.click(await reviewWeek());
    await screen.findByRole('region', { name: 'Week 1 confirmed results' });
    expect(screen.getByRole('heading', { name: 'Survival' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Scientific achievement' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^End week/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Step 2: Crew' })).toBeDisabled();
    const stocks = screen.getByRole('group', { name: 'Confirmed station resources' });
    expect(stocks).toHaveTextContent(String(Number(researchTurn.state.resources.food.toFixed(1))));
    fireEvent.click(screen.getByRole('button', { name: /PROCEED TO WEEK/ }));
    await planningStep('Crew');
    expect(screen.getByRole('combobox', { name: 'Assignment for Lin Park' })).toHaveValue('');
    bookmark('Log');
    expect(screen.getByText(`Week 1 · ${researchTurn.turn_outcome.event.choice_text}`)).toBeInTheDocument();
  });

  it('keeps critical cabin and reserve warnings visible while reading optional panels', async () => {
    const fixture = structuredClone(game);
    fixture.state.life_support.co2_burden = fixture.state.life_support.co2_warning_level + 1;
    fixture.state.depleted_provisions = ['food'];
    fixture.state.resources.food = 0;
    vi.mocked(api.fetchGameState).mockResolvedValue(fixture);
    openGame();
    await screen.findByRole('region', { name: 'Incident response' });
    bookmark('Log');
    expect(screen.getByText(/Cabin CO2 is above/)).toBeInTheDocument();
    expect(screen.getByText(/Empty reserves: food/)).toBeInTheDocument();
    await planningStep('Food & water');
    expect(screen.getByRole('combobox', { name: 'Food for Alex Vega' })).toHaveValue('emergency');
  });

  it('shows the final confirmed week before opening the mission results route', async () => {
    const lastWeek = completed.state.history[completed.state.history.length - 1];
    vi.spyOn(api, 'submitTurn').mockResolvedValue({ ...structuredClone(completed), turn_outcome: structuredClone(lastWeek) });
    openGame();
    fireEvent.click(await reviewWeek());
    await screen.findByText(`WEEK ${lastWeek.week} DEBRIEF`);
    expect(screen.queryByText('Final results route')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View final mission results' }));
    expect(await screen.findByText('Final results route')).toBeInTheDocument();
  });
});
