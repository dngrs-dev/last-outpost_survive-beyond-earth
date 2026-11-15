import { AstronautAvatar } from './AstronautAvatar';
import { roleName } from './crewAppearance';
import type { CrewDefinition } from '../types/game';
import styles from './SelectedCrew.module.css';

export function SelectedCrew({
  crew,
  slots,
  minCrew,
  disabled,
  onEdit,
}: {
  crew: CrewDefinition[];
  slots: string[];
  minCrew: number;
  disabled: boolean;
  onEdit: () => void;
}) {
  const selected = slots.flatMap(
    (id) => crew.find((person) => person.id === id) || []
  );
  const food = selected.reduce(
    (sum, person) => sum + person.normal_ration_cost.food,
    0
  );
  const water = selected.reduce(
    (sum, person) => sum + person.normal_ration_cost.water,
    0
  );
  return (
    <section className={styles.panel} aria-label="Selected crew">
      <div className={styles.heading}>
        <h2>
          Your crew{' '}
          <span>
            {selected.length}/{slots.length}
          </span>
        </h2>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          disabled={disabled}
          onClick={onEdit}
        >
          Change crew
        </button>
      </div>
      <div className={styles.slots}>
        {slots.map((id, index) => {
          const person = crew.find((entry) => entry.id === id);
          return (
            <div key={index} className={styles.person}>
              {person ? (
                <>
                  <AstronautAvatar id={person.id} role={person.role} portrait />
                  <div>
                    <h3>{person.name}</h3>
                    <p>{roleName(person.role)}</p>
                  </div>
                </>
              ) : (
                <p>Seat {index + 1} / Empty</p>
              )}
            </div>
          );
        })}
      </div>
      <p className={styles.demand}>
        Normal weekly demand:{' '}
        <strong>
          {Number(food.toFixed(2))} food / {Number(water.toFixed(2))} water
        </strong>
      </p>
      {selected.length < minCrew && (
        <p role="alert">
          This mission requires at least {minCrew} astronauts. Change your crew
          before launching.
        </p>
      )}
    </section>
  );
}
