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

export function roomLayout(portrait = false) {
  return {
    height: portrait ? 1800 : 800,
    floor: portrait ? 740 : 335,
    tiers: portrait ? [{ cx: 500, y: 940, half: 260, curve: 100 }, { cx: 500, y: 1370, half: 300, curve: 100 }] : [{ cx: 500, y: 410, half: 250, curve: 70 }, { cx: 500, y: 610, half: 300, curve: 70 }],
    actorWidth: portrait ? 160 : 108,
    table: { x: 500, y: portrait ? 1535 : 690, width: portrait ? 175 : 137 },
    supplies: { x: 150, y: portrait ? 410 : 180 },
    airlock: { x: 145, y: portrait ? 1050 : 590 },
    desks: portrait ? [[280, 470], [510, 470], [280, 1020], [510, 1020]] : [[280, 140], [425, 140], [570, 140], [715, 140]],
    medical: { x: portrait ? 720 : 775, y: portrait ? 850 : 390, step: portrait ? 380 : 170 },
  };
}
export function benchY(tier: ReturnType<typeof roomLayout>['tiers'][number], x: number) {
  return tier.y - tier.curve * (1 - ((x - tier.cx) / tier.half) ** 2);
}

/** Furniture and crew share anchors; seated hips touch the cushion, with no CSS stretching. */
export function stationActors(crew: CrewResponse[], activities: CrewActivities, portrait = false): RoomActor[] {
  const layout = roomLayout(portrait);
  const width = layout.actorWidth, height = width * 520 / 240;
  const seats = layout.tiers.flatMap(tier => [tier.cx - 140, tier.cx + 140].map(x => [x, benchY(tier, x)]));
  const actors = new Map<string, RoomActor>();
  crew.forEach((person, index) => {
    if (!person.alive || !activities[person.id]) return;
    const [x, y] = seats[index % seats.length];
    actors.set(person.id, { crew: person, activity: activities[person.id], left: x - width / 2, top: y - height * .52, width, height, zone: 'seating' });
  });
  const move = (id: string, x: number, y: number, w: number, h: number, zone: RoomActor['zone']) => {
    const actor = actors.get(id); if (actor) Object.assign(actor, { left: x - w / 2, top: y, width: w, height: h, zone });
  };
  let medicalSlot = 0;
  const paired = new Set<string>();
  const medical = (worker: RoomActor | undefined, patient: RoomActor) => {
    const y = layout.medical.y + medicalSlot++ * layout.medical.step;
    const scale = portrait ? 1.25 : 1;
    if (worker) { move(worker.crew.id, layout.medical.x, y, 82 * scale, 178 * scale, 'medical'); paired.add(worker.crew.id); }
    const lying = patient.activity.pose === 'reclining';
    move(patient.crew.id, portrait ? 890 : 905, lying ? y + 42 * scale : y, lying ? 168 * scale : 82 * scale, lying ? 78 * scale : 178 * scale, 'medical');
    paired.add(patient.crew.id);
  };
  for (const actor of actors.values()) {
    if (actor.activity.kind !== 'care' && actor.activity.kind !== 'self_care') continue;
    if (actor.activity.kind === 'self_care') { paired.add(actor.crew.id); continue; }
    const patient = actor.activity.partnerId && actors.get(actor.activity.partnerId);
    if (patient) medical(actor, patient);
  }
  let desk = 0;
  for (const actor of actors.values()) {
    if (paired.has(actor.crew.id)) continue;
    if (actor.activity.origin === 'incident' || actor.activity.kind === 'outside') {
      move(actor.crew.id, 100, 500, 55, 120, actor.activity.kind === 'outside' ? 'surface' : 'work');
    } else if (actor.activity.kind === 'patient') medical(undefined, actor);
    else if (actor.activity.pose === 'reclining') {
      move(actor.crew.id, actor.left + actor.width / 2, actor.top + actor.height * .4, width * 1.6, height * .36, 'seating');
    } else if (['repair', 'research', 'response'].includes(actor.activity.kind)) {
      const [x, y] = layout.desks[desk++];
      move(actor.crew.id, x, y, width, height, 'work');
    }
  }
  return [...actors.values()];
}
