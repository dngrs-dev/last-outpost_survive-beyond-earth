import type { EffectsResponse } from '../../types/game';
import { textPages } from './GameDialog';

export const resourceName = (id: string) => id.replace(/_/g, ' ');
export const number = (value: number) => Number(value.toFixed(2));
export const supplies = (values: Record<string, number>) => Object.entries(values).filter(([, amount]) => amount).map(([id, amount]) => `${number(amount)} ${resourceName(id)}`).join(', ') || 'None';

export function effectsText(effects: EffectsResponse) {
  const lines = Object.entries(effects.resources).filter(([, amount]) => amount).map(([id, amount]) => `${resourceName(id)} ${amount > 0 ? '+' : ''}${number(amount)}.`);
  for (const [label, amount] of [['Solar condition', effects.solar_efficiency], ['Oxygen system', effects.oxygen_efficiency], ['Water recovery', effects.water_recovery_efficiency], ['CO2 scrubber', effects.co2_efficiency]] as const) {
    if (amount) lines.push(`${label} ${amount > 0 ? '+' : ''}${number(amount * 100)} percentage points.`);
  }
  if (effects.crew_health) lines.push(`${effects.target === 'all' ? 'All crew' : 'Selected astronaut'}: ${effects.crew_health > 0 ? '+' : ''}${effects.crew_health} condition.`);
  if (effects.condition) lines.push(`May cause ${resourceName(effects.condition)}.`);
  if (effects.treatment) lines.push(`Stabilizes a case; up to ${effects.treatment} recovery points require full provisions and safe air.`);
  return lines.join(' ') || 'No additional authored changes.';
}

export interface NotebookPage { title: string; text: string; link?: string }
export function paragraphs(title: string, text: string, link?: string): NotebookPage[] {
  return textPages(text).map(text => ({ title, text, link }));
}
