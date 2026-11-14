import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { fetchCatalog, createGame } from '../api/game';
import { Header } from '../components/Header';
import { CrewSlots } from '../components/CrewSlots';
import { CargoSelector } from '../components/CargoSelector';
import type { CatalogResponse } from '../types/game';

export const SetupPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const lunarSiteId = params.get('lunar_site');
  const requestedStationId = params.get('station');
  const [catalog, setCatalog] = useState<CatalogResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedStationId, setSelectedStationId] = useState<string>('alpha');
  const [crewSlots, setCrewSlots] = useState<string[]>(['alex', 'maya', 'lin', 'sam']);
  const selectedCrewIds = crewSlots.filter(Boolean);
  const [cargo, setCargo] = useState<Record<string, number>>({
    food_packs: 8,
    water_containers: 16,
    medicine_kits: 7,
    repair_kits: 7,
    eva_batteries: 7,
    oxygen_tanks: 4,
  });
  const [seed, setSeed] = useState<string>('42');

  useEffect(() => {
    let mounted = true;
    fetchCatalog()
      .then((data) => {
        if (mounted) {
          setCatalog(data);
          const selected = requestedStationId
            ? data.stations.find((entry) => entry.id === requestedStationId && (!lunarSiteId || entry.lunar_site_id === lunarSiteId))
            : data.stations.find((entry) => lunarSiteId ? entry.lunar_site_id === lunarSiteId : entry.id === 'alpha');
          if (selected) setSelectedStationId(selected.id);
          else {
            setSelectedStationId(data.stations[0]?.id || '');
            setError('The selected outpost was not found. Choose an available outpost.');
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err.message || 'Failed to load mission catalog from backend.');
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [lunarSiteId, requestedStationId]);

  const handleCargoChange = (itemId: string, qty: number) => {
    setCargo((prev) => ({
      ...prev,
      [itemId]: qty,
    }));
  };

  const applyRecommendedLoadout = () => {
    setCargo({
      food_packs: 8,
      water_containers: 16,
      medicine_kits: 7,
      repair_kits: 7,
      eva_batteries: 7,
      oxygen_tanks: 4,
    });
  };

  const handleStartMission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCrewIds.length < minCrew) {
      setError(`This mission requires at least ${minCrew} astronauts.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const parsedSeed = seed.trim() ? parseInt(seed.trim(), 10) : undefined;
      const game = await createGame({
        station_id: selectedStationId,
        crew_ids: selectedCrewIds,
        cargo,
        random_seed: isNaN(parsedSeed as number) ? undefined : parsedSeed,
      });

      navigate(`/game/${game.game_id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to initiate mission. Check payload limits.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="app-container">
        <Header />
        <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--color-cyan)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⌛</div>
          <div>ESTABLISHING SATELLITE UPLINK TO LUNAR CATALOG...</div>
        </div>
      </div>
    );
  }

  if (error && !catalog) {
    return (
      <div className="app-container">
        <Header />
        <div className="alert alert-danger" style={{ margin: '2rem 0' }}>
          <strong>Communication Error:</strong> {error}
        </div>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => window.location.reload()}
        >
          RETRY CONNECTION
        </button>
      </div>
    );
  }

  const station = catalog?.stations.find((s) => s.id === selectedStationId);
  const mission = catalog?.missions.find((m) => m.id === station?.mission_id);
  const maxCrew = catalog?.limits.max_crew || 4;
  const minCrew = mission?.minimum_survivors || 1;

  // Mass & Volume calculations
  const totalMass = (catalog?.items || []).reduce((acc, item) => {
    return acc + item.weight_kg * (cargo[item.id] || 0);
  }, 0);
  const totalVolume = (catalog?.items || []).reduce((acc, item) => {
    return acc + item.volume_l * (cargo[item.id] || 0);
  }, 0);

  const isMassExceeded = totalMass > (catalog?.limits.max_cargo_mass_kg || 500);
  const isVolumeExceeded = totalVolume > (catalog?.limits.max_cargo_volume_l || 450);
  const isCrewInvalid = selectedCrewIds.length < minCrew || selectedCrewIds.length > maxCrew;
  const canLaunch = !isMassExceeded && !isVolumeExceeded && !isCrewInvalid && !submitting && !!station && !!mission;

  return (
    <div className="app-container">
      <Header />

      <form onSubmit={handleStartMission}>
        {(lunarSiteId || requestedStationId) && station && <section className="alert alert-info" aria-label="Selected lunar mission" style={{ display: 'block' }}>
          <strong>{station.name} selected</strong>
          <p>{mission?.duration_weeks}-week mission / {station.difficulty} difficulty. Outpost conditions and survival rules are fictional; the landing site is historical.</p>
          <Link to={`/moon/?site=${station.lunar_site_id}`}>Return to this landing site</Link>
        </section>}
        {/* Mission & Station Briefing Card */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-title">
            <span>🌙 LUNAR MISSION BRIEFING</span>
            <label htmlFor="station-select">Outpost
              <select id="station-select" value={selectedStationId} disabled={submitting}
                onChange={(event) => { setSelectedStationId(event.target.value); setError(null); }}>
                {catalog?.stations.map((entry) => <option key={entry.id} value={entry.id}>{entry.name} / {entry.difficulty}</option>)}
              </select>
            </label>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div>
              <p style={{ color: 'var(--text-main)', marginBottom: '0.75rem' }}>
                {station?.description}
              </p>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <strong>Objective:</strong> {mission?.description || 'Survive 12 weeks until next crew rotation.'}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                <strong>Mission Duration:</strong> {mission?.duration_weeks || 12} Weeks ({(mission?.duration_weeks || 12) * 7} Days) |{' '}
                <strong>Required Survivors:</strong> At least {mission?.minimum_survivors || 1}
              </div>
            </div>

            <div
              style={{
                background: 'var(--bg-secondary)',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--border-radius)',
                fontSize: '0.85rem',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--color-cyan)', marginBottom: '0.4rem' }}>
                {station?.name.toUpperCase()} STARTING SPECS:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.3rem' }}>
                <div>Food reserve: {station?.starting_resources.food}u</div>
                <div>Water reserve: {station?.starting_resources.water}u</div>
                <div>Oxygen reserve: {station?.starting_resources.oxygen}u</div>
                <div>Electricity: {station?.starting_resources.electricity}u</div>
                <div>Solar capacity: +{station?.energy_per_week}u/wk</div>
                <div>Solar condition: {Math.round((station?.solar_efficiency ?? 1) * 100)}%</div>
                <div>Oxygen capacity: +{station?.oxygen_per_week}u/wk</div>
                <div>Oxygen condition: {Math.round((station?.oxygen_efficiency ?? 1) * 100)}%</div>
                <div>Difficulty: {station?.difficulty} ({station?.difficulty_rank}/5)</div>
              </div>
            </div>
          </div>
        </div>

        {catalog && <CrewSlots crew={catalog.crew} slots={crewSlots} minCrew={minCrew}
          maxCrew={maxCrew} onChange={setCrewSlots} disabled={submitting} />}

        {/* Cargo Selection Component */}
        {catalog && (
          <CargoSelector
            items={catalog.items}
            limits={catalog.limits}
            cargo={cargo}
            onChangeCargo={handleCargoChange}
            disabled={submitting}
          />
        )}

        {/* Mission Parameters & Start Launch */}
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div className="card-title">
            <span>🚀 FLIGHT PARAMETERS & AUTHORIZATION</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={applyRecommendedLoadout}
            >
              APPLY RECOMMENDED CARGO
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Mission Random Seed (Deterministic Simulation):
              </label>
              <input
                type="text"
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                style={{ width: '120px' }}
                placeholder="42"
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setSeed(String(Math.floor(Math.random() * 999999)))}
              >
                RANDOMIZE
              </button>
            </div>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
            <button
              type="submit"
              disabled={!canLaunch}
              className="btn btn-primary btn-lg"
            >
              {submitting ? 'INITIALIZING MISSION...' : 'LAUNCH EXPEDITION TO MOON →'}
            </button>
          </div>
        </div>
      </form>

      <footer className="app-footer">
        NASA Space Apps Challenge 2026 — Station Alpha Mission Simulator
      </footer>
    </div>
  );
};
