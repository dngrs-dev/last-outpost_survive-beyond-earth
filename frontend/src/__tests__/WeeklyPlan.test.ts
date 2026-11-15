import { describe, expect, it } from 'vitest';
import { bookedCrew, newWeekPlan, planIssues, readWeekPlan, saveWeekPlan, turnRequest, weeklyCosts } from '../state/weeklyPlan';
import { plannedActivities } from '../components/station/stationPresentation';
import { medicalAssignmentGame, projectAnalysis, researchGame } from './fixtures/backend';

function confirmed(fixture = researchGame) {
  const choice = fixture.state.current_event!.choices.find(choice => choice.available && !choice.requires_crew)!;
  return { ...newWeekPlan(fixture.state), incidentConfirmed: true, event_choice_id: choice.id };
}

describe('Persisted weekly orders and combined validation', () => {
  it('stores committed choices and their exact pending request without mutating stock', () => {
    const original = structuredClone(researchGame.state);
    const plan = { ...confirmed(), assignments: [{ crew_id: 'lin', activity_id: 'research_geology' }], rationsConfirmed: true };
    const request = turnRequest(plan);
    const saved = { ...plan, pending: { request, activities: plannedActivities(researchGame.state, plan) } };
    saveWeekPlan('fixture-game', saved);
    expect(readWeekPlan('fixture-game')).toEqual(saved);
    expect(readWeekPlan('fixture-game')!.pending!.request.request_id).toBe(request.request_id);
    expect(researchGame.state).toEqual(original);
  });

  it.each(['{bad', 'null', '{"version":1}', JSON.stringify({ ...confirmed(), assignments: [null] }), JSON.stringify({ ...confirmed(), rations: [] }), JSON.stringify({ ...confirmed(), project_orders: [{ project_id: 'x', action: 'erase' }] })])('ignores a corrupt local draft: %s', value => {
    localStorage.setItem('last-outpost.week-plan.v1.fixture-game', value);
    expect(readWeekPlan('fixture-game')).toBeNull();
  });

  it('books both members of a care pair and rejects patient work or another caregiver', () => {
    const plan = { ...confirmed(medicalAssignmentGame), assignments: [{ crew_id: 'maya', activity_id: 'medical_care', patient_id: 'alex', condition_id: 'dust_irritation' as const }] };
    expect(bookedCrew(plan)).toEqual(['maya', 'alex']);
    for (const extra of [{ crew_id: 'alex', activity_id: 'crew_rest' }, { crew_id: 'lin', activity_id: 'medical_care', patient_id: 'alex', condition_id: 'dust_irritation' as const }]) {
      expect(planIssues(medicalAssignmentGame.state, { ...plan, assignments: [...plan.assignments, extra] }, false)).toContain('Each astronaut can perform only one main job this week.');
    }
  });

  it('reserves actions together without spending future generation', () => {
    const fixture = structuredClone(researchGame);
    fixture.state.resources.oxygen = 2;
    const plan = { ...confirmed(fixture), assignments: [{ crew_id: 'alex', activity_id: 'research_geology' }, { crew_id: 'lin', activity_id: 'research_geology' }] };
    expect(weeklyCosts(fixture.state, plan, false).oxygen).toBe(4);
    expect(planIssues(fixture.state, plan, false)).toContain('Combined plan exceeds available oxygen.');
    expect(fixture.state.resources.oxygen).toBe(2);
  });

  it('preserves emergency depletion while keeping action costs fully funded', () => {
    const fixture = structuredClone(researchGame); fixture.state.resources.food = 0;
    const plan = confirmed(fixture);
    plan.rations = Object.fromEntries(fixture.state.crew.map(person => [person.id, { food: 'emergency' as const, water: 'normal' as const }]));
    expect(planIssues(fixture.state, plan)).not.toContain('Combined plan exceeds available food.');
    fixture.state.resources.oxygen = 0;
    expect(planIssues(fixture.state, { ...plan, assignments: [{ crew_id: 'lin', activity_id: 'research_geology' }] })).toContain('Combined plan exceeds available oxygen.');
  });

  it('rejects pausing a project with committed manual work and duplicate phase workers', () => {
    const id = projectAnalysis.state.research_projects[0].id;
    const activity = projectAnalysis.state.assignment_options.find(option => option.id.startsWith('project:'))!;
    const plan = { ...confirmed(projectAnalysis), assignments: [{ crew_id: 'lin', activity_id: activity.id }] };
    expect(planIssues(projectAnalysis.state, { ...plan, project_orders: [{ project_id: id, action: 'pause' }] }, false)).toContain('This project is paused for the week and cannot also use assigned crew.');
    expect(planIssues(projectAnalysis.state, { ...plan, assignments: [...plan.assignments, { crew_id: 'alex', activity_id: activity.id }] }, false)).toContain('Only one worker may advance each project this week.');
  });

  it('does not turn confirmed routine duties into an extra assignment', () => {
    const plan = { ...confirmed(), routine_crew_ids: ['alex'] };
    const request = turnRequest(plan);
    expect(bookedCrew(plan)).toContain('alex'); expect(request.assignments).toEqual([]);
    expect(planIssues(researchGame.state, { ...plan, assignments: [{ crew_id: 'alex', activity_id: 'crew_rest' }] }, false)).toContain('Each astronaut can perform only one main job this week.');
  });
});
