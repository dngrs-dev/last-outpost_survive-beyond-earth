import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchGameState } from '../api/game';
import { rememberMission } from '../state/lastMission';
import { Portrait } from '../components/station/Visuals';
import type { GameStateResponse, ResultsResponse } from '../types/game';
import styles from './ResultsPage.module.css';

/** Display awards from the authoritative final report; these do not change the mission. */
export function missionRating(results: ResultsResponse) {
  const survived = results.surviving_crew_ids.length > 0;
  const fullCrew = survived && results.surviving_crew_ids.length === results.initial_crew_size;
  const scienceComplete = survived && results.science.total_objectives > 0 && results.science.status === 'complete';
  return { survived, fullCrew, scienceComplete, stars: Number(survived) + Number(fullCrew) + Number(scienceComplete) };
}
const endings: Record<string, string> = { perfect_handover: 'Great mission!', successful_handover: 'Mission complete', emergency_handover: 'Emergency handover', mission_failure: 'Mission ended' };
export function ResultsPage() {
  const { gameId = '' } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const [state, setState] = useState<GameStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let mounted = true;
    setLoading(true); setState(null); setError('');
    fetchGameState(gameId).then(game => {
      if (!mounted) return;
      rememberMission(game.game_id);
      if (game.state.status === 'running') { navigate(`/game/${gameId}`, { replace: true }); return; }
      if (!game.state.results) throw new Error('Results are unavailable.');
      setState(game.state); setLoading(false);
    }).catch((reason: unknown) => {
      if (!mounted) return;
      setError(reason instanceof Error ? reason.message : 'Could not load results.'); setLoading(false);
    });
    return () => { mounted = false; };
  }, [gameId, navigate, attempt]);
  if (loading) return <main className={styles.page}><p role="status">Loading results…</p></main>;
  if (!state?.results) return <main className={styles.page}><section className={styles.card}><p role="alert">{error}</p><button type="button" className="btn btn-primary" onClick={() => setAttempt(value => value + 1)}>Retry</button><Link to="/">Main menu</Link></section></main>;
  const results = state.results, rating = missionRating(results);
  const survivors = new Set(results.surviving_crew_ids);
  return <main className={styles.page}>
    <section className={styles.card} aria-label="Mission results">
      <p className={styles.outpost}>{state.station_name}</p>
      <h1>{endings[results.ending] || 'Mission ended'}</h1>
      <div className={styles.stars} role="img" aria-label={`${rating.stars} out of 3 stars`}>
        {[0, 1, 2].map(index => <svg key={index} viewBox="0 0 100 100" aria-hidden="true" data-earned={index < rating.stars}><path d="m50 7 13 27 30 4-22 22 5 30-26-14-26 14 5-30L7 38l30-4Z" /></svg>)}
      </div>
      <div className={styles.awards}>{[[rating.survived, 'Survived'], [rating.fullCrew, 'Full crew'], [rating.scienceComplete, 'All science']].map(([earned, title]) => <span key={String(title)} data-earned={Boolean(earned)}><span aria-hidden="true">{earned ? '✓' : '○'}</span> {title}</span>)}</div>
      <dl className={styles.stats}>
        <div><dt>♥ Crew survived</dt><dd>{survivors.size} / {results.initial_crew_size}</dd></div>
        <div><dt>◷ Weeks</dt><dd>{results.weeks_survived} / {state.duration_weeks}</dd></div>
        <div><dt>✦ Science goals</dt><dd>{results.science.completed_objectives} / {results.science.total_objectives}</dd></div>
      </dl>
      <ul className={styles.crew} aria-label="Crew">{state.crew.map(person => <li key={person.id} data-survived={survivors.has(person.id)} aria-label={`${person.name}, ${survivors.has(person.id) ? 'survived' : 'lost'}`}><Portrait person={person} /><strong>{person.name.split(' ')[0]}</strong><small>{survivors.has(person.id) ? 'Survived' : 'Lost'}</small></li>)}</ul>
      <div className={styles.actions}><Link to="/moon/" className="btn btn-primary">Play again</Link><Link to="/" className="btn btn-secondary">Main menu</Link></div>
    </section>
  </main>;
}
