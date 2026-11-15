import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { GamePage } from '../pages/GamePage';
import { AstronautAvatar } from '../components/AstronautAvatar';
import { StationRoom } from '../components/station/StationRoom';
import { plannedActivities, confirmedActivities, supplyDisplay, type CrewActivities, type ScenePlan } from '../components/station/stationPresentation';
import { stationActors } from '../components/station/stationLayout';
import * as api from '../api/game';
import { ApiError } from '../api/client';
import type { GameResponse } from '../types/game';
import { catalog, researchGame, researchTurn, medicalAssignmentGame, medicalAssignmentTurn, projectRecording, projectPauseTurn, supportGame, failed } from './fixtures/backend';
import { confirmIncident, chooseCrewTask, reviewWeek } from './helpers/station';

function plan(fixture: GameResponse): ScenePlan {
  return { event_choice_id: fixture.state.current_event!.choices.find(choice => choice.available && !choice.requires_crew)!.id, assignments: [] };
}

function room(fixture: GameResponse, orders: ScenePlan = plan(fixture)) {
  return render(<StationRoom state={fixture.state} activities={plannedActivities(fixture.state, orders)} mode="planning" selectedCrewId={null} onSelectCrew={vi.fn()} onOpen={vi.fn()} disabled={false} />);
}

function openGame() {
  render(<MemoryRouter initialEntries={['/game/fixture-game']}><Routes><Route path="/game/:gameId" element={<GamePage />} /></Routes></MemoryRouter>);
}

