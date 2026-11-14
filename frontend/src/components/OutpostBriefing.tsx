import { useState } from 'react';
import type { MoonCatalog, OutpostOption } from '../types/moon';
import { OutpostDifficulty } from './OutpostDifficulty';
import styles from '../pages/MoonPage.module.css';

const TABS = ['Mission', 'Systems', 'History'] as const;
type Tab = typeof TABS[number];

function Condition({ label, value }: { label: string; value: number }) {
  const percentage = Math.round(value * 100);
  return <div className={styles.condition}>
    <span>{label}<strong>{percentage}%</strong></span>
    <meter min="0" max="1" value={value} aria-label={label}>{percentage}%</meter>
  </div>;
}

export function OutpostBriefing({ option, archive }: { option: OutpostOption; archive: MoonCatalog }) {
  const [tab, setTab] = useState<Tab>('Mission');
  const { station, site, mission } = option;
  const reserves = [
    ['Food', station.starting_resources.food, 'u'], ['Water', station.starting_resources.water, 'u'],
    ['Oxygen', station.starting_resources.oxygen, 'u'], ['Power', station.starting_resources.electricity, 'u'],
    ['Medicine', station.starting_resources.medicine, 'kits'], ['Repair', station.starting_resources.repair_kits, 'kits'],
    ['EVA', station.starting_resources.eva_batteries, 'packs'],
  ];

  return <aside className={styles.brief} aria-labelledby="selected-outpost">
    <div className={styles.briefHeader}>
      <OutpostDifficulty station={station} />
      <h2 id="selected-outpost">{station.name.replace('Station ', '').replace(' — Research Base', '')}</h2>
      <p>{site.name} · {site.region}</p>
    </div>
    <div className={styles.tabs} role="tablist" aria-label="Outpost information">
      {TABS.map((name, index) => <button type="button" role="tab" key={name} id={`outpost-${name}`}
        aria-selected={tab === name} aria-controls={`panel-${name}`} tabIndex={tab === name ? 0 : -1}
        onClick={() => setTab(name)} onKeyDown={(event) => {
          let next = index;
          if (event.key === 'ArrowRight') next = (index + 1) % TABS.length;
          else if (event.key === 'ArrowLeft') next = (index + TABS.length - 1) % TABS.length;
          else if (event.key === 'Home') next = 0;
          else if (event.key === 'End') next = TABS.length - 1;
          else return;
          event.preventDefault(); setTab(TABS[next]);
          event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next].focus();
        }}>{name}</button>)}
    </div>
    <div className={styles.moduleBody}>
      <section role="tabpanel" id="panel-Mission" aria-labelledby="outpost-Mission" hidden={tab !== 'Mission'}>
        <p className={styles.sectionLabel}>SURVIVAL CONTRACT</p>
        <h3>{mission.name}</h3>
        <div className={styles.missionNumbers}>
          <div><strong>{mission.duration_weeks}<small>weeks</small></strong><span>{mission.duration_weeks * 7} Earth days</span></div>
          <div><strong>{mission.minimum_survivors}<small>crew</small></strong><span>Required survivors</span></div>
        </div>
        <p className={styles.challenge}>{station.challenge}</p>
        <p className={styles.sectionLabel}>PROVISIONS BEFORE CARGO</p>
        <dl className={styles.reservePreview}><div><dt>Food</dt><dd>{station.starting_resources.food} u</dd></div><div><dt>Water</dt><dd>{station.starting_resources.water} u</dd></div></dl>
        <p className={styles.moduleNote}>Relief arrives after Week {mission.duration_weeks}. Keep the crew alive and hand over working systems. Crew size and cargo change the risk.</p>
      </section>
      <section role="tabpanel" id="panel-Systems" aria-labelledby="outpost-Systems" hidden={tab !== 'Systems'}>
        <p className={styles.sectionLabel}>STARTING RESERVES</p>
        <dl className={styles.reserveGrid}>{reserves.map(([name, value, unit]) => <div key={name}><dt>{name}</dt><dd>{value}<small>{unit}</small></dd></div>)}</dl>
        <p className={styles.sectionLabel}>SYSTEM CONDITION</p>
        <Condition label="Solar array" value={station.solar_efficiency} />
        <Condition label="Oxygen generator" value={station.oxygen_efficiency} />
        <dl className={styles.generation}>
          <div><dt>Solar capacity</dt><dd>{station.energy_per_week} u/week</dd></div>
          <div><dt>Starting solar output</dt><dd>{Number((station.energy_per_week * station.solar_efficiency).toFixed(2))} u/week</dd></div>
          <div><dt>Oxygen capacity</dt><dd>{station.oxygen_per_week} u/week</dd></div>
          <div><dt>Starting oxygen output</dt><dd>up to {Number((station.oxygen_per_week * station.oxygen_efficiency).toFixed(2))} u/week</dd></div>
        </dl>
        <p className={styles.moduleNote}>Before the first incident. Oxygen output also depends on available power. All outpost parameters are fictional game values.</p>
      </section>
      <section role="tabpanel" id="panel-History" aria-labelledby="outpost-History" hidden={tab !== 'History'}>
        <p className={styles.sectionLabel}>HISTORICAL LOCATION</p>
        <h3>{site.name} · {site.landing_date}</h3>
        <p className={styles.challenge}>{site.mission.objective}</p>
        <dl className={styles.generation}>
          <div><dt>Latitude / longitude</dt><dd>{site.latitude.toFixed(4)}° / {site.longitude.toFixed(4)}°</dd></div>
          <div><dt>Surface EVA time</dt><dd>{site.eva_hours} h</dd></div>
          <div><dt>Samples returned</dt><dd>{site.sample_return_kg} kg</dd></div>
        </dl>
        <a href={site.mission.source_url} target="_blank" rel="noreferrer">Historical mission record ↗</a>
        <details className={styles.sources}><summary>Sources & reuse</summary>
          <p>Snapshot: {archive.retrieved_at}. Served locally; no NASA API requests during play.</p>
          {archive.sources.map((source) => <p key={source.id}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a> — {source.credit}. {source.usage}</p>)}
          <p>{archive.coordinate_frame}</p><p>{archive.texture.note}</p>
          <p>NASA source material does not imply NASA endorsement. Outpost conditions are original game configuration.</p>
          <a href="https://svs.gsfc.nasa.gov/help/" target="_blank" rel="noreferrer">SVS reuse terms</a>
        </details>
      </section>
    </div>
  </aside>;
}
