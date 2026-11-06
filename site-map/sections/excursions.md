# Shore excursions (port listing, excursion detail)

Captured 2026-11-05 (desktop 1440, mobile 390). Raw: `captures/excursion-port*`, `captures/excursion-detail*` (not in git). Crawl data: `excursions.json` (471 ports, ~5,500 excursions).
Covers page types 19 and 20 in `01-page-types.md`.
Samples: `/shore-excursions/barcelona-spain` (full) · `/gibraltar` · `/aarhus-denmark` · hub `/ports-excursions/` · excursion `/gibraltar/panoramic-gibraltar-gin-tasting` (full) · `/new-york-city-…/downtown-manhattan-walk-the-911-memorial`.

## Purpose
Let guests browse, filter and compare tours at each port before or after booking a cruise. The site's largest section (about 70% of all URLs).

## URL pattern & samples
- Hub: `/ports-excursions/` (destination + port selectors, all excursions)
- Port: `/shore-excursions/{port-slug}` (471)
- Excursion: `/shore-excursions/{port-slug}/{excursion-slug}` (5,074). `/shore-excursions/product/…` is blocked in robots.txt.

## Layout (top → bottom)
**Port listing / hub**
1. Global header (built from GraphQL `globalheader`) and breadcrumb.
2. Port name (h2; no h1), optional "read more about {port}" and a **port selector** (hub adds a **destination selector**).
3. **Filter bar**: price · interest · duration · activity level · rating (dropdowns), "see more", tooltip; **sort** dropdown (default "trending").
4. **Excursion cards** (12 per page): image, title (h2), rating, duration, activity level, price, accessibility tag in the title ("(Wheelchair Accessible)").
5. Pagination (page 1, 2, …).
6. Global footer (GraphQL `globalfooter`).

**Excursion detail**
1. Breadcrumb (home / shore excursions / port / excursion).
2. Image, title (h4), review count, location + excursion code (`GIB-330`), duration, activity level.
3. Special-notes warning, description ("what you visit") with read more / less, points of interest.
4. Collapsible tables: **Travel times** (stop, travel time, time at site), **Transport** (vehicle, capacity, air conditioning), **Refreshment**.
5. Reviews: star breakdown (counts per star) and review list.
6. "Related" excursion carousel; footer.

Mobile: the filter bar becomes a **Filters** button; sort stays visible; cards stack. These pages also use an older-style mobile menu (plan a cruise, destinations, ships & experience, booked guests…), unlike the main site.

## Components used
Global header / footer (GraphQL-built variant) · breadcrumb · port / destination selector · filter dropdown bar · sort select · excursion card · pagination · collapsible table section · star breakdown · reviews list · product carousel.

## Data fields
| Field | Example | Source |
|---|---|---|
| Port id, name, links | `BCN` | GraphQL `master-data-itinerary-ports;portCode=` |
| Excursion id / code | `GIB-330` | detail page; `db-excursion/p1.0/ports/{port}/excursions` → `id` |
| Name, description, images | | same API / page |
| Price, currency | `89.95` USD | API `price`, `currency` |
| Duration | `2 hours` | API `duration` (hours) |
| Activity level | Easy / Moderate / … | API `activityLevel` |
| Accessible | yes / no | API `accessibility`; also in titles |
| Interests, points of interest | | API `pointsOfInterests[]` |
| Rating, review counts by star | 4.6, 139 | page (source not traced) |
| Schedule, transport, refreshment | rows | detail tables |

## Interactions & states
Filters and sort (client side), pagination, port / destination selectors, collapsible tables, read more / less, related carousel.

## Links out to
Excursion detail · cruises visiting the port (search `itinPort=`) · booking site (reserve, after booking).

## Notes for our build
- **Keep:** filter by price, duration, activity, rating and accessibility; schedule and transport tables; star breakdown.
- **Fix in ours:**
  - Give port and excursion pages an h1 (the port name is h2 and the excursion title is h4; headings jump h4 → h6 → h2).
  - "Related" excursions are unrelated: the Gibraltar page suggests tours in Moorea, Stockholm, Hawaii and two Japanese-language tours. Relate by port or interest.
  - Accessibility should be a filter and a tag, not text in the title.
