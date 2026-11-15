import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { StationRoom, type StationBookmark } from '../components/station/StationRoom';
import { plannedActivities } from '../components/station/stationPresentation';
import { NotebookDialog, PageTurns, textPages } from '../components/station/NotebookDialog';
import { IncidentNotebook } from '../components/station/IncidentNotebook';
import { CrewNotebook } from '../components/station/CrewNotebook';
import { ProvisionsNotebook } from '../components/station/ProvisionsNotebook';
import { ReviewNotebook } from '../components/station/ReviewNotebook';
import { ReportNotebook } from '../components/station/ReportNotebook';
import { StationNotebook, type StationBook } from '../components/station/StationNotebook';
import { useStationMission } from '../state/useStationMission';
import { bookedCrew, type WeeklyPlan } from '../state/weeklyPlan';
import styles from './GamePage.module.css';

type View = StationBook | 'incident' | 'crew' | 'rations' | 'review' | 'report' | 'recovery' | null;

export const GamePage = () => {
  const { gameId = '' } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const mission = useStationMission(gameId);
  const { state, plan, receipt } = mission;
  const [view, setView] = useState<View>(null);
  const [crewId, setCrewId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');

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
    const books: Record<StationBookmark, View> = { Crew: 'away', Stores: 'stores', Systems: 'status', Science: 'status', Log: 'journal', Away: 'away' };
    setView(books[object]);
  };
  const commit = (next: WeeklyPlan, message: string) => {
    if (plan.pending || plan.rationsConfirmed || next.week !== state.current_week) return;
    mission.updatePlan(next); setNotice(message); setView(null);
  };
  const nextWeek = () => setView(plan.pending ? 'recovery' : !plan.incidentConfirmed ? 'incident' : !plan.rationsConfirmed ? 'rations' : 'review');
  const send = async () => {
    setView('recovery');
    const result = await mission.send();
    if (result === 'refreshed') setView('recovery');
  };
  const continueWeek = () => {
    if (state.status !== 'running') navigate(`/results/${gameId}`);
    else { mission.dismissReceipt(); setNotice('A new week begins. Read the incident before giving orders.'); setView(null); }
  };
  const urgent = state.depleted_provisions.length > 0 || state.life_support.co2_burden > state.life_support.co2_warning_level || state.crew.some(person => person.alive && person.medical_conditions.some(condition => condition.urgent));
  const guidance = plan.pending ? 'Awaiting confirmation. Use the saved retry.' : !plan.incidentConfirmed ? 'Read this week’s incident.' : plan.rationsConfirmed ? 'Orders closed. Next Week opens the final check.' : notice || (state.current_week === 1 ? 'Click a free astronaut to give one job. Next Week handles provisions.' : 'Choose crew work, or continue with routine duties.');
  return <main className={styles.screen}>
    <StationRoom state={state} activities={activities} mode={receipt ? 'report' : plan.pending ? 'pending' : 'planning'}
      selectedCrewId={view === 'crew' ? crewId : null} onSelectCrew={openCrew} onOpen={openObject} disabled={false}
      bookedIds={plan.rationsConfirmed ? state.crew.filter(person => person.alive).map(person => person.id) : bookedCrew(plan)} rations={plan.rations} modalOpen={view !== null} />
    <div className={styles.week}><strong>WEEK {state.current_week} / {state.duration_weeks}</strong><small>{state.station_name}</small></div>
    <button type="button" className={styles.help} aria-label="Open field guide" onClick={() => setView('help')}>?</button>
    <p className={styles.guidance} role="status">{guidance}</p>
    {urgent && <button type="button" className={styles.warning} onClick={() => setView('status')}>Station needs attention</button>}
    <button type="button" className={`${styles.nextWeek} btn btn-primary`} disabled={mission.submitting || Boolean(receipt)} onClick={nextWeek}>{plan.pending ? `Recover week ${plan.pending.request.expected_week}` : 'Next week'} <span aria-hidden="true">→</span></button>

    {view === 'incident' && !plan.incidentConfirmed && <IncidentNotebook key={`incident-${plan.week}`} state={state} plan={plan} onClose={() => setView(null)} onCommit={next => commit(next, next.selected_crew_id ? 'Response committed. Assigned crew are on incident duty; click another astronaut for work.' : 'Response committed. Crew remain available. Click a teammate, or Next Week.')} />}
    {view === 'crew' && person && <CrewNotebook key={`crew-${person.id}-${plan.week}`} person={person} state={state} plan={plan} onClose={() => setView(null)} onCommit={next => commit(next, 'Assignment committed for this week. Choose another free astronaut, or Next Week for provisions.')} />}
    {view === 'rations' && !plan.rationsConfirmed && <ProvisionsNotebook state={state} plan={plan} onClose={() => setView(null)} onCommit={next => { if (plan.pending) return; mission.updatePlan(next); setView('review'); setNotice('Orders closed for this week.'); }} />}
    {view === 'review' && <ReviewNotebook state={state} plan={plan} submitting={mission.submitting} onSend={send} onClose={() => setView(null)} />}
    {view === 'report' && receipt && <ReportNotebook outcome={receipt} names={names} ended={state.status !== 'running'} onContinue={continueWeek} />}
    {(['status', 'stores', 'journal', 'away', 'help'] as View[]).includes(view) && view && <StationNotebook key={`${view}-${state.current_week}`} book={view as StationBook} state={state} plan={plan} onUpdate={next => { if (!plan.pending && !plan.rationsConfirmed) mission.updatePlan(next); }} onCrew={openCrew} onClose={() => setView(null)} />}
    {view === 'recovery' && <RecoveryNotebook message={mission.error || (mission.submitting ? 'Resolving the complete week. Your orders are locked.' : 'Your saved submission is waiting for confirmation. Retry the same request to recover safely.')}
      pendingWeek={plan.pending?.request.expected_week} rejected={mission.rejected} submitting={mission.submitting}
      onRetry={send} onRebuild={async () => { try { await mission.rebuildRejected(); setView('incident'); } catch { setNotice('Could not refresh the mission. Try recovery again.'); } }} onClose={() => setView(null)} />}
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
