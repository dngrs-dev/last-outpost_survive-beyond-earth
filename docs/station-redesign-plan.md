# Station redesign: direct, visual play for ages 7-12

## Resume here

User requested this plan first to preserve work across a usage-limit reset.
Implementation is in progress. The user now authorizes one commit per numbered step.

- Baseline: `20a8785` (`feat(gameplay): add full-screen station and guided notebook flow`).
- Working tree was clean before adding this plan.
- Read `AGENTS.md`, this plan, and current files before implementing. Follow current
  user instructions if they change anything below. Do not roll back the baseline.
- Keep this checklist updated with completed work, checks, and remaining issues.
- Commit each numbered step in sequence, as authorized by the latest user request.
- Do not add dependencies or manually edit fixtures.
- Previous baseline validation: 150 frontend tests, 429 backend tests, production
  build, seven viewport checks and an eight-week mission. These are previous
  results, not validation of the redesign described below.

Resume prompt: **Implement docs/station-redesign-plan.md in order. Update its
checklist as you go, preserve deterministic atomic turns and exact retries, and
run relevant checks. Commit each numbered step in sequence.**

## Design decisions

- The station is the game board. Keep its floating week counter and Next Week.
  Remove persistent guidance/status sentences and the universal notebook style.
- Incident: almost full-screen modal, title and short description at the top,
  all 3-4 response cards visible together. No response carousel or briefing pages.
- Crew: recognizable portrait, short useful condition summary, meals and available
  actions in one panel. No overview -> details -> category -> task -> pages maze.
- Supplies: a visible feeding interaction independent of Next Week. Reach every
  living astronaut, including incident/EVA workers and patients.
- Next Week: validate and submit directly when ready. If something is missing,
  show specific portraits/names and a direct way to fix it. No automatic ration
  wizard, compulsory review, or repeated confirmation chain.
- Preserve explicit confirmation before irreversible incident/job decisions.
  Selecting a card is a preview; its final action button commits it. Changes to
  the display must not accidentally commit work.
- Preserve existing eligibility, one-job bookings, project rules, survival/science
  separation, deterministic resolution, pending-request persistence and retries.
- Historical explanations and source links stay in repository documentation and
  credits, outside the active weekly decision flow. Keep essential gameplay risks.
- Icons lead; short labels explain unfamiliar actions. Red-tinted spending strips
  also use a minus symbol; success badges show a probability and recognizable
  symbol. Never rely only on color or imply a risky option is guaranteed.
- No routine scrolling or one-fact pagination. Use responsive grids and concise
  content, not shrunken fonts, hidden consequences, or clipping. At zoom/accessibility
  extremes allow content to remain reachable rather than trap it behind overflow.

## Research basis

