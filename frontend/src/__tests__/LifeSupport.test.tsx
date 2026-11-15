import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { reviewWeek, fullReport } from './helpers/station';
import { LifeSupportPanel } from '../components/LifeSupportPanel';
import { GamePage } from '../pages/GamePage';
import * as api from '../api/game';
import { game, turn, failed } from './fixtures/backend';

describe('Distinct life-support systems', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('explains the separate water, oxygen and carbon-dioxide loops with an official source', () => {
    render(<LifeSupportPanel systems={game.state.life_support} />);
    expect(screen.getByRole('meter', { name: 'Water recovery condition' })).toHaveAttribute('value', String(game.state.life_support.water_recovery_condition));
    expect(screen.getByRole('meter', { name: 'CO2 scrubber condition' })).toHaveAttribute('value', String(game.state.life_support.co2_condition));
    expect(screen.getByText(/Oxygen tanks do not remove carbon dioxide/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Engineering inspiration'));
    expect(screen.getByRole('link', { name: 'NASA ECLSS overview' })).toHaveAttribute('href', game.state.life_support.source_url);
  });

  it('shows actual water accounting in a weekly debrief', async () => {
    vi.spyOn(api, 'fetchGameState').mockResolvedValue(structuredClone(game));
    vi.spyOn(api, 'submitTurn').mockResolvedValue(structuredClone(turn));
    render(<MemoryRouter initialEntries={['/game/fixture-game']}><Routes>
      <Route path="/game/:gameId" element={<GamePage />} />
    </Routes></MemoryRouter>);
    fireEvent.click(await reviewWeek());
    await fullReport();
    expect(await screen.findByRole('heading', { name: 'Life-support resource loop' })).toBeInTheDocument();
    expect(screen.getByText(/Wastewater processed/)).toHaveTextContent(`clean water recovered ${turn.turn_outcome.survival.life_support.water_recovered}`);
  });

  it('bases the cabin warning on reported CO2 burden rather than oxygen stock', () => {
    const systems = structuredClone(failed.state.life_support);
    // Isolated UI threshold case, retaining the actual API shape and source data.
    systems.co2_burden = systems.co2_warning_level + 1;
    render(<LifeSupportPanel systems={systems} />);
    expect(screen.getByRole('alert')).toHaveTextContent(/CO₂ exceeds the game warning level/);
  });
});
