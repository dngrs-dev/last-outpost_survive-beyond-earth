import { useState } from 'react';
import type { CrewResponse, GameStateResponse, MedicalKind } from '../../types/game';
import { bookedCrew, planIssues, type CrewOrder, type WeeklyPlan } from '../../state/weeklyPlan';
import { NotebookDialog, PageTurns } from './NotebookDialog';
import { effectsText, paragraphs, supplies } from './notebookContent';

type Category = 'Care' | 'Science' | 'Systems' | 'Rest';
export function CrewNotebook({ person, state, plan, onCommit, onClose }: {
  person: CrewResponse; state: GameStateResponse; plan: WeeklyPlan; onCommit: (next: WeeklyPlan) => void; onClose: () => void;
}) {
  const [stage, setStage] = useState<'overview' | 'details' | 'menu' | 'job' | 'patient' | 'confirm'>('overview');
  const [category, setCategory] = useState<Category>('Rest');
  const [index, setIndex] = useState(0);
  const [page, setPage] = useState(0);
  const [target, setTarget] = useState('');
  const [error, setError] = useState('');
  const occupied = bookedCrew(plan).includes(person.id);
  const canOrder = person.alive && !occupied && !plan.rationsConfirmed && plan.incidentConfirmed && !plan.pending;
  const jobs = state.assignment_options.filter(option => category === 'Care' ? option.action_type === 'medical' : category === 'Science' ? option.action_type === 'research' : category === 'Systems' ? option.action_type === 'maintenance' : option.action_type === 'rest');
  const entries = category === 'Rest' ? [null, ...jobs] : jobs;
  const job = entries[index] || null;
  const candidate = job?.eligible_crew.find(candidate => candidate.crew_id === person.id);
  const existing = plan.assignments.find(order => order.crew_id === person.id || order.patient_id === person.id);
  const assigned = plan.selected_crew_id === person.id || plan.support_crew_ids.includes(person.id) ? 'Incident duty — away from the common room' : existing?.patient_id === person.id && existing.crew_id !== person.id ? `Receiving care from ${state.crew.find(crew => crew.id === existing.crew_id)?.name}` : existing ? state.assignment_options.find(option => option.id === existing.activity_id)?.text : plan.routine_crew_ids.includes(person.id) || plan.rationsConfirmed ? 'Routine duties / recovery confirmed' : 'No main assignment yet';
  const details = [
    ...paragraphs('Current condition', `Overall: ${person.condition.status}, ${person.health}/100. Nutrition: ${person.condition.nutrition_status}. Hydration: ${person.condition.hydration_status}. ${person.condition.restrictions.join(' ')}`),
    ...person.medical_conditions.flatMap(condition => paragraphs(condition.title, `${condition.urgent ? 'Urgent: needs stabilization. ' : ''}${condition.remaining} recovery points remain. Earliest medic-supported recovery: ${condition.medic_weeks} weeks with full provisions and safe air.`, condition.source_url)),
    ...paragraphs('Strengths & tradeoffs', `${person.specialty}. ${person.positive_trait}. ${person.negative_trait}.`),
    ...paragraphs('Deficits & recovery', `Nutrition deficit ${person.nutrition_deficit.toFixed(2)}. Hydration deficit ${person.hydration_deficit.toFixed(2)}. Full actual provisions and safe air support gradual recovery; current restrictions still apply this week.`),
  ];
  const patients = state.crew.filter(crew => crew.alive && (job?.id === 'self_care' ? crew.id === person.id : crew.id !== person.id && !bookedCrew(plan).includes(crew.id)))
    .flatMap(crew => crew.medical_conditions.map(condition => ({ value: `${crew.id}:${condition.kind}`, label: `${crew.name}: ${condition.title}`, patient_id: crew.id, condition_id: condition.kind })));
  const selectedTarget = patients.find(patient => patient.value === target);
  const nextPlan = (): WeeklyPlan => {
    if (!job) return { ...plan, routine_crew_ids: [...plan.routine_crew_ids, person.id] };
    const order: CrewOrder = { crew_id: person.id, activity_id: job.id };
    if (job.action_type === 'medical' && selectedTarget) { order.patient_id = selectedTarget.patient_id; order.condition_id = selectedTarget.condition_id as MedicalKind; }
    return { ...plan, assignments: [...plan.assignments, order] };
  };
  const issues = stage === 'job' || stage === 'patient' || stage === 'confirm' ? planIssues(state, nextPlan(), false) : [];
  const available = canOrder && entries.length > 0 && (!job || Boolean(candidate?.available));
  const confirmations = [
    ...paragraphs(job?.text || 'Routine duties', job?.description || 'This astronaut will help with ordinary station duties. No additional action costs or science rewards.'),
    ...paragraphs('Costs and chances', `Costs: ${supplies(job?.costs || {})}. ${job ? `Success: ${Math.round((candidate?.success_probability || 0) * 100)}%. Equipment retained: ${supplies(job.required_items)}.` : 'No supplies charged.'}`),
    ...(job ? [...paragraphs('If it succeeds', effectsText(job.success_effects)), ...paragraphs('If it fails', effectsText(job.failure_effects))] : []),
    ...(job?.objective_rewards || []).flatMap(reward => paragraphs('Possible science credit', `${reward.title}: +${reward.amount} on success, capped at target. Seismic credit is awarded only after final analysis.`)),
  ];
  const go = (next: typeof stage) => { setStage(next); setPage(0); setError(''); };
  const commit = () => {
    if (!available || issues.length) { setError(issues[0] || 'This astronaut is not available.'); return; }
    onCommit(nextPlan());
  };
  return <NotebookDialog title={person.name} subtitle={`${person.role.toUpperCase()} · WEEK ${plan.week}`} onClose={onClose} controls={<>
    {stage === 'overview' ? <button type="button" className="btn btn-secondary" onClick={() => go('details')}>Condition details</button>
      : stage === 'details' ? <PageTurns page={page} count={details.length} onChange={setPage} />
      : stage === 'job' ? <PageTurns page={index} count={entries.length} onChange={value => { setIndex(value); setTarget(''); }} />
      : stage === 'confirm' ? <PageTurns page={page} count={confirmations.length} onChange={setPage} />
      : <button type="button" className="btn btn-secondary" onClick={() => go(stage === 'patient' ? 'job' : 'overview')}>Back</button>}
    {stage === 'overview' && canOrder ? <button type="button" className="btn btn-primary" onClick={() => go('menu')}>Choose assignment</button>
      : stage === 'job' ? <button type="button" className="btn btn-primary" disabled={!available || (job?.action_type !== 'medical' && issues.length > 0)} onClick={() => { setTarget(patients[0]?.value || ''); go(job?.action_type === 'medical' ? 'patient' : 'confirm'); }}>Choose this task</button>
      : stage === 'patient' ? <button type="button" className="btn btn-primary" disabled={!selectedTarget || issues.length > 0} onClick={() => go('confirm')}>Review care</button>
      : stage === 'confirm' ? <button type="button" className="btn btn-primary" disabled={!available || issues.length > 0} onClick={commit}>Confirm assignment</button>
      : <button type="button" className="btn btn-primary" onClick={stage === 'details' ? () => go('overview') : onClose}>{stage === 'details' ? 'Crew overview' : 'Return to station'}</button>}
  </>}>
    {stage === 'overview' && <><div className="folio-card"><div className="folio-row"><span>Overall condition</span><strong>{person.health}/100 · {person.condition.status}</strong></div><div className="folio-row"><span>Food</span><strong>{person.condition.nutrition_status}</strong></div><div className="folio-row"><span>Water</span><strong>{person.condition.hydration_status}</strong></div><small>{assigned}</small></div>
      <p className="folio-muted">{!person.alive ? 'This astronaut did not survive.' : occupied ? 'Booked for this week. Their assignment cannot be changed.' : !plan.incidentConfirmed ? 'Confirm the incident response before giving crew orders.' : plan.rationsConfirmed ? 'Orders are closed for this week.' : 'Choose one main job, or leave them on routine duties.'}</p></>}
    {stage === 'details' && <><h2>{details[page].title}</h2><p>{details[page].text}</p>{details[page].link && <a href={details[page].link} target="_blank" rel="noreferrer">Research context</a>}</>}
    {stage === 'menu' && <><h2>One main job this week</h2><div className="folio-menu">{(['Care', 'Science', 'Systems', 'Rest'] as Category[]).map(name => <button key={name} type="button" onClick={() => { setCategory(name); setIndex(0); go('job'); }}>{name}</button>)}</div><small>Medical care books the caregiver and patient together. Confirmed choices cannot be changed this week.</small></>}
    {stage === 'job' && <><div className="folio-card"><h2>{job?.text || (entries.length ? 'Routine duties' : 'No tasks in this category')}</h2><p>{confirmations[0].text}</p><small>Costs: {supplies(job?.costs || {})}{job ? ` · ${Math.round((candidate?.success_probability || 0) * 100)}% success` : ''}</small></div>
      {job && !candidate?.available && <p className="folio-warning">{candidate?.unavailable_reasons.join(' ') || 'This task is unavailable.'}</p>}
      {issues.length > 0 && job?.action_type !== 'medical' && candidate?.available && <p className="folio-warning">{issues[0]}</p>}
      <button type="button" className="btn btn-secondary" onClick={() => go('menu')}>Other task types</button></>}
    {stage === 'patient' && <><h2>Select a patient</h2><label>Patient and condition<select aria-label={`Patient and condition for ${person.name}`} value={target} onChange={event => setTarget(event.target.value)}><option value="">Choose a condition</option>{patients.map(patient => <option key={patient.value} value={patient.value}>{patient.label}</option>)}</select></label><p>Both people are booked for the week. Care uses medicine; supported recovery needs full food, water, and safe air.</p>{!patients.length ? <p className="folio-warning">No unbooked patient has an active condition.</p> : selectedTarget && issues.length > 0 && <p role="alert" className="folio-warning">{issues[0]}</p>}</>}
    {stage === 'confirm' && <><h2>{confirmations[page].title}</h2><p>{confirmations[page].text}</p><small>{selectedTarget ? `Patient: ${selectedTarget.label}. ` : ''}Confirming locks this job for the week. It resolves at End Week.</small></>}
    {error && <p role="alert" className="folio-warning">{error}</p>}
  </NotebookDialog>;
}
