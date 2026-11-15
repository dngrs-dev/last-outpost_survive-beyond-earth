import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GamePage } from '../pages/GamePage';
import * as api from '../api/game';
import { medicalAssignmentGame, medicalAssignmentTurn } from './fixtures/backend';
import { book, confirmIncident, chooseCrewTask, closeBook, reviewWeek } from './helpers/station';
import { ApiError } from '../api/client';

function openGame() { render(<MemoryRouter initialEntries={['/game/fixture-game']}><Routes><Route path="/game/:gameId" element={<GamePage />} /></Routes></MemoryRouter>); }
async function care() { await confirmIncident(medicalAssignmentGame); await chooseCrewTask(medicalAssignmentGame, 'maya', 'medical_care', 'alex:dust_irritation'); }
describe('Paired care in the station scene', () => {
  beforeEach(() => { vi.restoreAllMocks(); vi.spyOn(api, 'fetchGameState').mockResolvedValue(structuredClone(medicalAssignmentGame)); });
  it('books caregiver and patient, shows the medical table, and submits the exact condition', async () => {
    const send = vi.spyOn(api, 'submitTurn').mockResolvedValue(structuredClone(medicalAssignmentTurn)); openGame(); await care();
    const room = screen.getByRole('region', { name: 'Station common room' });
    expect(room.querySelector('[data-crew-id="maya"][data-zone="medical"]')).toBeInTheDocument(); expect(room.querySelector('[data-crew-id="alex"][data-activity="patient"]')).toBeInTheDocument();
    fireEvent.click(await reviewWeek(medicalAssignmentGame)); await screen.findByText('WEEK 1 DEBRIEF');
    expect(send.mock.calls[0][1].assignments).toEqual([{ crew_id: 'maya', activity_id: 'medical_care', patient_id: 'alex', condition_id: 'dust_irritation' }]);
  });
  it('does not offer another job for the patient and excludes occupied people from other care targets', async () => {
    openGame(); await care(); fireEvent.click(screen.getByRole('button', { name: /^Inspect Alex Vega,/ }));
    expect(book().queryByRole('button', { name: 'Choose assignment' })).not.toBeInTheDocument(); closeBook();
    fireEvent.click(screen.getByRole('button', { name: /^Inspect Lin Park,/ })); fireEvent.click(book().getByRole('button', { name: 'Care' }));
    fireEvent.click(book().getByRole('button', { name: 'Treat a teammate' }));
    expect(book().queryByRole('button', { name: /^Alex Vega:/ })).not.toBeInTheDocument(); expect(book().queryByRole('button', { name: /^Maya Okafor:/ })).not.toBeInTheDocument(); expect(book().getByRole('button', { name: 'Confirm assignment' })).toBeDisabled();
  });
  it('retries the exact locked medical order after response loss', async () => {
    const send = vi.spyOn(api, 'submitTurn').mockRejectedValueOnce(new ApiError(503, 'Unavailable')).mockResolvedValueOnce(structuredClone(medicalAssignmentTurn));
    vi.mocked(api.fetchGameState).mockResolvedValueOnce(structuredClone(medicalAssignmentGame)).mockResolvedValueOnce({ game_id: medicalAssignmentTurn.game_id, state: structuredClone(medicalAssignmentTurn.state) });
    openGame(); await care(); fireEvent.click(await reviewWeek(medicalAssignmentGame)); fireEvent.click(await screen.findByRole('button', { name: 'Retry week 1 submission' })); await screen.findByText('WEEK 1 DEBRIEF');
    expect(send.mock.calls[1][1]).toEqual(send.mock.calls[0][1]);
  });
});
