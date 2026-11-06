# Help pages (FAQ, plan / policy)

Captured 2026-11-05 (desktop 1440, mobile 390). Raw: `captures/faq*`, `captures/plan-policy*` (not in git). Crawl data: `help.json`.
Covers page types 23 and 24 in `01-page-types.md`.
Samples: `/faq` (full) · `/faq/pre-cruise` · `/faq/additional-faq` · `/plan/ezair` (full) · `/plan/best-price-guarantee` · `/why-princess/new-to-cruising`.

## Purpose
Answer pre-booking and pre-sailing questions (documents, packing, payments, cancellations, flights, insurance, first cruise) and promote add-on services.

## URL pattern & samples
`/faq[/{category}[/…]]` (9) · `/plan/{topic}[/…]` (15) · `/why-princess/{topic}` (5).

## Layout (top → bottom)
**FAQ hub**: h1 → section menu (pre-cruise, onboard, post-cruise, land tours, common topics) → one block per category (h2 + topic tables of links) → "you may also like" carousel → email sign-up → footer.

**FAQ category** (`/faq/pre-cruise`): h1 → section menu (prepare, health & accessibility, before you leave, transport, packing, excursions) → per section h2 + **accordion of topics** (each topic expands to a long answer, often with tables) → footer. The page loads slowest of this group (3 s).

**Plan / policy pages** vary:
- Service page (`/plan/ezair`): section menu → explainer → benefits → help → **a second h1 for a new-ship promo** → deals → footer.
- Policy page (`/plan/best-price-guarantee`): h1 → terms → FAQ accordion.
- Guide (`/why-princess/new-to-cruising`): h1 → section menu → why cruise (tables) → tips → what's included carousel → experiences carousel → FAQ tabs.

## Components used
Full global header · sticky section menu · link tables · FAQ accordion · tab set · content carousel · email sign-up.

## Data fields
Questions, answers, policy text: page HTML (`help.json`). No catalogue data.

## Interactions & states
Accordions (one or several open), tabs, carousels.

## Links out to
Booking site (check-in, manage booking) · legal pages · search results · flights and insurance.

## Notes for our build
- **Keep:** FAQ by trip stage (pre-cruise, onboard, post-cruise); answers as accordions with deep links.
- **Fix in ours:** one h1 per page (`/plan/ezair` has a second h1 for a promo); buttons need readable names (several have slug names such as "explore-all-shore-excursions").
- **Simplify:** one FAQ store reused on destination, deal and help pages (each page currently has its own FAQ copy).
