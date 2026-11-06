# Destinations hub

Captured 2026-11-05 (desktop 1440, mobile 390). Raw: `captures/destinations-hub/` (not in git).
Sample: `/cruise-destinations`.

## Purpose
Entry point for browsing by place: shows every destination as an image card and sends visitors to the region pages.

## URL pattern & samples
`/cruise-destinations` (one page).

## Layout (top → bottom)
1. Full global header.
2. Hero image with h1 ("Cruise destinations").
3. "Where will you explore?" intro with 3 feature images and a button.
4. Email sign-up form.
5. "All destinations": 6 large image cards (top regions) + "view all" buttons.
6. "Explore destinations around the world": carousel of about 29 destination cards (image + name), with slide controls.
7. Credit card promo, "you may also like" links, second email sign-up, global footer.

Mobile: cards stack in one column; the carousel is swipeable.

## Components used
Full global header · hero · email sign-up form · image card grid · destination card carousel · promo band · link row · global footer.

## Data fields
| Field | Example | Source |
|---|---|---|
| Destination name, image, link | region name → `/cruise-destinations/{region}-cruises` | page HTML |

No catalogue data is loaded (only locale and agency calls).

## Interactions & states
Carousel prev / next. Nothing else interactive beyond links and the sign-up form.

## Links out to
Region pages (37) · deals · new-to-cruising and dining pages.

## Notes for our build
- **Keep:** big image cards for top regions; a full list for the rest.
- **Simplify:** show all regions in one grid instead of a grid plus a 29-card carousel; a carousel hides most destinations.
- **Fix in ours:** two identical email forms on one page.
