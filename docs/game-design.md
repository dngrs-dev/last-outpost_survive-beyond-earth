# LAST OUTPOST - Game Design and Technical Specification

> Title-screen update: `/` now shows an Earth-from-the-Moon title scene with Play
> and Load. `/moon/` selects a mission; `/crew/` selects the crew; `/prepare/`
> configures supplies. Legacy root station links redirect to crew selection. Load is a browser game-ID
> bookmark checked against the in-memory backend, not a durable save system.
> See `title-screen.md` for NASA imagery, artistic limits, motion, and routes.

> Scope update: the separate `/moon/` archive now uses sourced historical Apollo
> locations and a NASA color map. It is an exploration and mission-selection layer;
> six distinct fictional outposts now share the survival engine, with separate
> 8-18-week missions, starting conditions, and visible difficulty. See `lunar-data.md` for
> sources and the boundary between real records and game rules. The original
> exclusions of real coordinates/3D below apply to the initial survival prototype,
> not this subsequently requested archive.

> The later outpost-expansion request supersedes the original Alpha-only scope
> below. Current outposts are Alpha, Oceanus, Fra Mauro, Hadley, Descartes, and
> Taurus; older roadmap names are historical plans. No new station-specific
> crafting or simulation subsystems are included.

> Roster update: sixteen fictional specialists can now fill up to four explicit crew
> slots. Four additional cargo types support power reserves, solar cleaning, oxygen
> maintenance, and scanner-guided treatment. See `crew-and-equipment.md` for the
> NASA training references and the distinction between inspiration and game values.

> Final-results update: a minimal outcome screen replaces the detailed dashboard
> and mission chronicle. Presentation-only stars use authoritative final results:
> nobody survives = 0; otherwise +1 survival, +1 full original crew, +1 all science
> objectives completed. Zero objectives do not earn a science star. This does not
> change survival endings or simulation rewards. Shared chrome uses the title/Moon
> navy-and-gold palette.

## 1. Project Overview

> Event expansion: fifteen authored events now replace the original three-event
> prototype pool across all six outposts. Hazards, science opportunities, and
> recovery share the existing weekly decision system. Two further cargo types
> support sealing and field science; optional research data is shown in the
> mission and debrief. Selection prioritizes unseen eligible events before
> repeating them. See `events.md` for sources and fictional balancing boundaries.
> Later references to three events describe the original implementation stages.

> Research objectives update: each outpost now has explicit sample, seismic, or
> instrument targets. Successful event actions and planned research tasks earn
> progress; science is assessed separately from the four survival endings. Planned
> work now runs through independent one-week crew assignments alongside incident
> response. Each astronaut has one main job. See `assignments.md` and `research.md`.

> Project lifecycle update: seismic assignments now deploy sensors, record for
> three powered weeks without occupying crew, and finish with crew analysis.
> Pauses and interruptions retain progress. See `projects.md`; other research
> assignments still take one week, and science remains separate from survival.

> Energy update: weekly sunlight now follows a sourced lunar solar period and
> cached site longitudes, with a fictional shared epoch and smooth-horizon model.
> Batteries have fixed capacities; players prioritize life support or recording.
> See `energy.md` for source boundaries and current generation/turn-order rules.

> Life-support update: powered wastewater recovery feeds the clean-water stock,
> and powered oxygen generation consumes water up to a crew reserve target. CO2
> removal has its own condition and persistent burden; crew can maintain both new
> processors. See `life-support.md` for the NASA inspiration and fictional rules.

> Crew-condition update: health remains an overall summary, with separate cumulative
> nutrition and hydration deficits based on actual delivered provisions. Deficits
> affect performance and restrict light/strenuous/EVA workloads for leads, support,
> and assignments. Full provisions and optional one-week rest provide gradual
> recovery. See `health.md` for current rules; older flat ration penalties and
> no-automatic-healing assumptions below are superseded. Illness, fatigue, and
> medical assignments remain future work.

> Medical update: named sprains, wounds, dust irritation, and gastrointestinal
> illness now persist across turns. Care reserves a caregiver and patient;
> self-care supports solo crews. Stabilization precedes supported recovery,
> restrictions interrupt unfit work, and completed research phases remain intact.
> See `medicine.md`. The older exclusions of illnesses and medical assignments
> below are superseded; fatigue and daily emergency timing remain future work.

> Moon-screen update: mission selection now uses a large interactive Moon,
> a space backdrop, named markers, and one compact selected-mission card. The
> header/footer and left directory are removed. Optional details retain factual
> history and system values; previous/next controls support every mission and
> the non-3D fallback. The easiest mission is recommended without changing its
> backend rules. Phone and laptop layouts share the same selection flow.

> Crew-screen update: a dedicated visual roster now follows mission selection.
> Original SVG portraits, role badges, a full-body preview, explicit seat swaps,
> and selected checks replace the preparation dropdowns. The roster retains
> catalog traits, ration costs, crew limits, and mission minimums. Supplies receive
> the selected IDs in slot order. See `crew-and-equipment.md` for routing, draft
> preservation, SVG pose/expression inputs, and future gameplay integration.

> Expanded-roster update: sixteen fictional profiles (four per profession) now
> appear in a 4-by-4 desktop grid, with responsive internal scrolling. Six new
> specialists use existing modifiers; the launch limit stays four. Adult-proportion
> SVGs share one suit/head/limb rig with explicit clipping and pose layering. See
> `crew-and-equipment.md`; existing crew IDs, default team, and mechanics remain.

> Supplies-screen update: `/prepare/` now uses a game-style cargo bay, original
> SVG item illustrations, category filters, a compact crew/manifest view, and
> persistent weight/space/launch controls. Item facts, mission objectives, outpost
> systems, power forecasts, and replay settings open on demand. Drafts survive
> refresh and crew changes. Catalog/API/simulation values are unchanged; see
> `supplies.md` for current presentation and validation behavior.