- [NN/g: Designing for Kids](https://www.nngroup.com/articles/kids-cognition/):
  research with children supports clear goals, concrete concepts and age-appropriate
  instructions. Application here: show the action and result together.
- [NN/g: Icon Usability](https://www.nngroup.com/articles/icon-usability/):
  unfamiliar symbols can be ambiguous. Application: reuse recognizable portraits,
  cargo artwork and role icons; retain tiny useful labels and accessible names.
- [Game Accessibility Guidelines: clear language](https://gameaccessibilityguidelines.com/use-simple-clear-language/):
  concise wording reduces reading barriers. Application: short action sentences,
  no repeated explanations of backend timing, no empty cost rows.
- [W3C: understandable controls](https://www.w3.org/WAI/WCAG2/supplemental/objectives/o1-understandable/):
  familiar controls and clear relationships reduce memory demands. Application:
  one obvious action area, consistent icons and direct links from blocking errors.

These inform the proposal; usability for ages 7-12 still needs observation with
children. Do not describe automated tests as child usability testing.

## Implementation sequence

### 1. Reusable visual controls and flexible modals

- [x] Replace the notebook-specific shell with a neutral accessible modal supporting
  large incident, medium crew, and compact warning/result sizes. Keep native dialog,
  focus containment/restoration, Escape, touch targets and reduced motion.
- [x] Add small shared resource/chance/crew widgets in the existing component
  directories. Reuse `ItemIcon`, `RoleIcon` and `AstronautAvatar portrait`.
- [x] Map resource IDs explicitly: medicine -> medicine_kits, food -> food_packs,
  water -> water_containers, oxygen -> oxygen_tanks, plus existing matching items.
  Electricity needs a matching power glyph, not an unrelated consumable icon.
- [x] Show repeated icons for small whole-unit consumables (2 medicine = 2 kits).
  Use exact numeric quantities for fractional/large continuous resources; bound
  repetitions. Do not equate one packed cargo unit with one simulation unit.
- [x] Hide zero/empty costs. Distinguish consumables spent from equipment required
  but retained (e.g. tool/check badge). Keep exact screen-reader labels.

### 2. Incident board: all options together

- [x] Replace `IncidentNotebook.tsx` with a large incident panel. All 15 authored
  events currently have 3 or 4 choices; test both counts across screen sizes.
- [x] Put the incident title and a short, faithful description above response cards.
  Show each action, core benefit/risk, costs, required crew/equipment and chance.
- [x] Selecting a card reveals an inline portrait picker for lead/support and one
  clear confirm button. Show candidate-specific chance; do not auto-commit a lead.
- [x] Unavailable choices remain recognizable with a concise reason. Preserve
  support distinctness, budgets, injuries and incident occupancy validation.
- [x] Remove historical references, timing boilerplate, empty requirements and
  separate consequence pages. Retain meaningful failure risks before confirmation.

### 3. Independent meals and correct Next Week semantics

- [x] Add per-person food/water decision tracking to `weeklyPlan.ts`; default ration
  values must not count as an explicit player decision. Saving a meal confirms
  both resources for that astronaut. Keep established emergency-ration rules.
- [x] Replace global `rationsConfirmed` as the ordinary crew-order lock. Feeding
  somebody must not prevent them or other astronauts receiving work afterward.
- [x] Put food/water controls on the crew panel and a shared meal board from
  Supplies (all portraits visible, including away crew). Include a clear Feed all
  shortcut and full/half/emergency visual choices with short honest consequences.
- [x] Persist explicit meal decisions. Migrate saved v1 plans: previously confirmed
  rations count as chosen; unconfirmed defaults do not. Never drop or rewrite a
  saved pending request to migrate editable planning data.
- [x] Next Week checks incident response, every living person's food/water, bookings
  and combined costs. Missing meals show exact portraits/names and whether food,
  water or both are missing. Repair buttons open the relevant control directly.
- [x] If ready, submit once immediately via `useStationMission`; unassigned people
  retain routine duties. Do not require an assignment for every crew member.
- [x] Food controls select weekly allocations; backend stock/health changes still
  happen atomically at week resolution. Pending submissions lock all edits.

### 4. One useful crew panel and direct action cards

- [ ] Replace `CrewNotebook.tsx` with a portrait-led crew panel. Brief condition,
  actual illness/restrictions and meaningful traits share the main panel; remove
  four-page details and repeated hover information. Tap users still get the key
  health/food/water facts without relying on hover.
- [ ] Show understandable task cards together: concrete verbs such as Repair air
  filter, Collect samples, Treat injury, Rest. Use short descriptions, resource
  icons and candidate-specific success badges. No category-only navigation gate.
- [ ] Make the initial layout prioritize eligible/relevant actions; other tasks
  remain directly discoverable through a flat compact section, not nested pages.
- [ ] Selecting treatment shows eligible patient portraits/conditions inline.
  Commit books caregiver and patient; no duplicate assignment or dead patient.
- [ ] Booked/away/deceased crew are inspectable; no reassignment through the panel.
  Pending/request-recovery mode is read-only. Meal access works for living patients
  and absent workers without requiring their scene body.

### 5. Rebuild physical station staging

- [ ] Replace independent portrait multipliers/translations with shared desktop and
  portrait layout anchors for architecture, furniture, actors and hit areas.
- [ ] Draw two curved seating tiers facing the player; their implied circle center
  is below the scene. Put bodies behind appropriate seat/table foreground edges,
  with hips on cushions, feet supported and consistent perspective.
- [ ] Attach monitors to desks/walls, put objects on real surfaces, ground table,
  chairs/cots and shelves. Add restrained shadows/material detail in shared SVG.
- [ ] Reuse the existing avatar/clothing rig. Fix pose placement and occlusion rather
  than redrawing each astronaut. Ensure medical pairs and up to four indoor workers
  fit without unrelated overlaps; incident/EVA workers stay absent.
- [ ] Keep scene labels minimal and clickable areas aligned to their objects at all
  supported viewports. Prevent tooltip collisions and floating name labels.

### 6. Compact station information and results

- [ ] Replace one-fact pages in `StationNotebook.tsx`, `ReportNotebook.tsx` and
  `reportPages.ts` with clear visual groups: supplies, energy/air, science/projects.
  The computer opens useful grouped information directly, not a deep menu tree.
- [ ] Show forecasts and project phases/progress together; preserve pause/resume/
  interrupt confirmation and costs without long technical/history explanations.
- [ ] Weekly results show crew portraits, important resource changes, incident/work
  outcomes and separate science progress together. Retain access to relevant detail,
  but do not require many page turns to continue.
- [ ] Remove obsolete notebook components/styles only after imports and tests move.
  Update README and station gameplay documentation to supersede the prior flow.

### 7. Verification and handoff

- [ ] Adapt behavioral tests to user actions, not old notebook/page labels. Add cases
  for missing meals by person, food vs water omissions, feeding then assigning work,
  away/patient feeding, meal persistence/migration and valid direct Next Week.
- [ ] Retain assignment-conflict, medical-pair, budget, death, project, duplicate-click,
  ambiguous retry, refresh-pending, stale-receipt and final-routing coverage.
- [ ] Run frontend tests/build. Run backend tests if contracts/fixtures/simulation
  change; regenerate fixtures only through the existing generator when needed.
- [ ] Browser-check incident 3/4 cards, crew/actions, meals, warnings, medical pairs,
  workstations and results at 1440x900, 1280x720, 768x1024, 390x844, 375x667,
  320x568 and 844x390. Check touch, keyboard, focus restore and reduced motion.
- [ ] Inspect screenshots for contact/occlusion/perspective, not only DOM overflow.
  Complete a real-backend campaign with no duplicate charges or science rewards.
- [ ] Record actual checks, limitations and any unfinished work below. Commit the completed step as authorized.

## Efficiency and boundaries

Use one lightweight frontend plan and the existing submission hook. Prefer two
coherent implementation passes: steps 1-4 (playable interactions), then 5-7 (scene,
remaining panels, verification). Finish each pass in a runnable state. Check off
completed tasks here before stopping so continuation does not reread all history.
Use focused tests during edits, one full suite/build at a meaningful checkpoint.
No new dependencies, AI bitmap assets, balance changes, mechanics, or backend
per-click mutations are needed. Do not advertise production readiness until the
implemented behavior and layouts have actually passed validation.

## Progress / outstanding work

- Implementation started; see step checkboxes and validation notes below.
- Files currently implicated: `GamePage.tsx`/CSS, `weeklyPlan.ts`,
  `useStationMission.ts`, existing `components/station/*`, shared portraits/icons,
  frontend tests and station documentation. API contracts can remain unchanged.

Step 1: neutral modal sizes and shared visual controls implemented. Two resource-widget tests and production build passed. Existing panels retain a temporary compatibility export until their replacement.

Step 2: all incident responses, visual consequences, inline lead/support portraits and explicit confirmation implemented. Four focused visual/incident tests and production build passed. Old notebook-navigation integration tests will move to the new flow in step 7.

Step 3: per-resource meal decisions, v1 migration, independent feeding and direct Next Week submission implemented; pending requests remain unchanged. Actual reduced/emergency rates are 70%/40%, not half portions. Twenty focused tests and production build passed.
