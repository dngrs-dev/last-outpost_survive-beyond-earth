import { Link } from 'react-router-dom';
import type { OutpostOption } from '../types/moon';
import { OutpostDifficulty } from './OutpostDifficulty';
import styles from '../pages/MoonPage.module.css';

export function OutpostBriefing({
  option,
  recommended,
  index,
  count,
  onPrevious,
  onNext,
  onDetails,
}: {
  option: OutpostOption;
  recommended: boolean;
  index: number;
  count: number;
  onPrevious: () => void;
  onNext: () => void;
  onDetails: () => void;
}) {
  const { station, mission } = option;
  return (
    <section className={styles.brief} aria-labelledby="selected-outpost">
      <div className={styles.selectionRow}>
        <span className={styles.eyebrow}>
          YOUR OUTPOST{' '}
          <span>
            {index + 1} / {count}
          </span>
        </span>
        <div
          className={styles.missionNavigation}
          aria-label="Browse Moon missions"
        >
          <button
            type="button"
            onClick={onPrevious}
            aria-label="Previous mission"
          >
            ←
          </button>
          <button type="button" onClick={onNext} aria-label="Next mission">
            →
          </button>
        </div>
      </div>
      <h2 id="selected-outpost">
        {station.name
          .replace('Station ', '')
          .replace(' \u2014 Research Base', '')}
      </h2>
      <p className={styles.missionName}>{mission.name}</p>
      <div className={styles.missionMeta}>
        <OutpostDifficulty station={station} />
        <span>{mission.duration_weeks} weeks</span>
        {recommended && (
          <span className={styles.recommended}>Good first mission</span>
        )}
      </div>
      <p className={styles.challenge}>{station.challenge}</p>
      <div className={styles.missionActions}>
        <Link
          className={styles.launch}
          to={`/crew/?station=${encodeURIComponent(station.id)}&lunar_site=${encodeURIComponent(option.site.id)}`}
        >
          Choose this mission <span aria-hidden="true">→</span>
        </Link>
        <button
          type="button"
          className={styles.detailsButton}
          onClick={onDetails}
          aria-label="Mission details and Moon facts"
        >
          i
        </button>
      </div>
      <p className={styles.nextStep}>
        Next: choose your crew and pack your supplies.
      </p>
    </section>
  );
}