> Station-screen update: the room is the game board. Large incidents show all
> responses together; portrait-led crew panels expose concrete jobs and meals.
> Feeding is independent of work. Next Week either names missing decisions or
> submits one atomic request directly. Flexible panels replace notebook pages;
> the computer groups systems/research and reports separate survival/science.
> Confirmed jobs and exact pending requests persist across refreshes. See
> `station-gameplay.md` for interaction, accessibility and recovery behavior.

> Visible-station update: the room now uses shared indoor clothing, activity poses,
> paired care/recovery staging. Incident duty and EVA crew leave the common-room
> view; the airlock duty list supports inspection. Bounded
> supply artwork and battery fill use confirmed stock; seismic indicators use
> actual project phase/progress. Draft positions are explicitly previews, unknown
> submissions remain pending, and confirmed receipts label completed/failed or
> interrupted work. This does not introduce real-time work, extra occupancy limits,
> resource calculations, or new medical mechanics. See `station-gameplay.md`.

**Project name:** LAST OUTPOST  
**Subtitle:** Lunar Survival  
**Genre:** Turn-based survival, strategy, resource management, decision-making  
**Platform:** Web application  
**Backend:** Python, FastAPI  
**Frontend:** React, TypeScript, Vite  
**Styling:** CSS Modules or regular CSS  
**Testing:** Pytest for backend, Vitest for frontend  
**Inspiration:** 60 Seconds! and 60 Seconds! Reatomized  
**Project context:** NASA Space Apps Challenge 2026 — Junior Astronaut Mission Trainer

### Main Concept

LAST OUTPOST is a single-player, browser-based survival strategy game set on the Moon.

Humanity has established several fictional research stations on the lunar surface. These stations are operated by rotating astronaut crews who must manage limited resources, maintain life-support systems, and respond to unexpected emergencies.

The player commands an incoming crew assigned to one of these stations.

Before departure, the player must select a station, choose astronauts, and pack supplies within the spacecraft's cargo mass and volume limits.

After arriving at the station, the previous crew departs on the arriving spacecraft. The new crew must survive until the next scheduled crew rotation.

During the mission, players distribute food and water, manage oxygen and electricity, respond to random events, and make decisions that can save or endanger their astronauts.

Some decisions require astronauts to leave the station to perform dangerous tasks.

Every action has consequences. Repairing equipment may save electricity but consume valuable supplies. Bringing more astronauts provides useful specializations but increases resource consumption. Saving food or water today may create health problems later.

The central gameplay principle is:

**Every advantage comes with a cost, and every decision can affect the crew's long-term survival.**

The game must combine strategic planning, narrative events, resource management, uncertainty, and multiple endings.

---

# 2. Scope and Development Philosophy

The complete game is planned to contain six fictional lunar stations, each featuring a different mission.

However, development must begin with **one fully functional station and one mission**.

Do not implement all six stations immediately.

### First Playable Version

The initial version should include:

- One lunar station.
- One survival mission.
- Station selection, with only one station initially available.
- Four selectable astronauts initially.
- Ability to select between one and four astronauts in the prototype.
- Architecture supporting up to eight astronauts later.
- Approximately six cargo item types.
- Cargo mass and volume restrictions.
- Weekly survival turns.
- Individual food and water distribution.
- Oxygen and electricity calculations.
- Three initial events.
- Multiple choices for each event.
- Profession-dependent event outcomes.
- Astronaut health, injuries, and death.
- Persistent consequences of decisions.
- Mission success and failure.
- A functional React web interface.
- A Python backend responsible for all gameplay calculations.

### Features Not Needed Initially

Do not implement:

- Mars.
- Real NASA datasets.
- Real lunar coordinates.
- Orbital mechanics or rocket physics.
- Rover simulations.
- Complex lunar maps.
- 3D graphics.
- Multiplayer.
- Authentication.
- AI-generated events.
- Character skill trees.
- Complex crafting.
- Detailed psychological systems.
- Microservices.
- WebSockets.
- A large database architecture.

The objective is to create a small, complete, replayable game with clean architecture.

Use fictional station configurations and simplified gameplay values. Do not present invented numbers as real NASA engineering measurements.

---

# 3. Game Story

The game takes place around the year 2045.

Humanity operates six research stations on the Moon.

Each station serves a different purpose, such as scientific research, agriculture, mining, medicine, or experimental engineering.

These facilities depend on periodic supply deliveries and crew rotations.

The player is responsible for an incoming crew arriving at one of the stations.

The incoming spacecraft carries the astronauts and their chosen supplies.

After arrival, the previous crew leaves on that spacecraft.

The station's new crew must operate independently until the next scheduled rotation.

They cannot request unlimited supplies or immediate evacuation.

The player must manage the available resources, keep the astronauts healthy, handle equipment failures, and respond to unexpected situations.

The main objective is to keep the crew alive until the replacement crew arrives.

The final condition of the station and astronauts determines the outcome.

---

# 4. Gameplay Structure

The game consists of three phases:

1. Mission preparation.
2. Station survival.
3. Mission results.

## Phase 1 — Mission Preparation

The player must make three decisions before starting a mission.

### 4.1 Choose a Station

The game eventually features six lunar stations.

Each station has:

- A unique name.
- A description.
- An assigned mission.
- Starting resources.
- Electricity generation.
- Oxygen generation.
- Different environmental or technical challenges.

Initially, only Station Alpha should be playable.

Other stations may be displayed as locked or coming soon, but they must not be implemented before the first station is complete.

### 4.2 Choose Crew Members

The player selects astronauts from a collection of available characters.

The full game should support a maximum crew size of eight.

The initial prototype can offer four astronauts.

Each astronaut has:

- Name.
- Profession.
- Health.
- Positive trait.
- Negative trait.

Possible professions include:

- Engineer.
- Medic.
- Scientist.
- Botanist.
- Technician.
- Communications specialist.
- Geologist.
- Generalist.

Professions and traits should influence gameplay.

For example:

**Engineer:** Higher chance of successfully repairing equipment.

**Medic:** Better outcomes during medical emergencies.

**Botanist:** Advantage during food-production events.

**Scientist:** Better outcomes in research-related events.

A larger crew:

