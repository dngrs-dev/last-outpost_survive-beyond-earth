import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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
    const panel = await screen.findByRole('region', { name: 'Research projects' });
    const select = within(panel).getByRole('combobox', { name: /Project control/ });
    fireEvent.change(select, { target: { value: 'pause' } });
    const response = projectRecording.state.current_event!.choices.find(c => !c.requires_crew)!;
    fireEvent.click(screen.getByText(new RegExp(response.text)));
    fireEvent.click(screen.getByRole('button', { name: /SUBMIT WEEK/ }));
    expect((await screen.findAllByText(/Paused by command/)).length).toBeGreaterThan(0);
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
