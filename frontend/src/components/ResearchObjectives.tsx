import type { ResearchObjectiveDefinition, ScienceResponse } from '../types/game';

interface Props {
  objectives: ResearchObjectiveDefinition[];
  science?: ScienceResponse;
  final?: boolean;
}

const ASSESSMENTS = {
  complete: 'Research program complete',
  partial: 'Research program partially completed',
  not_started: 'No objective progress',
};

export function ResearchObjectives({ objectives, science, final = false }: Props) {
  return <section className="card" aria-label={final ? 'Scientific achievement' : 'Research objectives'} style={{ marginBottom: '1.5rem' }}>
    <div className="card-title">
      <h2 style={{ fontSize: '1rem', margin: 0 }}>{final ? 'Scientific achievement' : 'Research objectives'}</h2>
      {science && <span className={`badge ${science.status === 'complete' ? 'badge-green' : 'badge-amber'}`}>
        {science.completed_objectives} / {science.total_objectives} achieved
      </span>}
    </div>
    {final && science && <p><strong>{ASSESSMENTS[science.status]}</strong>. {science.research_data} research data recorded.</p>}
    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
      {science
        ? 'Science is assessed separately from survival. Successful matching event actions also count; research points alone do not complete objectives.'
        : 'Pack a field science kit, EVA packs, and repair kits for planned research. Each task occupies one astronaut for a week alongside incident response. Survival is assessed separately.'}
    </p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
      {objectives.map((objective) => {
        const progress = science?.objectives.find((entry) => entry.id === objective.id);
        return <div key={objective.id}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.4rem' }}>{objective.title}</h3>
          <p style={{ margin: '0.4rem 0', fontFamily: 'var(--font-mono)' }}>
            {progress ? `${progress.progress} / ${objective.target}${progress.completed ? ' — Complete' : ''}` : `Target: ${objective.target}`}
          </p>
          {progress && <progress aria-label={`${objective.title} progress`} max={objective.target} value={progress.progress} style={{ width: '100%' }} />}
          <details style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <summary>Objective details</summary>
            <p>{objective.description}</p>
            <a href={objective.source_url} target="_blank" rel="noreferrer">Science reference</a>
          </details>
        </div>;
      })}
    </div>
  </section>;
}
