import type { MedicalCondition } from '../types/game';

export function MedicalConditions({ conditions, alive }: { conditions: MedicalCondition[]; alive: boolean }) {
  if (!conditions.length) return null;
  return <section aria-label="Injuries and illnesses">
    {conditions.map(condition => <div key={condition.kind}>
      <strong>{condition.title}</strong>
      {alive && condition.urgent && <p role="alert">Urgent: stabilize with medical care or self-care. Active work is unavailable. Untreated damage: {condition.untreated_damage} per week after the onset week.</p>}
      <p>{condition.remaining} recovery points remaining{condition.stabilized ? '; stabilized' : ''}.</p>
      {alive && <p>Earliest recovery: {condition.medic_weeks} medic-care weeks; {condition.rest_weeks === null ? 'stabilization needed before rest can heal this wound' : `${condition.rest_weeks} rest weeks`}. Assumes full provisions, safe air, and no new injury.</p>}
      <a href={condition.source_url} target="_blank" rel="noreferrer">NASA medical context</a>
    </div>)}
    <p>Conditions and recovery timelines use fictional game rules.</p>
  </section>;
}
