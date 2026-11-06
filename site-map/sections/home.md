# Home

Captured 2026-11-05 (desktop 1440, mobile 390). Raw: `data/sites/princess.com/captures/home/` (not in git). Earlier map: `home.json`, `home.aria.yml`.
Sample: `/` (one page).

## Purpose
Front door and merchandising page: the current sale, a quick cruise search, deal rows, departure-port shortcuts, ships, destinations and reasons to book. Nearly every block ends in a pre-filtered search results link.

## URL pattern & samples
`/` only.

## Layout (top → bottom)
**Desktop**
1. Full global header: utility row (subscribe, phone, search, manage booking dropdown, log in / create account) + main row (logo, 4 mega-menus, find-a-cruise button).
2. **Sign-in prompt** popover under the header for signed-out visitors (three benefits, log in, create account with a sign-up incentive, close).
3. **Hero:** full-width autoplay video (pause, mute, full-screen controls) with an overlay card: countdown ("sale ends in" hrs / min / sec), sale headline, two big numbers (% off + instant savings), an extra perk line, primary button.
4. Promo strip (one line + button).
5. **Find a cruise:** three dropdowns (destination, departure port, month) + search button.
6. Sale explainer block with feature cards (ship news, new suites).
7. **Deal rows:** "exclusive offers", last minute, extra guests free, a region deal, early booking. Each is a heading, image card(s) and a "view cruises" button.
8. **Find cruises near you:** carousel of departure-port cards (port image + "view cruises from {port}"). Ports are ordered by the visitor's location.
9. Email sign-up form (email, first name, last name, sign-up incentive).
10. Fare packages explainer (bundled fares).
11. Ships row (4 ship cards), destinations row (3 cards + view all).
12. "Why us" carousel (dining, excursions, casino, guest tech).
13. Services carousel (pay later, app, insurance, credit card).
14. Second email sign-up form, then global footer.

**Mobile:** header becomes logo + menu button (menus, search and manage booking move into the menu). Hero card stacks over the video. Carousels become swipeable. The search box stacks its three dropdowns.

## Components used
See [components.md](../components.md): full global header · mega-menu · manage booking dropdown · sign-in prompt popover · video hero with countdown · promo strip · quick search box (3 dropdowns) · deal row · image card · content carousel · departure-port carousel · email sign-up form · ship card · destination card · global footer.

## Data fields
| Field | Example | Source (DOM / API) |
|---|---|---|
| Search options (regions, ports, months) | 15 regions, 39 ports, months on sale | `resdb/p1.0/trades`, `/ports`, `/products`; mapped in `home.json` → `searchForm` |
| Deal cruises per row | itineraries + sailings | `resdb/p1.0/deals` (3 calls, one per row) |
| Sale countdown, headline, perks | end time; % off; savings | page content (sale data: `sale-names.json` start/end dates) |
| Nearby departure ports | ordered list | visitor location (`guest/p1.0/locale`) |
| Access tokens | `db_token`, `cloud_token`, `expires_in` | `resdb/p1.0/dbtoken`, issued to anonymous visitors |
| Menus | link groups | page HTML (see `00-sitemap.md`) |

## Interactions & states
- **Mega-menus** (desktop): Destinations (destinations, cruise types, excursions), Ships (ships, staterooms, onboard), Discover (about cruising, essentials, why us), Deals (deals, packages, loyalty). Each opens a 3-column panel. The deals menu lists the current sales by name.
- **Manage booking** dropdown: booking details, check-in, payment, packages, excursions, spa, flights & transfers (all go to the signed-in booking site).
- **Search** opens an overlay search box.
- **Countdown** ticks live; the hero video can be paused and muted.
- **Sign-in prompt** shows on load for signed-out visitors and can be closed.
- **Carousels:** prev / next buttons. Cloned slides are read out twice by screen readers (each carousel card appears twice in the page structure).
- Quick search builds the results URL as you choose (e.g. `?trade=A&date=0627&startPort=SEA`).

## Links out to
Search results (almost every block, pre-filtered) · deal pages · ship pages · destination pages · packages page · app, insurance, payment and credit card pages · booking site (manage booking, log in).

## Notes for our build
- **Keep:** quick search box at the top; sale countdown; deal rows that each end in a pre-filtered search; departure ports ordered by the visitor's location; email sign-up with an incentive.
- **Simplify:** one email sign-up (the page has two identical forms); fewer carousels.
- **Fix in ours:**
  - Duplicate headings: "Sail from {port}" appears twice.
  - Carousel clones are exposed to screen readers. Hide them (`aria-hidden`) or don't clone.
  - A port name is misspelled in a button label ("Puero Rico").
  - Don't auto-open a sign-in popover over the hero on first visit.
- **Check:** the page gives database and cloud tokens to anonymous visitors (`dbtoken`). Make sure that's intended and the tokens are tightly scoped.
