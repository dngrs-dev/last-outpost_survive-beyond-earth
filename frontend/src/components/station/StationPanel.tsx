import { useState } from 'react';
import type { GameStateResponse } from '../../types/game';
import { type WeeklyPlan } from '../../state/weeklyPlan';
import { GameDialog } from './GameDialog';
import { Portrait, ResourceIcon, Resources, label } from './Visuals';
import { taskName } from './CrewPanel';
import { ReportSummary } from './WeekReport';

export type StationBook = 'status' | 'stores' | 'journal' | 'away' | 'help';
const percent = (value: number) => `${Math.round(value * 100)}%`;
export function StationPanel({ book, state, plan, onUpdate, onCrew, onClose }: {
  book: StationBook; state: GameStateResponse; plan: WeeklyPlan; onUpdate: (next: WeeklyPlan) => void; onCrew: (id: string) => void; onClose: () => void;
}) {
  const [section, setSection] = useState(book === 'journal' ? 'Crew' : 'Energy');
  const [priority, setPriority] = useState(plan.power_priority);
  const [orders, setOrders] = useState<Record<string, 'pause' | 'resume' | 'interrupt'>>({});
  const [historyWeek, setHistoryWeek] = useState(state.history[state.history.length - 1]?.week || 0);
  const locked = Boolean(plan.pending);
  const living = state.crew.filter(person => person.alive);
  const away = living.filter(person => plan.selected_crew_id === person.id || plan.support_crew_ids.includes(person.id) || plan.assignments.some(order => order.crew_id === person.id && state.assignment_options.find(option => option.id === order.activity_id)?.workload === 'eva'));
  const roster = book === 'away' ? away : state.crew;
  const work = (id: string) => {
    if (plan.selected_crew_id === id || plan.support_crew_ids.includes(id)) return 'Incident duty';
    const order = plan.assignments.find(order => order.crew_id === id || order.patient_id === id);
    return order ? order.patient_id === id && order.crew_id !== id ? 'Receiving care' : taskName(order.activity_id, state.assignment_options.find(option => option.id === order.activity_id)?.text || 'Working') : 'Routine duties';
  };
  const crew = <div className="manifest">{roster.map(person => <button className="manifest-person" type="button" key={person.id} onClick={() => onCrew(person.id)} aria-label={`Inspect ${person.name}`}><Portrait person={person} /><span><strong>{person.name.split(' ')[0]}</strong><small>{person.alive ? work(person.id) : 'Lost during the mission'}</small><small>{person.alive ? `♥ ${person.health} · ${person.condition.status}` : ''}</small></span></button>)}{!roster.length && <p>Everyone is aboard.</p>}</div>;
  return <GameDialog title={book === 'status' ? 'Station status' : book === 'stores' ? 'Supplies' : book === 'away' ? 'Dispatched crew' : book === 'help' ? 'How to play' : 'Crew log'} onClose={onClose}>
    {(book === 'status' || book === 'journal') && <div className="job-tabs" aria-label="Station sections">{(book === 'status' ? ['Energy', 'Air & water', 'Science', 'Crew'] : ['Crew', 'Reports']).map(name => <button type="button" key={name} aria-pressed={section === name} onClick={() => setSection(name)}>{name}</button>)}</div>}
    {book === 'help' ? <div className="action-grid help-grid"><section className="panel-section"><h2>1 · Choose a response</h2><p>Read the incident. Pick a response and any crew it needs.</p></section><section className="panel-section"><h2>2 · Give food & water</h2><p>Click supplies or a teammate. Choose their meals, or feed everyone.</p></section><section className="panel-section"><h2>3 · Pick crew jobs</h2><p>Click a free teammate to explore, repair, help or rest. One main job each.</p></section><section className="panel-section"><h2>4 · Next week</h2><p>Ready? Advance the week to see what happened.</p></section><small>Tab and Enter select. Escape closes. Confirmed jobs stay locked.</small></div>
    : book === 'stores' ? <div className="stock-grid">{Object.entries(state.resources).map(([id, value]) => <div className="stock-item" key={id}><span><ResourceIcon resource={id} /></span><strong>{Number(value.toFixed(2))}</strong><small>{label(id)}</small></div>)}</div>
    : book === 'away' || section === 'Crew' ? crew
    : section === 'Reports' ? <>{state.history.length ? <><label>Week<select aria-label="Report week" value={historyWeek} onChange={event => setHistoryWeek(Number(event.target.value))}>{state.history.map(entry => <option key={entry.week} value={entry.week}>{entry.week}</option>)}</select></label><ReportSummary outcome={state.history.find(entry => entry.week === historyWeek)!} crew={state.crew} /></> : <p>Your first report appears after the first week.</p>}</>
    : section === 'Energy' ? <>
      <div className="station-metrics"><section className="panel-section"><h2>⚡ Battery</h2><strong>{Number(state.energy.stored.toFixed(1))} / {state.energy.battery_capacity}</strong><meter aria-label="Battery charge" min={0} max={state.energy.battery_capacity} value={state.energy.stored} /></section><section className="panel-section"><h2>Life support</h2><strong>{state.energy.life_support_required} power / week</strong><small>Keep enough power for air and water.</small></section></div>
      <div className="forecast" aria-label="Weekly sunlight forecast">{state.energy.forecast.slice(0, 4).map(week => <section key={week.week}><strong>Week {week.week}</strong><span aria-label={week.phase}>{week.phase === 'darkness' ? '☾' : week.phase === 'daylight' ? '☀' : '◐'}</span><meter aria-label={`Week ${week.week} sunlight`} min={0} max={1} value={week.daylight_fraction} /><small>{week.daylight_days.toFixed(1)} sunny days</small><b>⚡ +{Number(week.electricity_generated.toFixed(1))}</b></section>)}</div>
      <div className="panel-row"><label>Power priority<select aria-label="Power priority" value={priority} disabled={locked || plan.powerConfirmed} onChange={event => setPriority(event.target.value as typeof priority)}><option value="life_support">Air & water first</option><option value="research">Research first</option></select></label><button type="button" className="btn btn-secondary" disabled={locked || plan.powerConfirmed} onClick={() => onUpdate({ ...plan, power_priority: priority, powerConfirmed: true })}>{plan.powerConfirmed ? 'Priority saved' : 'Confirm power priority'}</button></div>
    </> : section === 'Air & water' ? <>
      <div className="station-metrics">{[['Water recycler', state.life_support.water_recovery_condition], ['Oxygen maker', state.oxygen_efficiency], ['Air filter', state.life_support.co2_condition], ['Solar panels', state.solar_efficiency]].map(([name, value]) => <section className="panel-section" key={name}><h2>{name}</h2><strong>{percent(value as number)}</strong><meter aria-label={`${name} condition`} min={0} max={1} value={value as number} /></section>)}</div>
      <div className="panel-section"><h2>Cabin CO2</h2><strong>{Number(state.life_support.co2_burden.toFixed(2))} / {state.life_support.co2_warning_level}</strong><p>{state.life_support.co2_burden > state.life_support.co2_warning_level ? '⚠ Air needs attention. Repair the filter.' : 'The filter removes carbon dioxide from the air.'}</p></div><small>⚡ Power runs the water recycler → clean water feeds the oxygen maker → the filter keeps cabin air safe.</small>
    </> : <>
      <div className="science-objectives">{state.science.objectives.map(objective => <section className="panel-section" key={objective.id}><h2>{objective.completed ? '✓' : '✦'} {objective.title}</h2><strong>{objective.progress} / {objective.target}</strong><progress aria-label={`${objective.title} progress`} value={objective.progress} max={objective.target} /></section>)}</div>
      {state.research_projects.map(project => {
        const order = plan.project_orders.find(order => order.project_id === project.id);
        const selectedOrder = orders[project.id] || (project.status === 'paused' ? 'resume' : 'pause');
        const manual = plan.assignments.some(order => order.activity_id === `project:${project.id}`);
        return <section className="panel-section project-card" key={project.id}><div className="panel-row"><h2>Moonquake research</h2><strong>{project.status === 'completed' ? '✓ Complete' : project.phase}</strong></div>
          <div className="phase-track" aria-label="Project phases">{['Deploy', 'Record', 'Analyze'].map((phase, index) => <span key={phase} className={index === project.phase_index ? 'current' : index < project.phase_index ? 'done' : ''}>{index < project.phase_index ? '✓ ' : ''}{phase}</span>)}</div>
          <progress aria-label={`${project.id} phase progress`} max={project.phase_weeks} value={project.phase_progress} /><small>{project.phase_progress}/{project.phase_weeks} weeks · {project.crew_required ? 'Needs one worker' : 'Automatic: crew are free'}{project.estimated_completion_week !== null ? ` · Earliest finish: week ${project.estimated_completion_week}` : ''}</small>
          <div className="panel-row"><Resources values={project.costs} /><Resources values={project.required_items} retained /></div>
          <small>{project.message}</small>
          {project.status !== 'completed' && <div className="panel-row"><label>Project control<select aria-label={`Project control${state.research_projects.length > 1 ? ` ${project.id}` : ''}`} disabled={locked || Boolean(order)} value={selectedOrder} onChange={event => setOrders(previous => ({ ...previous, [project.id]: event.target.value as typeof selectedOrder }))}><option value="pause">Pause</option><option value="resume">Resume</option><option value="interrupt">Interrupt</option></select></label><button className="btn btn-secondary" type="button" disabled={locked || Boolean(order) || (manual && selectedOrder !== 'resume')} onClick={() => onUpdate({ ...plan, project_orders: [...plan.project_orders, { project_id: project.id, action: selectedOrder }] })}>{order ? `${order.action} saved` : 'Confirm project order'}</button>{manual && selectedOrder !== 'resume' && <small>A worker is already assigned this week.</small>}</div>}
        </section>;
      })}
    </>}
  </GameDialog>;
}
