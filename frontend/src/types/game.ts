export type RationLevel = 'normal' | 'reduced' | 'emergency';

export interface StationDefinition {
  id: string;
  name: string;
  description: string;
  mission_id: string;
  starting_resources: Record<string, number>;
  energy_per_week: number;
  oxygen_per_week: number;
  solar_efficiency: number;
  oxygen_efficiency: number;
  difficulty: 'easy' | 'standard' | 'hard' | 'severe' | 'extreme';
  difficulty_rank: number;
  challenge: string;
  lunar_site_id: string | null;
}

export interface ResearchObjectiveDefinition {
  id: string;
  title: string;
  description: string;
  target: number;
  qualifying_choices: string[];
  source_url: string;
}

export interface ObjectiveProgress extends ResearchObjectiveDefinition {
  progress: number;
  completed: boolean;
}

export interface ObjectiveGain {
  objective_id: string;
  title: string;
  amount: number;
}

export interface ScienceResponse {
  status: 'not_started' | 'partial' | 'complete';
  completed_objectives: number;
  total_objectives: number;
  research_data: number;
  objectives: ObjectiveProgress[];
}

export interface MissionDefinition {
  id: string;
  name: string;
  description: string;
  duration_weeks: number;
  event_ids: string[];
  minimum_survivors: number;
  science_objectives: ResearchObjectiveDefinition[];
}

export interface CrewDefinition {
  normal_ration_cost: RationCost;
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
  specialty: string;
  training_source: string;
  action_bonuses: Record<string, number>;
  food_shortage_weeks: number;
  water_shortage_weeks: number;
}

export interface ItemDefinition {
  max_quantity: number;
  inspiration_source: string;
  id: string;
  name: string;
  description: string;
  resource: string;
  resource_amount: number;
  weight_kg: number;
  volume_l: number;
  unit: string;
  category: string;
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
  support_crew_ids?: string[];
  assignments?: { crew_id: string; activity_id: string }[];
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
  specialty: string;
  training_source: string;
  action_bonuses: Record<string, number>;
  food_shortage_weeks: number;
  water_shortage_weeks: number;
  alive: boolean;
  ration_options: Partial<Record<RationLevel, RationCost>>;
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
  action_type: 'event' | 'maintenance' | 'research';
  objective_rewards: ObjectiveGain[];
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
  category: 'hazard' | 'opportunity' | 'recovery';
  science_context: string;
  source_url: string;
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
  science: ScienceResponse;
}

export interface HealthChange {
  crew_id: string;
  before: number;
  after: number;
}

export interface AppliedEffects {
  resources: Record<string, number>;
  solar_efficiency: number;
  oxygen_efficiency: number;
  health_changes: HealthChange[];
}

export interface SurvivalHealthChange extends HealthChange {
  food_penalty: number;
  water_penalty: number;
  oxygen_penalty: number;
  died: boolean;
}

export interface TurnOutcome {
  science_gains: ObjectiveGain[];
  assignments: { crew_id: string; activity_id: string; status: "completed" | "cancelled"; outcome: TurnOutcome["event"] | null; reason: string | null }[];
  week: number;
  event: {
    event_id: string;
    choice_id: string;
    choice_text: string;
    selected_crew_id: string | null;
    success: boolean;
    success_probability: number;
    costs: Record<string, number>;
    effects: AppliedEffects;
    objective_progress: ObjectiveGain[];
    support_crew_ids: string[];
  };
  rations: Record<string, RationRequest>;
  survival: {
    ration_requirements: RationCost;
    ration_costs: RationCost;
    ration_depletion_fractions: RationCost;
    electricity_generated: number;
    electricity_required: number;
    electricity_used: number;
    life_support_power_fraction: number;
    oxygen_generated: number;
    oxygen_required: number;
    oxygen_used: number;
    oxygen_shortage: number;
    health_changes: SurvivalHealthChange[];
  };
  resource_changes: Record<string, number>;
  deaths: string[];
  next_event?: {
    event_id: string;
    title: string;
    effects: AppliedEffects;
  } | null;
  ending: string | null;
}

export type TurnHistoryEntry = TurnOutcome;

export interface GameStateResponse {
  station_id: string;
  station_name: string;
  difficulty: string;
  difficulty_rank: number;
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
  science: ScienceResponse;
  assignment_options: ChoiceResponse[];
}

export interface GameResponse {
  game_id: string;
  state: GameStateResponse;
}

export interface TurnResponse extends GameResponse {
  turn_outcome: TurnOutcome;
}
