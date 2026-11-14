import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchGameState } from '../api/game';
import { Header } from '../components/Header';
import { ResourceCard } from '../components/ResourceCard';
import { StationOverview } from '../components/StationOverview';
import { TurnDetails } from '../components/TurnDetails';
import type { GameStateResponse } from '../types/game';

export const ResultsPage: React.FC = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();

  const [state, setState] = useState<GameStateResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) return;
    let mounted = true;
    setLoading(true);
    setState(null);
    setError(null);

    fetchGameState(gameId)
      .then((game) => {
        if (!mounted) return;
        if (game.state.status === 'running') {
          navigate(`/game/${gameId}`, { replace: true });
          return;
        }
        setState(game.state);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || 'Failed to retrieve mission debrief.');
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [gameId, navigate]);

  if (loading) {
    return (
      <div className="app-container">
        <Header />
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-cyan)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📋</div>
          <div>TRANSMITTING FINAL ROTATION REPORT TO MISSION CONTROL...</div>
        </div>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="app-container">
        <Header />
        <div className="alert alert-danger">{error || 'Debrief telemetry unavailable.'}</div>
        <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>
          Return to mission preparation
        </button>
      </div>
    );
  }

  const ending = state.ending;
  const livingCrew = state.crew.filter((c) => c.alive);

  const getEndingDetails = () => {
    switch (ending) {
      case 'perfect_handover':
        return {
          title: 'PERFECT HANDOVER',
          subtitle: 'FLAWLESS LUNAR EXPEDITION',
          badgeClass: 'badge-green',
          borderClass: 'var(--color-green)',
          desc: 'Outstanding performance! All crew members survived in robust health. Station Alpha systems remain at peak efficiency with abundant reserves for the incoming expedition crew.',
        };
      case 'successful_handover':
        return {
          title: 'SUCCESSFUL HANDOVER',
          subtitle: 'MISSION OBJECTIVES ACHIEVED',
          badgeClass: 'badge-green',
          borderClass: 'var(--color-cyan)',
          desc: 'Well done! The expedition crew maintained Station Alpha through hazardous lunar conditions until the replacement crew arrived.',
        };
      case 'emergency_handover':
        return {
          title: 'EMERGENCY HANDOVER',
          subtitle: 'SURVIVAL AT GREAT COST',
          badgeClass: 'badge-amber',
          borderClass: 'var(--color-amber)',
          desc: 'The rotation craft touched down in the nick of time. Severe equipment degradation and depleted reserves left the outpost on the brink of total collapse.',
        };
      case 'mission_failure':
      default:
        return {
          title: 'MISSION FAILURE',
          subtitle: 'STATION ALPHA LOST',
          badgeClass: 'badge-red',
          borderClass: 'var(--color-red)',
          desc: state.results?.failure_reason || state.flags.failure_reason || 'Station Alpha life support or all expedition astronauts were lost on the lunar surface.',
        };
    }
  };

  const details = getEndingDetails();

  return (
    <div className="app-container">
      <Header
        stationName={state.station_name}
        currentWeek={state.current_week}
        durationWeeks={state.duration_weeks}
      />

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Outcome Banner */}
      <div
        className="card"
        style={{
          border: `2px solid ${details.borderClass}`,
          marginBottom: '1.5rem',
          padding: '2rem',
          textAlign: 'center',
          boxShadow: `0 0 30px ${details.borderClass}33`,
        }}
      >
        <span className={`badge ${details.badgeClass}`} style={{ fontSize: '0.9rem', marginBottom: '0.75rem' }}>
          {details.subtitle}
        </span>
        <h1
          style={{
            fontSize: '2.4rem',
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '2px',
            marginBottom: '0.5rem',
          }}
        >
          {details.title}
        </h1>
        <p
          style={{
            fontSize: '1.05rem',
            color: 'var(--text-main)',
            maxWidth: '750px',
            margin: '0 auto 1.5rem auto',
            lineHeight: 1.6,
          }}
        >
          {details.desc}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>WEEKS SURVIVED</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>
              {state.weeks_completed} / {state.duration_weeks}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>CREW SURVIVAL</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 700, color: '#34d399' }}>
              {livingCrew.length} / {state.initial_crew_size}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>STATION SOLAR ARRAY</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>
              {Math.round(state.solar_efficiency * 100)}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>LIFE SUPPORT EFFICIENCY</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>
              {Math.round(state.oxygen_efficiency * 100)}%
            </div>
          </div>
        </div>
      </div>

      {/* Final Outpost Status */}
      <StationOverview
        solarEfficiency={state.solar_efficiency}
        oxygenEfficiency={state.oxygen_efficiency}
      />

      {/* Remaining Resources */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-title">
          <span>📦 FINAL OUTPOST RESERVES</span>
        </div>
        <div className="resources-grid" style={{ marginBottom: 0 }}>
          <ResourceCard id="research_data" name="Research data" value={state.resources.research_data || 0} unit="points" />
          <ResourceCard id="food" name="Food" value={state.resources.food || 0} unit="u" />
          <ResourceCard id="water" name="Water" value={state.resources.water || 0} unit="u" />
          <ResourceCard id="oxygen" name="Oxygen" value={state.resources.oxygen || 0} unit="u" />
          <ResourceCard id="electricity" name="Power" value={state.resources.electricity || 0} unit="u" />
          <ResourceCard id="medicine" name="Medicine" value={state.resources.medicine || 0} unit="kits" />
          <ResourceCard id="repair_kits" name="Repair Kits" value={state.resources.repair_kits || 0} unit="kits" />
          <ResourceCard id="eva_batteries" name="EVA Packs" value={state.resources.eva_batteries || 0} unit="packs" />
        </div>
      </div>

      {/* Crew Debriefing */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div className="card-title">
          <span>👨‍🚀 EXPEDITION CREW DEBRIEF</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {state.crew.map((member) => (
            <div
              key={member.id}
              style={{
                background: 'var(--bg-secondary)',
                padding: '1rem',
                borderRadius: 'var(--border-radius)',
                border: member.alive ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(239,68,68,0.3)',
                opacity: member.alive ? 1 : 0.6,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <span style={{ fontWeight: 700, color: '#fff' }}>{member.name}</span>
                <span className={`badge ${member.alive ? 'badge-green' : 'badge-red'}`}>
                  {member.alive ? `${member.health}% HP` : 'DECEASED'}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-cyan)', textTransform: 'uppercase' }}>
                {member.role}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
                {member.positive_trait}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Mission Chronicle / Turn History */}
      {state.history && state.history.length > 0 && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-title">
            <span>📜 MISSION CHRONICLE</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Weekly Decision Log
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {state.history.map((entry) => {
              const isSuccess = entry.event?.success;
              return (
                <div
                  key={entry.week}
                  style={{
                    background: 'var(--bg-secondary)',
                    borderRadius: 'var(--border-radius)',
                    padding: '0.75rem 1rem',
                    borderLeft: `4px solid ${isSuccess ? 'var(--color-green)' : 'var(--color-red)'}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, color: '#fff' }}>
                      WEEK {entry.week}: {entry.event?.choice_text || entry.event?.choice_id}
                    </span>
                    <span className={`badge ${isSuccess ? 'badge-green' : 'badge-red'}`}>
                      {isSuccess ? 'SUCCESS' : 'FAILURE'}
                    </span>
                  </div>

                  <details>
                    <summary>View consequences</summary>
                    <TurnDetails outcome={entry} crewNames={Object.fromEntries(state.crew.map((c) => [c.id, c.name]))} />
                  </details>

                  {entry.deaths && entry.deaths.length > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-red)' }}>
                      ⚠️ Fatalities: {entry.deaths.join(', ').toUpperCase()}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Restart / Replay Controls */}
      <div style={{ display: 'flex', justifyContent: 'center', margin: '2rem 0' }}>
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={() => navigate('/')}
        >
          START NEW EXPEDITION →
        </button>
      </div>

      <footer className="app-footer">
        NASA Space Apps Challenge 2026 — Station Alpha Mission Simulator
      </footer>
    </div>
  );
};
