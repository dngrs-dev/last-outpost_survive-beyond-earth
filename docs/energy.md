# Sunlight, storage, and power priorities

Solar generation now depends on predictable local daylight averaged over each
seven-Earth-day turn. All six outposts have finite battery capacity. Power spent
on incident responses and manual assignments is reserved first; players then
choose whether life support or automatic research recording receives the
remaining stored energy plus that week's solar generation first.

## Sourced facts and explicit assumptions

- [NASA SVS, 100 Lunar Days](https://svs.gsfc.nasa.gov/12739/) gives the mean lunar
  solar day as **29.5306 Earth days**. This is the solar cycle, rather than the
  approximately 27.3-day sidereal orbital period.
- [NASA Moonlight](https://science.nasa.gov/moon/moonlight/) describes lunar day
  and night as each roughly two Earth weeks long.
- [NASA's lunar environment guide](https://science.nasa.gov/moon/weather-on-the-moon/)
  provides environmental context. It is not a measurement of these fictional
  stations' electrical systems.
- Site longitudes come from the existing cached [NASA NSSDCA coordinate
  table](https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html), with the
  source frame recorded in `backend/data/moon.json`. Station longitudes match
  those cached records; an automated test checks the copies.

`backend/data/lighting.json` stores the period, source links, and assumptions.
References were checked on 2026-11-14. No live NASA API, imagery download, key, or
ephemeris request is involved in simulation or forecasting.

The **epoch is fictional**: mission day zero is sunrise at Apollo 11's longitude,
and the other sites use their longitude difference at that same epoch. These are
not the actual Apollo landing dates or historical lighting reconstructions.
The model assumes a smooth non-polar horizon and equal light/dark halves. It
ignores latitude-dependent terrain horizons, mountains, seasonal effects,
eclipses, incidence angle, panel tracking, and temperature effects. All current
sites are non-polar Apollo sites; do not apply this model unchanged to polar bases.

## Weekly integration

Local solar age advances by seven days per turn. East-positive longitude advances
the local phase by `(site longitude - reference longitude) / 360 * period`.
An analytic cumulative-daylight integral counts exactly how many of those seven
days fall in the illuminated half-cycle, including weeks crossing dawn or dusk.
It handles the negative initial phase at sites west of the reference.

```text
daylight_fraction = illuminated days in the turn / 7
solar_generation = full-daylight weekly capacity * array condition * daylight_fraction
```

There is no random lighting roll. The forecast is independent of event/outcome
seeds. A fully dark turn produces zero solar energy; mixed turns produce a
proportionate amount. Baseline forecasts use the current array condition and
cannot predict future damage, repairs, spending, or deaths.

This remains a weekly energy budget. Generation within the week offsets loads
within the same week; the model does not check hourly brownouts or whether a
battery could bridge the exact ordering of light and darkness inside that turn.

## Fictional hardware and balance

| Outpost | Full-daylight capacity, units/week | Battery capacity, units |
|---|---:|---:|
| Alpha | 48 | 100 |
| Oceanus | 56 | 110 |
| Fra Mauro | 48 | 90 |
| Hadley | 52 | 100 |
| Descartes | 48 | 85 |
| Taurus | 50 | 80 |

The full-daylight capacities were doubled from the constant-output prototype.
Over a full idealized light/dark cycle, average pristine generation therefore
remains comparable to the previous balance, but night now requires stored energy.
Actual output still depends on condition, mission phase, and the station.

Battery sizes, efficiencies, consumption, and power units are original game
values, not NASA flight hardware specifications or kWh. Batteries neither expand
nor deteriorate during this version. Emergency power cells add initial charge
up to capacity; they do not enlarge storage. Preparation warns when packed charge
would exceed capacity. Positive incident gains are also capped.

## Allocation and accounting

1. Validate and reserve all incident and manual-assignment costs from current
   supplies. The player cannot fund these up-front actions with future solar
   generation. Earlier action effects can change array condition or reserves.
2. Feed surviving crew and compute current-week solar generation.
3. Combine remaining battery charge and solar generation. Under **life support
   first** (default), reserve the full essential weekly demand before offering
   surplus power to recording projects. Under **research recording first**,
   offer power to recording projects first, then supply essential loads.
4. Each recording project needs its full 2 power to advance. If its allocation is
   smaller, it waits without charging or losing progress. Paused projects draw
   nothing. Newly deployed sensors begin recording the following week.
5. Oxygen generation follows the fraction of essential demand actually powered,
   using the existing oxygen-reserve and health rules. Research-first can therefore
   reduce oxygen production and eventually endanger the crew.
6. Store the remaining electricity up to battery capacity. Report excess solar
   energy as curtailed/discarded electricity; it cannot accumulate indefinitely.

The essential power budget now has habitat, water-recovery, oxygen-generation,
and CO2-removal components. Processor demand can fall when there is no wastewater
to treat or oxygen reserves are adequate. The allocated fraction powers all active
processors; research-first can affect water recovery and CO2 handling as well as
oxygen. See [connected life support](life-support.md) for ordering and rates.


The selected priority persists until changed and is part of the atomic weekly
request and retry receipt. An invalid priority rejects the request; changing a
priority on an already-used request ID is a conflict. Project pauses, crew orders,
rations, and power priority are submitted and committed together.

State `energy` includes capacity, stored charge, priority, essential demand,
provenance, and the remaining mission forecast. Catalog `sunlight_forecasts`
provides the launch forecast for each station. Survival reports include daylight
fraction, generated power, essential usage, recording usage, oxygen power fraction,
battery capacity, and curtailed electricity. The interface exposes forecasts in
preparation and play, the selected priority in play, and battery totals in results.

Tests cover real cached inputs, integration across dawn/dusk/night, long-term
half-cycle conservation, longitude differences, generation-based recording,
priority-dependent oxygen effects, storage overflow, charging caps, and replay.
A 120-campaign smoke check across all outposts and two/four-person crews reached
endings with bounded batteries and no blocked turns. Outcomes varied with loadout
and decisions; this is not a balance guarantee.