- Consumes more food.
- Consumes more water.
- Consumes more oxygen.
- Provides more specializations.
- Can unlock certain decisions.
- May improve event outcomes.

A smaller crew:

- Consumes fewer resources.
- Is easier to keep alive.
- Has fewer available skills.
- Has less redundancy when someone becomes injured or dies.

The game should be balanced so that taking only one astronaut is not always the optimal strategy.

Some events may require a certain profession or multiple living astronauts.

Do not add complex skill trees or unnecessary numeric attributes initially.

### 4.3 Choose Cargo

The player selects supplies and equipment to bring to the Moon.

The spacecraft has two independent cargo limitations:

1. Maximum cargo mass in kilograms.
2. Maximum cargo volume in litres.

Both limits must be respected.

For each item:

- Total mass = item mass × quantity.
- Total volume = item volume × quantity.

The cargo selection screen should display:

- Available items.
- Selected quantities.
- Mass per item.
- Volume per item.
- Total cargo mass.
- Maximum cargo mass.
- Total cargo volume.
- Maximum cargo volume.
- Whether the loadout is valid.

Possible cargo items:

| Item | Purpose |
|---|---|
| Food packs | Feed astronauts |
| Water containers | Supply water |
| Medicine kits | Treat illnesses and injuries |
| Repair kits | Repair equipment |
| EVA battery packs | Support outside-station activities |
| Emergency oxygen tanks | Supply additional oxygen |

Weights, volumes, and initial quantities should be configurable fictional gameplay values.

The spacecraft does not need its own class.

Do not implement fuel calculations or rocket physics.

The selected cargo is added to the resources already available at the station.

Crew capacity and cargo capacity should be treated separately in the initial version.

The player cannot start the mission if the crew limit, cargo mass limit, or cargo volume limit is exceeded.

---

# 5. Phase 2 — Station Survival

This is the central gameplay phase.

The player manages the station until the next crew rotation.

The gameplay is inspired by the narrative decision-making and rationing mechanics of 60 Seconds!, but must use original characters, artwork, storylines, and interface design.

## 5.1 Mission Duration

Do not create one turn for every individual day.

Instead:

**One gameplay turn represents one Earth week.**

For Station Alpha:

- Mission duration: 84 Earth days.
- Gameplay duration: 12 turns.
- One major event per turn.

The UI should display progress such as:

**Week 4 / 12 — Mission Days 22–28**

Different stations can have different mission durations.

The weekly system makes longer missions manageable without requiring dozens of repetitive turns.

## 5.2 Weekly Gameplay Loop

Every week consists of the following steps.

### Step 1 — Weekly Report

Display:

- Current week.
- Weeks remaining.
- Living astronauts.
- Astronaut health.
- Available resources.
- Solar system efficiency.
- Oxygen system efficiency.
- Previous week's consequences.

### Step 2 — Food and Water Rationing

The player chooses how much food and water each living astronaut receives.

There are three ration levels for each resource.

**Normal ration**
- 100% of normal weekly consumption.
- No ration-related health penalty.

**Reduced ration**
- Approximately 70% of normal consumption.
- Small health penalty or shortage consequence.

**Emergency ration**
- Approximately 40% of normal consumption.
- Significant health penalty, especially when repeated.

Food and water rationing are independent.

An astronaut can receive normal food and reduced water, for example.

The interface should support:

- Individual ration selection.
- Display of resource costs.
- Total weekly food requirement.
- Total weekly water requirement.
- Applying a ration level to all astronauts.

The engine must validate resource availability.

Resources must never become negative.

Repeated rationing should have meaningful consequences.

Use simplified and configurable gameplay values rather than claiming medical realism.

### Step 3 — Weekly Event

The player receives one event.

Events can include:

- Solar panel failures.
- Oxygen generator problems.
- Astronaut illness.
- Medical emergencies.
- Radiation hazards.
- Communication problems.
- Equipment failures.
- Supply discoveries.
- Scientific opportunities.
- Dangerous external repair tasks.

Each event offers approximately two to four choices.

Possible requirements include:

- Medicine.
- Repair kits.
- EVA battery packs.
- Emergency oxygen.
- A living astronaut.
- A particular profession.
- Multiple available astronauts.

Unavailable choices should show why they cannot be selected.

### Step 4 — Event Decision

The player selects a response.

Some outcomes are guaranteed.

Others depend on a probability calculation.

Profession bonuses, equipment, and persistent station conditions may influence outcomes.

The backend must calculate the result.

The frontend must never decide whether an event succeeds or fails.

### Step 5 — Weekly Resource Simulation

The game calculates:

- Food consumption.
- Water consumption.
- Oxygen consumption.
- Electricity generation.
- Electricity consumption.
- Oxygen generation.
- Event costs.
- Equipment efficiency changes.
- Health changes.

The engine must define a consistent order for these calculations.

### Step 6 — Survival Check

Check whether:

- The crew survives.
- A catastrophic station failure occurs.
- The mission reaches its final week.

If the mission continues, advance to the next week.

Otherwise, display the results screen.

---

# 6. Survival Resources

The main survival resources are:

1. Food.
2. Water.
3. Oxygen.
4. Electricity.

Additional supplies include medicine, repair kits, and EVA batteries.

## 6.1 Food

Every living astronaut consumes food each week.

The player controls individual food rations.

Insufficient food reduces health.

More astronauts require more food.

Initially, food cannot be produced at Station Alpha.

Food production can be introduced later for the agricultural station.

## 6.2 Water

Every living astronaut consumes water each week.

The player controls individual water rations.

Insufficient water reduces health.

Water shortages should generally have more serious consequences than food shortages.

Water recycling is not necessary in the first implementation.

## 6.3 Oxygen

Living astronauts consume oxygen automatically each week.

The player does not distribute oxygen individually.

The station produces oxygen through its life-support equipment.

Oxygen production depends on:

- Available electricity.
- Oxygen system efficiency.

Events may damage the oxygen system.

Emergency oxygen tanks can increase oxygen reserves.

Insufficient oxygen causes serious health consequences.

