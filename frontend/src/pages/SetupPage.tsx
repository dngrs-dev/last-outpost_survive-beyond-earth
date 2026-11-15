import { useEffect, useRef, useState } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';
import { fetchCatalog, createGame } from '../api/game';
import { EnergyPanel } from '../components/EnergyPanel';
import { SelectedCrew } from '../components/SelectedCrew';
import { CargoSelector } from '../components/CargoSelector';
import { ItemIcon } from '../components/ItemIcon';
import { ItemDetails, PackingDialog } from '../components/PackingDetails';
import { ResearchObjectives } from '../components/ResearchObjectives';
import { rememberMission } from '../state/lastMission';
import {
  crewSelectionPath,
  readCrewSlots,
  readSupplyDraft,
} from '../state/preparation';
import type { CatalogResponse, ItemDefinition } from '../types/game';
import styles from './SetupPage.module.css';

const STARTER_CARGO = {
  food_packs: 8,
  water_containers: 16,
  medicine_kits: 7,
  repair_kits: 7,
  eva_batteries: 7,
  oxygen_tanks: 4,
  scientific_tools: 1,
};
const TABS = ['Mission', 'Power', 'Settings'] as const;
type BriefTab = (typeof TABS)[number];

function Capacity({
  label,
  used,
  limit,
  unit,
}: {
  label: string;
  used: number;
  limit: number;
  unit: string;
}) {
  const over = used > limit;
  return (
    <div className={styles.capacity} data-over={over}>
      <div>
        <span>{label}</span>
        <strong>
          {Number(used.toFixed(1))}{' '}
          <small>
            / {limit} {unit}
          </small>
        </strong>
      </div>
      <meter
        aria-label={`Cargo ${label.toLowerCase()}`}
        min={0}
        max={limit}
        value={Math.min(used, limit)}
        aria-valuetext={`${used.toFixed(1)} of ${limit} ${unit}${over ? ', over limit' : ''}`}
      />
      <p>
        {over
          ? `${Number((used - limit).toFixed(1))} ${unit} over limit`
          : `${Number((limit - used).toFixed(1))} ${unit} available`}
      </p>
    </div>
  );
}

