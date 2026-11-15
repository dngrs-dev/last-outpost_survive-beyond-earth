import { useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client';
import { fetchGameState, submitTurn } from '../api/game';
import type { GameStateResponse, TurnOutcome } from '../types/game';
import { confirmedActivities, plannedActivities, type CrewActivities } from '../components/station/stationPresentation';
import { rememberMission } from './lastMission';
import { newWeekPlan, readWeekPlan, saveWeekPlan, turnRequest, planIssues, type WeeklyPlan } from './weeklyPlan';

export function useStationMission(gameId: string) {
  const [state, setState] = useState<GameStateResponse | null>(null);
  const [plan, setPlan] = useState<WeeklyPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [rejected, setRejected] = useState(false);
  const [receipt, setReceipt] = useState<TurnOutcome | null>(null);
  const [recap, setRecap] = useState<CrewActivities | null>(null);
  const [attempt, setAttempt] = useState(0);
  const inFlight = useRef(false);
  const epoch = useRef(0);
  const planRef = useRef<WeeklyPlan | null>(null);

  const updatePlan = (next: WeeklyPlan) => {
    planRef.current = next;
    saveWeekPlan(gameId, next);
    setPlan(next);
  };

  useEffect(() => {
    const generation = ++epoch.current;
    inFlight.current = false;
    setLoading(true); setSubmitting(false); setState(null); setPlan(null); setReceipt(null); setRecap(null); setError(''); setRejected(false);
    fetchGameState(gameId).then(game => {
      if (generation !== epoch.current) return;
      rememberMission(game.game_id);
      const saved = readWeekPlan(gameId);
      const next = saved && (saved.pending || saved.week === game.state.current_week) ? saved : newWeekPlan(game.state);
      setState(game.state); updatePlan(next); setRejected(Boolean(next.rejection)); setError(next.rejection || ''); setLoading(false);
    }).catch((reason: unknown) => {
      if (generation !== epoch.current) return;
      setError(reason instanceof Error ? reason.message : 'Could not reach the outpost.'); setLoading(false);
    });
    return () => { epoch.current++; };
    // updatePlan only writes the current game key. Reloading is explicit.
  }, [gameId, attempt]);

  const refresh = async (message: string) => {
    const generation = epoch.current;
    const current = await fetchGameState(gameId);
    if (generation !== epoch.current) return;
    setState(current.state); updatePlan(newWeekPlan(current.state)); setReceipt(null); setRecap(null); setRejected(false); setError(message);
  };

  const send = async (): Promise<'report' | 'refreshed' | 'error'> => {
    const currentPlan = planRef.current;
    if (!state || !currentPlan || inFlight.current || (state.status !== 'running' && !currentPlan.pending)) return 'error';
    if (!currentPlan.pending) {
      const issues = planIssues(state, currentPlan);
      if (!currentPlan.rationsConfirmed || issues.length) { setError(issues[0] || 'Confirm weekly provisions first.'); return 'error'; }
    }
    const pending = currentPlan.pending || {
      request: turnRequest(currentPlan), activities: plannedActivities(state, currentPlan),
    };
    const generation = epoch.current;
    const retrying = Boolean(currentPlan.pending);
    inFlight.current = true;
    updatePlan({ ...currentPlan, pending });
    setSubmitting(true); setError(''); setRejected(false);
    try {
      const response = await submitTurn(gameId, pending.request);
      if (generation !== epoch.current) return 'error';
      // A replay is a historical receipt, so reconcile before replacing current state.
      if (retrying) {
        const latest = await fetchGameState(gameId);
        if (generation !== epoch.current) return 'error';
        if (latest.state.weeks_completed > response.state.weeks_completed) {
          setState(latest.state); updatePlan(newWeekPlan(latest.state));
          setError('Your saved week was confirmed. Another session has advanced the mission; the current station is shown.');
          return 'refreshed';
        }
      }
      setState(response.state);
      updatePlan(newWeekPlan(response.state));
      setReceipt(response.turn_outcome);
      setRecap(confirmedActivities(pending.activities, response.turn_outcome, response.state.crew));
      return 'report';
    } catch (reason: unknown) {
      if (generation !== epoch.current) return 'error';
      const message = reason instanceof Error ? reason.message : 'Week submission failed.';
      if (reason instanceof ApiError && reason.status === 409) {
        try { await refresh(`${message} The current mission state has been refreshed. Read the current incident before continuing.`); return 'refreshed'; }
        catch { setError('Could not refresh after a turn conflict. Retry the saved submission to recover.'); }
      } else if (reason instanceof ApiError && reason.status >= 400 && reason.status < 500 && reason.status !== 408) {
        updatePlan({ ...currentPlan, pending: undefined, rejection: `${message} The whole plan was rejected; this submission did not advance the week.` });
        setRejected(true); setError(`${message} The whole plan was rejected; this submission did not advance the week.`);
      } else {
        setError(`${message} The server may have processed this week. Retry the saved submission; supplies will not be charged twice.`);
      }
      return 'error';
    } finally {
      if (generation === epoch.current) { inFlight.current = false; setSubmitting(false); }
    }
  };

  return { state, plan, updatePlan, loading, submitting, error, rejected, receipt, recap, send,
    retryConnection: () => setAttempt(value => value + 1),
    rebuildRejected: () => refresh('The rejected plan has been cleared. Choose your orders again.'),
    dismissReceipt: () => { setReceipt(null); setRecap(null); },
  };
}
