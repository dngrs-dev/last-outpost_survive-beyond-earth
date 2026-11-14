# Injuries, illnesses, and medical assignments

Named conditions extend [nutrition and hydration](health.md). Health remains the
0-100 overall summary; healing it does not erase a case or deprivation deficit.
Zero health still means death. No additional random death mechanic is introduced.

## Sources and fictional values

[NASA medical-condition planning guidance](https://www.nasa.gov/reference/appendix-e-health-and-medical-care-technical-requirements/)
includes wounds, musculoskeletal injuries, respiratory and gastrointestinal
conditions. [NASA dust research](https://www.nasa.gov/reference/jsc-dust/) provides
respiratory-exposure context. These motivate scenarios, not their in-game
likelihood, diagnosis, treatment, equipment, damage, or recovery time. All numbers
and the lunar scenarios below are fictional balancing rules. No medical text,
media, or individual astronaut medical records are copied. Play uses no live API.

## Conditions

| Condition | Recovery points | Work restrictions | Ongoing damage after onset week |
| --- | ---: | --- | ---: |
| Musculoskeletal sprain | 3 | Light duties only | 0 |
| Bleeding wound | 3 | No active work before stabilization; light duties afterward | 6 unstabilized; 0 stabilized |
| Dust-related respiratory irritation | 2 | Indoor work allowed; no EVA | 1 |
| Gastrointestinal illness | 3 | Light duties; strenuous indoor work returns with 1 point left; no EVA until resolved | 3 |

Each astronaut has at most one case of each kind. Cases record remaining points,
onset week, stabilization, and the most recent week's care. Repeated exposure
refreshes the existing case to at least its original recovery requirement and
resets stabilization/care; it does not stack duplicate instances. Dead crew cannot
acquire new cases or receive care. A resolved case is removed.

Risky active work adds penalties of 8, 10, 5, and 8 percentage points respectively,
within the existing overall 35-point cap and probability bounds. Guaranteed actions
remain guaranteed. Named conditions supplement existing deficit/health restrictions.

The fifteen-event library remains intact. Failed solar repairs and risky sampling
can cause sprains, including planned sampling and sensor deployment. Failed
pressure-clamp repair can cause a bleeding wound. Filter contamination announces
dust irritation on discovery. Failed reserve-crate inspection can expose the
inspector to a fictional gastrointestinal illness. Descriptions disclose these
risks. Other damage still uses the overall summary without inventing a diagnosis.

## Care and occupancy

`medical_care` reserves a fit light-duty caregiver and a distinct living patient,
plus **1 medicine**. Select the patient's active `condition_id`. Neither astronaut
can also do research, rest separately, lead/support an incident, or join another
care pair. A critically unfit patient remains eligible. A medic contributes
2 recovery points; another caregiver contributes 1, or 2 with a retained diagnostic
scanner. The scanner is not consumed. The patient rests; the caregiver works.

`self_care` reserves one astronaut and **1 medicine**, targets their own case, and
contributes 1 point. It is available even when critically unfit, supporting solo
crews. Ordinary `crew_rest` is free but cannot stabilize an urgent wound.

Example within the existing weekly request:

```json
"assignments": [
  {
    "crew_id": "maya",
    "activity_id": "medical_care",
    "patient_id": "alex",
    "condition_id": "sprain"
  },
  {"crew_id": "sam", "activity_id": "research_geology"}
]
```

Medical work requires both target fields. Non-null target fields on ordinary work,
dead/missing patients, inactive cases, incorrect self-care targets, and double
bookings reject the entire plan. Old nonmedical requests remain supported.

## Turn order, recovery, and emergencies

All base costs are reserved before the incident. After the incident, care resolves
first, then other assignments, each in roster order within its group. Care cancels
and refunds its reserved medicine if the caregiver dies/becomes unfit or the patient
dies before it begins. Both slots stay committed when attempted recovery stalls.

Care guarantees stabilization when it begins. Recovery points apply during weekly
survival only with full actual food and water, safe air (no oxygen/CO2 damage), and
no active patient work. Otherwise progress stalls: medicine remains spent,
stabilization remains effective, and completed progress is retained. Reports explain
the stall. Power shortages affect recovery through life support; medical care has
no additional electrical load in this version.

Explicit rest earns 1 point per supported non-urgent case. A care patient also
rests, so other cases can receive their ordinary rest point. The chosen case uses
its care contribution, not care plus an extra rest point. Multiple care effects
take the larger contribution for that case/week, never their sum. Active work and
unassigned routine duties do not advance case recovery.

After progress, unresolved cases apply ongoing damage. Completing a case removes
that damage. Ongoing damage or an unstabilized wound prevents automatic summary
health healing. Supported patient/rest healing remains capped at 5 per week and
does not erase deprivation. Existing patient-targeted treatment/scanner/recovery
event actions now provide 5 immediate health and stabilize one case (urgent first,
then kind order), with up to 2 supported recovery points. Their larger instant
health boosts are replaced. The selected patient occupies their incident slot and
rests. The existing medic-led team response remains light-duty group symptom relief.

Urgent wounds appear immediately and block active work. **The onset week has no
ongoing medical damage**, allowing a subsequent plan before the first damage tick.
This explicit gameplay grace period is not a real safe treatment delay. Ignored
wounds can kill through repeated damage. Self-care and no-crew incident responses
remain available subject to actual supplies. Emergencies remain weekly: daily/hourly
clocks, instant rescue interventions, exposure-time physiology, and evacuation are
future work. Existing oxygen, CO2, and deprivation simulation is retained.

## Interruptions and contracts

New restrictions cancel work that cannot begin after the incident, refunding its
reserved costs and granting no research progress. Failed deployment that causes a
sprain retains its incomplete phase and releases its unavailable worker. Completed
phases survive illness, injury, or death; fit replacements can continue. Automatic
recording still depends on power, not its original worker. Care is assigned anew
each week and cannot retain future crew bookings. Science remains independent of
survival. Perfect handover additionally requires no active named cases.

Crew `medical_conditions` include title, urgent status, points, earliest rest/medic
estimates, ongoing-damage rules, and source. Estimates assume supported care and
no reinjury. Choices add action type `medical`. Effects add `condition` and
`treatment`; applied effects add `medical_changes`. Assignment outcomes record
patient/condition IDs. Survival health records add `medical_penalty` and changes,
including stalled progress. Crew cards, target selectors, debriefs, results, and
the chronicle expose these facts.

All changes use the same atomic week and idempotency receipt. Reads, invalid plans,
and exact retries cannot repeat charges, treatment, damage, progress, or rewards.
Assignment request order cannot change medical or research outcomes. Fixtures are
generated through real API calls, including paired-care examples.
