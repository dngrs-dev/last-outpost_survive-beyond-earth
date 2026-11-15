import { fireEvent, render, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GamePage } from '../pages/GamePage';
import * as api from '../api/game';
import { researchGame, researchTurn } from './fixtures/backend';
import { chooseMeal, feedAll, missingMeals, newWeekPlan, readWeekPlan, saveWeekPlan, turnRequest } from '../state/weeklyPlan';
import { plannedActivities } from '../components/station/stationPresentation';
import { book, closeBook, confirmIncident, provisions } from './helpers/station';

function openGame() { return render(<MemoryRouter initialEntries={['/game/fixture-game']}><Routes><Route path="/game/:gameId" element={<GamePage />} /></Routes></MemoryRouter>); }
describe('Independent meals and direct week transition', () => {
  beforeEach(() => { vi.restoreAllMocks(); vi.spyOn(api, 'fetchGameState').mockResolvedValue(structuredClone(researchGame)); });
  it('does not count default rations as a decision and identifies food versus water omissions', () => {
    let plan = newWeekPlan(researchGame.state);
    expect(missingMeals(researchGame.state, plan)).toHaveLength(researchGame.state.crew.filter(person => person.alive).length);
    plan = chooseMeal(plan, 'alex', 'food', 'normal');
    expect(missingMeals(researchGame.state, plan).find(entry => entry.person.id === 'alex')?.resources).toEqual(['water']);
    expect(missingMeals(researchGame.state, feedAll(researchGame.state, plan, 'normal'))).toEqual([]);
  });
  it.each([false, true])('migrates v1 ration confirmation %s without changing the pending payload', confirmed => {
    const plan = { ...newWeekPlan(researchGame.state), version: 1 as const, rationsConfirmed: confirmed };
    const request = turnRequest(plan);
    const legacy = { ...plan, pending: { request, activities: plannedActivities(researchGame.state, plan) } };
    localStorage.setItem('last-outpost.week-plan.v1.fixture-game', JSON.stringify(legacy));
    const saved = readWeekPlan('fixture-game')!;
    expect(saved.version).toBe(2); expect(saved.pending!.request).toEqual(request);
    expect(saved.meal_choices.alex).toEqual({ food: confirmed, water: confirmed });
  });
  it('shows who needs food or water and does not submit an incomplete week', async () => {
    const send = vi.spyOn(api, 'submitTurn'); openGame(); await confirmIncident(researchGame);
    await provisions(); fireEvent.click(book().getByRole('button', { name: 'Full food for Alex Vega' })); closeBook();
    fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
    const alex = book().getByRole('button', { name: /Alex Vega Needs water/ });
    expect(within(alex).getByText('Needs water')).toBeInTheDocument();
    expect(book().getByRole('button', { name: /Lin Park Needs food and water/ })).toBeInTheDocument();
    expect(send).not.toHaveBeenCalled(); fireEvent.click(alex);
    expect(screen.getByRole('dialog', { name: 'Food & water' })).toBeInTheDocument();
  });
  it('feeds without locking work, persists choices and submits once directly from Next Week', async () => {
    const send = vi.spyOn(api, 'submitTurn').mockResolvedValue(structuredClone(researchTurn));
    const first = openGame(); await confirmIncident(researchGame); await provisions();
    fireEvent.click(book().getByRole('button', { name: 'Feed everyone' })); closeBook();
    fireEvent.click(screen.getByRole('button', { name: /^Inspect Alex Vega,/ }));
    expect(book().getByRole('button', { name: 'Choose assignment' })).toBeEnabled(); closeBook();
    first.unmount(); openGame(); await screen.findByRole('button', { name: 'Next week' });
    fireEvent.click(screen.getByRole('button', { name: 'Next week' }));
    await screen.findByText('WEEK 1 DEBRIEF'); expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][1].rations.alex).toEqual({ food: 'normal', water: 'normal' });
  });
  it('does not edit a pending meal plan', () => {
    const plan = newWeekPlan(researchGame.state);
    const pending = { ...plan, pending: { request: turnRequest(plan), activities: plannedActivities(researchGame.state, plan) } };
    saveWeekPlan('fixture-game', pending);
    expect(chooseMeal(pending, 'alex', 'food', 'emergency')).toBe(pending);
  });
});
