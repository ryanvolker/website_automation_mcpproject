# Stateroom type

Captured 2026-11-05 (desktop 1440, mobile 390). Raw: `captures/stateroom-type*` (not in git).
Samples: `/staterooms` (overview, full) · `/staterooms/suites` · `/staterooms/mini-suites`.

## Purpose
Explain cabin types (interior → suite) and the premium suite collections so visitors can choose what to book.

## URL pattern & samples
`/staterooms` and `/staterooms/{type}` (7), plus two older copies under `/ships-and-experience/ships/staterooms/{type}`.

## Layout (top → bottom)
**Overview**
1. Full global header; hero with h1; sticky section menu (room types, amenities, gallery, suite collections, location, FAQs).
2. 4 benefit blocks (sleep, amenities, accessibility, room configurations).
3. **Room type carousel**: 5 cards (suite, mini-suite, balcony, oceanview, interior) with a comparison table.
4. One feature block per premium type (suite, mini-suite), new-ship cabins.
5. Suite collections: benefits list per collection (included packages, private restaurant, lounge).
6. **Pick a location**: tabs (forward · mid-ship · aft).
7. FAQ accordion; global footer.

**Type page (suites, mini-suites)**
Hero → 3 benefit points → collection explainer → one block per sub-type (h2/h3 + image + size) → "what you get" table → "where will you sail" region cards → reviews → FAQ → "you may also like" other cabin types.

Mobile: section menu becomes a select; carousels swipe.

## Components used
Full global header · hero · sticky section menu · benefit blocks · room type carousel · comparison table · feature block · tab set · region cards · reviews · FAQ accordion · related cards.

## Data fields
| Field | Example | Source |
|---|---|---|
| Cabin type, sub-types | suite → sky / grand / vista / … | page HTML; codes in `resdb/p1.0/metas` (5 types, sub-types per type) |
| Sizes, amenities, included perks | | page HTML |
Availability and price aren't on these pages (no catalogue calls).

## Interactions & states
Sticky section menu, carousels (cloned cards read twice), tabs, FAQ accordion.

## Links out to
Search results filtered by cabin type (`meta=`) · ship pages · packages · deck plans.

## Notes for our build
- **Keep:** overview + one page per type; a comparison table; "where will you sail" links into pre-filtered search.
- **Simplify:** drop the duplicate URLs under `/ships-and-experience/ships/staterooms/`.
- **Fix in ours:** heading levels are mixed (sub-types switch between h2 and h3 on the same page; a section label in capitals is its own heading); carousel clones.
