import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { useState } from 'react';
import { CrewSlots } from '../components/CrewSlots';
import { CargoSelector } from '../components/CargoSelector';
import { catalog } from './fixtures/backend';

function Assignment() {
  const [slots, setSlots] = useState(['alex', 'maya', 'lin', 'sam']);
  return <CrewSlots crew={catalog.crew} slots={slots} minCrew={2} maxCrew={4} onChange={setSlots} disabled={false} />;
}

describe('Crew slots and equipment', () => {
  it('offers all ten people in four slots and prevents duplicate assignments', () => {
    render(<Assignment />);
    expect(screen.getAllByRole('combobox')).toHaveLength(4);
    const slot1 = screen.getByRole('combobox', { name: 'Crew slot 1' });
    expect(within(slot1).getAllByRole('option')).toHaveLength(11);
    expect(within(slot1).getByRole('option', { name: /Maya Okafor/ })).toBeDisabled();
    fireEvent.change(slot1, { target: { value: 'inez' } });
    expect(screen.getByRole('heading', { name: 'Inez Costa' })).toBeInTheDocument();
    expect(within(screen.getByRole('combobox', { name: 'Crew slot 2' })).getByRole('option', { name: /Inez Costa/ })).toBeDisabled();
    expect(within(screen.getByRole('combobox', { name: 'Crew slot 2' })).getByRole('option', { name: /Alex Vega/ })).not.toBeDisabled();
  });

  it('allows empty seats and reports mission minimums and actual per-person demand', () => {
    render(<Assignment />);
    expect(screen.getByText('4 food / 8 water')).toBeInTheDocument();
    for (const index of [2, 3, 4]) fireEvent.change(screen.getByRole('combobox', { name: `Crew slot ${index}` }), { target: { value: '' } });
    expect(screen.getByRole('alert')).toHaveTextContent('at least 2');
    expect(screen.getByText('1.1 food / 2 water')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Alex Vega' })).toBeInTheDocument();
  });

  it('enforces the scanner limit for both buttons and direct entry', () => {
    const change = vi.fn();
    render(<CargoSelector items={catalog.items} limits={catalog.limits} cargo={{ diagnostic_tools: 1 }} onChangeCargo={change} />);
    expect(screen.getByRole('button', { name: 'Increase Medical diagnostic scanner' })).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Medical diagnostic scanner quantity'), { target: { value: '8' } });
    expect(change).toHaveBeenCalledWith('diagnostic_tools', 1);
    expect(screen.getByText(/Fictional gameplay cargo limits/)).toBeInTheDocument();
  });
});
