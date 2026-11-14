# Event library

The game has fifteen authored events, shared by all six outposts. Twelve were
added to the original three. Each event exposes its category, a short science
explanation, and an official NASA reference in the weekly event card. Expand
"Science behind this scenario" to read the reference without leaving gameplay.

## Research and fictional rules

The sources establish physical hazards, engineering concerns, training practices,
or historical lessons. They do not describe actual incidents at these fictional
outposts. Scenarios, recurrence, resource units, cargo dimensions, success chances,
health effects, and rewards are original game design. This is not a radiation-dose,
medical, pressure-vessel, or lunar thermal simulation. No live NASA service or API
key is used. The JSON stores original summaries and links, not downloaded articles.

| Scenario | Category | Research basis and playable decision |
|---|---|---|
| Dust on the Array | Hazard | [NASA dust research](https://www.nasa.gov/reference/jsc-dust/): repair dust-affected hardware or accept persistent solar damage. |
| Life Support Alarm | Hazard | [NASA hardware guidance](https://www.nasa.gov/reference/9-0-hardware-and-equipment-vol-2/): replace a regulator, recalibrate, or accept oxygen-system damage. |
| Contaminated Air Filter | Hazard | [NASA dust research](https://www.nasa.gov/reference/jsc-dust/): treat an injured crew member or conserve medical supplies. |
| Shelter Before the Storm | Hazard | [NASA lunar radiation protection](https://science.nasa.gov/science-research/heliophysics/how-nasa-will-protect-astronauts-from-space-radiation-at-the-moon/): support the shelter, reconfigure shielding, or accept exposure damage. |
| Pinprick in the Pressure Line | Hazard | [NASA lunar impact monitoring](https://www.nasa.gov/meteoroid-environment-office/about-lunar-impact-monitoring/): seal or clamp a fictional small puncture, or sacrifice more oxygen to isolate it. |
| Thermal Control Warning | Hazard | [NASA lunar environment](https://science.nasa.gov/moon/weather-on-the-moon/): service or patch a radiator controller, or shut down equipment at an oxygen cost. |
| Water Under the Floor | Hazard | [NASA water recovery research](https://www.nasa.gov/ames/space-biosciences/water-recovery-systems/): fix a coupling and recover clean reserve water, or isolate the loss. |
| Carbon Dioxide Scrubber Load | Hazard | [NASA carbon dioxide guidance](https://www.nasa.gov/ochmo-tb-004-carbon-dioxide-2/): service a scrubber, purge cabin air, or accept health and system damage. The scrubber now has its own condition and persistent cabin burden; purge, repair, and neglect affect it separately from O2 generation. |
| Antenna Off Target | Hazard | [NASA lunar communications planning](https://www.nasa.gov/wp-content/uploads/2023/11/scan-heo-nac-heo-2023-11-20.pdf): realign locally, attempt remote recovery, or use stored procedures. No separate communications subsystem is simulated. |
| Battery String Offline | Hazard | [NASA hardware guidance](https://www.nasa.gov/reference/9-0-hardware-and-equipment-vol-2/): repair or measure isolated hardware to recover energy, or accept the initial loss. |
| The Makeshift Dust Shield | Hazard | [Apollo 17 improvised fender repair](https://history.nasa.gov/wp-content/uploads/static/history/alsj/WOTM/WOTM-DuctTape.html): adapt the maps-and-clamps lesson to a fictional outpost cover; no rover is simulated. |
| Fresh Geological Exposure | Opportunity | [NASA Artemis geology training](https://www.nasa.gov/missions/artemis/nasa-field-geology-training-prepares-artemis-mission-support-teams/): spend EVA supplies collecting data, with a better return from instruments and scientific skills. |
| A Signal in the Seismometer | Opportunity | [NASA moonquake science](https://science.nasa.gov/moon/moonquakes/): analyze a recorded signal with two crew and instruments, or archive a smaller result. |
| A Crate in the Ledger | Opportunity | [NASA food systems](https://www.nasa.gov/directorates/esdmd/hhp/space-food-systems/): inspect a fictional reserve crate before releasing food and water into available stock. This does not create supplies. |
| A Week for Recovery | Recovery | [NASA exercise countermeasures](https://www.nasa.gov/directorates/esdmd/hhp/exercise-physiology-and-countermeasures/): choose rest, extra provisions, or patient treatment. Instant healing amounts are fictional. |

## Equipment and rewards

- **Sealant packs** are consumed by guaranteed pressure-line, water-line,
  thermal-patch, and dust-cover responses. Other choices remain available without
  sealant. They cost 0.8 kg and 2 L each in the fictional cargo budget.
- **Field science kit** is reusable, limited to one, and costs 3 kg / 5 L. It
  unlocks instrumented sampling and seismic analysis, conservative battery
  measurements, and environmental inspection of reserve packaging. It is distinct
  from the existing medical scanner. It does not generate survival resources.
- **Research data** is a running total, shown during play and in the debrief.
  Geology, seismic analysis, and restored communications can earn it. Separate
  [mission objectives](research.md) track successful samples, analyses, and
  instrument restoration; points alone do not complete them. Neither science
  progress nor points consume cargo capacity or change the four survival endings.

Medicine, repair kits, EVA supplies, dust kits, oxygen regulators, and the medical
scanner retain their existing purposes. Pack supplies according to crew size and
mission duration; specialized equipment trades cargo capacity for reliable actions
or extra research, rather than being required to advance.

## Playability and resolution

Every event has an authored response with no material cost and no assigned crew,
so unavailable equipment cannot block a turn. These responses may accept losses;
they do not guarantee survival. Maintenance and planned research are separate
one-week crew assignments, available
alongside the incident response. Each assigned astronaut, including explicit
incident support crew, occupies one main job. See [weekly assignments](assignments.md).
Initial discovery damage is applied once before planning. Successful qualifying
responses and assignments share capped research-objective credit. Archiving a
seismic signal still earns data without completing a detailed analysis.

The selector prioritizes unseen eligible events, then uses weighted selection.
The previous two events remain excluded; a quiet week is the fallback if no event
qualifies. The new events start in week two or three. Short missions show a subset;
longer missions can see all fifteen before repeats. Seeded outcomes, atomic
validation, and retried-request handling are unchanged.

The backend validates item requirements, role and crew-count requirements,
combined ration/response/assignment spending, effects, and resource accounting. Science equipment
is checked rather than consumed. All health and system effects remain bounded.
