import React from 'react';
import type { CrewResponse, RationLevel, RationRequest } from '../types/game';

interface CrewCardProps {
  crew: CrewResponse;
  isInteractive?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  rations?: RationRequest;
  onRationChange?: (crewId: string, resource: 'food' | 'water', level: RationLevel) => void;
  disabled?: boolean;
}

const ROLE_ICONS: Record<string, string> = {
  engineer: '🛠️',
  medic: '🩺',
  scientist: '🔬',
  technician: '⚙️',
  botanist: '🌱',
  commander: '🎖️',
};

export const CrewCard: React.FC<CrewCardProps> = ({
  crew,
  isInteractive = false,
  isSelected = false,
  onToggleSelect,
  rations,
  onRationChange,
  disabled = false,
}) => {
  const icon = ROLE_ICONS[crew.role.toLowerCase()] || '👨‍🚀';

  const getHealthColor = (hp: number) => {
    if (hp >= 70) return 'progress-fill-green';
    if (hp >= 35) return 'progress-fill-amber';
    return 'progress-fill-red';
  };

  const getHealthBadge = (hp: number, alive: boolean) => {
    if (!alive) return <span className="badge badge-red">DECEASED</span>;
    if (hp >= 70) return <span className="badge badge-green">{hp}% HP</span>;
    if (hp >= 35) return <span className="badge badge-amber">{hp}% HP</span>;
    return <span className="badge badge-red">{hp}% HP</span>;
  };

  const cardClasses = [
    'crew-card',
    !crew.alive ? 'deceased' : '',
    isSelected ? 'selected' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cardClasses}
      onClick={() => isInteractive && onToggleSelect && onToggleSelect(crew.id)}
      style={{ cursor: isInteractive ? 'pointer' : 'default' }}
    >
      <div className="crew-header">
        <div className="crew-avatar">{icon}</div>
        <div className="crew-info">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="crew-name">{crew.name}</span>
            {getHealthBadge(crew.health, crew.alive)}
          </div>
          <div className="crew-role">{crew.role}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{crew.specialty}</div>
        </div>
      </div>

      {crew.alive && (
        <div className="progress-container" style={{ margin: 0 }}>
          <div
            className={`progress-fill ${getHealthColor(crew.health)}`}
            style={{ width: `${Math.max(0, crew.health)}%` }}
          />
        </div>
      )}

      <div className="crew-traits">
        <div className="trait-pos">✦ {crew.positive_trait}</div>
        <div className="trait-neg">− {crew.negative_trait}</div>
      </div>

      {/* Gameplay Ration Selectors */}
      {crew.alive && rations && onRationChange && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            paddingTop: '0.5rem',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Food Ration */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              🍞 Food Ration:
            </label>
            <select
              value={rations.food}
              disabled={disabled}
              onChange={(e) =>
                onRationChange(crew.id, 'food', e.target.value as RationLevel)
              }
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
            >
              <option value="normal">
                Normal ({crew.ration_options?.normal?.food ?? 1}u)
              </option>
              <option value="reduced">
                Reduced ({crew.ration_options?.reduced?.food ?? 0.5}u)
              </option>
              <option value="emergency">
                Emergency ({crew.ration_options?.emergency?.food ?? 0}u)
              </option>
            </select>
          </div>

          {/* Water Ration */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              💧 Water Ration:
            </label>
            <select
              value={rations.water}
              disabled={disabled}
              onChange={(e) =>
                onRationChange(crew.id, 'water', e.target.value as RationLevel)
              }
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.8rem' }}
            >
              <option value="normal">
                Normal ({crew.ration_options?.normal?.water ?? 1}u)
              </option>
              <option value="reduced">
                Reduced ({crew.ration_options?.reduced?.water ?? 0.5}u)
              </option>
              <option value="emergency">
                Emergency ({crew.ration_options?.emergency?.water ?? 0}u)
              </option>
            </select>
          </div>

          {/* Shortage penalties indicators */}
          {(crew.food_shortage_weeks > 0 || crew.water_shortage_weeks > 0) && (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-amber)', display: 'flex', gap: '0.5rem' }}>
              {crew.food_shortage_weeks > 0 && (
                <span>⚠️ Food streak: {crew.food_shortage_weeks}w</span>
              )}
              {crew.water_shortage_weeks > 0 && (
                <span>⚠️ Water streak: {crew.water_shortage_weeks}w</span>
              )}
            </div>
          )}
        </div>
      )}

      {isInteractive && (
        <div style={{ marginTop: 'auto', paddingTop: '0.4rem', textAlign: 'right' }}>
          <span className={`badge ${isSelected ? 'badge-cyan' : 'badge-neutral'}`}>
            {isSelected ? '✓ SELECTED' : '+ CLICK TO SELECT'}
          </span>
        </div>
      )}
    </div>
  );
};
