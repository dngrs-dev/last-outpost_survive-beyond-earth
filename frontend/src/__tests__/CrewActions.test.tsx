import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GamePage } from '../pages/GamePage';
import * as api from '../api/game';
import { medicalAssignmentGame, researchGame, underfedGame } from './fixtures/backend';
import { book, closeBook, confirmIncident, chooseCrewTask } from './helpers/station';

function openGame() { render(<MemoryRouter initialEntries={['/game/fixture-game']}><Routes><Route path="/game/:gameId" element={<GamePage />} /></Routes></MemoryRouter>); }
describe('Direct portrait-led crew actions', () => {
  beforeEach(() => vi.restoreAllMocks());
  it('shows useful jobs immediately and confirms one without a nested menu', async () => {
    vi.spyOn(api, 'fetchGameState').mockResolvedValue(structuredClone(researchGame)); openGame(); await confirmIncident(researchGame);
    fireEvent.click(screen.getByRole('button', { name: /^Inspect Lin Park,/ }));
    expect(book().getByRole('button', { name: 'Collect moon rocks' })).toBeVisible();
    expect(book().queryByRole('button', { name: 'Condition details' })).not.toBeInTheDocument();
    expect(book().queryByRole('button', { name: 'Choose assignment' })).not.toBeInTheDocument();
    expect(book().getByRole('button', { name: 'Confirm assignment' })).toBeDisabled();
    fireEvent.click(book().getByRole('button', { name: 'Collect moon rocks' })); fireEvent.click(book().getByRole('button', { name: 'Confirm assignment' }));
    expect(screen.getByRole('region', { name: 'Station common room' }).querySelector('[data-crew-id="lin"]')).not.toBeInTheDocument();
  });
  it('books a medical pair and keeps patient meals accessible without another job', async () => {
    vi.spyOn(api, 'fetchGameState').mockResolvedValue(structuredClone(medicalAssignmentGame)); openGame(); await confirmIncident(medicalAssignmentGame);
    await chooseCrewTask(medicalAssignmentGame, 'maya', 'medical_care', 'alex:dust_irritation');
    fireEvent.click(screen.getByRole('button', { name: /^Inspect Alex Vega,/ }));
    expect(book().getByText('Receiving care')).toBeInTheDocument();
    expect(book().queryByRole('button', { name: 'Confirm assignment' })).not.toBeInTheDocument();
    fireEvent.change(book().getByRole('combobox', { name: 'food for Alex Vega' }), { target: { value: 'normal' } });
    expect(book().getByRole('combobox', { name: 'food for Alex Vega' })).toHaveValue('normal');
    closeBook(); fireEvent.click(screen.getByRole('button', { name: /^Inspect Lin Park,/ }));
    fireEvent.click(book().getByRole('button', { name: 'Care' })); fireEvent.click(book().getByRole('button', { name: 'Treat a teammate' }));
    expect(book().queryByRole('button', { name: /Alex Vega:/ })).not.toBeInTheDocument();
    expect(book().getByRole('button', { name: 'Confirm assignment' })).toBeDisabled();
  });
  it('keeps restrictions on the main panel and blocks a risky unavailable job', async () => {
    vi.spyOn(api, 'fetchGameState').mockResolvedValue(structuredClone(underfedGame)); openGame(); await confirmIncident(underfedGame);
    fireEvent.click(screen.getByRole('button', { name: /^Inspect Alex Vega,/ })); fireEvent.click(book().getByRole('button', { name: 'Explore' }));
    const task = book().getByRole('button', { name: 'Collect moon rocks' }); expect(task).toHaveAttribute('aria-disabled', 'true'); fireEvent.click(task);
    expect(book().getByRole('button', { name: 'Confirm assignment' })).toBeDisabled();
    expect(book().getAllByText(/No outside work/).length).toBeGreaterThan(0);
  });
});
