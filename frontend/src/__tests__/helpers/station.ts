import { fireEvent, screen } from '@testing-library/react';

export async function planningStep(step: 'Incident' | 'Crew' | 'Food & water' | 'Review') {
  const index = ['Incident', 'Crew', 'Food & water', 'Review'].indexOf(step) + 1;
  fireEvent.click(await screen.findByRole('button', { name: `Step ${index}: ${step}` }));
}

export async function reviewWeek() {
  await planningStep('Review');
  return screen.getByRole('button', { name: /^End week \d+$/ });
}

export async function fullReport(week = 1) {
  await screen.findByText(`WEEK ${week} DEBRIEF`);
  fireEvent.click(screen.getByText('Full weekly report'));
}
