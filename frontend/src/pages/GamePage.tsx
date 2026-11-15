import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { StationRoom, type StationBookmark } from '../components/station/StationRoom';
import { plannedActivities } from '../components/station/stationPresentation';
import { NotebookDialog, PageTurns, textPages } from '../components/station/NotebookDialog';
import { IncidentNotebook } from '../components/station/IncidentNotebook';
import { CrewNotebook } from '../components/station/CrewNotebook';
import { MealsBoard } from '../components/station/Meals';
import { Portrait } from '../components/station/Visuals';
import { ReportNotebook } from '../components/station/ReportNotebook';
import { StationNotebook, type StationBook } from '../components/station/StationNotebook';
import { useStationMission } from '../state/useStationMission';
import { bookedCrew, missingMeals, planIssues, type WeeklyPlan } from '../state/weeklyPlan';
import styles from './GamePage.module.css';

type View = StationBook | 'incident' | 'crew' | 'rations' | 'warning' | 'report' | 'recovery' | null;

export const GamePage = () => {
  const { gameId = '' } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const mission = useStationMission(gameId);
  const { state, plan, receipt } = mission;
  const [view, setView] = useState<View>(null);
  const [crewId, setCrewId] = useState<string | null>(null);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    if (!state || !plan) return;
    if (receipt) setView('report');
    else if (plan.pending) setView('recovery');
    else if (mission.rejected) setView('recovery');
    else if (state.status !== 'running') navigate(`/results/${gameId}`, { replace: true });
    else if (!plan.incidentConfirmed) setView('incident');
  }, [state?.current_week, state?.status, plan?.incidentConfirmed, Boolean(plan?.pending), receipt, mission.rejected, gameId, navigate]);

  if (mission.loading) return <main className={styles.connection}><p role="status">Connecting to your outpost…</p></main>;
  if (!state || !plan) return <main className={styles.connection}><p role="alert">{mission.error || 'Mission unavailable.'}</p><button type="button" className="btn btn-primary" onClick={mission.retryConnection}>Retry connection</button></main>;

  const activities = receipt && mission.recap ? mission.recap : plannedActivities(state, plan);
  const names = Object.fromEntries(state.crew.map(person => [person.id, person.name]));
  const person = state.crew.find(person => person.id === crewId);
  const openCrew = (id: string) => {
    setCrewId(id); setView('crew');
  };
  const openObject = (object: StationBookmark) => {
    const books: Record<StationBookmark, View> = { Crew: 'away', Stores: 'rations', Systems: 'status', Science: 'status', Log: 'journal', Away: 'away' };
    setView(books[object]);
  };
  const commit = (next: WeeklyPlan) => {
    if (plan.pending || mission.rejected || next.week !== state.current_week) return;
    mission.updatePlan(next); setView(null);
  };
  const update = (next: WeeklyPlan) => { if (!plan.pending && !mission.rejected && next.week === state.current_week) mission.updatePlan(next); };
  const nextWeek = () => {
    if (plan.pending || mission.rejected) { setView('recovery'); return; }
    if (planIssues(state, plan).length) { setView('warning'); return; }
    void send();
  };
  const send = async () => {
    setView('recovery');
    const result = await mission.send();
    if (result === 'refreshed') setView('recovery');
  };
  const continueWeek = () => {
    if (state.status !== 'running') navigate(`/results/${gameId}`);
    else { mission.dismissReceipt(); setView(null); }
  };
  const urgent = state.depleted_provisions.length > 0 || state.life_support.co2_burden > state.life_support.co2_warning_level || state.crew.some(person => person.alive && person.medical_conditions.some(condition => condition.urgent));
  return <main className={styles.screen}>
    <StationRoom state={state} activities={activities} mode={receipt ? 'report' : plan.pending ? 'pending' : 'planning'}
      selectedCrewId={view === 'crew' ? crewId : null} onSelectCrew={openCrew} onOpen={openObject} disabled={false}
      bookedIds={bookedCrew(plan)} rations={plan.rations} modalOpen={view !== null} />
    <div className={styles.week}><strong>WEEK {state.current_week} / {state.duration_weeks}</strong><small>{state.station_name}</small></div>
    <button type="button" className={styles.help} aria-label="Open field guide" onClick={() => setView('help')}>?</button>
    {urgent && <button type="button" className={styles.warning} onClick={() => setView('status')}>Station needs attention</button>}
    <button type="button" className={`${styles.nextWeek} btn btn-primary`} disabled={mission.submitting || Boolean(receipt)} onClick={nextWeek}>{plan.pending ? `Recover week ${plan.pending.request.expected_week}` : 'Next week'} <span aria-hidden="true">→</span></button>

    {view === 'incident' && !plan.incidentConfirmed && <IncidentNotebook key={`incident-${plan.week}`} state={state} plan={plan} onClose={() => setView(null)} onCommit={commit} />}
    {view === 'crew' && person && <CrewNotebook key={`crew-${person.id}-${plan.week}`} person={person} state={state} plan={plan} onClose={() => setView(null)} onCommit={commit} onUpdate={update} />}
    {view === 'rations' && <MealsBoard state={state} plan={plan} onUpdate={update} onClose={() => setView(null)} onStores={() => setView('stores')} />}
    {view === 'warning' && <NotebookDialog title="Before we go…" size="small" onClose={() => setView(null)} controls={<button type="button" className="btn btn-primary" onClick={() => setView(null)}>Back to station</button>}>
      {!plan.incidentConfirmed && <button className="btn btn-secondary" type="button" onClick={() => setView('incident')}>Choose an incident response</button>}
      {missingMeals(state, plan).map(({ person, resources }) => <button className="missing-meal" type="button" key={person.id} onClick={() => setView('rations')}><Portrait person={person} /><span><strong>{person.name}</strong><small>Needs {resources.join(' and ')}</small></span></button>)}
      {planIssues(state, plan).filter(issue => !issue.includes('needs ') && !issue.startsWith('Confirm an available')).map(issue => <p className="panel-warning" role="alert" key={issue}>{issue}</p>)}
    </NotebookDialog>}
    {view === 'report' && receipt && <ReportNotebook outcome={receipt} names={names} ended={state.status !== 'running'} onContinue={continueWeek} />}
    {(['status', 'stores', 'journal', 'away', 'help'] as View[]).includes(view) && view && <StationNotebook key={`${view}-${state.current_week}`} book={view as StationBook} state={state} plan={plan} onUpdate={update} onCrew={openCrew} onClose={() => setView(null)} />}
    {view === 'recovery' && <RecoveryNotebook message={localError || mission.error || (mission.submitting ? 'Resolving the complete week. Your orders are locked.' : 'Your saved submission is waiting for confirmation. Retry the same request to recover safely.')}
      pendingWeek={plan.pending?.request.expected_week} rejected={mission.rejected} submitting={mission.submitting}
      onRetry={send} onRebuild={async () => { try { await mission.rebuildRejected(); setView('incident'); } catch { setLocalError('Could not refresh the mission. Try recovery again.'); } }} onClose={() => setView(null)} />}
  </main>;
};

