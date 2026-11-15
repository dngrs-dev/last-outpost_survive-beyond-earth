import { useState } from 'react';
import type { GameStateResponse, RationLevel, RationRequest } from '../../types/game';
import { planIssues, weeklyCosts, type WeeklyPlan } from '../../state/weeklyPlan';
import { NotebookDialog, PageTurns } from './NotebookDialog';
import { number } from './notebookContent';

export function ProvisionsNotebook({ state, plan, onCommit, onClose }: {
  state: GameStateResponse; plan: WeeklyPlan; onCommit: (next: WeeklyPlan) => void; onClose: () => void;
}) {
  const [rations, setRations] = useState(plan.rations);
  const [page, setPage] = useState(0);
  const living = state.crew.filter(person => person.alive);
  const person = living[page];
  const next = { ...plan, rations, rationsConfirmed: true };
  const costs = weeklyCosts(state, next);
  const issues = planIssues(state, next);
  const levels: RationLevel[] = ['normal', 'reduced', 'emergency'];
  const update = (resource: keyof RationRequest, level: RationLevel) => setRations(previous => ({ ...previous, [person.id]: { ...previous[person.id], [resource]: level } }));
  const ration = rations[person.id];
  const food = person.ration_outlook[ration.food];
  const water = person.ration_outlook[ration.water];
  const damage = (food?.food_damage || 0) + (water?.water_damage || 0);
  return <NotebookDialog title="Weekly provisions" subtitle={`WEEK ${plan.week} · FINAL ORDERS`} onClose={onClose} controls={<>
    <PageTurns page={page} count={living.length} onChange={setPage} />
    <button type="button" className="btn btn-primary" disabled={issues.length > 0} onClick={() => onCommit(next)}>Confirm week's rations</button>
  </>}>
    <h2>{person.name}</h2>
    <div className="folio-menu" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>{levels.map(level => <button type="button" key={level} onClick={() => setRations(Object.fromEntries(living.map(person => [person.id, { food: level, water: level }])))}>All {level}</button>)}</div>
    <div className="folio-grid">{(['food', 'water'] as const).map(resource => <label key={resource}>{resource === 'food' ? 'Food' : 'Water'}<select aria-label={`${resource === 'food' ? 'Food' : 'Water'} for ${person.name}`} value={ration[resource]} onChange={event => update(resource, event.target.value as RationLevel)}>{levels.map(level => <option key={level} value={level}>{level} ({person.ration_options[level]?.[resource] || 0}u)</option>)}</select></label>)}</div>
    <p className="folio-muted">Whole plan: {number(costs.food || 0)} food / {number(costs.water || 0)} water. Stock: {number(state.resources.food)} / {number(state.resources.water)}.</p>
    <small className={damage >= person.health ? 'folio-warning' : undefined} role={damage >= person.health ? 'alert' : undefined}>{damage >= person.health ? 'Selected rations could be fatal this week. ' : ''}If fully funded: nutrition deficit {food?.nutrition_deficit.toFixed(2)}, hydration deficit {water?.hydration_deficit.toFixed(2)}; {damage} ration-related condition loss.</small>
    {issues.length > 0 ? <p role="alert" className="folio-warning">{issues[0]} Try a different ration level.</p> : <small>Confirming closes this week's orders. Remaining crew do routine duties. Shortages can worsen the outlook.</small>}
  </NotebookDialog>;
}
