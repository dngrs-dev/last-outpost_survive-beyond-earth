import { describe, expect, it } from 'vitest';
import { benchY, roomLayout, stationActors } from '../components/station/stationLayout';
import { plannedActivities, type CrewActivities } from '../components/station/stationPresentation';
import { supportGame } from './fixtures/backend';

describe('Shared room staging', () => {
  it.each([false, true])('places seated hips on cushions and bounds work/care at portrait=%s', portrait => {
    const state = supportGame.state, layout = roomLayout(portrait);
    const base = plannedActivities(state, { event_choice_id: '', assignments: [] });
    const seated = stationActors(state.crew, base, portrait);
    seated.forEach((actor, index) => expect(actor.top + actor.height * .52).toBeCloseTo(benchY(layout.tiers[Math.floor(index / 2)], actor.left + actor.width / 2)));
    const work = Object.fromEntries(state.crew.map(person => [person.id, { ...base[person.id], kind: 'repair', pose: 'working' }])) as CrewActivities;
    const care: CrewActivities = { ...base };
    for (const [worker, patient] of [[state.crew[0], state.crew[1]], [state.crew[2], state.crew[3]]]) {
      care[worker.id] = { ...base[worker.id], kind: 'care', pose: 'treating', partnerId: patient.id };
      care[patient.id] = { ...base[patient.id], kind: 'patient', pose: 'reclining', partnerId: worker.id };
    }
    for (const activities of [work, care]) {
      const actors = stationActors(state.crew, activities, portrait);
      expect(actors.every(actor => actor.left >= 0 && actor.top >= 0 && actor.left + actor.width <= 1000 && actor.top + actor.height <= layout.height)).toBe(true);
      expect(new Set(actors.map(actor => actor.crew.id)).size).toBe(4);
    }
  });
});
