import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GamePage } from '../pages/GamePage';
import * as api from '../api/game';
import { medicalAssignmentGame, medicalAssignmentTurn } from './fixtures/backend';
import { ApiError } from '../api/client';

function openGame() {
  render(<MemoryRouter initialEntries={['/game/fixture-game']}><Routes>
    <Route path="/game/:gameId" element={<GamePage />} />
  </Routes></MemoryRouter>);
}

async function chooseCare() {
  await screen.findByRole('combobox', { name: 'Assignment for Maya Okafor' });
  const free = medicalAssignmentGame.state.current_event!.choices.find(c => !c.requires_crew)!;
  fireEvent.click(screen.getByText(new RegExp(free.text), { selector: '.choice-text' }));
  fireEvent.change(screen.getByRole('combobox', { name: 'Assignment for Maya Okafor' }), { target: { value: 'medical_care' } });
}

describe('Named conditions and paired medical work', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, 'fetchGameState').mockResolvedValue(structuredClone(medicalAssignmentGame));
  });

  it('reserves a patient and caregiver and sends their condition with the weekly plan', async () => {
    const send = vi.spyOn(api, 'submitTurn').mockResolvedValue(structuredClone(medicalAssignmentTurn));
    openGame();
    await chooseCare();
    expect(screen.getAllByText('Dust-related respiratory irritation').length).toBeGreaterThan(0);
    expect(screen.getByRole('combobox', { name: 'Patient and condition for Maya Okafor' })).toHaveValue('alex:dust_irritation');
    fireEvent.click(screen.getByRole('button', { name: /SUBMIT WEEK 1/ }));
    await screen.findByText('WEEK 1 DEBRIEF');
    expect(send).toHaveBeenCalledWith('fixture-game', expect.objectContaining({
      assignments: [{ crew_id: 'maya', activity_id: 'medical_care', patient_id: 'alex', condition_id: 'dust_irritation' }],
    }));
    expect(screen.getByText(/Patient: Alex Vega; condition: dust irritation/)).toBeInTheDocument();
    expect(screen.getByText(/alex: dust irritation - resolved/)).toBeInTheDocument();
  });

  it('prevents patient work and two caregivers booking the same patient', async () => {
    openGame();
    await chooseCare();
    fireEvent.change(screen.getByRole('combobox', { name: 'Assignment for Alex Vega' }), { target: { value: 'crew_rest' } });
    expect(screen.getByText('Each astronaut can perform only one main job this week.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /SUBMIT WEEK 1/ })).toBeDisabled();
    fireEvent.change(screen.getByRole('combobox', { name: 'Assignment for Alex Vega' }), { target: { value: '' } });
    fireEvent.change(screen.getByRole('combobox', { name: 'Assignment for Lin Park' }), { target: { value: 'medical_care' } });
    expect(screen.getByRole('button', { name: /SUBMIT WEEK 1/ })).toBeDisabled();
    fireEvent.change(screen.getByRole('combobox', { name: 'Patient and condition for Lin Park' }), { target: { value: 'maya:dust_irritation' } });
    expect(screen.getByRole('button', { name: /SUBMIT WEEK 1/ })).toBeDisabled();
  });

  it('locks patient selection and retries the exact medical target after response loss', async () => {
    const send = vi.spyOn(api, 'submitTurn').mockRejectedValueOnce(new ApiError(503, 'Unavailable'))
      .mockResolvedValueOnce(structuredClone(medicalAssignmentTurn));
    vi.mocked(api.fetchGameState).mockResolvedValueOnce(structuredClone(medicalAssignmentGame))
      .mockResolvedValueOnce({ game_id: medicalAssignmentTurn.game_id, state: structuredClone(medicalAssignmentTurn.state) });
    openGame();
    await chooseCare();
    fireEvent.click(screen.getByRole('button', { name: /SUBMIT WEEK 1/ }));
    const retry = await screen.findByRole('button', { name: /Retry week 1 submission/ });
    expect(screen.getByRole('combobox', { name: 'Patient and condition for Maya Okafor' })).toBeDisabled();
    const original = structuredClone(send.mock.calls[0][1]);
    fireEvent.click(retry);
    await screen.findByText('WEEK 1 DEBRIEF');
    expect(send.mock.calls[1][1]).toEqual(original);
  });
});