describe('Visible station activities and confirmed supplies', () => {
  beforeEach(() => vi.restoreAllMocks());

  it('shares cabin clothing and faces across the roster, with helmets reserved for EVA', () => {
    const { container } = render(<>{catalog.crew.map(person => <AstronautAvatar key={person.id} id={person.id} role={person.role} outfit="cabin" pose="working" />)}<AstronautAvatar id="alex" role="engineer" /></>);
    expect(container.querySelectorAll('[data-part="shared-cabin-outfit"]')).toHaveLength(16);
    expect(container.querySelectorAll('[data-part="shared-head"]')).toHaveLength(17);
    expect(container.querySelectorAll('[data-part="helmet"]')).toHaveLength(1);
    const ids = [...container.querySelectorAll('[id]')].map(element => element.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('places the caregiver and patient together and reserves exactly one body per living person', () => {
    const orders = plan(medicalAssignmentGame);
    orders.assignments = [{ crew_id: 'maya', activity_id: 'medical_care', patient_id: 'alex', condition_id: 'dust_irritation' }];
    const { container } = room(medicalAssignmentGame, orders);
    const caregiver = container.querySelector('[data-crew-id="maya"]')!;
    const patient = container.querySelector('[data-crew-id="alex"]')!;
    expect(caregiver).toHaveAttribute('data-zone', 'medical');
    expect(caregiver.querySelector('[data-part="medical-kit"]')).toBeInTheDocument();
    expect(patient).toHaveAttribute('data-activity', 'patient');
    expect(patient.querySelector('svg')).toHaveAttribute('data-pose', 'reclining');
    expect(container.querySelectorAll('[data-part="medical-cot"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-crew-id]')).toHaveLength(medicalAssignmentGame.state.crew.filter(person => person.alive).length);
  });

  it('uses seated treatment for a fit patient rather than putting every case in a cot', () => {
    const fixture = structuredClone(medicalAssignmentGame);
    fixture.state.crew.find(person => person.id === 'alex')!.condition.status = 'fit';
    const orders = plan(fixture);
    orders.assignments = [{ crew_id: 'maya', activity_id: 'medical_care', patient_id: 'alex', condition_id: 'dust_irritation' }];
    const { container } = room(fixture, orders);
    expect(container.querySelector('[data-crew-id="alex"] svg')).toHaveAttribute('data-pose', 'seated');
    expect(container.querySelector('[data-part="medical-chair"]')).toBeInTheDocument();
    expect(container.querySelector('[data-part="medical-cot"]')).not.toBeInTheDocument();
  });

  it('stages a patient-targeted incident as care without inventing a second occupied astronaut', () => {
    const choice = medicalAssignmentGame.state.current_event!.choices.find(choice => choice.workload === 'care' && choice.available)!;
    const worker = choice.eligible_crew.find(candidate => candidate.available)!.crew_id;
    const activities = plannedActivities(medicalAssignmentGame.state, { event_choice_id: choice.id, selected_crew_id: worker });
    expect(activities[worker].kind).toBe('patient');
    expect(Object.values(activities).filter(activity => activity.origin === 'incident')).toHaveLength(1);
    expect(Object.values(activities).some(activity => activity.kind === 'care')).toBe(false);
    expect(stationActors(medicalAssignmentGame.state.crew, activities).find(actor => actor.crew.id === worker)?.zone).toBe('medical');
  });

  it('moves sampling to the surface view in EVA clothing and returns crew when the plan is cleared', () => {
    const orders = plan(researchGame);
    orders.assignments = [{ crew_id: 'lin', activity_id: 'research_geology' }];
    const activities = plannedActivities(researchGame.state, orders);
    expect(stationActors(researchGame.state.crew, activities).find(actor => actor.crew.id === 'lin')?.zone).toBe('surface');
    const { container, rerender } = room(researchGame, orders);
    expect(container.querySelectorAll('[data-crew-id="lin"]')).toHaveLength(0);
    rerender(<StationRoom state={researchGame.state} activities={plannedActivities(researchGame.state, plan(researchGame))} mode="planning" selectedCrewId={null} onSelectCrew={vi.fn()} onOpen={vi.fn()} disabled={false} />);
    expect(container.querySelector('[data-crew-id="lin"]')).toHaveAttribute('data-zone', 'seating');
    expect(container.querySelector('[data-crew-id="lin"] svg')).toHaveAttribute('data-outfit', 'cabin');
  });

  it('does not stage unavailable or double-booked people as successfully working', () => {
    const orders = plan(medicalAssignmentGame);
    orders.assignments = [
      { crew_id: 'maya', activity_id: 'medical_care', patient_id: 'alex', condition_id: 'dust_irritation' },
      { crew_id: 'alex', activity_id: 'crew_rest' },
    ];
    const activities = plannedActivities(medicalAssignmentGame.state, orders);
    expect(activities.alex.kind).toBe('unavailable');
    expect(activities.maya.kind).toBe('unavailable');
    expect(activities.alex.partnerId).toBeUndefined();
    const unavailable = plannedActivities(medicalAssignmentGame.state, { ...plan(medicalAssignmentGame), assignments: [{ crew_id: 'alex', activity_id: 'research_geology' }] });
    expect(unavailable.alex.kind).toBe('unavailable');
    expect(stationActors(medicalAssignmentGame.state.crew, unavailable).every(actor => actor.zone !== 'surface')).toBe(true);
  });

  it('releases cancelled work and dead participants while retaining completed work in a recap', () => {
    const orders = { ...plan(researchGame), assignments: [{ crew_id: 'lin', activity_id: 'research_geology' }] };
    const activities = plannedActivities(researchGame.state, orders);
    const cancelled = structuredClone(researchTurn.turn_outcome);
    cancelled.assignments[0].status = 'cancelled';
    cancelled.assignments[0].reason = 'Worker became unavailable before work.';
    const interrupted = confirmedActivities(activities, cancelled, researchTurn.state.crew);
    expect(interrupted.lin.result).toBe('interrupted');
    expect(stationActors(researchTurn.state.crew, interrupted).find(actor => actor.crew.id === 'lin')?.zone).toBe('seating');
    const completed = confirmedActivities(activities, researchTurn.turn_outcome, researchTurn.state.crew);
    expect(completed.lin.result).toBe('completed');
    const lost = structuredClone(researchTurn.state.crew);
    lost.find(person => person.id === 'lin')!.alive = false;
    expect(confirmedActivities(activities, researchTurn.turn_outcome, lost).lin).toBeUndefined();
  });

  it('fits four outside workers, recovering crew, and two care pairs within the room bounds', () => {
    const crew = supportGame.state.crew;
    const base = plannedActivities(supportGame.state, plan(supportGame));
    const outside = Object.fromEntries(crew.map(person => [person.id, { ...base[person.id], kind: 'outside', pose: 'standing' }])) as CrewActivities;
    const resting = Object.fromEntries(crew.map(person => [person.id, { ...base[person.id], kind: 'rest', pose: 'reclining' }])) as CrewActivities;
    const care: CrewActivities = { ...base };
    for (const [worker, patient] of [[crew[0], crew[1]], [crew[2], crew[3]]]) {
      care[worker.id] = { ...base[worker.id], kind: 'care', pose: 'treating', partnerId: patient.id };
      care[patient.id] = { ...base[patient.id], kind: 'patient', pose: 'reclining', partnerId: worker.id };
    }
    for (const activities of [outside, resting, care]) {
      const actors = stationActors(crew, activities);
      expect(actors).toHaveLength(4);
      expect(new Set(actors.map(actor => actor.crew.id)).size).toBe(4);
      expect(actors.every(actor => actor.left >= 0 && actor.top >= 0 && actor.left + actor.width <= 1000 && actor.top + actor.height <= 760)).toBe(true);
    }
  });

  it('changes bounded shelf contents and tank fill from confirmed stock, preserving reusable equipment', () => {
    const before = supplyDisplay(researchGame.state, 'food');
    const after = supplyDisplay(researchTurn.state, 'food');
    expect(after.fraction).toBeLessThan(before.fraction);
    const fixture = structuredClone(researchTurn);
    fixture.state.resources.food = 0;
    fixture.state.resources.water = 0;
    const { container } = room(fixture);
    expect(container.querySelectorAll('[data-part="food-pouch"]')).toHaveLength(0);
    expect(container.querySelector('[data-stock="water"]')).toHaveAttribute('data-fill', '0');
    expect(container.querySelector('[data-stock="scientific_tools"]')).toHaveAttribute('data-quantity', '1');
    expect(container.querySelectorAll('[data-part="medicine-pack"]').length).toBeLessThanOrEqual(3);
  });

  it('shows automatic recording progress without occupying its previous astronaut', () => {
    const { container } = room(projectRecording);
    const project = projectRecording.state.research_projects[0];
    expect(project.crew_required).toBe(0);
    expect(container.querySelector('[aria-label="Station common room"]')).toHaveAttribute('data-project-progress', String(project.phase_progress));
    expect(container.querySelectorAll('[data-zone="surface"], [data-zone="work"]')).toHaveLength(0);
  });

  it('keeps preview supplies unchanged through a lost response and applies the confirmed medical stock once', async () => {
    vi.spyOn(api, 'fetchGameState').mockResolvedValueOnce(structuredClone(medicalAssignmentGame)).mockResolvedValueOnce({ game_id: medicalAssignmentTurn.game_id, state: structuredClone(medicalAssignmentTurn.state) });
    const send = vi.spyOn(api, 'submitTurn').mockRejectedValueOnce(new ApiError(503, 'Response lost')).mockResolvedValueOnce(structuredClone(medicalAssignmentTurn));
    openGame();
    await confirmIncident(medicalAssignmentGame);
    await chooseCrewTask(medicalAssignmentGame, 'maya', 'medical_care', 'alex:dust_irritation');
    const station = screen.getByRole('region', { name: 'Station common room' });
    expect(station.querySelector('[data-stock="medicine"]')).toHaveAttribute('data-quantity', '8');
    fireEvent.click(await reviewWeek(medicalAssignmentGame));
    await screen.findByRole('button', { name: 'Retry week 1 submission' });
    expect(station).toHaveAttribute('data-scene-mode', 'pending');
    expect(station.querySelector('[data-stock="medicine"]')).toHaveAttribute('data-quantity', '8');
    fireEvent.click(screen.getByRole('button', { name: 'Retry week 1 submission' }));
    await screen.findByText('WEEK 1 DEBRIEF');
    expect(station).toHaveAttribute('data-scene-mode', 'report');
    expect(station.querySelector('[data-stock="medicine"]')).toHaveAttribute('data-quantity', '7');
    expect(send.mock.calls[1][1]).toEqual(send.mock.calls[0][1]);
    fireEvent.click(screen.getByRole('button', { name: 'PROCEED TO WEEK 2' }));
    expect(station).toHaveAttribute('data-scene-mode', 'planning');
    expect(station.querySelector('[data-activity="care"], [data-activity="patient"]')).not.toBeInTheDocument();
  });

  it('shows confirmed pauses without discarding project progress and omits deceased bodies', () => {
    const project = projectPauseTurn.state.research_projects[0];
    const { container } = room(projectPauseTurn);
    expect(project.status).toBe('paused');
    expect(container.querySelector('[aria-label="Station common room"]')).toHaveAttribute('data-project-progress', String(project.phase_progress));
    expect(stationActors(failed.state.crew, plannedActivities(failed.state, { event_choice_id: '' }))).toHaveLength(0);
    expect(container.querySelector('[data-stock="scientific_tools"]')).toHaveAttribute('data-quantity', '1');
  });
});
