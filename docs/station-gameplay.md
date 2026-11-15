# Visual station gameplay

The station fills `/game/:gameId`. A floating week counter, Help, contextual
warning and Next Week sit over shared SVG artwork. There is no page header/footer,
step rail, crew directory or persistent guidance sentence.

## Play a week

1. The incident board opens with the title, description and all 3-4 response
   cards. Cards show spending, retained tools, likely benefits and failure risks.
   Select a response, choose lead/helpers by portrait if required, then confirm.
   Selecting a card alone does not commit it.
2. Click a free astronaut for meals and concrete job cards. Two affordable/eligible actions are prioritized immediately; flat Explore/Fix/Care/Rest filters expose the rest. Select
   a task and confirm. Medical targets appear inline, reserving worker and patient.
   Confirmed jobs are immutable; unassigned crew retain routine duties/recovery.
3. Give food and water through each crew panel or Supplies. Feed everyone is a
   shortcut. Food and water have compact independent selectors. Normal, reduced
   and emergency allocate 100%, 70% and 40% of need.
   Every living astronaut needs explicit choices, including away crew and patients.
   Feeding does not close jobs. Known short-ration risks remain visible.
4. Next Week validates incident, individual provisions, bookings and combined
   costs. Missing choices identify people by portrait/name and link to the fix.
   A ready plan submits immediately once; no ration wizard or mandatory review.
5. The report shows the response, crew condition, work, stock changes and separate
   survival/science. Optional grouped details explain power, water and health.
   Continue opens the next incident or final results.

## Visual language

Shared cargo artwork maps simulation resources to icons explicitly. Small whole
consumables repeat (two medicine units = two kit icons). Continuous/fractional and
large costs retain exact numbers; repetition is bounded. Empty costs disappear.
Red-tinted minus strips mean spending, tool/check strips mean equipment retained.
Success badges retain percentages and a symbol; risk is not conveyed by color alone.
Short labels and accessible names explain unfamiliar symbols.

The table computer opens Energy directly, with flat Air & water, Science and Crew
sections. Battery, upcoming sunlight and power priority share one view. Science
shows objective targets, phase/progress, work/power requirements, retained tools,
estimates and explicit pause/resume/interrupt controls together. Manual work cannot
also be paused. Automatic recording reserves no worker. No source/history essays
interrupt weekly decisions; research references remain in project documentation.

## The room

`roomLayout()` supplies desktop and portrait anchors to architecture, actors,
furniture and hit areas. Seated hips align to curved cushions facing the player.
Desks/cots use worker/patient anchors; tools belong on shelves, monitors on desks.
Avatars share clothing, faces, poses and expressions. Incident/EVA participants
leave the common room and remain inspectable through the airlock duty list.
Indoor workers and medical pairs stay visible. Deceased astronauts have no body
and cannot be assigned. A cancelled job releases its partners under existing rules.

Hover/focus cards show condition, hunger/thirst and selected rations. Escape dismisses
cards. Tap opens a persistent portrait-led panel with essential condition/restriction
information. Permanent floating name tags are removed to keep faces/furniture clear.
Shelf/tank/battery art uses confirmed stock, with bounded pack illustrations.
Selecting work or meals never spends stock before the authoritative week resolves.

## State and recovery

`weeklyPlan.ts` owns serializable choices, booking checks and projections;
`useStationMission.ts` owns fetch, atomic submission and reconciliation. Simulation,
probabilities, survival and science remain backend-owned. API fields are unchanged.

Local storage keeps the existing `last-outpost.week-plan.v1.<gameId>` key, with a
version-2 plan containing independent food/water decision flags. Version-1 plans
migrate: confirmed old rations count as chosen; defaults do not. Pending request
IDs/bodies are never rewritten. Unknown failures retain the exact request for retry,
even when GET already shows a later/completed week. Duplicate clicks are guarded.
Historical receipts cannot roll current state backward. A 409 refreshes; an explicit
rebuild is available for a wholly rejected 4xx plan. Normal confirmed jobs have no undo.
Browser-storage failure falls back to memory; server restart still loses games.

Base action costs must fit current stock; future generation/uncertain gains cannot
fund them. Final validation preserves emergency depletion sharing and checks care
pairs, incident support, project workers and pause conflicts. The backend revalidates
and resolves everything atomically, with existing idempotency and deterministic rules.

## Access and validation

Flexible native modal dialogs keep focus inside, support Escape and return focus to
the invoker or crew log if that actor disappeared. Controls use native buttons,
visible focus, accessible icon names and reduced motion. Responsive grids replace
one-fact pages. Content must stay reachable at zoom/extreme sizes; overflow must
not silently hide consequences. See `station-redesign-plan.md` for checks and results.

Research: [children's cognition](https://www.nngroup.com/articles/kids-cognition/),
[icon usability](https://www.nngroup.com/articles/icon-usability/),
[clear game language](https://gameaccessibilityguidelines.com/use-simple-clear-language/),
and [understandable controls](https://www.w3.org/WAI/WCAG2/supplemental/objectives/o1-understandable/).
The shelter/choices inspiration uses [Robot Gentleman's developer material](https://robotgentleman.com/presskit/60SecondsReatomized.htm).
Art, wording and interaction implementation are original. Automated checks are not
usability testing with children. No new simulation mechanics or dependencies are added.

Final redesign verification: 171 frontend tests, 429 backend tests and production
build passed. Seven viewport checks covered common week panels without routine
scrolling, plus keyboard/reduced-motion checks and screenshot review. An eight-week
real-backend campaign tested response loss, reload and exact replay with no duplicate
resource spending or scientific credit. Optional detailed accounting and extreme
content/zoom can scroll inside the modal so information remains reachable.

Task filters keep concrete verbs, costs and chance badges visible. Unavailable
cards use concise reasons; selecting them shows the relevant restrictions together.
The smallest phone/landscape layouts keep all five filter groups usable without
routine scrolling, including recovery-limited crew.
