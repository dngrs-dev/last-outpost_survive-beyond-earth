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

## Conditions and scope

The selected dataset and map may be included in this repository with these notices.
Keep source attribution. NASA logos, insignia, and mission patches are not included.
No NASA endorsement or review of this application is implied. Third-party material
elsewhere on NASA sites can have different restrictions. Consult the current
[NASA media usage guidelines](https://www.nasa.gov/nasa-brand-center/images-and-media/)
before adding other material. These notices do not license the project's own code.
