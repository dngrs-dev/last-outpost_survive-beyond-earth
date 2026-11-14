import React from 'react';
import type { ChoiceResponse, EventResponse } from '../types/game';

interface EventCardProps {
  event: EventResponse;
  selectedChoiceId: string;
  selectedCrewId: string | null;
  onSelectChoice: (choiceId: string) => void;
  onSelectCrew: (crewId: string) => void;
  disabled?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  selectedChoiceId,
  selectedCrewId,
  onSelectChoice,
  onSelectCrew,
  disabled = false,
}) => {
  return (
    <div className="event-section">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 className="event-title">🚨 {event.title}</h2>
        <span className={`badge ${event.category === 'hazard' ? 'badge-amber' : 'badge-green'}`}>{event.category.toUpperCase()}</span>
      </div>

      <p className="event-desc">{event.description}</p>
      <details style={{ marginBottom: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        <summary>Science behind this scenario</summary>
        <p>{event.science_context}</p>
        <a href={event.source_url} target="_blank" rel="noreferrer">NASA reference ↗</a>
        <p>Scenario, frequency, costs, probabilities, and effects are fictional gameplay values.</p>
      </details>

      {/* Initial discovery effects */}
      {(Object.keys(event.on_start.resources).length > 0 || event.on_start.solar_efficiency !== 0 ||
        event.on_start.oxygen_efficiency !== 0 ||
        event.on_start.crew_health !== 0) && (
        <div className="alert alert-warning" style={{ marginBottom: '1rem' }}>
          <strong>Initial Impact:</strong>{' '}
          {Object.entries(event.on_start.resources).map(([resource, value]) => <span key={resource}>{resource.replace(/_/g, ' ')} {value > 0 ? '+' : ''}{value}. </span>)}
          {event.on_start.solar_efficiency !== 0 && (
            <span>
              Solar output {event.on_start.solar_efficiency > 0 ? '+' : ''}
              {Math.round(event.on_start.solar_efficiency * 100)}%.{' '}
            </span>
          )}
          {event.on_start.oxygen_efficiency !== 0 && (
            <span>
              Oxygen system {event.on_start.oxygen_efficiency > 0 ? '+' : ''}
              {Math.round(event.on_start.oxygen_efficiency * 100)}%.{' '}
            </span>
          )}
          {event.on_start.crew_health !== 0 && (
            <span>
              Crew health {event.on_start.crew_health > 0 ? '+' : ''}
              {event.on_start.crew_health} HP.{' '}
            </span>
          )}
        </div>
      )}

      <div style={{ fontWeight: 600, marginBottom: '0.75rem', color: '#fff', fontSize: '0.95rem' }}>
        INCIDENT RESPONSES:
      </div>

      <div className="choices-list">
        {event.choices.map((choice: ChoiceResponse) => {
          const isSelected = choice.id === selectedChoiceId;
          const isAvailable = choice.available;

          return (
            <div
              key={choice.id}
              className={`choice-option ${isSelected ? 'selected' : ''} ${
                !isAvailable ? 'unavailable' : ''
              }`}
              onClick={() => {
                if (isAvailable && !disabled) {
                  onSelectChoice(choice.id);
                }
              }}
            >
              <div className="choice-header">
                <span className="choice-text">
                  {isSelected ? '🔘 ' : '⚪ '} {choice.text}
                </span>
                <div className="choice-meta">
                  {choice.success_chance !== undefined && (
                    <span className="chance-tag">
                      Base Success: {Math.round(choice.success_chance * 100)}%
                    </span>
                  )}
                  {Object.entries(choice.costs).map(([res, amt]) => (
                    <span key={res} className="cost-tag">
                      −{amt} {res.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {choice.description}
                {choice.objective_rewards.map((reward) => <p key={reward.objective_id} style={{ color: 'var(--color-cyan)' }}>
                  On success: +{reward.amount} toward {reward.title}.
                </p>)}
              </div>

              {/* Show reasons if unavailable */}
              {!isAvailable && choice.unavailable_reasons.length > 0 && (
                <div style={{ fontSize: '0.8rem', color: 'var(--color-red)' }}>
                  ⚠️ Cannot choose: {choice.unavailable_reasons.join(', ')}
                </div>
              )}

              {/* Show astronaut selection when this choice requires crew and is selected */}
              {isSelected && choice.requires_crew && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.75rem',
                    backgroundColor: 'var(--bg-primary)',
                    borderRadius: 'var(--border-radius)',
                    border: '1px solid var(--color-cyan-border)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: 'var(--color-cyan)',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Select Astronaut for Task:
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {choice.eligible_crew.map((candidate) => {
                      const isCandidateSelected = selectedCrewId === candidate.crew_id;
                      const prob = Math.round(candidate.success_probability * 100);

                      return (
                        <button
                          key={candidate.crew_id}
                          type="button"
                          disabled={!candidate.available || disabled}
                          className={`btn ${
                            isCandidateSelected ? 'btn-primary' : 'btn-secondary'
                          }`}
                          style={{
                            justifyContent: 'space-between',
                            padding: '0.5rem 0.75rem',
                            fontSize: '0.85rem',
                          }}
                          onClick={() => onSelectCrew(candidate.crew_id)}
                        >
                          <span>
                            {isCandidateSelected ? '✓ ' : ''}
                            Astronaut {candidate.crew_id.toUpperCase()}
                          </span>
                          <span style={{ fontFamily: 'var(--font-mono)' }}>
                            {candidate.available
                              ? `${prob}% Success Rate`
                              : `Unavailable: ${candidate.unavailable_reasons.join(' ')}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
