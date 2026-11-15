import { AstronautAvatar } from '../AstronautAvatar';
import { ItemIcon } from '../ItemIcon';
import { RoleIcon } from '../RoleIcon';
import type { CrewResponse, EffectsResponse } from '../../types/game';
import './stationUI.css';

const icons: Record<string, string> = { food: 'food_packs', water: 'water_containers', medicine: 'medicine_kits', oxygen: 'oxygen_tanks' };
export const label = (id: string) => id.replace(/_/g, ' ');
export function ResourceIcon({ resource }: { resource: string }) {
  return resource === 'electricity' ? <svg viewBox="0 0 80 80" aria-hidden="true"><path d="M44 5 15 44h22l-4 31 32-43H43Z" fill="#ffe09c" stroke="#b38c43" strokeWidth="3" /></svg> : <ItemIcon id={icons[resource] || resource} />;
}
export function Resources({ values, retained = false, signed = false }: { values: Record<string, number>; retained?: boolean; signed?: boolean }) {
  const entries = Object.entries(values).filter(([, value]) => value !== 0);
  if (!entries.length) return null;
  return <div className={`resources ${retained ? 'retained' : signed ? 'changes' : 'spending'}`} aria-label={retained ? 'Equipment needed, kept after use' : signed ? 'Resource changes' : 'Resources spent'}>
    {entries.map(([id, value]) => {
      const repeats = !signed && !retained && Number.isInteger(value) && value > 0 && value <= 4 && !['food', 'water', 'oxygen', 'electricity'].includes(id);
      return <span className="resource" key={id} role="img" aria-label={`${signed && value > 0 ? '+' : ''}${value} ${label(id)}${retained ? ', kept' : ''}`} title={`${label(id)}: ${value}${retained ? ' (kept)' : ''}`}>
        <b aria-hidden="true">{retained ? '✓' : signed ? value > 0 ? '+' : '−' : '−'}</b>
        {Array.from({ length: repeats ? value : 1 }, (_, index) => <span key={index} className="resource-icon" aria-hidden="true"><ResourceIcon resource={id} /></span>)}
        {!repeats && <strong aria-hidden="true">{Math.abs(Number(value.toFixed(2)))}</strong>}
      </span>;
    })}
  </div>;
}
export function Chance({ value }: { value: number }) {
  const percent = Math.round(value * 100);
  return <span className={`chance ${percent < 50 ? 'risky' : ''}`} aria-label={`${percent}% chance of success`} title="Chance of success"><span aria-hidden="true">◉</span> {percent}%</span>;
}
export function Portrait({ person }: { person: CrewResponse }) {
  return <span className="crew-portrait" aria-hidden="true"><AstronautAvatar id={person.id} role={person.role} portrait outfit="cabin" /><span><RoleIcon role={person.role} /></span></span>;
}
export function CrewPick({ person, selected, disabled, onClick, detail, accessibleName }: { person: CrewResponse; selected: boolean; disabled?: boolean; onClick: () => void; detail?: string; accessibleName?: string }) {
  return <button type="button" className="crew-pick" aria-label={accessibleName || person.name} aria-pressed={selected} disabled={disabled} onClick={onClick}><Portrait person={person} /><strong>{person.name.split(' ')[0]}</strong>{detail && <small>{detail}</small>}</button>;
}

export function Outcome({ effects, rewards = 0 }: { effects: EffectsResponse; rewards?: number }) {
  const systems = [['Solar', effects.solar_efficiency], ['Oxygen maker', effects.oxygen_efficiency], ['Water recycler', effects.water_recovery_efficiency], ['Air filter', effects.co2_efficiency]] as const;
  return <span className="outcome"><Resources values={effects.resources} signed />
    {systems.filter(([, amount]) => amount).map(([name, amount]) => <span key={name}>{name} {amount > 0 ? '+' : ''}{Math.round(amount * 100)}%</span>)}
    {Boolean(effects.crew_health) && <span>♥ {effects.target === 'all' ? 'Everyone ' : ''}{effects.crew_health > 0 ? '+' : ''}{effects.crew_health}</span>}
    {effects.condition && <span>⚠ {label(effects.condition)}</span>}
    {Boolean(effects.treatment) && <span>✚ Treat injury</span>}
    {rewards > 0 && <span>✦ Science +{rewards}</span>}
  </span>;
}
