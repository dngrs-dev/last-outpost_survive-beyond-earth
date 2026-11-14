import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchMoonCatalog } from '../api/moon';
import { fetchCatalog } from '../api/game';
import { MoonGlobe } from '../components/MoonGlobe';
import { OutpostRoster } from '../components/OutpostRoster';
import { OutpostBriefing } from '../components/OutpostBriefing';
import { OutpostDifficulty } from '../components/OutpostDifficulty';
import type { MoonCatalog, OutpostOption } from '../types/moon';
import styles from './MoonPage.module.css';

interface SelectionData { archive: MoonCatalog; options: OutpostOption[] }

export function MoonPage() {
  const [data, setData] = useState<SelectionData | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [mobileView, setMobileView] = useState<'map' | 'briefing'>('map');
  const [params, setParams] = useSearchParams();
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, []);
  useEffect(() => {
    let active = true;
    setError('');
    Promise.all([fetchMoonCatalog(), fetchCatalog()]).then(([archive, catalog]) => {
      const options = archive.sites.map((site) => {
        const station = catalog.stations.find((entry) => entry.id === site.training_station_id);
        const mission = catalog.missions.find((entry) => entry.id === station?.mission_id);
        if (!station || !mission || station.lunar_site_id !== site.id) {
          throw new Error('The outpost roster is unavailable. Please retry.');
        }
        return { site, station, mission };
      });
      if (active) setData({ archive, options });
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Outposts could not be loaded.');
    });
    return () => { active = false; };
  }, [attempt]);

  const selected = data?.options.find((option) => option.site.id === params.get('site')) ?? data?.options[0];
  const select = (site: string) => setParams({ site }, { replace: true });

  return <main className={styles.page}>
    <div className={styles.stars} aria-hidden="true">{Array.from({ length: 45 }, (_, index) =>
      <i key={index} style={{ left: `${(index * 73.37) % 100}%`, top: `${(index * 39.73) % 100}%`, opacity: 0.15 + (index % 5) / 10 }} />)}</div>
    <header className={styles.header}>
      <Link to="/" className={styles.wordmark}>LAST OUTPOST<span>LUNAR SURVIVAL</span></Link>
      <nav aria-label="Main navigation"><span>MISSION CONTROL</span><Link to="/">Quick start ↗</Link></nav>
    </header>
    <div className={styles.missionBar}>
      <div><p className={styles.eyebrow}>DEPLOYMENT / LUNA</p><h1>Choose your outpost.</h1></div>
      <p>Six stations. Six survival contracts.<span>Fictional outposts at real Apollo landing sites.</span></p>
    </div>
    {error ? <div className={styles.loading} role="alert"><p>{error}</p><button type="button" onClick={() => setAttempt((value) => value + 1)}>Retry outpost roster</button><Link to="/">Open mission preparation</Link></div>
      : !data || !selected ? <p className={styles.loading} role="status">Connecting to lunar outposts…</p>
      : <>
        <section className={styles.explorer} aria-label="Outpost deployment screen" data-mobile-view={mobileView}>
          <OutpostRoster options={data.options} selected={selected} onSelect={select} />
          <div className={styles.mobileViews} aria-label="Mobile selection view">
            <button type="button" aria-pressed={mobileView === 'map'} onClick={() => setMobileView('map')}>Moon map</button>
            <button type="button" aria-pressed={mobileView === 'briefing'} onClick={() => setMobileView('briefing')}>Mission & systems</button>
          </div>
          <div className={styles.viewer}>
            <div className={styles.viewerTop}><span>SELECT A SURFACE POINT</span><span>LRO / LUNAR MAP</span></div>
            <MoonGlobe sites={data.archive.sites} selected={selected.site} texture={data.archive.texture.path} onSelect={select} />
            <p className={styles.textureCredit}>Surface: {data.archive.texture.credit}</p>
          </div>
          <OutpostBriefing option={selected} archive={data.archive} />
        </section>
        <footer className={styles.launchDock}>
          <div className={styles.dockSelection}><span className={styles.readyDot} /><div><strong>{selected.station.name}</strong><small>{selected.mission.name} · {selected.mission.duration_weeks} weeks / {selected.mission.duration_weeks * 7} days</small></div></div>
          <OutpostDifficulty station={selected.station} />
          <Link className={styles.launch} to={`/?station=${encodeURIComponent(selected.station.id)}&lunar_site=${encodeURIComponent(selected.site.id)}`}>Prepare mission <span>→</span></Link>
        </footer>
      </>}
  </main>;
}
