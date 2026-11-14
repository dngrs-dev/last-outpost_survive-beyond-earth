import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ResultsPage } from '../pages/ResultsPage';
import * as gameApi from '../api/game';
import type { GameStateResponse } from '../types/game';

const mockCompletedGame: GameStateResponse = {
  station_id: 'alpha',
  station_name: 'Station Alpha — Research Base',
  mission_id: 'alpha_rotation',
  mission_name: 'Hold Until Rotation',
  current_week: 12,
  duration_weeks: 12,
  minimum_survivors: 1,
  weeks_remaining: 0,
  mission_days: { start: 78, end: 84 },
  crew: [
    {
      id: 'alex',
      name: 'Alex Vega',
      role: 'engineer',
      health: 85,
      positive_trait: 'Steady hands',
      negative_trait: 'Large appetite',
      food_multiplier: 1.1,
      water_multiplier: 1.0,
      event_bonus: 0.05,
      injury_multiplier: 1.0,
      food_shortage_weeks: 0,
      water_shortage_weeks: 0,
      alive: true,
      ration_options: {
        normal: { food: 1.1, water: 1.0 },
        reduced: { food: 0.55, water: 0.5 },
        emergency: { food: 0, water: 0 },
      },
    },
    {
      id: 'maya',
      name: 'Maya Patel',
      role: 'medic',
      health: 0,
      positive_trait: 'Efficient metabolism',
      negative_trait: 'Thirsty',
      food_multiplier: 0.9,
      water_multiplier: 1.1,
      event_bonus: 0,
      injury_multiplier: 1.0,
      food_shortage_weeks: 0,
      water_shortage_weeks: 0,
      alive: false,
      ration_options: {
        normal: { food: 0.9, water: 1.1 },
        reduced: { food: 0.45, water: 0.55 },
        emergency: { food: 0, water: 0 },
      },
    },
  ],
  resources: {
    food: 12,
    water: 18,
    oxygen: 25,
    electricity: 28,
    medicine: 1,
    repair_kits: 1,
    eva_batteries: 1,
  },
  solar_efficiency: 0.85,
  oxygen_efficiency: 0.9,
  current_event_id: null,
  current_event: null,
  emergency_ration_requirements: { food: 0, water: 0 },
  depleted_provisions: [],
  used_event_ids: ['solar_failure'],
  flags: {},
  history: [
    {
      week: 1,
      event: {
        choice_id: 'engineer_repair',
        choice_text: 'Send the engineer outside',
        astronaut_id: 'alex',
        success: true,
        description: 'Repaired solar array in week 1.',
        changes: {
          resources: {},
          solar_efficiency: 0.25,
          oxygen_efficiency: 0,
          crew_health: {},
        },
      },
      rations: {
        alex: { food: 'normal', water: 'normal' },
        maya: { food: 'normal', water: 'normal' },
      },
      survival: {
        health_changes: {},
        resources_used: {},
        resources_generated: {},
      },
      resource_changes: { food: -2.0, water: -2.1 },
      deaths: [],
    },
  ],
  status: 'completed',
  random_seed: 42,
  initial_crew_size: 2,
  weeks_completed: 12,
  ending: 'successful_handover',
  results: {
    ending: 'successful_handover',
    weeks_survived: 12,
    initial_crew_size: 2,
    surviving_crew_ids: ['alex'],
    deceased_crew_ids: ['maya'],
    failure_reason: null,
  },
};

describe('ResultsPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(gameApi, 'fetchGameState').mockResolvedValue({
      game_id: 'g-99',
      state: mockCompletedGame,
    });
  });

  it('renders mission ending title and debrief statistics', async () => {
    render(
      <MemoryRouter initialEntries={['/results/g-99']}>
        <Routes>
          <Route path="/results/:gameId" element={<ResultsPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('SUCCESSFUL HANDOVER')).toBeInTheDocument();
    });

    expect(screen.getByText('MISSION OBJECTIVES ACHIEVED')).toBeInTheDocument();
    expect(screen.getByText('12 / 12')).toBeInTheDocument();
    expect(screen.getByText('1 / 2')).toBeInTheDocument();
    expect(screen.getByText('Alex Vega')).toBeInTheDocument();
    expect(screen.getByText('DECEASED')).toBeInTheDocument();
    expect(screen.getByText('START NEW EXPEDITION →')).toBeInTheDocument();
  });

  it('renders mission chronicle with past turn actions', async () => {
    render(
      <MemoryRouter initialEntries={['/results/g-99']}>
        <Routes>
          <Route path="/results/:gameId" element={<ResultsPage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/MISSION CHRONICLE/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Repaired solar array in week 1/i)).toBeInTheDocument();
  });
});
