import { MedicalAssignmentFields, type MedicalTarget } from '../MedicalAssignmentFields';
import { RoleIcon } from '../RoleIcon';
import { formatSupplies } from './IncidentPlanner';
import type { ChoiceResponse, CrewResponse } from '../../types/game';

export function CrewPlanner({ crew, options, assignments, medicalTargets, incidentCrew, disabled, onAssignment, onTarget, onInspect }: {
  crew: CrewResponse[]; options: ChoiceResponse[]; assignments: Record<string, string>;
  medicalTargets: Record<string, MedicalTarget>; incidentCrew: string[]; disabled: boolean;
  onAssignment: (crewId: string, activityId: string) => void;
  onTarget: (crewId: string, target: MedicalTarget) => void; onInspect: (id: string) => void;
}) {
  const patients = Object.entries(assignments).filter(([, activity]) => activity === 'medical_care')
    .map(([id]) => medicalTargets[id]?.patient_id).filter(Boolean);
  return <section aria-label="Crew assignments">
    <h2>Give everyone a place in the plan</h2>
    <p>One main job per teammate this week. Routine duties are the default; medical care occupies both people.</p>
    {crew.filter(person => person.alive).map(person => {
      const activity = options.find(option => option.id === assignments[person.id]);
      const occupied = incidentCrew.includes(person.id) ? 'Incident response' : patients.includes(person.id) ? 'Receiving medical care' : '';
      const candidate = activity?.eligible_crew.find(option => option.crew_id === person.id);
      return <article className="station-inset" key={person.id}>
        <div className="station-person-heading"><span className="station-role"><RoleIcon role={person.role} /></span>
          <div><h3>{person.name}</h3><small>{person.role} · {occupied || (person.condition.can_work ? 'Available' : 'Rest or care only')}</small></div>
          <button type="button" className="station-text-button" onClick={() => onInspect(person.id)}>Inspect</button>
        </div>
        {person.condition.restrictions.map(reason => <p className="station-warning" key={reason}>{reason}</p>)}
        <label>Weekly assignment
          <select aria-label={`Assignment for ${person.name}`} disabled={disabled} value={assignments[person.id] || ''} onChange={e => onAssignment(person.id, e.target.value)}>
            <option value="">{occupied || (person.condition.can_work ? 'Routine duties' : 'Unassigned recovery')}</option>
            {options.map(option => {
              const eligible = option.eligible_crew.find(candidate => candidate.crew_id === person.id);
              return <option key={option.id} value={option.id} disabled={Boolean(occupied) || !eligible?.available}>
                {option.text} — {Math.round((eligible?.success_probability || 0) * 100)}%{!eligible?.available ? ` (${eligible?.unavailable_reasons.join(' ')})` : ''}
              </option>;
            })}
          </select>
        </label>
        {activity?.action_type === 'medical' && <MedicalAssignmentFields worker={person} self={activity.id === 'self_care'} crew={crew} value={medicalTargets[person.id]} disabled={disabled} onChange={target => onTarget(person.id, target)} />}
        {activity && <div className="station-work-detail">
          <p>{activity.description}</p>
          <p>Planned · 1 week · {Math.round((candidate?.success_probability || 0) * 100)}% success</p>
          <p>Costs: {formatSupplies(activity.costs)}. Equipment retained: {formatSupplies(activity.required_items)}.</p>
          {activity.objective_rewards.map(reward => <p key={reward.objective_id}>On success: +{reward.amount} toward {reward.title}, capped at target.</p>)}
        </div>}
      </article>;
    })}
    <details><summary>All assignment requirements and costs</summary>
      {options.map(option => <article key={option.id}><h3>{option.text}</h3><p>{option.description}</p><p>Costs: {formatSupplies(option.costs)}. Equipment retained: {formatSupplies(option.required_items)}. Workload: {option.workload}.</p></article>)}
    </details>
  </section>;
}
