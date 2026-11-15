import type { CrewResponse, EventResponse } from '../../types/game';

export function formatSupplies(values: Record<string, number>) {
  return Object.entries(values).filter(([, amount]) => amount !== 0)
    .map(([name, amount]) => `${Number(amount.toFixed(2))} ${name.replace(/_/g, ' ')}`).join(', ') || 'None';
}

export function IncidentPlanner({ event, crew, choiceId, leadId, supportIds, disabled, onChoice, onLead, onSupport }: {
  event: EventResponse | null; crew: CrewResponse[]; choiceId: string; leadId: string | null;
  supportIds: string[]; disabled: boolean; onChoice: (id: string) => void;
  onLead: (id: string) => void; onSupport: (ids: string[]) => void;
}) {
  if (!event) return <p>No incident is available. Reconnect to retrieve the current week.</p>;
  const selected = event.choices.find(choice => choice.id === choiceId);
  const supportNeeded = selected?.requires_crew ? Math.max(0, selected.minimum_crew - 1) : 0;
  const responseControls = selected && <div className="station-inset">
      <h3>Your response</h3>
      {selected.requires_crew ? <label>Response lead
        <select aria-label="Response lead" disabled={disabled} value={leadId || ''} onChange={e => onLead(e.target.value)}>
          <option value="" disabled>Choose a teammate</option>
          {selected.eligible_crew.map(candidate => <option key={candidate.crew_id} value={candidate.crew_id} disabled={!candidate.available}>
            {crew.find(person => person.id === candidate.crew_id)?.name || candidate.crew_id} — {candidate.available ? `${Math.round(candidate.success_probability * 100)}% success` : candidate.unavailable_reasons.join(' ')}
          </option>)}
        </select>
      </label> : <p>Success probability: {Math.round((selected.success_probability ?? selected.success_chance) * 100)}%.</p>}
      {supportNeeded > 0 && <fieldset disabled={disabled}>
        <legend>Incident support crew: {supportIds.length} / {supportNeeded}</legend>
        {crew.filter(person => person.alive && person.id !== leadId).map(person => <label className="station-check" key={person.id}>
          <input type="checkbox" checked={supportIds.includes(person.id)}
            disabled={!selected.support_candidates.some(candidate => candidate.crew_id === person.id && candidate.available) || (!supportIds.includes(person.id) && supportIds.length >= supportNeeded)}
            onChange={e => onSupport(e.target.checked ? [...supportIds, person.id] : supportIds.filter(id => id !== person.id))} />{person.name}
        </label>)}
      </fieldset>}
      <details><summary>Requirements and possible outcomes</summary>
        <p>Equipment retained: {formatSupplies(selected.required_items)}. Required role: {selected.required_role || 'Any eligible role'}. Workload: {selected.workload}.</p>
        <p>On success: resource changes {formatSupplies(selected.success_effects.resources)}; condition change {selected.success_effects.crew_health}.</p>
        <p>On failure: resource changes {formatSupplies(selected.failure_effects.resources)}; condition change {selected.failure_effects.crew_health}.</p>
        {selected.objective_rewards.map(reward => <p key={reward.objective_id}>On success: +{reward.amount} toward {reward.title}, capped at the target.</p>)}
      </details>
    </div>;
  return <section aria-label="Incident response">
    <h2>{event.title}</h2><p>{event.description}</p>
    <details><summary>Discovery and science context</summary>
      <p>{event.science_context}</p>
      <p>Discovery effects have already been applied to the station. They will not be applied again by choosing a response.</p>
      <a href={event.source_url} target="_blank" rel="noreferrer">Science reference</a>
      <p>Scenario effects, costs, and probabilities are fictional game values.</p>
    </details>
    <div className="station-choices">
      {event.choices.map(choice => <div key={choice.id} className={`station-choice ${choice.id === choiceId ? 'station-choice-selected' : ''}`}>
        <button type="button" className="station-choice-button" aria-pressed={choice.id === choiceId}
          disabled={disabled || !choice.available} onClick={() => onChoice(choice.id)}>{choice.text}</button>
        <p>{choice.description}</p>
        <small>Costs: {formatSupplies(choice.costs)} · {choice.requires_crew ? `${Math.max(1, choice.minimum_crew)} crew` : 'No crew assignment'}</small>
        {!choice.available && <p className="station-warning">{choice.unavailable_reasons.join(' ')}</p>}
        {choice.id === choiceId && responseControls}
      </div>)}
    </div>

  </section>;
}
