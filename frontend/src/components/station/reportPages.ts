import type { AppliedEffects, TurnOutcome } from '../../types/game';
import { paragraphs, resourceName, supplies, type NotebookPage } from './notebookContent';

export function reportPages(outcome: TurnOutcome, names: Record<string, string>): NotebookPage[] {
  const pages: NotebookPage[] = [];
  const add = (title: string, text: string) => pages.push(...paragraphs(title, text));
  const changes = (title: string, effects: AppliedEffects) => {
    if (Object.keys(effects.resources).length) add(title, `Resource effects: ${supplies(effects.resources)}.`);
    for (const change of effects.health_changes) add(title, `${names[change.crew_id] || change.crew_id}: ${change.before} → ${change.after} HP.`);
    for (const [name, value] of [['Solar', effects.solar_efficiency], ['Oxygen', effects.oxygen_efficiency], ['Water recovery', effects.water_recovery_efficiency], ['CO2 scrubber', effects.co2_efficiency]] as const) if (value) add(title, `${name} condition: ${value > 0 ? '+' : ''}${Math.round(value * 100)} percentage points.`);
    for (const change of effects.medical_changes) add(title, `${names[change.crew_id] || change.crew_id}: ${resourceName(change.kind)} — ${change.action}. ${change.reason || ''}`);
  };
  add('Incident result', `${outcome.event.success ? 'Response successful' : 'Response unsuccessful'}: ${outcome.event.choice_text}. Attempt costs: ${supplies(outcome.event.costs)}.`);
  add('Survival outcome', `${outcome.deaths.length ? `Crew lost: ${outcome.deaths.map(id => names[id] || id).join(', ')}.` : 'All crew survived this week.'} Food used ${outcome.survival.ration_costs.food}; water used ${outcome.survival.ration_costs.water}. Life-support operation: ${Math.round(outcome.survival.life_support_power_fraction * 100)}%.`);
  add('Scientific achievement', outcome.science_gains.length ? outcome.science_gains.map(gain => `${gain.title}: +${gain.amount}.`).join(' ') : 'No new objective credit this week. Completed phases remain recorded. Science is assessed separately from survival.');
  add('Sunlight & power', `Daylight covered ${Math.round(outcome.survival.daylight_fraction * 100)}% of the week. Solar generation ${outcome.survival.electricity_generated}; life support used ${outcome.survival.electricity_used}. Recording used ${outcome.survival.project_electricity_used}.`);
  add('Oxygen', `Generated ${outcome.survival.oxygen_generated}; breathing demand ${outcome.survival.oxygen_required}; used ${outcome.survival.oxygen_used}. ${outcome.survival.oxygen_shortage > 0 ? `Shortage ${outcome.survival.oxygen_shortage}; this can reduce crew condition.` : 'Breathing demand was met.'}`);
  changes('Incident consequences', outcome.event.effects);
  for (const order of outcome.assignments) {
    add('Crew work', `${names[order.crew_id] || order.crew_id}: ${order.outcome?.choice_text || resourceName(order.activity_id)} — ${order.status === 'cancelled' ? `interrupted: ${order.reason}` : order.outcome?.success ? 'successful' : 'failed'}.`);
    if (order.patient_id) add('Medical care', `Patient: ${names[order.patient_id] || order.patient_id}; condition: ${resourceName(order.condition_id || '')}. Supported recovery is reported separately from the attempt.`);
    if (order.outcome) changes('Assignment consequences', order.outcome.effects);
  }
  for (const update of outcome.project_updates) add('Research project', `${update.project_id}: ${update.message} Automatic recording power: ${update.electricity_used}.`);
  const loop = outcome.survival.life_support;
  add('Life-support loop', `Wastewater processed ${loop.wastewater_processed}; clean water recovered ${loop.water_recovered}; water used for oxygen ${loop.water_for_oxygen}; wastewater captured ${loop.wastewater_captured}.`);
  add('Cabin air', `CO2 produced ${loop.co2_produced}; removed ${loop.co2_removed}; remaining burden ${loop.co2_remaining}. Oxygen reserves and CO2 removal are separate systems.`);
  for (const change of outcome.survival.health_changes) {
    const name = names[change.crew_id] || change.crew_id;
    add('Crew condition', `${name}: ${change.before} → ${change.after} HP. Recovery: +${change.recovery}${change.rested ? ' with rest' : ''}. Health penalties: food ${change.food_penalty}, water ${change.water_penalty}, oxygen ${change.oxygen_penalty}.`);
    add('Provisions received', `${name}: ${Math.round(change.food_received_fraction * 100)}% food / ${Math.round(change.water_received_fraction * 100)}% water of normal need. Deficits: nutrition ${change.nutrition_before} to ${change.nutrition_after}; hydration ${change.hydration_before} to ${change.hydration_after}.`);
    if (change.medical_penalty || change.co2_penalty) add('Other condition losses', `${name}: ongoing injury/illness ${change.medical_penalty}; CO2 exposure ${change.co2_penalty}.`);
    for (const medical of change.medical_changes) add('Medical recovery', `${name}: ${resourceName(medical.kind)} — ${medical.action}. ${medical.reason || ''}`);
  }
  add('Net stock changes', `${supplies(outcome.resource_changes)}. Includes next discovery effects, if any.`);
  if (outcome.next_event) {
    add('Next week’s discovery', `${outcome.next_event.title}. Its discovery effects are already included in the station view. Respond to it at the start of the next week.`);
    changes('Next discovery consequences', outcome.next_event.effects);
  }
  return pages;
}
