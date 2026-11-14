import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GamePage } from '../pages/GamePage';
import * as gameApi from '../api/game';
import type { GameStateResponse, TurnResponse } from '../types/game';

const mockGameState: GameStateResponse = {
  station_id: 'alpha',
  station_name: 'Station Alpha — Research Base',
  mission_id: 'alpha_rotation',
  mission_name: 'Hold Until Rotation',
  current_week: 1,
  duration_weeks: 12,
  minimum_survivors: 1,
  weeks_remaining: 11,
  mission_days: { start: 1, end: 7 },
  crew: [
    {
      id: 'alex',
      name: 'Alex Vega',
      role: 'engineer',
      health: 100,
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
        emergency: { food: 0.0, water: 0.0 },
      },
    },
  ],
  resources: {
    food: 20,
    water: 32,
    oxygen: 30,
    electricity: 30,
    medicine: 1,
    repair_kits: 2,
    eva_batteries: 2,
  },
  solar_efficiency: 1.0,
  oxygen_efficiency: 1.0,
  current_event_id: 'solar_failure',
  current_event: {
    id: 'solar_failure',
    title: 'Dust on the Array',
    description: 'An actuator has jammed in lunar dust.',
    on_start: {
      solar_efficiency: -0.25,
      oxygen_efficiency: 0,
      crew_health: 0,
      resources: {},
      target: 'all',
    },
    choices: [
      {
        id: 'engineer_repair',
        text: 'Send the engineer outside',
        description: 'Requires an engineer. A failed EVA causes injury.',
        costs: { repair_kits: 1, eva_batteries: 1, oxygen: 2 },
        required_items: {},
        requires_crew: true,
        role_bonus: { engineer: 0.3 },
        crew_role_bonus: {},
        success_chance: 0.6,
        success_effects: {
          solar_efficiency: 0.25,
          oxygen_efficiency: 0,
          crew_health: 0,
          resources: {},
          target: 'all',
        },
        failure_effects: {
          crew_health: -25,
          solar_efficiency: 0,
          oxygen_efficiency: 0,
          resources: {},
          target: 'selected',
        },
        required_role: 'engineer',
        minimum_crew: 1,
        available: true,
        unavailable_reasons: [],
        eligible_crew: [
          {
            crew_id: 'alex',
            available: true,
            unavailable_reasons: [],
            success_probability: 0.95,
          },
        ],
        success_probability: 0.95,
      },
      {
        id: 'ignore',
        text: 'Conserve supplies',
        description: 'Accept reduced output.',
        costs: {},
        required_items: {},
        requires_crew: false,
        role_bonus: {},
        crew_role_bonus: {},
        success_chance: 1.0,
        success_effects: {
          solar_efficiency: 0,
          oxygen_efficiency: 0,
          crew_health: 0,
          resources: {},
          target: 'all',
        },
        failure_effects: {
          solar_efficiency: 0,
          oxygen_efficiency: 0,
          crew_health: 0,
          resources: {},
          target: 'all',
        },
        required_role: null,
        minimum_crew: 1,
        available: true,
        unavailable_reasons: [],
        eligible_crew: [],
        success_probability: 1.0,
      },
    ],
  },
  emergency_ration_requirements: { food: 0, water: 0 },
  depleted_provisions: [],
  used_event_ids: [],
  flags: {},
  history: [],
  status: 'running',
  random_seed: 42,
  initial_crew_size: 1,
  weeks_completed: 0,
  ending: null,
  results: null,
};

describe('GamePage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(gameApi, 'fetchGameState').mockResolvedValue({
      game_id: 'game-123',
      state: mockGameState,
    });
  });

  it('renders week telemetry, resources, systems, and event dilemma', async () => {
    render(
      <MemoryRouter initialEntries={['/game/game-123']}>
        <Routes>
          <Route path="/game/:gameId" element={<GamePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('WEEK 1 / 12')).toBeInTheDocument();
    });

    expect(screen.getByText('MISSION DAYS 1–7')).toBeInTheDocument();
    expect(screen.getByText(/Dust on the Array/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Send the engineer outside/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Alex Vega')).toBeInTheDocument();
  });

  it('allows changing all rations to reduced or emergency', async () => {
    render(
      <MemoryRouter initialEntries={['/game/game-123']}>
        <Routes>
          <Route path="/game/:gameId" element={<GamePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('ALL REDUCED')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('ALL REDUCED'));
    expect(screen.getByText(/Weekly Consumption:/i)).toBeInTheDocument();
  });

  it('submits turn and presents the turn outcome modal', async () => {
    const mockOutcome: TurnResponse = {
      game_id: 'game-123',
      state: {
        ...mockGameState,
        current_week: 2,
        weeks_completed: 1,
      },
      turn_outcome: {
        week: 1,
        event: {
          choice_id: 'engineer_repair',
          choice_text: 'Send the engineer outside',
          astronaut_id: 'alex',
          success: true,
          description: 'Alex Vega completed outside repairs successfully.',
          changes: {
            resources: { repair_kits: -1, eva_batteries: -1, oxygen: -2 },
            solar_efficiency: 0.25,
            oxygen_efficiency: 0,
            crew_health: {},
          },
        },
        rations: { alex: { food: 'normal', water: 'normal' } },
        survival: {
          health_changes: {},
          resources_used: { food: 1.1, water: 1.0 },
          resources_generated: { electricity: 24, oxygen: 14 },
        },
        resource_changes: { food: -1.1, water: -1.0, repair_kits: -1 },
        deaths: [],
      },
    };

    const submitTurnMock = vi.spyOn(gameApi, 'submitTurn').mockResolvedValue(mockOutcome);

    render(
      <MemoryRouter initialEntries={['/game/game-123']}>
        <Routes>
          <Route path="/game/:gameId" element={<GamePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/SUBMIT WEEK 1 DECISIONS/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/SUBMIT WEEK 1 DECISIONS/i));

    await waitFor(() => {
      expect(submitTurnMock).toHaveBeenCalled();
      expect(screen.getByText(/WEEK 1 DEBRIEF/i)).toBeInTheDocument();
      expect(screen.getByText(/ACTION SUCCESSFUL/i)).toBeInTheDocument();
      expect(screen.getByText(/PROCEED TO WEEK 2/i)).toBeInTheDocument();
    });
  });
});
