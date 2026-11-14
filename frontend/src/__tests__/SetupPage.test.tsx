import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SetupPage } from '../pages/SetupPage';
import * as gameApi from '../api/game';
import { catalog as mockCatalog, game } from './fixtures/backend';

describe('SetupPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
      expect(screen.getByText('Station Alpha — Research Base')).toBeInTheDocument();
    });

    expect(screen.getByText('Alex Vega')).toBeInTheDocument();
    expect(screen.getByText('Maya Okafor')).toBeInTheDocument();
    expect(screen.getByText('Food packs')).toBeInTheDocument();
    expect(screen.getByText('Water containers')).toBeInTheDocument();
  });

  it('allows selecting and deselecting astronauts', async () => {
    render(
      <BrowserRouter>
        <SetupPage />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Alex Vega')).toBeInTheDocument();
    });

    // Both Alex and Maya are in the crew grid
    const alexCard = screen.getByText('Alex Vega').closest('.crew-card');
    expect(alexCard).toBeInTheDocument();

    // Toggle Alex
    fireEvent.click(alexCard!);
    // Deselected
    expect(alexCard).not.toHaveClass('selected');

    // Click again to reselect
    fireEvent.click(alexCard!);
    expect(alexCard).toHaveClass('selected');
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
    });
  });
});
