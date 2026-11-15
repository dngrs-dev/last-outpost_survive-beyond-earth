import { useState } from 'react';
import type { GameStateResponse } from '../../types/game';
import { planIssues, type WeeklyPlan } from '../../state/weeklyPlan';
import { GameDialog } from './NotebookDialog';
import { Chance, CrewPick, Outcome, Resources } from './Visuals';

export function IncidentNotebook({ state, plan, onCommit, onClose }: {
  state: GameStateResponse; plan: WeeklyPlan; onCommit: (next: WeeklyPlan) => void; onClose: () => void;
}) {
  const [choiceId, setChoice] = useState('');
  const [lead, setLead] = useState('');
  const [support, setSupport] = useState<string[]>([]);
  const event = state.current_event;
  if (!event) return <GameDialog title="Incident unavailable" size="small" onClose={onClose}><p>Reconnect to reach your station.</p></GameDialog>;
  const choice = event.choices.find(choice => choice.id === choiceId);
  const next = { ...plan, incidentConfirmed: true, event_choice_id: choiceId, selected_crew_id: choice?.requires_crew ? lead || null : null, support_crew_ids: choice?.requires_crew ? support : [] };
  const issues = choice ? planIssues(state, next, false) : [];
  const supportsNeeded = choice?.requires_crew ? Math.max(0, choice.minimum_crew - 1) : 0;
  const brief = event.id === 'medical_emergency' ? 'Dust escaped from an air filter. Everyone has sore lungs and needs recovery.' : event.description;
  return <GameDialog title={event.title} subtitle={`WEEK ${state.current_week} · INCIDENT`} size="large" onClose={onClose} controls={
    <div className="incident-controls"><span>{choice ? choice.requires_crew && !lead ? 'Choose a teammate' : supportsNeeded > support.length ? `Choose ${supportsNeeded - support.length} helper` : issues[0] || 'Ready?' : 'Choose a response'}</span><button type="button" className="btn btn-primary" disabled={!choice || issues.length > 0} onClick={() => { if (choice && !planIssues(state, next, false).length) onCommit(next); }}>Confirm response</button></div>
  }>
    <p className="incident-brief">{brief}</p>
    <div className="incident-options" aria-label="Incident responses">
      {event.choices.map(option => {
        const selected = choiceId === option.id;
        const candidate = selected ? option.eligible_crew.find(candidate => candidate.crew_id === lead) : undefined;
        const chance = option.requires_crew ? candidate?.success_probability : option.success_probability ?? option.success_chance;
        return <button type="button" className={`action-card ${selected ? 'selected' : ''} ${!option.available ? 'unavailable' : ''}`} key={option.id} aria-pressed={selected} aria-label={option.text} onClick={() => { setChoice(option.id); setLead(''); setSupport([]); }}>
          <h2>{option.text}</h2>
          <div className="panel-row"><Resources values={option.costs} />{chance !== undefined && <Chance value={chance} />}{option.requires_crew && <span className="crew-count" aria-label={`${option.minimum_crew} crew required`}>♟ {option.minimum_crew}</span>}</div>
          <Resources values={option.required_items} retained />
          <div className="response-outcomes"><span className="good-result">✓ <Outcome effects={option.success_effects} rewards={option.objective_rewards.reduce((sum, reward) => sum + reward.amount, 0)} /></span><span className="bad-result">⚠ <Outcome effects={option.failure_effects} /></span></div>
          {!option.available && <small className="unavailable-reason">{option.unavailable_reasons.join(' ')}</small>}
        </button>;
      })}
    </div>
    {choice?.requires_crew && <div className="incident-team">
      <strong>{lead ? `Helpers ${support.length}/${supportsNeeded}` : 'Who will go?'}</strong>
      <div className="crew-picks">{state.crew.filter(person => person.alive).map(person => {
        const candidate = choice.eligible_crew.find(candidate => candidate.crew_id === person.id);
        const helper = choice.support_candidates.find(candidate => candidate.crew_id === person.id);
        const selected = lead === person.id || support.includes(person.id);
        return <CrewPick key={person.id} person={person} selected={selected} disabled={!selected && (lead ? !helper?.available || support.length >= supportsNeeded : !candidate?.available)} detail={lead === person.id ? 'Lead' : support.includes(person.id) ? 'Helper' : !lead && candidate?.available ? `${Math.round(candidate.success_probability * 100)}%` : undefined} onClick={() => {
          if (!lead || lead === person.id) { setLead(lead === person.id ? '' : person.id); setSupport([]); }
          else setSupport(support.includes(person.id) ? support.filter(id => id !== person.id) : [...support, person.id]);
        }} />;
      })}</div>
    </div>}
  </GameDialog>;
}
