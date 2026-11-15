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

## Scope

This milestone changes presentation and planning, with no new dependencies, API
fields, survival calculations, or balance changes. The room's shelf props are
illustrative scenery; exact stock is in the HUD/Stores. Dynamic shelf quantities,
indoor uniforms, assignment-specific poses/movement, and richer onboarding remain
later milestones. The fictional room composition is not a NASA habitat blueprint.

Validation covers fixture-based gameplay and retry tests, plus local headless
browser checks at 1440×900, 1280×720, 768×1024, 390×844, 375×667, 320×568, and
844×390. A real backend browser flow checks that planning does not spend stock,
one submission advances one week, returned results appear, assignments reset,
and the confirmed report remains in the log.
