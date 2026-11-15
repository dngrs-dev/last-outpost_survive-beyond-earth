import { useState } from 'react';
import type { TurnOutcome } from '../../types/game';
import { NotebookDialog, PageTurns } from './NotebookDialog';
import { reportPages } from './reportPages';

export function ReportNotebook({ outcome, names, ended, onContinue }: {
  outcome: TurnOutcome; names: Record<string, string>; ended: boolean; onContinue: () => void;
}) {
  const [page, setPage] = useState(0);
  const pages = reportPages(outcome, names);
  return <NotebookDialog title={`WEEK ${outcome.week} DEBRIEF`} subtitle="CONFIRMED RESULTS" onClose={onContinue} controls={<>
    <PageTurns page={page} count={pages.length} onChange={setPage} />
    <button type="button" className="btn btn-primary" onClick={onContinue}>{ended ? 'View final mission results' : `PROCEED TO WEEK ${outcome.week + 1}`}</button>
  </>}><h2>{pages[page].title}</h2><p>{pages[page].text}</p><small>Confirmed backend result · Survival and scientific achievement are separate.</small></NotebookDialog>;
}
