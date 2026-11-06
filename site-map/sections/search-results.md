# Search results

Captured 2026-11-05 (desktop 1440 × 900 and mobile 390 × 844). Raw captures: `data/sites/princess.com/captures/search-results/` (not in git).
Samples: unfiltered `/cruise-search/results/` · header link `?trade=E,C,A,M,T,N&duration=1,2,3&mrch=1` · port of call `?itinPort=PPG` · empty `?trade=A&date=0127` · invalid `?trade=ZZ`.

## Purpose
The main shopping page. It lists every bookable itinerary that matches the filters, shows the lowest price for the chosen guest count and cabin type, and sends the visitor to the cruise detail page. Most site entry points (header button, home search box, destination and deal pages, about 320 sitemap links) land here with filters already set in the URL.

## URL pattern & samples
`/cruise-search/results/?{filters}`. All state is in the query string, so every filtered view can be shared and linked to.

| Param | Meaning | Values seen |
|---|---|---|
| `trade` | Destination region (multi, comma-separated) | 15 one-letter codes (A, C, E, …) |
| `subTrade` | Sub-region | two-letter codes (e.g. `TO`) |
| `duration` | Length bucket (multi) | `1`–`4`, matching the 4 buckets in the panel (1–5, 6–8, 9–15, 16+ days). **Unconfirmed:** `1,2,3` still returned 16–23 day cruises, so the codes may not map in that order |
| `date` | Sailing month (multi) | `MMYY`, e.g. `0127` |
| `startPort` / `port` | Departure port | 3-letter port code |
| `itinPort` | Port of call anywhere on the itinerary | 3-letter port code |
| `ship` | Ship | 2-letter ship code |
| `promos` | Only cruises in a sale | sale code |
| `meta` | Cabin type | `I`, `O`, `B`, `M`, `S` |
| `fareType` | Standard vs bundled fare | fare code |
| `resType` | Cruise vs cruise + land tour | |
| `voyages` | Explicit list of voyage codes | |
| `startDateRange` / `endDateRange`, `years`, `sortBy` | Date window, year, sort | |
| `mrch` | Unknown. Present on the header button link; no visible effect found yet | `1` |

The `/cruise-search/` path (no `results/`) is the same app in "choose filters" mode (see Interactions).

## Layout (top → bottom)
**Desktop**
1. Global header (logo, offer sign-up, log in / create account, search icon). The main mega-menu is **not** shown on this page.
2. Tabs: **Cruises** | **Cruise + land tours**.
3. Four filter tabs as large pill buttons: Destination · Date & Length · Departure Port · Ship.
4. A second row of small dropdown links: guest count · cabin type · sub-region.
5. Fare-type strip: a short line about what the bundled fare includes, plus a two-option radio (bundled vs standard fare).
6. Result count ("We found N cruises") on the left, sort dropdown on the right.
7. Result cards, 10 at a time; more load as you scroll (no pager or "load more" button).
8. Footnote with a "terms and conditions" button that opens a dialog.
9. Global footer.

**Mobile**
- Header collapses to: menu button, logo, a shortcut to cruises.
- The four filter tabs collapse into **Filters**; guests, cabin, sort and sub-region collapse into **Options**. Both open full-screen panels with a sticky **View results** button.
- The fare-type strip stacks. Cards stack (image on top, full width).

## Result card (one per itinerary)
Top → bottom: image (left half on desktop, top on mobile) · deal badges (pills, up to 2: main sale + "extra guests sail free") · itinerary title as a link (`{N}-Day {name}`) · save (heart) icon · route ("Roundtrip from X" or "X to Y") · port count plus ports as small dot-separated links · **Available dates** dropdown (date and ship per sailing) · cabin type with "from*" · price now, with the old price struck through · price note (currency, per person, guest count, taxes included) · **View details** button.

- Each card is one **itinerary**. Its sailings are in the dates dropdown, and choosing a date updates price and ship.
- A "new ship" tag can follow the ship name in the date.
- Sold-out sailings stay in the list showing "Sold Out" instead of a price.
- The save icon goes to the login page when signed out.

## Components used
See [components.md](../components.md): global header · tab switch · filter pill tabs · filter panel (multi-select checkbox grid) · dropdown radio menu · fare-type radio strip · result count + sort · **cruise result card** · deal badge · offer details dialog · date dropdown · price block (now / was / note) · infinite scroll list · empty state · terms dialog · global footer.

