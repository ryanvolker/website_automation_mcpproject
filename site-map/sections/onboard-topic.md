# Onboard topic

Captured 2026-11-05 (desktop 1440, mobile 390). Raw: `captures/onboard-topic*` (not in git).
Samples: `/ships-and-experience/onboard-experience` (overview, full) · `/onboard-experience/entertainment` · `/onboard-experience/activities/casino`.

## Purpose
Sell life on board by theme (dining, entertainment, rooms, wellness, families, activities, casino, celebrations, guest tech) across the whole fleet.

## URL pattern & samples
`/ships-and-experience/onboard-experience[/{topic}[/{sub-topic}]]`, plus `/ships-and-experience/celebrations/…` and the guest-tech pages (~85). 20 of them are casino promotion pages.

## Layout (top → bottom)
**Overview**: hero h1 → sticky section menu (dining & drinks, entertainment, staterooms, wellness, families, destinations, activities) → one band per theme (capitalised label + h2 + text + carousel or video) → email sign-up → footer.

**Topic page** (entertainment): hero h1 + facts table → section bands (live music, piazza, movies, games, magic, comedy), each with h2, text, image → email sign-up → footer.

**Casino**: hero → "featured slots" and "featured games" carousels → destinations band → loyalty tiers table → invitational offers tabs → casino hosts carousel → FAQ accordion → "you may also like" → footer.

Mobile: section menu becomes a select; bands stack.

## Components used
Full global header · hero · sticky section menu · theme band · content carousel · video block · facts / tiers table · tab set · FAQ accordion · email sign-up form · global footer.

## Data fields
Topic, bands, venues, shows, tiers: page HTML (CMS). No catalogue data.

## Interactions & states
Section menu, carousels, tabs, videos (4 on the overview), FAQ accordion.

## Links out to
Ship pages · dining pages · packages · casino promotion pages · search results.

## Notes for our build
- **Keep:** one theme page per topic; overview with a band per theme.
- **Simplify:** casino promotions (20 pages) as one list page with entries, not separate pages.
- **Fix in ours:** theme labels in capitals are marked as separate headings ("DINING & DRINKS" h2 followed by another h2). Use one heading per band.
