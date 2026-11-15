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

## Visual crew selection

The player flow is `/moon/` (mission), `/crew/` (crew), `/prepare/` (supplies),
then launch. The Moon selector and legacy root station queries open `/crew/`
with station and landing-site identity preserved. Direct preparation URLs remain
supported. The existing four starter astronauts are preselected; every choice is
editable. Each mission's catalog minimum and the catalog crew limit gate Next.

Portrait cards show head-and-shoulder SVG art, icon-only role badges, and green
borders/checks for selected people. Clicking a portrait, including its role badge,
only inspects that person. Their full-body preview, profession, specialty, traits,
and backend-provided ration costs appear on the right. Add, Remove, and Replace
are explicit actions. Select a bottom seat to choose which person to replace;
new additions otherwise target an empty seat. Empty seats are allowed. A selected
person cannot fill another seat. Keyboard focus and accessible names distinguish
inspection from selection. Phones retain both panels and scroll the portrait
roster or dossier internally as needed; Next and the seats stay on screen.

Crew IDs and empty seats are encoded in the `crew` query in seat order, so refresh,
back, and direct links retain the team. Duplicate/unknown/excess URL entries are
removed with an explanation. The supplies screen displays the selected team and
a Change crew action. That action carries the cargo/seed draft through router
history, preserving it on return, including a blank seed. This is launch-form
state, not a saved game. Only occupied crew IDs are submitted; the backend still
validates the entire launch. No API schemas or generated fixtures change.

`AstronautAvatar` and `crewAppearance` contain original, fictional SVG artwork:
shared face/suit shapes, ten stable hair/skin/eye variants, glasses/freckles, and
role accents. They use no external assets or rendering dependency. The avatar
accepts `portrait`, `pose` (`standing` / `seated`), and `mood` (`well` / `tired` /
`unwell`) presentation inputs. Standing, well characters appear in selection.
These inputs prepare reuse in station scenes; there is no new health, hunger,
illness, or fatigue simulation, and this selector does not change their rules.
Future gameplay views should derive expressions from authoritative crew state,
while keeping textual condition indicators accessible.

## Cargo changes

The [supplies screen](supplies.md) now presents this catalog as a game-style cargo
bay, with matching original SVG item illustrations, filters, quantity controls,
and persistent capacity/launch controls. Descriptions and NASA inspiration links
open in item dialogs. Research, power forecasts, and systems remain in the optional
mission brief. The same cargo/seed draft is preserved on refresh and crew changes.
No item definitions or balancing values change with this presentation update.

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