## Data fields
| Field | Example | Source (DOM / API) |
|---|---|---|
| Result count | `1009` | `status` live region "N Results Found"; length of `products[]` |
| Itinerary id | `ABC01A` | `products[].id` (`resdb/p1.0/products`) |
| Itinerary name | `Panama Canal - Ocean to Ocean` | `products[].name` |
| Region / sub-region | `T` / `TO` | `products[].trades[].id`, `.subTrades[].id` |
| Sailing (voyage) code | `A716A` | `products[].cruises[].id`, card link `?voyageCode=` |
| Sail date / end date | `20261106` / `20261122` | `cruises[].startDate`, `.endDate` |
| Duration (nights) | `16` | `cruises[].voyage.duration` |
| Start / end port | `FLL` / `LAX` | `voyage.startPortId`, `.endPortId` → `resdb/p1.0/ports` for names |
| Ship | `ST` | card date text; codes and refit `versionDates` in `resdb/p1.0/ships` |
| Ports of call | list of port names | card port links (`#days-and-ports` anchor on detail page) |
| Cabin type (meta) | `I`, `O`, `B`, `M`, `S` | `pricing/v1/cruises` → `fares[].metas[]`; names in `resdb/p1.0/metas` |
| Cabin category | `BF` | `fares[].categories[].id` (+ `availability`, `availableCabins`) |
| Price per guest | `245` | `categories[].averageGuestPrice` (taxes included) |
| Was price | `455` | `categories[].averageGuestBrochurePrice` |
| Fees and taxes | `86`, `36` | `pricing.rcfe`, `pricing.igvt` |
| Fare type | `BESTFARE` | `pricing.fares[].fareType` |
| Sale / deal | `Last Minute Deals` | `sale-names.json` (code, name, start/end dates) + `resdb/p1.0/promos/sales` |
| Deal badge styling | colour, filter name | `sale-banners.json` |
| Extra-guests-free eligibility | voyage list | `free-3rd-4th-voyages.json` |
| Bundled fare contents | | `masterdata-special-packages` (GraphQL) and `cruises/{code}/special-service` |

Live numbers (2026-11-05): 1,009 itineraries, 2,172 sailings. The cruise + land tours tab has 229.

## Interactions & states
- **Filters:** clicking a filter tab switches the app to `/cruise-search/` "choose filters" mode. A "Your selections" bar ("No filters selected yet") with a **View N results** button that updates live; the panel for that tab; and "More filters" tabs for the other three. Panels:
  - Destination: 15 regions as image tiles (multi-select).
  - Date & Length: 4 length buckets, then a month grid by year (past months empty); months on sale run Nov 2026 – Apr 2029.
  - Departure port: about 39 ports grouped by continent (North America 13, Europe 10, Australia & NZ 6, Asia 5, South America 3, Caribbean 2).
  - Ship: 17 ships (13 on the land tours tab).
- **Dropdowns** (radio menus): guests 1–4 · cabin type (5) · sort (date, duration, itinerary name, price low, price high; default price low) · sub-region (about 20, changes with results).
- **Fare-type radio:** standard (default) or bundled fare.
- **Deal badge:** opens a dialog with the deal's headline and a table of what's included by cabin type (rows = perks, columns = suite … interior).
- **Loading:** first card appears after about 6–8 s. Every filter change re-downloads the full itinerary and price lists (about 1 MB + 1.7 MB) and the 7 MB sale list on first load.
- **Empty state:** "no results" message plus a link back to search. An **invalid** code (`?trade=ZZ`) shows the same message, so a broken link looks like "no cruises".
- **Two versions in use:** some loads show a "Reset filters" button and labelled dropdowns (Guests: / Stateroom: / Sort: / Regions:) with the deal badge after the title; others show unlabelled dropdowns and no reset. Probably an A/B test.
- **Mobile:** Filters and Options are full-screen panels with sticky View results; sort lives inside Options.

## Links out to
- Cruise detail: `/itinerary-details/?voyageCode={code}` (title, View details, port links with `#days-and-ports`).
- Login (save icon, signed out).
- Deal dialog (in page); terms dialog (in page).
- Cruise + land tours tab: the same app with `resType` set.

## Notes for our build
- **Keep:** all filter state in the URL; one card per itinerary with a date dropdown; price note on every card; multi-select region / length / month / port / ship; sold-out sailings marked rather than hidden.
- **Simplify:** load results from a filtered API instead of downloading the whole catalogue and a 7 MB sale list on every change. Fewer request types (this page makes about 20 different data calls).
- **Fix in ours:** invalid filters should say so, not show "no results". Put the itinerary title in a heading (here only the page title is a heading; the page has no h1). Give the save link a clean accessible name (here it runs words together, e.g. "Save cruise2 -DayAustralia…").
- **Skip:** the separate "choose filters" route. An in-page panel is simpler.
- **Open questions:** what `mrch=1` does; whether the two page versions are an A/B test.
