import { useState } from 'react';
import type { CrewResponse, TurnOutcome } from '../../types/game';
import { GameDialog } from './GameDialog';
import { Portrait, Resources, label } from './Visuals';
import { taskName } from './CrewPanel';

export function ReportSummary({ outcome, crew }: { outcome: TurnOutcome; crew: CrewResponse[] }) {
  const names = Object.fromEntries(crew.map(person => [person.id, person.name]));
  return <>
    <div className="report-head"><strong>{outcome.event.success ? '✓ Response succeeded' : '⚠ Response failed'}</strong><p>{outcome.event.choice_text}</p></div>
    <div className="report-crew">{crew.map(person => {
      const change = outcome.survival.health_changes.find(change => change.crew_id === person.id);
      const died = outcome.deaths.includes(person.id);
      return change || died ? <div className={`report-person ${died ? 'lost' : ''}`} key={person.id}><Portrait person={person} /><strong>{person.name.split(' ')[0]}</strong><span>{died ? 'Lost' : `♥ ${change!.before} → ${change!.after}`}</span><small>{change ? `Food ${Math.round(change.food_received_fraction * 100)}% · Water ${Math.round(change.water_received_fraction * 100)}%` : ''}</small></div> : null;
    })}</div>
    <div className="report-outcomes"><section className="panel-section"><h2>♥ Survival</h2><strong>{outcome.deaths.length ? `${outcome.deaths.map(id => names[id] || id).join(', ')} lost` : 'Everyone survived'}</strong></section><section className="panel-section"><h2>✦ Science</h2>{outcome.science_gains.length ? outcome.science_gains.map(gain => <p key={gain.objective_id}>{gain.title} +{gain.amount}</p>) : <small>No new discoveries</small>}</section></div>
    {outcome.assignments.length > 0 && <div className="work-results">{outcome.assignments.map(order => <p key={order.crew_id}><strong>{names[order.crew_id]?.split(' ')[0]}:</strong> {taskName(order.activity_id, order.outcome?.choice_text || label(order.activity_id))} · {order.status === 'cancelled' ? 'Interrupted' : order.outcome?.success ? '✓' : 'Failed'}{order.patient_id ? ` → ${names[order.patient_id]?.split(' ')[0]}` : ''}{order.reason ? ` · ${order.reason}` : ''}</p>)}</div>}
    {outcome.project_updates.map(update => <small key={update.project_id}>{update.message}</small>)}
    <Resources values={outcome.resource_changes} signed />
  </>;
}
export function WeekReport({ outcome, crew, ended, onContinue }: { outcome: TurnOutcome; crew: CrewResponse[]; ended: boolean; onContinue: () => void }) {
  const [details, setDetails] = useState(false);
  const loop = outcome.survival.life_support;
  return <GameDialog title={`WEEK ${outcome.week} DEBRIEF`} subtitle="WEEK COMPLETE" onClose={onContinue} controls={<><button className="btn btn-secondary" type="button" aria-pressed={details} onClick={() => setDetails(!details)}>{details ? 'Overview' : 'Details'}</button><button type="button" className="btn btn-primary" onClick={onContinue}>{ended ? 'View final mission results' : `PROCEED TO WEEK ${outcome.week + 1}`}</button></>}>
    {!details ? <ReportSummary outcome={outcome} crew={crew} /> : <div className="report-details">
      <section className="panel-section"><h2>Power & air</h2><p>Sunlight {Math.round(outcome.survival.daylight_fraction * 100)}% · Solar +{outcome.survival.electricity_generated}</p><p>Life support used {outcome.survival.electricity_used} · Research used {outcome.survival.project_electricity_used}</p><p>Oxygen +{outcome.survival.oxygen_generated} · Breathing needed {outcome.survival.oxygen_required} · Shortage {outcome.survival.oxygen_shortage}</p></section>
      <section className="panel-section"><h2>Water & CO2</h2><p>Water recovered {loop.water_recovered} · Used for oxygen {loop.water_for_oxygen}</p><p>CO2 made {loop.co2_produced} · Removed {loop.co2_removed} · Left {loop.co2_remaining}</p></section>
      {outcome.survival.health_changes.map(change => <section className="panel-section" key={change.crew_id}><h2>{crew.find(person => person.id === change.crew_id)?.name.split(' ')[0]}</h2><p>Recovery +{change.recovery}{change.rested ? ' with rest' : ''} · Hunger loss {change.food_penalty} · Thirst loss {change.water_penalty}</p><p>Hunger {change.nutrition_before} → {change.nutrition_after} · Thirst {change.hydration_before} → {change.hydration_after}</p><p>Oxygen loss {change.oxygen_penalty} · CO2 loss {change.co2_penalty} · Illness loss {change.medical_penalty}</p>{change.medical_changes.map((medical, index) => <small key={index}>{label(medical.kind)}: {medical.action}. {medical.reason}</small>)}</section>)}
    </div>}
  </GameDialog>;
}
