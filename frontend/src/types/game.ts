export type RationLevel = 'normal' | 'reduced' | 'emergency';

export interface StationDefinition {
  id: string;
  name: string;
  description: string;
  mission_id: string;
  starting_resources: Record<string, number>;
  energy_per_week: number;
  oxygen_per_week: number;
}

export interface MissionDefinition {
  id: string;
  name: string;
  description: string;
  duration_weeks: number;
  minimum_survivors: number;
}

export interface CrewDefinition {
  id: string;
  name: string;
  role: string;
  description: string;
  health: number;
  positive_trait: string;
  negative_trait: string;
  food_multiplier: number;
  water_multiplier: number;
  event_bonus: number;
  injury_multiplier: number;
}

export interface ItemDefinition {
  id: string;
  name: string;
  description: string;
  resource: string;
  resource_amount: number;
  weight_kg: number;
  volume_l: number;
}

export interface CatalogLimits {
  max_crew: number;
  max_cargo_mass_kg: number;
  max_cargo_volume_l: number;
  [key: string]: number;
}

export interface CatalogResponse {
  stations: StationDefinition[];
  missions: MissionDefinition[];
  crew: CrewDefinition[];
  items: ItemDefinition[];
  limits: CatalogLimits;
  ration_multipliers: Record<RationLevel, number>;
  balance_note: string;
}

export interface CreateGameRequest {
  station_id: string;
  crew_ids: string[];
  cargo: Record<string, number>;
  random_seed?: number;
}

export interface RationRequest {
  food: RationLevel;
  water: RationLevel;
}

export interface SubmitTurnRequest {
  expected_week: number;
  request_id: string;
  rations: Record<string, RationRequest>;
  event_choice_id: string;
  selected_crew_id?: string | null;
}

export interface RationCost {
  food: number;
  water: number;
}

export interface CrewResponse {
  id: string;
  name: string;
  role: string;
  health: number;
  positive_trait: string;
  negative_trait: string;
  food_multiplier: number;
  water_multiplier: number;
  event_bonus: number;
  injury_multiplier: number;
  food_shortage_weeks: number;
  water_shortage_weeks: number;
  alive: boolean;
  ration_options: Record<RationLevel, RationCost>;
}

export interface EffectsResponse {
  resources: Record<string, number>;
  solar_efficiency: number;
  oxygen_efficiency: number;
  crew_health: number;
  target: 'selected' | 'all';
}

export interface CandidateResponse {
  crew_id: string;
  available: boolean;
  unavailable_reasons: string[];
  success_probability: number;
}

export interface ChoiceResponse {
  id: string;
  text: string;
  description: string;
  costs: Record<string, number>;
  required_items: Record<string, number>;
  requires_crew: boolean;
  role_bonus: Record<string, number>;
  crew_role_bonus: Record<string, number>;
  success_chance: number;
  success_effects: EffectsResponse;
  failure_effects: EffectsResponse;
  required_role: string | null;
  minimum_crew: number;
  available: boolean;
  unavailable_reasons: string[];
  eligible_crew: CandidateResponse[];
  success_probability: number | null;
}

export interface EventResponse {
  id: string;
  title: string;
  description: string;
  on_start: EffectsResponse;
  choices: ChoiceResponse[];
}

export interface MissionDays {
  start: number;
  end: number;
}

export interface ResultsResponse {
  ending: string;
  weeks_survived: number;
  initial_crew_size: number;
  surviving_crew_ids: string[];
  deceased_crew_ids: string[];
  failure_reason: string | null;
}

export interface TurnOutcome {
  week: number;
  event: {
    choice_id: string;
    choice_text: string;
    astronaut_id: string | null;
    success: boolean;
    description: string;
    changes: {
      resources: Record<string, number>;
      solar_efficiency: number;
      oxygen_efficiency: number;
      crew_health: Record<string, number>;
    };
  };
  rations: Record<string, RationRequest>;
  survival: {
    health_changes: Record<string, number>;
    resources_used: Record<string, number>;
    resources_generated: Record<string, number>;
    notes?: string[];
    [key: string]: unknown;
  };
  resource_changes: Record<string, number>;
  deaths: string[];
  next_event?: {
    event_id: string;
    title: string;
    effects: unknown;
  };
  ending?: string | null;
}

export interface TurnHistoryEntry {
  week: number;
  event: TurnOutcome['event'];
  rations: Record<string, RationRequest>;
  survival: TurnOutcome['survival'];
  resource_changes: Record<string, number>;
  deaths: string[];
  ending?: string | null;
  next_event?: TurnOutcome['next_event'];
}

export interface GameStateResponse {
  station_id: string;
  station_name: string;
  mission_id: string;
  mission_name: string;
  current_week: number;
  duration_weeks: number;
  minimum_survivors: number;
  weeks_remaining: number;
  mission_days: MissionDays;
  crew: CrewResponse[];
  resources: Record<string, number>;
  solar_efficiency: number;
  oxygen_efficiency: number;
  current_event_id: string | null;
  current_event: EventResponse | null;
  emergency_ration_requirements: RationCost;
  depleted_provisions: string[];
  used_event_ids: string[];
  flags: Record<string, string>;
  history: TurnHistoryEntry[];
  status: 'running' | 'completed' | 'failed';
  random_seed: number;
  initial_crew_size: number;
  weeks_completed: number;
  ending: string | null;
  results: ResultsResponse | null;
}

export interface GameResponse {
  game_id: string;
  state: GameStateResponse;
}

export interface TurnResponse extends GameResponse {
  turn_outcome: TurnOutcome;
}
