import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchGameState, submitTurn } from '../api/game';
import { ApiError } from '../api/client';
import { ResearchProjects } from '../components/ResearchProjects';
import { EnergyPanel } from '../components/EnergyPanel';
import { LifeSupportPanel } from '../components/LifeSupportPanel';
import { Header } from '../components/Header';
import { ResearchObjectives } from '../components/ResearchObjectives';
import { ResourceCard } from '../components/ResourceCard';
import { StationOverview } from '../components/StationOverview';
import { CrewCard } from '../components/CrewCard';
import { EventCard } from '../components/EventCard';
import { TurnOutcomeModal } from '../components/TurnOutcomeModal';
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

  // Modal debrief state
  const [latestOutcome, setLatestOutcome] = useState<TurnOutcome | null>(null);
  const [showOutcomeModal, setShowOutcomeModal] = useState<boolean>(false);

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
    setProjectOrders({});
    setPowerPriority(gameState.energy.priority);
    setSelectedChoiceId('');
    setSelectedCrewId(null);

    // Default select the first available choice
    if (gameState.current_event) {
      const availableChoice = gameState.current_event.choices.find((c) => c.available);
      if (availableChoice) {
        setSelectedChoiceId(availableChoice.id);
        if (availableChoice.requires_crew) {
          const firstEligible = availableChoice.eligible_crew.find((c) => c.available);
          setSelectedCrewId(firstEligible ? firstEligible.crew_id : null);
          setSupportCrew(living.filter(c => c.id !== firstEligible?.crew_id).slice(0, Math.max(0, availableChoice.minimum_crew - 1)).map(c => c.id));
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
      assignments: Object.entries(assignments).filter(([, activity]) => activity).map(([crew_id, activity_id]) => ({crew_id, activity_id})),
    };
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
      setShowOutcomeModal(true);
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
      <div className="app-container">
        <Header />
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-cyan)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📡</div>
          <div>ESTABLISHING DIRECT TELEMETRY WITH STATION ALPHA...</div>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="app-container">
        <Header />
        <div className="alert alert-danger">{error || 'Mission telemetry unavailable.'}</div>
        <button type="button" className="btn btn-secondary" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>
          Retry connection
        </button>
      </div>
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
  const projectWork = orderedActivities.filter(o => o.activity?.id === 'research_seismic' || o.activity?.id.startsWith('project:'));
  if (new Set(projectWork.map(o => o.activity.id)).size !== projectWork.length) planIssues.push('Only one worker may advance each project this week.');
  if (projectWork.some(o => ['pause', 'interrupt'].includes(projectOrders[o.activity.id.replace('project:', '')]))) planIssues.push('Remove the assignment before pausing or interrupting its project.');
  if (supportCrew.length !== requiredSupport) planIssues.push(`Select exactly ${requiredSupport} support astronauts for this response.`);
  if (new Set(incidentCrew).size !== incidentCrew.length || orderedActivities.some(order => incidentCrew.includes(order.crewId))) planIssues.push('Each astronaut can perform only one main job this week.');
  for (const order of orderedActivities) if (!order.activity?.eligible_crew.find(c => c.crew_id === order.crewId)?.available) planIssues.push('An assignment is unavailable for its astronaut.');
  for (const [resource, cost] of Object.entries(weeklyCosts)) {
    const emergency = (resource === 'food' || resource === 'water') && livingCrew.every(c => rations[c.id]?.[resource] === 'emergency');
    if (cost > state.resources[resource] + 0.000001 && (!emergency || (actionCosts[resource] || 0) > state.resources[resource] + 0.000001)) planIssues.push(`Combined plan exceeds available ${resource.replace(/_/g, ' ')}.`);
  }

  return (
    <div className="app-container">
      <Header
        stationName={state.station_name}
        currentWeek={state.current_week}
        durationWeeks={state.duration_weeks}
        missionDays={state.mission_days}
        difficulty={state.difficulty}
      />

      {error && <div className="alert alert-danger">{error}</div>}
      {pendingTurn && !submitting && <div className="alert alert-warning">
        Week {pendingTurn.expected_week} has an unresolved submission. Your original decisions are saved and locked until retry resolves it.
      </div>}

      {/* Depletion or Emergency Alerts */}
      {state.depleted_provisions.length > 0 && (
        <div className="alert alert-danger">
          <strong>PROVISION DEPLETION:</strong> Station {state.depleted_provisions.join(' and ')} reserves are empty!
          Emergency rations must be enforced. Starvation/dehydration damage will occur.
        </div>
      )}

      <EnergyPanel forecast={state.energy.forecast} stored={state.energy.stored} capacity={state.energy.battery_capacity}
        demand={state.energy.life_support_required} priority={powerPriority} onPriorityChange={setPowerPriority}
        disabled={decisionLocked} solarDay={state.energy.solar_day_earth_days} sourceUrl={state.energy.source_url} assumption={state.energy.assumption} />

      <LifeSupportPanel systems={state.life_support} />

      {/* Station Systems & Efficiencies */}
      <ResearchObjectives objectives={state.science.objectives} science={state.science} />
      <StationOverview
        solarEfficiency={state.solar_efficiency}
        oxygenEfficiency={state.oxygen_efficiency}
      />

      {/* Resources Telemetry Bar */}
      <div className="resources-grid">
        <ResourceCard
          id="food"
          name="Food"
          value={state.resources.food || 0}
          unit="u"
          isWarning={state.resources.food < totalFoodNeeded}
          subtext={`Takes ~${totalFoodNeeded.toFixed(1)}u/wk`}
        />
        <ResourceCard
          id="water"
          name="Water"
          value={state.resources.water || 0}
          unit="u"
          isWarning={state.resources.water < totalWaterNeeded}
          subtext={`Takes ~${totalWaterNeeded.toFixed(1)}u/wk`}
        />
        <ResourceCard
          id="oxygen"
          name="Oxygen"
          value={state.resources.oxygen || 0}
          unit="u"
          isWarning={state.resources.oxygen < 10}
        />
        <ResourceCard
          id="electricity"
          name="Power"
          value={state.resources.electricity || 0}
          unit="u"
          isWarning={state.resources.electricity < 10}
        />
        <ResourceCard
          id="medicine"
          name="Medicine"
          value={state.resources.medicine || 0}
          unit="kits"
        />
        <ResourceCard
          id="repair_kits"
          name="Repair Kits"
          value={state.resources.repair_kits || 0}
          unit="kits"
        />
        <ResourceCard
          id="eva_batteries"
          name="EVA Packs"
          value={state.resources.eva_batteries || 0}
          unit="packs"
        />
      </div>

      {/* Weekly Narrative Event Dilemma */}
      <div className="resources-grid" aria-label="Equipment and research">
        {[['dust_kits', 'Dust kits'], ['oxygen_regulators', 'Oxygen regulators'], ['diagnostic_tools', 'Diagnostic scanners'], ['sealant_packs', 'Sealant packs'], ['scientific_tools', 'Science kits'], ['research_data', 'Research data']].map(([id, name]) =>
          <ResourceCard key={id} id={id} name={name} value={state.resources[id] || 0} unit={id === 'research_data' ? 'points' : 'units'} />)}
      </div>
      {state.current_event ? (
        <EventCard
          event={state.current_event}
          selectedChoiceId={selectedChoiceId}
          selectedCrewId={selectedCrewId}
          onSelectChoice={handleSelectChoice}
          onSelectCrew={(crewId) => { setSelectedCrewId(crewId); setSupportCrew([]); }}
          disabled={decisionLocked}
        />
      ) : (
        <div className="card" style={{ marginBottom: '1.5rem', textAlign: 'center', padding: '2rem' }}>
          <div style={{ color: 'var(--color-green)', fontSize: '1.1rem', fontWeight: 700 }}>
            ✓ ALL CRITICAL SYSTEMS REPORT STABLE THIS WEEK
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            No unexpected equipment failures or anomalies detected.
          </p>
        </div>
      )}

      <ResearchProjects projects={state.research_projects} orders={projectOrders} disabled={decisionLocked} onChange={setProjectOrders} />

      <section className="card" aria-label="Crew assignments" style={{ marginBottom: '1.5rem' }}>
        <h2>Crew assignments</h2>
        <p>One main job per astronaut. Manual assignments take one week; unassigned crew perform routine duties. Incident crew cannot take another assignment.</p>
        {activeChoice?.requires_crew && requiredSupport > 0 && <fieldset disabled={decisionLocked}>
          <legend>Incident support crew: {supportCrew.length} / {requiredSupport}</legend>
          {livingCrew.filter(c => c.id !== selectedCrewId).map(c => <label key={c.id} style={{ marginRight: '1rem' }}>
            <input type="checkbox" checked={supportCrew.includes(c.id)} onChange={e => setSupportCrew(prev => e.target.checked ? [...prev, c.id] : prev.filter(id => id !== c.id))} /> {c.name}
          </label>)}
        </fieldset>}
        {livingCrew.map(crew => <div key={crew.id} style={{ margin: '0.75rem 0' }}>
          <label htmlFor={`work-${crew.id}`}>{crew.name} - {incidentCrew.includes(crew.id) ? 'Incident response' : 'Available for work'}</label>{' '}
          <select id={`work-${crew.id}`} aria-label={`Assignment for ${crew.name}`} disabled={decisionLocked} value={assignments[crew.id] || ''} onChange={e => setAssignments(prev => ({...prev, [crew.id]: e.target.value}))}>
            <option value="">Routine duties</option>
            {state.assignment_options.map(activity => {
              const candidate = activity.eligible_crew.find(c => c.crew_id === crew.id);
              return <option key={activity.id} value={activity.id} disabled={!candidate?.available || incidentCrew.includes(crew.id)}>
                {activity.text} - {Math.round((candidate?.success_probability || 0) * 100)}%{!candidate?.available ? ` (${candidate?.unavailable_reasons.join(' ')})` : ''}
              </option>;
            })}
          </select>
        </div>)}
        <details><summary>Assignment requirements and costs</summary>
          {state.assignment_options.map(activity => <div key={activity.id}><h3>{activity.text}</h3><p>{activity.description}</p><p>Costs: {Object.entries(activity.costs).map(([id, value]) => `${value} ${id.replace(/_/g, ' ')}`).join(', ')}. Equipment retained: {Object.entries(activity.required_items).map(([id, value]) => `${value} ${id.replace(/_/g, ' ')}`).join(', ') || 'none'}.</p>{activity.objective_rewards.map(g => <p key={g.objective_id}>On success: +{g.amount} toward {g.title} (capped at target).</p>)}</div>)}
        </details>
        <p>Automatic recording may additionally use {automaticProjectPower} power after action effects and solar generation, under your selected priority. Shortages skip recording without charging.</p>
        <p>Projected spending (rations and all actions): {Object.entries(weeklyCosts).map(([id, amount]) => `${amount.toFixed(1)} ${id.replace(/_/g, ' ')}`).join(' | ')}. Generation and outcome effects apply afterward.</p>
        {planIssues.map(issue => <p key={issue} role="alert">{issue}</p>)}
      </section>

      {/* Crew Health & Rationing Section */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-title">
          <span>👨‍🚀 EXPEDITION CREW STATUS & WEEKLY RATIONS</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setAllRations('normal')}
              disabled={decisionLocked}
            >
              ALL NORMAL
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setAllRations('reduced')}
              disabled={decisionLocked}
            >
              ALL REDUCED
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setAllRations('emergency')}
              disabled={decisionLocked}
            >
              ALL EMERGENCY
            </button>
          </div>
        </div>

        <div className="crew-grid">
          {state.crew.map((crew) => (
            <CrewCard
              key={crew.id}
              crew={crew}
              rations={rations[crew.id]}
              onRationChange={handleRationChange}
              disabled={decisionLocked}
            />
          ))}
        </div>
      </div>

      {/* End Turn Authorization Panel */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="card-title">
          <span>📋 WEEK {state.current_week} DECISION SUMMARY</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Authoritative Turn Commit
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
          <div style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)' }}>
            <div>
              <strong>Action:</strong> {activeChoice?.text || 'Standard Operations'}{' '}
              {activeChoice?.requires_crew && (
                <span style={{ color: 'var(--color-cyan)' }}>
                  (Assigned: {selectedCrewId ? selectedCrewId.toUpperCase() : 'None'})
                </span>
              )}
            </div>
            <div>
              <strong>Weekly Consumption:</strong> Food ~{totalFoodNeeded.toFixed(1)}u | Water ~{totalWaterNeeded.toFixed(1)}u
            </div>
          </div>

          <button
            type="button"
            className="btn btn-primary btn-lg"
            onClick={handleSubmitTurn}
            disabled={submitting || state.status !== 'running' || (!pendingTurn && (planIssues.length > 0 || !activeChoice?.available || (activeChoice.requires_crew && !selectedCrewId)))}
          >
            {submitting ? 'PROCESSING WEEK...' : pendingTurn ? `Retry week ${pendingTurn.expected_week} submission` : `SUBMIT WEEK ${state.current_week} DECISIONS →`}
          </button>
        </div>
      </div>

      {/* Modal for Turn Outcome debrief */}
      {showOutcomeModal && latestOutcome && (
        <TurnOutcomeModal
          outcome={latestOutcome}
          onClose={() => setShowOutcomeModal(false)}
          isMissionEnded={state.status !== 'running'}
          onNavigateToResults={() => navigate(`/results/${gameId}`)}
          crewNames={Object.fromEntries(state.crew.map((crew) => [crew.id, crew.name]))}
        />
      )}

      <footer className="app-footer">
        NASA Space Apps Challenge 2026 — Station Alpha Mission Simulator
      </footer>
    </div>
  );
};
