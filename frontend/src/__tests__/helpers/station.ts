import { fireEvent, screen, within } from '@testing-library/react';
import type { GameResponse } from '../../types/game';
import { taskName } from '../../components/station/CrewNotebook';
import { game } from '../fixtures/backend';

export function book() { return within(screen.getByRole('dialog')); }
export function closeBook() {
  const dialog = screen.queryByRole('dialog');
  if (dialog) fireEvent.click(within(dialog).getByRole('button', { name: 'Close panel' }));
}

export function notebookPage(title: string) {
  for (let count = 0; count < 120; count++) {
    if (book().queryByRole('heading', { name: title, level: 2 })) return;
    const next = book().getByRole('button', { name: 'Next page' });
    if ((next as HTMLButtonElement).disabled) break;
    fireEvent.click(next);
  }
  throw new Error(`Notebook page not found: ${title}`);
}

export function notebookText(pattern: RegExp) {
  for (let count = 0; count < 120; count++) {
    if (book().queryByText(pattern)) return;
    const next = book().getByRole('button', { name: 'Next page' });
    if ((next as HTMLButtonElement).disabled) break;
    fireEvent.click(next);
  }
  throw new Error(`Notebook text not found: ${pattern}`);
}

export async function confirmIncident(fixture: GameResponse = game, options: { choiceId?: string; leadId?: string; supportIds?: string[] } = {}) {
  await screen.findByRole('dialog', { name: fixture.state.current_event!.title });
  const choice = fixture.state.current_event!.choices.find(choice => options.choiceId ? choice.id === options.choiceId : choice.available && !choice.requires_crew)
    || fixture.state.current_event!.choices.find(choice => choice.available)!;
  fireEvent.click(book().getByRole('button', { name: choice.text }));
  if (choice.requires_crew) {
    const lead = options.leadId || [...choice.eligible_crew].filter(candidate => candidate.available).sort((a, b) => b.success_probability - a.success_probability)[0].crew_id;
    fireEvent.click(book().getByRole('button', { name: fixture.state.crew.find(person => person.id === lead)!.name }));
    const supports = options.supportIds || choice.support_candidates.filter(candidate => candidate.available && candidate.crew_id !== lead).slice(0, Math.max(0, choice.minimum_crew - 1)).map(candidate => candidate.crew_id);
    for (const id of supports) fireEvent.click(book().getByRole('button', { name: fixture.state.crew.find(person => person.id === id)!.name }));
  }
  fireEvent.click(book().getByRole('button', { name: 'Confirm response' }));
  return choice;
}

export async function chooseCrewTask(fixture: GameResponse, id: string, activityId: string, patient?: string) {
  const person = fixture.state.crew.find(person => person.id === id)!;
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^Inspect ${person.name},`) }));
  const option = fixture.state.assignment_options.find(option => option.id === activityId)!;
  const category = option.action_type === 'medical' ? 'Care' : option.action_type === 'research' ? 'Explore' : option.action_type === 'maintenance' ? 'Fix' : 'Rest';
  fireEvent.click(book().getByRole('button', { name: category }));
  fireEvent.click(book().getByRole('button', { name: taskName(option.id, option.text) }));
  if (option.action_type === 'medical' && patient) {
    const id = patient.split(':')[0];
    const target = fixture.state.crew.find(person => person.id === id)!;
    const condition = target.medical_conditions.find(condition => condition.kind === patient.split(':')[1])!;
    fireEvent.click(book().getByRole('button', { name: `${target.name}: ${condition.title}` }));
  }
  fireEvent.click(book().getByRole('button', { name: 'Confirm assignment' }));
}

export async function provisions() {
  closeBook();
  fireEvent.click(await screen.findByRole('button', { name: 'Inspect station supplies' }));
  await screen.findByRole('dialog', { name: 'Food & water' });
}
export async function reviewWeek(_fixture: GameResponse = game) {
  await provisions();
  fireEvent.click(book().getByRole('button', { name: 'Feed everyone' }));
  fireEvent.click(book().getByRole('button', { name: 'Done' }));
  return screen.getByRole('button', { name: 'Next week' });
}

export async function openStatus(section: string) {
  closeBook();
  fireEvent.click(await screen.findByRole('button', { name: 'Station status' }));
  fireEvent.click(book().getByRole('button', { name: section }));
}
