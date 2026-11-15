import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';
import * as api from '../api/game';
import { catalog } from './fixtures/backend';

describe('Title and preparation routes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.spyOn(api, 'fetchCatalog').mockResolvedValue(structuredClone(catalog));
  });

  it('uses the root for the title screen', () => {
    window.history.replaceState(null, '', '/');
    render(<App />);
    expect(
      screen.getByRole('heading', { name: 'LAST OUTPOST' })
    ).toBeInTheDocument();
    expect(api.fetchCatalog).not.toHaveBeenCalled();
  });

  it('keeps old station links working by redirecting to crew selection', async () => {
    window.history.replaceState(
      null,
      '',
      '/?station=hadley&lunar_site=apollo-15'
    );
    render(<App />);
    expect(
      await screen.findByText('Hadley Outpost')
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe('/crew/');
    expect(window.location.search).toBe('?station=hadley&lunar_site=apollo-15');
  });
});
