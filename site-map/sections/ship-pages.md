# Ship pages (fleet list, ship detail)

Captured 2026-11-05 (desktop 1440, mobile 390). Raw: `captures/fleet-list/`, `captures/ship-detail*` (not in git). Crawl data: `ships.json`; venues by deck: `fleet-map.json`.
Covers page types 12 and 13 in `01-page-types.md`.
Samples: `/ships-and-experience/ships` · `su-sun-princess` (newest, full) · `gp-regal-princess` · `co-coral-princess` (older, smaller).

## Purpose
Fleet list: pick a ship. Ship detail: sell one ship (what's new, suites and rooms, restaurants, bars, activities, kids, spa) and lead into its cruises and deck plan.

## URL pattern & samples
- Fleet: `/ships-and-experience/ships`
- Ship: `/ships-and-experience/ships/{code}-{ship-name}` (17), e.g. `su-sun-princess`. The two-letter code matches the search and deck plan `shipCode`.

## Layout (top → bottom)
**Fleet list**
1. Full global header; hero with h1; sticky section menu (overview, the fleet, suites collection, signature features).
2. Ratings / awards line.
3. **Fleet grid**: 17 ship cards (image + name), newest first.
4. Email sign-up; suite collection promo with a comparison table.
5. "Signature features and activities" carousel (wellness, casino, entertainment, enrichment, kids, excursions, celebrations).
6. Credit card promo, "you may also like", global footer.

**Ship detail** has two layouts:
- **Newer ships (Sun, Star):** feature story. Hero → "designed to shine" with 3–4 feature blocks (glass dome, arena theater, dining with a view) → suite collection with tabs per suite type → new cabin types → "flavors" (dining) carousels split into complimentary and specialty → packages → more.
- **Older ships (Regal, Coral and others):** venue lists. Hero → suites → "a stateroom for every style" table → dining carousel (complimentary, then specialty) → activities & entertainment carousel → bars carousel → staterooms → kids → spa.
- Both have: sticky section menu (ship features, suites, rooms, restaurants & bars, casino, cruises, deck plan), email sign-up, "cruises on {ship}" link, global footer.

**Mobile:** sticky section menu becomes a select; carousels swipe; tabs collapse into a "toggle tabs" dropdown.

## Components used
Full global header · hero · sticky section menu · ship card grid · feature block · tab set · comparison table · venue carousel (image, name, text, link) · package cards · email sign-up form · link rows · global footer.

## Data fields
| Field | Example | Source |
|---|---|---|
| Ship code, name, version | `SU`, version 3 | URL; GraphQL `master-data-ship-list;shipCode={code};shipVersion={n}` |
| Facts (guests, crew, tonnage, decks, length, year) | | page "facts" block (`ships.json`; parsed in `fleet-map.json` → `facts`) |
| Venues by section | name, section (dining / bars / activities / wellness / kids), link | page h3s under each h2 (`fleet-map.json` → `venues`) |
| Venue deck | deck numbers | joined from deck plans (`fleet-map.json` → `venues[].decks`) |
| Cabin types and counts | | deck plans (`fleet-map.json` → `layouts[].staterooms`) |

## Interactions & states
Sticky section menu; tabs (suite types; spa / shops / kids); carousels (cloned cards read twice; each venue heading appears 2–3 times).

## Links out to
Search results filtered by ship · deck plan (`/deckPlans.do?shipCode=`) · venue pages (dining) · staterooms · packages · onboard topics.

## Notes for our build
- **Keep:** one ship template fed from ship data (facts, venues, cabins, layouts by date); sticky section menu with "cruises" and "deck plan"; complimentary vs specialty dining split.
- **Simplify:** the two layouts. Ours should be one template with an optional "what's new" feature section for new ships.
- **Fix in ours:**
  - Ship facts drift from the deck plan (Island Princess page says 987 cabins; its deck plan has 1,107). Generate facts from the same data.
  - Descriptive headings ("A signature steakhouse at sea") instead of venue names make venues hard to find and match. Use the venue name as the heading.
  - Carousel clones.
