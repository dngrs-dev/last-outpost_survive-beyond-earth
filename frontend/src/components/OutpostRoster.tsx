import type { OutpostOption } from '../types/moon';
import { OutpostDifficulty } from './OutpostDifficulty';
import styles from '../pages/MoonPage.module.css';

interface Props { options: OutpostOption[]; selected: OutpostOption; onSelect: (id: string) => void }

export function OutpostRoster({ options, selected, onSelect }: Props) {
  return <aside className={styles.directory} aria-label="Playable outposts">
    <p className={styles.sectionLabel}>OUTPOST ROSTER <span>{String(options.length).padStart(2, '0')}</span></p>
    <label className={styles.mobileSelect}>Choose an outpost
      <select value={selected.site.id} onChange={(event) => onSelect(event.target.value)}>
        {options.map(({ station, site, mission }) => <option key={site.id} value={site.id}>
          {station.name} / {station.difficulty} / {mission.duration_weeks} weeks
        </option>)}
      </select>
    </label>
    <div className={styles.siteList}>{options.map((option, index) => <button type="button"
      key={option.site.id} aria-pressed={selected.site.id === option.site.id}
      onClick={() => onSelect(option.site.id)} className={selected.site.id === option.site.id ? styles.selectedSite : ''}>
      <span className={styles.siteNumber}>{String(index + 1).padStart(2, '0')}</span>
      <span className={styles.rosterInfo}>
        <strong>{option.station.name.replace('Station ', '').replace(' — Research Base', '')}</strong>
        <small>{option.site.name} <span>· {option.mission.duration_weeks} weeks</span></small>
        <OutpostDifficulty station={option.station} />
      </span>
      <span className={styles.siteArrow} aria-hidden="true">{selected.site.id === option.site.id ? '›' : ''}</span>
    </button>)}</div>
    <p className={styles.archiveNote}>Fictional outposts.<br />Real lunar landing sites.</p>
  </aside>;
}