## 6.4 Electricity

The station generates electricity through solar equipment.

Electricity is stored in batteries.

The station consumes electricity to support life-support operations.

Solar efficiency influences electricity production.

When electricity becomes insufficient, oxygen generation is reduced.

Important gameplay dependency:

**Damaged solar panels → Reduced electricity → Reduced oxygen production → Crew survival risk**

This connection should be clearly represented in the UI.

Do not implement a detailed electricity distribution system initially.

## 6.5 System Efficiency

Track two simplified efficiency values:

- `solar_efficiency`: 0.0–1.0.
- `oxygen_efficiency`: 0.0–1.0.

These values represent the condition and performance of the station's systems.

Events can reduce or restore them.

Efficiency changes persist across weeks.

For example, solar panels damaged during Week 3 may continue producing less electricity until repaired.

---

# 7. Astronaut Health and Death

Each astronaut has a health value between 0 and 100.

Health may decrease because of:

- Food shortages.
- Water shortages.
- Oxygen shortages.
- Illness.
- Radiation events.
- Injuries.
- Dangerous decisions.

Health may improve through suitable medical events and treatment.

An astronaut dies when health reaches zero.

Dead astronauts:

- Do not consume resources.
- Cannot participate in events.
- Cannot provide profession bonuses.
- Cannot receive rations.
- Remain listed in the final mission report.

Do not initially implement stress, morale, fatigue, or complex injury statuses.

Health and event outcomes are sufficient for the first version.

Risky decisions should provide the player with useful information about the danger involved.

---

# 8. External Activities

Some events involve astronauts leaving the station.

These activities are called EVAs.

Examples include:

- Repairing solar panels.
- Inspecting communication equipment.
- Recovering emergency supplies.
- Repairing external systems.
- Collecting scientific samples.

Do not create a physical lunar map or travel simulator.

An EVA is represented as an event choice.

The player selects:

- An astronaut.
- An available action.
- Any required equipment.

The event may consume oxygen, EVA battery packs, or repair supplies.

Possible outcomes:

- Success.
- Failure.
- Injury.
- Equipment loss.
- Resource discovery.
- Death in a severe accident.

Resolve EVAs within the same weekly turn.

Do not create separate EVA, Rover, Route, or OutsideSite classes initially.

---

# 9. Random Event System

Events are predefined in JSON.

Do not use AI-generated events.

Each event contains:

- ID.
- Title.
- Description.
- Choices.
- Relative probability weight.
- Earliest eligible week.

Each choice contains:

- ID.
- Display text.
- Resource costs.
- Required items.
- Whether an astronaut must be selected.
- Role-based bonuses.
- Base success probability.
- Success effects.
- Failure effects.

Use a seeded random number generator so events and outcomes can be reproduced.

Avoid unnecessary repetition of events.

Because the initial prototype has only three events for a twelve-week mission, allow appropriately spaced repetition or use a neutral "quiet week" event when no other event is eligible.

Once the event collection grows, prioritize variety.

### Example Event: Solar Panel Failure

A solar panel stops working properly.

Available decisions:

**Option A — Send an engineer**
- Requires an engineer and EVA supplies.
- Consumes a repair kit.
- High probability of success.
- Possible injury.

**Option B — Send another astronaut**
- Similar costs.
- Lower success probability.
- Potentially greater danger.

**Option C — Ignore the problem**
- No immediate resource cost.
- Electricity production remains reduced.
- Future oxygen production may be affected.

Consequences should persist in the game state.

---

# 10. Victory and Defeat

The mission ends when the rotation deadline is reached or the crew can no longer survive.

Possible endings:

### Perfect Handover

- The mission reaches its final week.
- All astronauts survive.
- Essential station systems are operational.
- Resources and equipment remain in good condition.

### Successful Handover

- The mission reaches its final week.
- The required number of astronauts survives.
- The station remains sufficiently operational.

### Emergency Handover

- At least one astronaut survives until relief arrives.
- The station is badly damaged or critically low on supplies.

### Mission Failure

- All astronauts die before the scheduled rotation.
- Or a clearly defined catastrophic failure makes the station uninhabitable.

The result screen should display:

- Mission name.
- Weeks survived.
- Initial crew size.
- Surviving astronauts.
- Deceased astronauts.
- Remaining resources.
- Final station efficiency.
- Important events and decisions.
- Ending achieved.

A numerical score is optional.

---

# 11. Planned Lunar Stations

Eventually, the game should contain six fictional stations.

| Station | Mission duration | Main challenge |
|---|---|---|
| Alpha — Research Base | 12 weeks | Balanced resource management and technical failures |
| Beta — Polar Base | 10 weeks | Electricity shortages |
| Gamma — Agricultural Base | 14 weeks | Food and water management |
| Delta — Mining Base | 12 weeks | Dangerous repairs and equipment failures |
| Epsilon — Medical Base | 16 weeks | Illnesses and medical supply shortages |
| Zeta — Experimental Base | 18 weeks | Unreliable life-support systems |

All stations should use the same underlying engine.

They differ through configuration, event pools, and starting conditions.

Only implement Station Alpha initially.

---

# 12. Technical Architecture

The application consists of two separate parts:

**Backend — Python + FastAPI**

Responsible for:

- Game rules.
- Data models.
- Mission initialization.
- Crew and cargo validation.
- Random event selection.
- Event outcomes.
- Resource calculations.
- Astronaut health.
- Weekly progression.
- Win/loss conditions.
- Game state storage.
- REST API.

**Frontend — React + TypeScript + Vite**

Responsible for:

- Rendering the interface.
- Displaying stations.
- Crew selection.
- Cargo selection.
- Ration controls.
- Event choices.
- Resource indicators.
- Mission progress.
- Results.
- Communicating with FastAPI.

Communication must use a REST API over HTTP with JSON.

Do not use WebSockets initially.

The Python backend is authoritative.

**React sends player decisions. FastAPI validates and processes them. React displays the returned state.**

Do not duplicate resource calculations, survival rules, or event probabilities in the frontend.

