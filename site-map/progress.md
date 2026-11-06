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
| Cruise detail | `captures/cruise-detail*/` (not in git); live tool `princess.mjs details` | `sections/cruise-detail.md` |

## Done
- Crawl data for all sections listed above (see the table).
- **Phase 1: Inventory**: `00-sitemap.md` (2026-11-05).
- **Phase 2: Page types**: `01-page-types.md` (2026-11-05). 28 templates with samples and a Phase 3 order. 
- **Phase 3: Search results**: `sections/search-results.md` (2026-11-05). Also started `components.md` and `data-model.md`. Reviewed (user said continue).
- **Phase 3: Cruise detail**: `sections/cruise-detail.md` (2026-11-05).
- **Phase 3: All remaining templates** (2026-11-05): 17 more section files covering page types 1, 4–28 (see the table in `01-page-types.md`). The user asked for these in one batch without a review stop per template. `components.md` (about 60 components) and `data-model.md` (ship, deck, cabin, venue, deal, content) updated. Captures: `capture-batch.mjs` (66 pages in 21 min).
- **Phases 1–4 complete.** Every page type has a section file.

## In progress
- Nothing.

## Next
1. User reviews the section files (any order). Fixes go into the section file, then `components.md` / `data-model.md` if shared.
2. Optional: a cross-cutting `issues.md` collecting every "fix in ours" and site bug found (now spread across section files).
3. Optional: write or update skills for sections that don't have one yet (per `CLAUDE.md` → Skills).

## Not committed yet
Nothing (committed with Phase 3 completion).

## Open questions
- Is it intended that the header's "find a cruise" button shows only 578 of 1,009 itineraries?
- What does `mrch=1` do, and how do `duration` codes map to the 4 length buckets? (`1,2,3` still returned 16–23 day cruises.)
- Are the two versions of the search page an A/B test?
- Search shows a sailing as "Sold Out" when only the chosen cabin type (interior by default) is sold out, e.g. `6630N` has suites to balconies on sale. Report it?
- What does the "accessible stateroom" checkbox on cruise detail change?
- Sitemap lists pages that return 404 (`/cruise-dining/kai-sushi`, a blog video). How many more? (Run the link check against the sitemap.)
- `/legal/passage-contract` and `/legal/passage_contract` are duplicates (both 200).
- Where do excursion ratings come from? They aren't in the excursions call.
- Correction 2026-11-05: search counts are **itineraries** (1,009), not sailings. There are 2,172 sailings; each card's date dropdown holds them.
