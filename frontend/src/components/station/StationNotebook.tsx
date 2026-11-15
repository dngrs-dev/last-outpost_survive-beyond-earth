import { useState } from 'react';
import type { GameStateResponse } from '../../types/game';
import { bookedCrew, type WeeklyPlan } from '../../state/weeklyPlan';
import { NotebookDialog, PageTurns } from './NotebookDialog';
import { number, paragraphs, resourceName, supplies, type NotebookPage } from './notebookContent';
import { reportPages } from './reportPages';

export type StationBook = 'status' | 'stores' | 'journal' | 'away' | 'help';

const guidance = [
  ...paragraphs('Your first week', 'Read the incident and confirm one response. Then return to the station and click a free astronaut to give them one main assignment.'),
  ...paragraphs('Choices have weight', 'A confirmed response or assignment is locked for this week, even after a refresh. Incident crew and patients cannot do a second job. You can leave other crew on routine duties.'),
  ...paragraphs('Provisions come last', 'Next Week opens food and water. Normal rations support recovery. Confirming provisions closes all remaining orders, then you submit the entire week together.'),
  ...paragraphs('Read the station', 'Click the table computer for power, air, and science. Click supplies for exact stock. The airlock lists dispatched crew. Hover or focus an astronaut for a quick condition card; tap for the full notebook.'),
  ...paragraphs('Understand the outcome', 'End Week resolves the response, crew work, provisions, and survival. Confirmed reports separate science and survival and explain interruptions. Research recording can continue automatically without occupying crew.'),
  ...paragraphs('Keyboard & motion', 'Tab moves between objects; Enter opens them. Escape closes a notebook or tooltip. Page arrows reveal more information without scrolling. Motion follows your reduced-motion preference.'),
];