---

# 13. Complete Project Structure

The repository must use two main directories at the root:

- `backend/`
- `frontend/`

Shared repository files such as `README.md` and `.gitignore` may remain at the root.

Use the following structure:

```text
last-outpost/
│
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   │
│   │   ├── api/
│   │   │   ├── __init__.py
│   │   │   ├── routes.py
│   │   │   └── schemas.py
│   │   │
│   │   ├── game/
│   │   │   ├── __init__.py
│   │   │   ├── models.py
│   │   │   ├── engine.py
│   │   │   ├── survival.py
│   │   │   ├── events.py
│   │   │   ├── rules.py
│   │   │   └── loader.py
│   │   │
│   │   └── storage.py
│   │
│   ├── data/
│   │   ├── stations.json
│   │   ├── missions.json
│   │   ├── crew.json
│   │   ├── items.json
│   │   └── events.json
│   │
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_setup.py
│   │   ├── test_survival.py
│   │   ├── test_events.py
│   │   ├── test_mission.py
│   │   └── test_api.py
│   │
│   ├── pyproject.toml
│   └── .env.example
│
├── frontend/
│   ├── public/
│   │   └── images/
│   │
│   ├── src/
│   │   ├── api/
│   │   │   ├── client.ts
│   │   │   └── game.ts
│   │   │
│   │   ├── types/
│   │   │   └── game.ts
│   │   │
│   │   ├── pages/
│   │   │   ├── SetupPage.tsx
│   │   │   ├── GamePage.tsx
│   │   │   └── ResultsPage.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── Layout.tsx
│   │   │   ├── StationCard.tsx
│   │   │   ├── CrewCard.tsx
│   │   │   ├── CargoSelector.tsx
│   │   │   ├── ResourcePanel.tsx
│   │   │   ├── RationControls.tsx
│   │   │   ├── EventCard.tsx
│   │   │   └── MissionJournal.tsx
│   │   │
│   │   ├── styles/
│   │   │   └── global.css
│   │   │
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── .env.example
│
├── .gitignore
└── README.md
```

Do not create additional folders or abstraction layers without a concrete need.

---

# 14. Backend File Responsibilities

## `backend/app/main.py`

FastAPI application entry point.

Responsible for:

- Creating the FastAPI application.
- Registering API routes.
- Configuring CORS for the React development server.
- Initializing game definitions.
- Starting the application.

Do not put gameplay calculations here.

## `backend/app/api/routes.py`

Contains REST endpoints.

Routes should validate HTTP input, call the game engine or storage layer, and return JSON responses.

Do not implement resource calculations directly inside endpoints.

## `backend/app/api/schemas.py`

Contains Pydantic models for API requests and responses.

Examples:

- Create game request.
- Crew selection.
- Cargo selection.
- Weekly ration selections.
- Event decision.
- Turn submission.
- Game state response.
- API error response.

These models define the HTTP contract.

They are separate from internal game-domain models.

Keep them small and avoid unnecessary duplication.

## `backend/app/game/models.py`

Contains the core data classes:

- `Station`
- `Mission`
- `CrewMember`
- `Item`
- `Event`
- `EventChoice`
- `GameState`

## `backend/app/game/engine.py`

Contains the `GameEngine` class.

Responsible for:

- Creating new missions.
- Validating player selections.
- Managing the game state.
- Processing weekly decisions.
- Updating mission progress.
- Detecting mission completion.

## `backend/app/game/survival.py`

Contains pure functions for:

- Food consumption.
- Water consumption.
- Oxygen consumption.
- Electricity generation.
- Electricity use.
- Oxygen generation.
- Health consequences.
- Resource shortages.

These functions should be independently testable.

## `backend/app/game/events.py`

Contains functions for:

- Filtering eligible events.
- Weighted random event selection.
- Validating event requirements.
- Calculating success probabilities.
- Applying choice outcomes.
- Resolving astronaut-related effects.

## `backend/app/game/rules.py`

Contains gameplay balancing constants:

- Maximum crew size.
- Maximum cargo mass.
- Maximum cargo volume.
- Weekly food requirements.
- Weekly water requirements.
- Weekly oxygen requirements.
- Ration multipliers.
- Ration health penalties.
- Electricity requirements.
- Other shared gameplay limits.

Use configurable values rather than scattering unexplained numbers across the engine.

## `backend/app/game/loader.py`

Loads JSON game definitions.

Responsibilities:

- Read JSON files.
- Validate required fields.
- Check for duplicate IDs.
- Verify references between missions, stations, items, and events.
- Create internal game definitions.
- Report invalid configuration clearly.

Original definitions must not be modified during gameplay.

## `backend/app/storage.py`

Provides a minimal way to store active games.

Initially, an in-memory dictionary keyed by a random game ID is sufficient for local development.

Each game has an independent `GameState`.

This initial implementation has limitations:

- Restarting the server loses active games.
- Multiple backend workers cannot safely share the same in-memory state.

These limitations are acceptable for the first prototype.

SQLite-based persistence can be added later, before public deployment if reliable saves are required.

Do not implement authentication or a complex database architecture now.

---

# 15. Backend Class Specifications

Use Python dataclasses or similarly lightweight models for game-domain data.

## `Station`

Parameters:

- `id: str`
- `name: str`
- `description: str`
- `mission_id: str`
- `starting_resources: dict`
- `energy_per_week: float`
- `oxygen_per_week: float`

Represents the definition of a lunar station.

## `Mission`

Parameters:

- `id: str`
- `name: str`
- `description: str`
- `duration_weeks: int`
- `event_ids: list[str]`
- `minimum_survivors: int`

Defines the mission's duration and success requirements.

## `CrewMember`

Parameters:

- `id: str`
- `name: str`
- `role: str`
- `health: int`
- `positive_trait: str`
- `negative_trait: str`

Represents an astronaut.

Health is mutable during gameplay.

## `Item`

Parameters:

- `id: str`
- `name: str`
- `description: str`
- `weight_kg: float`
- `volume_l: float`
- `unit: str`
- `category: str`

