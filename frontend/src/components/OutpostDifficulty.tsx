import type { StationDefinition } from '../types/game';
import styles from '../pages/MoonPage.module.css';

export function OutpostDifficulty({ station }: { station: StationDefinition }) {
  return <span className={styles.difficulty} data-rank={station.difficulty_rank}
    aria-label={`${station.difficulty} difficulty, ${station.difficulty_rank} of 5`}>
    <span className={styles.difficultyBars} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((rank) => <i key={rank} data-active={rank <= station.difficulty_rank} />)}
    </span>
    {station.difficulty}
  </span>;
}