export function SetupPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const draft = readSupplyDraft(location.state);
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const busy = useRef(false);
  const mounted = useRef(true);
  const [cargo, setCargo] = useState<Record<string, number>>(
    () => draft?.cargo || { ...STARTER_CARGO }
  );
  const [seed, setSeed] = useState(() => draft?.seed ?? '42');
  const [inspectedItem, setInspectedItem] = useState<ItemDefinition | null>(
    null
  );
  const [modal, setModal] = useState<'brief' | 'crew' | null>(null);
  const [briefTab, setBriefTab] = useState<BriefTab>('Mission');

  useEffect(() => {
    let active = true;
    setLoadError('');
    fetchCatalog()
      .then((data) => {
        if (active) setCatalog(data);
      })
      .catch((reason) => {
        if (active)
          setLoadError(
            reason instanceof Error
              ? reason.message
              : 'The cargo catalog is unavailable.'
          );
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  useEffect(() => {
    mounted.current = true;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      mounted.current = false;
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
  const { slots, adjusted } = readCrewSlots(
    params,
    catalog?.crew || [],
    catalog?.limits.max_crew || 4
  );
  const crewIds = slots.filter(Boolean);
  const packed =
    catalog?.items.filter((item) => (cargo[item.id] || 0) > 0) || [];
  const totalMass = (catalog?.items || []).reduce(
    (sum, item) => sum + item.weight_kg * (cargo[item.id] || 0),
    0
  );
  const totalVolume = (catalog?.items || []).reduce(
    (sum, item) => sum + item.volume_l * (cargo[item.id] || 0),
    0
  );
  const massLimit = catalog?.limits.max_cargo_mass_kg || 180;
  const volumeLimit = catalog?.limits.max_cargo_volume_l || 240;
  const crewValid =
    crewIds.length >= (mission?.minimum_survivors || 1) &&
    crewIds.length <= (catalog?.limits.max_crew || 4);
  const cargoValid = Object.entries(cargo).every(([id, quantity]) => {
    const item = catalog?.items.find((entry) => entry.id === id);
    return (
      !!item &&
      Number.isSafeInteger(quantity) &&
      quantity >= 0 &&
      quantity <= item.max_quantity
    );
  });
  const seedValid =
    !seed.trim() ||
    (/^\d+$/.test(seed.trim()) && Number.isSafeInteger(Number(seed.trim())));
  const overweight = totalMass > massLimit;
  const overfilled = totalVolume > volumeLimit;
  const arrival = (resource: string) =>
    (station?.starting_resources[resource] || 0) +
    (catalog?.items || []).reduce(
      (sum, item) =>
        sum +
        (item.resource === resource
          ? item.resource_amount * (cargo[item.id] || 0)
          : 0),
      0
    );
  const missingEquipment = Object.entries(mission?.required_resources || {})
    .filter(([resource, amount]) => arrival(resource) < amount)
    .map(([resource, amount]) => ({ resource, amount: amount - arrival(resource) }));
  const canLaunch =
    !!station &&
    !!mission &&
    crewValid &&
    missingEquipment.length === 0 &&
    cargoValid &&
    seedValid &&
    !overweight &&
    !overfilled &&
    !submitting;
  const powerOverflow =
    !!station && arrival('electricity') > station.battery_capacity;

  const updateDraft = (nextCargo: Record<string, number>, nextSeed = seed) => {
    if (busy.current) return;
    setCargo(nextCargo);
    setSeed(nextSeed);
    setError('');
    navigate(`${location.pathname}${location.search}`, {
      replace: true,
      state: { supplies: { cargo: nextCargo, seed: nextSeed } },
    });
  };
  const editCrew = () => {
    if (station && !busy.current)
      navigate(crewSelectionPath(station, slots), {
        state: { supplies: { cargo, seed } },
      });
  };
  const openBrief = (tab: BriefTab) => {
    setBriefTab(tab);
    setModal('brief');
  };
  const launch = async () => {
    if (!canLaunch || !station || busy.current) return;
    busy.current = true;
    setSubmitting(true);
    setError('');
    try {
      const game = await createGame({
        station_id: station.id,
        crew_ids: crewIds,
        cargo,
        random_seed: seed.trim() ? Number(seed.trim()) : undefined,
      });
      rememberMission(game.game_id);
      if (mounted.current) navigate(`/game/${game.game_id}`);
    } catch (reason: unknown) {
      if (mounted.current) {
        setError(
          reason instanceof Error
            ? reason.message
            : 'We could not launch. Your packed cargo is still here.'
        );
        setSubmitting(false);
      }
    } finally {
      busy.current = false;
    }
  };

  const status = !crewValid
    ? `Choose at least ${mission?.minimum_survivors || 1} astronauts before launch.`
    : !cargoValid
      ? 'Some cargo choices are unavailable. Use the starter pack or correct the quantities.'
      : !seedValid
        ? 'Check the replay seed in Flight settings.'
        : overweight || overfilled
          ? `Remove cargo to fit the ${overweight && overfilled ? 'weight and space' : overweight ? 'weight' : 'space'} limit.`
          : adjusted
            ? 'Unavailable crew choices were removed. Review your team.'
            : 'Within cargo limits. Ready when you are.';

  return (
    <main className={styles.page} aria-label="Supplies and launch">
      <div className={styles.background} aria-hidden="true" />
      <div className={styles.topbar}>
        <button
          type="button"
          className={styles.back}
          onClick={editCrew}
          disabled={submitting || !station}
          aria-label="Back to crew selection"
        >
          <span aria-hidden="true">&#8592;</span> Crew
        </button>
        <div>
          <p className={styles.eyebrow}>PREPARE FOR LAUNCH</p>
          <h1>Pack your supplies</h1>
        </div>
        <p className={styles.step}>
          <span>Mission</span>
          <span>Crew</span>
          <b aria-current="step">03 Supplies</b>
        </p>
        <button
          type="button"
          className={styles.briefButton}
          onClick={() => openBrief('Mission')}
          disabled={!mission}
          aria-label="Mission brief"
        >
          <span aria-hidden="true">i</span>
          <span>Mission brief</span>
        </button>
        <button
          type="button"
          className={styles.settings}
          onClick={() => openBrief('Settings')}
          disabled={!mission}
          aria-label="Flight settings"
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h16" />
            <circle cx="8" cy="6" r="2" />
            <circle cx="16" cy="12" r="2" />
            <circle cx="10" cy="18" r="2" />
          </svg>
        </button>
      </div>

      {!catalog ? (
        <section className={styles.loading}>
          {loadError ? (
            <>
              <p role="alert">{loadError}</p>
              <button
                type="button"
                onClick={() => setAttempt((value) => value + 1)}
              >
                Try again
              </button>
              <Link to="/moon/">Choose a mission</Link>
            </>
          ) : (
            <p role="status">Opening the cargo bay...</p>
          )}
        </section>
      ) : !station || !mission ? (
        <section className={styles.loading}>
          <p role="alert">
            That mission is unavailable. Choose a mission before packing.
          </p>
          <Link to="/moon/">Choose a mission</Link>
        </section>
      ) : (
        <>
          <section
            className={styles.context}
            aria-label="Selected lunar mission"
          >
            <strong>{station.name} selected</strong>
            <span>{mission.duration_weeks} weeks</span>
            <button type="button" onClick={() => setModal('crew')}>
              {crewIds.length} crew <span aria-hidden="true">&#8599;</span>
            </button>
          </section>
          <div className={styles.content}>
            <CargoSelector
              items={catalog.items}
              cargo={cargo}
              disabled={submitting}
              onChangeCargo={(id, quantity) =>
                updateDraft({ ...cargo, [id]: quantity })
              }
              onInspectItem={setInspectedItem}
              onStarter={() => updateDraft({ ...STARTER_CARGO })}
              onClear={() => updateDraft({})}
            />
            <aside className={styles.sidebar} aria-label="Launch overview">
              <SelectedCrew
                crew={catalog.crew}
                slots={slots}
                minCrew={mission.minimum_survivors}
                disabled={submitting}
                onEdit={editCrew}
              />
              <section className={styles.manifest} aria-label="Packed cargo">
                <div className={styles.manifestHeading}>
                  <h2>Your cargo bay</h2>
                  <span>{packed.length} types packed</span>
                </div>
                <div className={styles.cargoSlots}>
                  {packed.length ? (
                    packed.map((item) => (
                      <div
                        key={item.id}
                        className={styles.cargoSlot}
                        title={`${item.name}: ${cargo[item.id]}`}
                      >
                        <ItemIcon id={item.id} />
                        <span>{cargo[item.id]}</span>
                        <span className={styles.visuallyHidden}>
                          {item.name}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className={styles.emptyBay}>
                      An empty cargo bay.
                      <br />
                      Choose supplies to fill it.
                    </p>
                  )}
                </div>
                <div className={styles.arrival}>
                  <h3>At the outpost on arrival</h3>
                  <div>
                    {[
                      ['food', 'Food'],
                      ['water', 'Water'],
                      ['oxygen', 'Oxygen'],
                      ['electricity', 'Power'],
                    ].map(([id, label]) => (
                      <p key={id}>
                        <span>{label}</span>
                        <strong>
                          {Number(
                            (id === 'electricity'
                              ? Math.min(station.battery_capacity, arrival(id))
                              : arrival(id)
                            ).toFixed(1)
                          )}
                          <small> u</small>
                        </strong>
                      </p>
                    ))}
                  </div>
                  <p>
                    Outpost reserves + cargo, before incidents. Power is capped
                    at battery capacity; generation and use happen during play.
                  </p>
                </div>
              </section>
              {missingEquipment.length > 0 && (
                <div className={styles.scienceHint} role="alert">
                  <p>Objective equipment needed</p>
                  {missingEquipment.map(({ resource, amount }) => {
                    const item = catalog.items.find((entry) => entry.resource === resource);
                    return <span key={resource}><ItemIcon id={item?.id || resource} />
                      {item?.name || resource}: {amount}
                    </span>;
                  })}
                </div>
              )}
            </aside>
          </div>
          <div className={styles.launchbar}>
            <div className={styles.capacities}>
              <Capacity
                label="Weight"
                used={totalMass}
                limit={massLimit}
                unit="kg"
              />
              <Capacity
                label="Space"
                used={totalVolume}
                limit={volumeLimit}
                unit="L"
              />
            </div>
            <div className={styles.launchAction}>
              <button
                type="button"
                className={styles.launch}
                disabled={!canLaunch}
                onClick={launch}
              >
                {submitting ? 'Launching...' : 'Launch mission'}
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9 15 6 18m3-8 5-5q3-3 7-2 1 4-2 7l-5 5-5-5Z" />
                  <path d="m9 10-5 1-2 4h7m5 0-1 5-4 2v-7m-4 5-2 1 1-3" />
                  <circle cx="16" cy="8" r="2" />
                </svg>
              </button>
              <p>Next stop: the Moon</p>
            </div>
            {error ? (
              <p className={styles.error} role="alert">
                {error}
              </p>
            ) : (
              <p className={styles.status} role="status">
                {status}
                {powerOverflow &&
                  ' Packed power exceeds battery capacity; excess starting charge cannot be stored.'}
              </p>
            )}
            <span className={styles.balanceNote}>
              Fictional gameplay cargo limits
            </span>
          </div>

          {inspectedItem && (
            <ItemDetails
              item={inspectedItem}
              onClose={() => setInspectedItem(null)}
            />
          )}
          {modal === 'crew' && (
            <PackingDialog title="Your crew" onClose={() => setModal(null)}>
              <SelectedCrew
                crew={catalog.crew}
                slots={slots}
                minCrew={mission.minimum_survivors}
                disabled={submitting}
                onEdit={editCrew}
              />
            </PackingDialog>
          )}
          {modal === 'brief' && (
            <PackingDialog title="Mission brief" onClose={() => setModal(null)}>
              <div
                className={styles.briefTabs}
                role="tablist"
                aria-label="Mission information"
              >
                {TABS.map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    id={`packing-tab-${tab}`}
                    aria-controls="packing-panel"
                    aria-selected={briefTab === tab}
                    tabIndex={briefTab === tab ? 0 : -1}
                    onClick={() => setBriefTab(tab)}
                    onKeyDown={(event) => {
                      const index = TABS.indexOf(tab);
                      const next =
                        event.key === 'ArrowRight'
                          ? TABS[(index + 1) % TABS.length]
                          : event.key === 'ArrowLeft'
                            ? TABS[(index + TABS.length - 1) % TABS.length]
                            : event.key === 'Home'
                              ? TABS[0]
                              : event.key === 'End'
                                ? TABS[TABS.length - 1]
                                : null;
                      if (next) {
                        event.preventDefault();
                        setBriefTab(next);
                        event.currentTarget.parentElement
                          ?.querySelector<HTMLButtonElement>(
                            `#packing-tab-${next}`
                          )
                          ?.focus();
                      }
                    }}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <section
                id="packing-panel"
                role="tabpanel"
                aria-labelledby={`packing-tab-${briefTab}`}
                tabIndex={0}
              >
                {briefTab === 'Mission' && (
                  <>
                    <div className={styles.briefMission}>
                      <h3>{station.name}</h3>
                      <p>
                        {mission.duration_weeks} weeks / {station.difficulty}{' '}
                        difficulty / at least {mission.minimum_survivors}{' '}
                        survivors
                      </p>
                      <p>{mission.description}</p>
                      <p>{station.challenge}</p>
                      <Link to={`/moon/?site=${station.lunar_site_id || ''}`}>
                        Change mission
                      </Link>
                    </div>
                    <details className={styles.systems}>
                      <summary>Outpost systems and reserves</summary>
                      <dl className={styles.itemFacts}>
                        {[
                          [
                            'Food reserve',
                            `${station.starting_resources.food} u`,
                          ],
                          [
                            'Water reserve',
                            `${station.starting_resources.water} u`,
                          ],
                          [
                            'Oxygen reserve',
                            `${station.starting_resources.oxygen} u`,
                          ],
                          ['Battery capacity', `${station.battery_capacity} u`],
                          [
                            'Full-daylight solar capacity',
                            `${station.energy_per_week} u/week`,
                          ],
                          [
                            'Oxygen capacity',
                            `${station.oxygen_per_week} u/week`,
                          ],
                          [
                            'Solar condition',
                            `${Math.round(station.solar_efficiency * 100)}%`,
                          ],
                          [
                            'Oxygen system condition',
                            `${Math.round(station.oxygen_efficiency * 100)}%`,
                          ],
                          [
                            'Water recovery condition',
                            `${Math.round(station.water_recovery_efficiency * 100)}%`,
                          ],
                          [
                            'CO2 scrubber condition',
                            `${Math.round(station.co2_efficiency * 100)}%`,
                          ],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <dt>{label}</dt>
                            <dd>{value}</dd>
                          </div>
                        ))}
                      </dl>
                    </details>
                    <ResearchObjectives
                      objectives={mission.science_objectives}
                    />
                    <p className={styles.note}>
                      The outpost and equipment are fictional. Historical
                      landing sites and research references are sourced.
                    </p>
                  </>
                )}
                {briefTab === 'Power' && (
                  <>
                    <EnergyPanel
                      forecast={catalog.sunlight_forecasts[station.id] || []}
                      stored={Math.min(
                        station.battery_capacity,
                        arrival('electricity')
                      )}
                      capacity={station.battery_capacity}
                      solarDay={catalog.lighting.solar_day_earth_days}
                      sourceUrl={catalog.lighting.source_url}
                      assumption={catalog.lighting.assumption}
                    />
                    {powerOverflow && (
                      <p className={styles.note}>
                        Packed power exceeds the battery capacity; excess
                        starting charge cannot be stored.
                      </p>
                    )}
                  </>
                )}
                {briefTab === 'Settings' && (
                  <div className={styles.flightSettings}>
                    <h3>Replay a mission start</h3>
                    <p>
                      On the same outpost, identical crew, cargo, and seed
                      repeat the mission start. Leave the seed blank for a
                      random start.
                    </p>
                    <label htmlFor="replay-seed">Replay seed</label>
                    <input
                      id="replay-seed"
                      type="text"
                      inputMode="numeric"
                      placeholder="42"
                      value={seed}
                      disabled={submitting}
                      aria-invalid={!seedValid}
                      onChange={(event) =>
                        updateDraft(cargo, event.target.value)
                      }
                    />
                    {!seedValid && (
                      <p role="alert">
                        Use a non-negative whole number up to{' '}
                        {Number.MAX_SAFE_INTEGER}, or leave this blank.
                      </p>
                    )}
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() =>
                        updateDraft(
                          cargo,
                          String(Math.floor(Math.random() * 999999))
                        )
                      }
                    >
                      Choose a random seed
                    </button>
                  </div>
                )}
              </section>
            </PackingDialog>
          )}
        </>
      )}
    </main>
  );
}
