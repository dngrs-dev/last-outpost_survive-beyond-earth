import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchMoonCatalog } from '../api/moon';
import { fetchCatalog } from '../api/game';
import { MoonGlobe } from '../components/MoonGlobe';
import { OutpostBriefing } from '../components/OutpostBriefing';
import { OutpostDetails } from '../components/OutpostDetails';
import type { MoonCatalog, OutpostOption } from '../types/moon';
import styles from './MoonPage.module.css';

interface SelectionData {
  archive: MoonCatalog;
  options: OutpostOption[];
}

export function MoonPage() {
  const [data, setData] = useState<SelectionData | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [params, setParams] = useSearchParams();

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setError('');
    Promise.all([fetchMoonCatalog(), fetchCatalog()])
      .then(([archive, catalog]) => {
        const options = archive.sites
          .map((site) => {
            const station = catalog.stations.find(
              (entry) => entry.id === site.training_station_id
            );
            const mission = catalog.missions.find(
              (entry) => entry.id === station?.mission_id
            );
            if (
              !station ||
              !mission ||
              station.lunar_site_id !== site.id ||
              mission.id !== site.training_mission_id
            ) {
              throw new Error(
                'We could not find the Moon missions. Try again.'
              );
            }
            return { site, station, mission };
          })
          .sort(
            (a, b) => a.station.difficulty_rank - b.station.difficulty_rank
          );
        if (!options.length)
          throw new Error('No Moon missions are available yet. Try again.');
        if (active) setData({ archive, options });
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason.message
              : 'We could not reach the Moon. Try again.'
          );
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const recommended = data?.options.reduce((best, option) =>
    option.station.difficulty_rank < best.station.difficulty_rank
      ? option
      : best
  );
  const selected =
    data?.options.find((option) => option.site.id === params.get('site')) ??
    recommended;
  const select = (site: string) => setParams({ site }, { replace: true });
  const index =
    data?.options.findIndex((option) => option.site.id === selected?.site.id) ??
    0;
  const step = (direction: number) => {
    if (data)
      select(
        data.options[
          (index + direction + data.options.length) % data.options.length
        ].site.id
      );
  };

  return (
    <main className={styles.page} aria-label="Choose a Moon mission">
      <div className={styles.stars} aria-hidden="true">
        {Array.from({ length: 80 }, (_, i) => (
          <i
            key={i}
            style={{
              left: `${(i * 73.37) % 100}%`,
              top: `${(i * 39.73) % 100}%`,
              opacity: 0.18 + (i % 5) / 9,
              width: i % 7 === 0 ? 3 : 1.5,
              height: i % 7 === 0 ? 3 : 1.5,
            }}
          />
        ))}
      </div>
      <Link
        to="/"
        className={styles.back}
        aria-label="Back to main menu"
      >
        ← <span>Back</span>
      </Link>
      <div className={styles.intro}>
        <p>DESTINATION / THE MOON</p>
        <h1>Where will you land?</h1>
        <span>Pick an outpost. Your adventure starts here.</span>
      </div>
      {error ? (
        <section className={styles.loading} role="alert">
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Try again
          </button>
          <Link to="/crew/">Go to crew selection</Link>
        </section>
      ) : !data || !selected ? (
        <p className={styles.loading} role="status">
          Finding your Moon missions...
        </p>
      ) : (
        <>
          <section className={styles.viewer} aria-label="Explore the Moon">
            <MoonGlobe
              options={data.options}
              selected={selected.site}
              texture={data.archive.texture.path}
              onSelect={select}
            />
            <p className={styles.mapHint}>
              Drag to explore <span aria-hidden="true">·</span> Tap an outpost
              to choose
            </p>
          </section>
          <OutpostBriefing
            option={selected}
            recommended={selected.site.id === recommended?.site.id}
            index={index}
            count={data.options.length}
            onPrevious={() => step(-1)}
            onNext={() => step(1)}
            onDetails={() => setDetailsOpen(true)}
          />
          <p className={styles.credit}>
            Real Moon surface: NASA SVS <span>· Fictional outposts</span>
          </p>
          {detailsOpen && (
            <OutpostDetails
              option={selected}
              archive={data.archive}
              onClose={() => setDetailsOpen(false)}
            />
          )}
        </>
      )}
    </main>
  );
}
