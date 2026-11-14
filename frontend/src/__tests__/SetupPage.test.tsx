import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SetupPage } from '../pages/SetupPage';
import * as gameApi from '../api/game';
import type { CatalogResponse } from '../types/game';

const mockCatalog: CatalogResponse = {
  stations: [
    {
      id: 'alpha',
      name: 'Station Alpha — Research Base',
      description: 'A fictional lunar research outpost.',
      mission_id: 'alpha_rotation',
      starting_resources: { food: 20, water: 32, oxygen: 30, electricity: 30 },
      energy_per_week: 24,
      oxygen_per_week: 14,
    },
  ],
  missions: [
    {
      id: 'alpha_rotation',
      name: 'Hold Until Rotation',
      description: 'Survive 84 Earth days.',
      duration_weeks: 12,
      minimum_survivors: 1,
    },
  ],
  crew: [
    {
      id: 'alex',
      name: 'Alex Vega',
      role: 'engineer',
      description: 'Chief engineer.',
      health: 100,
      positive_trait: 'Steady hands',
      negative_trait: 'Large appetite',
      food_multiplier: 1.1,
      water_multiplier: 1.0,
      event_bonus: 0.05,
      injury_multiplier: 1.0,
    },
    {
      id: 'maya',
      name: 'Maya Patel',
      role: 'medic',
      description: 'Medical officer.',
      health: 100,
      positive_trait: 'Efficient metabolism',
      negative_trait: 'Thirsty',
      food_multiplier: 0.9,
      water_multiplier: 1.1,
      event_bonus: 0.0,
      injury_multiplier: 1.0,
    },
  ],
  items: [
    {
      id: 'food_packs',
      name: 'Food packs',
      description: 'Four weekly food units.',
      resource: 'food',
      resource_amount: 4,
      weight_kg: 2,
      volume_l: 4,
    },
    {
      id: 'water_containers',
      name: 'Water containers',
      description: 'Five water units.',
      resource: 'water',
      resource_amount: 5,
      weight_kg: 5,
      volume_l: 5,
    },
  ],
  limits: {
    max_crew: 4,
    max_cargo_mass_kg: 500,
    max_cargo_volume_l: 450,
  },
  ration_multipliers: {
    normal: 1.0,
    reduced: 0.5,
    emergency: 0.0,
  },
  balance_note: 'Fictional gameplay values.',
};

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
    expect(screen.getByText('Maya Patel')).toBeInTheDocument();
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
      state: {} as any,
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
