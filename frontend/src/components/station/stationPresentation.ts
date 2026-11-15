import type { CabinPose, CabinEquipment } from '../astronaut/CabinOutfit';
import type { AstronautMood } from '../AstronautAvatar';
import type { ChoiceResponse, CrewResponse, GameStateResponse, SubmitTurnRequest, TurnOutcome } from '../../types/game';

export type SceneMode = 'planning' | 'pending' | 'report';
export type ScenePlan = Pick<SubmitTurnRequest, 'event_choice_id' | 'selected_crew_id' | 'support_crew_ids' | 'assignments'>;
export interface CrewActivity {
  kind: 'routine' | 'rest' | 'repair' | 'research' | 'response' | 'outside' | 'care' | 'patient' | 'self_care' | 'unavailable';
  label: string;
  pose: CabinPose;
  equipment?: CabinEquipment;
  workerId: string;
  partnerId?: string;
  origin: 'routine' | 'incident' | 'assignment';
  result?: 'completed' | 'failed' | 'interrupted';
  reason?: string;
}
export type CrewActivities = Record<string, CrewActivity>;

export function crewMood(crew: CrewResponse): AstronautMood {
  if (crew.medical_conditions.length || !crew.condition.can_work || crew.condition.status === 'serious' || crew.condition.status === 'critical') return 'unwell';
  return crew.condition.status !== 'fit' || crew.nutrition_deficit > 0 || crew.hydration_deficit > 0 ? 'tired' : 'well';
}

function restingPose(crew: CrewResponse): CabinPose {
  return ['serious', 'critical'].includes(crew.condition.status) || crew.medical_conditions.some(condition => condition.urgent) ? 'reclining' : 'seated';
}

function routine(crew: CrewResponse): CrewActivity {
  return { kind: crew.condition.can_work ? 'routine' : 'rest', label: crew.condition.can_work ? 'Routine duties' : 'Recovery', pose: crew.condition.can_work ? 'seated' : restingPose(crew), workerId: crew.id, origin: 'routine' };
}

function activityFor(choice: ChoiceResponse, workerId: string, origin: CrewActivity['origin']): CrewActivity {
  const kind = choice.workload === 'eva' ? 'outside' : choice.workload === 'care' ? 'patient' : choice.action_type === 'maintenance' ? 'repair' : choice.action_type === 'research' ? 'research' : choice.action_type === 'rest' ? 'rest' : 'response';
  return { kind, label: choice.text, pose: kind === 'outside' ? 'standing' : kind === 'rest' || kind === 'patient' ? 'seated' : 'working', equipment: kind === 'repair' ? 'tools' : kind === 'patient' ? 'medical' : undefined, workerId, origin };
}

