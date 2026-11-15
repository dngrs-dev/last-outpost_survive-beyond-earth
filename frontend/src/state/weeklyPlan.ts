import type { GameStateResponse, RationRequest, SubmitTurnRequest } from '../types/game';
import type { CrewActivities } from '../components/station/stationPresentation';

export type CrewOrder = NonNullable<SubmitTurnRequest['assignments']>[number];
export interface WeeklyPlan {
  version: 1 | 2;
  week: number;
  incidentConfirmed: boolean;
  rationsConfirmed: boolean;
  event_choice_id: string;
  selected_crew_id: string | null;
  support_crew_ids: string[];
  assignments: CrewOrder[];
  routine_crew_ids: string[];
  rations: Record<string, RationRequest>;
  meal_choices: Record<string, { food: boolean; water: boolean }>;
  power_priority: 'life_support' | 'research';
  powerConfirmed: boolean;
  project_orders: NonNullable<SubmitTurnRequest['project_orders']>;
  rejection?: string;
  pending?: { request: SubmitTurnRequest; activities: CrewActivities };
}

const storageKey = (id: string) => `last-outpost.week-plan.v1.${id}`;

export function newWeekPlan(state: GameStateResponse): WeeklyPlan {
  return {
    version: 2, week: state.current_week, incidentConfirmed: false, rationsConfirmed: false,
    event_choice_id: '', selected_crew_id: null, support_crew_ids: [], assignments: [], routine_crew_ids: [],
    meal_choices: {},
    rations: Object.fromEntries(state.crew.filter(person => person.alive).map(person => [person.id, {
      food: state.depleted_provisions.includes('food') ? 'emergency' : 'normal',
      water: state.depleted_provisions.includes('water') ? 'emergency' : 'normal',
    }])), power_priority: state.energy.priority, powerConfirmed: false, project_orders: [],
  };
}

export function readWeekPlan(id: string): WeeklyPlan | null {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey(id)) || 'null') as WeeklyPlan | null;
    if (!value || ![1, 2].includes(value.version) || !Number.isInteger(value.week)
      || typeof value.incidentConfirmed !== 'boolean' || typeof value.rationsConfirmed !== 'boolean'
      || typeof value.powerConfirmed !== 'boolean'
      || typeof value.event_choice_id !== 'string' || !Array.isArray(value.assignments)
      || !Array.isArray(value.support_crew_ids) || !Array.isArray(value.routine_crew_ids)
      || !Array.isArray(value.project_orders) || !value.rations
      || !['life_support', 'research'].includes(value.power_priority)) return null;
    if ((value.selected_crew_id !== null && typeof value.selected_crew_id !== 'string')
      || !value.support_crew_ids.every(id => typeof id === 'string') || !value.routine_crew_ids.every(id => typeof id === 'string')
      || typeof value.rations !== 'object' || Array.isArray(value.rations)
      || !value.assignments.every(order => order && typeof order.crew_id === 'string' && typeof order.activity_id === 'string'
        && (order.patient_id == null || typeof order.patient_id === 'string') && (order.condition_id == null || typeof order.condition_id === 'string'))
      || !value.project_orders.every(order => order && typeof order.project_id === 'string' && ['pause', 'resume', 'interrupt'].includes(order.action))) return null;
    if (value.rejection !== undefined && typeof value.rejection !== 'string') return null;
    if (Object.values(value.rations).some(ration => !ration || !['normal', 'reduced', 'emergency'].includes(ration.food) || !['normal', 'reduced', 'emergency'].includes(ration.water))) return null;
    if (value.pending && (!value.pending.request?.request_id || !Number.isInteger(value.pending.request.expected_week) || !value.pending.activities || typeof value.pending.activities !== 'object' || Array.isArray(value.pending.activities))) return null;
    if (value.version === 1) {
      value.meal_choices = Object.fromEntries(Object.keys(value.rations).map(id => [id, { food: value.rationsConfirmed, water: value.rationsConfirmed }]));
      value.version = 2;
    }
    if (!value.meal_choices || typeof value.meal_choices !== 'object' || Array.isArray(value.meal_choices)
      || Object.values(value.meal_choices).some(choice => !choice || typeof choice.food !== 'boolean' || typeof choice.water !== 'boolean')) return null;
    return value;
  } catch { return null; }
}

export function saveWeekPlan(id: string, plan: WeeklyPlan) {
  try { localStorage.setItem(storageKey(id), JSON.stringify(plan)); } catch { /* In-memory play still works when browser storage is unavailable. */ }
}

export function bookedCrew(plan: WeeklyPlan) {
  return [
    ...(plan.incidentConfirmed ? [plan.selected_crew_id, ...plan.support_crew_ids].filter((id): id is string => Boolean(id)) : []),
    ...plan.assignments.flatMap(order => order.patient_id && order.patient_id !== order.crew_id ? [order.crew_id, order.patient_id] : [order.crew_id]),
    ...plan.routine_crew_ids,
  ];
}

export function weeklyCosts(state: GameStateResponse, plan: WeeklyPlan, includeRations = true) {
  const costs: Record<string, number> = {};
  const incident = plan.incidentConfirmed ? state.current_event?.choices.find(choice => choice.id === plan.event_choice_id) : undefined;
  const actions = [incident, ...plan.assignments.map(order => state.assignment_options.find(option => option.id === order.activity_id))];
  for (const action of actions) for (const [resource, amount] of Object.entries(action?.costs || {})) costs[resource] = (costs[resource] || 0) + amount;
  if (includeRations) for (const person of state.crew.filter(person => person.alive)) {
    const ration = plan.rations[person.id];
    costs.food = (costs.food || 0) + (person.ration_options[ration?.food || 'normal']?.food || 0);
    costs.water = (costs.water || 0) + (person.ration_options[ration?.water || 'normal']?.water || 0);
  }
  return costs;
}

