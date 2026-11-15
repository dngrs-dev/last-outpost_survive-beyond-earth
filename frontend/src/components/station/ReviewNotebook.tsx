import { useState } from 'react';
import type { GameStateResponse } from '../../types/game';
import { planIssues, weeklyCosts, type WeeklyPlan } from '../../state/weeklyPlan';
import { NotebookDialog, PageTurns } from './NotebookDialog';
import { paragraphs, supplies } from './notebookContent';

export function ReviewNotebook({ state, plan, submitting, onSend, onClose }: {
  state: GameStateResponse; plan: WeeklyPlan; submitting: boolean; onSend: () => void; onClose: () => void;
}) {
  const [page, setPage] = useState(0);
  const incident = state.current_event?.choices.find(choice => choice.id === plan.event_choice_id);
  const names = Object.fromEntries(state.crew.map(person => [person.id, person.name]));
  const pages = [
    ...paragraphs('One week, one submission', `Known spending: ${supplies(weeklyCosts(state, plan))}. Generation and uncertain effects apply afterward. Power priority: ${plan.power_priority === 'life_support' ? 'Life support first' : 'Research recording first'}.`),
    ...paragraphs('Incident response', `${incident?.text || plan.event_choice_id}. ${[plan.selected_crew_id, ...plan.support_crew_ids].filter(Boolean).map(id => names[id!]).join(' + ') || 'No crew reserved'}.`),
    ...state.crew.filter(person => person.alive).flatMap(person => {
      const order = plan.assignments.find(order => order.crew_id === person.id);
      const patient = plan.assignments.find(order => order.patient_id === person.id && order.crew_id !== person.id);
      const job = [plan.selected_crew_id, ...plan.support_crew_ids].includes(person.id) ? 'Incident duty' : patient ? `Care with ${names[patient.crew_id]}` : state.assignment_options.find(option => option.id === order?.activity_id)?.text || 'Routine duties / recovery';
      return paragraphs(person.name, `${job}${order?.patient_id ? ` — patient ${names[order.patient_id]}` : ''}. Rations: ${plan.rations[person.id]?.food} food, ${plan.rations[person.id]?.water} water.`);
    }),
    ...plan.project_orders.flatMap(order => paragraphs('Project order', `${order.project_id}: ${order.action}. Applies as part of the whole week.`)),
  ];
  const issues = planIssues(state, plan);
  return <NotebookDialog title={`End week ${plan.week}?`} subtitle="ORDERS COMMITTED · CHECK CONSEQUENCES" onClose={onClose} controls={<>
    <PageTurns page={page} count={pages.length} onChange={setPage} />
    <button type="button" className="btn btn-primary" disabled={submitting || issues.length > 0 || !plan.rationsConfirmed} onClick={onSend}>{submitting ? 'Resolving week…' : `End week ${plan.week}`}</button>
  </>}><h2>{pages[page].title}</h2><p>{pages[page].text}</p><small>Science and survival are assessed separately. Failed attempts still use supplies; interrupted work is handled by the existing survival rules.</small>{issues.length > 0 && <p role="alert" className="folio-warning">{issues[0]}</p>}</NotebookDialog>;
}
