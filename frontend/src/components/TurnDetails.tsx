import type { AppliedEffects, HealthChange, MedicalChange, TurnOutcome } from '../types/game';

interface Props {
  outcome: TurnOutcome;
  crewNames: Record<string, string>;
}

function HealthChanges({ changes, names }: { changes: HealthChange[]; names: Record<string, string> }) {
  return <ul>{changes.map((change) => {
    const delta = change.after - change.before;
    return <li key={change.crew_id}>
      {names[change.crew_id] || change.crew_id}: {change.before} → {change.after} HP
      {' '}({delta > 0 ? '+' : ''}{delta} HP)
    </li>;
  })}</ul>;
}

function SystemChanges({ effects }: { effects: AppliedEffects }) {
  return <>
    <MedicalChanges changes={effects.medical_changes} />
    {effects.solar_efficiency !== 0 && <p>Solar efficiency: {effects.solar_efficiency > 0 ? '+' : ''}{Math.round(effects.solar_efficiency * 100)} percentage points.</p>}
    {effects.water_recovery_efficiency !== 0 && <p>Water recovery condition: {Math.round(effects.water_recovery_efficiency * 100)} percentage points.</p>}
    {effects.co2_efficiency !== 0 && <p>CO2 scrubber condition: {Math.round(effects.co2_efficiency * 100)} percentage points.</p>}
    {effects.oxygen_efficiency !== 0 && <p>Oxygen efficiency: {effects.oxygen_efficiency > 0 ? '+' : ''}{Math.round(effects.oxygen_efficiency * 100)} percentage points.</p>}
  </>;
}

function MedicalChanges({ changes }: { changes: MedicalChange[] }) {
  return <>{changes.map((change, index) => <p key={`${change.crew_id}-${change.kind}-${index}`}>
    {change.crew_id}: {change.kind.replace(/_/g, ' ')} - {change.action}; recovery points {change.before?.remaining ?? 0} to {change.after?.remaining ?? 0}. {change.reason}
  </p>)}</>;
}

export function TurnDetails({ outcome, crewNames }: Props) {
  return <div style={{ fontSize: '0.9rem', lineHeight: 1.7 }}>
    <h3>Event consequences</h3>
    {outcome.event.objective_progress.map((gain) => <p key={gain.objective_id}>
      Research objective: {gain.title} +{gain.amount}.
    </p>)}
    <SystemChanges effects={outcome.event.effects} />
    <HealthChanges changes={outcome.event.effects.health_changes} names={crewNames} />
    <h3>Crew assignments</h3>
    {outcome.assignments.map(assignment => <div key={assignment.crew_id}>
      {assignment.patient_id && <p>Patient: {crewNames[assignment.patient_id] || assignment.patient_id}; condition: {assignment.condition_id?.replace(/_/g, ' ')}.</p>}
      <p>{crewNames[assignment.crew_id] || assignment.crew_id}: {assignment.outcome?.choice_text || assignment.activity_id} - {assignment.status === 'cancelled' ? assignment.reason : assignment.outcome?.success ? 'Success' : 'Failed'}</p>
      {assignment.outcome && <><SystemChanges effects={assignment.outcome.effects} /><HealthChanges changes={assignment.outcome.effects.health_changes} names={crewNames} />{assignment.outcome.objective_progress.map(g => <p key={g.objective_id}>Research objective: {g.title} +{g.amount}.</p>)}</>}
    </div>)}
    {outcome.project_updates.map((update, index) => <p key={`${update.project_id}-${index}`}>Project {update.project_id}: {update.message} Automatic recording power: {update.electricity_used}.</p>)}
    <h3>Life-support resource loop</h3>
    <p>Wastewater processed {outcome.survival.life_support.wastewater_processed}; clean water recovered {outcome.survival.life_support.water_recovered}; water used for oxygen {outcome.survival.life_support.water_for_oxygen}; new wastewater captured {outcome.survival.life_support.wastewater_captured}.</p>
    <p>CO2 produced {outcome.survival.life_support.co2_produced}, removed {outcome.survival.life_support.co2_removed}, remaining burden {outcome.survival.life_support.co2_remaining}.</p>
    <p>System power budgets: {Object.entries(outcome.survival.life_support.power_components).map(([id, value]) => `${id.replace(/_/g, ' ')} ${value}`).join(', ')}. Actual operation scales with the reported life-support power fraction.</p>
    <h3>Weekly survival</h3>
    {outcome.survival.health_changes.map((change) => <div key={change.crew_id}>
      <HealthChanges changes={[change]} names={crewNames} />
      <p>Actual food / water received: {Math.round(change.food_received_fraction * 100)}% / {Math.round(change.water_received_fraction * 100)}% of normal need. Deficits: nutrition {change.nutrition_before} to {change.nutrition_after}; hydration {change.hydration_before} to {change.hydration_after}. Recovery: +{change.recovery} condition points{change.rested ? " with rest" : ""}.</p>
      <p>Health penalties: food {change.food_penalty}, water {change.water_penalty}, oxygen {change.oxygen_penalty}.</p>
      {change.medical_penalty > 0 && <p>Ongoing injury/illness damage: {change.medical_penalty} condition points.</p>}
      <MedicalChanges changes={change.medical_changes} />
      {change.co2_penalty > 0 && <p>CO2 exposure penalty: {change.co2_penalty} health.</p>}
    </div>)}
    <p>Daylight: {Math.round(outcome.survival.daylight_fraction * 100)}% of this week. Power priority: {outcome.survival.power_priority.replace(/_/g, " ")}. Recording used {outcome.survival.project_electricity_used}; battery capacity {outcome.survival.battery_capacity}; discarded overflow {outcome.survival.electricity_curtailed}.</p>
    <p>Electricity: generated {outcome.survival.electricity_generated}, used {outcome.survival.electricity_used}.</p>
    <p>Oxygen: generated {outcome.survival.oxygen_generated}, used {outcome.survival.oxygen_used}; shortage {outcome.survival.oxygen_shortage}.</p>
    {outcome.next_event && <div>
      <h3>Next week's discovery: {outcome.next_event.title}</h3>
      <p>These effects are already included in the current crew and station status.</p>
      <SystemChanges effects={outcome.next_event.effects} />
      <HealthChanges changes={outcome.next_event.effects.health_changes} names={crewNames} />
    </div>}
  </div>;
}
