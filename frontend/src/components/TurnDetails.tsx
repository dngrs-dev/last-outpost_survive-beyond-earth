import type { AppliedEffects, HealthChange, TurnOutcome } from '../types/game';

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
    {effects.solar_efficiency !== 0 && <p>Solar efficiency: {effects.solar_efficiency > 0 ? '+' : ''}{Math.round(effects.solar_efficiency * 100)} percentage points.</p>}
    {effects.oxygen_efficiency !== 0 && <p>Oxygen efficiency: {effects.oxygen_efficiency > 0 ? '+' : ''}{Math.round(effects.oxygen_efficiency * 100)} percentage points.</p>}
  </>;
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
      <p>{crewNames[assignment.crew_id] || assignment.crew_id}: {assignment.outcome?.choice_text || assignment.activity_id} - {assignment.status === 'cancelled' ? assignment.reason : assignment.outcome?.success ? 'Success' : 'Failed'}</p>
      {assignment.outcome && <><SystemChanges effects={assignment.outcome.effects} /><HealthChanges changes={assignment.outcome.effects.health_changes} names={crewNames} />{assignment.outcome.objective_progress.map(g => <p key={g.objective_id}>Research objective: {g.title} +{g.amount}.</p>)}</>}
    </div>)}
    {outcome.project_updates.map((update, index) => <p key={`${update.project_id}-${index}`}>Project {update.project_id}: {update.message} Automatic recording power: {update.electricity_used}.</p>)}
    <h3>Weekly survival</h3>
    {outcome.survival.health_changes.map((change) => <div key={change.crew_id}>
      <HealthChanges changes={[change]} names={crewNames} />
      <p>Health penalties: food {change.food_penalty}, water {change.water_penalty}, oxygen {change.oxygen_penalty}.</p>
    </div>)}
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
