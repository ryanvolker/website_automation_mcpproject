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
| Cruise search results | `search-scan*.json`, `captures/search-results/` (not in git) | `sections/search-results.md` |

## Done
- Crawl data for all sections listed above (see the table).
- **Phase 1: Inventory**: `00-sitemap.md` (2026-11-05).
- **Phase 2: Page types**: `01-page-types.md` (2026-11-05). 28 templates with samples and a Phase 3 order. 
- **Phase 3: Search results**: `sections/search-results.md` (2026-11-05). Also started `components.md` and `data-model.md`. **Waiting for the user's review.**

## In progress
- Nothing. Paused for review of `sections/search-results.md` before the next template.

## Next
1. User reviews `sections/search-results.md`.
2. Phase 3–4: next template is **cruise detail**, then deck plan, home, then priority 2 (order in `01-page-types.md`). Write each `sections/<type>.md` and have the user review it before the next.
3. Build `components.md` and `data-model.md` as the section files are written.

## Not committed yet
`site-map/sections/search-results.md`, `components.md`, `data-model.md`, `packages/princess/capture-template.mjs`, `.gitignore` (captures). Captures and scans stay local by design.

## Open questions
- Is it intended that the header's "find a cruise" button shows only 578 of 1,009 itineraries?
- What does `mrch=1` do, and how do `duration` codes map to the 4 length buckets? (`1,2,3` still returned 16–23 day cruises.)
- Are the two versions of the search page an A/B test?
- Correction 2026-11-05: search counts are **itineraries** (1,009), not sailings. There are 2,172 sailings; each card's date dropdown holds them.