/** Presentation of orders only. Eligibility, outcomes, and all spending remain server-owned. */
export function plannedActivities(state: GameStateResponse, plan: ScenePlan): CrewActivities {
  const living = state.crew.filter(crew => crew.alive);
  const people = new Map(living.map(crew => [crew.id, crew]));
  const result = Object.fromEntries(living.map(crew => [crew.id, routine(crew)]));
  const claims: { ids: string[]; activity: CrewActivity; available: boolean; patientId?: string }[] = [];
  const incident = state.current_event?.choices.find(choice => choice.id === plan.event_choice_id);
  if (incident?.requires_crew && plan.selected_crew_id) {
    const support = plan.support_crew_ids || [];
    claims.push({ ids: [plan.selected_crew_id, ...support], activity: activityFor(incident, plan.selected_crew_id, 'incident'),
      available: incident.available && incident.eligible_crew.some(candidate => candidate.crew_id === plan.selected_crew_id && candidate.available)
        && support.length === Math.max(0, incident.minimum_crew - 1)
        && support.every(id => incident.support_candidates.some(candidate => candidate.crew_id === id && candidate.available)) });
  }
  for (const order of plan.assignments || []) {
    const choice = state.assignment_options.find(option => option.id === order.activity_id);
    if (!choice) continue;
    const medical = choice.action_type === 'medical';
    const patient = medical ? people.get(order.patient_id || '') : undefined;
    const validPatient = !medical || Boolean(patient && patient.medical_conditions.some(condition => condition.kind === order.condition_id)
      && (choice.id === 'self_care' ? patient.id === order.crew_id : patient.id !== order.crew_id));
    const activity = activityFor(choice, order.crew_id, 'assignment');
    if (medical) {
      activity.kind = choice.id === 'self_care' ? 'self_care' : 'care';
      activity.pose = choice.id === 'self_care' ? 'seated' : 'treating';
      activity.equipment = 'medical';
      activity.partnerId = patient?.id;
    }
    claims.push({ ids: medical && order.patient_id && order.patient_id !== order.crew_id ? [order.crew_id, order.patient_id] : [order.crew_id], activity,
      available: validPatient && choice.eligible_crew.some(candidate => candidate.crew_id === order.crew_id && candidate.available), patientId: medical && patient?.id !== order.crew_id ? patient?.id : undefined });
  }
  const counts = new Map<string, number>();
  claims.forEach(claim => claim.ids.forEach(id => counts.set(id, (counts.get(id) || 0) + 1)));
  for (const claim of claims) {
    const conflict = claim.ids.some(id => (counts.get(id) || 0) > 1);
    const valid = !conflict && claim.available && claim.ids.every(id => people.has(id));
    for (const id of claim.ids) {
      const person = people.get(id);
      if (!person) continue;
      if (!valid) {
        result[id] = { ...routine(person), kind: 'unavailable', label: conflict ? 'Fix crew booking' : 'Assignment unavailable', reason: conflict ? 'Each astronaut can have only one main job.' : 'Review crew eligibility, patient, and support requirements.' };
      } else if (id === claim.patientId) {
        result[id] = { ...claim.activity, kind: 'patient', label: `Care with ${people.get(claim.activity.workerId)?.name || claim.activity.workerId}`, pose: restingPose(person), equipment: undefined, partnerId: claim.activity.workerId };
      } else {
        result[id] = { ...claim.activity, pose: claim.activity.kind === 'patient' ? restingPose(person) : claim.activity.pose, label: id === claim.activity.workerId ? claim.activity.label : `Support: ${claim.activity.label}` };
      }
    }
  }
  return result;
}

/** Keep the submitted poses as a labelled recap, but release cancelled/dead participants. */
export function confirmedActivities(planned: CrewActivities, outcome: TurnOutcome, crew: CrewResponse[]): CrewActivities {
  const result: CrewActivities = {};
  const alive = new Set(crew.filter(person => person.alive).map(person => person.id));
  for (const person of crew.filter(person => person.alive)) {
    const activity = planned[person.id] || routine(person);
    if (activity.origin === 'routine') { result[person.id] = routine(person); continue; }
    const work = outcome.assignments.find(order => order.crew_id === activity.workerId);
    const receipt = activity.origin === 'incident' ? outcome.event : work?.outcome;
    if (activity.origin === 'assignment' && (!work || work.status === 'cancelled')) {
      result[person.id] = { ...routine(person), result: 'interrupted', label: 'Work interrupted', reason: work?.reason || 'No work was completed.' };
    } else {
      result[person.id] = { ...activity, result: receipt?.success ? 'completed' : 'failed', partnerId: activity.partnerId && alive.has(activity.partnerId) ? activity.partnerId : undefined };
    }
  }
  return result;
}

/** Fixed-size pictorial slots, relative to arrival stock reconstructed from net turn changes. */
export function supplyDisplay(state: GameStateResponse, resource: string, slots = 8) {
  const amount = Math.max(0, state.resources[resource] || 0);
  const arrival = amount - state.history.reduce((sum, week) => sum + (week.resource_changes[resource] || 0), 0);
  const reference = Math.max(1, arrival, amount);
  return { amount, fraction: amount / reference, visible: amount === 0 ? 0 : Math.min(slots, Math.max(1, Math.round(amount / reference * slots))) };
}
