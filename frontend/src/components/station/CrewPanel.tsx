import { useState } from 'react';
import type { CrewResponse, GameStateResponse, MedicalKind } from '../../types/game';
import { bookedCrew, planIssues, type CrewOrder, type WeeklyPlan } from '../../state/weeklyPlan';
import { GameDialog } from './GameDialog';
import { Chance, CrewPick, Outcome, Portrait, Resources, label } from './Visuals';
import { MealControls } from './Meals';

const names: Record<string, [string, string]> = {
  crew_rest: ['Rest', 'Recover with food, water and clean air.'],
  clean_array: ['Clean solar panels', 'Remove dust to make more power.'],
  install_regulator: ['Repair oxygen maker', 'Help the station make oxygen.'],
  service_water_recovery: ['Repair water recycler', 'Recover more clean water.'],
  service_co2_scrubber: ['Clean air filter', 'Remove harmful carbon dioxide.'],
  research_geology: ['Collect moon rocks', 'Go outside to study a sample.'],
  research_seismic: ['Set up quake sensors', 'Start a moonquake research project.'],
  research_instrument: ['Restore science tools', 'Repair an instrument for science.'],
  medical_care: ['Treat a teammate', 'Help an injured or ill teammate recover.'],
  self_care: ['Treat yourself', 'Use medicine to support your recovery.'],
};
export function taskName(id: string, fallback: string) { return names[id]?.[0] || (id.startsWith('project:') ? fallback.replace('Seismic project: ', '') : fallback); }
function shortReason(reason: string) {
  if (reason.includes('already at full condition')) return 'Already repaired';
  if (reason.includes('light duties only')) return 'Light work only';
  if (reason.includes('EVA unavailable')) return 'No outside work';
  if (reason.startsWith('Requires at least')) return 'Needs a fit teammate';
  if (reason.startsWith('Requires ')) return reason.replace('Requires ', 'Need ').replace(/; available.*| \(not consumed\)\.?/g, '').replace(/_/g, ' ');
  return reason;
}
export function CrewPanel({ person, state, plan, onCommit, onClose, onUpdate }: {
  person: CrewResponse; state: GameStateResponse; plan: WeeklyPlan; onCommit: (next: WeeklyPlan) => void; onClose: () => void; onUpdate: (next: WeeklyPlan) => void;
}) {
  const [group, setGroup] = useState('For you');
  const [jobId, setJob] = useState('');
  const [target, setTarget] = useState('');
  const occupied = bookedCrew(plan).includes(person.id);
  const canOrder = person.alive && !occupied && plan.incidentConfirmed && !plan.pending;
  const selected = state.assignment_options.find(option => option.id === jobId);
  const groups: Record<string, string> = { Explore: 'research', Fix: 'maintenance', Care: 'medical', Rest: 'rest' };
  const recommended = [...state.assignment_options].sort((a, b) => {
    const score = (option: typeof a) => {
      const candidate = option.eligible_crew.find(candidate => candidate.crew_id === person.id);
      const overBudget = planIssues(state, { ...plan, assignments: [...plan.assignments, { crew_id: person.id, activity_id: option.id }] }, false).some(issue => issue.startsWith('Combined plan'));
      return (candidate?.available && !overBudget ? 10 : 0) + (option.action_type === (person.role === 'medic' ? 'medical' : person.role === 'scientist' ? 'research' : 'maintenance') ? 3 : 0) + (candidate?.success_probability || 0);
    }; return score(b) - score(a);
  }).slice(0, 2);
  const jobs = group === 'For you' ? recommended : state.assignment_options.filter(option => option.action_type === groups[group]);
  const patients = state.crew.filter(crew => crew.alive && (selected?.id === 'self_care' ? crew.id === person.id : crew.id !== person.id && !bookedCrew(plan).includes(crew.id)))
    .flatMap(crew => crew.medical_conditions.map(condition => ({ crew, condition, value: `${crew.id}:${condition.kind}` })));
  const patient = patients.find(patient => patient.value === target);
  const order: CrewOrder | undefined = selected ? { crew_id: person.id, activity_id: selected.id, ...(selected.action_type === 'medical' && patient ? { patient_id: patient.crew.id, condition_id: patient.condition.kind as MedicalKind } : {}) } : undefined;
  const next = { ...plan, assignments: order ? [...plan.assignments, order] : plan.assignments };
  const issues = selected ? planIssues(state, next, false) : [];
  const existing = plan.assignments.find(order => order.crew_id === person.id || order.patient_id === person.id);
  const bookedLabel = plan.selected_crew_id === person.id || plan.support_crew_ids.includes(person.id) ? 'On incident duty' : existing?.patient_id === person.id && existing.crew_id !== person.id ? 'Receiving care' : existing ? taskName(existing.activity_id, state.assignment_options.find(option => option.id === existing.activity_id)?.text || 'Working') : 'Routine duties';
  return <GameDialog title={person.name} subtitle={person.role.toUpperCase()} onClose={onClose} controls={canOrder ? <><span className="crew-confirm-note">{selected ? issues[0] || 'One job for this week' : 'Pick a job, or keep routine duties'}</span><button type="button" className="btn btn-primary" disabled={!selected || issues.length > 0} onClick={() => { if (selected && !planIssues(state, next, false).length) onCommit(next); }}>Confirm assignment</button></> : undefined}>
    <div className="crew-summary"><div className="crew-face"><Portrait person={person} /><small aria-label={`Condition ${person.health} out of 100`}>♥ {person.health}</small></div><div><strong>{!person.alive ? 'Lost during the mission' : occupied ? bookedLabel : person.specialty}</strong><p>{person.medical_conditions.map(condition => `${condition.urgent ? '⚠ ' : ''}${label(condition.kind)}`).join(' · ') || (person.condition.status === 'fit' ? 'Ready for work' : person.condition.status)}</p>{person.condition.restrictions.length > 0 && <small title={person.condition.restrictions.join(' ')}>{person.condition.restrictions.map(shortReason).join(' · ')}</small>}</div></div>
    {person.alive && <MealControls person={person} plan={plan} onUpdate={onUpdate} />}
    {canOrder ? <>
      <div className="job-tabs" role="group" aria-label="Assignment types">{['For you', 'Explore', 'Fix', 'Care', 'Rest'].map(name => <button key={name} type="button" aria-pressed={group === name} onClick={() => { setGroup(name); setJob(''); setTarget(''); }}>{name}</button>)}</div>
      <div className="action-grid crew-jobs" role="group" aria-label="Crew assignments">{jobs.map(job => {
        const candidate = job.eligible_crew.find(candidate => candidate.crew_id === person.id);
        const proposed = { ...plan, assignments: [...plan.assignments, { crew_id: person.id, activity_id: job.id }] };
        const budgetIssue = planIssues(state, proposed, false).find(issue => issue.startsWith('Combined plan') || issue.includes('project'));
        const available = candidate?.available && !budgetIssue;
        return <button type="button" key={job.id} aria-label={taskName(job.id, job.text)} aria-pressed={jobId === job.id} aria-disabled={!available} className={`action-card ${jobId === job.id ? 'selected' : ''} ${!available ? 'unavailable' : ''}`} onClick={() => { setJob(job.id); setTarget(''); }}>
          <h2>{taskName(job.id, job.text)}</h2>{group === 'For you' && <p>{names[job.id]?.[1] || job.description}</p>}
          <div className="panel-row"><Resources values={job.costs} /><Chance value={candidate?.success_probability || 0} /></div>
          {!available && <small className="job-reason" title={budgetIssue || candidate?.unavailable_reasons.join(' ')}>{budgetIssue ? `Low ${budgetIssue.replace('Combined plan exceeds available ', '').replace('.', '')}` : shortReason(candidate?.unavailable_reasons[0] || 'Unavailable')}</small>}
        </button>;
      })}</div>
      {!jobs.length && <p>No work of this type this week.</p>}
      {selected && <div className="selected-job">
        {selected.eligible_crew.find(candidate => candidate.crew_id === person.id)?.unavailable_reasons.length ? <p className="job-explanation">{[...new Set(selected.eligible_crew.find(candidate => candidate.crew_id === person.id)!.unavailable_reasons.map(shortReason))].join(' · ')}</p> : group !== 'For you' && <p className="job-description">{names[selected.id]?.[1] || selected.description}</p>}
        <Resources values={selected.required_items} retained />
        <div className="response-outcomes"><span className="good-result">✓ <Outcome effects={selected.success_effects} rewards={selected.objective_rewards.reduce((sum, reward) => sum + reward.amount, 0)} /></span><span className="bad-result">⚠ <Outcome effects={selected.failure_effects} /></span></div>
        {selected.action_type === 'medical' && <div className="crew-picks" aria-label="Choose patient">{patients.map(entry => <CrewPick key={entry.value} person={entry.crew} accessibleName={`${entry.crew.name}: ${entry.condition.title}`} selected={target === entry.value} detail={label(entry.condition.kind)} onClick={() => setTarget(entry.value)} />)}{!patients.length && <small>No free teammate needs this treatment.</small>}</div>}
      </div>}
    </> : <small>{!person.alive ? 'This astronaut cannot work.' : plan.pending ? 'Waiting for the week result.' : occupied ? 'Already assigned this week.' : 'Choose the incident response first.'}</small>}
  </GameDialog>;
}