Represents an item type.

Quantities belong to the game state, not the item definition.

## `Event`

Parameters:

- `id: str`
- `title: str`
- `description: str`
- `choices: list[EventChoice]`
- `weight: float`
- `min_week: int`

Represents a narrative event.

## `EventChoice`

Parameters:

- `id: str`
- `text: str`
- `costs: dict`
- `required_items: dict`
- `requires_crew: bool`
- `role_bonus: dict`
- `success_chance: float`
- `success_effects: dict`
- `failure_effects: dict`

Represents a possible response.

Use a predefined, validated format for effects.

Do not evaluate arbitrary Python code or expressions from JSON.

## `GameState`

Parameters:

- `station_id: str`
- `mission_id: str`
- `current_week: int`
- `crew: list[CrewMember]`
- `resources: dict`
- `solar_efficiency: float`
- `oxygen_efficiency: float`
- `current_event_id: str | None`
- `used_event_ids: list[str]`
- `flags: dict`
- `history: list[dict]`
- `status: str`
- `random_seed: int`

Stores all mutable data for one playthrough.

`random_seed` makes gameplay outcomes reproducible.

Any additional fields for safely tracking turn progress should be kept minimal.

## `GameEngine`

Suggested methods:

- `create_game(...)`
- `calculate_cargo(...)`
- `get_event(...)`
- `validate_choice(...)`
- `resolve_choice(...)`
- `apply_rations(...)`
- `advance_week(...)`
- `check_game_over(...)`

The engine owns authoritative game-state changes.

---

# 16. REST API Design

Use JSON over HTTP.

All API endpoints should use the `/api` prefix.

## `GET /api/catalog`

Returns the definitions needed for mission preparation:

- Available stations.
- Missions.
- Available crew members.
- Cargo items.
- Cargo mass and volume limits.
- Crew limits.

The frontend uses this endpoint to populate the setup screen.

Do not duplicate item definitions or station configurations in TypeScript.

## `POST /api/games`

Creates a new game.

Request includes:

- `station_id`
- `crew_ids`
- `cargo` — dictionary of item IDs and quantities.

Backend responsibilities:

1. Validate station.
2. Validate selected crew members.
3. Validate crew count.
4. Validate cargo quantities.
5. Calculate cargo mass and volume.
6. Ensure both cargo limits are respected.
7. Initialize station resources.
8. Add selected cargo.
9. Initialize astronaut health.
10. Create the first week's event.
11. Store the game state.
12. Return the new game ID and initial state.

## `GET /api/games/{game_id}`

Returns the current game state.

The response should include everything needed to render the gameplay screen:

- Current week.
- Mission duration.
- Astronauts.
- Resources.
- System efficiency.
- Current event and available choices.
- Mission history.
- Game status.

The frontend must not need to reconstruct game rules from partial information.

## `POST /api/games/{game_id}/turn`

Submits one complete weekly decision.

The request includes:

- `expected_week`
- `request_id`
- `rations`
- `event_choice_id`
- `selected_crew_id` when needed.

Rations should be represented as a mapping of astronaut ID to food and water ration levels.

Example conceptual structure:

- Astronaut Alex: normal food, reduced water.
- Astronaut Maya: reduced food, normal water.
- Event choice: repair solar panel.
- Selected astronaut: Alex.

Backend responsibilities:

1. Verify the game exists.
2. Verify the mission is running.
3. Verify the submitted week matches the current week.
4. Validate all ration allocations.
5. Validate the event choice.
6. Validate selected astronaut and required items.
7. Verify sufficient resources.
8. Resolve the event outcome.
9. Calculate weekly survival changes.
10. Update astronaut health.
11. Check victory or defeat.
12. Add a journal entry.
13. Advance the week if appropriate.
14. Prepare the next event if the game continues.
15. Return the updated state and turn outcome.

The `request_id` should prevent a repeated HTTP request from charging resources or advancing the week twice.

The turn must be processed atomically.

If validation fails, do not partially modify the game state.

Return an appropriate HTTP error with a readable explanation.

## Error Handling

Use standard HTTP status codes where appropriate.

Examples:

- `400` or `422`: Invalid input or resource allocation.
- `404`: Game or station not found.
- `409`: Outdated turn submission or duplicate/conflicting action.
- `500`: Unexpected server error.

The frontend should display useful validation messages without exposing internal tracebacks.

---

# 17. Frontend Architecture

Use:

- React.
- TypeScript.
- Vite.
- React Router.
- Native Fetch API.
- CSS Modules or regular CSS.

Avoid Redux or other complex state-management libraries initially.

React component state is sufficient for local form selections.

The backend remains the source of truth for the actual game state.

## `frontend/src/main.tsx`

React application entry point.

Mounts the application.

## `frontend/src/App.tsx`

Defines the application routes.

Current routes:

- `/` — Title menu: Play / Load.
- `/moon/` — Lunar mission selection.
- `/crew/` — Visual crew selection (legacy root station queries redirect here).
- `/prepare/` — Supplies and launch, with the selected crew summary.
- `/game/:gameId` — Active gameplay.
- `/results/:gameId` — Mission results.

## `frontend/src/api/client.ts`

Central HTTP client.

Responsible for:

- API base URL.
- HTTP requests.
- JSON parsing.
- HTTP error handling.

## `frontend/src/api/game.ts`

Contains typed functions for game API operations:

- Fetch catalog.
- Create game.
- Fetch game state.
- Submit weekly turn.

Components should call these functions rather than building HTTP requests themselves.

## `frontend/src/types/game.ts`

Contains TypeScript interfaces for API data.

Examples:

- `Station`
- `Mission`
- `CrewMember`
- `Item`
- `GameState`
- `GameEvent`
- `EventChoice`
- `CreateGameRequest`
- `SubmitTurnRequest`

These types must match the backend API responses.

Avoid maintaining a separate frontend copy of game logic.

## `frontend/src/pages/SetupPage.tsx`

Mission preparation page.

Contains:

