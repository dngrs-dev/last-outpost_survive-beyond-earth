import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { MoonPage } from '../pages/MoonPage';
import { SetupPage } from '../pages/SetupPage';
import { CrewSelectionPage } from '../pages/CrewSelectionPage';
import * as moonApi from '../api/moon';
import * as gameApi from '../api/game';
import { moonArchive, catalog, game } from './fixtures/backend';

function renderMoon(path = '/moon/') {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/moon/" element={<MoonPage />} />
        <Route path="/prepare/" element={<SetupPage />} />
        <Route path="/crew/" element={<CrewSelectionPage />} />
        <Route path="/game/:gameId" element={<p>Active mission</p>} />
      </Routes>
    </MemoryRouter>
  );
}

async function openDetails() {
  const button = screen.getByRole('button', {
    name: 'Mission details and Moon facts',
  });
  button.focus();
  fireEvent.click(button);
  return screen.findByRole('dialog', {
    name: 'Mission details and Moon facts',
  });
}

describe('Moon mission selection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(moonApi, 'fetchMoonCatalog').mockResolvedValue(
      structuredClone(moonArchive)
    );
    vi.spyOn(gameApi, 'fetchCatalog').mockResolvedValue(
      structuredClone(catalog)
    );
  });

  it('starts with the easiest mission and one compact selection without website chrome', async () => {
    renderMoon();
    expect(
      await screen.findByRole('heading', { name: 'Oceanus Outpost' })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
    expect(screen.getByText('First Command')).toBeInTheDocument();
    expect(screen.getByText('Good first mission')).toBeInTheDocument();
    expect(screen.getByText('8 weeks')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Easy difficulty, 1 of 5')
    ).toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
    expect(screen.queryByText('LAST OUTPOST')).not.toBeInTheDocument();
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Choose this mission/ })
    ).toHaveAttribute('href', '/crew/?station=oceanus&lunar_site=apollo-12');
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('selects missions directly through named Moon markers', async () => {
    renderMoon();
    const alpha = await screen.findByRole('button', {
      name: 'Choose Alpha mission, 12 weeks',
    });
    fireEvent.click(alpha);
    expect(screen.getByRole('heading', { name: 'Alpha' })).toBeInTheDocument();
    expect(screen.getByText('Hold Until Rotation')).toBeInTheDocument();
    expect(alpha).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: 'Choose Oceanus mission, 8 weeks' })
    ).toHaveAttribute('aria-pressed', 'false');
    expect(
      screen.getByRole('link', { name: /Choose this mission/ })
    ).toHaveAttribute('href', '/crew/?station=alpha&lunar_site=apollo-11');
  });

  it('also selects an outpost by clicking its dot on the actual surface', async () => {
    renderMoon();
    await screen.findByRole('heading', { name: 'Oceanus Outpost' });
    fireEvent.click(document.querySelector('circle[data-site="apollo-11"]')!);
    expect(screen.getByRole('heading', { name: 'Alpha' })).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Choose this mission/ })
    ).toHaveAttribute('href', '/crew/?station=alpha&lunar_site=apollo-11');
  });

  it('browses every mission with next and previous and wraps around', async () => {
    renderMoon();
    await screen.findByRole('heading', { name: 'Oceanus Outpost' });
    fireEvent.click(screen.getByRole('button', { name: 'Previous mission' }));
    expect(
      screen.getByRole('heading', { name: 'Taurus Outpost' })
    ).toBeInTheDocument();
    expect(screen.getByText('18 weeks')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Extreme difficulty, 5 of 5')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next mission' }));
    expect(
      screen.getByRole('heading', { name: 'Oceanus Outpost' })
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(1);
  });

  it('keeps real supplies and generation behind optional details', async () => {
    renderMoon();
    await screen.findByRole('heading', { name: 'Oceanus Outpost' });
    const dialog = await openDetails();
    fireEvent.click(within(dialog).getByRole('tab', { name: 'Systems' }));
    const panel = within(dialog).getByRole('tabpanel', { name: 'Systems' });
    expect(within(panel).getByText('56 u/week')).toBeInTheDocument();
    expect(within(panel).getByText('53.2 u/week')).toBeInTheDocument();
    expect(
      within(panel).getByRole('meter', { name: 'Solar array' })
    ).toHaveAttribute('value', '0.95');
    expect(
      within(panel).getByRole('meter', { name: 'Oxygen generator' })
    ).toHaveAttribute('value', '0.95');
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'Close mission details' })
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Mission details and Moon facts' })
    ).toHaveFocus();
  });

  it('retains historical facts, source attribution, and keyboard tabs on demand', async () => {
    renderMoon('/moon/?site=apollo-17');
    await screen.findByRole('heading', { name: 'Taurus Outpost' });
    const dialog = await openDetails();
    fireEvent.keyDown(within(dialog).getByRole('tab', { name: 'Mission' }), {
      key: 'ArrowRight',
    });
    expect(within(dialog).getByRole('tab', { name: 'Systems' })).toHaveFocus();
    fireEvent.click(within(dialog).getByRole('tab', { name: 'History' }));
    expect(
      within(dialog).getByRole('tabpanel', { name: 'History' })
    ).toHaveTextContent('Apollo 17');
    expect(
      within(dialog).getByRole('link', { name: /Historical mission record/ })
    ).toHaveAttribute('href', 'https://www.nasa.gov/mission/apollo-17/');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Taurus Outpost' })
    ).toBeInTheDocument();
  });

  it('hands off the selected station through preparation to the game', async () => {
    const send = vi
      .spyOn(gameApi, 'createGame')
      .mockResolvedValue(structuredClone(game));
    renderMoon('/moon/?site=apollo-15');
    await screen.findByRole('heading', { name: 'Hadley Outpost' });
    fireEvent.click(screen.getByRole('link', { name: /Choose this mission/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Next: supplies' }));
    expect(
      await screen.findByRole('region', { name: 'Selected lunar mission' })
    ).toHaveTextContent('Hadley Outpost selected');
    expect(document.body.style.overflow).not.toBe('hidden');
    expect(screen.getByRole('combobox', { name: 'Outpost' })).toHaveValue(
      'hadley'
    );
    fireEvent.click(
      screen.getByRole('button', { name: /LAUNCH EXPEDITION TO MOON/ })
    );
    await screen.findByText('Active mission');
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({ station_id: 'hadley' })
    );
  });

  it('requires two crew for the long mission on the crew screen', async () => {
    renderMoon('/crew/?station=taurus&lunar_site=apollo-17');
    await screen.findByRole('heading', { name: 'Alex Vega' });
    for (const name of ['Maya Okafor', 'Lin Park', 'Sam Nowak'])
      fireEvent.click(screen.getByRole('button', { name: `Remove ${name}` }));
    expect(screen.getByRole('button', { name: 'Next: supplies' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /^View Maya/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Add to crew' }));
    expect(screen.getByRole('button', { name: 'Next: supplies' })).toBeEnabled();
  });

  it('falls back to the recommended mission for an unknown deep link', async () => {
    renderMoon('/moon/?site=missing');
    expect(
      await screen.findByRole('heading', { name: 'Oceanus Outpost' })
    ).toBeInTheDocument();
  });

  it('recovers from loading errors', async () => {
    vi.mocked(moonApi.fetchMoonCatalog).mockRejectedValueOnce(
      new Error('Outposts unavailable')
    );
    renderMoon();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Outposts unavailable'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(
      await screen.findByRole('heading', { name: 'Oceanus Outpost' })
    ).toBeInTheDocument();
  });

  it('handles an incomplete mission catalog without offering an invalid launch', async () => {
    vi.mocked(gameApi.fetchCatalog).mockResolvedValue({
      ...structuredClone(catalog),
      missions: [],
    });
    renderMoon();
    await screen.findByRole('alert');
    expect(
      screen.queryByRole('link', { name: /Choose this mission/ })
    ).not.toBeInTheDocument();
  });

  it('keeps missions playable when 3D or the surface texture is unavailable', async () => {
    vi.spyOn(window, 'Image').mockImplementation(() => {
      const image = document.createElement('img');
      queueMicrotask(() => image.dispatchEvent(new Event('error')));
      return image;
    });
    renderMoon();
    expect(await screen.findByText(/Simple Moon view/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next mission' }));
    expect(screen.getByRole('heading', { name: 'Alpha' })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Rotate Moon east' })
    ).toBeDisabled();
    expect(
      screen.getByRole('link', { name: /Choose this mission/ })
    ).toHaveAttribute('href', '/crew/?station=alpha&lunar_site=apollo-11');
  });

  it('lets keyboard users rotate the Moon and find their selected outpost again', async () => {
    renderMoon();
    const canvas = await screen.findByRole('img', { name: /Moon map/ });
    for (let i = 0; i < 12; i++)
      fireEvent.keyDown(canvas, { key: 'ArrowRight' });
    expect(
      screen.queryByRole('button', { name: 'Choose Oceanus mission, 8 weeks' })
    ).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Find selected outpost' })
    );
    expect(
      screen.getByRole('button', { name: 'Choose Oceanus mission, 8 weeks' })
    ).toHaveAttribute('aria-pressed', 'true');
  });
});
