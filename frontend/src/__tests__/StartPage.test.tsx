import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { StartPage } from '../pages/StartPage';
import * as api from '../api/game';
import { ApiError } from '../api/client';
import {
  LAST_MISSION_KEY,
  readLastMission,
  rememberMission,
  forgetMission,
} from '../state/lastMission';
import { game, completed } from './fixtures/backend';

function openMenu() {
  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<StartPage />} />
        <Route path="/moon/" element={<p>Choose a Moon mission</p>} />
        <Route path="/game/:id" element={<p>Resumed mission</p>} />
        <Route path="/results/:id" element={<p>Mission report</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Title menu and mission resume', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    vi.spyOn(api, 'fetchGameState').mockResolvedValue(structuredClone(game));
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows the requested title, subtitle, and Play/Load without page chrome', () => {
    openMenu();
    expect(
      screen.getByRole('heading', { name: 'LAST OUTPOST', level: 1 })
    ).toBeInTheDocument();
    expect(screen.getByText('survive beyond earth')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Play' })).toHaveAttribute(
      'href',
      '/moon/'
    );
    expect(screen.getByRole('button', { name: 'Load' })).toBeDisabled();
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
    expect(api.fetchGameState).not.toHaveBeenCalled();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('opens Moon selection when Play is chosen and releases the page scroll lock', () => {
    openMenu();
    fireEvent.click(screen.getByRole('link', { name: 'Play' }));
    expect(screen.getByText('Choose a Moon mission')).toBeInTheDocument();
    expect(document.body.style.overflow).not.toBe('hidden');
  });

  it('loads the last running mission after asking the real game API', async () => {
    rememberMission(game.game_id);
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Load' }));
    expect(await screen.findByText('Resumed mission')).toBeInTheDocument();
    expect(api.fetchGameState).toHaveBeenCalledWith(game.game_id);
  });

  it('opens the actual report when the last mission has already ended', async () => {
    rememberMission(completed.game_id);
    vi.mocked(api.fetchGameState).mockResolvedValue(structuredClone(completed));
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Load' }));
    expect(await screen.findByText('Mission report')).toBeInTheDocument();
  });

  it('explains an expired server-held mission and keeps Play available', async () => {
    rememberMission(game.game_id);
    vi.mocked(api.fetchGameState).mockRejectedValue(
      new ApiError(404, 'Game not found')
    );
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Load' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That mission is no longer available'
    );
    expect(readLastMission()).toBeNull();
    expect(screen.getByRole('button', { name: 'Load' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Play' })).toBeInTheDocument();
  });

  it.each([new TypeError('Offline'), new ApiError(503, 'Unavailable')])(
    'retains the bookmark after a temporary failure: %s',
    async (error) => {
      rememberMission(game.game_id);
      vi.mocked(api.fetchGameState)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(structuredClone(game));
      openMenu();
      fireEvent.click(screen.getByRole('button', { name: 'Load' }));
      expect(await screen.findByRole('alert')).toHaveTextContent(
        'try Load again'
      );
      expect(readLastMission()).toBe(game.game_id);
      fireEvent.click(screen.getByRole('button', { name: 'Load' }));
      expect(await screen.findByText('Resumed mission')).toBeInTheDocument();
    }
  );

  it('handles disabled browser storage and malformed bookmarks without breaking Play', () => {
    localStorage.setItem(LAST_MISSION_KEY, '../not-a-game');
    expect(readLastMission()).toBeNull();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage blocked');
    });
    openMenu();
    expect(screen.getByRole('button', { name: 'Load' })).toBeDisabled();
    expect(screen.getByRole('link', { name: 'Play' })).toBeInTheDocument();
  });

  it('never clears a newer mission created in another tab after an expired load', async () => {
    rememberMission('older-game');
    let reject!: (reason: unknown) => void;
    vi.mocked(api.fetchGameState).mockImplementation(
      () =>
        new Promise((_, rejectPromise) => {
          reject = rejectPromise;
        })
    );
    openMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Load' }));
    rememberMission('newer-game');
    await act(async () => reject(new ApiError(404, 'Expired')));
    expect(readLastMission()).toBe('newer-game');
    expect(screen.getByRole('button', { name: 'Load' })).toBeEnabled();
  });

  it('updates Load when another browser tab starts or clears a mission', () => {
    openMenu();
    rememberMission(game.game_id);
    fireEvent(window, new StorageEvent('storage', { key: LAST_MISSION_KEY }));
    expect(screen.getByRole('button', { name: 'Load' })).toBeEnabled();
    forgetMission(game.game_id);
    fireEvent(window, new StorageEvent('storage', { key: LAST_MISSION_KEY }));
    expect(screen.getByRole('button', { name: 'Load' })).toBeDisabled();
  });

  it('respects reduced motion and lets the player explicitly resume and pause', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }))
    );
    openMenu();
    const resume = screen.getByRole('button', { name: 'Resume motion' });
    expect(resume).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(resume);
    expect(
      screen.getByRole('button', { name: 'Pause motion' })
    ).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Pause motion' }));
    expect(
      screen.getByRole('button', { name: 'Resume motion' })
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('keeps real imagery credits and the illustrative speed visible on demand', () => {
    openMenu();
    fireEvent.click(screen.getByText('Scene credits'));
    expect(screen.getByText(/six-minute Earth rotation/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Earth: NASA/ })).toHaveAttribute(
      'href',
      'https://svs.gsfc.nasa.gov/2915/'
    );
  });
});
