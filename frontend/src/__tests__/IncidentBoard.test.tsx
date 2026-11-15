import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IncidentPanel } from '../components/station/IncidentPanel';
import { newWeekPlan } from '../state/weeklyPlan';
import { game, medicalAssignmentGame, supportGame } from './fixtures/backend';

describe('Incident board', () => {
  it.each([game, medicalAssignmentGame])('shows every response immediately without committing a preview', fixture => {
    const commit = vi.fn();
    render(<IncidentPanel state={fixture.state} plan={newWeekPlan(fixture.state)} onCommit={commit} onClose={() => {}} />);
    for (const choice of fixture.state.current_event!.choices) expect(screen.getByRole('button', { name: choice.text })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
    const free = fixture.state.current_event!.choices.find(choice => choice.available && !choice.requires_crew)!;
    fireEvent.click(screen.getByRole('button', { name: free.text }));
    expect(commit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm response' }));
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({ incidentConfirmed: true, event_choice_id: free.id }));
  });
  it('requires an explicit distinct lead and helper and shows their actual chance', () => {
    const commit = vi.fn(); const state = supportGame.state;
    render(<IncidentPanel state={state} plan={newWeekPlan(state)} onCommit={commit} onClose={() => {}} />);
    const choice = state.current_event!.choices.find(choice => choice.available && choice.minimum_crew === 2)!;
    fireEvent.click(screen.getByRole('button', { name: choice.text }));
    const confirm = screen.getByRole('button', { name: 'Confirm response' }); expect(confirm).toBeDisabled();
    const lead = choice.eligible_crew.find(person => person.available)!;
    fireEvent.click(screen.getByRole('button', { name: state.crew.find(person => person.id === lead.crew_id)!.name }));
    expect(confirm).toBeDisabled();
    expect(screen.getByLabelText(`${Math.round(lead.success_probability * 100)}% chance of success`)).toBeVisible();
    const helper = choice.support_candidates.find(person => person.available && person.crew_id !== lead.crew_id)!;
    fireEvent.click(screen.getByRole('button', { name: state.crew.find(person => person.id === helper.crew_id)!.name }));
    fireEvent.click(confirm);
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({ selected_crew_id: lead.crew_id, support_crew_ids: [helper.crew_id] }));
  });
});
