import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchGameState, submitTurn } from '../api/game';
import { ApiError } from '../api/client';
import { rememberMission } from '../state/lastMission';
import { ResearchProjects } from '../components/ResearchProjects';
import { EnergyPanel } from '../components/EnergyPanel';
import { LifeSupportPanel } from '../components/LifeSupportPanel';
import type { MedicalTarget } from '../components/MedicalAssignmentFields';
import { ResearchObjectives } from '../components/ResearchObjectives';
import { StationOverview } from '../components/StationOverview';
import { CrewCard } from '../components/CrewCard';
import { StationRoom, type StationBookmark } from '../components/station/StationRoom';
import { IncidentPlanner, formatSupplies } from '../components/station/IncidentPlanner';
import { CrewPlanner } from '../components/station/CrewPlanner';
import { WeeklyRations } from '../components/station/WeeklyRations';
import { WeekDebrief } from '../components/station/WeekDebrief';
import { TurnDetails } from '../components/TurnDetails';
import { RoleIcon } from '../components/RoleIcon';
import { plannedActivities, confirmedActivities, type CrewActivities } from '../components/station/stationPresentation';
import styles from './GamePage.module.css';
import type {
  GameStateResponse,
  RationLevel,
  RationRequest,
  TurnOutcome,
  SubmitTurnRequest,
} from '../types/game';

