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
  water_recovery_efficiency: number;
  co2_efficiency: number;
  difficulty: 'easy' | 'standard' | 'hard' | 'severe' | 'extreme';
  difficulty_rank: number;
  challenge: string;
  lunar_site_id: string | null;
  longitude_deg: number;
  battery_capacity: number;
  co2_removal_per_week: number;
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
  required_resources: Record<string, number>;
}

export interface CrewDefinition {
  medical_conditions: MedicalCase[];
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
  nutrition_deficit: number;
  hydration_deficit: number;
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

export interface SunlightWeek {
  week: number;
  daylight_fraction: number;
  daylight_days: number;
  darkness_days: number;
  phase: 'daylight' | 'darkness' | 'mixed';
  electricity_generated: number;
}
export interface LightingModel {
  solar_day_earth_days: number;
  reference_longitude_deg: number;
  source_url: string;
  context_url: string;
  assumption: string;
}
export interface EnergyState {
  battery_capacity: number;
  stored: number;
  priority: 'life_support' | 'research';
  life_support_required: number;
  solar_day_earth_days: number;
  source_url: string;
  assumption: string;
  forecast: SunlightWeek[];
}

export interface CatalogResponse {
  lighting: LightingModel;
  sunlight_forecasts: Record<string, SunlightWeek[]>;
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
  power_priority?: "life_support" | "research";
  expected_week: number;
  request_id: string;
  rations: Record<string, RationRequest>;
  event_choice_id: string;
  selected_crew_id?: string | null;
  support_crew_ids?: string[];
  assignments?: { crew_id: string; activity_id: string; patient_id?: string; condition_id?: MedicalKind }[];
  project_orders?: { project_id: string; action: "pause" | "resume" | "interrupt" }[];
}

export interface RationCost {
  food: number;
  water: number;
}

export interface CrewCondition {
  status: 'fit' | 'impaired' | 'serious' | 'critical' | 'deceased';
  nutrition_status: 'adequate' | 'underfed' | 'depleted';
  hydration_status: 'adequate' | 'thirsty' | 'dehydrated';
  can_work: boolean;
  can_do_eva: boolean;
  performance_penalty: number;
  restrictions: string[];
  nutrition_recovery_weeks: number;
  hydration_recovery_weeks: number;
  source_url: string;
}
export interface RationOutlook {
  nutrition_deficit: number;
  hydration_deficit: number;
  food_damage: number;
  water_damage: number;
}

export type MedicalKind = 'sprain' | 'bleeding_wound' | 'dust_irritation' | 'gastrointestinal_illness';
export interface MedicalCase {
  kind: MedicalKind;
  remaining: number;
  acquired_week: number;
  stabilized: boolean;
  care_week: number;
  care_points: number;
}
export interface MedicalCondition extends MedicalCase {
  title: string;
  urgent: boolean;
  rest_weeks: number | null;
  medic_weeks: number;
  untreated_damage: number;
  source_url: string;
}
export interface MedicalChange {
  crew_id: string;
  kind: MedicalKind;
  action: 'acquired' | 'worsened' | 'stabilized' | 'recovering' | 'resolved' | 'stalled';
  reason: string | null;
  before: MedicalCase | null;
  after: MedicalCase | null;
}
export interface CrewResponse {
  medical_conditions: MedicalCondition[];
  condition: CrewCondition;
  ration_outlook: Partial<Record<RationLevel, RationOutlook>>;
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
  nutrition_deficit: number;
  hydration_deficit: number;
  water_shortage_weeks: number;
  alive: boolean;
  ration_options: Partial<Record<RationLevel, RationCost>>;
}

export interface EffectsResponse {
  condition: MedicalKind | null;
  treatment: number;
  resources: Record<string, number>;
  solar_efficiency: number;
  oxygen_efficiency: number;
  water_recovery_efficiency: number;
  co2_efficiency: number;
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
  workload: 'light' | 'strenuous' | 'eva' | 'care' | 'rest';
  support_candidates: { crew_id: string; available: boolean; unavailable_reasons: string[] }[];
  id: string;
  action_type: 'event' | 'maintenance' | 'research' | 'rest' | 'medical';
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
  medical_changes: MedicalChange[];
  resources: Record<string, number>;
  solar_efficiency: number;
  oxygen_efficiency: number;
  water_recovery_efficiency: number;
  co2_efficiency: number;
  health_changes: HealthChange[];
}

export interface SurvivalHealthChange extends HealthChange {
  medical_penalty: number;
  medical_changes: MedicalChange[];
  food_received_fraction: number;
  water_received_fraction: number;
  nutrition_before: number;
  nutrition_after: number;
  hydration_before: number;
  hydration_after: number;
  recovery: number;
  worked: boolean;
  rested: boolean;
  food_penalty: number;
  water_penalty: number;
  oxygen_penalty: number;
  co2_penalty: number;
  died: boolean;
}

export interface TurnOutcome {
  project_updates: { project_id: string; message: string; electricity_used: number }[];
  science_gains: ObjectiveGain[];
  assignments: { crew_id: string; activity_id: string; patient_id: string | null; condition_id: MedicalKind | null; status: "completed" | "cancelled"; outcome: TurnOutcome["event"] | null; reason: string | null }[];
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
    life_support: {
      wastewater_processed: number;
      water_recovered: number;
      water_for_oxygen: number;
      wastewater_captured: number;
      oxygen_generated: number;
      co2_produced: number;
      co2_removed: number;
      co2_remaining: number;
      power_components: Record<string, number>;
    };
    daylight_fraction: number;
    battery_capacity: number;
    electricity_curtailed: number;
    project_electricity_used: number;
    power_priority: "life_support" | "research";
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

export interface ResearchProject {
  id: string;
  kind: string;
  status: 'active' | 'paused' | 'completed';
  phase: string;
  phase_index: number;
  phase_progress: number;
  phase_weeks: number;
  remaining_weeks: number;
  estimated_completion_week: number | null;
  within_rotation: boolean;
  crew_required: number;
  costs: Record<string, number>;
  required_items: Record<string, number>;
  assigned_crew_id: string | null;
  message: string;
}

export interface LifeSupportState {
  source_url: string;
  water_recovery_condition: number;
  co2_condition: number;
  wastewater: number;
  co2_burden: number;
  co2_warning_level: number;
  recovery_capacity: number;
  recovery_yield: number;
  water_per_oxygen: number;
  oxygen_reserve_weeks: number;
  water_recovery_wear: number;
  co2_wear: number;
  co2_removal_capacity: number;
  power_components: Record<string, number>;
}

export interface GameStateResponse {
  life_support: LifeSupportState;
  energy: EnergyState;
  battery_capacity: number;
  power_priority: "life_support" | "research";
  research_projects: ResearchProject[];
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
  water_recovery_efficiency: number;
  co2_efficiency: number;
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
