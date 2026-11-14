import type { CrewDefinition } from '../types/game';
import styles from './CrewSlots.module.css';

interface Props {
  crew: CrewDefinition[];
  slots: string[];
  minCrew: number;
  maxCrew: number;
  disabled: boolean;
  onChange: (slots: string[]) => void;
}

export function CrewSlots({ crew, slots, minCrew, maxCrew, disabled, onChange }: Props) {
  const selected = slots.filter(Boolean).map((id) => crew.find((person) => person.id === id)!).filter(Boolean);
  const food = selected.reduce((total, person) => total + person.normal_ration_cost.food, 0);
  const water = selected.reduce((total, person) => total + person.normal_ration_cost.water, 0);
  const roles = new Set(selected.map((person) => person.role));
  return <section className="card" aria-label="Crew assignment" style={{ marginBottom: '1.5rem' }}>
    <div className="card-title"><span>ASSIGN EXPEDITION CREW</span><span>{selected.length} / {maxCrew} slots filled</span></div>
    <p className={styles.intro}>Choose {minCrew}–{maxCrew} astronauts from {crew.length} fictional specialists. Empty slots reduce consumption; specialties improve specific actions.</p>
    <div className={styles.slots}>
      {Array.from({ length: maxCrew }, (_, index) => {
        const person = crew.find((entry) => entry.id === slots[index]);
        return <article className={styles.slot} key={index} aria-label={`Crew slot ${index + 1}`}>
          <label htmlFor={`crew-slot-${index}`} className={styles.slotLabel}>SLOT {String(index + 1).padStart(2, '0')}</label>
          <select id={`crew-slot-${index}`} aria-label={`Crew slot ${index + 1}`} value={slots[index] || ''}
            disabled={disabled} onChange={(event) => {
              const updated = Array.from({ length: maxCrew }, (_, slot) => slots[slot] || '');
              updated[index] = event.target.value;
              if (event.target.value && updated.filter((id) => id === event.target.value).length > 1) return;
              onChange(updated);
            }}>
            <option value="">Empty slot</option>
            {crew.map((entry) => <option key={entry.id} value={entry.id}
              disabled={entry.id !== slots[index] && slots.includes(entry.id)}>{entry.name} / {entry.role}</option>)}
          </select>
          {person ? <>
            <div className={styles.identity}><span aria-hidden="true">{person.name.split(' ').map((part) => part[0]).join('')}</span><div><h3>{person.name}</h3><p>{person.specialty}</p></div></div>
            <p className={styles.positive}>{person.positive_trait}</p>
            <p className={styles.negative}>{person.negative_trait}</p>
            <p className={styles.demand}>Normal weekly rations: {person.normal_ration_cost.food} food / {person.normal_ration_cost.water} water</p>
            <details className={styles.context}><summary>Training inspiration</summary><p>Fictional character and game traits, informed by real astronaut training disciplines.</p><a href={person.training_source} target="_blank" rel="noreferrer">NASA training reference ↗</a></details>
          </> : <p className={styles.empty}>Assign a specialist or leave this seat empty.</p>}
        </article>;
      })}
    </div>
    <div className={styles.summary} aria-live="polite">
      <span>Normal weekly demand: <strong>{Number(food.toFixed(2))} food / {Number(water.toFixed(2))} water</strong></span>
      <span>Professions: {[...roles].join(', ') || 'none'}</span>
      {selected.length < minCrew && <span role="alert">This mission requires at least {minCrew} astronauts.</span>}
    </div>
  </section>;
}