/** Projections and booking checks only. The backend validates/resolves the atomic week. */
export function planIssues(state: GameStateResponse, plan: WeeklyPlan, includeRations = true): string[] {
  const issues: string[] = [];
  const living = state.crew.filter(person => person.alive);
  const incident = state.current_event?.choices.find(choice => choice.id === plan.event_choice_id);
  if (!plan.incidentConfirmed || !incident?.available) issues.push('Confirm an available incident response first.');
  if (incident?.requires_crew) {
    if (!incident.eligible_crew.some(candidate => candidate.crew_id === plan.selected_crew_id && candidate.available)) issues.push('Choose an eligible incident lead.');
    if (plan.support_crew_ids.length !== Math.max(0, incident.minimum_crew - 1)) issues.push(`This response needs ${Math.max(0, incident.minimum_crew - 1)} support crew.`);
    if (plan.support_crew_ids.some(id => id === plan.selected_crew_id || !incident.support_candidates.some(candidate => candidate.crew_id === id && candidate.available))) issues.push('Incident support must be fit and distinct from the lead.');
  } else if (plan.selected_crew_id || plan.support_crew_ids.length) issues.push('This response does not reserve crew.');
  const booked = bookedCrew(plan);
  if (booked.length !== new Set(booked).size) issues.push('Each astronaut can perform only one main job this week.');
  if (booked.some(id => !living.some(person => person.id === id))) issues.push('Unavailable crew cannot be assigned.');
  const projectJobs: string[] = [];
  for (const order of plan.assignments) {
    const option = state.assignment_options.find(option => option.id === order.activity_id);
    if (!option?.eligible_crew.some(candidate => candidate.crew_id === order.crew_id && candidate.available)) issues.push('An assignment is unavailable for its astronaut.');
    if (option?.action_type === 'medical') {
      const patient = living.find(person => person.id === order.patient_id);
      if (!patient?.medical_conditions.some(condition => condition.kind === order.condition_id)
        || (order.activity_id === 'self_care' ? order.patient_id !== order.crew_id : order.patient_id === order.crew_id)) issues.push('Select a living patient and an active condition.');
    }
    if (order.activity_id === 'research_seismic' || order.activity_id.startsWith('project:')) {
      projectJobs.push(order.activity_id);
      if (plan.project_orders.some(control => order.activity_id === `project:${control.project_id}` && control.action !== 'resume')) issues.push('This project is paused for the week and cannot also use assigned crew.');
    }
  }
  if (projectJobs.length !== new Set(projectJobs).size) issues.push('Only one worker may advance each project this week.');
  if (includeRations) for (const missing of missingMeals(state, plan)) issues.push(`${missing.person.name} needs ${missing.resources.join(' and ')}.`);
  const actionCosts = weeklyCosts(state, plan, false);
  for (const [resource, amount] of Object.entries(weeklyCosts(state, plan, includeRations))) {
    const emergency = includeRations && (resource === 'food' || resource === 'water') && living.every(person => plan.rations[person.id]?.[resource] === 'emergency');
    if (amount > (state.resources[resource] || 0) + .000001 && (!emergency || (actionCosts[resource] || 0) > (state.resources[resource] || 0) + .000001)) issues.push(`Combined plan exceeds available ${resource.replace(/_/g, ' ')}.`);
  }
  return [...new Set(issues)];
}

export function turnRequest(plan: WeeklyPlan): SubmitTurnRequest {
  return {
    expected_week: plan.week,
    request_id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `week-${plan.week}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    event_choice_id: plan.event_choice_id, selected_crew_id: plan.selected_crew_id,
    support_crew_ids: plan.support_crew_ids.slice(), assignments: plan.assignments.map(order => ({ ...order })),
    rations: Object.fromEntries(Object.entries(plan.rations).map(([id, ration]) => [id, { ...ration }])),
    power_priority: plan.power_priority, project_orders: plan.project_orders.map(order => ({ ...order })),
  };
}

export function missingMeals(state: GameStateResponse, plan: WeeklyPlan) {
  return state.crew.filter(person => person.alive).map(person => ({ person, resources: (['food', 'water'] as const).filter(resource => !plan.meal_choices[person.id]?.[resource]) })).filter(missing => missing.resources.length > 0);
}
export function chooseMeal(plan: WeeklyPlan, id: string, resource: keyof RationRequest, level: RationRequest['food']): WeeklyPlan {
  if (plan.pending) return plan;
  return { ...plan, rations: { ...plan.rations, [id]: { ...plan.rations[id], [resource]: level } }, meal_choices: { ...plan.meal_choices, [id]: { ...(plan.meal_choices[id] || { food: false, water: false }), [resource]: true } } };
}
export function feedAll(state: GameStateResponse, plan: WeeklyPlan, level: RationRequest['food']): WeeklyPlan {
  return state.crew.filter(person => person.alive).reduce((next, person) => chooseMeal(chooseMeal(next, person.id, 'food', level), person.id, 'water', level), plan);
}
