import { useId } from 'react';
import { AstronautAvatar } from '../AstronautAvatar';
import { RoleIcon } from '../RoleIcon';
import type { GameStateResponse } from '../../types/game';
import { StationInterior, StationFurniture } from './StationInterior';
import { stationActors } from './stationLayout';
import { crewMood, type CrewActivities, type SceneMode } from './stationPresentation';
import styles from './StationRoom.module.css';

export type StationBookmark = 'Crew' | 'Stores' | 'Systems' | 'Science' | 'Log';

export function StationRoom({ state, activities, mode, reportWeek, projectOrders, selectedCrewId, onSelectCrew, onOpen, disabled }: {
  state: GameStateResponse;
  activities: CrewActivities;
  mode: SceneMode;
  reportWeek?: number;
  projectOrders: Record<string, 'pause' | 'resume' | 'interrupt'>;
  selectedCrewId: string | null;
  onSelectCrew: (id: string) => void;
  onOpen: (bookmark: StationBookmark) => void;
  disabled: boolean;
}) {
  const id = `room-${useId().replace(/:/g, '')}`;
  const actors = stationActors(state.crew, activities);
  const project = state.research_projects.find(project => project.status !== 'completed') || state.research_projects[state.research_projects.length - 1];
  const projectOrder = project && projectOrders[project.id];
  const phaseLabel = project && ['Sensors', 'Recording', 'Analysis'][Math.min(2, project.phase_index)];
  const sceneLabel = mode === 'report' ? `Week ${reportWeek} recap` : mode === 'pending' ? 'Awaiting confirmation' : 'Plan preview';
  return <section className={styles.room} aria-label="Station common room" data-scene-mode={mode}>
    <div className={styles.scene} data-station-scene>
      <div className={styles.interior}><StationInterior id={id} state={state} /></div>
      {actors.map(actor => {
        const { crew, activity } = actor;
        const status = activity.result ? `${activity.result}: ${activity.label}` : activity.origin === 'routine' ? activity.label : `Planned: ${activity.label}`;
        return <button key={crew.id} type="button" disabled={disabled}
          className={`${styles.astronaut} ${actor.zone === 'surface' ? styles.outside : ''} ${activity.kind === 'unavailable' ? styles.unavailable : ''} ${selectedCrewId === crew.id ? styles.selected : ''}`}
          style={{ left: `${actor.left / 10}%`, top: `${actor.top / 7.6}%`, width: `${actor.width / 10}%`, height: `${actor.height / 7.6}%` }}
          data-crew-id={crew.id} data-activity={activity.kind} data-zone={actor.zone} data-result={activity.result}
          aria-label={`Inspect ${crew.name}, ${crew.role}, ${crew.condition.status}. ${status}${activity.reason ? `. ${activity.reason}` : ''}`}
          onClick={() => onSelectCrew(crew.id)}>
          <AstronautAvatar id={crew.id} role={crew.role} outfit={actor.zone === 'surface' ? 'eva' : 'cabin'} pose={activity.pose} mood={crewMood(crew)} equipment={activity.equipment} />
          <span className={styles.name}><RoleIcon role={crew.role} />{crew.name.split(' ')[0]}<small>{activity.kind === 'routine' ? crew.role : activity.result || (activity.kind === 'unavailable' ? 'Check plan' : activity.kind === 'patient' ? 'Patient' : 'Planned')}</small></span>
        </button>;
      })}
      <div className={styles.table}><StationFurniture actors={actors} /></div>
      <div className={styles.hotspots}>
        <button type="button" disabled={disabled} onClick={() => onOpen('Stores')} aria-label="Inspect station supplies">Stores</button>
        <button type="button" disabled={disabled} onClick={() => onOpen('Science')}>Research</button>
        <button type="button" disabled={disabled} onClick={() => onOpen('Systems')}>Systems</button>
      </div>
    </div>
    <div className={styles.caption}>
      <span className={styles.sceneLabel}>{sceneLabel}<small>Stocks are confirmed</small></span>
      {project ? <button type="button" className={styles.project} data-project-status={project.status} disabled={disabled} onClick={() => onOpen('Science')}
        aria-label={`Seismic project: ${project.phase}, ${project.phase_progress} of ${project.phase_weeks} weeks, ${project.status}${projectOrder ? `, ${projectOrder} planned` : ''}. ${project.message}`}>
        <span>Seismic · {phaseLabel} <strong>{project.status === 'completed' ? 'Complete' : `${project.phase_progress}/${project.phase_weeks}`}</strong></span>
        <small>{projectOrder ? `${projectOrder} planned` : project.status === 'completed' ? 'Science recorded' : project.status === 'paused' ? 'Paused · progress retained' : project.crew_required === 0 ? 'Automatic · crew free' : 'Crew assignment needed'}</small>
        {project.status !== 'completed' && <progress aria-label="Station seismic phase progress" max={project.phase_weeks} value={project.phase_progress} />}
      </button> : <button type="button" className={styles.project} disabled={disabled} onClick={() => onOpen('Science')}>Research brief <small>{state.science.completed_objectives}/{state.science.total_objectives} objectives complete</small></button>}
    </div>
  </section>;
}
