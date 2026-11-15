import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Resources, Chance } from '../components/station/Visuals';

describe('Visual resource information', () => {
  it('repeats small consumables, retains exact continuous amounts and hides zero costs', () => {
    const { container } = render(<Resources values={{ medicine: 2, electricity: 1.25, food: 0 }} />);
    expect(screen.getByRole('img', { name: '2 medicine' }).querySelectorAll('.resource-icon')).toHaveLength(2);
    expect(screen.getByRole('img', { name: '1.25 electricity' })).toHaveTextContent('1.25');
    expect(container.querySelectorAll('.resource')).toHaveLength(2);
  });
  it('distinguishes retained equipment and exposes probability without relying on color', () => {
    render(<><Resources values={{ scientific_tools: 1 }} retained /><Chance value={.45} /></>);
    expect(screen.getByLabelText('Equipment needed, kept after use')).toBeInTheDocument();
    expect(screen.getByLabelText('45% chance of success')).toHaveTextContent('45%');
  });
});
