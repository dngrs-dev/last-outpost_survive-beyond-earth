import type { CrewResponse } from '../../types/game';
import type { CrewActivities, CrewActivity } from './stationPresentation';

export interface RoomActor {
  crew: CrewResponse;
  activity: CrewActivity;
  left: number;
  top: number;
  width: number;
  height: number;
  zone: 'seating' | 'work' | 'medical' | 'surface';
}

const seats = [[375, 260], [580, 260], [310, 440], [650, 440]];
const desks = [[265, 205], [685, 205], [475, 205], [475, 395]];

/** Fixed staging anchors, not workstation capacity or a movement simulation. */
export function stationActors(crew: CrewResponse[], activities: CrewActivities): RoomActor[] {
  const actors = new Map<string, RoomActor>();
  crew.forEach((person, index) => {
    if (!person.alive || !activities[person.id]) return;
    const [x, y] = seats[index % seats.length];
    actors.set(person.id, { crew: person, activity: activities[person.id], left: x - 50, top: y, width: 100, height: 220, zone: 'seating' });
  });
  const move = (id: string, x: number, y: number, width: number, height: number, zone: RoomActor['zone']) => {
    const actor = actors.get(id);
    if (actor) Object.assign(actor, { left: x - width / 2, top: y, width, height, zone });
  };
  let medicalSlot = 0;
  const paired = new Set<string>();
  for (const actor of actors.values()) {
    if (actor.activity.kind !== 'care' && actor.activity.kind !== 'self_care') continue;
    if (actor.activity.kind === 'self_care') { paired.add(actor.crew.id); continue; }
    const y = 295 + medicalSlot++ * 190;
    move(actor.crew.id, 770, y, 85, 185, 'medical');
    const patient = actor.activity.partnerId && actors.get(actor.activity.partnerId);
    if (patient) {
      const lying = patient.activity.pose === 'reclining';
      move(patient.crew.id, 875, lying ? y + 112 : y, lying ? 170 : 85, lying ? 79 : 185, 'medical');
      paired.add(patient.crew.id);
    }
    paired.add(actor.crew.id);
  }
  let deskSlot = 0;
  let outsideSlot = 0;
  for (const actor of actors.values()) {
    if (paired.has(actor.crew.id)) continue;
    if (actor.activity.kind === 'outside') {
      const index = outsideSlot++;
      move(actor.crew.id, 108 + (index % 2) * 88, 470 + Math.floor(index / 2) * 125, 55, 120, 'surface');
    } else if (actor.activity.kind === 'patient') {
      const y = 295 + medicalSlot++ * 190;
      const lying = actor.activity.pose === 'reclining';
      move(actor.crew.id, 875, lying ? y + 112 : y, lying ? 170 : 85, lying ? 79 : 185, 'medical');
    } else if (actor.activity.pose === 'reclining') {
      move(actor.crew.id, actor.left + actor.width / 2, actor.top + 100, 170, 79, 'seating');
    } else if (['repair', 'research', 'response'].includes(actor.activity.kind)) {
      const [x, y] = desks[deskSlot++];
      move(actor.crew.id, x, y, 100, 220, 'work');
    }
  }
  return [...actors.values()];
}
