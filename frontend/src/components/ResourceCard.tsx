import React from 'react';

interface ResourceCardProps {
  id: string;
  name: string;
  value: number;
  unit?: string;
  isWarning?: boolean;
  subtext?: string;
}

const RESOURCE_ICONS: Record<string, string> = {
  food: '🍞',
  water: '💧',
  oxygen: '💨',
  electricity: '⚡',
  medicine: '💉',
  repair_kits: '🔧',
  eva_batteries: '🔋',
};

export const ResourceCard: React.FC<ResourceCardProps> = ({
  id,
  name,
  value,
  unit,
  isWarning = false,
  subtext,
}) => {
  const icon = RESOURCE_ICONS[id] || '📦';
  const displayVal = Math.round(value * 10) / 10;
  const warningClass = isWarning || value <= 0 ? 'warning' : '';

  return (
    <div className={`resource-card ${warningClass}`}>
      <div className="resource-header">
        <span>{icon} {name}</span>
        {isWarning && <span className="badge badge-red" style={{ fontSize: '0.65rem' }}>CRITICAL</span>}
      </div>
      <div className="resource-value">
        {displayVal}
        {unit && <span className="resource-unit">{unit}</span>}
      </div>
      {subtext && (
        <div style={{ fontSize: '0.7rem', color: isWarning ? 'var(--color-red)' : 'var(--text-dim)' }}>
          {subtext}
        </div>
      )}
    </div>
  );
};
