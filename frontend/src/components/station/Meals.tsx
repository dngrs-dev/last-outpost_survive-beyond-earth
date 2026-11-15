import type { CrewResponse, GameStateResponse, RationLevel } from '../../types/game';
import { chooseMeal, feedAll, planIssues, weeklyCosts, type WeeklyPlan } from '../../state/weeklyPlan';
import { GameDialog } from './GameDialog';
import { Portrait, ResourceIcon, Resources } from './Visuals';

const levels: { id: RationLevel; title: string; fill: string }[] = [{ id: 'normal', title: 'Full', fill: '100%' }, { id: 'reduced', title: 'Smaller', fill: '70%' }, { id: 'emergency', title: 'Emergency', fill: '40%' }];
export function MealControls({ person, plan, onUpdate }: { person: CrewResponse; plan: WeeklyPlan; onUpdate: (next: WeeklyPlan) => void }) {
  const ration = plan.rations[person.id];
  if (!ration || !person.alive) return null;
  const food = person.ration_outlook[ration.food], water = person.ration_outlook[ration.water];
  const damage = (food?.food_damage || 0) + (water?.water_damage || 0);
  const picked = plan.meal_choices[person.id];
  return <div className="meal-controls" aria-label={`Meals for ${person.name}`}>
    {(['food', 'water'] as const).map(resource => <div className="meal-line" role="group" aria-label={`${resource} for ${person.name}`} key={resource}>
      <span className="meal-symbol" title={resource}><ResourceIcon resource={resource} /></span>
      {levels.map(level => <button type="button" key={level.id} disabled={Boolean(plan.pending)} aria-label={`${level.title} ${resource} for ${person.name}`} aria-pressed={Boolean(picked?.[resource] && ration[resource] === level.id)} title={`${level.fill} · ${person.ration_options[level.id]?.[resource] || 0} units`} onClick={() => onUpdate(chooseMeal(plan, person.id, resource, level.id))}><span className="portion" aria-hidden="true"><i style={{ width: level.fill }} /></span><span>{level.title}</span></button>)}
      <span className="meal-check" aria-label={picked?.[resource] ? `${resource} chosen` : `${resource} not chosen`}>{picked?.[resource] ? '✓' : '?'}</span>
    </div>)}
    {picked?.food && picked.water && (ration.food !== 'normal' || ration.water !== 'normal') && <small className="meal-risk">{damage >= person.health ? '⚠ These rations could be fatal.' : damage > 0 ? `⚠ Short rations: −${damage} condition if funded.` : 'Smaller meals can build up hunger or thirst.'}</small>}
  </div>;
}

export function MealsBoard({ state, plan, onUpdate, onClose, onStores }: { state: GameStateResponse; plan: WeeklyPlan; onUpdate: (next: WeeklyPlan) => void; onClose: () => void; onStores: () => void }) {
  const budget = planIssues(state, plan).find(issue => issue.startsWith('Combined plan'));
  const costs = weeklyCosts(state, plan);
  return <GameDialog title="Food & water" subtitle={`WEEK ${plan.week}`} onClose={onClose} controls={<><button className="btn btn-secondary" type="button" onClick={onStores}>All supplies</button><button className="btn btn-primary" type="button" onClick={onClose}>Done</button></>}>
    <div className="panel-row meal-presets"><button className="btn btn-secondary" type="button" disabled={Boolean(plan.pending)} onClick={() => onUpdate(feedAll(state, plan, 'normal'))}>Feed everyone</button><button className="btn btn-secondary" type="button" disabled={Boolean(plan.pending)} onClick={() => onUpdate(feedAll(state, plan, 'emergency'))}>Emergency for everyone</button></div>
    <div className="meal-grid">{state.crew.filter(person => person.alive).map(person => <section className="meal-card" key={person.id}><div className="meal-person"><Portrait person={person} /><strong>{person.name.split(' ')[0]}</strong></div><MealControls person={person} plan={plan} onUpdate={onUpdate} /></section>)}</div>
    <div className="panel-row"><Resources values={{ food: costs.food || 0, water: costs.water || 0 }} /><small>Stock: {state.resources.food} food · {state.resources.water} water</small></div>
    {budget && <p className="panel-warning" role="alert">{budget}</p>}
  </GameDialog>;
}
