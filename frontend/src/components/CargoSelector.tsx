import React from 'react';
import type { CatalogLimits, ItemDefinition } from '../types/game';

interface CargoSelectorProps {
  items: ItemDefinition[];
  limits: CatalogLimits;
  cargo: Record<string, number>;
  onChangeCargo: (itemId: string, quantity: number) => void;
  disabled?: boolean;
}

export const CargoSelector: React.FC<CargoSelectorProps> = ({
  items,
  limits,
  cargo,
  onChangeCargo,
  disabled = false,
}) => {
  // Calculate total mass and volume
  const totalMass = items.reduce((acc, item) => {
    return acc + item.weight_kg * (cargo[item.id] || 0);
  }, 0);

  const totalVolume = items.reduce((acc, item) => {
    return acc + item.volume_l * (cargo[item.id] || 0);
  }, 0);

  const maxMass = limits.max_cargo_mass_kg || 500;
  const maxVolume = limits.max_cargo_volume_l || 450;

  const isMassOver = totalMass > maxMass;
  const isVolumeOver = totalVolume > maxVolume;

  const massPct = Math.min(100, (totalMass / maxMass) * 100);
  const volumePct = Math.min(100, (totalVolume / maxVolume) * 100);

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div className="card-title">
        <span>📦 SPACECRAFT CARGO MANIFEST</span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          NASA Payload Restrictions Apply
        </span>
      </div>

      {/* Capacity Indicators */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
        {/* Mass */}
        <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--border-radius)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Total Payload Mass:</span>
            <span style={{ fontWeight: 700, color: isMassOver ? 'var(--color-red)' : '#fff' }}>
              {totalMass.toFixed(1)} / {maxMass} kg
            </span>
          </div>
          <div className="progress-container">
            <div
              className={`progress-fill ${isMassOver ? 'progress-fill-red' : 'progress-fill-cyan'}`}
              style={{ width: `${massPct}%` }}
            />
          </div>
          {isMassOver && (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-red)' }}>
              ⚠️ Maximum mass exceeded!
            </div>
          )}
        </div>

        {/* Volume */}
        <div style={{ background: 'var(--bg-secondary)', padding: '0.75rem', borderRadius: 'var(--border-radius)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Total Cargo Volume:</span>
            <span style={{ fontWeight: 700, color: isVolumeOver ? 'var(--color-red)' : '#fff' }}>
              {totalVolume.toFixed(1)} / {maxVolume} L
            </span>
          </div>
          <div className="progress-container">
            <div
              className={`progress-fill ${isVolumeOver ? 'progress-fill-red' : 'progress-fill-cyan'}`}
              style={{ width: `${volumePct}%` }}
            />
          </div>
          {isVolumeOver && (
            <div style={{ fontSize: '0.75rem', color: 'var(--color-red)' }}>
              ⚠️ Maximum volume exceeded!
            </div>
          )}
        </div>
      </div>

      {/* Items Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
        {items.map((item) => {
          const qty = cargo[item.id] || 0;
          return (
            <div
              key={item.id}
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                borderRadius: 'var(--border-radius)',
                padding: '0.75rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', color: '#fff' }}>
                  {item.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {item.description}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', marginTop: '0.2rem' }}>
                  {item.weight_kg} kg | {item.volume_l} L each
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={qty <= 0 || disabled}
                  onClick={() => onChangeCargo(item.id, Math.max(0, qty - 1))}
                  style={{ width: '32px', height: '32px', padding: 0 }}
                  aria-label={`Decrease ${item.name}`}
                >
                  −
                </button>
                <input
                  type="number"
                  min="0"
                  max="1000"
                  value={qty}
                  disabled={disabled}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    onChangeCargo(item.id, isNaN(val) ? 0 : Math.max(0, val));
                  }}
                  style={{ width: '50px', textAlign: 'center', padding: '0.3rem' }}
                  aria-label={`${item.name} quantity`}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={disabled}
                  onClick={() => onChangeCargo(item.id, qty + 1)}
                  style={{ width: '32px', height: '32px', padding: 0 }}
                  aria-label={`Increase ${item.name}`}
                >
                  +
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