export function StationNotebook({ book, state, plan, onUpdate, onCrew, onClose }: {
  book: StationBook; state: GameStateResponse; plan: WeeklyPlan; onUpdate: (next: WeeklyPlan) => void; onCrew: (id: string) => void; onClose: () => void;
}) {
  const [section, setSection] = useState('menu');
  const [page, setPage] = useState(0);
  const [priority, setPriority] = useState(plan.power_priority);
  const [orders, setOrders] = useState<Record<string, 'pause' | 'resume' | 'interrupt'>>({});
  const [historyWeek, setHistoryWeek] = useState(state.history[state.history.length - 1]?.week || 0);
  const locked = plan.rationsConfirmed || Boolean(plan.pending);
  const names = Object.fromEntries(state.crew.map(person => [person.id, person.name]));
  const living = state.crew.filter(person => person.alive);
  const away = living.filter(person => plan.selected_crew_id === person.id || plan.support_crew_ids.includes(person.id)
    || plan.assignments.some(order => order.crew_id === person.id && state.assignment_options.find(option => option.id === order.activity_id)?.workload === 'eva'));
  const roster = book === 'away' ? away : state.crew;
  const conditionRows = <>
    <div className="folio-row"><span>Water recovery</span><strong>{Math.round(state.life_support.water_recovery_condition * 100)}%</strong></div>
    <div className="folio-row"><span>Oxygen system</span><strong>{Math.round(state.oxygen_efficiency * 100)}%</strong></div>
    <div className="folio-row"><span>CO2 scrubber</span><strong>{Math.round(state.life_support.co2_condition * 100)}%</strong></div>
    <div className="folio-row"><span>Cabin CO2</span><strong>{number(state.life_support.co2_burden)} / {state.life_support.co2_warning_level}</strong></div>
  </>;
  let pages: NotebookPage[] = [];
  if (book === 'help') pages = guidance;
  else if (section === 'Field guide') pages = guidance;
  else if (book === 'stores') {
    const resources = Object.entries(state.resources);
    for (let start = 0; start < resources.length; start += 3) pages.push({ title: 'Confirmed supplies', text: resources.slice(start, start + 3).map(([name, amount]) => `${resourceName(name)}: ${number(amount)}`).join('\n') });
    pages.push(...paragraphs('Reading the shelves', 'Pouches and tank fills are bounded illustrations relative to arrival stock. Kit stacks show at most three packs. Exact quantities are on these pages; battery fill uses its actual capacity. Planning does not spend supplies.'));
  } else if (book === 'away' || section === 'Crew') {
    pages = roster.map(person => ({ title: person.name, text: `${person.role} · ${person.alive ? person.condition.status : 'Deceased'}. ${!person.alive ? 'No longer available for assignments.' : bookedCrew(plan).includes(person.id) ? 'Booked for this week.' : locked ? 'Orders closed; routine duties or recovery.' : 'Available for an assignment or routine duties.'}` }));
    if (!pages.length) pages = [{ title: 'All crew aboard', text: 'No astronauts have been dispatched from the common room this week.' }];
  } else if (section === 'Energy') {
    pages = [
      { title: 'Power reserves', text: `Battery: ${number(state.energy.stored)} / ${state.energy.battery_capacity}. Life-support budget: ${number(state.energy.life_support_required)} power per week before response and job effects.` },
      { title: 'Power priority', text: 'Life support first protects oxygen and air processing. Research first allocates recording power before life support and can reduce oxygen production.' },
      ...state.energy.forecast.map(week => ({ title: `Week ${week.week}: ${week.phase}`, text: `${number(week.daylight_days)} days of light / ${number(week.darkness_days)} dark days. Forecast solar power: ${number(week.electricity_generated)} at current array condition. Repairs and spending can change the outcome.` })),
      ...paragraphs('Lighting model', state.energy.assumption, state.energy.source_url),
    ];
  } else if (section === 'Air & water') pages = [
    { title: 'Life-support condition', text: '' },
    ...paragraphs('Connected resources', `Water recovery reclaims wastewater using power. Drinking rations are allocated first. Oxygen generation uses clean water (${state.life_support.water_per_oxygen} water per oxygen unit) and power.`),
    ...paragraphs('Scrubbers & maintenance', `Oxygen tanks do not remove carbon dioxide. Cabin burden is ${number(state.life_support.co2_burden)}; the fictional warning level is ${state.life_support.co2_warning_level}. Service systems through crew assignments.`),
    ...paragraphs('Engineering inspiration', 'ISS life support inspires these relationships. Equipment, units, wear, and health thresholds are fictional lunar game values.', state.life_support.source_url),
  ];
  else if (section === 'Science') {
    pages = state.science.objectives.flatMap(objective => [
      { title: objective.title, text: `Objective: ${objective.progress}/${objective.target}. ${objective.completed ? 'Complete.' : 'In progress.'} Survival and science have separate assessments.` },
      ...paragraphs('Objective details', objective.description, objective.source_url),
    ]);
    for (const project of state.research_projects) {
      pages.push({ title: `Project ${project.id}`, text: `${project.phase}: ${project.phase_progress}/${project.phase_weeks} weeks. ${project.status}. ${project.crew_required === 0 ? 'Automatic operation; crew are free.' : 'One assigned crew member needed.'}` });
      pages.push(...paragraphs(`Project ${project.id} costs`, `Costs per attempt or recording week: ${supplies(project.costs)}. Retained equipment: ${supplies(project.required_items)}. Automatic recording advances only when fully powered; shortages retain progress without charging.`));
      pages.push(...paragraphs(`Project ${project.id} status`, `${project.message} Earliest completion: ${project.estimated_completion_week === null ? 'resume to estimate' : `week ${project.estimated_completion_week}`}. Estimates assume successful work and power; durations are fictional.`));
      if (project.status !== 'completed') pages.push({ title: `Control ${project.id}`, text: 'Pause or interrupt retains completed work. Recording uses no power while paused. Resume restarts automatic operation; manual phases still need an assignment.' });
    }
    if (!pages.length) pages = [{ title: 'Research brief', text: 'No research objectives are available.' }];
  } else if (section === 'Reports') {
    const entry = state.history.find(entry => entry.week === historyWeek);
    pages = entry ? reportPages(entry, names) : [{ title: 'Mission log', text: 'Your first confirmed report appears after End Week.' }];
  } else if (section === 'This week') {
    const incident = state.current_event?.choices.find(choice => choice.id === plan.event_choice_id);
    pages = [
      ...paragraphs('Incident order', plan.incidentConfirmed ? `${incident?.text || plan.event_choice_id}. Confirmed for this week; changes are locked.` : 'Read and confirm the incident response first.'),
      ...living.flatMap(person => {
        const order = plan.assignments.find(order => order.crew_id === person.id || order.patient_id === person.id);
        return paragraphs(person.name, `${plan.selected_crew_id === person.id || plan.support_crew_ids.includes(person.id) ? 'Incident duty' : order ? order.patient_id === person.id && order.crew_id !== person.id ? 'Receiving medical care' : state.assignment_options.find(option => option.id === order.activity_id)?.text || 'Assigned' : 'Routine duties / recovery'}. Food: ${plan.rations[person.id]?.food}; water: ${plan.rations[person.id]?.water}.`);
      }),
    ];
  }
  const menu = (book === 'status' || book === 'journal') && section === 'menu';
  const current = pages[Math.min(page, Math.max(0, pages.length - 1))];
  const project = state.research_projects.find(project => current?.title === `Control ${project.id}`);
  const visibleProject = state.research_projects.find(project => current?.title === `Project ${project.id}`);
  const visibleObjective = state.science.objectives.find(objective => current?.title === objective.title);
  const order = project ? plan.project_orders.find(order => order.project_id === project.id) : undefined;
  const selectedOrder = project ? orders[project.id] || (project.status === 'paused' ? 'resume' : 'pause') : 'pause';
  const manualWork = project && plan.assignments.some(order => order.activity_id === `project:${project.id}`);
  return <NotebookDialog title={book === 'status' ? 'Station status' : book === 'stores' ? 'Supplies' : book === 'away' ? 'Dispatched crew' : book === 'help' ? 'Field guide' : 'Mission journal'}
    subtitle={`WEEK ${state.current_week} · ${section === 'menu' ? 'SELECT A PAGE' : section}`} onClose={onClose} controls={<>
      {!menu && <PageTurns page={page} count={pages.length} onChange={setPage} />}
      {(book === 'status' || book === 'journal') && !menu ? <button type="button" className="btn btn-secondary" onClick={() => { setSection('menu'); setPage(0); }}>Contents</button> : <button type="button" className="btn btn-primary" onClick={onClose}>Return to station</button>}
    </>}>
    {menu ? <><h2>{book === 'status' ? 'What needs attention?' : 'Open the journal'}</h2><div className="folio-menu">{(book === 'status' ? ['Energy', 'Air & water', 'Science', 'Crew'] : ['This week', 'Reports', 'Crew', 'Field guide']).map(name => <button key={name} type="button" onClick={() => { setSection(name); setPage(0); }}>{name}</button>)}</div><small>{book === 'status' ? 'Confirmed readings. New orders take effect together at End Week.' : 'One decision at a time. Confirmed choices stay locked for the week.'}</small></>
      : section === 'Field guide' ? <><h2>{guidance[page]?.title || guidance[0].title}</h2><p>{guidance[page]?.text || guidance[0].text}</p></>
      : current && <>
        {section === 'Reports' && state.history.length > 0 && <label>Report week<select value={historyWeek} onChange={event => { setHistoryWeek(Number(event.target.value)); setPage(0); }}>{state.history.map(entry => <option key={entry.week} value={entry.week}>Week {entry.week}</option>)}</select></label>}
        <h2>{current.title}</h2>
        {section === 'Air & water' && page === 0 ? <div className="folio-card">{conditionRows}</div> : <p style={{ whiteSpace: 'pre-line' }}>{current.text}</p>}
        {visibleProject && visibleProject.status !== 'completed' && <progress aria-label={`${visibleProject.id} phase progress`} max={visibleProject.phase_weeks} value={visibleProject.phase_progress} />}
        {visibleObjective && <progress aria-label={`${visibleObjective.title} progress`} max={visibleObjective.target} value={visibleObjective.progress} />}
        {current.link && <a href={current.link} target="_blank" rel="noreferrer">Research source</a>}
        {(book === 'away' || section === 'Crew') && roster[page] && <button type="button" className="btn btn-secondary" onClick={() => onCrew(roster[page].id)}>Inspect {roster[page].name}</button>}
        {section === 'Energy' && page === 1 && <><label>Power priority<select aria-label="Power priority" value={priority} disabled={locked || plan.powerConfirmed} onChange={event => setPriority(event.target.value as typeof priority)}><option value="life_support">Life support first</option><option value="research">Research recording first</option></select></label><button type="button" className="btn btn-secondary" disabled={locked || plan.powerConfirmed} onClick={() => onUpdate({ ...plan, power_priority: priority, powerConfirmed: true })}>{plan.powerConfirmed ? 'Priority locked for this week' : 'Confirm power priority'}</button></>}
        {project && <><label>Project control<select value={selectedOrder} disabled={locked || Boolean(order)} onChange={event => setOrders(previous => ({ ...previous, [project.id]: event.target.value as typeof selectedOrder }))}><option value="pause">Pause</option><option value="resume">Resume</option><option value="interrupt">Interrupt</option></select></label><button type="button" className="btn btn-secondary" disabled={locked || Boolean(order) || (manualWork && selectedOrder !== 'resume')} onClick={() => onUpdate({ ...plan, project_orders: [...plan.project_orders, { project_id: project.id, action: selectedOrder }] })}>{order ? `${order.action} locked for this week` : 'Confirm project order'}</button>{manualWork && selectedOrder !== 'resume' && <small>A manual phase is already booked this week.</small>}</>}
      </>}
  </NotebookDialog>;
}
