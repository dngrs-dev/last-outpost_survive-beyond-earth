# Phased research projects

Seismic research now uses a persistent project. Geological sampling and instrument
restoration remain one-week assignments. Mission science targets, qualifying event
actions, and the four survival endings are unchanged. All durations, costs, chances,
and injury values here are fictional balancing rules; no new NASA datasets or API
calls are required.

## Seismic lifecycle

| Phase | Minimum weeks | Occupied crew | Cost per attempt/week | Advance condition |
|---|---:|---:|---|---|
| Deploy or service sensors | 1 | 1 | 1 EVA pack, 2 oxygen, 2 electricity | Successful assigned work |
| Record seismic activity | 3 | 0 | 2 stored electricity | One powered recording week |
| Analyze recordings | 1 | 1 | 2 electricity | Successful assigned work |

Both manual phases require the retained field science kit. Base success is 75%,
with scientist +20 percentage points and technician +10, plus existing character
traits and probability limits. Failed deployment spends its costs and applies
8 worker injury before traits; failed analysis spends its costs and loses up to
2 additional unreserved power. Failure retains the phase and all earlier work.

Deploying starts a project even when the attempt fails. Retry that project's
deployment instead of creating another project. Only one unfinished seismic
project and one worker per project per week are allowed. Completed projects remain
in the record. Another seismic project can start if the mission still needs work.

Deployment does not record data in the same turn. After deployment, the next three
powered weeks record automatically; the deployment astronaut is free for incident
response or other assignments. Analysis becomes available the following week.
The minimum completion time is therefore five turns, assuming successful work and
adequate power. No assigned astronaut waits outside for the recording period.

## Costs, controls, and interruption

All manual costs participate in the existing atomic combined-budget validation
and supply reservation. They are charged on each attempted manual week, whether
it succeeds or fails. Manual work requires a new explicit weekly crew assignment;
choosing another worker reassigns the phase without erasing prior progress or
charging earlier phases again. `assigned_crew_id` identifies the most recent
manual worker, not a reservation of that astronaut in future weeks.

Automatic recording now shares the [sunlight and battery model](energy.md).
After incident and assignment effects and solar generation, the selected power
priority determines its allocation. Life support receives power first by default;
research-first can reduce oxygen output. A recording week requires a full 2 power.
If the allocation is insufficient, no charge or progress occurs. Pausing recording
conserves power. Newly deployed sensors still begin recording next week.

- **Continue:** automatic recording runs if active. Manual phases await a weekly
  assignment; they do not silently retry or spend supplies.
- **Pause:** retain all completed phases and current recording progress; charge
  no automatic power. Release the recorded worker reference.
- **Interrupt:** stop work and release the worker, retaining progress. It pauses
  the project until resumed or assigned manual work; it does not discard sensors.
- **Resume:** resume automatic work this turn if power is available. A manual
  phase still needs an assigned worker. Assigning paused manual work also resumes it.

Pausing/interruption cannot be combined with a manual assignment to the same
project in one request. Invalid, duplicate, and completed-project controls reject
the entire turn before mutation. Controls for different projects remain independent.

An incident killing a worker before work begins cancels that assignment and
refunds reserved manual supplies under the existing rules. Failed-work deaths
retain the incomplete phase and release the dead worker reference. A survival
death after successful work does not undo the completed phase or recorded science.
Automatic recording does not depend on the original worker staying alive. No
additional mortality or medical mechanics were introduced.

## Progress, rewards, and reporting

Only successful final analysis grants one seismic objective unit and 2 research
data. Deployment and recording grant neither. Existing successful `analyze_seismic`
event responses remain an independent route to objective credit. Final project
credit shares the same turn-wide target cap with all event/assignment gains. If an
event already completed the objective, finishing the project can still earn its
data but cannot increase the objective beyond its target. Completed projects never
charge or reward again.

The state exposes `research_projects` with phase, status, current phase progress,
remaining minimum weeks, crew requirements, per-attempt/week costs, equipment,
messages, and an earliest completion week. Estimates assume uninterrupted power
and successful assigned work; paused projects have no completion estimate. Late
projects are flagged if the estimate exceeds rotation. A completed project's
completion week is fixed. Unfinished work is visible in the final report, alongside
the independent science assessment; mission endings do not wait for projects.

Weekly requests add optional `project_orders`, for example:

```json
"project_orders": [{"project_id": "seismic-1", "action": "pause"}]
```

Starting uses the `research_seismic` crew activity. Continuing a manual phase uses
the state-provided `project:<id>` activity in the existing assignment list.
Automatic weeks need no assignment. Weekly requests may also set `power_priority`
to `life_support` or `research`; omitted priorities retain their prior setting. `project_updates` in the committed turn log
records controls, phase work, automatic spending/waits, and lost worker references.
The current project panel and final report show state; the debrief shows changes.

Project state is copied and committed with the same atomic turn and idempotency
receipt as incident response, rations, and assignments. Failed validation, reads,
stale turns, and retried request IDs cannot advance a phase, spend resources, or
grant credit twice. Games and project state still live in memory and are lost on
server restart. The phase definitions and lifecycle live in `app/game/projects.py`;
they reuse the existing assignment effects and deterministic outcome streams.
