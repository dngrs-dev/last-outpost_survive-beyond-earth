import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { SetupPage } from '../pages/SetupPage';
import * as api from '../api/game';
import { ApiError } from '../api/client';
import { catalog, game } from './fixtures/backend';
import { readLastMission } from '../state/lastMission';

function openSupplies(url = '/prepare/?station=alpha', state: unknown = null) {
  window.history.replaceState({ usr: state }, '', url);
  return render(
    <BrowserRouter>
      <Routes>
        <Route path="/prepare/" element={<SetupPage />} />
        <Route path="/game/:gameId" element={<p>Launched mission</p>} />
      </Routes>
    </BrowserRouter>
  );
}
async function ready() {
  await screen.findByLabelText('Food packs quantity');
}
const launch = () =>
  fireEvent.click(screen.getByRole('button', { name: 'Launch mission' }));

describe('Game-style supplies and launch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.spyOn(api, 'fetchCatalog').mockResolvedValue(structuredClone(catalog));
    vi.spyOn(api, 'createGame').mockResolvedValue(structuredClone(game));
  });

  it('shows illustrated packing, crew, mission, and capacity without website chrome', async () => {
    openSupplies();
    await ready();
    expect(screen.getAllByRole('button', { name: /^About / })).toHaveLength(12);
    expect(
      screen.getByRole('region', { name: 'Selected lunar mission' })
    ).toHaveTextContent('12 weeks');
    expect(
      screen.getByRole('heading', { name: 'Alex Vega' })
    ).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'Cargo weight' })).toHaveAttribute(
      'value',
      '154'
    );
    expect(screen.getByRole('meter', { name: 'Cargo space' })).toHaveAttribute(
      'value',
      '223'
    );
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
    expect(
      screen.queryByRole('region', { name: 'Research objectives' })
    ).not.toBeInTheDocument();
  });

  it('preserves ordered and empty crew seats from the roster', async () => {
    openSupplies(
      '/prepare/?station=hadley&lunar_site=apollo-15&crew=nora,maya,,sam'
    );
    await ready();
    expect(
      screen.getByRole('region', { name: 'Selected crew' })
    ).toHaveTextContent('3/4');
    expect(
      screen.queryByRole('heading', { name: 'Alex Vega' })
    ).not.toBeInTheDocument();
    launch();
    await screen.findByText('Launched mission');
    expect(api.createGame).toHaveBeenCalledWith(
      expect.objectContaining({
        station_id: 'hadley',
        crew_ids: ['nora', 'maya', 'sam'],
      })
    );
    expect(readLastMission()).toBe(game.game_id);
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('keeps quantities across filters, emptying, and the starter preset', async () => {
    openSupplies();
    await ready();
    fireEvent.click(
      screen.getByRole('button', { name: 'Increase Food packs' })
    );
    expect(screen.getByLabelText('Food packs quantity')).toHaveValue(9);
    fireEvent.click(screen.getByRole('button', { name: /^Tools/ }));
    expect(
      screen.queryByLabelText('Food packs quantity')
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^All cargo/ }));
    expect(screen.getByLabelText('Food packs quantity')).toHaveValue(9);
    fireEvent.click(screen.getByRole('button', { name: 'Empty cargo' }));
    expect(screen.getByRole('meter', { name: 'Cargo weight' })).toHaveAttribute(
      'value',
      '0'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Starter pack' }));
    expect(screen.getByLabelText('Food packs quantity')).toHaveValue(8);
    expect(screen.getByLabelText('Water containers quantity')).toHaveValue(16);
  });

  it.each([
    { item: 'Water containers', quantity: '37', message: '5 kg over limit' },
    {
      item: 'Emergency oxygen tanks',
      quantity: '21',
      message: '12 L over limit',
    },
  ])(
    'blocks launch for excess capacity: $message',
    async ({ item, quantity, message }) => {
      openSupplies();
      await ready();
      fireEvent.click(screen.getByRole('button', { name: 'Empty cargo' }));
      fireEvent.change(screen.getByLabelText(`${item} quantity`), {
        target: { value: quantity },
      });
      expect(screen.getByText(message)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Launch mission' })
      ).toBeDisabled();
      launch();
      expect(api.createGame).not.toHaveBeenCalled();
      fireEvent.change(screen.getByLabelText(`${item} quantity`), {
        target: { value: '1' },
      });
      expect(
        screen.getByRole('button', { name: 'Launch mission' })
      ).toBeEnabled();
    }
  );

  it('opens item details with catalog facts, sources, and focus restoration', async () => {
    openSupplies();
    await ready();
    const button = screen.getByRole('button', {
      name: 'About Emergency power cells',
    });
    button.focus();
    fireEvent.click(button);
    const dialog = screen.getByRole('dialog', {
      name: 'Emergency power cells',
    });
    expect(within(dialog).getByText('12 power units')).toBeInTheDocument();
    expect(
      within(dialog).getByRole('link', { name: /Equipment inspiration/ })
    ).toHaveAttribute(
      'href',
      catalog.items.find((item) => item.id === 'power_cells')!
        .inspiration_source
    );
    expect(
      within(dialog).getByText(/Extra cells do not increase its capacity/)
    ).toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(button).toHaveFocus();
  });

  it('retains the research brief and power forecast on demand, with keyboard tabs', async () => {
    openSupplies();
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Mission brief' }));
    expect(
      screen.getByRole('region', { name: 'Research objectives' })
    ).toHaveTextContent('Baseline sample collection');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Mission' }), {
      key: 'ArrowRight',
    });
    expect(screen.getByRole('tab', { name: 'Power' })).toHaveFocus();
    expect(
      screen.getByRole('region', { name: 'Sunlight and energy' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('table', { name: 'Weekly sunlight forecast' })
    ).toBeInTheDocument();
  });

  it('clamps arrival power to battery capacity and explains overflow', async () => {
    openSupplies();
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Empty cargo' }));
    fireEvent.change(screen.getByLabelText('Emergency power cells quantity'), {
      target: { value: '10' },
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Packed power exceeds battery capacity'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Mission brief' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Power' }));
    const station = catalog.stations.find((entry) => entry.id === 'alpha')!;
    expect(
      screen.getByRole('meter', { name: 'Battery charge' })
    ).toHaveAttribute('value', String(station.battery_capacity));
  });

  it('preserves cargo and a blank seed through a refresh of the supplies route', async () => {
    const page = openSupplies();
    await ready();
    fireEvent.change(screen.getByLabelText('Food packs quantity'), {
      target: { value: '9' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Flight settings' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Replay seed' }), {
      target: { value: '' },
    });
    const saved = structuredClone(window.history.state.usr);
    page.unmount();
    openSupplies('/prepare/?station=alpha', saved);
    await ready();
    expect(screen.getByLabelText('Food packs quantity')).toHaveValue(9);
    launch();
    await screen.findByText('Launched mission');
    expect(api.createGame).toHaveBeenCalledWith(
      expect.objectContaining({
        cargo: expect.objectContaining({ food_packs: 9 }),
        random_seed: undefined,
      })
    );
  });

  it.each(['-1', '4.2', '12x', '9007199254740993'])(
    'requires an exact whole-number seed: %s',
    async (value) => {
      openSupplies();
      await ready();
      fireEvent.click(screen.getByRole('button', { name: 'Flight settings' }));
      fireEvent.change(screen.getByRole('textbox', { name: 'Replay seed' }), {
        target: { value },
      });
      expect(screen.getByRole('alert')).toHaveTextContent(
        'non-negative whole number'
      );
      fireEvent.click(
        screen.getByRole('button', { name: 'Close Mission brief' })
      );
      expect(
        screen.getByRole('button', { name: 'Launch mission' })
      ).toBeDisabled();
    }
  );

  it('locks packing and prevents duplicate launch clicks while a request is pending', async () => {
    let resolve!: (value: typeof game) => void;
    vi.mocked(api.createGame).mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done;
        })
    );
    openSupplies();
    await ready();
    launch();
    expect(screen.getByRole('button', { name: 'Launching...' })).toBeDisabled();
    expect(screen.getByLabelText('Food packs quantity')).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Back to crew selection' })
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Launching...' }));
    expect(api.createGame).toHaveBeenCalledTimes(1);
    await act(async () => resolve(structuredClone(game)));
    await screen.findByText('Launched mission');
  });

  it('keeps the loadout after a failed launch and allows another attempt', async () => {
    vi.mocked(api.createGame)
      .mockRejectedValueOnce(new ApiError(503, 'Launch service unavailable'))
      .mockResolvedValueOnce(structuredClone(game));
    openSupplies();
    await ready();
    fireEvent.click(
      screen.getByRole('button', { name: 'Increase Food packs' })
    );
    launch();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Launch service unavailable'
    );
    expect(screen.getByLabelText('Food packs quantity')).toHaveValue(9);
    launch();
    await screen.findByText('Launched mission');
    expect(vi.mocked(api.createGame).mock.calls[1][0]).toEqual(
      vi.mocked(api.createGame).mock.calls[0][0]
    );
  });

  it('retries a failed catalog request', async () => {
    vi.mocked(api.fetchCatalog).mockRejectedValueOnce(
      new Error('Catalog offline')
    );
    openSupplies();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Catalog offline'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await ready();
  });

  it('blocks an unavailable mission and a crew below the mission minimum', async () => {
    const page = openSupplies('/prepare/?station=alpha&lunar_site=apollo-17');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That mission is unavailable'
    );
    expect(
      screen.queryByRole('button', { name: 'Launch mission' })
    ).not.toBeInTheDocument();
    page.unmount();
    openSupplies('/prepare/?station=hadley&crew=alex,,,');
    await ready();
    expect(
      screen.getByRole('button', { name: 'Launch mission' })
    ).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Choose at least 2');
  });
});
