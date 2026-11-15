import type { CrewResponse, RationLevel, RationRequest } from '../../types/game';

const levels: RationLevel[] = ['normal', 'reduced', 'emergency'];

export function WeeklyRations({ crew, rations, disabled, onChange, onAll, food, water }: {
  crew: CrewResponse[]; rations: Record<string, RationRequest>; disabled: boolean;
  onChange: (id: string, resource: 'food' | 'water', level: RationLevel) => void;
  onAll: (level: RationLevel) => void; food: number; water: number;
}) {
  return <section aria-label="Weekly food and water">
    <h2>Food & water for the whole week</h2>
    <p>Normal rations support recovery. Cutting supplies saves stock but can weaken the crew over time.</p>
    <div className="station-ration-presets">{levels.map(level => <button key={level} type="button" disabled={disabled} className="btn btn-secondary" onClick={() => onAll(level)}>ALL {level.toUpperCase()}</button>)}</div>
    <p className="station-inset">Planned: <strong>{food.toFixed(2)} food</strong> and <strong>{water.toFixed(2)} water</strong>. Generation and uncertain outcomes are not included.</p>
    {crew.filter(person => person.alive).map(person => {
      const ration = rations[person.id];
      const foodOutlook = person.ration_outlook[ration?.food || 'normal'];
      const waterOutlook = person.ration_outlook[ration?.water || 'normal'];
      const damage = (foodOutlook?.food_damage || 0) + (waterOutlook?.water_damage || 0);
      return <article className="station-inset" key={person.id}><h3>{person.name}</h3>
        <p>Nutrition: {person.condition.nutrition_status}. Hydration: {person.condition.hydration_status}.</p>
        <div className="station-ration-fields">{(['food', 'water'] as const).map(resource => <label key={resource}>{resource === 'food' ? 'Food' : 'Water'}
          <select aria-label={`${resource === 'food' ? 'Food' : 'Water'} for ${person.name}`} disabled={disabled} value={ration?.[resource] || 'normal'} onChange={e => onChange(person.id, resource, e.target.value as RationLevel)}>
            {levels.map(level => <option key={level} value={level}>{level[0].toUpperCase() + level.slice(1)} ({person.ration_options[level]?.[resource] ?? 0}u)</option>)}
          </select>
        </label>)}</div>
        {damage >= person.health && <p role="alert" className="station-warning">Selected rations could be fatal this week, even without other hazards.</p>}
        <small>If fully funded: nutrition deficit {foodOutlook?.nutrition_deficit.toFixed(2)}, hydration deficit {waterOutlook?.hydration_deficit.toFixed(2)}; {damage} ration-related condition loss. Shortages can worsen this; rest may improve recovery.</small>
      </article>;
    })}
  </section>;
}
