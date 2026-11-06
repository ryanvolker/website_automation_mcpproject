# Deals (landing, deal detail)

Captured 2026-11-05 (desktop 1440, mobile 390). Raw: `captures/deals-landing/`, `captures/deal-detail*` (not in git). Crawl data: `deals.json`.
Covers page types 17 and 18 in `01-page-types.md`.
Samples: `/cruise-deals-promotions` (landing, full) · `/early-booking-bonus` (full) · `/last-minute-cruise-deals` · `/plus-premier-cruise-packages`.

## Purpose
Collect current sales and fare programs and send visitors to the cruises each one applies to.

## URL pattern & samples
- Landing: `/cruise-deals-promotions`
- Deal: `/cruise-deals-promotions/{deal}` (34) and `/private-sale/{sale}` (3); terms sub-pages under some deals.

## Layout (top → bottom)
**Landing**
1. Full global header; hero h1; sticky section menu.
2. Deal rows, each a heading + carousel of **deal cruise cards**: early booking, Caribbean, last minute, Alaska, "destinations with deals", "nearby cruises" (ordered by location).
3. Email sign-up; packages deals; new-ship promo; "more ways to save" (program cards: military, teachers, residents, payment plans…).
4. FAQ accordion (5 long questions); footer.

**Deal detail** (varies more than other templates):
- Sale page (early booking): hero (no h1), region rows with comparison tables, tabs for more sailings, carousels.
- Last minute: h1, intro table, email sign-up, nearby cruises carousel, deals by destination table, FAQ.
- Packages: h1, explainer, comparison table, videos, one FAQ.

## Components used
Full global header · hero · sticky section menu · **deal cruise card** (title, ship, date, price, deal) · deal row carousel · program cards · comparison table · tab set · video block · FAQ accordion · email sign-up.

## Data fields
| Field | Example | Source |
|---|---|---|
| Deal cruises per row | itinerary, sailing, price | `resdb/p1.0/deals` (landing) |
| Sale name, dates, code | | `sale-names.json` (82 sales), search links (`promos=`) |
| Program rules | | page HTML and terms pages |

The cruise cards in deal carousels load from `resdb/p1.0/deals` and are buttons, not links, so crawlers and our earlier crawl couldn't follow them.

## Interactions & states
Carousels (prev / next), tabs, FAQ accordion, videos.

## Links out to
Search results with `promos=` · cruise detail · terms pages · program pages.

## Notes for our build
- **Keep:** each deal row ends in a pre-filtered search; programs (military, teacher…) as cards; terms on their own page.
- **Fix in ours:** every deal page needs an h1 (early booking has none); deal cruise cards should be real links; one sale data source for badges, rows and terms.
- **Track:** a "deals to cruises" map would record which sailings each deal row shows (the cards come from `resdb/p1.0/deals`).
