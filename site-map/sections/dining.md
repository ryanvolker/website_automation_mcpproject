# Dining (hub, venue)

Captured 2026-11-05 (desktop 1440, mobile 390). Raw: `captures/dining*` (not in git). Crawl data: `dining.json`; venues by ship: `fleet-map.json` → `venueIndex`.
Samples: `/cruise-dining` (hub, full) · `/cruise-dining/kai-sushi` (**404**) · `/cruise-dining/specialty-restaurants/sabatinis-italian-trattoria`.

## Purpose
Show restaurants, bars and drink packages across the fleet, and which ships have each venue.

## URL pattern & samples
`/cruise-dining`, `/cruise-dining/{venue}` (62), `/cruise-dining/{group}/{venue}` (3).

## Layout (top → bottom)
**Hub**: hero h1 → sticky section menu → "quality in every bite" with facts tables → experiences → "dine how you want" → email sign-up → **venue tabs** (complimentary · casual · specialty · experiential) over venue carousels → mixology and artist collaborations → FAQ accordion → footer.

**Venue page**: hero h1 (a descriptive line, not the venue name) → description h2 + text + images → "more food & dining" links → email sign-up → footer.

**Missing venue** (`kai-sushi`): 404 page ("page not found", top 10 recommendations), though the URL is still in the sitemap.

## Components used
Full global header · hero · sticky section menu · facts table · tab set · venue carousel · FAQ accordion · email sign-up · related links · 404 page.

## Data fields
| Field | Example | Source |
|---|---|---|
| Venue name, type (complimentary / specialty / bar), description, images | | page HTML (`dining.json`) |
| Ships with the venue | | ship pages (`fleet-map.json` → `venueIndex`, 83 venues) |
| Deck | | deck plans via `fleet-map.json` |
| Cover charge, menus | | page text (not structured) |

## Interactions & states
Tabs, carousels, FAQ accordion.

## Links out to
Venue pages · ship pages · drinks packages · packages comparison.

## Notes for our build
- **Keep:** a hub with tabs by venue type; a page per venue; "available on" ship list per venue.
- **Fix in ours:** venue pages need the venue name as h1; show which ships have it (the site doesn't, so we built that list from ship pages); remove dead venue URLs from the sitemap.
