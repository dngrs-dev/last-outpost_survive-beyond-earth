import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { CrewSelectionPage } from '../pages/CrewSelectionPage';
import { SetupPage } from '../pages/SetupPage';
import * as api from '../api/game';
import { catalog, game } from './fixtures/backend';

function openCrew(url = '/crew/?station=hadley&lunar_site=apollo-15') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/crew/" element={<CrewSelectionPage />} />
        <Route path="/prepare/" element={<SetupPage />} />
        <Route path="/moon/" element={<p>Moon selection</p>} />
        <Route path="/game/:gameId" element={<p>Launched mission</p>} />
      </Routes>
    </MemoryRouter>
  );
}
async function ready() {
  await screen.findByRole('heading', { name: 'Alex Vega' });
}
const inspect = (name: string) =>
  fireEvent.click(
    screen.getByRole('button', { name: new RegExp(`^View ${name},`) })
  );

describe('Visual crew selection with backend catalog data', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, 'fetchCatalog').mockResolvedValue(structuredClone(catalog));
    vi.spyOn(api, 'createGame').mockResolvedValue(structuredClone(game));
  });

  it('shows sixteen portraits, four selected seats, role icons and the full-body dossier', async () => {
    openCrew();
    await ready();
    expect(screen.getAllByRole('button', { name: /^View / })).toHaveLength(16);
    expect(screen.getAllByRole('button', { name: /^Seat / })).toHaveLength(4);
    expect(screen.getByRole('button', { name: /^View Alex/ })).toHaveAttribute(
      'data-selected',
      'true'
    );
    expect(screen.getByRole('button', { name: /^View Nora/ })).toHaveAttribute(
      'data-selected',
      'false'
    );
    expect(
      within(
        screen.getByRole('region', { name: 'Astronaut roster' })
      ).queryByText('Engineer')
    ).not.toBeInTheDocument();
    const details = screen.getByRole('region', { name: 'Astronaut details' });
    expect(within(details).getByText('Mechanical repair')).toBeInTheDocument();
    expect(
      within(details).getByText(catalog.crew[0].positive_trait)
    ).toBeInTheDocument();
    expect(
      within(details).getByText(catalog.crew[0].negative_trait)
    ).toBeInTheDocument();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('inspects without altering the team, then explicitly replaces the chosen seat', async () => {
    openCrew();
    await ready();
    inspect('Nora Haddad');
    expect(
      screen.getByRole('heading', { name: 'Nora Haddad' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Seat 1: Alex Vega' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^View Nora/ })).toHaveAttribute(
      'aria-current',
      'true'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Replace Alex' }));
    expect(
      screen.getByRole('button', { name: 'Seat 1: Nora Haddad' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^View Nora/ })).toHaveAttribute(
      'data-selected',
      'true'
    );
    expect(screen.getByRole('button', { name: /^View Alex/ })).toHaveAttribute(
      'data-selected',
      'false'
    );
    expect(screen.getByRole('status')).toHaveTextContent('4 astronauts ready');
  });

  it('groups all sixteen profiles by profession and launches a new specialist', async () => {
    openCrew();
    await ready();
    const portraits = screen.getAllByRole('button', { name: /^View / });
    expect(
      portraits
        .slice(0, 4)
        .every((button) =>
          button.getAttribute('aria-label')?.includes('Engineer')
        )
    ).toBe(true);
    for (const name of [
      'Rhea Das',
      'Priya Shah',
      'Theo Marin',
      'Hao Chen',
      'Vera Silva',
      'Nik Volkov',
    ]) {
      inspect(name);
      expect(screen.getByRole('heading', { name })).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole('button', { name: 'Replace Alex' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next: supplies' }));
    await screen.findByRole('region', { name: 'Selected crew' });
    fireEvent.click(screen.getByRole('button', { name: 'Launch mission' }));
    await screen.findByText('Launched mission');
    expect(api.createGame).toHaveBeenCalledWith(
      expect.objectContaining({ crew_ids: ['nik', 'maya', 'lin', 'sam'] })
    );
  });

  it('respects the mission minimum and uses actual catalog ration totals', async () => {
    openCrew();
    await ready();
    for (const name of ['Maya Okafor', 'Lin Park', 'Sam Nowak'])
      fireEvent.click(screen.getByRole('button', { name: `Remove ${name}` }));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Choose at least 2 astronauts'
    );
    expect(
      screen.getByText('Crew / week: 1.1 food / 2 water')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Next: supplies' })
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Seat 2: empty' }));
    inspect('Inez Costa');
    fireEvent.click(screen.getByRole('button', { name: 'Add to crew' }));
    expect(
      screen.getByRole('button', { name: 'Next: supplies' })
    ).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'Seat 2: Inez Costa' })
    ).toBeInTheDocument();
  });

  it('launches the selected outpost with the chosen crew in seat order', async () => {
    openCrew();
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Seat 3: Lin Park' }));
    inspect('Daria Sokol');
    fireEvent.click(screen.getByRole('button', { name: 'Replace Lin' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next: supplies' }));
    const summary = await screen.findByRole('region', {
      name: 'Selected crew',
    });
    expect(
      within(summary).getByRole('heading', { name: 'Daria Sokol' })
    ).toBeInTheDocument();
    expect(within(summary).queryByText('Lin Park')).not.toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Selected lunar mission' })
    ).toHaveTextContent('Hadley Outpost selected');
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.click(screen.getByRole('button', { name: /Launch mission/ }));
    await screen.findByText('Launched mission');
    expect(api.createGame).toHaveBeenCalledWith(
      expect.objectContaining({
        station_id: 'hadley',
        crew_ids: ['alex', 'maya', 'daria', 'sam'],
      })
    );
  });

  it('retains packed cargo and the seed when changing crew from supplies', async () => {
    openCrew();
    await ready();
    fireEvent.click(screen.getByRole('button', { name: 'Next: supplies' }));
    const food = await screen.findByLabelText('Food packs quantity');
    fireEvent.change(food, { target: { value: '9' } });
    fireEvent.click(screen.getByRole('button', { name: 'Flight settings' }));
    fireEvent.change(screen.getByPlaceholderText('42'), {
      target: { value: '123' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Close Mission brief' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Change crew' }));
    await ready();
    inspect('Nora Haddad');
    fireEvent.click(screen.getByRole('button', { name: 'Replace Alex' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next: supplies' }));
    expect(await screen.findByLabelText('Food packs quantity')).toHaveValue(9);
    fireEvent.click(screen.getByRole('button', { name: 'Flight settings' }));
    expect(screen.getByPlaceholderText('42')).toHaveValue('123');
    fireEvent.click(
      screen.getByRole('button', { name: 'Close Mission brief' })
    );
    fireEvent.click(screen.getByRole('button', { name: /Launch mission/ }));
    await screen.findByText('Launched mission');
    expect(api.createGame).toHaveBeenCalledWith(
      expect.objectContaining({
        crew_ids: ['nora', 'maya', 'lin', 'sam'],
        cargo: expect.objectContaining({ food_packs: 9 }),
        random_seed: 123,
      })
    );
  });

  it('restores explicit empty seats from a URL without adding defaults', async () => {
    openCrew('/crew/?station=oceanus&crew=,,,');
    await ready();
    expect(
      screen.getByRole('button', { name: 'Next: supplies' })
    ).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Add to crew' }));
    expect(
      screen.getByRole('button', { name: 'Seat 1: Alex Vega' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Seat 2: empty' })
    ).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Next: supplies' }));
    expect(
      await screen.findByRole('region', { name: 'Selected crew' })
    ).toHaveTextContent('1/4');
    fireEvent.click(screen.getByRole('button', { name: /Launch mission/ }));
    await screen.findByText('Launched mission');
    expect(api.createGame).toHaveBeenCalledWith(
      expect.objectContaining({ crew_ids: ['alex'] })
    );
  });

  it('removes unknown, duplicate and excess URL choices, with an explanation', async () => {
    openCrew('/crew/?station=hadley&crew=alex,alex,missing,maya,sam');
    await ready();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Unavailable or duplicate choices were removed'
    );
    expect(
      screen.getByRole('button', { name: 'Seat 1: Alex Vega' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Seat 2: empty' })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next: supplies' }));
    await screen.findByRole('region', { name: 'Selected crew' });
    fireEvent.click(screen.getByRole('button', { name: /Launch mission/ }));
    await screen.findByText('Launched mission');
    expect(api.createGame).toHaveBeenCalledWith(
      expect.objectContaining({ crew_ids: ['alex', 'maya'] })
    );
  });

  it('does not duplicate a person when another occupied seat is active', async () => {
    openCrew();
    await ready();
    fireEvent.click(
      screen.getByRole('button', { name: 'Seat 2: Maya Okafor' })
    );
    inspect('Alex Vega');
    expect(
      screen.getByRole('button', { name: 'Remove from crew' })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Remove from crew' }));
    expect(
      screen.getByRole('button', { name: 'Seat 1: empty' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Seat 2: Maya Okafor' })
    ).toBeInTheDocument();
  });

  it('targets an empty seat by default when reopening a partial team', async () => {
    openCrew('/crew/?station=hadley&crew=alex,,,');
    await ready();
    inspect('Nora Haddad');
    fireEvent.click(screen.getByRole('button', { name: 'Add to crew' }));
    expect(
      screen.getByRole('button', { name: 'Seat 1: Alex Vega' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Seat 2: Nora Haddad' })
    ).toBeInTheDocument();
  });

  it('shows catalog failures and retries without blocking navigation back', async () => {
    vi.mocked(api.fetchCatalog).mockRejectedValueOnce(
      new Error('Roster offline')
    );
    openCrew();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Roster offline'
    );
    expect(screen.getByRole('link', { name: /Mission/ })).toHaveAttribute(
      'href',
      '/moon/'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await ready();
  });

  it.each([
    '/crew/?station=unknown',
    '/crew/?station=alpha&lunar_site=apollo-17',
  ])('rejects an unavailable or mismatched mission: %s', async (url) => {
    openCrew(url);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This mission or its crew roster is unavailable'
    );
    expect(
      screen.queryByRole('button', { name: 'Next: supplies' })
    ).not.toBeInTheDocument();
  });
});
