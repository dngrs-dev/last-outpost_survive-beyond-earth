import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchGameState, submitTurn } from '../api/game';
import { Header } from '../components/Header';
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
} from '../types/game';

export const GamePage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();

  const [state, setState] = useState<GameStateResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Turn decision state
  const [rations, setRations] = useState<Record<string, RationRequest>>({});
  const [selectedChoiceId, setSelectedChoiceId] = useState<string>('');
  const [selectedCrewId, setSelectedCrewId] = useState<string | null>(null);

  // Modal debrief state
  const [latestOutcome, setLatestOutcome] = useState<TurnOutcome | null>(null);
  const [showOutcomeModal, setShowOutcomeModal] = useState<boolean>(false);

  // Load game state
  useEffect(() => {
    if (!gameId) return;
    let mounted = true;

    fetchGameState(gameId)
      .then((game) => {
        if (!mounted) return;
        const current = game.state;
        setState(current);
        initializeTurnForm(current);
        setLoading(false);

        // If game already ended, redirect to results
        if (current.status !== 'running') {
          navigate(`/results/${gameId}`);
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
  }, [gameId, navigate]);

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

    // Default select the first available choice
    if (gameState.current_event) {
      const availableChoice = gameState.current_event.choices.find((c) => c.available);
      if (availableChoice) {
        setSelectedChoiceId(availableChoice.id);
        if (availableChoice.requires_crew) {
          const firstEligible = availableChoice.eligible_crew.find((c) => c.available);
          setSelectedCrewId(firstEligible ? firstEligible.crew_id : null);
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
    if (!state || !gameId || submitting) return;

    // Check choice requires crew
    const choice = state.current_event?.choices.find((c) => c.id === selectedChoiceId);
    if (choice?.requires_crew && !selectedCrewId) {
      setError('This action requires an astronaut assignment.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const requestId = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `turn-${state.current_week}-${Date.now()}`;

      const response = await submitTurn(gameId, {
        expected_week: state.current_week,
        request_id: requestId,
        rations,
        event_choice_id: selectedChoiceId,
        selected_crew_id: choice?.requires_crew ? selectedCrewId : null,
      });

      setLatestOutcome(response.turn_outcome);
      setShowOutcomeModal(true);
      setState(response.state);
      initializeTurnForm(response.state);
    } catch (err: any) {
      setError(err.message || 'Turn execution failed. Check resource availability.');
    } finally {
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
        <div className="alert alert-danger">Mission telemetry unavailable.</div>
      </div>
    );
  }

  const livingCrew = state.crew.filter((c) => c.alive);
  const activeChoice = state.current_event?.choices.find((c) => c.id === selectedChoiceId);

  // Compute estimated food and water consumption
  const totalFoodNeeded = livingCrew.reduce((acc, c) => {
    const level = rations[c.id]?.food || 'normal';
    return acc + (c.ration_options?.[level]?.food ?? 0);
  }, 0);

  const totalWaterNeeded = livingCrew.reduce((acc, c) => {
    const level = rations[c.id]?.water || 'normal';
    return acc + (c.ration_options?.[level]?.water ?? 0);
  }, 0);

  return (
    <div className="app-container">
      <Header
        stationName={state.station_name}
        currentWeek={state.current_week}
        durationWeeks={state.duration_weeks}
        missionDays={state.mission_days}
      />

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Depletion or Emergency Alerts */}
      {state.depleted_provisions.length > 0 && (
        <div className="alert alert-danger">
          <strong>PROVISION DEPLETION:</strong> Station {state.depleted_provisions.join(' and ')} reserves are empty!
          Emergency rations must be enforced. Starvation/dehydration damage will occur.
        </div>
      )}

      {/* Station Systems & Efficiencies */}
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
      {state.current_event ? (
        <EventCard
          event={state.current_event}
          selectedChoiceId={selectedChoiceId}
          selectedCrewId={selectedCrewId}
          onSelectChoice={handleSelectChoice}
          onSelectCrew={(crewId) => setSelectedCrewId(crewId)}
          disabled={submitting}
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

      {/* Crew Health & Rationing Section */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-title">
          <span>👨‍🚀 EXPEDITION CREW STATUS & WEEKLY RATIONS</span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setAllRations('normal')}
              disabled={submitting}
            >
              ALL NORMAL
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setAllRations('reduced')}
              disabled={submitting}
            >
              ALL REDUCED
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setAllRations('emergency')}
              disabled={submitting}
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
              disabled={submitting}
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
            disabled={submitting || (activeChoice?.requires_crew && !selectedCrewId)}
          >
            {submitting ? 'PROCESSING WEEK...' : `SUBMIT WEEK ${state.current_week} DECISIONS →`}
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
        />
      )}

      <footer className="app-footer">
        NASA Space Apps Challenge 2026 — Station Alpha Mission Simulator
      </footer>
    </div>
  );
};
