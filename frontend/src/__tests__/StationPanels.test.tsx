import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StationPanel } from '../components/station/StationPanel';
import { WeekReport } from '../components/station/WeekReport';
import { newWeekPlan } from '../state/weeklyPlan';
import { energyPriorityGame, projectRecording, projectAnalysis, medicalAssignmentTurn } from './fixtures/backend';

describe('Grouped station readings and weekly results', () => {
  it('opens actual power readings and four forecasts directly without content pages or sources', () => {
    const state = energyPriorityGame.state;
    render(<StationPanel book="status" state={state} plan={newWeekPlan(state)} onUpdate={vi.fn()} onCrew={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole('meter', { name: 'Battery charge' })).toHaveAttribute('value', String(state.energy.stored));
    expect(screen.getAllByRole('meter')).toHaveLength(1 + Math.min(4, state.energy.forecast.length));
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Air & water' }));
    expect(screen.getByRole('heading', { name: 'Cabin CO2' })).toBeInTheDocument();
  });
  it('shows phase, progress and controls together and prevents pausing booked manual work', () => {
    const state = projectRecording.state, update = vi.fn();
    const { unmount } = render(<StationPanel book="status" state={state} plan={newWeekPlan(state)} onUpdate={update} onCrew={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Science' }));
    expect(screen.getByRole('progressbar', { name: `${state.research_projects[0].id} phase progress` })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Confirm project order' }));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ project_orders: [{ project_id: state.research_projects[0].id, action: 'pause' }] }));
    unmount();
    const analysis = projectAnalysis.state, project = analysis.research_projects[0];
    render(<StationPanel book="status" state={analysis} plan={{ ...newWeekPlan(analysis), assignments: [{ crew_id: 'lin', activity_id: `project:${project.id}` }] }} onUpdate={update} onCrew={vi.fn()} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Science' }));
    expect(screen.getByRole('button', { name: 'Confirm project order' })).toBeDisabled();
  });
  it('separates survival and science in a portrait-led report with optional grouped details', () => {
    const fixture = medicalAssignmentTurn, proceed = vi.fn();
    render(<WeekReport outcome={fixture.turn_outcome} crew={fixture.state.crew} ended={false} onContinue={proceed} />);
    expect(screen.getByRole('heading', { name: '♥ Survival' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '✦ Science' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Details' }));
    expect(screen.getByText(/Water recovered/)).toBeInTheDocument();
    expect(screen.getAllByText(/Hunger .* →/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole('button', { name: 'PROCEED TO WEEK 2' })); expect(proceed).toHaveBeenCalledTimes(1);
  });
});
