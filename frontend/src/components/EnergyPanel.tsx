import { useState } from 'react';
import type { SunlightWeek } from '../types/game';

interface Props {
  forecast: SunlightWeek[];
  stored: number;
  capacity: number;
  demand?: number;
  priority?: 'life_support' | 'research';
  onPriorityChange?: (priority: 'life_support' | 'research') => void;
  disabled?: boolean;
  solarDay: number;
  sourceUrl: string;
  assumption: string;
}

export function EnergyPanel({ forecast, stored, capacity, demand, priority, onPriorityChange, disabled, solarDay, sourceUrl, assumption }: Props) {
  const [showAll, setShowAll] = useState(false);
  return <section className="card" aria-label="Sunlight and energy" style={{ marginBottom: '1.5rem' }}>
    <h2>Sunlight and energy</h2>
    <p>NASA-based timing; battery sizes and power units are fictional game values.</p>
    <p>Battery: {stored.toFixed(1)} / {capacity} power units</p>
    <meter min={0} max={capacity} value={stored} aria-label="Battery charge" />
    {demand !== undefined && <p>Life-support demand: {demand} power per week before incident and assignment costs.</p>}
    {onPriorityChange && <label>Power priority{' '}
      <select value={priority} disabled={disabled} onChange={e => onPriorityChange(e.target.value as 'life_support' | 'research')}>
        <option value="life_support">Life support first</option>
        <option value="research">Research recording first</option>
      </select>
    </label>}
    {priority && <p>{priority === 'life_support'
      ? 'Life support receives power before automatic recording. Research waits if the remaining power is insufficient.'
      : 'Automatic recording receives power first. This can reduce oxygen production when reserves are low.'}</p>}
    {forecast.length > 0 && <>
      <p>{showAll ? 'Remaining mission' : 'Upcoming six weeks'}. Forecast generation assumes the current array condition; repairs, faults, and spending can change the battery outcome.</p>
      <table style={{ width: '100%', fontSize: '0.85rem' }}>
        <caption>Weekly sunlight forecast</caption>
        <thead><tr><th>Week</th><th>Lighting</th><th>Day / dark days</th><th>Solar power</th></tr></thead>
        <tbody>{forecast.slice(0, showAll ? undefined : 6).map(week => <tr key={week.week}>
          <th scope="row">{week.week}</th><td>{week.phase}</td>
          <td>{week.daylight_days.toFixed(1)} / {week.darkness_days.toFixed(1)}</td>
          <td>{week.electricity_generated.toFixed(1)}</td>
        </tr>)}</tbody>
      </table>
      {forecast.length > 6 && <button type="button" className="btn btn-secondary" onClick={() => setShowAll(value => !value)}>{showAll ? 'Show next six weeks' : 'Show whole mission forecast'}</button>}
      <p>Charge batteries before dark weeks. Excess generation beyond storage capacity is discarded after weekly loads are supplied.</p>
    </>}
    <details><summary>Lighting model and source</summary>
      <p>{assumption}</p><p>NASA-based mean solar day: {solarDay} Earth days. Battery sizes, power units, and priorities are fictional gameplay rules. This is a weekly energy budget, not an hour-by-hour engineering simulation.</p>
      <a href={sourceUrl} target="_blank" rel="noreferrer">NASA lunar solar-day reference</a>
    </details>
  </section>;
}
