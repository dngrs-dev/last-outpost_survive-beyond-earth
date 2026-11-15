import { useEffect, useState } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { fetchCatalog } from '../api/game';
import { AstronautAvatar } from '../components/AstronautAvatar';
import { RoleIcon } from '../components/RoleIcon';
import { roleColor, roleName } from '../components/crewAppearance';
import { readCrewSlots } from '../state/preparation';
import type { CatalogResponse } from '../types/game';
import styles from './CrewSelectionPage.module.css';

export function CrewSelectionPage() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [focusedId, setFocusedId] = useState('alex');
  const [activeSlot, setActiveSlot] = useState(0);

  useEffect(() => {
    let mounted = true;
    setError('');
    fetchCatalog()
      .then((data) => {
        if (mounted) {
          setCatalog(data);
          const initial = readCrewSlots(
            params,
            data.crew,
            data.limits.max_crew
          ).slots;
          setActiveSlot(Math.max(0, initial.indexOf('')));
        }
      })
      .catch((reason) => {
        if (mounted)
          setError(
            reason instanceof Error
              ? reason.message
              : 'We could not reach the crew roster.'
          );
      });
    return () => {
      mounted = false;
    };
  }, [attempt]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const stationId = params.get('station');
  const siteId = params.get('lunar_site');
  const station = catalog?.stations.find(
    (entry) =>
      (stationId
        ? entry.id === stationId
        : siteId
          ? entry.lunar_site_id === siteId
          : entry.id === 'alpha') &&
      (!siteId || entry.lunar_site_id === siteId)
  );
  const mission = catalog?.missions.find(
    (entry) => entry.id === station?.mission_id
  );
  const maxCrew = catalog?.limits.max_crew || 4;
  const { slots, adjusted } = readCrewSlots(
    params,
    catalog?.crew || [],
    maxCrew
  );
  const selected = slots.flatMap(
    (id) => catalog?.crew.find((person) => person.id === id) || []
  );
  const person =
    catalog?.crew.find((entry) => entry.id === focusedId) || catalog?.crew[0];
  const selectedIndex = person ? slots.indexOf(person.id) : -1;
  const seat = Math.min(activeSlot, maxCrew - 1);
  const replacing = catalog?.crew.find((entry) => entry.id === slots[seat]);
  const minCrew = mission?.minimum_survivors || 1;
  const ready = selected.length >= minCrew && !!station && !!mission;
  const food = selected.reduce(
    (total, entry) => total + entry.normal_ration_cost.food,
    0
  );
  const water = selected.reduce(
    (total, entry) => total + entry.normal_ration_cost.water,
    0
  );

  const updateSlots = (next: string[]) => {
    const query = new URLSearchParams(params);
    query.set('crew', next.join(','));
    setParams(query, { replace: true, state: location.state });
  };
  const remove = (index: number) => {
    updateSlots(slots.map((id, slot) => (slot === index ? '' : id)));
    setActiveSlot(index);
  };
  const choose = () => {
    if (!person) return;
    if (selectedIndex >= 0) {
      remove(selectedIndex);
      return;
    }
    const next = slots.map((id, index) => (index === seat ? person.id : id));
    updateSlots(next);
    const empty = next.indexOf('');
    if (empty >= 0) setActiveSlot(empty);
  };
  const continueToSupplies = () => {
    if (!ready || !station) return;
    const query = new URLSearchParams({
      station: station.id,
      crew: slots.join(','),
    });
    if (station.lunar_site_id) query.set('lunar_site', station.lunar_site_id);
    navigate(`/prepare/?${query}`, { state: location.state });
  };

  return (
    <main className={styles.page} aria-label="Crew selection">
      <div className={styles.background} aria-hidden="true" />
      <div className={styles.topbar}>
        <Link
          to={
            station?.lunar_site_id
              ? `/moon/?site=${station.lunar_site_id}`
              : '/moon/'
          }
          className={styles.back}
        >
          <span aria-hidden="true">&#8592;</span> Mission
        </Link>
        <div>
          <p className={styles.eyebrow}>PREPARE FOR LAUNCH</p>
          <h1>Build your crew</h1>
        </div>
        <p className={styles.step}>
          <span>Mission</span>
          <b aria-current="step">02 Crew</b>
          <span>Supplies</span>
        </p>
      </div>

      {!catalog ? (
        <section className={styles.loading}>
          {error ? (
            <>
              <p role="alert">{error}</p>
              <button
                type="button"
                onClick={() => setAttempt((value) => value + 1)}
              >
                Try again
              </button>
            </>
          ) : (
            <p role="status">Opening the crew roster...</p>
          )}
        </section>
      ) : !station || !mission || !person ? (
        <section className={styles.loading}>
          <p role="alert">
            This mission or its crew roster is unavailable. Choose a mission to
            try again.
          </p>
          <Link to="/moon/">Choose a mission</Link>
        </section>
      ) : (
        <>
          <div className={styles.content}>
            <section className={styles.roster} aria-label="Astronaut roster">
              <div className={styles.rosterHeading}>
                <h2>Meet your team</h2>
                <span>{catalog.crew.length} specialists</span>
              </div>
              <p className={styles.instructions}>
                Tap a portrait to meet them. Pick a seat below to swap a
                teammate.
              </p>
              <div className={styles.rosterGrid}>
                {catalog.crew.map((entry) => {
                  const aboard = slots.includes(entry.id);
                  return (
                    <button
                      type="button"
                      key={entry.id}
                      className={styles.portrait}
                      data-selected={aboard}
                      data-inspected={entry.id === person.id}
                      aria-label={`View ${entry.name}, ${roleName(entry.role)}, ${aboard ? 'selected' : 'not selected'}`}
                      aria-current={entry.id === person.id ? 'true' : undefined}
                      aria-controls="crew-preview"
                      onClick={() => setFocusedId(entry.id)}
                    >
                      <span className={styles.portraitArt}>
                        <AstronautAvatar
                          id={entry.id}
                          role={entry.role}
                          portrait
                        />
                      </span>
                      <span
                        className={styles.roleBadge}
                        style={{ color: roleColor(entry.role) }}
                        title={roleName(entry.role)}
                      >
                        <RoleIcon role={entry.role} />
                      </span>
                      {aboard && (
                        <span
                          className={styles.selectedCheck}
                          aria-hidden="true"
                        >
                          &#10003;
                        </span>
                      )}
                      <span className={styles.portraitName}>{entry.name}</span>
                    </button>
                  );
                })}
              </div>
              <p className={styles.legend}>
                <span /> Selected for your crew{' '}
                <small>Fictional astronauts. Real teamwork.</small>
              </p>
            </section>

            <section
              className={styles.preview}
              id="crew-preview"
              aria-label="Astronaut details"
            >
              <div className={styles.identity} aria-live="polite">
                <p
                  className={styles.profession}
                  style={{ color: roleColor(person.role) }}
                >
                  <RoleIcon role={person.role} />
                  {roleName(person.role)}
                  <span>
                    {selectedIndex >= 0
                      ? `Seat ${selectedIndex + 1}`
                      : 'Available'}
                  </span>
                </p>
                <h2>{person.name}</h2>
                <p className={styles.specialty}>{person.specialty}</p>
              </div>
              <div className={styles.stage}>
                <div className={styles.orbit} aria-hidden="true" />
                <AstronautAvatar
                  key={person.id}
                  id={person.id}
                  role={person.role}
                />
                <span className={styles.stageLabel} aria-hidden="true">
                  LUNAR CREW // {person.id.toUpperCase()}
                </span>
              </div>
              <div className={styles.dossier}>
                <div className={styles.traits}>
                  <p>
                    <b>Superpower</b>
                    {person.positive_trait}
                  </p>
                  <p>
                    <b>Plan for</b>
                    {person.negative_trait}
                  </p>
                </div>
                <div className={styles.rations}>
                  <span>Each week</span>
                  <strong>{person.normal_ration_cost.food} food</strong>
                  <strong>{person.normal_ration_cost.water} water</strong>
                </div>
                <details>
                  <summary>About this astronaut</summary>
                  <p>
                    Original fictional character and game values, inspired by
                    astronaut training.
                  </p>
                  <a
                    href={person.training_source}
                    target="_blank"
                    rel="noreferrer"
                  >
                    NASA training reference
                  </a>
                </details>
              </div>
              <button
                type="button"
                onClick={choose}
                className={styles.choose}
                data-remove={selectedIndex >= 0}
              >
                <span aria-hidden="true">
                  {selectedIndex >= 0 ? '\u2212' : '\u002b'}
                </span>
                {selectedIndex >= 0
                  ? 'Remove from crew'
                  : replacing
                    ? `Replace ${replacing.name.split(' ')[0]}`
                    : 'Add to crew'}
              </button>
              <p className={styles.chooseHint}>
                {selectedIndex >= 0
                  ? `Selected in seat ${selectedIndex + 1}`
                  : `For seat ${seat + 1}${replacing ? `, currently ${replacing.name}` : ', ready for a teammate'}`}
              </p>
            </section>
          </div>

          <div className={styles.launchbar}>
            <section className={styles.team} aria-label="Your crew seats">
              <div className={styles.teamHeading}>
                <h2>
                  Your crew{' '}
                  <span>
                    {selected.length}/{maxCrew}
                  </span>
                </h2>
                <p>{minCrew} needed for this mission</p>
              </div>
              <div className={styles.seats}>
                {slots.map((id, index) => {
                  const member = catalog.crew.find((entry) => entry.id === id);
                  return (
                    <div
                      className={styles.seat}
                      data-active={index === seat}
                      key={index}
                    >
                      <button
                        type="button"
                        aria-label={`Seat ${index + 1}: ${member?.name || 'empty'}`}
                        aria-pressed={index === seat}
                        onClick={() => {
                          setActiveSlot(index);
                          if (member) setFocusedId(member.id);
                        }}
                      >
                        <span className={styles.seatNumber}>
                          {String(index + 1).padStart(2, '0')}
                        </span>
                        {member ? (
                          <>
                            <AstronautAvatar
                              id={member.id}
                              role={member.role}
                              portrait
                            />
                            <span>{member.name.split(' ')[0]}</span>
                          </>
                        ) : (
                          <>
                            <span
                              className={styles.emptySeat}
                              aria-hidden="true"
                            >
                              +
                            </span>
                            <span>Empty</span>
                          </>
                        )}
                      </button>
                      {member && (
                        <button
                          className={styles.removeSeat}
                          type="button"
                          aria-label={`Remove ${member.name}`}
                          onClick={() => remove(index)}
                        >
                          &#215;
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
            <div className={styles.proceed}>
              <p className={styles.mission}>
                {station.name} <span>{mission.duration_weeks} weeks</span>
              </p>
              <p className={styles.teamDemand}>
                Crew / week: {Number(food.toFixed(2))} food /{' '}
                {Number(water.toFixed(2))} water
              </p>
              <button
                type="button"
                disabled={!ready}
                onClick={continueToSupplies}
              >
                Next: supplies <span aria-hidden="true">&#8594;</span>
              </button>
              <p className={styles.status} role="status">
                {selected.length < minCrew
                  ? `Choose at least ${minCrew} astronauts.`
                  : adjusted
                    ? 'Unavailable or duplicate choices were removed. Review your crew.'
                    : `${selected.length} astronauts ready. You can change your crew before launch.`}
              </p>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
