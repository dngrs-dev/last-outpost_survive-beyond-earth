import type { ResearchProject } from '../types/game';

type Orders = Record<string, 'pause' | 'resume' | 'interrupt'>;
interface Props {
  projects: ResearchProject[];
  orders?: Orders;
  onChange?: (orders: Orders) => void;
  disabled?: boolean;
}

export function ResearchProjects({ projects, orders = {}, onChange, disabled }: Props) {
  return <section className="card" aria-label="Research projects" style={{ marginBottom: '1.5rem' }}>
    <h2>Research projects</h2>
    <p>Seismic projects need one deployment week, three automatic recording weeks, and one analysis week. Durations are fictional. Recording uses 2 power per week after action effects and solar generation, under the selected power priority; shortages retain progress without charging. Manual phases use the weekly Crew step.</p>
    {!projects.length && <p>No projects started. Assign a crew member to deploy seismic sensors when the mission needs seismic research.</p>}
    {projects.map(project => <article key={project.id} style={{ marginBottom: '1rem' }}>
      <h3>{project.id}: {project.phase}</h3>
      <p>{project.status === 'completed' ? 'All phases complete' : `${project.status}: ${project.phase_progress} / ${project.phase_weeks} weeks in this phase; ${project.crew_required} crew required`}</p>
      {project.status !== 'completed' && <progress aria-label={`${project.id} phase progress`} max={project.phase_weeks} value={project.phase_progress} />}
      <p>{project.message}</p>
      {orders[project.id] && <p>Planned order: {orders[project.id]}. Applies when you end the week; current progress is unchanged.</p>}
      <p>Costs per attempt or recording week: {Object.entries(project.costs).map(([id, amount]) => `${amount} ${id.replace(/_/g, ' ')}`).join(', ') || 'none'}. Equipment retained: {Object.entries(project.required_items).map(([id, amount]) => `${amount} ${id.replace(/_/g, ' ')}`).join(', ') || 'none'}.</p>
      <p>{project.remaining_weeks} weeks remaining at minimum. {project.estimated_completion_week === null ? 'Resume to estimate completion.' : `Earliest completion: Week ${project.estimated_completion_week}.`}{project.status !== 'completed' && !project.within_rotation && project.status !== 'paused' ? ' This extends past crew rotation.' : ''} Estimates assume successful work every needed week and uninterrupted power.</p>
      {onChange && project.status !== 'completed' && <label>Project control for {project.id}{' '}
        <select disabled={disabled} value={orders[project.id] || ''} onChange={event => {
          const next = { ...orders };
          if (event.target.value) next[project.id] = event.target.value as Orders[string];
          else delete next[project.id];
          onChange(next);
        }}>
          <option value="">Continue current plan</option>
          <option value="pause">Pause (retain work)</option>
          <option value="interrupt">Interrupt and release worker</option>
          <option value="resume">Resume</option>
        </select>
      </label>}
    </article>)}
  </section>;
}
