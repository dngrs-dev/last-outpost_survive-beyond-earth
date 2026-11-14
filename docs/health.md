# Nutrition, hydration, and overall condition

`health` remains the 0-100 overall condition summary, including injuries and
environmental damage. Zero still means death under the existing survival rules.
Two independent per-astronaut deficits represent cumulative inadequate provisions.
The later [medical lifecycle](medicine.md) adds named injuries/illnesses and paired
care while retaining these deficit rules. Fatigue, a daily emergency clock, and
new random fatality mechanics remain future work.

## Source boundary

[NASA's risk of inadequate food and nutrition](https://www.nasa.gov/reference/risk-of-inadequate-food-and-nutrition/)
describes the relationship between adequate nutrition, astronaut health, and
performance. It motivates connecting provisioning to ability to work. It does
**not** supply these thresholds, deficit units, recovery rates, or mortality
timelines. All numbers below are original fictional balancing values. Hydration
is deliberately more urgent than nutrition in the game. Weekly averaging is a
playability abstraction, not a model of how long someone can safely go without
water or food. No external API calls or additional assets are needed.

## Actual provisions and accumulated deficits

Deficits start at zero. One deficit unit is a missing normal week's provision,
relative to that astronaut's trait-adjusted normal need. Normal, reduced, and
emergency rations request 100%, 70%, and 40%. Food and water remain independent.

During survival, each astronaut's received fraction is the requested percentage
multiplied by the fraction of the request actually supplied. Existing proportional
sharing applies if every living astronaut selects emergency for a depleted stock.
Normal/reduced overspending still rejects the entire plan. A request label alone
does not prove someone was fed; unfunded emergency rations accumulate real debt.
Water recovered later in the turn cannot retroactively fund drinking rations.

- Received fraction below 1: add `1 - received_fraction` to that resource's deficit.
- Full actual food: remove 0.25 nutrition deficit per week, or 0.40 while resting.
- Full actual water: remove 0.50 hydration deficit per week, or 0.75 while resting.
- Deficits never become negative. They clear gradually even when health is high.
- Existing shortage-week counters remain explanatory history; they no longer
  apply a second penalty and can reset while a deficit remains.

When actual food is inadequate, food damage is
`min(20, ceil(max(0, nutrition_deficit_after - 1) * 6))`.
When water is inadequate, water damage is
`min(80, ceil(max(0, hydration_deficit_after - 0.25) * 80))`.
Rounding tolerances prevent floating-point noise adding a damage point.
With full actual provision, the corresponding deprivation damage stops immediately,
but its residual deficit and work restrictions persist until recovery.
Existing oxygen/CO2 penalties remain separate.

For example, four fully funded reduced-food weeks produce nutrition debts of
0.30, 0.60, 0.90, and 1.20. The first three have no food damage, but performance
declines before the fourth week. A subsequent full-food week reduces 1.20 to
0.95, or 0.80 with rest; it does not reset it to zero. Full food cannot compensate
for inadequate water, and medicine cannot erase either deficit.

## Workload and restrictions

Each choice declares `workload`: `light`, `strenuous`, `eva`, `care`, or `rest`.
Research sampling and sensor deployment are EVA; instrument restoration and heavy
repairs are strenuous. Analysis, remote operations, and internal processor service
are light. Patient-targeted existing treatment choices are care, so a patient is
never rejected for being too unwell to receive treatment. Medic-led team treatment
remains active light work. Medical assignments now reserve caregiver and patient;
a critically unfit patient can receive care or perform self-care.

| Condition at planning | Available work |
| --- | --- |
| Health below 25, nutrition deficit at least 2.5, or hydration deficit at least 1 | Rest, existing patient care, and no-crew responses only |
| Otherwise: health below 50, nutrition deficit at least 1, or hydration deficit at least 0.5 | Light work, rest, and existing patient care |
| Otherwise | All work, subject to roles, equipment, resources, and occupancy |
| Dead | No assignments, rations, or support roles |

For risky active tasks, subtract this probability penalty, capped at 0.35:
`max(0, nutrition - 0.25) * 0.05 + max(0, hydration - 0.1) * 0.15 + max(0, 70 - health) * 0.003`.
Existing probability bounds apply; guaranteed actions remain guaranteed. Patient
care and rest do not receive an active-worker penalty. Support crew must meet
the same workload restrictions as the lead, without adding a second probability
bonus or penalty. The displayed probability remains the lead's probability.

Restrictions use the current state; selecting full rations does not make someone
fit before those provisions are delivered at the end of the turn. Incident
injuries can make a planned worker unfit before work starts: cancel that
assignment, refund its reserved base cost, and award no science or project progress.
All incidents retain a no-crew response for a critical roster. Existing double
booking rules also apply to rest.

## Recovery and research continuity

`crew_rest` is a guaranteed, free one-week assignment, available to every living
astronaut. It occupies their main slot and creates no provisions or medicine.
With full actual food **and** water, safe air (no oxygen or CO2 damage), and no
active work, health recovers by up to 2 per week on routine duties, or 5 on rest,
capped at 100. Active incident leads/support and active assignments receive no
automatic health recovery, including failed work. Unassigned critical crew simply
remain inactive. Deficits can still decline with full respective provisions while
working; these are separate from health recovery.

Rest improves each deficit's recovery only when that respective resource is
fully supplied. Continued deprivation never earns a rest healing bonus. Existing
authored patient-care events now give 5 immediate health and supported medical
recovery, as described in [medicine](medicine.md); they still do not clear debt.

Completed research phases remain completed after an injury, deficit restriction,
or death. Unavailable manual worker references are released without discarding
progress; assign a fit replacement in a later weekly plan. Automatic seismic
recording still requires power, never an available astronaut. Science and survival
assessments remain separate. Perfect handover additionally requires each survivor
to have nutrition deficit below 0.25 and hydration deficit below 0.1, so treatment
alone cannot mask unresolved deprivation.

## API, interface, and consistency

Crew state includes `nutrition_deficit`, `hydration_deficit`, a derived `condition`
(status, nutrition/hydration status, work/EVA availability, probability penalty,
restrictions, and ordinary full-provision recovery estimates), and `ration_outlook`.
Named medical cases add their own restrictions and recovery estimates.
Condition status is a summary: fit, impaired, serious, critical, or deceased.
Ration outlook assumes fully funded requested portions, routine duties, and no
incident/air damage. Its food and water projections are independent and do not
promise stock availability. Rest can improve recovery; shortages worsen it.

Choice views expose workload and per-person `support_candidates`. `action_type`
adds `rest`. The existing assignment request structure is unchanged. Each survival
health record includes actual food/water received fractions, before/after deficits,
deprivation/air penalties, health recovery, and work/rest flags. Crew cards,
disabled work options, weekly debriefs, and results explain these consequences;
selected-ration forecasts warn when deprivation alone could be fatal.

All updates occur on the same copied state as incident responses, costs, projects,
and rations. Invalid plans cannot change debt, progress, or supplies; reads are
pure; deterministic retries return the original receipt without repeated recovery
or damage. Fixtures are regenerated through the API using
`backend/export_frontend_fixtures.py`, including underfed, dehydrated, and rest
recovery examples. All saves are still in memory and disappear on restart.
