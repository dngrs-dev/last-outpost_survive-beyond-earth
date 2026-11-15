import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { book, confirmIncident, openStatus, notebookPage, reviewWeek } from './helpers/station';
import { ResearchProjects } from '../components/ResearchProjects';
import { GamePage } from '../pages/GamePage';
import * as api from '../api/game';
import { projectRecording, projectAnalysis, projectPaused, projectCompleted, projectPauseTurn } from './fixtures/backend';

describe('Phased seismic projects from real API fixtures', () => {
  beforeEach(() => vi.restoreAllMocks());

  it.each([projectRecording, projectAnalysis, projectPaused, projectCompleted])('shows phase, requirements, costs and estimates', fixture => {
    render(<ResearchProjects projects={fixture.state.research_projects} />);
    const project = fixture.state.research_projects[0];
    expect(screen.getByRole('heading', { name: `${project.id}: ${project.phase}` })).toBeInTheDocument();
    expect(screen.getByText(project.message)).toBeInTheDocument();
    if (project.status !== 'completed') {
      expect(screen.getByRole('progressbar', { name: `${project.id} phase progress` })).toHaveAttribute('value', String(project.phase_progress));
    } else expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('submits pause with the complete weekly plan and preserves recordings in the response', async () => {
    vi.spyOn(api, 'fetchGameState').mockResolvedValue(structuredClone(projectRecording));
    const submit = vi.spyOn(api, 'submitTurn').mockResolvedValue(structuredClone(projectPauseTurn));
    render(<MemoryRouter initialEntries={['/game/fixture-game']}><Routes>
      <Route path="/game/:gameId" element={<GamePage />} />
    </Routes></MemoryRouter>);
    await confirmIncident(projectRecording);
    await openStatus('Science');
    const project = projectRecording.state.research_projects[0];
    notebookPage(`Control ${project.id}`);
    fireEvent.change(book().getByRole('combobox', { name: 'Project control' }), { target: { value: 'pause' } });
    fireEvent.click(book().getByRole('button', { name: 'Confirm project order' }));
    expect(book().getByRole('button', { name: 'pause locked for this week' })).toBeDisabled();
    fireEvent.click(await reviewWeek(projectRecording));
    await screen.findByText(`WEEK ${projectPauseTurn.turn_outcome.week} DEBRIEF`);
    notebookPage('Research project');
    expect(book().getByText(/Paused by command/)).toBeInTheDocument();
    expect(submit).toHaveBeenCalledWith('fixture-game', expect.objectContaining({
      project_orders: [{ project_id: projectRecording.state.research_projects[0].id, action: 'pause' }],
    }));
  });

  it('keeps the worker free during recording and offers analysis only after recording finishes', () => {
    expect(projectRecording.state.research_projects[0].crew_required).toBe(0);
    expect(projectRecording.state.assignment_options.some(c => c.id.startsWith('project:'))).toBe(false);
    expect(projectAnalysis.state.assignment_options.some(c => c.id.startsWith('project:'))).toBe(true);
    expect(projectCompleted.state.research_projects[0].status).toBe('completed');
  });
});
