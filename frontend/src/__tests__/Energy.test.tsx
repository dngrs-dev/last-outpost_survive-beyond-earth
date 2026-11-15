import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { book, confirmIncident, openStatus, reviewWeek } from './helpers/station';
import { EnergyPanel } from '../components/EnergyPanel';
import { GamePage } from '../pages/GamePage';
import * as api from '../api/game';
import { catalog, energyPriorityGame, energyPriorityTurn } from './fixtures/backend';

describe('Sourced sunlight and bounded energy', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('shows a predictable fully dark week and the exact source', () => {
    const forecast = catalog.sunlight_forecasts.alpha;
    render(<EnergyPanel forecast={forecast} stored={30} capacity={100} solarDay={catalog.lighting.solar_day_earth_days} sourceUrl={catalog.lighting.source_url} assumption={catalog.lighting.assumption} />);
    const table = screen.getByRole('table', { name: 'Weekly sunlight forecast' });
    const darkRow = within(table).getAllByRole('row').find(row => within(row).queryByRole('rowheader', { name: '4' }))!;
    expect(within(darkRow).getByText('darkness')).toBeInTheDocument();
    expect(within(darkRow).getByText('0.0 / 7.0')).toBeInTheDocument();
    expect(within(darkRow).getByText('0.0')).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'Battery charge' })).toHaveAttribute('max', '100');
    fireEvent.click(screen.getByText('Lighting model and source'));
    expect(screen.getByRole('link', { name: 'NASA lunar solar-day reference' })).toHaveAttribute('href', catalog.lighting.source_url);
  });

  it('submits and safely retries the exact power priority with the weekly plan', async () => {
    vi.spyOn(api, 'fetchGameState').mockResolvedValue(structuredClone(energyPriorityGame));
    const send = vi.spyOn(api, 'submitTurn').mockRejectedValueOnce(new TypeError('Connection lost'))
      .mockResolvedValueOnce(structuredClone(energyPriorityTurn));
    render(<MemoryRouter initialEntries={['/game/fixture-game']}><Routes>
      <Route path="/game/:gameId" element={<GamePage />} />
    </Routes></MemoryRouter>);
    await confirmIncident(energyPriorityGame);
    await openStatus('Energy');
    const priority = book().getByRole('combobox', { name: 'Power priority' });
    fireEvent.change(priority, { target: { value: 'research' } });
    fireEvent.click(book().getByRole('button', { name: 'Confirm power priority' }));
    expect(priority).toBeDisabled();
    fireEvent.click(await reviewWeek(energyPriorityGame));
    const retry = await screen.findByRole('button', { name: /Retry week 1/ });
    const original = structuredClone(send.mock.calls[0][1]);
    expect(original.power_priority).toBe('research');
    fireEvent.click(retry);
    await screen.findByText('WEEK 1 DEBRIEF');
    expect(send.mock.calls[1][1]).toEqual(original);
  });
});
