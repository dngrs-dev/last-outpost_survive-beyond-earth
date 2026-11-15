import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchGameState } from '../api/game';
import { ApiError } from '../api/client';
import { EarthBackdrop } from '../components/EarthBackdrop';
import {
  forgetMission,
  LAST_MISSION_KEY,
  readLastMission,
} from '../state/lastMission';
import styles from './StartPage.module.css';

const prefersStillScene = () =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function StartPage() {
  const navigate = useNavigate();
  const [lastMission, setLastMission] = useState(readLastMission);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [playing, setPlaying] = useState(() => !prefersStillScene());
  const [animationAvailable, setAnimationAvailable] = useState(true);
  const busy = useRef(false);
  const mounted = useRef(true);
  const credits = useRef<HTMLDetailsElement>(null);
  const onUnavailable = useCallback(() => setAnimationAvailable(false), []);

  useEffect(() => {
    mounted.current = true;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const update = (event: StorageEvent) => {
      if (event.key === LAST_MISSION_KEY || event.key === null) {
        setLastMission(readLastMission());
        setError('');
      }
    };
    window.addEventListener('storage', update);
    return () => {
      mounted.current = false;
      document.body.style.overflow = previous;
      window.removeEventListener('storage', update);
    };
  }, []);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => {
      if (preference.matches) setPlaying(false);
    };
    preference.addEventListener('change', change);
    return () => preference.removeEventListener('change', change);
  }, []);

  const load = async () => {
    if (!lastMission || busy.current) return;
    busy.current = true;
    setLoading(true);
    setError('');
    try {
      const game = await fetchGameState(lastMission);
      if (!mounted.current) return;
      navigate(
        `/${game.state.status === 'running' ? 'game' : 'results'}/${encodeURIComponent(game.game_id)}`
      );
    } catch (reason: unknown) {
      if (!mounted.current) return;
      if (reason instanceof ApiError && reason.status === 404) {
        forgetMission(lastMission);
        setLastMission(readLastMission());
        setError(
          'That mission is no longer available. Choose Play for a new adventure.'
        );
      } else {
        setError(
          'We could not reach your mission. Check your connection and try Load again.'
        );
      }
    } finally {
      busy.current = false;
      if (mounted.current) setLoading(false);
    }
  };

  return (
    <main className={styles.page} aria-label="Last Outpost main menu">
      <div className={styles.scene} aria-hidden="true">
        <div className={styles.stars}>
          {Array.from({ length: 100 }, (_, index) => (
            <i
              key={index}
              style={{
                left: `${(index * 73.37) % 100}%`,
                top: `${(index * 39.73) % 100}%`,
                opacity: 0.15 + (index % 5) / 10,
              }}
            />
          ))}
        </div>
        <EarthBackdrop
          animate={playing && animationAvailable}
          onUnavailable={onUnavailable}
        />
        <div className={styles.terrain} />
        <div className={styles.shade} />
      </div>

      <div className={styles.title}>
        <h1>
          <span>LAST</span> <span>OUTPOST</span>
        </h1>
        <p>survive beyond earth</p>
      </div>

      <nav className={styles.actions} aria-label="Start or load a mission">
        <Link to="/moon/" className={styles.play}>
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="m8 5 11 7-11 7z" />
          </svg>
          Play
        </Link>
        <button
          type="button"
          className={styles.load}
          disabled={!lastMission || loading}
          onClick={load}
          aria-busy={loading}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M3 7h6l2 2h10v11H3zM3 7V4h7l2 3" />
          </svg>
          {loading ? 'Loading...' : 'Load'}
        </button>
        <div className={styles.loadMessage}>
          {error ? (
            <p role="alert">{error}</p>
          ) : (
            <p aria-live="polite">
              {lastMission
                ? 'Return to your last mission.'
                : 'Your last mission will appear here.'}
            </p>
          )}
        </div>
      </nav>

      <button
        type="button"
        className={styles.motion}
        disabled={!animationAvailable}
        aria-pressed={!playing || !animationAvailable}
        onClick={() => setPlaying((value) => !value)}
      >
        <span aria-hidden="true">
          {playing && animationAvailable ? '\u2161' : '\u25b7'}
        </span>
        {animationAvailable
          ? playing
            ? 'Pause motion'
            : 'Resume motion'
          : 'Still view'}
      </button>
      <details
        ref={credits}
        className={styles.credits}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && credits.current) {
            credits.current.open = false;
            credits.current.querySelector('summary')?.focus();
          }
        }}
      >
        <summary>Scene credits</summary>
        <div>
          <h2>A little closer to home</h2>
          <p>
            Earth uses NASA's Blue Marble satellite mosaic. The Moon foreground
            is an Apollo 17 surface panorama, photographed at Station 7.
          </p>
          <p>
            <a
              href="https://svs.gsfc.nasa.gov/2915/"
              target="_blank"
              rel="noreferrer"
            >
              Earth: NASA/GSFC Scientific Visualization Studio
            </a>
            . Data courtesy Reto Stockli, NASA Earth Observatory.
          </p>
          <p>
            <a
              href="https://images.nasa.gov/details/jsc2004e52775"
              target="_blank"
              rel="noreferrer"
            >
              Lunar panorama: NASA/JSC, jsc2004e52775
            </a>
          </p>
          <p>
            This is an artistic composition, not a live view. Scale, framing,
            lighting, and the six-minute Earth rotation are illustrative. Stars
            are decorative. All images are cached locally.
          </p>
          <p>
            Load resumes a mission from this browser while it is available on
            the game server. Server restarts currently clear missions.
          </p>
          <a
            href="https://www.nasa.gov/nasa-brand-center/images-and-media/"
            target="_blank"
            rel="noreferrer"
          >
            NASA media guidelines
          </a>
        </div>
      </details>
    </main>
  );
}
