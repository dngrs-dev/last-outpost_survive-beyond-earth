import { useState } from 'react';
import type { GameStateResponse } from '../../types/game';
import { planIssues, type WeeklyPlan } from '../../state/weeklyPlan';
import { NotebookDialog, PageTurns, textPages } from './NotebookDialog';
import { effectsText, paragraphs, supplies } from './notebookContent';

export function IncidentNotebook({ state, plan, onCommit, onClose }: {
  state: GameStateResponse; plan: WeeklyPlan; onCommit: (next: WeeklyPlan) => void; onClose: () => void;
}) {
  const event = state.current_event;
  const [stage, setStage] = useState<'brief' | 'response' | 'crew' | 'confirm'>('brief');
  const [page, setPage] = useState(0);
  const [choiceIndex, setChoiceIndex] = useState(0);
  const [lead, setLead] = useState('');
  const [support, setSupport] = useState<string[]>([]);
  const [error, setError] = useState('');
  if (!event) return <NotebookDialog title="Incident unavailable" onClose={onClose}><p>Reconnect to retrieve this week's incident.</p></NotebookDialog>;
  const choice = event.choices[choiceIndex];
  const requiredSupport = choice.requires_crew ? Math.max(0, choice.minimum_crew - 1) : 0;
  const candidate = choice.eligible_crew.find(person => person.crew_id === lead);
  const probability = choice.requires_crew ? candidate?.success_probability : choice.success_probability ?? choice.success_chance;
  const ready = choice.available && (!choice.requires_crew || Boolean(candidate?.available)) && support.filter(Boolean).length === requiredSupport;
  const briefing = textPages(event.description);
  const confirmation = [
    { title: 'This response is final for the week', text: `Costs: ${supplies(choice.costs)}. ${choice.requires_crew ? `${Math.max(1, choice.minimum_crew)} crew booked. ` : ''}Success probability: ${Math.round((probability || 0) * 100)}%. Costs are spent on an attempted response even if it fails.` },
    ...paragraphs('If it succeeds', effectsText(choice.success_effects)),
    ...paragraphs('If it fails', effectsText(choice.failure_effects)),
    ...paragraphs('Response details', choice.description),
    ...paragraphs('Required equipment', `Retained equipment: ${supplies(choice.required_items)}. Required role: ${choice.required_role || 'Any eligible role'}. Workload: ${choice.workload}.`),
    ...choice.objective_rewards.flatMap(reward => paragraphs('Possible science credit', `${reward.title}: +${reward.amount} on success, capped at the mission target.`)),
    ...paragraphs('Science behind the incident', event.science_context, event.source_url),
  ];
  const go = (next: typeof stage) => { setStage(next); setPage(0); setError(''); };
  const commit = () => {
    const next: WeeklyPlan = { ...plan, incidentConfirmed: true, event_choice_id: choice.id, selected_crew_id: choice.requires_crew ? lead : null, support_crew_ids: choice.requires_crew ? support : [] };
    const issues = planIssues(state, next, false);
    if (issues.length) setError(issues[0]); else onCommit(next);
  };
  return <NotebookDialog title={stage === 'brief' ? event.title : stage === 'response' ? 'Choose a response' : stage === 'crew' ? 'Who will respond?' : 'Commit the response'}
    subtitle={`WEEK ${state.current_week} · INCIDENT`} onClose={onClose} controls={<>
      {stage === 'brief' ? <PageTurns page={page} count={briefing.length} onChange={setPage} /> : stage === 'response' ? <PageTurns page={choiceIndex} count={event.choices.length} onChange={setChoiceIndex} /> : stage === 'confirm' ? <PageTurns page={page} count={confirmation.length} onChange={setPage} /> : <button type="button" className="btn btn-secondary" onClick={() => go('response')}>Back</button>}
      <button type="button" className="btn btn-primary" disabled={stage !== 'brief' && (!choice.available || (stage !== 'response' && !ready))}
        onClick={() => {
          if (stage === 'brief') go('response');
          else if (stage === 'response') {
            const best = [...choice.eligible_crew].filter(person => person.available).sort((a, b) => b.success_probability - a.success_probability)[0];
            setLead(best?.crew_id || ''); setSupport([]); go(choice.requires_crew ? 'crew' : 'confirm');
          } else if (stage === 'crew') go('confirm');
          else commit();
        }}>{stage === 'brief' ? 'See responses' : stage === 'response' ? 'Choose this response' : stage === 'crew' ? 'See consequences' : 'Confirm response'}</button>
    </>}>
    {stage === 'brief' && <><p>{briefing[page]}</p><small>Discovery effects have already happened. The response resolves at the end of the week.</small>{state.current_week === 1 && <p className="folio-muted">Choose a response, then click free astronauts in the station. Next Week handles provisions.</p>}</>}
    {stage === 'response' && <div className="folio-card"><h2>{choice.text}</h2><p>{textPages(choice.description, 170)[0]}</p><small>Costs: {supplies(choice.costs)} · {choice.requires_crew ? `${Math.max(1, choice.minimum_crew)} crew` : 'No crew booked'}</small>{!choice.available && <p className="folio-warning">{choice.unavailable_reasons.join(' ')}</p>}</div>}
    {stage === 'crew' && <>
      <label>Response lead<select aria-label="Response lead" value={lead} onChange={event => { setLead(event.target.value); setSupport([]); }}>
        <option value="" disabled>Choose a teammate</option>{choice.eligible_crew.map(candidate => <option key={candidate.crew_id} value={candidate.crew_id} disabled={!candidate.available}>{state.crew.find(person => person.id === candidate.crew_id)?.name || candidate.crew_id} — {candidate.available ? `${Math.round(candidate.success_probability * 100)}%` : candidate.unavailable_reasons.join(' ')}</option>)}
      </select></label>
      {Array.from({ length: requiredSupport }, (_, index) => <label key={index}>Support astronaut {index + 1}<select aria-label={`Support astronaut ${index + 1}`} value={support[index] || ''} onChange={event => { const next = [...support]; next[index] = event.target.value; setSupport(next); }}>
        <option value="">Choose support</option>{choice.support_candidates.filter(person => person.crew_id !== lead).map(candidate => <option key={candidate.crew_id} value={candidate.crew_id} disabled={!candidate.available || support.some((id, slot) => slot !== index && id === candidate.crew_id)}>{state.crew.find(person => person.id === candidate.crew_id)?.name || candidate.crew_id}{!candidate.available ? ` — ${candidate.unavailable_reasons.join(' ')}` : ''}</option>)}
      </select></label>)}
      <p className="folio-muted">These crew leave the common room for incident duty. They cannot take another job this week.</p>
    </>}
    {stage === 'confirm' && <><div className="folio-card"><h2>{confirmation[page].title}</h2><p>{confirmation[page].text}</p>{confirmation[page].link && <a href={confirmation[page].link} target="_blank" rel="noreferrer">Science reference</a>}</div><small>Confirming locks the response and its crew. Supplies and outcomes change only after End Week.</small></>}
    {error && <p role="alert" className="folio-warning">{error}</p>}
  </NotebookDialog>;
}
