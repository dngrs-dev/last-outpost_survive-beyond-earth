import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SetupPage } from '../pages/SetupPage';
import * as gameApi from '../api/game';
import { catalog as mockCatalog, game } from './fixtures/backend';
import { readLastMission } from '../state/lastMission';

describe('SetupPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    window.history.replaceState(null, '', '/prepare/');
    vi.spyOn(gameApi, 'fetchCatalog').mockResolvedValue(mockCatalog);
  });

  it('renders station briefing, astronauts, and cargo controls', async () => {
    render(
      <BrowserRouter>
        <SetupPage />
      </BrowserRouter>
    );

    expect(screen.getByText(/ESTABLISHING SATELLITE UPLINK/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Outpost' })).toHaveValue('alpha');
    });

    expect(screen.getByRole('heading', { name: 'Alex Vega' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Maya Okafor' })).toBeInTheDocument();
    expect(screen.getByText('Food packs')).toBeInTheDocument();
    expect(screen.getByText('Water containers')).toBeInTheDocument();
  });

  it('uses the crew selected on the visual roster screen', async () => {
    window.history.replaceState(null, '', '/prepare/?station=alpha&crew=nora,maya,,sam');
    render(<BrowserRouter><SetupPage /></BrowserRouter>);
    expect(await screen.findByRole('heading', { name: 'Nora Haddad' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Alex Vega' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Selected crew' })).toHaveTextContent('3/4');
    expect(screen.getByRole('button', { name: 'Change crew' })).toBeEnabled();
  });

  it('increments and decrements cargo quantities', async () => {
    render(
      <BrowserRouter>
        <SetupPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Food packs')).toBeInTheDocument();
    });

    const foodPackInput = screen.getByLabelText('Food packs quantity') as HTMLInputElement;
    const initialVal = parseInt(foodPackInput.value, 10);

    const increaseBtn = screen.getByLabelText('Increase Food packs');
    fireEvent.click(increaseBtn);

    expect(foodPackInput.value).toBe(String(initialVal + 1));

    const decreaseBtn = screen.getByLabelText('Decrease Food packs');
    fireEvent.click(decreaseBtn);

    expect(foodPackInput.value).toBe(String(initialVal));
  });

  it('submits valid mission setup and calls createGame', async () => {
    const createGameMock = vi.spyOn(gameApi, 'createGame').mockResolvedValue({
      game_id: 'test-game-xyz',
      state: game.state,
    });

    render(
      <BrowserRouter>
        <SetupPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/LAUNCH EXPEDITION TO MOON/i)).toBeInTheDocument();
    });

    const submitBtn = screen.getByText(/LAUNCH EXPEDITION TO MOON/i);
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createGameMock).toHaveBeenCalledWith(
        expect.objectContaining({
          station_id: 'alpha',
        })
      );
      expect(readLastMission()).toBe('test-game-xyz');
    });
  });
});
