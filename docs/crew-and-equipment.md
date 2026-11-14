# Crew and equipment design

All ten characters are fictional. Names, traits, consumption, injuries, success
bonuses, equipment dimensions, and resource yields are original game design.
They are not measurements of real astronauts or specifications of flight hardware.
No astronaut photographs, biographies, or NASA logos are copied into the game.

## Research basis

- [NASA crew operations training](https://www.nasa.gov/reference/jsc-crew-operations-training/)
  supports the systems-operation and EVA training context.
- [NASA medical training requirements](https://www.nasa.gov/reference/5-0-training/)
  provide context for crew medical officers and diagnostic procedures.
- [NASA Artemis field geology training](https://www.nasa.gov/missions/artemis/nasa-field-geology-training-prepares-artemis-mission-support-teams/)
  informs the field-science specialties.
- [NASA spacesuit basics](https://www.nasa.gov/centers-and-facilities/johnson/spacewalk-spacesuit-basics/)
  provides context for portable life-support supplies.
- [NASA hardware and equipment guidance](https://www.nasa.gov/reference/9-0-hardware-and-equipment-vol-2/)
  discusses maintenance and lunar-dust mitigation.
- [NASA Space Food Systems](https://www.nasa.gov/directorates/esdmd/hhp/space-food-systems/)
  provides context for packaged provisions.

These sources inspire concepts, not the fictional numerical rules. References are
also included in the catalog and linked from the preparation UI. No API calls are
made for character or equipment data.

## Roster

| Character | Profession | Specialty and tradeoff |
|---|---|---|
| Alex Vega | Engineer | Broad action bonus; extra food |
| Maya Okafor | Medic | Lower food demand; extra water |
| Lin Park | Scientist | Lower water demand; greater event injury damage |
| Sam Nowak | Technician | Reduced event injury damage; lower action probability |
| Nora Haddad | Engineer | Regulator repair bonus; extra water |
| Omar Reyes | Engineer | Solar repair bonus and injury resistance; extra food |
| Elena Rossi | Medic | Improves crew treatment while alive; greater injury damage |
| Daria Sokol | Scientist | Calibration bonus; extra food |
| Inez Costa | Technician | General EVA repair bonus; extra water |
| Jules Mensah | Technician | Regulator diagnosis bonus; extra food |

Players assign up to four unique people to explicit slots. Empty slots are allowed
subject to the selected mission's minimum crew. Slot order determines the selected
crew order in the request; only occupied seats are sent as `crew_ids`. The backend
still validates IDs, duplicates, and limits. Normal ration costs in the catalog
are calculated by the backend and summed for preparation feedback.

Specialty bonuses affect named actions and remain subject to the existing 5%-95%
probability bounds. For individual treatment, the selected person is the patient:
Elena's bonus comes from a living medic rather than from selecting Elena as a patient.
Dead crew contribute no medical bonuses and cannot be assigned actions.

## Cargo changes

The six existing cargo IDs remain compatible. Medicine descriptions now distinguish
consumable supply from equipment. Cargo limits are clearly labeled fictional.

| Added item | Fictional cost | Effect |
|---|---|---|
| Emergency power cell | 6 kg / 5 L | Adds 12 electricity on arrival; no generation increase |
| Dust-cleaning kit | 1.5 kg / 3 L | Consumed for guaranteed +20 solar percentage points; also costs one EVA pack and 2 oxygen |
| Spare oxygen regulator | 2.5 kg / 3 L | Consumed for guaranteed +20 oxygen percentage points; also costs 2 electricity |
| Diagnostic scanner | 4 kg / 5 L, maximum one | Retained; unlocks guaranteed patient treatment (5 immediate health, stabilization, up to 2 supported recovery points), consuming one medicine; improves non-medic paired care to 2 points |
| Multipurpose sealant pack | 0.8 kg / 2 L | Consumed for guaranteed line, coupling, thermal-patch, or dust-cover repairs |
| Field science kit | 3 kg / 5 L, maximum one | Retained; unlocks instrumented science, battery measurements, and reserve inspection |

The latest two items support the [fifteen-event library](events.md). Sealant adapts
the improvised-repair lesson from Apollo 17; it is not a real universal pressure
repair specification. The field kit combines fictional sampling and diagnostic
tools. Research data is earned in play, cannot be packed, and does not replace
survival supplies or change handover requirements.
The [research brief](research.md) now gives that work explicit mission targets.
Pack a science kit for planned tasks; successful qualifying event actions can also
earn credit. Generic points alone do not complete a research objective.

Maintenance is a one-week crew assignment, including quiet weeks. It requires
a living astronaut who is not committed to the incident response. Discovery damage
already happened and remains unless repaired.
Maintenance on an already healthy system is rejected without spending supplies.
Efficiencies and health remain capped. The scanner offers reliability in exchange
for cargo capacity. Patient treatment now emphasizes [named-condition recovery](medicine.md)
rather than large instant health boosts. Assigned medics provide 2 care points;
non-medics provide 1, or 2 with the scanner. Both caregiver and patient are occupied.

All equipment costs, eligibility checks, outcomes, and resource accounting remain
authoritative in the backend. Repeated requests use the existing atomic/idempotent
turn operation. Regenerate the frontend fixtures after intentional content changes.