- Station selection.
- Mission briefing.
- Crew selection.
- Cargo quantity selection.
- Cargo mass indicator.
- Cargo volume indicator.
- Start mission button.

Use local React state for selections before game creation.

The frontend can calculate an estimated cargo total for immediate UI feedback, but the backend must validate the authoritative result.

## `frontend/src/pages/GamePage.tsx`

Main survival page.

Responsibilities:

- Fetch current game state.
- Show current week.
- Display crew and resources.
- Display current event.
- Allow ration selection.
- Allow event choice selection.
- Submit the complete weekly turn.
- Show outcomes.
- Update UI from the returned server state.
- Navigate to results when the mission finishes.

Do not implement survival calculations in React.

## `frontend/src/pages/ResultsPage.tsx`

Mission results page.

Displays:

- Ending.
- Weeks survived.
- Living astronauts.
- Dead astronauts.
- Remaining resources.
- Station efficiency.
- Important decisions.
- Restart option.

## Reusable Components

### `Layout.tsx`

Shared application layout, header, navigation, background, and general page structure.

### `StationCard.tsx`

Displays a station's name, description, mission, and availability.

### `CrewCard.tsx`

Displays an astronaut's name, role, traits, health, and selection state.

### `CargoSelector.tsx`

Displays cargo items, quantities, mass, volume, and capacity indicators.

### `ResourcePanel.tsx`

Displays food, water, oxygen, electricity, and other supply levels.

### `RationControls.tsx`

Allows the player to assign food and water rations to each living astronaut.

### `EventCard.tsx`

Displays the current event, choices, requirements, selected astronaut, risk information, and outcome.

### `MissionJournal.tsx`

Displays weekly events, previous decisions, resource changes, and significant crew developments.

## Styling

Use an original visual identity.

Suggested direction:

- Dark lunar station atmosphere.
- Deep navy and charcoal backgrounds.
- Muted orange highlights.
- Clean typography.
- Astronaut portraits.
- Clear resource indicators.
- Narrative event cards.
- Simple transitions.
- Responsive design.

Avoid a generic administration dashboard appearance.

The interface should feel like a survival game.

It must remain usable on desktop and mobile-sized browsers, although desktop can be prioritized for the initial prototype.

---

# 18. Frontend and Backend State Management

The frontend and backend have different responsibilities.

### Backend State

The backend stores:

- Current week.
- Crew health.
- Available resources.
- Station efficiency.
- Current event.
- Previous events.
- Mission progress.
- Game status.

### Frontend State

React temporarily stores:

- Selected crew during preparation.
- Cargo quantities during preparation.
- Selected ration levels for the current week.
- Selected event choice.
- Selected astronaut for the event.
- Loading indicators.
- Error messages.
- UI panel visibility.

After submitting a turn, React receives the updated `GameState` from the backend.

The UI should render from this returned state.

Do not independently subtract resources or change health values in React.

### Example Interaction

The player selects:

- Alex: normal food, reduced water.
- Maya: reduced food, normal water.
- Event choice: repair solar panel.
- Selected astronaut: Alex.

React sends one request to FastAPI.

FastAPI:

1. Validates the decision.
2. Checks available resources.
3. Calculates the event result.
4. Applies resource consumption.
5. Updates health and solar efficiency.
6. Advances the mission.
7. Returns the new game state.

React then displays the result.

This separation is essential.

---

# 19. Game Rules and Turn Consistency

Use a single authoritative weekly turn operation.

At the beginning of a week, the backend selects the event that will be displayed.

The player may edit ration selections and event choices locally until submitting the turn.

When submitting:

1. Validate the complete request.
2. Work on a temporary copy of the game state or use an equivalent atomic update approach.
3. Resolve the selected event exactly once.
4. Apply costs exactly once.
5. Calculate weekly resources.
6. Update astronaut health.
7. Check end conditions.
8. Store the result.
9. Return the updated state.

If any validation fails, keep the original game state unchanged.

The next event must be generated by the backend, not the frontend.

Use deterministic, seeded randomness.

Do not permit the player to submit two different decisions for the same week.

---

# 20. Testing Requirements

## Backend

Use Pytest.

### `test_setup.py`

Test:

- Valid crew selection.
- Exceeding maximum crew size.
- Duplicate astronaut IDs.
- Unknown astronauts.
- Valid cargo loadouts.
- Excess cargo mass.
- Excess cargo volume.
- Negative quantities.
- Starting resources.

### `test_survival.py`

Test:

- Food consumption.
- Water consumption.
- Different ration levels.
- Oxygen consumption.
- Electricity generation.
- Reduced solar efficiency.
- Reduced oxygen efficiency.
- Health penalties.
- Zero-resource situations.
- Astronaut death.
- Preventing negative resources.

### `test_events.py`

Test:

- Event eligibility.
- Event selection.
- Choice requirements.
- Insufficient resources.
- Profession bonuses.
- Success outcomes.
- Failure outcomes.
- Persistent effects.
- Seeded randomness.

### `test_mission.py`

Test:

- Week progression.
- Full twelve-week simulation.
- Successful handover.
- Emergency handover.
- Total crew death.
- Catastrophic station failure.
- Preventing turn advancement after game completion.

### `test_api.py`

Test:

- Catalog endpoint.
- Game creation.
- Game retrieval.
- Turn submission.
- Invalid requests.
- Unknown game IDs.
- Duplicate turn requests.
- Outdated week submissions.

## Frontend

Use Vitest and React Testing Library for essential UI behavior.

Test:

- Crew selection.
- Cargo quantity controls.
- Mass and volume warnings.
- Ration controls.
- Event choice selection.
- Loading states.
- API errors.
- Results display.

Do not overinvest in extensive UI testing before the core gameplay works.

---

# 21. Development Roadmap

Development must be incremental.

Do not attempt to implement every feature simultaneously.

## Stage 1 — Backend Foundation

Create the backend project with FastAPI.

Implement:

- Project configuration.
- Game data classes.
- JSON content loading.
- Station Alpha.
- Four astronaut definitions.
- Six item definitions.
- One mission definition.

Add basic validation and tests.

