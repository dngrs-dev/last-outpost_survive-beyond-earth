import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MoonPage } from '../pages/MoonPage';
import { SetupPage } from '../pages/SetupPage';
import * as moonApi from '../api/moon';
import * as gameApi from '../api/game';
import { moonArchive, catalog, game } from './fixtures/backend';

function renderMoon(path = '/moon/') {
  render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/moon/" element={<MoonPage />} />
    <Route path="/" element={<SetupPage />} />
    <Route path="/game/:gameId" element={<p>Active mission</p>} />
  </Routes></MemoryRouter>);
}

describe('Outpost deployment console', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(moonApi, 'fetchMoonCatalog').mockResolvedValue(structuredClone(moonArchive));
    vi.spyOn(gameApi, 'fetchCatalog').mockResolvedValue(structuredClone(catalog));
  });

  it('shows a playable outpost, its difficulty, and real mission duration', async () => {
    renderMoon();
    expect(await screen.findByRole('heading', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Hold Until Rotation' })).toBeInTheDocument();
    expect(screen.getAllByLabelText('standard difficulty, 2 of 5').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /Prepare mission/ })).toHaveAttribute('href', '/?station=alpha&lunar_site=apollo-11');
    expect(screen.getByText('84 Earth days')).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('switches to the easy 8-week outpost and exposes its actual reserves and generation', async () => {
    renderMoon();
    await screen.findByRole('heading', { name: 'Alpha' });
    fireEvent.click(screen.getByRole('button', { name: /02 Oceanus/ }));
    expect(screen.getByRole('heading', { name: 'Oceanus Outpost' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'First Command' })).toBeInTheDocument();
    expect(screen.getByText('56 Earth days')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('tab', { name: 'Systems' }));
    const panel = screen.getByRole('tabpanel', { name: 'Systems' });
    expect(within(panel).getByText('28 u/week')).toBeInTheDocument();
    expect(within(panel).getByText('26.6 u/week')).toBeInTheDocument();
    expect(within(panel).getByRole('meter', { name: 'Solar array' })).toHaveAttribute('value', '0.95');
    expect(within(panel).getByRole('meter', { name: 'Oxygen generator' })).toHaveAttribute('value', '0.95');
    expect(screen.getByRole('link', { name: /Prepare mission/ })).toHaveAttribute('href', '/?station=oceanus&lunar_site=apollo-12');
  });

  it('offers history and sources on demand instead of a long reading page', async () => {
    renderMoon('/moon/?site=apollo-17');
    await screen.findByRole('heading', { name: 'Taurus Outpost' });
    expect(screen.getByText('126 Earth days')).toBeInTheDocument();
    expect(screen.getAllByLabelText('extreme difficulty, 5 of 5').length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('tab', { name: 'History' }));
    expect(screen.getByRole('tabpanel', { name: 'History' })).toHaveTextContent('Apollo 17');
    expect(screen.getByRole('link', { name: /Historical mission record/ })).toHaveAttribute('href', 'https://www.nasa.gov/mission/apollo-17/');
    expect(screen.getByRole('tab', { name: 'Mission' })).toHaveAttribute('aria-selected', 'false');
  });

  it('hands off the selected station and posts that station when the player launches', async () => {
    const send = vi.spyOn(gameApi, 'createGame').mockResolvedValue(structuredClone(game));
    renderMoon('/moon/?site=apollo-15');
    await screen.findByRole('heading', { name: 'Hadley Outpost' });
    fireEvent.click(screen.getByRole('link', { name: /Prepare mission/ }));
    expect(await screen.findByRole('region', { name: 'Selected lunar mission' })).toHaveTextContent('Hadley Outpost selected');
    expect(document.body.style.overflow).not.toBe('hidden');
    expect(screen.getByText(/14-week mission/)).toBeInTheDocument();
    expect(screen.getByText(/14 Weeks \(98 Days\)/)).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Outpost' })).toHaveValue('hadley');
    fireEvent.click(screen.getByRole('button', { name: /LAUNCH EXPEDITION TO MOON/ }));
    await screen.findByText('Active mission');
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ station_id: 'hadley' }));
  });

  it('requires two crew for the long mission during preparation', async () => {
    renderMoon('/?station=taurus&lunar_site=apollo-17');
    await screen.findByRole('region', { name: 'Selected lunar mission' });
    for (const name of ['Maya Okafor', 'Lin Park', 'Sam Nowak']) {
      fireEvent.click(screen.getByText(name).closest('.crew-card')!);
    }
    expect(screen.getByRole('button', { name: /LAUNCH EXPEDITION TO MOON/ })).toBeDisabled();
    fireEvent.click(screen.getByText('Maya Okafor').closest('.crew-card')!);
    expect(screen.getByRole('button', { name: /LAUNCH EXPEDITION TO MOON/ })).not.toBeDisabled();
  });

  it('allows mobile outpost selection and keeps briefing and map controls separate', async () => {
    renderMoon();
    await screen.findByRole('heading', { name: 'Alpha' });
    fireEvent.change(screen.getByRole('combobox', { name: 'Choose an outpost' }), { target: { value: 'apollo-16' } });
    expect(screen.getByRole('heading', { name: 'Descartes Outpost' })).toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: 'Mission & systems' });
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('link', { name: /Prepare mission/ })).toBeInTheDocument();
  });

  it('supports keyboard navigation between briefing modules', async () => {
    renderMoon();
    await screen.findByRole('heading', { name: 'Alpha' });
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Mission' }), { key: 'ArrowRight' });
    expect(screen.getByRole('tab', { name: 'Systems' })).toHaveFocus();
    expect(screen.getByRole('tabpanel', { name: 'Systems' })).toBeInTheDocument();
  });

  it('falls back to the first outpost for unknown deep links', async () => {
    renderMoon('/moon/?site=missing');
    expect(await screen.findByRole('heading', { name: 'Alpha' })).toBeInTheDocument();
  });

  it('recovers from a roster fetch failure', async () => {
    vi.mocked(moonApi.fetchMoonCatalog).mockRejectedValueOnce(new Error('Roster unavailable'));
    renderMoon();
    expect(await screen.findByRole('alert')).toHaveTextContent('Roster unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Retry outpost roster' }));
    expect(await screen.findByRole('heading', { name: 'Alpha' })).toBeInTheDocument();
  });

  it('keeps outpost selection and launch usable when 3D is unavailable', async () => {
    vi.spyOn(window, 'Image').mockImplementation(() => {
      const image = document.createElement('img');
      queueMicrotask(() => image.dispatchEvent(new Event('error')));
      return image;
    });
    renderMoon();
    expect(await screen.findByText(/3D view unavailable/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /06 Taurus/ }));
    expect(screen.getByRole('heading', { name: 'Taurus Outpost' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Rotate Moon east' })).toBeDisabled();
  });
});
