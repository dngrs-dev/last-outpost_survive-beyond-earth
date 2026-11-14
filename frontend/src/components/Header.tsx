import React from 'react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  stationName?: string;
  currentWeek?: number;
  durationWeeks?: number;
  missionDays?: { start: number; end: number };
  difficulty?: string;
}

export const Header: React.FC<HeaderProps> = ({
  stationName,
  currentWeek,
  durationWeeks = 12,
  missionDays,
  difficulty,
}) => {
  return (
    <header className="app-header">
      <Link to="/" className="header-brand">
        <div className="header-logo">▲</div>
        <div>
          <div className="brand-title">
            LAST OUTPOST
            <span className="brand-badge">LUNA</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Lunar Survival Mission Simulator
          </div>
        </div>
      </Link>

      <div className="header-meta">
        <Link to="/moon/" style={{ color: 'var(--color-cyan)', marginRight: '1rem', fontSize: '0.8rem' }}>Explore the Moon ↗</Link>
        {currentWeek !== undefined ? (
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>
                WEEK {currentWeek} / {durationWeeks}
              </div>
              {missionDays && (
                <div style={{ fontSize: '0.75rem', color: 'var(--color-cyan)' }}>
                  MISSION DAYS {missionDays.start}–{missionDays.end}
                </div>
              )}
            </div>
            {stationName && <span className="badge badge-cyan">{stationName}</span>}
            {difficulty && <span className="badge badge-neutral">{difficulty}</span>}
          </div>
        ) : (
          <span className="badge badge-neutral">MISSION PREPARATION</span>
        )}
      </div>
    </header>
  );
};