export const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();

  const [state, setState] = useState<GameStateResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [pendingTurn, setPendingTurn] = useState<SubmitTurnRequest | null>(null);
  const submissionInFlight = useRef(false);

  // Turn decision state
  const [rations, setRations] = useState<Record<string, RationRequest>>({});
  const [selectedChoiceId, setSelectedChoiceId] = useState<string>('');
  const [selectedCrewId, setSelectedCrewId] = useState<string | null>(null);
  const [supportCrew, setSupportCrew] = useState<string[]>([]);
  const [powerPriority, setPowerPriority] = useState<"life_support" | "research">("life_support");
  const [projectOrders, setProjectOrders] = useState<Record<string, "pause" | "resume" | "interrupt">>({});
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [medicalTargets, setMedicalTargets] = useState<Record<string, MedicalTarget>>({});
  const [step, setStep] = useState(0);
  const [bookmark, setBookmark] = useState<StationBookmark | null>(null);
  const [inspectedCrewId, setInspectedCrewId] = useState<string | null>(null);
  const panelTitle = useRef<HTMLHeadingElement>(null);

  // Confirmed debrief state
  const [latestOutcome, setLatestOutcome] = useState<TurnOutcome | null>(null);
  const [showDebrief, setShowDebrief] = useState<boolean>(false);
  const [resolvedActivities, setResolvedActivities] = useState<CrewActivities | null>(null);

  useEffect(() => { panelTitle.current?.focus(); }, [step, bookmark, showDebrief, loading]);

  // Load game state
  useEffect(() => {
    if (!gameId) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    setState(null);
    setPendingTurn(null);

    fetchGameState(gameId)
      .then((game) => {
        if (!mounted) return;
        rememberMission(game.game_id);
        const current = game.state;
        setState(current);
        initializeTurnForm(current);
        setLoading(false);

        // If game already ended, redirect to results
        if (current.status !== 'running') {
          navigate(`/results/${gameId}`, { replace: true });
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || 'Failed to retrieve game state.');
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [gameId, navigate, loadAttempt]);

  // Initialize form when state changes or turn advances
  const initializeTurnForm = (gameState: GameStateResponse) => {
    const living = gameState.crew.filter((c) => c.alive);

    // Initialize rations to normal, or emergency if resource depleted
    const initialRations: Record<string, RationRequest> = {};
    const isFoodDepleted = gameState.depleted_provisions.includes('food');
    const isWaterDepleted = gameState.depleted_provisions.includes('water');

    living.forEach((c) => {
      initialRations[c.id] = {
        food: isFoodDepleted ? 'emergency' : 'normal',
        water: isWaterDepleted ? 'emergency' : 'normal',
      };
    });
    setRations(initialRations);
    setSupportCrew([]);
    setAssignments({});
    setMedicalTargets({});
    setProjectOrders({});
    setPowerPriority(gameState.energy.priority);
    setSelectedChoiceId('');
    setSelectedCrewId(null);
    setStep(0);
    setBookmark(null);
    setInspectedCrewId(living[0]?.id || gameState.crew[0]?.id || null);

    // Default select the first available choice
    if (gameState.current_event) {
      const availableChoice = gameState.current_event.choices.find((c) => c.available);
      if (availableChoice) {
        setSelectedChoiceId(availableChoice.id);
        if (availableChoice.requires_crew) {
          const firstEligible = availableChoice.eligible_crew.find((c) => c.available);
          setSelectedCrewId(firstEligible ? firstEligible.crew_id : null);
          setSupportCrew(living.filter(c => c.id !== firstEligible?.crew_id && availableChoice.support_candidates.some(candidate => candidate.crew_id === c.id && candidate.available)).slice(0, Math.max(0, availableChoice.minimum_crew - 1)).map(c => c.id));
        } else {
          setSelectedCrewId(null);
        }
      }
    }
  };

  const handleRationChange = (
    crewId: string,
    resource: 'food' | 'water',
    level: RationLevel
  ) => {
    setRations((prev) => ({
      ...prev,
      [crewId]: {
        ...prev[crewId],
        [resource]: level,
      },
    }));
  };

  const setAllRations = (level: RationLevel) => {
    setRations((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((id) => {
        updated[id] = { food: level, water: level };
      });
      return updated;
    });
  };

  const handleSelectChoice = (choiceId: string) => {
    setSelectedChoiceId(choiceId);
    setSupportCrew([]);
    const choice = state?.current_event?.choices.find((c) => c.id === choiceId);
    if (choice?.requires_crew) {
      // Auto-select candidate with highest probability
      const bestCandidate = (choice.eligible_crew || [])
        .filter((c) => c.available)
        .sort((a, b) => b.success_probability - a.success_probability)[0];
      setSelectedCrewId(bestCandidate ? bestCandidate.crew_id : null);
    } else {
      setSelectedCrewId(null);
    }
  };

  // Submit complete weekly turn
  const handleSubmitTurn = async () => {
    if (!state || !gameId || submissionInFlight.current || state.status !== 'running') return;

    // Check choice requires crew
    const choice = state.current_event?.choices.find((c) => c.id === selectedChoiceId);
    if (!pendingTurn && (!choice?.available || (choice.requires_crew && !selectedCrewId))) {
      setError('This action requires an astronaut assignment.');
      return;
    }

    const decision = pendingTurn ?? {
      expected_week: state.current_week,
      request_id: typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `turn-${state.current_week}-${Date.now()}`,
      rations: Object.fromEntries(Object.entries(rations).map(([id, ration]) => [id, { ...ration }])),
      event_choice_id: selectedChoiceId,
      selected_crew_id: choice?.requires_crew ? selectedCrewId : null,
      support_crew_ids: supportCrew.slice(),
      power_priority: powerPriority,
      project_orders: Object.entries(projectOrders).map(([project_id, action]) => ({project_id, action})),
      assignments: Object.entries(assignments).filter(([, activity]) => activity).map(([crew_id, activity_id]) => ({crew_id, activity_id, ...(['medical_care', 'self_care'].includes(activity_id) ? medicalTargets[crew_id] : {})})),
    };
    const activitySnapshot = plannedActivities(state, decision);
    submissionInFlight.current = true;
    setPendingTurn(decision);
    setSubmitting(true);
    setError(null);

    try {
      const response = await submitTurn(gameId, decision);

      // A replay is an historical receipt. Another tab may already be further ahead.
      if (pendingTurn) {
        const latest = await fetchGameState(gameId);
        if (latest.state.weeks_completed > response.state.weeks_completed) {
          setPendingTurn(null);
          setState(latest.state);
          initializeTurnForm(latest.state);
          setError('Your saved turn was confirmed. The mission has advanced in another session; the current state has been refreshed.');
          if (latest.state.status !== 'running') {
            navigate(`/results/${gameId}`, { replace: true });
          }
          return;
        }
      }
      setPendingTurn(null);
      setLatestOutcome(response.turn_outcome);
      setResolvedActivities(confirmedActivities(activitySnapshot, response.turn_outcome, response.state.crew));
      setShowDebrief(true);
      setState(response.state);
      initializeTurnForm(response.state);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Turn submission failed.';
      if (err instanceof ApiError && err.status === 409) {
        try {
          const current = await fetchGameState(gameId);
          setPendingTurn(null);
          setState(current.state);
          initializeTurnForm(current.state);
          setError(`${message} The current mission state has been refreshed. Review your decisions before submitting again.`);
          if (current.state.status !== 'running') {
            navigate(`/results/${gameId}`, { replace: true });
          }
        } catch {
          setError('Could not refresh the mission after a turn conflict. Retry the saved submission to recover.');
        }
      } else if (err instanceof ApiError && err.status >= 400 && err.status < 500 && err.status !== 408) {
        setPendingTurn(null);
        setError(message);
      } else {
        setError(`${message} The server may have processed this week. Retry the saved submission; it will not charge supplies twice.`);
      }
    } finally {
      submissionInFlight.current = false;
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className={styles.connection}>
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-cyan)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📡</div>
          <div role="status">Connecting to your outpost...</div>
        </div>
      </main>
    );
  }

  if (!state) {
    return (
      <main className={styles.connection}>
        <div className="alert alert-danger">{error || 'Mission telemetry unavailable.'}</div>
        <button type="button" className="btn btn-secondary" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>
          Retry connection
        </button>
      </main>
    );
  }

  const livingCrew = state.crew.filter((c) => c.alive);
  const activeChoice = state.current_event?.choices.find((c) => c.id === selectedChoiceId);
  const decisionLocked = submitting || pendingTurn !== null || state.status !== 'running';

  // Compute estimated food and water consumption
  const totalFoodNeeded = livingCrew.reduce((acc, c) => {
    const level = rations[c.id]?.food || 'normal';
    return acc + (c.ration_options?.[level]?.food ?? 0);
  }, 0);

  const totalWaterNeeded = livingCrew.reduce((acc, c) => {
    const level = rations[c.id]?.water || 'normal';
    return acc + (c.ration_options?.[level]?.water ?? 0);
  }, 0);

  const automaticProjectPower = state.research_projects
    .filter(p => p.status !== 'completed' && p.crew_required === 0
      && !['pause', 'interrupt'].includes(projectOrders[p.id])
      && (p.status === 'active' || projectOrders[p.id] === 'resume'))
    .reduce((sum, p) => sum + (p.costs.electricity || 0), 0);
  const requiredSupport = activeChoice?.requires_crew ? Math.max(0, activeChoice.minimum_crew - 1) : 0;
  const incidentCrew = [...(activeChoice?.requires_crew && selectedCrewId ? [selectedCrewId] : []), ...supportCrew];
  const weeklyCosts: Record<string, number> = { food: totalFoodNeeded, water: totalWaterNeeded };
  const actionCosts: Record<string, number> = {};
  const orderedActivities = Object.entries(assignments).filter(([, id]) => id).map(([crewId, id]) => ({crewId, activity: state.assignment_options.find(a => a.id === id)!}));
  for (const action of [activeChoice, ...orderedActivities.map(order => order.activity)]) {
    for (const [resource, amount] of Object.entries(action?.costs || {})) {
      weeklyCosts[resource] = (weeklyCosts[resource] || 0) + amount;
      actionCosts[resource] = (actionCosts[resource] || 0) + amount;
    }
  }
  const planIssues: string[] = [];
  if (activeChoice?.requires_crew && !activeChoice.eligible_crew.some(candidate => candidate.crew_id === selectedCrewId && candidate.available)) planIssues.push('Select an eligible incident lead.');
  const projectWork = orderedActivities.filter(o => o.activity?.id === 'research_seismic' || o.activity?.id.startsWith('project:'));
  if (new Set(projectWork.map(o => o.activity.id)).size !== projectWork.length) planIssues.push('Only one worker may advance each project this week.');
  if (projectWork.some(o => ['pause', 'interrupt'].includes(projectOrders[o.activity.id.replace('project:', '')]))) planIssues.push('Remove the assignment before pausing or interrupting its project.');
  if (supportCrew.some(id => !activeChoice?.support_candidates.some(candidate => candidate.crew_id === id && candidate.available))) planIssues.push('Some support crew are unfit for this workload.');
  if (supportCrew.length !== requiredSupport) planIssues.push(`Select exactly ${requiredSupport} support astronauts for this response.`);
  const booked = [...incidentCrew, ...orderedActivities.flatMap(order => {
    const patient = order.activity?.action_type === 'medical' ? medicalTargets[order.crewId]?.patient_id : undefined;
    return patient && patient !== order.crewId ? [order.crewId, patient] : [order.crewId];
  })];
  if (new Set(booked).size !== booked.length) planIssues.push('Each astronaut can perform only one main job this week.');
  for (const order of orderedActivities.filter(o => o.activity?.action_type === 'medical')) {
    const target = medicalTargets[order.crewId];
    if (!target || !livingCrew.some(c => c.id === target.patient_id && c.medical_conditions.some(m => m.kind === target.condition_id))) planIssues.push('Select a patient and active condition for each medical assignment.');
  }
  for (const order of orderedActivities) if (!order.activity?.eligible_crew.find(c => c.crew_id === order.crewId)?.available) planIssues.push('An assignment is unavailable for its astronaut.');
  for (const [resource, cost] of Object.entries(weeklyCosts)) {
    const emergency = (resource === 'food' || resource === 'water') && livingCrew.every(c => rations[c.id]?.[resource] === 'emergency');
    if (cost > state.resources[resource] + 0.000001 && (!emergency || (actionCosts[resource] || 0) > state.resources[resource] + 0.000001)) planIssues.push(`Combined plan exceeds available ${resource.replace(/_/g, ' ')}.`);
  }

  const changeAssignment = (crewId: string, activityId: string) => {
    setAssignments(prev => ({ ...prev, [crewId]: activityId }));
    setMedicalTargets(prev => {
      const next = { ...prev };
      delete next[crewId];
      if (['medical_care', 'self_care'].includes(activityId)) {
        const patient = livingCrew.find(c => (activityId === 'self_care' ? c.id === crewId : c.id !== crewId) && c.medical_conditions.length);
        if (patient) next[crewId] = { patient_id: patient.id, condition_id: patient.medical_conditions[0].kind };
      }
      return next;
    });
  };

  const steps = ['Incident', 'Crew', 'Food & water', 'Review'];
  const inspectedCrew = state.crew.find(person => person.id === inspectedCrewId) || livingCrew[0] || state.crew[0];
  const crewNames = Object.fromEntries(state.crew.map(person => [person.id, person.name]));
  const currentLighting = state.energy.forecast[0];
  const previewActivities = plannedActivities(state, {
    event_choice_id: selectedChoiceId,
    selected_crew_id: selectedCrewId,
    support_crew_ids: supportCrew,
    assignments: Object.entries(assignments).filter(([, activity]) => activity).map(([crew_id, activity_id]) => ({ crew_id, activity_id, ...medicalTargets[crew_id] })),
  });
  const roomActivities = showDebrief && resolvedActivities ? resolvedActivities : previewActivities;
  const sceneMode = showDebrief ? 'report' : pendingTurn ? 'pending' : 'planning';
  const activityLabel = (id: string) => {
    const activity = roomActivities[id];
    if (!activity) return 'Deceased';
    return activity.result ? `${activity.result}: ${activity.label}` : activity.origin === 'routine' ? activity.label : `Planned: ${activity.label}`;
  };
  const openCrew = (id: string) => { setInspectedCrewId(id); setBookmark('Crew'); };
  const showStep = (index: number) => { setBookmark(null); setStep(index); };
  const canSubmit = Boolean(activeChoice?.available)
    && (!activeChoice?.requires_crew || Boolean(selectedCrewId)) && !planIssues.length;
  const projects = <ResearchProjects projects={state.research_projects} orders={projectOrders} disabled={decisionLocked} onChange={setProjectOrders} />;
  const energy = <EnergyPanel forecast={state.energy.forecast} stored={state.energy.stored} capacity={state.energy.battery_capacity}
    demand={state.energy.life_support_required} priority={powerPriority} onPriorityChange={setPowerPriority}
    disabled={decisionLocked} solarDay={state.energy.solar_day_earth_days} sourceUrl={state.energy.source_url} assumption={state.energy.assumption} />;

  return <main className={styles.screen}>
    <header className={styles.hud}>
      <div className={styles.mission}><span className={styles.eyebrow}>{state.station_name}</span><strong>WEEK {state.current_week} / {state.duration_weeks}</strong></div>
      <div className={styles.stocks} role="group" aria-label="Confirmed station resources">
        {(['food', 'water', 'oxygen', 'electricity'] as const).map(resource => <button key={resource} type="button" disabled={showDebrief}
          onClick={() => setBookmark(resource === 'electricity' ? 'Systems' : 'Stores')}>
          <span>{resource === 'electricity' ? 'Battery' : resource}</span><strong>{Number((state.resources[resource] || 0).toFixed(1))}{resource === 'electricity' ? ` / ${state.energy.battery_capacity}` : ''}</strong>
        </button>)}
      </div>
      <button type="button" className={styles.lighting} disabled={showDebrief} onClick={() => setBookmark('Systems')}>
        <span>{currentLighting?.phase || 'Forecast'}</span><small>{currentLighting ? `${currentLighting.daylight_days.toFixed(1)} days of light` : 'Open energy forecast'}</small>
      </button>
    </header>

    <div className={styles.workspace}>
      <div className={styles.habitat}>
        <div className={styles.goals}>
          <span>Survival <strong>{livingCrew.length} / {state.initial_crew_size} crew alive</strong></span>
          <button type="button" disabled={showDebrief} onClick={() => setBookmark('Science')}>Science <strong>{state.science.completed_objectives} / {state.science.total_objectives} objectives</strong></button>
        </div>
        <StationRoom state={state} activities={roomActivities} mode={sceneMode} reportWeek={latestOutcome?.week} projectOrders={projectOrders}
          selectedCrewId={inspectedCrewId} onSelectCrew={openCrew} onOpen={setBookmark} disabled={showDebrief} />
        <div className={styles.crewStrip} aria-label="Station crew">
          {state.crew.map(person => <button type="button" key={person.id} disabled={showDebrief} onClick={() => openCrew(person.id)}
            aria-pressed={bookmark === 'Crew' && inspectedCrewId === person.id}>
            <RoleIcon role={person.role} /><span>{person.name.split(' ')[0]}<small>{activityLabel(person.id)}</small></span>
          </button>)}
        </div>
        <nav className={styles.bookmarks} aria-label="Station bookmarks">
          {(['Crew', 'Stores', 'Systems', 'Science', 'Log'] as StationBookmark[]).map((name, index) => <button key={name} type="button" disabled={showDebrief}
            aria-pressed={bookmark === name} onClick={() => setBookmark(bookmark === name ? null : name)}><span aria-hidden="true">{['◉', '▤', '⚙', '⌁', '≡'][index]}</span>{name}</button>)}
        </nav>
      </div>

      <section className={styles.planner} aria-label="Weekly planner">
        <nav className={styles.steps} aria-label="Weekly planning steps">
          {steps.map((name, index) => <button key={name} type="button" disabled={showDebrief}
            aria-label={`Step ${index + 1}: ${name}`}
            aria-current={!bookmark && !showDebrief && step === index ? 'step' : undefined} onClick={() => showStep(index)}><span>{index + 1}</span>{name}</button>)}
        </nav>
        <div className={styles.messages} aria-live="polite">
          {error && <p role="alert" className={styles.warning}>{error}</p>}
          {pendingTurn && !submitting && <p className={styles.warning}>Week {pendingTurn.expected_week} has an unresolved submission. Your original decisions are saved and locked until retry resolves it.</p>}
          {state.depleted_provisions.length > 0 && <p role="alert" className={styles.warning}>Empty reserves: {state.depleted_provisions.join(' and ')}. Review emergency rations.</p>}
          {state.life_support.co2_burden > state.life_support.co2_warning_level && <p role="alert" className={styles.warning}>Cabin CO2 is above the safe game limit. Check Systems and scrubber maintenance.</p>}
          {livingCrew.some(person => person.medical_conditions.some(condition => condition.urgent)) && <p className={styles.warning}>A teammate needs urgent medical attention. Review crew care before ending the week.</p>}
        </div>
        <div className={styles.panel}>
          <h1 ref={panelTitle} tabIndex={-1} className={styles.panelTitle}>{showDebrief ? 'Weekly results' : bookmark || `Step ${step + 1} · ${steps[step]}`}</h1>
          {showDebrief && latestOutcome ? <WeekDebrief outcome={latestOutcome} crewNames={crewNames} ended={state.status !== 'running'} onContinue={() => {
            if (state.status !== 'running') navigate(`/results/${gameId}`);
            else { setShowDebrief(false); showStep(0); }
          }} /> : bookmark ? <>
            <button type="button" className="station-text-button" onClick={() => setBookmark(null)}>Return to weekly plan</button>
            {bookmark === 'Crew' && inspectedCrew && <>
              <div className={styles.crewPicker}>{state.crew.map(person => <button type="button" key={person.id} aria-pressed={person.id === inspectedCrew.id} onClick={() => setInspectedCrewId(person.id)}>{person.name.split(' ')[0]}</button>)}</div>
              <CrewCard crew={inspectedCrew} />
              <p>{activityLabel(inspectedCrew.id)}{roomActivities[inspectedCrew.id]?.reason ? `: ${roomActivities[inspectedCrew.id].reason}` : ''}</p>
              {inspectedCrew.alive && <button type="button" className="btn btn-secondary" onClick={() => showStep(1)}>Plan crew assignments</button>}
            </>}
            {bookmark === 'Stores' && <>
              <h2>Station stores</h2><p>Confirmed stock. Planning reserves supplies without consuming them.</p>
              <dl className={styles.inventory}>{Object.entries(state.resources).map(([id, amount]) => <div key={id}><dt>{id.replace(/_/g, ' ')}</dt><dd>{Number(amount.toFixed(2))}</dd></div>)}</dl>
              <details><summary>How to read the room supplies</summary><p>Food pouches and water/oxygen fills show stock relative to arrival supplies, with a fixed number of display slots. They are illustrations, not individual ration packets. Kit stacks are capped at three visible packs; counters show the full stock. Battery fill uses the actual capacity. Reusable equipment stays on its rack while available.</p></details>
              <p>Planned rations and action costs: {formatSupplies(weeklyCosts)}.</p>
              <button type="button" className="btn btn-secondary" onClick={() => showStep(2)}>Plan food & water</button>
            </>}
            {bookmark === 'Systems' && <>{energy}<LifeSupportPanel systems={state.life_support} /><StationOverview solarEfficiency={state.solar_efficiency} oxygenEfficiency={state.oxygen_efficiency} /></>}
            {bookmark === 'Science' && <><ResearchObjectives objectives={state.science.objectives} science={state.science} />{projects}<button type="button" className="btn btn-secondary" onClick={() => showStep(1)}>Assign research work</button></>}
            {bookmark === 'Log' && <><h2>Mission log</h2>{!state.history.length && <p>Your first weekly report will appear after End Week.</p>}{[...state.history].reverse().map(entry => <details key={entry.week}><summary>Week {entry.week} · {entry.event.choice_text}</summary><TurnDetails outcome={entry} crewNames={crewNames} /></details>)}</>}
          </> : <>
            {step === 0 && <IncidentPlanner event={state.current_event} crew={state.crew} choiceId={selectedChoiceId} leadId={selectedCrewId} supportIds={supportCrew} disabled={decisionLocked}
              onChoice={handleSelectChoice} onLead={id => { setSelectedCrewId(id); setSupportCrew([]); }} onSupport={setSupportCrew} />}
            {step === 1 && <>
              <CrewPlanner crew={state.crew} options={state.assignment_options} assignments={assignments} medicalTargets={medicalTargets} incidentCrew={incidentCrew} disabled={decisionLocked}
                onAssignment={changeAssignment} onTarget={(id, target) => setMedicalTargets(prev => ({ ...prev, [id]: target }))} onInspect={openCrew} />
              {planIssues.filter(issue => !issue.startsWith('Combined plan')).map(issue => <p className={styles.warning} role="alert" key={issue}>{issue}</p>)}
              <details><summary>Research project controls</summary>{projects}</details>
            </>}
            {step === 2 && <WeeklyRations crew={state.crew} rations={rations} disabled={decisionLocked} onChange={handleRationChange} onAll={setAllRations} food={totalFoodNeeded} water={totalWaterNeeded} />}
            {step === 3 && <section aria-label="Review weekly plan">
              <h2>Ready for week {state.current_week}?</h2><p>Check the whole plan. Nothing advances until you choose End Week.</p>
              <div className="station-inset"><h3>Incident</h3><p>{activeChoice?.text || 'Choose a response'}</p>
                {incidentCrew.length > 0 && <p>{incidentCrew.map(id => crewNames[id]).join(' + ')}</p>}
                <button type="button" className="station-text-button" onClick={() => showStep(0)}>Edit incident response</button>
              </div>
              <div className="station-inset"><h3>Crew plan</h3>{livingCrew.map(person => <p key={person.id}><strong>{person.name}:</strong> {incidentCrew.includes(person.id) ? 'Incident response' : orderedActivities.some(order => order.activity?.action_type === 'medical' && order.crewId !== person.id && medicalTargets[order.crewId]?.patient_id === person.id) ? 'Receiving medical care' : state.assignment_options.find(activity => activity.id === assignments[person.id])?.text || (person.condition.can_work ? 'Routine duties' : 'Unassigned recovery')}{medicalTargets[person.id] && assignments[person.id] ? ` - ${crewNames[medicalTargets[person.id].patient_id]}, ${medicalTargets[person.id].condition_id.replace(/_/g, ' ')}` : ''}</p>)}
                <button type="button" className="station-text-button" onClick={() => showStep(1)}>Edit crew work</button>
              </div>
              <div className="station-inset"><h3>Food & water</h3>{livingCrew.map(person => <p key={person.id}>{person.name}: {rations[person.id]?.food} food / {rations[person.id]?.water} water</p>)}
                <button type="button" className="station-text-button" onClick={() => showStep(2)}>Edit rations</button>
              </div>
              <div className="station-inset"><h3>Projected spending</h3><p>{formatSupplies(weeklyCosts)}</p>
                <p>Known rations and action costs only. Success, losses, generation, and recovery are resolved afterward.</p>
                <p>Automatic recording may additionally use {automaticProjectPower} power after action effects and solar generation, under your selected priority. Shortages skip recording without charging.</p>
                {Object.entries(projectOrders).map(([id, action]) => <p key={id}>{id}: {action} scheduled for this turn.</p>)}
                <label>Power priority<select disabled={decisionLocked} value={powerPriority} onChange={e => setPowerPriority(e.target.value as typeof powerPriority)}><option value="life_support">Life support first</option><option value="research">Research recording first</option></select></label>
                {powerPriority === 'research' && <p className={styles.warning}>Recording takes power before life support. This can reduce oxygen production.</p>}
                <button type="button" className="station-text-button" onClick={() => setBookmark('Systems')}>Inspect sunlight & systems</button>
              </div>
              {planIssues.map(issue => <p role="alert" className={styles.warning} key={issue}>{issue}</p>)}
              {!activeChoice?.available && <p role="alert" className={styles.warning}>Choose an available incident response.</p>}
            </section>}
          </>}
        </div>
        {!showDebrief && <footer className={styles.planFooter}>
          {pendingTurn ? <button type="button" className="btn btn-primary" disabled={submitting} onClick={handleSubmitTurn}>{submitting ? 'Resolving week...' : `Retry week ${pendingTurn.expected_week} submission`}</button>
            : bookmark ? <button type="button" className="btn btn-primary" onClick={() => setBookmark(null)}>Return to plan</button>
            : <><button type="button" className="btn btn-secondary" disabled={step === 0 || decisionLocked} onClick={() => showStep(step - 1)}>Back</button>
              <span>{step + 1} / 4</span>
              {step < 3 ? <button type="button" className="btn btn-primary" disabled={decisionLocked} onClick={() => showStep(step + 1)}>Next: {steps[step + 1]}</button>
                : <button type="button" className="btn btn-primary" disabled={decisionLocked || !canSubmit} onClick={handleSubmitTurn}>End week {state.current_week}</button>}
            </>}
        </footer>}
      </section>
    </div>
  </main>;
};
