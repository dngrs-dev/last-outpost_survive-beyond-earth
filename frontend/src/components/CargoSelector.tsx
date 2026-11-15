import { useState } from 'react';
import { ItemIcon } from './ItemIcon';
import type { ItemDefinition } from '../types/game';
import styles from './CargoSelector.module.css';

const FILTERS = [
  { id: 'all', label: 'All cargo' },
  { id: 'provisions', label: 'Supplies' },
  { id: 'equipment', label: 'Tools' },
  { id: 'maintenance', label: 'Repairs' },
];

export function CargoSelector({
  items,
  cargo,
  onChangeCargo,
  onInspectItem,
  onStarter,
  onClear,
  disabled = false,
}: {
  items: ItemDefinition[];
  cargo: Record<string, number>;
  onChangeCargo: (id: string, quantity: number) => void;
  onInspectItem: (item: ItemDefinition) => void;
  onStarter: () => void;
  onClear: () => void;
  disabled?: boolean;
}) {
  const [filter, setFilter] = useState('all');
  const shown = items.filter(
    (item) => filter === 'all' || item.category === filter
  );
  return (
    <section className={styles.panel} aria-label="Cargo selection">
      <div className={styles.toolbar}>
        <div>
          <h2>Choose your cargo</h2>
          <p>Pack what your crew needs. Tap an item to learn more.</p>
        </div>
        <div className={styles.presets}>
          <button type="button" disabled={disabled} onClick={onStarter}>
            Starter pack
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onClear}
            aria-label="Empty cargo"
          >
            Empty
          </button>
        </div>
      </div>
      <div className={styles.filters} role="group" aria-label="Filter cargo">
        {FILTERS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            disabled={disabled}
            aria-pressed={filter === entry.id}
            onClick={() => setFilter(entry.id)}
          >
            {entry.label}
            <span>
              {
                items.filter(
                  (item) => entry.id === 'all' || item.category === entry.id
                ).length
              }
            </span>
          </button>
        ))}
      </div>
      <div className={styles.grid}>
        {shown.map((item) => {
          const quantity = cargo[item.id] || 0;
          return (
            <article
              key={item.id}
              className={styles.item}
              data-packed={quantity > 0}
            >
              <button
                type="button"
                className={styles.inspect}
                aria-label={`About ${item.name}`}
                onClick={() => onInspectItem(item)}
                disabled={disabled}
              >
                <ItemIcon id={item.id} />
                <h3>{item.name}</h3>
                {quantity > 0 && (
                  <span className={styles.packed} aria-label="Packed">
                    &#10003;
                  </span>
                )}
                {item.max_quantity === 1 && (
                  <span className={styles.single}>MAX 1</span>
                )}
              </button>
              <p className={styles.cost}>
                {item.weight_kg} kg <span /> {item.volume_l} L each
              </p>
              <div className={styles.quantity}>
                <button
                  type="button"
                  aria-label={`Decrease ${item.name}`}
                  disabled={disabled || quantity <= 0}
                  onClick={() =>
                    onChangeCargo(item.id, Math.max(0, quantity - 1))
                  }
                >
                  &#8722;
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  aria-label={`${item.name} quantity`}
                  min={0}
                  max={item.max_quantity}
                  step={1}
                  value={quantity}
                  disabled={disabled}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    onChangeCargo(
                      item.id,
                      Number.isFinite(value)
                        ? Math.min(
                            item.max_quantity,
                            Math.max(0, Math.floor(value))
                          )
                        : 0
                    );
                  }}
                />
                <button
                  type="button"
                  aria-label={`Increase ${item.name}`}
                  disabled={disabled || quantity >= item.max_quantity}
                  onClick={() =>
                    onChangeCargo(
                      item.id,
                      Math.min(item.max_quantity, quantity + 1)
                    )
                  }
                >
                  +
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
