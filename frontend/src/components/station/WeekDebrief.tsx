import { TurnDetails } from '../TurnDetails';
import type { TurnOutcome } from '../../types/game';

export function WeekDebrief({ outcome, crewNames, ended, onContinue }: {
  outcome: TurnOutcome; crewNames: Record<string, string>; ended: boolean; onContinue: () => void;
}) {
  return <section aria-label={`Week ${outcome.week} confirmed results`}>
    <span className="station-eyebrow">WEEK CONFIRMED</span><h2>WEEK {outcome.week} DEBRIEF</h2>
    <div className="station-inset"><h3>{outcome.event.success ? 'Response successful' : 'Response unsuccessful'}</h3><p>{outcome.event.choice_text}</p></div>
    {outcome.deaths.length > 0 && <p role="alert" className="station-warning">Did not survive: {outcome.deaths.map(id => crewNames[id] || id).join(', ')}.</p>}
    <div className="station-inset"><h3>Survival</h3>
      <p>Food used {outcome.survival.ration_costs.food.toFixed(2)} · Water used {outcome.survival.ration_costs.water.toFixed(2)}</p>
      <p>Solar power generated {outcome.survival.electricity_generated.toFixed(1)} · Life-support operation {Math.round(outcome.survival.life_support_power_fraction * 100)}%</p>
      {outcome.survival.oxygen_shortage > 0 && <p className="station-warning">Oxygen shortage: {outcome.survival.oxygen_shortage.toFixed(1)}.</p>}
      <p>{outcome.deaths.length ? `${outcome.deaths.length} crew lost this week.` : 'All crew survived this week.'}</p>
    </div>
    <div className="station-inset"><h3>Scientific achievement</h3>
      {outcome.science_gains.length ? outcome.science_gains.map(gain => <p key={gain.objective_id}>{gain.title}: +{gain.amount}</p>) : <p>No new objective credit this week. Completed project phases are retained.</p>}
    </div>
    <div className="station-inset"><h3>Crew work & projects</h3>
      {outcome.assignments.map(work => <p key={work.crew_id}>{crewNames[work.crew_id] || work.crew_id}: {work.outcome?.choice_text || work.activity_id} — {work.status === 'cancelled' ? `interrupted: ${work.reason}` : work.outcome?.success ? 'successful' : 'unsuccessful'}.</p>)}
      {outcome.project_updates.map((update, index) => <p key={`${update.project_id}-${index}`}>{update.message}</p>)}
    </div>
    {outcome.next_event && <p className="station-warning">Next week's discovery: {outcome.next_event.title}. Its discovery effects are already included in the station view.</p>}
    <details><summary>Full weekly report</summary>
      <p>Net stock changes, including next discovery: {Object.entries(outcome.resource_changes).map(([id, amount]) => `${id.replace(/_/g, ' ')} ${amount > 0 ? '+' : ''}${Number(amount.toFixed(2))}`).join(', ')}</p>
      <TurnDetails outcome={outcome} crewNames={crewNames} />
    </details>
    <button type="button" className="btn btn-primary station-continue" autoFocus onClick={onContinue}>{ended ? 'View final mission results' : `PROCEED TO WEEK ${outcome.week + 1}`}</button>
  </section>;
}
