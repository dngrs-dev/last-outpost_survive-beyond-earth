# Full-screen station and field notebook

`/game/:gameId` is a room, with a floating week counter and Next Week button.
There is no dashboard header, sidebar, crew directory, step rail, or page footer.
The shared SVG interior retains curved seating, the table, supplies, medical area,
and workstations. The table now holds the station computer and journal.

## Interaction research and adaptation

[Robot Gentleman's press kit](https://robotgentleman.com/presskit/60SecondsReatomized.htm)
describes shelter survival through supplies, rationing, difficult decisions, and
expeditions. The developer's [official release notes](https://store.steampowered.com/news/posts/?appids=1012880&enddate=1595845514&feed=steam_community_announcements)
also discuss journal character/item icons and absent expedition members. These
support a room and journal as the organizing interface. This game's crew orders,
weekly sequence, and locking rules below are our own adaptation; they are not
claims about every interaction in 60 Seconds!. Its art, text, and code are not used.

[W3C's modal-dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)
and [native-dialog technique](https://www.w3.org/WAI/WCAG22/Techniques/html/H102)
inform focus containment, Escape, inert background content, labels, and focus
restoration. [Objective clarity](https://learn.microsoft.com/en-us/xbox/accessibility/xbox-accessibility-guidelines/109)
informs the short first-week guidance and context-specific next action.

## One week at a time

1. **Read the incident.** A notebook opens automatically at the beginning of an
   unplanned week. Read the briefing, browse one response per page, select the
   required lead/support, and inspect costs and possible consequences. Confirming
   locks that response and books its crew for the week. Discovery effects have
   already happened; the response still resolves at End Week.
2. **Give crew orders in the room.** Click a free astronaut, inspect their
   condition, and choose Care, Science, Systems, or Rest. Review one task at a time.
   Medical care selects a living, unbooked patient and an active condition. The
   final confirmation locks the job and all participants. Unassigned crew can stay
   on routine duties/recovery, so the player need not fill every slot manually.
3. **Use objects for information.** The computer opens Energy, Air & water,
   Science, and the crew manifest. Shelves open exact stock. The journal opens
   current orders, past reports, the manifest, and the field guide. The airlock's
   duty list gives access to people away from the common room.
4. **Provisions come last.** Next Week opens one astronaut's rations per page,
   with presets for all living crew. Costs/outlooks are backend-provided values.
   Confirming the entire week's food and water closes remaining orders; all
   unassigned people retain routine duties/recovery. A final notebook check shows
   spending and participants, then End Week submits everything together.
5. **Read confirmed results.** The notebook separates incident results, survival,
   science, crew work, medical recovery, power/air accounting, and next discovery
   effects. Continue opens the next week's incident; mission endings lead to the
   existing final results route. The player can read further pages or continue
   without having to inspect every detailed report.

Inspection is possible before choosing a response, but crew orders require a
confirmed incident. Escape closes a notebook without committing a draft. Choice,
crew, and ration selections become binding only through their labelled Confirm
button. Once confirmed, ordinary play offers no change/undo button for that week.
Power priority and project controls likewise have explicit, once-per-week
confirmation. They default to the current policy/continuation if left alone.

## Availability and visible activities

`stationPresentation.ts` maps orders and API eligibility to visual descriptors;
`stationLayout.ts` provides staging anchors. Neither simulates outcomes or charges.

- Incident participants leave the common-room view. EVA assignment workers also
  disappear rather than leaving a duplicate body or surface-preview avatar.
  The duty list distinguishes them through their committed order; absence from
  the common room does not invent extra travel time or a new mortality mechanic.
- Indoor work remains visible at a desk. Busy astronauts remain inspectable, but
  their notebook has no assignment controls. There is no workstation-capacity
  rule: several abstract weekly jobs can use the retained science kit.
- Caregiver and patient appear together. Serious/critical or urgent patients use
  a cot; lighter cases use a medical chair. Both are booked. Self-care uses one
  person. Existing patient-targeted incident responses retain their original
  single-patient occupancy instead of silently adding a caregiver.
- Shared cabin clothing, heads, role accents, tools/tablets/medical kits, and
  well/tired/unwell expressions reflect existing conditions. Other recovering
  people can recline on the benches without a new medical-bed requirement.
- Confirmed recaps use submitted activity metadata and the returned receipt.
  Cancelled work releases its participants, deceased crew are omitted, and a
  surviving partner never retains a dead body. Jobs do not carry into next week.

Hover or keyboard focus reveals condition, nutrition/hydration, selected rations,
and availability. Escape dismisses the hint. Clicking/tapping opens the persistent
crew notebook, including on touch screens. Deceased crew remain in the manifest
with inspection only, and never appear as available for work.

## Supply and project representation

Food has at most eight fixed-size pouches. Water/oxygen use tank fills relative
to arrival stock, reconstructed from current resources and net history changes.
Medicine and repair stacks show at most three packs; counters retain full totals.
Other consumables/equipment reuse item icons. The scanner and science kit remain
while owned; consumables disappear when depleted. Battery fill uses actual
reported capacity. These are bounded illustrations, not physical packet counts
or measured lunar hardware capacities; Supplies explains the display.

Stocks change only from authoritative reads/receipts, never from selecting an
order. Automatic seismic recording uses no astronaut: Science shows actual phase
progress, costs, retained equipment, messages, and earliest completion estimates.
Pause/interrupt retains work; queued controls cannot be combined with a conflicting
manual assignment. A phase bar represents completed weeks, not elapsed real time.
Only completed analysis or qualifying event actions grant objective credit.

## Atomic submission, persistence, and recovery

`weeklyPlan.ts` owns the small serializable local plan, booking checks, and cost
projections. `useStationMission.ts` owns fetch/submission/reconciliation. All
simulation, eligibility probabilities, survival rules, and rewards stay in Python.
There are no per-step API mutations or new API fields.

Confirmed choices and the exact pending request are saved under
`last-outpost.week-plan.v1.<gameId>` in browser local storage. Refreshes restore
the current week's locks. A saved pending request is recoverable even when the
initial GET already shows a later or completed week. Request IDs and bodies are
reused exactly; an in-flight guard rejects duplicate clicks. A historical replay
receipt cannot replace newer state from another session.

Unknown network/server failures keep all orders locked and offer the exact saved
retry. A 409 refreshes authoritative state. A definite validation rejection does
not advance the week; it retains a rejection notice and offers an explicit
**Rebuild rejected week** action after fetching current state. This is exceptional
recovery for a wholly rejected plan, not an ordinary undo option. Rejection state
also survives refresh. Storage failures fall back to in-memory play; browser
storage is not a durable server save. Backend restart still loses the mission.

Base action costs must fit existing stock before confirmation. Ration confirmation
checks combined spending and preserves the established all-emergency depletion
rule. Future solar generation and uncertain successful work cannot fund action
costs. Medical partners, incident support, routine confirmations, duplicate project
workers, and conflicting pause orders are checked together and again by the backend.

## Pagination, keyboard access, and motion

`NotebookDialog` uses native `dialog.showModal()`, a labelled heading, close button,
focus containment, Escape, and return to the invoking object (or journal if a
dispatched actor disappeared). Page changes use a polite live region. Touch and
keyboard controls use native buttons/selects, visible focus, and useful labels.

Notebook pages replace vertical scrolling: one response/task/patient panel,
one person's rations, three supply rows, one forecast week/objective/project,
or a short piece of report text per page. Detailed consequences are retained in
additional pages. Phone layouts rearrange room staging without stretching crew
art; landscape screens use the same dialogs with compact spacing. Reduced motion
disables interface transitions, and no gameplay depends on animation or timers.

Validation includes UI tests for locking, medical conflicts, combined budgets,
storage corruption, refresh/retry reconciliation, and final routing. Headless
browser checks cover 1440x900, 1280x720, 768x1024, 390x844, 375x667, 320x568, and
844x390, including notebook overflow assertions, a complete eight-week campaign,
medical/unavailable-task pages, native keyboard focus/Escape, and reduced motion.

## Scope

This replaces the former dashboard/four-step rail. It adds no dependencies,
balance changes, fatigue, walking/pathfinding, real-time job execution, or new
death/medical mechanics. The room, clothing, and treatment poses remain fictional
illustrations rather than NASA habitat or clinical specifications.
