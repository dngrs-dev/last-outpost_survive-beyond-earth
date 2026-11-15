import { useId } from 'react';
import { AstronautAvatar } from '../AstronautAvatar';
import { RoleIcon } from '../RoleIcon';
import type { CrewResponse } from '../../types/game';
import styles from './StationRoom.module.css';

export type StationBookmark = 'Crew' | 'Stores' | 'Systems' | 'Science' | 'Log';

/** Fixed anchors keep the shared character rig behind the table and in its seat. */
export function StationRoom({ crew, selectedCrewId, onSelectCrew, onOpen, disabled }: {
  crew: CrewResponse[];
  selectedCrewId: string | null;
  onSelectCrew: (id: string) => void;
  onOpen: (bookmark: StationBookmark) => void;
  disabled: boolean;
}) {
  const id = `room-${useId().replace(/:/g, '')}`;
  return <section className={styles.room} aria-label="Station common room">
    <div className={styles.scene}>
      <svg viewBox="0 0 1000 760" aria-hidden="true" className={styles.interior}>
        <defs>
          <linearGradient id={`${id}-wall`} x2="0" y2="1"><stop stopColor="#203c52" /><stop offset="1" stopColor="#0b1726" /></linearGradient>
          <linearGradient id={`${id}-floor`} x2="0" y2="1"><stop stopColor="#22384a" /><stop offset="1" stopColor="#080f1c" /></linearGradient>
          <linearGradient id={`${id}-seat`} x2="0" y2="1"><stop stopColor="#4b6578" /><stop offset="1" stopColor="#1b3042" /></linearGradient>
          <radialGradient id={`${id}-light`}><stop stopColor="#8ed9e7" stopOpacity=".13" /><stop offset="1" stopColor="#8ed9e7" stopOpacity="0" /></radialGradient>
        </defs>
        <path d="M50 490V170Q50 40 220 30H780Q950 40 950 170V490Z" fill={`url(#${id}-wall)`} stroke="#40566a" strokeWidth="5" />
        <path d="M50 490Q500 330 950 490L1000 760H0Z" fill={`url(#${id}-floor)`} />
        <path d="M80 490V185Q80 65 230 60H770Q920 65 920 185V490M130 470V195Q130 110 240 105H760Q870 110 870 195V470" fill="none" stroke="#344f63" strokeWidth="8" />
        <path d="M250 75H750" stroke="#99dae8" strokeWidth="5" strokeLinecap="round" />
        <ellipse cx="500" cy="430" rx="410" ry="350" fill={`url(#${id}-light)`} />
        <g stroke="#35566d" strokeWidth="3">
          <rect x="367" y="135" width="266" height="132" rx="62" fill="#050e1a" />
          <path d="M380 242Q490 185 620 245" fill="#87979c" />
          <path d="M390 245Q490 215 610 249" fill="none" stroke="#b1bfc0" />
          <circle cx="514" cy="180" r="19" fill="#477da2" stroke="#a5d3dc" />
          <rect x="118" y="230" width="137" height="160" rx="9" fill="#122638" />
          <path d="M125 285H248M125 335H248" />
          {[0, 1, 2].map(n => <g key={n}><rect x={134 + n * 36} y="252" width="25" height="29" rx="4" fill="#c5a87c" /><rect x={134 + n * 36} y="300" width="25" height="29" rx="4" fill="#7aafc0" /></g>)}
          <rect x="744" y="230" width="128" height="166" rx="18" fill="#132c3a" />
          <path d="M770 266H846M770 281H846M770 296H821" stroke="#6ba5b3" />
          <rect x="768" y="333" width="80" height="39" rx="4" fill="#284752" />
          <path d="M807 340V365M794 352H820" stroke="#8dd5b7" strokeWidth="6" />
          <path d="M280 344V289H355V344M645 344V289H720V344" fill="#0b2031" />
          <path d="m290 324 14-12 12 7 17-18 12 8M655 324l13-15 13 7 16-19 13 6" fill="none" stroke="#73c6d4" />
          <path d="M263 349H364M636 349H737" strokeWidth="12" />
        </g>
        <ellipse cx="500" cy="514" rx="300" ry="82" fill="#080f1d" />
        <path d="M211 396Q500 490 789 396L789 452Q500 550 211 452Z" fill="#142735" stroke="#526b7c" strokeWidth="3" />
        <path d="M211 385Q500 474 789 385L789 413Q500 510 211 413Z" fill={`url(#${id}-seat)`} stroke="#6b8596" strokeWidth="3" />
        <path d="M211 378Q500 461 789 378" fill="none" stroke="#79c9d0" strokeOpacity=".35" strokeWidth="3" />
        <path d="M195 557Q500 666 805 557L805 613Q500 738 195 613Z" fill="#142735" stroke="#526b7c" strokeWidth="3" />
        <path d="M195 543Q500 642 805 543L805 579Q500 690 195 579Z" fill={`url(#${id}-seat)`} stroke="#6b8596" strokeWidth="3" />
        <path d="M195 535Q500 633 805 535" fill="none" stroke="#79c9d0" strokeOpacity=".4" strokeWidth="3" />
        <path d="M70 650 250 590M930 650 750 590M160 760 340 658M840 760 660 658" stroke="#355264" strokeWidth="2" opacity=".4" />
      </svg>
      {crew.filter(c => c.alive).slice(0, 4).map((person, index) => <button
        key={person.id} type="button" disabled={disabled}
        className={`${styles.astronaut} ${styles[`seat${index}`]} ${selectedCrewId === person.id ? styles.selected : ''}`}
        aria-label={`Inspect ${person.name}, ${person.role}, ${person.condition.status}`}
        onClick={() => onSelectCrew(person.id)}
      >
        <AstronautAvatar id={person.id} role={person.role} pose="seated" mood={person.medical_conditions.length || !person.condition.can_work ? 'unwell' : person.condition.status === 'fit' ? 'well' : 'tired'} />
        <span className={styles.name}><RoleIcon role={person.role} />{person.name.split(' ')[0]}<small>{person.condition.status === 'fit' ? person.role : person.condition.status}</small></span>
      </button>)}
      <svg className={styles.table} viewBox="0 0 1000 760" aria-hidden="true">
        <ellipse cx="500" cy="704" rx="153" ry="25" fill="#030a13" opacity=".6" />
        <path d="M475 596H525L540 690Q500 710 460 690Z" fill="#253c4f" stroke="#486579" strokeWidth="3" />
        <ellipse cx="500" cy="579" rx="180" ry="66" fill="#192d40" stroke="#6d899a" strokeWidth="4" />
        <ellipse cx="500" cy="569" rx="180" ry="63" fill="#496272" stroke="#88a5b6" strokeWidth="3" />
        <ellipse cx="500" cy="569" rx="115" ry="39" fill="#284b60" stroke="#78b5c5" strokeWidth="2" />
        <path d="M440 567H560M500 538V597" stroke="#81c6d7" opacity=".5" />
        <circle cx="500" cy="568" r="13" fill="#8ad0d9" opacity=".6" />
      </svg>
      <div className={styles.hotspots}>
        <button type="button" disabled={disabled} onClick={() => onOpen('Stores')}>Stores</button>
        <button type="button" disabled={disabled} onClick={() => onOpen('Science')}>Research</button>
        <button type="button" disabled={disabled} onClick={() => onOpen('Systems')}>Systems</button>
      </div>
    </div>
    <p className={styles.caption}>COMMON ROOM <span>Choose a teammate or station area</span></p>
  </section>;
}
