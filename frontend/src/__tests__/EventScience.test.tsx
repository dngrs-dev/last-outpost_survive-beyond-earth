import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EventCard } from '../components/EventCard';
import { opportunityGame } from './fixtures/backend';

describe('Researched event presentation', () => {
  it('labels an opportunity and reveals its real source separately from game values', () => {
    const event = opportunityGame.state.current_event!;
    render(<EventCard event={event} selectedChoiceId="" selectedCrewId={null} onSelectChoice={vi.fn()} onSelectCrew={vi.fn()} />);
    expect(screen.getByText('OPPORTUNITY')).toBeInTheDocument();
    expect(screen.queryByText('CRITICAL EVENT')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Science behind this scenario'));
    expect(screen.getByText(event.science_context)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /NASA reference/ })).toHaveAttribute('href', event.source_url);
    expect(screen.getByText(/effects are fictional gameplay values/)).toBeInTheDocument();
  });
});
