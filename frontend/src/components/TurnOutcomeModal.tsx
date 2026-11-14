import React from 'react';
import type { TurnOutcome } from '../types/game';
import { TurnDetails } from './TurnDetails';

interface TurnOutcomeModalProps {
  outcome: TurnOutcome;
  onClose: () => void;
  isMissionEnded: boolean;
  onNavigateToResults: () => void;
  crewNames: Record<string, string>;
}

export const TurnOutcomeModal: React.FC<TurnOutcomeModalProps> = ({
  outcome,
  onClose,
  isMissionEnded,
  onNavigateToResults,
  crewNames,
}) => {
  const isEventSuccess = outcome.event?.success;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff' }}>
            WEEK {outcome.week} DEBRIEF
          </h2>
          {isMissionEnded ? (
            <span className="badge badge-amber">MISSION CONCLUDED</span>
          ) : (
            <span className="badge badge-cyan">STATUS UPDATE</span>
          )}
        </div>

        {/* Event Resolution */}
        <div
          style={{
            padding: '1rem',
            borderRadius: 'var(--border-radius)',
            backgroundColor: isEventSuccess
              ? 'var(--color-green-dim)'
              : 'var(--color-red-dim)',
            border: `1px solid ${
              isEventSuccess ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)'
            }`,
            marginBottom: '1rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <span style={{ fontWeight: 700, fontSize: '1.1rem', color: isEventSuccess ? '#34d399' : '#f87171' }}>
              {isEventSuccess ? '✓ ACTION SUCCESSFUL' : '✗ ACTION FAILED'}
            </span>
            <span style={{ fontSize: '0.85rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              Choice: {outcome.event?.choice_text || outcome.event?.choice_id}
            </span>
          </div>

          <p style={{ fontSize: '0.9rem', color: '#fff' }}>
            {outcome.event.selected_crew_id && `Assigned: ${crewNames[outcome.event.selected_crew_id] || outcome.event.selected_crew_id}. `}
            Success probability: {Math.round(outcome.event.success_probability * 100)}%.
          </p>
        </div>

        {/* Casualties / Deaths */}
        {outcome.deaths && outcome.deaths.length > 0 && (
          <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
            <strong>CRITICAL LOSS:</strong>{' '}
            {outcome.deaths.map((d) => `Astronaut ${d.toUpperCase()}`).join(', ')} did not survive this week.
          </div>
        )}

        {/* Weekly Resource & Survival Breakdown */}
        <div
          style={{
            backgroundColor: 'var(--bg-secondary)',
            padding: '1rem',
            borderRadius: 'var(--border-radius)',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
            fontFamily: 'var(--font-mono)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div style={{ fontWeight: 700, color: 'var(--color-cyan)', fontSize: '0.9rem' }}>
            WEEKLY RESOURCE TELEMETRY:
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem' }}>
            {Object.entries(outcome.resource_changes || {}).map(([res, change]) => {
              const formatted = change > 0 ? `+${change}` : `${change}`;
              const color = change > 0 ? '#34d399' : change < 0 ? '#f87171' : 'var(--text-dim)';
              return (
                <div key={res} style={{ padding: '0.3rem', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{res}: </span>
                  <span style={{ color, fontWeight: 700 }}>{formatted}</span>
                </div>
              );
            })}
          </div>

          <TurnDetails outcome={outcome} crewNames={crewNames} />
        </div>

        {/* Action Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
          {isMissionEnded ? (
            <button
              type="button"
              className="btn btn-primary btn-lg"
              onClick={onNavigateToResults}
            >
              VIEW FINAL MISSION RESULTS →
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={onClose}
            >
              PROCEED TO WEEK {outcome.week + 1} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
