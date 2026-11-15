# Station room and guided weekly play

`/game/:gameId` is a full-screen station scene with a weekly planner. A fixed SVG
cutaway uses two curved seating tiers, a central table, storage, work consoles,
and a medical/system area. It reuses the shared astronaut rig. Each living crew
member appears once; deceased crew remain inspectable through the crew strip.
The same layout serves all six outposts using the returned mission state.

## Weekly flow

1. **Incident:** choose an authored response, eligible lead, and explicit support
   crew. Read costs, retained equipment, probabilities, and outcome information.
   The backend's quiet-week response follows this same flow.
2. **Crew:** give remaining living crew one main assignment each, or leave routine
   duties/recovery. Medical care reserves its caregiver and patient. Incident crew
   and patients cannot select another job; changing earlier decisions can produce
   conflicts that must be cleared before submission. Existing conditions determine
   current eligibility; planning food does not immediately heal anyone.
3. **Food & water:** allocate the entire week's rations. Group presets and
   individual controls use backend-provided ration costs and condition outlooks.
   Empty reserves default to emergency rations. Outlooks assume supplies are funded;
   the confirmed survival report records actual provisions and recovery.
4. **Review:** inspect response participants, jobs, medical targets, individual
   rations, combined known costs, project orders, and power priority. Future solar
   generation and uncertain rewards do not fund the current action budget.

Next, Back, step navigation, crew inspection, and bookmarks only edit or display
the same local draft. There is no timer, per-step API submission, or consumption.
The final End Week button is available only in Review and blocks known conflicts
and combined-budget failures. The backend still validates the complete plan.

## Information access

- **Crew:** inspect actual health, nutrition, hydration, conditions, restrictions,
  traits, and recovery information. Room characters and the persistent crew strip
  open the same card, including on touch devices.
- **Stores:** exact confirmed stock, plus a separate planned-spending summary.
- **Systems:** sunlight forecasts, battery capacity, power priority, water/oxygen/
  CO2 loops, conditions, and research sources.
- **Science:** separate objective progress and persistent project phases, costs,
  estimates, and controls. Project orders are explicitly marked as planned until
  submitted. Automatic recording does not reserve its previous worker.
- **Log:** confirmed weekly history, with expandable detailed reports.

One bookmark replaces the active planner content at a time; returning restores
the selected step and draft. Depleted provisions, urgent medical needs, and unsafe
cabin CO2 remain visible while reading optional panels. HUD values are confirmed
stocks, not predictions.

## Resolution and recovery

GamePage retains one complete request and request ID while its result is unknown.
Every decision control locks during submission and uncertain failures; navigation
remains available for inspection. Retry resends the exact saved request. Known
validation failures unlock editing. Conflicts refresh authoritative state, and an
old retry receipt cannot replace newer state from another session.

The server response updates the room/HUD and opens an inline confirmed debrief.
Survival, scientific achievement, and crew/project outcomes appear separately.
The full report retains injury/recovery details, resource accounting, cancellations,
and the next incident's already-applied discovery effects. New-week planning waits
for Continue; final-turn receipts lead to mission results after the debrief. A
mission loaded after completion goes directly to results as before.

The draft and pending request are held in page memory, not a durable save. Backend
missions remain in memory and do not survive a server restart.

## Responsive and accessible presentation

Laptops show the room and planner beside each other. Phones place the room above
the planner, retain crew and bookmark access, and scroll the active panel internally.
The step rail and navigation remain outside the scrollable content. Very short
screens use a smaller room preview. Phone crew inspection uses the persistent
strip; duplicate room labels/hotspots are hidden to keep the scene readable.

Controls use native buttons, selects, labels, and disclosures. Selected bookmarks
use pressed states; the current step uses `aria-current`. Step/panel navigation
focuses its heading. Critical alerts use text, and reduced-motion preferences are
respected. Essential information does not depend on hover.

## Visible station state

`stationPresentation.ts` maps the current response, explicit support, assignments,
medical targets, and server-reported eligibility to presentation descriptors.
`stationLayout.ts` places each living person once using fixed scene anchors.
These modules do not simulate spending, success, healing, or project advancement.

- Routine and rest use the benches. Shared cabin clothing reuses the same heads,
  appearance configuration, role accents, limbs, and equipment props. Existing
  selection-page portraits retain their EVA suit by default.
- Indoor maintenance and research use working poses at desks, with tools or a
  tablet. Furniture is presentation, not a new simultaneous-equipment limit.
- Medical care places caregiver and patient together. Serious/critical or urgent
  patients recline on a cot; lighter cases receive seated care. Self-care uses one
  person at their seat. Other recovering crew can recline on the benches, so the
  scene can show four resting people without inventing a medical-bed requirement.
  Existing patient-targeted incident responses use a patient pose without adding
  an unbooked caregiver or changing that response's crew requirements.
- EVA leads, support crew, and assignments appear in a labelled surface-view
  inset wearing the shared EVA suit. They have no second body inside the cabin.
- Work restrictions, named conditions, and deficits choose well/tired/unwell
  expressions. These are illustrative signals, not diagnoses or new game rules.
- Conflicting or unavailable orders show a warning label and do not depict valid
  work or a medical pair. Existing weekly validation still blocks submission.

The scene explicitly says **Plan preview**, **Awaiting confirmation**, or **Week
N recap**. A confirmed recap uses the submitted activity metadata plus the returned
receipt: failed work is labelled, cancellations release participants to recovery/
routine, and dead crew are omitted. Surviving medical partners never retain a
dead body. Recap positions illustrate the resolved week's activities, rather than
claiming that jobs persist into the next week. Continue restores a fresh preview.
No pose or stock change is driven by a timer. Position changes are immediate,
avoiding stretch/clipping while switching between upright and reclining artwork.

### Supplies

Food uses at most eight fixed-size pouches. Water and oxygen use fixed tank
silhouettes with changing fills. Their reference is arrival stock, reconstructed
from current resources minus the complete history of net resource changes; later
replenishment can fill the display. Illustrations remain stable after a refresh
and exact quantities remain in Stores/HUD. They do not equate a pouch with one
resource unit. Very small positive food stock retains one pouch; zero removes all.

Medicine and repair stacks show at most three packs with exact counters; other
consumables use shared item icons and counters. The scanner, science kit, and
oxygen regulator remain on their racks while owned. Battery fill uses the actual
reported capacity. Costs are never deducted locally: planning and retries keep
the old stock; only the authoritative response updates it. The Stores bookmark
explains the pictorial limits.

### Research indicators

The room footer opens Science and shows the current seismic phase, discrete phase
weeks, paused/completed status, and queued orders. Its accessible label includes
the server's latest project message, including power-shortage explanations; the
Science panel shows that message in full. Paused progress stays visible. Automatic
recording has a **crew free** label and never uses `assigned_crew_id` as an ongoing
reservation. A phase progress bar is not elapsed real-world time. Only the backend
can advance phases or award objective credit.

## Scope

This milestone changes presentation and planning, with no new dependencies, API
fields, survival calculations, or balance changes. Walking/pathfinding, real-time
jobs, and richer onboarding remain future work. The fictional room composition,
clothing, and treatment poses are not NASA habitat or medical specifications.

Validation covers fixture-based gameplay and retry tests, plus local headless
browser checks at 1440×900, 1280×720, 768×1024, 390×844, 375×667, 320×568, and
844×390. A real backend browser flow checks that planning does not spend stock,
one submission advances one week, returned results appear, assignments reset,
and the confirmed report remains in the log.
