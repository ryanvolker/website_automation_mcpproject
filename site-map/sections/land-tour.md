# Land tour (lodge, rail)

Captured 2026-11-05 (desktop 1440, mobile 390). Raw: `captures/land-tour*` (not in git).
Samples: `/cruise-destinations/alaska-cruises/cruisetour-options/denali-princess-wilderness-lodge` (full), `…/cruisetour-options/alaska-train-travel`.

## Purpose
Describes the land part of a cruise + land tour (the line's own lodges and rail service), so visitors understand what they get before or after the ship. Only Alaska has these pages (~11).

## URL pattern & samples
`/cruise-destinations/alaska-cruises/cruisetour-options/{lodge-or-rail}`

## Layout (top → bottom)
1. Full global header; hero with h1 (lodge or service name); sticky section menu.
2. Intro ("your base camp for adventure") with a facts table.
3. **Amenities / activities / excursions**: three h3 columns.
4. **Directory and map**: tabs (map, services, dining) with tables.
5. Image carousel.
6. "Here to help" contact block.
7. Travel add-ons carousel, deals row, "you may also like", global footer.

Rail page: the same builder with "onboard train experience" features (narration, dining, observation platform) and an image carousel.

## Components used
Same builder as [destination pages](destination-pages.md): hero, sticky section menu, feature columns, tab set, data tables, content carousel, travel add-ons carousel, link rows.

## Data fields
Name, amenities, activities, excursions, directory (tables), images: page HTML (CMS). No catalogue data.

## Interactions & states
Tabs; carousels (cloned slides read twice: the travel add-ons carousel lists each of its 3 cards three times).

## Links out to
Cruise + land tour search (cruisetours tab), Alaska pages, excursions, flights and hotel pages.

## Notes for our build
- **Keep:** a page per land product with amenities, directory and map; link to tours that include it.
- **Simplify:** reuse the destination page builder (already the case here).
- **Fix in ours:** carousel clones.
