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

  it('keeps old station links working by redirecting to preparation', async () => {
    window.history.replaceState(
      null,
      '',
      '/?station=hadley&lunar_site=apollo-15'
    );
    render(<App />);
    expect(
      await screen.findByRole('region', { name: 'Selected lunar mission' })
    ).toHaveTextContent('Hadley Outpost selected');
    expect(window.location.pathname).toBe('/prepare/');
    expect(window.location.search).toBe('?station=hadley&lunar_site=apollo-15');
  });
});
