# Weekly incident response and crew assignments

Each living astronaut has one main job per week. An incident response can occupy
one lead plus explicitly selected support crew. Other crew can perform research
or maintenance assignments in the same week. Crew without an assignment perform
routine duties, with no new healing or fatigue effects. All living crew continue
to consume provisions through the existing survival rules.

Research and maintenance are no longer choices in the incident response list.
The current event contains only its authored responses (or routine continuation
on a quiet week). The state supplies a separate `assignment_options` list with
requirements, costs, per-person availability and probabilities, and potential
objective rewards. Maintenance keeps its existing equipment and efficiency rules.

## Weekly request

The turn endpoint retains the lead incident response fields and adds independent
orders. For example, during a solar failure:

```json
{
  "expected_week": 1,
  "request_id": "week-1-plan",
  "event_choice_id": "engineer_repair",
  "selected_crew_id": "alex",
  "support_crew_ids": [],
  "assignments": [
    {"crew_id": "lin", "activity_id": "research_geology"},
    {"crew_id": "sam", "activity_id": "research_seismic"}
  ],
  "rations": {
    "alex": {"food": "normal", "water": "normal"},
    "lin": {"food": "normal", "water": "normal"},
    "sam": {"food": "normal", "water": "normal"}
  }
}
```

An incident requiring two crew must name one living lead and exactly one other
living support astronaut. No astronaut can be lead, support, and/or assignment
worker more than once. Support does not add another role bonus; the existing
lead and living-crew probability rules remain in effect. Responses needing no
lead require an empty support list. All assignments currently take one week and
require one astronaut; multi-week projects remain future work.

Empty assignments and support lists default to `[]`, preserving simple one-person
responses. Old requests that relied on an implicit second incident astronaut
must now explicitly name support. Research IDs sent as event responses are rejected.

## Atomic resolution

1. Validate rations, the incident response, explicit crew allocation, assignment
   requirements, and combined base costs against the current state. Future
   generation or successful work cannot fund the submitted plan.
2. Copy the state and reserve all action base costs. These supplies cannot be
   accidentally spent again by a later action. Normal/reduced ration overspending
   is rejected; the existing emergency depletion rules remain supported.
3. Resolve the incident. Its existing discovery damage was already applied once.
4. Resolve assignments in roster order, independently of request-list ordering.
   An astronaut killed by the incident cannot begin work: the assignment is
   cancelled, its reserved base costs are returned, and it grants no reward.
5. Apply weekly food, water, power, oxygen, and health simulation. Work completed
   before a survival death retains its recorded science. No assignment persists
   into the following week; only living crew appear as candidates for new orders.
6. Check the existing survival ending, prepare the next event if appropriate, and
   commit one turn and one idempotency receipt.

Failed work still spends its base costs and applies its authored failure effects.
Outcome losses apply to unreserved stock and are clamped as before. The interface
projects base action costs plus rations; generation and uncertain effects are
reported after resolution. The reusable science kit is retained and can support
several crew tasks during the abstracted week; it is not a simultaneous equipment
occupancy simulator.

Each assignment uses a seeded outcome stream based on week, astronaut, and
activity. Assignment outcomes cannot change the incident roll. Reordered orders,
reads, failed validation, and exact retried submissions cannot reroll work or
duplicate costs. Editing is locked during unresolved submissions in the frontend.

## Science and reports

The turn has `assignments` outcomes and one combined `science_gains` list.
Each individual outcome also records its own gains for the debrief. The combined
list is authoritative for science progression and is counted once. Incident credit
is awarded first, then assignment credit in roster order, capped at each target.
Submitting extra attempts for the same objective can spend supplies without
additional objective credit once the target is reached; successful work can still
earn its normal research data. Survival and science assessments remain separate.

The interface separates incident choices from the crew-work module and shows
support selection, occupied crew, probabilities, requirements, costs, combined
projected spending, and conflicts before submission. The debrief and final journal
include successful, failed, and cancelled work. Medical assignments, new fatality
mechanics, fatigue, and lasting projects are outside this implementation.

Validation also exercised 120 seeded campaigns across all six outposts with
two- and four-person crews. Every run resolved to an ending without blocked
turns; survival and science outcomes varied with crew size and the seed. This
checks the flow rather than guaranteeing balance for every possible plan.
