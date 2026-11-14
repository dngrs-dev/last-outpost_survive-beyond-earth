import React from 'react';

interface StationOverviewProps {
  solarEfficiency: number;
  oxygenEfficiency: number;
}

export const StationOverview: React.FC<StationOverviewProps> = ({
  solarEfficiency,
  oxygenEfficiency,
}) => {
  const solarPct = Math.round(solarEfficiency * 100);
  const oxygenPct = Math.round(oxygenEfficiency * 100);

  const getProgressColor = (pct: number) => {
    if (pct >= 80) return 'progress-fill-green';
    if (pct >= 50) return 'progress-fill-amber';
    return 'progress-fill-red';
  };

  const getStatusBadge = (pct: number) => {
    if (pct >= 80) return <span className="badge badge-green">OPTIMAL</span>;
    if (pct >= 50) return <span className="badge badge-amber">DEGRADED</span>;
    return <span className="badge badge-red">CRITICAL</span>;
  };

  return (
    <div className="systems-grid">
      <div className="system-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>
            ☀️ SOLAR POWER ARRAY
          </span>
          {getStatusBadge(solarPct)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Output Efficiency:</span>
          <span style={{ fontWeight: 700, color: '#fff' }}>{solarPct}%</span>
        </div>
        <div className="progress-container">
          <div
            className={`progress-fill ${getProgressColor(solarPct)}`}
            style={{ width: `${Math.min(100, Math.max(0, solarPct))}%` }}
          />
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
          Generates electricity based on efficiency. Powers station life support.
        </div>
      </div>

      <div className="system-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff' }}>
            💨 LIFE SUPPORT OXYGEN SYSTEM
          </span>
          {getStatusBadge(oxygenPct)}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>Generation Efficiency:</span>
          <span style={{ fontWeight: 700, color: '#fff' }}>{oxygenPct}%</span>
        </div>
        <div className="progress-container">
          <div
            className={`progress-fill ${getProgressColor(oxygenPct)}`}
            style={{ width: `${Math.min(100, Math.max(0, oxygenPct))}%` }}
          />
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.3rem' }}>
          Converts water and electricity into breathable oxygen for the crew.
        </div>
      </div>
    </div>
  );
};