function RecoveryNotebook({ message, pendingWeek, rejected, submitting, onRetry, onRebuild, onClose }: {
  message: string; pendingWeek?: number; rejected: boolean; submitting: boolean; onRetry: () => void; onRebuild: () => void; onClose: () => void;
}) {
  const [page, setPage] = useState(0);
  const pages = textPages(message, 230);
  return <NotebookDialog title={submitting ? 'Resolving the week' : 'Mission connection'} subtitle="SAVED ORDERS · SAFE RECOVERY" onClose={onClose} controls={<>
    <PageTurns page={Math.min(page, pages.length - 1)} count={pages.length} onChange={setPage} />
    {pendingWeek !== undefined ? <button type="button" className="btn btn-primary" disabled={submitting} onClick={onRetry}>{submitting ? 'Waiting for confirmation…' : `Retry week ${pendingWeek} submission`}</button>
      : rejected ? <button type="button" className="btn btn-primary" onClick={onRebuild}>Rebuild rejected week</button>
      : <button type="button" className="btn btn-primary" onClick={onClose}>Return to station</button>}
  </>}><p role="alert">{pages[Math.min(page, pages.length - 1)]}</p><small>{pendingWeek !== undefined ? 'The exact request is retained across refreshes. Reading the station cannot change it.' : 'Only a server-rejected plan can be rebuilt. Confirmed weekly choices stay locked during normal play.'}</small></NotebookDialog>;
}
