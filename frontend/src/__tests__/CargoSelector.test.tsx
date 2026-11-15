import { expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CargoSelector } from '../components/CargoSelector';
import { catalog } from './fixtures/backend';

it('enforces the scanner limit for both buttons and direct entry', () => {
  const change = vi.fn();
  render(
    <CargoSelector
      items={catalog.items}
      cargo={{ diagnostic_tools: 1 }}
      onChangeCargo={change}
      onInspectItem={vi.fn()}
      recommended={{ diagnostic_tools: 1 }}
    />
  );
  expect(
    screen.getByRole('button', { name: 'Increase Medical diagnostic scanner' })
  ).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Increase Medical diagnostic scanner' })).toHaveTextContent('MAX');
  expect(screen.getByText('Recommended: 1')).toBeVisible();
  expect(screen.queryByText('MAX 1')).not.toBeInTheDocument();
  fireEvent.change(
    screen.getByLabelText('Medical diagnostic scanner quantity'),
    { target: { value: '8' } }
  );
  expect(change).toHaveBeenCalledWith('diagnostic_tools', 1);
});
