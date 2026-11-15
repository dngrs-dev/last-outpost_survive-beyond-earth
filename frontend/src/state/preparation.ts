import type { CrewDefinition, StationDefinition } from '../types/game';

export const STARTER_CREW = ['alex', 'maya', 'lin', 'sam'];

/** Four explicit URL slots survive refresh/back; empty seats remain empty. */
export function readCrewSlots(
  params: URLSearchParams,
  crew: CrewDefinition[],
  maxCrew: number
) {
  const requested = params.has('crew')
    ? params.get('crew')!.split(',')
    : STARTER_CREW;
  const seen = new Set<string>();
  let adjusted = requested.length > maxCrew;
  const slots = Array.from({ length: maxCrew }, (_, index) => {
    const id = requested[index] || '';
    if (!id) return '';
    if (seen.has(id) || !crew.some((person) => person.id === id)) {
      adjusted = true;
      return '';
    }
    seen.add(id);
    return id;
  });
  return { slots, adjusted };
}

export function crewSelectionPath(station: StationDefinition, slots: string[]) {
  const params = new URLSearchParams({
    station: station.id,
    crew: slots.join(','),
  });
  if (station.lunar_site_id) params.set('lunar_site', station.lunar_site_id);
  return `/crew/?${params}`;
}

export interface SupplyDraft {
  cargo: Record<string, number>;
  seed: string;
}

/** Router history retains supplies when the player returns to change their crew. */
export function readSupplyDraft(value: unknown): SupplyDraft | null {
  if (!value || typeof value !== 'object' || !('supplies' in value))
    return null;
  const draft = value.supplies as Partial<SupplyDraft> | null;
  if (
    !draft ||
    typeof draft.seed !== 'string' ||
    !draft.cargo ||
    typeof draft.cargo !== 'object' ||
    Array.isArray(draft.cargo)
  )
    return null;
  if (
    !Object.values(draft.cargo).every(
      (quantity) => Number.isSafeInteger(quantity) && quantity >= 0
    )
  )
    return null;
  return { cargo: draft.cargo, seed: draft.seed };
}
