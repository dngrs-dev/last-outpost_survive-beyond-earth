# Mission research objectives

Survival and scientific achievement are separate outcomes. The four survival
endings retain their existing crew, reserve, health, and system requirements.
Science completion neither ends the mission early nor compensates for losing the
crew. A failed expedition can still have recorded scientific work, and a perfect
survival handover can have no scientific progress.

Research briefs appear in the Moon outpost selector and preparation. Progress is
shown during play, successful gains appear in the weekly debrief and journal, and
the final report gives science its own assessment.

## Outpost programs

All targets and program descriptions are fictional game design, not the original
Apollo missions' objectives or measurements of real research productivity.

| Outpost | Weeks | Geological samples | Detailed seismic analyses | Instrument/link restorations |
|---|---:|---:|---:|---:|
| Alpha | 12 | 2 | 1 | 1 |
| Oceanus | 8 | 1 | — | 1 |
| Fra Mauro | 10 | 3 | — | 1 |
| Hadley | 14 | 3 | 2 | 1 |
| Descartes | 16 | 2 | 3 | 1 |
| Taurus | 18 | 4 | 2 | 1 |

The concepts reuse the existing [NASA references in the event library](events.md):
Artemis field-geology training, Apollo seismic research, and spaceflight hardware
maintenance. Each objective carries its source link. No new datasets, API calls,
article text, or media assets are downloaded for this feature.

## Ways to make progress

Each successful qualifying action earns one unit toward its target, capped at the
target. Geological field-event sampling counts as one sample regardless of how
many research points it yields. Detailed seismic analysis counts; simply archiving
a signal does not. Successful local or remote antenna restoration counts toward
the instrument/link objective. Regular solar and oxygen repairs do not.

The player can also choose planned research whenever a relevant objective remains
unfinished, including during a quiet week. This avoids requiring a random event
to appear before an objective becomes possible.

| Planned task | Supplies spent on either outcome | Success | Failure | Role bonuses |
|---|---|---|---|---|
| Survey a geological sample | 1 EVA pack, 2 oxygen | 1 sample, 2 research data | Worker loses 8 health before traits | Scientist +20 points; technician +10 |
| Start a seismic project | 1 EVA pack, 2 oxygen, 2 electricity | Deploy sensors; no immediate credit | Worker loses 8 health before traits | Scientist +20 points; technician +10 |
| Restore the next research instrument | 1 repair kit, 2 electricity | 1 restoration, 2 research data | Worker loses 6 health before traits | Engineer/technician +20 points; scientist +10 |

All three require a living assigned astronaut and the reusable field science kit.
Their base success chances are 75%, 75%, and 70%, respectively; character traits
and the existing probability bounds apply. Requirements, per-person probabilities,
and potential objective credit come from the backend and are displayed before
submission. The field kit is not consumed. Research data retains its role as a
separate total for additional scientific output; it cannot substitute for any
specific objective.

Geology and instrument tasks occupy one astronaut for one week alongside the
incident response. Seismic deployment starts a [phased project](projects.md):
three automatic powered recording weeks follow, then one assigned analysis week.
Only successful final analysis earns its objective credit. Existing detailed
seismic event analysis remains another route to the target.
Incident responders and support crew cannot also take assignments. Initial
incident damage remains until repaired. Multiple astronauts may work on research,
but total objective credit cannot exceed the target. Completed objectives stop
offering their planned task; later matching events can still earn research data.
See [weekly assignments](assignments.md) for costs and resolution rules.

## Assessment and integrity

- `not_started`: no credited objective work, even if some research data was earned.
- `partial`: at least one unit of credited work, but not every target is complete.
- `complete`: every objective target is complete.

Partial progress is retained and shown as counts, not rounded up to a completed
objective. The final assessment covers the selected outpost's own objectives.
The science report describes recorded work; it does not simulate sample transport
or a separate data-downlink system.

Definitions live in `backend/data/missions.json`. The backend validates targets,
sources, qualifying choice references, unique objective IDs, non-overlapping
credit, and the availability of a planned task. Progress is derived from committed
turn-history gains. Failed actions, rejected decisions, reads, stale submissions,
and request replay cannot add credit. There is no client-submitted progress field.

Verification covers success/failure, concurrent event and assignment credit,
equipment rejection, support crew, double-booking, combined costs, death before
work begins, deterministic ordering, capped progress, and exact replay. Campaign
balance measurements from the earlier single-action prototype are superseded by
the assignment system.