## Stage 2 — Mission Preparation

Implement:

- Crew selection rules.
- Cargo mass calculation.
- Cargo volume calculation.
- Cargo validation.
- Starting resource initialization.
- Game creation endpoint.

At this stage, the backend should be able to create a valid game without a frontend.

## Stage 3 — Survival Simulation

Implement:

- Weekly food consumption.
- Weekly water consumption.
- Rationing.
- Oxygen consumption.
- Electricity generation and consumption.
- Oxygen generation.
- Health consequences.
- Astronaut death.
- Weekly progression.

Test the complete twelve-week simulation without random events first.

## Stage 4 — Event System

Implement:

- Event loading.
- Event eligibility.
- Weighted random selection.
- Event choices.
- Choice requirements.
- Profession bonuses.
- Success and failure outcomes.
- Persistent event effects.

Start with three events.

## Stage 5 — Complete Backend Gameplay

Implement:

- Complete turn submission.
- Atomic state updates.
- Weekly journal.
- Victory conditions.
- Defeat conditions.
- Game results.
- API error handling.

At this point, the complete game should be playable through API requests.

## Stage 6 — React Frontend

Initialize a React + TypeScript + Vite application.

Implement:

1. API client.
2. TypeScript API types.
3. Mission preparation page.
4. Crew selection.
5. Cargo selection.
6. Gameplay page.
7. Resource indicators.
8. Ration controls.
9. Event choices.
10. Results page.

Connect these components to the FastAPI backend.

## Stage 7 — Content and Balancing

Expand the event collection to approximately 10–15 events.

Test different crew sizes and cargo strategies.

Ensure that:

- Taking more crew members can be beneficial.
- Taking more crew members increases survival costs.
- Tools and medicine are strategically valuable.
- Food and water shortages matter.
- Profession bonuses are useful.
- Event choices have meaningful consequences.
- Winning is possible but not guaranteed.
- Decisions matter more than randomness.

## Stage 8 — Visual Polish

Improve:

- Original UI design.
- Astronaut portraits.
- Station imagery.
- Resource indicators.
- Transitions.
- Event presentation.
- Mission journal.
- Error messages.
- Responsive layout.

Prepare the README and deployment setup.

## Stage 9 — Future Expansion

After Station Alpha is complete:

- Expand the crew roster.
- Support up to eight selected astronauts.
- Add more event types.
- Add the remaining five stations.
- Add different mission durations.
- Add station-specific mechanics.
- Add save/load functionality.
- Add achievements or scoring if useful.

Do not implement these future features prematurely.

---

# 22. Code Quality Requirements

The project should follow professional development practices while staying simple.

### Backend

- Use Python type hints.
- Prefer dataclasses for game models.
- Use Pydantic for API validation.
- Keep route handlers thin.
- Keep game logic independent from FastAPI.
- Prefer pure functions for calculations.
- Use meaningful exceptions and error messages.
- Avoid circular imports.
- Do not overengineer the architecture.
- Use Pytest.
- Use Ruff for linting and formatting.

### Frontend

- Use TypeScript.
- Define types for API data.
- Use functional React components.
- Keep components focused.
- Extract reusable UI components.
- Centralize API calls.
- Handle loading and error states.
- Keep gameplay logic on the backend.
- Use accessible controls.
- Avoid unnecessary state-management libraries.

### General

- Use clear naming conventions.
- Keep configuration separate from logic.
- Avoid hardcoded gameplay values throughout the application.
- Document important decisions.
- Validate all user inputs.
- Prevent invalid game states.
- Make randomness reproducible.
- Keep the project easy to run locally.
- Maintain a clear README.

---

# 23. Local Development

The backend and frontend must run independently during development.

### Backend

Run FastAPI locally, for example on port 8000.

The backend exposes the REST API under `/api`.

Use FastAPI's automatic API documentation for testing endpoints.

### Frontend

Run Vite locally, for example on port 5173.

The React app communicates with FastAPI through the configured API base URL.

Use the frontend environment variable:

`VITE_API_BASE_URL`

Configure backend CORS to allow the local frontend development origin.

Do not hardcode deployment-specific URLs throughout the application.

The README must explain how to install dependencies and run both applications.

---

# 24. Final Design Principles

1. **Preparation must matter.** Crew selection and cargo decisions must influence survival.

2. **Crew size must be a strategic choice.** More astronauts provide useful abilities but consume additional resources.

3. **Resources must interact.** Electricity shortages should affect oxygen production, and oxygen shortages should threaten astronauts.

4. **Events must offer difficult decisions.** Avoid choices where one option is always better.

5. **Consequences must persist.** Damaged equipment or lost resources should affect later weeks.

6. **The player should understand the results.** Explain why supplies were consumed, equipment failed, or astronauts became injured.

7. **Randomness should add tension, not replace strategy.**

8. **Replayability comes from different preparations, events, decisions, and outcomes.**

9. **The backend owns the game rules.** React is the interface, not a second simulation engine.

10. **The architecture should remain lightweight.** Add complexity only when necessary.

11. **Finish one station before expanding.** One polished mission is better than six unfinished stations.

12. **Make the project portfolio-worthy.** Prioritize clean Python, API design, tests, TypeScript, and a polished playable experience.

---

# 25. Immediate Objective

Begin by creating the backend and frontend foundations, but prioritize a working Python simulation before building a complicated interface.

The initial target is:

**Station Alpha — Research Base**

- One 12-week mission.
- Four available astronauts.
- One to four selectable astronauts.
- Six cargo item types.
- Cargo mass and volume limits.
- Weekly food and water rationing.
- Oxygen and electricity simulation.
- Three narrative events.
- Profession-based decision outcomes.
- Astronaut health and death.
- Complete win/loss conditions.
- FastAPI endpoints for game creation and weekly decisions.
- React interface for preparation, gameplay, and results.

The project should remain expandable to six stations and eight crew members without requiring a rewrite.

**The ultimate goal is to create a polished, replayable lunar survival game where the player's preparation, resource management, and decisions determine whether the crew survives until the next rotation.**
