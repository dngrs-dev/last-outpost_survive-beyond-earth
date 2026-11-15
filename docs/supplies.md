# Supplies and launch screen

`/prepare/` is the third preparation screen, after Moon mission selection and the
visual crew roster. It uses a viewport-sized cargo bay with no website header or
footer. The selected mission stays fixed; Change mission is available in the
optional mission brief. Direct preparation URLs still default to Alpha.

## Packing

The twelve catalog items share an original SVG illustration style: rounded dark
outlines, pale suit-like materials, category accents, and a small ground shadow.
The same `ItemIcon` component supplies card illustrations, packed-cargo previews,
and enlarged item details. Unknown future IDs receive a generic crate. These are
fictional equipment illustrations, not NASA hardware photographs or diagrams.
No external assets, API calls, or new dependencies are required for the icons.

All cargo, Supplies, Tools, and Repairs filter the existing catalog categories.
Filtering never clears quantities. Plus/minus controls and numeric inputs enforce
non-negative whole quantities and each item's catalog maximum, including the
one-scanner and one-science-kit limits. Packed cards have a check mark and green
border. Item details show the authoritative description, per-unit weight/volume,
resource yield or pack size, quantity restriction, and research reference.

Starter pack restores the existing six-type loadout; Empty clears cargo. This
starter preset is unchanged and is not a guarantee of mission survival or science
completion. A desktop hint offers the optional field science kit, while the mission
brief explains research requirements. Science remains separate from survival.

Weight and space meters, remaining capacity, and Launch remain visible. Packing
may exceed capacity while experimenting, but launch is disabled until both fit.
The crew summary and packed manifest appear beside the cards on larger screens.
Smaller screens scroll only the cargo grid and use the crew-count button to open
the crew summary. Keyboard focus, text, and checks supplement color feedback.

## Mission information

Mission brief has keyboard-accessible Mission, Power, and Settings tabs:

- Mission retains the research objectives, survival minimum, difficulty, outpost
  systems/reserves, and a link to change missions.
- Power retains the backend's sunlight forecast, lighting assumptions/source, and
  starting battery calculation. Charge is capped by battery capacity. Excess packed
  power is explained; it does not increase capacity or block an otherwise valid launch.
- Settings contains the optional replay seed. Blank requests a random seed. The
  browser accepts non-negative safe integers so JSON preserves the exact value;
  decimal, negative, malformed, and unsafe values block launch. The backend still
  has its existing wider integer range and remains authoritative.

The arrival resource summary adds station stocks and catalog cargo yields before
incidents. It caps starting power at the battery limit. It does not simulate future
generation, recycling, consumption, injuries, or guaranteed survival time.

Item/mission dialogs use native modal behavior, internal scrolling, Escape/Close,
and focus restoration. Equipment sources and fictional-value notices remain on
demand rather than filling the packing screen with long descriptions.

## Drafts and launch

Cargo and seed edits replace the current router history entry's `supplies` draft,
preserving the launch form on refresh. Back to crew selection and Change crew carry
that same draft through the roster and back, including a blank seed. Crew IDs and
empty seats remain in the query in seat order. This is browser launch-form state,
not a saved mission or cross-device storage.

An unavailable/mismatched mission cannot launch. Crew minimums, known item IDs,
integer quantities, per-item caps, total weight, total space, and seed validity gate
the button. A synchronous in-flight guard prevents duplicate clicks; editing and
crew changes are disabled during the request. Errors preserve the loadout and
allow another attempt. Successful creation records the existing Load bookmark
and opens the backend-created game.

The API contract, catalog content, default loadout, simulation, and generated
fixtures are unchanged. The backend validates the launch; UI totals are packing
feedback. Tests use the committed fixtures generated from the real API.
