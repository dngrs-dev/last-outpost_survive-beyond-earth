import { useEffect, useId, useState } from 'react';
import { AstronautAvatar } from '../AstronautAvatar';
import { RoleIcon } from '../RoleIcon';
import type { GameStateResponse, RationRequest } from '../../types/game';
import { StationInterior, StationFurniture } from './StationInterior';
import { roomLayout, stationActors } from './stationLayout';
import { crewMood, type CrewActivities, type SceneMode } from './stationPresentation';
import styles from './StationRoom.module.css';

export type StationBookmark = 'Crew' | 'Stores' | 'Systems' | 'Science' | 'Log' | 'Away';

export function StationRoom({ state, activities, mode, selectedCrewId, onSelectCrew, onOpen, disabled, bookedIds = [], rations = {}, modalOpen = false }: {
  state: GameStateResponse; activities: CrewActivities; mode: SceneMode;
  selectedCrewId: string | null; onSelectCrew: (id: string) => void;
  onOpen: (bookmark: StationBookmark) => void; disabled: boolean;
  bookedIds?: string[]; rations?: Record<string, RationRequest>; modalOpen?: boolean;
}) {
  const id = `room-${useId().replace(/:/g, '')}`;
  const [portrait, setPortrait] = useState(window.innerHeight > window.innerWidth * 1.2);
  const [hover, setHover] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const [dismissedHint, setDismissedHint] = useState<string | null>(null);
  useEffect(() => {
    const resize = () => setPortrait(window.innerHeight > window.innerWidth * 1.2);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  const layout = roomLayout(portrait), stageHeight = layout.height;
  const allActors = stationActors(state.crew, activities, portrait);
  const dispatched = allActors.filter(actor => actor.activity.origin === 'incident' || actor.zone === 'surface');
  const actors = allActors.filter(actor => !dispatched.includes(actor));
  const project = state.research_projects.find(project => project.status !== 'completed') || state.research_projects[state.research_projects.length - 1];
  return <section className={styles.room} aria-label="Station common room" data-scene-mode={mode} data-project-phase={project?.phase} data-project-progress={project?.phase_progress}>
    <div className={styles.scene} data-station-scene style={{ width: `min(100%, ${100000 / stageHeight}cqh)`, aspectRatio: `1000 / ${stageHeight}` }}>
      <div className={styles.interior}><StationInterior id={id} state={state} portrait={portrait} stageHeight={stageHeight} /></div>
      {actors.map(actor => {
        const { crew, activity } = actor;
        const booked = bookedIds.includes(crew.id) || activity.origin !== 'routine';
        const status = activity.result ? `${activity.result}: ${activity.label}` : booked ? `Booked: ${activity.label}` : 'Available for orders';
        const showHint = !modalOpen && (hover === crew.id || focus === crew.id) && dismissedHint !== crew.id;
        return <button key={crew.id} type="button" disabled={disabled}
          className={`${styles.astronaut} ${booked ? styles.booked : ''} ${selectedCrewId === crew.id ? styles.selected : ''}`}
          style={{ left: `${actor.left / 10}%`, top: `${actor.top / stageHeight * 100}%`, width: `${actor.width / 10}%`, height: `${actor.height / stageHeight * 100}%` }}
          data-crew-id={crew.id} data-activity={activity.kind} data-zone={actor.zone} data-result={activity.result} data-booked={booked}
          aria-label={`Inspect ${crew.name}, ${crew.role}. ${status}`} aria-describedby={showHint ? `${id}-${crew.id}-hint` : undefined}
          onMouseEnter={() => { setHover(crew.id); setDismissedHint(null); }} onMouseLeave={() => setHover(null)}
          onFocus={() => { setFocus(crew.id); setDismissedHint(null); }} onBlur={() => setFocus(null)}
          onKeyDown={event => { if (event.key === 'Escape') { setDismissedHint(crew.id); event.stopPropagation(); } }}
          onClick={() => onSelectCrew(crew.id)}>
          <AstronautAvatar id={crew.id} role={crew.role} outfit="cabin" pose={activity.pose} mood={crewMood(crew)} equipment={activity.equipment} />
          <span className={styles.name}><RoleIcon role={crew.role} />{crew.name.split(' ')[0]}<small>{booked ? 'Booked' : crew.role}</small></span>
          {showHint && <span role="tooltip" id={`${id}-${crew.id}-hint`} className={styles.tooltip} style={actor.left > 650 ? { left: 'auto', right: 0, transform: 'none' } : undefined}>
            <strong>{crew.name} · {crew.role}</strong><span>Condition {crew.health}/100 · {crew.condition.status}</span>
            <span>Food: {crew.condition.nutrition_status} · {rations[crew.id]?.food || 'normal'} ration</span>
            <span>Water: {crew.condition.hydration_status} · {rations[crew.id]?.water || 'normal'} ration</span>
            <small>{status}</small>
          </span>}
        </button>;
      })}
      <div className={styles.table}><StationFurniture actors={actors} portrait={portrait} stageHeight={stageHeight} /></div>
      <button type="button" className={`${styles.object} ${styles.stores}`} style={{ top: `${layout.supplies.y / stageHeight * 100}%`, left: `${layout.supplies.x/10}%` }} disabled={disabled} onClick={() => onOpen('Stores')} aria-label="Inspect station supplies">Supplies</button>
      <button type="button" className={`${styles.object} ${styles.computer}`} style={{ top: `${(layout.table.y-45) / stageHeight * 100}%`, left: `${layout.table.x/10}%` }} disabled={disabled} onClick={() => onOpen('Systems')} aria-label="Station status">Station status</button>
      <button type="button" className={`${styles.object} ${styles.journal}`} data-open-journal style={{ top: `${(layout.table.y+35) / stageHeight * 100}%`, left: `${(layout.table.x+85)/10}%` }} disabled={disabled} onClick={() => onOpen('Log')}>Crew log</button>
      <button type="button" className={`${styles.object} ${styles.airlock}`} style={{ top: `${layout.airlock.y / stageHeight * 100}%`, left: `${layout.airlock.x/10}%` }} disabled={disabled} onClick={() => onOpen('Away')} aria-label={`Dispatched crew: ${dispatched.length}`}>Airlock <small>{dispatched.length ? `${dispatched.length} on duty` : 'All aboard'}</small></button>
    </div>
  </section>;
}
