import type { LifeSupportState } from '../types/game';

export function LifeSupportPanel({ systems }: { systems: LifeSupportState }) {
  return <section className="card" aria-label="Life-support systems" style={{ marginBottom: '1.5rem' }}>
    <h2>Life-support systems</h2>
    <p>Water recovery → clean-water reserve → powered oxygen generation. CO₂ removal is a separate powered system. Equipment, units, wear, and health thresholds are fictional.</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
      <div>
        <h3>Water recovery</h3>
        <meter min={0} max={1} value={systems.water_recovery_condition} aria-label="Water recovery condition" />
        <p>Condition: {Math.round(systems.water_recovery_condition * 100)}%. Wastewater stock: {systems.wastewater.toFixed(1)}.</p>
        <p>Processes up to {systems.recovery_capacity} wastewater per week before condition and power limits, recovering {Math.round(systems.recovery_yield * 100)}%. Today's captured water waits until next week.</p>
      </div>
      <div>
        <h3>Oxygen generation</h3>
        <p>Consumes {systems.water_per_oxygen} clean water per oxygen unit and requires power. Production stops at a {systems.oxygen_reserve_weeks}-week reserve after weekly breathing demand.</p>
        <p>Drinking rations are allocated first. Recovery helps refill next week's water; this week's recovered water can supply oxygen generation.</p>
      </div>
      <div>
        <h3>CO₂ scrubber</h3>
        <meter min={0} max={1} value={systems.co2_condition} aria-label="CO2 scrubber condition" />
        <p>Condition: {Math.round(systems.co2_condition * 100)}%. Cabin burden: {systems.co2_burden.toFixed(1)} game units.</p>
        <p>Removal capacity: {systems.co2_removal_capacity} per week before condition and power limits. Oxygen tanks do not remove carbon dioxide.</p>
        {systems.co2_burden > systems.co2_warning_level && <p role="alert">CO₂ exceeds the game warning level. Restore scrubber condition and power; exposure can damage crew health.</p>}
      </div>
    </div>
    <p>Powered use wears water recovery by {Math.round(systems.water_recovery_wear * 100)} and the scrubber by {(systems.co2_wear * 100).toFixed(1)} condition points per week. Available crew can service either system with a repair kit and 2 power.</p>
    <p>Current operating power budgets: {Object.entries(systems.power_components).map(([id, amount]) => `${id.replace(/_/g, ' ')} ${amount}`).join(' · ')}. Rations, outcomes, and repairs can change these estimates.</p>
    <details><summary>Engineering inspiration</summary>
      <p>NASA's ISS ECLSS reclaims wastewater, uses electrolysis for oxygen production, and removes cabin carbon dioxide separately. This game simplifies those relationships for fictional lunar outposts; it does not reproduce ISS equipment performance or air-quality standards.</p>
      <a href={systems.source_url} target="_blank" rel="noreferrer">NASA ECLSS overview</a>
    </details>
  </section>;
}
