# Simple info page (company, careers, agent finder)

Captured 2026-11-05 (desktop 1440, mobile 390). Raw: `captures/info-page*` (not in git).
Samples: `/company-information/about-princess` (full) · `/careers` · `/find-travel-agents/`.

## Purpose
Company and support pages: about, careers, finding a travel agent, brochures, accessibility.

## URL pattern & samples
`/company-information/{topic}`, `/careers[/…]`, `/find-travel-agents/`, `/brochures`, `/accessibility-at-sea` (~20).

## Layout (top → bottom)
- **About**: h1 → section menu (promise, why us, destinations, life on board, set sail) → content bands (h2 + text + tables + button) → sign-up modal → footer.
- **Careers**: video hero (pause, full-screen) with h1 and "search jobs" → section menu (culture, life, benefits, career paths) → bands with buttons to job searches (sea, land, Alaska) → footer.
- **Agent finder**: h1 → "city or ZIP" field + search → filter group → results. Loads fastest of all templates (0.7 s).

## Components used
Full global header · hero (image or video) · sticky section menu · content band · search field with filters · email sign-up modal · global footer.

## Data fields
Page HTML; agent finder results come from a lookup by city / ZIP (not run: read-only).

## Interactions & states
Section menu, video controls, sign-up modal (opens on the about page), agent search (not submitted).

## Links out to
Job sites, ship and destination pages, search results.

## Notes for our build
- **Keep:** one content-band template for company pages.
- **Fix in ours:** section labels in capitals marked as their own headings (careers); don't open a sign-up modal on an about page.
