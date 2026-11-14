# Connected lunar life support

The game separates **water recovery**, **oxygen generation**, and **carbon-dioxide
removal**. Equipment condition, stored material, and available power all matter.
The implementation uses the existing atomic turn, crew assignments, effects,
solar/battery allocation, and health rules. No new dependency or NASA API is used.

## Engineering inspiration and numerical boundaries

[NASA's ISS ECLSS overview](https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/)
describes reclaiming wastewater, oxygen production by water electrolysis, and
separate cabin-air processing that removes carbon dioxide. Those relationships
inspire the game. This is a fictional lunar system, not a reproduction of ISS
flight equipment, operating procedures, recovery percentages, or medical limits.

Every capacity, conversion rate, power budget, reserve target, wear amount,
condition threshold, and health penalty below is original game balance. Resource
units are abstract; they are not kilograms, kWh, ppm, partial pressures, or a
chemical mass-ratio calculation. The model omits hydrogen handling, Sabatier
chemistry, humidity dynamics, contaminant species, and real cabin-gas physics.
The overview was checked on 2026-11-14. Its source link is exposed in the game.

## Water accounting

Stations start with **12 wastewater units**, a fictional service stock left by
the previous crew. Potable `water` and untreated `wastewater` are separate stocks.

After the week's event and manual work, surviving crew receive their allocated
rations. A ration must be funded from current potable water under the existing
validation/depletion rules: future recovery cannot fund this week's reservation.
The processor then treats only previously stored wastewater:

```text
processed = min(wastewater, 4 * recovery_condition) * life_support_power_fraction
clean_water_recovered = processed * 0.8
```

The processed amount leaves the wastewater stock; the recovered amount enters
the clean-water reserve. The remaining 20% is a treatment loss in this simplified
game. At the end of processing, 80% of actual drinking water used is captured as
new wastewater. That new stock waits until the next week; a turn cannot repeatedly
recycle the same water or reclaim water from an unfunded ration. Recovery therefore
reduces net consumption without creating an unlimited source of water.

Powered recovery requests **2 electricity per week**. Its condition falls by
**2 percentage points per week in which it actually processes wastewater**.
Empty stock or a complete blackout produces no recovery and no recovery wear.
Lower condition reduces processing throughput; the fictional recovery yield
remains 80%. Wastewater cannot be used as drinking water or electrolysis feed.

## Oxygen production

Before breathing consumption, the generator seeks enough oxygen to leave a
**two-week reserve for the currently living crew** after this week's demand:

```text
requested_output = min(conditioned station capacity,
                       max(0, 3 weeks of breathing demand - current oxygen stock))
output = min(requested_output * life_support_power_fraction,
             available clean water / 0.1)
water_spent = output * 0.1
```

Recovered clean water may feed this week's generator after rations are allocated.
The generator requests **4 electricity** when production is needed and water is
available or recoverable. These are fixed operating budgets, not energy-per-mass
specifications. The existing oxygen-system condition still caps generation.

If the oxygen reserve is already adequate, the generator idles and spends no
water or generator power. If both clean water and recoverable stock are absent,
generation stops. Insufficient water caps output without overdrawing the reserve.
No allocated power means no output. Existing stored oxygen can still support
breathing, and existing oxygen-shortage penalties still apply when stocks run out.

## Carbon dioxide

Each living astronaut adds **1 CO2 burden unit per week** to the cabin. The
scrubber requests **2 electricity** and removes up to:

```text
6 * scrubber_condition * life_support_power_fraction
```

Removal is capped at the burden actually present. Unremoved CO2 persists across
weeks. A powered scrubber loses **1.5 condition points per operating week**.
The current stations all have a fictional full-condition capacity of 6; the value
is authored per station. Starting processor conditions range from 100% to 80%.

The cabin warning threshold is **4 game burden units**, independent of the number
of surviving astronauts. Exposure damage is `ceil(max(0, burden / 4 - 1) * 8)`,
capped at 30 health per week. This is a fictional gameplay buffer, not a safe
exposure limit or concentration measurement. A crew death does not instantly
change the cabin threshold; fewer surviving astronauts produce less new CO2.
The debrief reports CO2 damage separately from oxygen shortage and ration penalties.
Full oxygen tanks do not prevent CO2 harm. A broken or unpowered scrubber does not
remove gas, even if oxygen generation is working normally.

## Power and maintenance decisions

Essential demand now has visible components: habitat **4 + 2 per living crew**,
water recovery **2** when needed, oxygen generation **4** when needed, and scrubber
**2** when operating. When all processors are active, total demand matches the
earlier 12 + 2 per crew balance. Components that are idle do not request their
processor budget. During a shortage, the allocated life-support fraction scales
processor operation. [Life-support versus research priorities](energy.md) remain
available; research-first can reduce recovery, oxygen output, and CO2 removal.

Two one-week assignments use the existing repair kits and crew-capacity rules:

- `service_water_recovery`: 1 repair kit and 2 power; guaranteed +30 recovery
  condition points, capped at 100%.
- `service_co2_scrubber`: the same cost; guaranteed +30 scrubber condition points.

Both require a living worker who is not already committed to another job. Full
condition blocks unnecessary service, and invalid orders spend nothing. Normal
operation and wear occur after service in that turn. No new equipment item is
mandatory; preparation should include enough repair kits for faults, maintenance,
and the remaining kit required by a perfect handover.

The existing scrubber incident now applies an initial 20-point **scrubber** fault.
Its repair response can restore 30 scrubber points. Purging spends 8 oxygen and
removes up to 6 cabin burden units without repairing equipment. Accepting the
fault causes another 20-point scrubber loss and immediate event injury. These
effects no longer pretend that CO2 removal and oxygen generation are one system.

## Outcomes, visibility, and integrity

The system panel shows separate condition meters, wastewater, cabin burden,
power components, reserve policy, conversion rules, wear, and maintenance advice.
The weekly report gives processed/captured wastewater, recovered water,
electrolysis water usage, CO2 production/removal/remaining burden, and per-person
CO2 penalties. Current condition and burden are also visible in final results.

A good handover now requires acceptable cabin burden and all four system
conditions (solar, oxygen, water recovery, CO2 removal) meeting the ending's
condition threshold. Excess CO2 forces an emergency handover if anyone survives.
The existing immediate solar/oxygen-collapse failure rule remains; failed water
or CO2 equipment otherwise acts through resource loss and crew health.
Perfect handover still requires a medicine and repair kit, healthy original crew,
two weeks of reserves, and at least 12 stored electricity. Science remains a
separate assessment. Maintenance does not award research objective credit.

New stocks and conditions are committed with the same weekly receipt as all other
resources. Reads and retries cannot recycle water, wear equipment, apply exposure,
spend repair kits, or award effects again. Stocks remain nonnegative and conditions
stay between zero and one. Games remain in memory and reset on server restart.
