import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IncidentPanel, responseName } from '../components/station/IncidentPanel';
import { newWeekPlan } from '../state/weeklyPlan';
import { game, medicalAssignmentGame, supportGame } from './fixtures/backend';

describe('Incident board', () => {
  it.each([game, medicalAssignmentGame])('shows every response immediately without committing a preview', fixture => {
    const commit = vi.fn();
    render(<IncidentPanel state={fixture.state} plan={newWeekPlan(fixture.state)} onCommit={commit} onClose={() => {}} />);
    for (const choice of fixture.state.current_event!.choices) expect(screen.getByRole('button', { name: responseName(choice.id, choice.text) })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
    const free = fixture.state.current_event!.choices.find(choice => choice.available && !choice.requires_crew)!;
    fireEvent.click(screen.getByRole('button', { name: responseName(free.id, free.text) }));
    expect(commit).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm response' }));
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({ incidentConfirmed: true, event_choice_id: free.id }));
  });
  it('shows current stock including missing equipment and cannot be dismissed or escaped', () => {
    const close = vi.fn(), commit = vi.fn();
    const fixture = structuredClone(game);
    fixture.state.resources.repair_kits = 0;
    render(<IncidentPanel state={fixture.state} plan={newWeekPlan(fixture.state)} onCommit={commit} onClose={close} />);
    const dialog = screen.getByRole('dialog');
    const supplies = screen.getByLabelText('Available supplies');
    expect(within(supplies).getByRole('img', { name: '0 repair kits' })).toBeVisible();
    expect(within(supplies).getByRole('img', { name: `${fixture.state.resources.food} food` })).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Close panel' })).not.toBeInTheDocument();
    expect(screen.queryByText('Choose a response')).not.toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: 'Escape' });
    fireEvent(dialog, new Event('cancel', { bubbles: true, cancelable: true }));
    expect(close).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
    expect(dialog).toHaveAttribute('open');
    expect(screen.getByRole('button', { name: 'Confirm response' })).toBeDisabled();
  });
  it('keeps unavailable responses readable without accepting an invalid selection', () => {
    const state = medicalAssignmentGame.state, commit = vi.fn();
    const locked = state.current_event!.choices.find(choice => !choice.available)!;
    render(<IncidentPanel state={state} plan={newWeekPlan(state)} onCommit={commit} onClose={() => {}} />);
    const card = screen.getByRole('button', { name: responseName(locked.id, locked.text) });
    expect(card).toHaveAttribute('aria-disabled', 'true');
    expect(card).toHaveAttribute('title', locked.unavailable_reasons.join(' '));
    expect(within(card).getByRole('img', { name: 'Unavailable' })).toBeVisible();
    fireEvent.click(card);
    expect(card).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Confirm response' })).toBeDisabled();
    expect(commit).not.toHaveBeenCalled();
  });
  it('requires an explicit distinct lead and helper and shows their actual chance', () => {
    const commit = vi.fn(); const state = supportGame.state;
    render(<IncidentPanel state={state} plan={newWeekPlan(state)} onCommit={commit} onClose={() => {}} />);
    const choice = state.current_event!.choices.find(choice => choice.available && choice.minimum_crew === 2)!;
    fireEvent.click(screen.getByRole('button', { name: responseName(choice.id, choice.text) }));
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
