# Progress

Last updated: 2026-11-05

## Where existing work lives
Work done before `CLAUDE.md` was added is stored as crawl data, not as section files yet.

| Topic | Existing file(s) | Section file |
|---|---|---|
| Home page, search form codes, menus | `data/sites/princess.com/home.json`, `home.aria.yml` | not yet |
| Destination pages (537) | `destinations.json` | not yet |
| Ship pages (17) | `ships.json` | not yet |
| Deck plans, staterooms, venues by ship | `deck-plans.json`, `fleet-map.json` | not yet |
| Dining pages | `dining.json` | not yet |
| Deals pages | `deals.json` | not yet |
| Help / FAQ pages | `help.json` | not yet |
| Shore excursion ports (~470) | `excursions.json` | not yet |
| Sitemap and robots.txt | `sitemap.json` | not yet |
| Services and APIs behind the site | `services.json`, `api-health.json` | not yet |
| Account pages (signed in) | `account-check-*.json` (not in git) | not yet |
| Cruise search results | `search-scan*.json` (not in git) | in progress |

## Done
- Crawl data for all sections listed above (see the table).
- **Phase 1: Inventory**: `00-sitemap.md` (2026-11-05). Waiting for the user's review.
- **Phase 2: Page types**: `01-page-types.md` (2026-11-05). 28 templates with samples and a Phase 3 order. Waiting for the user's review.

## In progress
- **Cruise search results** (`/cruise-search/results/`). Done so far: full list of cruise cards, the services the page calls, and the filter buttons. Still to do: open each filter menu, mobile layout, then write `sections/search-results.md`.

## Next
1. User reviews `00-sitemap.md` and `01-page-types.md`.
2. Phase 3–4: one template at a time in the priority order in `01-page-types.md`: search results (part done), cruise detail, deck plan, home, then priority 2. Write each `sections/<type>.md` and have the user review it before the next.
3. Build `components.md` and `data-model.md` as the section files are written.

## Not committed yet
Nothing. Committed 2026-11-05: CLAUDE.md, site-map/ (Phases 1–2), scan-search-page.mjs. Search scan results stay local by design.

## Open questions
- Is it intended that the header's "find a cruise" button shows only 577 of 1,010 sailings?
- What do the search link's `duration=1,2,3` and `mrch=1` parameters do?
- Answered 2026-11-05: the unfiltered search lists 1,010 sailings, all collected, and all 577 from the filtered link are among them. `duration=1,2,3` appears to keep roughly 6–23 day cruises; confirm by opening the Date & Length filter.
