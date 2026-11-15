import { useState } from 'react';
import type { GameStateResponse } from '../../types/game';
import { planIssues, type WeeklyPlan } from '../../state/weeklyPlan';
import { GameDialog } from './GameDialog';
import { Chance, CrewPick, Outcome, Resources } from './Visuals';

// Compact player-facing captions; canonical response IDs and API wording stay intact.
const responseNames: Record<string, string> = {
  engineer_repair: 'Engineer repair', crew_repair: 'Crew repair', ignore: 'Use reserves',
  replace_regulator: 'Swap regulator', recalibrate: 'Reset together',
  treat: 'Treat one astronaut', team_treatment: 'Medic leads care', guided_treatment: 'Scanner treatment', rest: 'Isolate filter & rest',
  shelter: 'Take shelter', shield_reconfigure: 'Build extra shielding', storm_wait: 'Use current shielding',
  seal_pressure: 'Seal air leak', clamp_pressure: 'Clamp air line', isolate_pressure: 'Close air line',
  radiator_service: 'Repair cooling', radiator_patch: 'Patch insulation', thermal_shutdown: 'Reduce activity',
  seal_water: 'Seal & reclaim water', repair_water: 'Repair water line', isolate_water: 'Close water line',
  service_scrubber: 'Service air filter', vent_scrubber: 'Purge cabin air', scrubber_risk: 'Use reduced filtering',
  align_antenna: 'Align antenna', remote_antenna: 'Align remotely', offline_procedures: 'Use saved procedures',
  battery_diagnosis: 'Restore battery', battery_scan: 'Test battery', battery_accept: 'Keep battery isolated',
  improvise_cover: 'Build cover', fabricate_cover: 'Adapt spare parts', shield_accept: 'Leave cable exposed',
  kit_sampling: 'Collect samples', basic_sampling: 'Observe rocks', defer_geology: 'Skip survey',
  analyze_seismic: 'Analyze moonquake', archive_seismic: 'Save recordings', defer_seismic: 'Leave sensors waiting',
  audit_crate: 'Inspect cargo', audit_scanner: 'Scan cargo', quarantine_crate: 'Keep cargo sealed',
  structured_recovery: 'Plan crew recovery', medical_recovery: 'Treat one astronaut', routine_recovery: 'Keep light duties',
};

export const responseName = (id: string, fallback: string) => responseNames[id] || fallback;

export function IncidentPanel({ state, plan, onCommit, onClose }: {
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
  const stockResources = new Set(['food', 'water', 'oxygen', 'electricity',
    ...event.choices.flatMap(option => [...Object.keys(option.costs), ...Object.keys(option.required_items)])]);
  const stock = Object.fromEntries([...stockResources].map(resource => [resource, state.resources[resource] || 0]));
  const prompt = choice ? choice.requires_crew && !lead ? 'Choose a teammate' : supportsNeeded > support.length ? `Choose ${supportsNeeded - support.length} helper` : issues[0] || '' : '';
  const brief = event.id === 'medical_emergency' ? 'Dust escaped from an air filter. Everyone has sore lungs and needs recovery.' : event.description;
  return <GameDialog title={event.title} subtitle={`WEEK ${state.current_week} · INCIDENT`} size="large" dismissible={false} onClose={onClose} controls={
    <div className="incident-controls">{prompt && <span>{prompt}</span>}<button type="button" className="btn btn-primary" disabled={!choice || issues.length > 0} onClick={() => { if (choice && !planIssues(state, next, false).length) onCommit(next); }}>Confirm response</button></div>
  }>
    <p className="incident-brief">{brief}</p>
    <Resources values={stock} stock />
    <div className="incident-options" aria-label="Incident responses">
      {event.choices.map(option => {
        const selected = choiceId === option.id;
        const candidate = selected ? option.eligible_crew.find(candidate => candidate.crew_id === lead) : undefined;
        const chance = option.requires_crew ? candidate?.success_probability : option.success_probability ?? option.success_chance;
        return <button type="button" className={`action-card ${selected ? 'selected' : ''} ${!option.available ? 'unavailable' : ''}`} key={option.id} aria-pressed={selected} aria-label={responseName(option.id, option.text)} aria-disabled={!option.available} title={!option.available ? option.unavailable_reasons.join(' ') : option.text} onClick={() => { if (!option.available) return; setChoice(option.id); setLead(''); setSupport([]); }}>
          <h2>{responseName(option.id, option.text)}{!option.available && <span className="unavailable-lock" role="img" aria-label="Unavailable"> 🔒</span>}</h2>
          <div className="panel-row"><Resources values={option.costs} />{chance !== undefined && <Chance value={chance} />}{option.requires_crew && <span className="crew-count" aria-label={`${option.minimum_crew} crew required`}>♟ {option.minimum_crew}</span>}</div>
          <Resources values={option.required_items} retained />
          <div className="response-outcomes"><span className="good-result">✓ <Outcome effects={option.success_effects} rewards={option.objective_rewards.reduce((sum, reward) => sum + reward.amount, 0)} /></span><span className="bad-result">⚠ <Outcome effects={option.failure_effects} /></span></div>
        </button>;
      })}
    </div>
    {choice?.requires_crew && <div className="incident-team">
      <strong>{supportsNeeded > 0 && lead ? `Helpers ${support.length}/${supportsNeeded}` : 'Teammate'}</strong>
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
