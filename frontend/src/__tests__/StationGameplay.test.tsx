import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GamePage } from '../pages/GamePage';
import * as api from '../api/game';
import { completed, game, researchGame, researchTurn } from './fixtures/backend';
import { book, closeBook, confirmIncident, chooseCrewTask, reviewWeek, openStatus } from './helpers/station';

function openGame() { return render(<MemoryRouter initialEntries={['/game/fixture-game']}><Routes><Route path="/game/:gameId" element={<GamePage />} /><Route path="/results/:gameId" element={<p>Final results route</p>} /></Routes></MemoryRouter>); }

describe('Full-screen station and direct panels', () => {
  beforeEach(() => { vi.restoreAllMocks(); vi.spyOn(api, 'fetchGameState').mockResolvedValue(structuredClone(researchGame)); });

  it('opens the weekly incident over the station and removes the header, footer, directory and step rail', async () => {
    openGame(); await screen.findByRole('dialog', { name: researchGame.state.current_event!.title });
    expect(screen.getByRole('region', { name: 'Station common room' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute('open');
    expect(document.querySelector('main > header')).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Weekly planning steps' })).not.toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Station bookmarks' })).not.toBeInTheDocument();
    expect(book().getByRole('button', { name: 'Confirm response' })).toBeDisabled();
    expect(document.querySelector('main > p[role=status]')).not.toBeInTheDocument();
  });

  it('locks a confirmed incident across refreshes and hides its dispatched crew', async () => {
    const choice = researchGame.state.current_event!.choices.find(choice => choice.available && choice.requires_crew)!;
    const first = openGame();
    await confirmIncident(researchGame, { choiceId: choice.id });
    const saved = JSON.parse(localStorage.getItem('last-outpost.week-plan.v1.fixture-game')!);
    const station = screen.getByRole('region', { name: 'Station common room' });
    expect(station.querySelector(`[data-crew-id="${saved.selected_crew_id}"]`)).not.toBeInTheDocument();
    first.unmount(); openGame(); await screen.findByRole('button', { name: 'Next week' });
    expect(screen.queryByRole('button', { name: 'See responses' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Dispatched crew:/ })); fireEvent.click(book().getByRole('button', { name: `Inspect ${researchGame.state.crew.find(person => person.id === saved.selected_crew_id)!.name}` }));
    expect(book().queryByRole('button', { name: 'Confirm assignment' })).not.toBeInTheDocument();
  });

  it('commits a crew task, removes an outside worker, and offers read-only inspection through the airlock', async () => {
    const send = vi.spyOn(api, 'submitTurn'); openGame(); await confirmIncident(researchGame);
    await chooseCrewTask(researchGame, 'lin', 'research_geology');
    expect(screen.getByRole('region', { name: 'Station common room' }).querySelector('[data-crew-id="lin"]')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dispatched crew: 1' }));
    fireEvent.click(book().getByRole('button', { name: 'Inspect Lin Park' }));
    expect(book().queryByRole('button', { name: 'Choose assignment' })).not.toBeInTheDocument();
    expect(book().getByText('Already assigned this week.')).toBeInTheDocument(); expect(send).not.toHaveBeenCalled();
  });

  it('keeps unassigned crew free after feeding and submits confirmed jobs together', async () => {
    const send = vi.spyOn(api, 'submitTurn').mockResolvedValue(structuredClone(researchTurn));
    openGame(); await confirmIncident(researchGame); await chooseCrewTask(researchGame, 'lin', 'research_geology');
    await reviewWeek(researchGame);
    fireEvent.click(screen.getByRole('button', { name: /^Inspect Alex Vega,/ }));
    expect(book().getByRole('button', { name: 'Confirm assignment' })).toBeDisabled(); closeBook();
    fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
    await screen.findByText('WEEK 1 DEBRIEF'); expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][1].assignments).toEqual([{ crew_id: 'lin', activity_id: 'research_geology' }]);
  });

  it('shows hover/focus condition cards and offers the same information by tapping a character', async () => {
    openGame(); await confirmIncident(researchGame);
    const actor = screen.getByRole('button', { name: /^Inspect Alex Vega,/ });
    fireEvent.mouseEnter(actor); expect(screen.getByRole('tooltip')).toHaveTextContent('Food: adequate');
    expect(screen.getByRole('tooltip')).toHaveTextContent('Water: adequate');
    fireEvent.keyDown(actor, { key: 'Escape' }); expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    fireEvent.click(actor); expect(book().getByRole('group', { name: 'food for Alex Vega' })).toBeInTheDocument();
  });

  it('contains keyboard focus in the notebook and restores it to the invoking object', async () => {
    openGame(); await confirmIncident(researchGame);
    const computer = screen.getByRole('button', { name: 'Station status' }); computer.focus(); fireEvent.click(computer);
    expect(document.activeElement).toBe(book().getByRole('heading', { level: 1 }));
    const last = book().getByRole('button', { name: 'Return to station' }); last.focus(); fireEvent.keyDown(last, { key: 'Tab' });
    expect(document.activeElement).toBe(book().getByRole('button', { name: 'Close panel' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(document.activeElement).toBe(computer);
  });

  it('keeps critical cabin readings available without a permanent dashboard', async () => {
    const fixture = structuredClone(game); fixture.state.life_support.co2_burden = fixture.state.life_support.co2_warning_level + 1;
    vi.mocked(api.fetchGameState).mockResolvedValue(fixture); openGame(); await confirmIncident(fixture);
    expect(screen.getByRole('button', { name: 'Station needs attention' })).toBeInTheDocument();
    await openStatus('Air & water'); expect(book().getByText('Cabin CO2')).toBeInTheDocument();
  });

  it('keeps short help available in one view', async () => {
    openGame(); await confirmIncident(researchGame); fireEvent.click(screen.getByRole('button', { name: 'Open field guide' }));
    expect(book().getByRole('heading', { name: '1 · Choose a response' })).toBeInTheDocument();
    expect(book().getByRole('heading', { name: '4 · Next week' })).toBeInTheDocument();
    expect(book().queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
  });

  it('shows a final confirmed debrief before the mission results route', async () => {
    const final = completed.state.history[completed.state.history.length - 1];
    vi.spyOn(api, 'submitTurn').mockResolvedValue({ ...structuredClone(completed), turn_outcome: structuredClone(final) });
    openGame(); await confirmIncident(researchGame); fireEvent.click(await reviewWeek(researchGame));
    await screen.findByRole('dialog', { name: `WEEK ${final.week} DEBRIEF` }); expect(screen.queryByText('Final results route')).not.toBeInTheDocument();
    fireEvent.click(book().getByRole('button', { name: 'View final mission results' })); expect(await screen.findByText('Final results route')).toBeInTheDocument();
  });
});
