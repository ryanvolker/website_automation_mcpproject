# Site search

Captured 2026-11-05 (desktop 1440, mobile 390). Raw: `captures/site-search/` (not in git). The header search overlay was captured with the home page.
Samples: `/search` · header search overlay.

## Purpose
Search the site's content (articles, pages, FAQs), separate from cruise search.

## URL pattern & samples
`/search` (and `/search/editorial-search`). Opened from the header search button, which shows an overlay with a search box.

## Layout (top → bottom)
1. Global header; search box.
2. Left: **facets** ("article types", with a filter box for facet values).
3. Right: "Results 1–10 of 7,417", **sort** dropdown, results (title, snippet, link), **load more**.
4. Email sign-up; footer.

## Components used
Global header · search overlay · facet list with filter · sort select · result list · load more · email sign-up.

## Data fields
Result title, URL, snippet, article type: external site-search service (not traced). 7,417 indexed items with an empty query.

## Interactions & states
Type to search, facet filter, sort, load more. Empty query shows everything.

## Links out to
Any content page.

## Notes for our build
- **Keep:** facets by content type; load more.
- **Add in ours:** when a query looks like a cruise search (a port, region or ship), offer the cruise search as the first result.
