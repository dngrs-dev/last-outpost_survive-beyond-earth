# Third-party data and assets

## Lunar surface map

- Local file: `frontend/public/images/moon/lroc_color_2k.jpg`.
- Source: [CGI Moon Kit, NASA Scientific Visualization Studio](https://svs.gsfc.nasa.gov/4720/).
- Original download: [2048 × 1024 color map](https://svs.gsfc.nasa.gov/vis/a000000/a004700/a004720/lroc_color_2k.jpg).
- Credit: NASA's Scientific Visualization Studio. Map assembled from Lunar
  Reconnaissance Orbiter instrument data (LROC and LOLA). Visualizer: Ernie Wright.
- Reuse basis: [SVS FAQ](https://svs.gsfc.nasa.gov/help/) states its content is public
  domain unless otherwise noted. No separate restriction is stated for this map.
- The JPEG is stored unchanged. Its SHA-256 and original size are recorded in
  `backend/data/moon.json`. The rendered lighting and interface are project work.

## Title-screen Earth and lunar panorama

- Earth: `frontend/public/images/title/earth-blue-marble.png`, the unchanged
  [2048 by 1024 Blue Marble mosaic](https://svs.gsfc.nasa.gov/vis/a000000/a002900/a002915/bluemarble-2048.png)
  from [NASA SVS, visualization 2915](https://svs.gsfc.nasa.gov/2915/).
  Credit: NASA/Goddard Space Flight Center Scientific Visualization Studio;
  data courtesy Reto Stockli, NASA GSFC / Earth Observatory. Reuse basis:
  [SVS public-domain guidance](https://svs.gsfc.nasa.gov/help/), with no separate
  restriction stated for this selected image.
- Foreground: `frontend/public/images/title/apollo17-surface.jpg`, the unchanged
  [original NASA/JSC image jsc2004e52775](https://images-assets.nasa.gov/image/jsc2004e52775/jsc2004e52775~orig.jpg),
  an Apollo 17 Station 7, EVA 3 panorama assembled from frames AS17-146-22339
  through AS17-146-22363. [Catalog record](https://images.nasa.gov/details/jsc2004e52775).
  Credit: NASA/JSC. Reuse basis: [NASA media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/);
  no third-party restriction is stated in the selected catalog record.
- Source URLs, byte counts, and SHA-256 hashes are recorded in
  `frontend/public/images/title/sources.json`. Both selected assets may be
  committed and redistributed with these notices and source credits. They are
  not covered by a license for the project's original code.

The screen combines independent images. Cropping, scene lighting, Earth scale,
decorative stars, and accelerated rotation are project presentation choices,
not a historical photograph, live sky, or NASA-endorsed simulation. No logos,
insignia, or mission patches are included. See [the title-screen guide](docs/title-screen.md).

## Historical facts

`backend/data/moon.json` includes factual coordinates and numerical mission records
from the [NASA NSSDCA coordinate table](https://nssdc.gsfc.nasa.gov/planetary/lunar/lunar_sites.html)
and [Apollo landing table](https://nssdc.gsfc.nasa.gov/planetary/lunar/apolloland.html).
Credit: NASA NSSDCA / Goddard Space Flight Center. Short descriptions are original
project summaries; individual mission references are included with each record.

## Event and equipment research

`backend/data/events.json` and the additional equipment definitions contain
original fictional scenarios and short original summaries of NASA research.
Each includes a source link; [the event guide](docs/events.md) lists the references
and explains the gameplay abstractions. No article text, photographs, logos, or
additional NASA assets were downloaded for this expansion. These research links
do not imply NASA endorsement or validation of the game rules.

## Lighting constants and source references

`backend/data/lighting.json` records the factual mean lunar solar-day duration
from [NASA SVS](https://svs.gsfc.nasa.gov/12739/) and links NASA's environmental
context. Station longitudes reuse the cached NASA NSSDCA coordinates above.
The lighting assumptions, epoch, energy units, hardware capacities, and game rules
are original project work, described in [the energy guide](docs/energy.md).
No additional article text, images, video, logos, or other media were copied for
this mechanic. Source links and numeric facts do not imply NASA endorsement.

## Life-support engineering references

The resource-loop design uses the [NASA ISS ECLSS overview](https://www.nasa.gov/reference/environmental-control-and-life-support-systems-eclss/)
as engineering inspiration. All descriptions are original summaries and all lunar
hardware/rate/health rules are fictional. No NASA article text or media was copied.
The source is linked in the game and [life-support guide](docs/life-support.md).
This does not imply NASA validation or endorsement of the simulation.

## Crew nutrition reference

The [NASA inadequate food and nutrition risk overview](https://www.nasa.gov/reference/risk-of-inadequate-food-and-nutrition/)
provides qualitative context for nutrition, health, and performance. All descriptions
are original summaries. Deficit units, hydration rules, damage, recovery, workload
thresholds, and weekly timing are fictional project work documented in
[crew condition](docs/health.md). No NASA article text or media was copied;
this is not a NASA-validated physiological model and implies no endorsement.

## Conditions and scope

Named medical scenarios additionally reference [NASA medical-condition planning](https://www.nasa.gov/reference/appendix-e-health-and-medical-care-technical-requirements/)
and the existing NASA dust reference. Descriptions are original summaries; all
severity, frequency, treatment, equipment, damage, and recovery rules are fictional.
No medical text, media, or astronaut medical records were copied. See
[the medical guide](docs/medicine.md). No NASA review or endorsement is implied.

The selected dataset and map may be included in this repository with these notices.
Keep source attribution. NASA logos, insignia, and mission patches are not included.
No NASA endorsement or review of this application is implied. Third-party material
elsewhere on NASA sites can have different restrictions. Consult the current
[NASA media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)
before adding other material. These notices do not license the project's own code.
