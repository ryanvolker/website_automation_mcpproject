# Deck plan

Captured 2026-11-05 (desktop 1440, mobile 390). Raw: `data/sites/princess.com/captures/deck-plan*/` (not in git). Full data for all 17 ships: `deck-plans.json`, `fleet-map.json`.
Samples: `SA` (one layout) · `GP` (two layouts, asks for sailing date first) · `SU` (newest ship).

## Purpose
Shows one ship deck by deck: where cabins and public rooms are, and details for any cabin (category, size, balcony, berths, accessibility). Used to choose or check a cabin location before or during booking.

## URL pattern & samples
- `/deckPlans.do?shipCode={XX}` (18 in the sitemap, 17 ships). Legacy `.do` page from the older site platform.
- Linked from ship pages, the footer ("Deck plans"), and cruise detail / booking.

## Layout (top → bottom)
**Desktop**
1. **Legacy header**: the old site navigation (plan a cruise · on board · destinations · booked guests · help), not the current 4 mega-menus. Logo bar with offer sign-up, log in / create account, search.
2. Grey title bar: "{ship} Deck Plan" (h1).
3. Two columns on a dark full-width background:
   - **Left panel:** "find your stateroom" (room number box + Find) · ship side profile with the current deck highlighted · deck dropdown ("Deck 7 – Promenade") · two tab-like buttons, **Staterooms** | **Public areas**, with a list for the current deck · accessible routes link and PDF.
   - **Right:** deck drawing (image map with clickable cabins and rooms), with a "skip cabin selection" link for keyboard users.
4. Disclaimer line with a contact link.
5. Legacy footer (social links, 8 link groups, older layout than the main site's footer).

**Ships with two layouts (`GP`):** before the plan, a question ("when do you plan to sail?") with two links, e.g. "sailing between now and {date}" / "sailing after {date}". Choosing one loads that layout.

**Mobile:** not responsive. The desktop layout is scaled down to fit 390 px, so text is tiny and the drawing needs zooming.

## Components used
See [components.md](../components.md): legacy header · legacy footer · room search box · ship profile deck indicator · deck dropdown · two-way toggle (staterooms / public areas) · deck drawing (image map) · layout chooser (date links).

## Data fields
| Field | Example | Source (DOM / API) |
|---|---|---|
| Ship code, name | `SA` | URL; h1 |
| Layout version + date range | `v0`; "after April 10, 2027" | layout chooser links (`data-version`, date); `resdb/p1.0/ships` → `versionDates` |
| Decks | number, name (`7`, Promenade) | `static/learn/ships/{code}/deck_plans/v{N}/{code}_deck.xml` → `<Deck>` |
| Public rooms per deck | names | deck XML → `<PublicRoom>` |
| Cabin categories | code, type, meta (I/O/B/M/S) | deck XML → `<Category>` |
| Cabins per deck | number, category, zone, sq ft, balcony sq ft, berths, wheelchair, connecting, notes | `getDeckJSON.do?shipCode=&version=&deck=` (needs the XHR header) |
| Navigation menus, footer | link groups | `static/html/global/nav/wc/top-nav.json`, `footer.json`, `copyright.json` |

Fleet totals (from our full crawl): 17 ships, 27 layouts, 27,495 cabins, 711 wheelchair-accessible.

## Interactions & states
- **Deck dropdown** switches the drawing and lists. The default deck is a public deck (deck 7 on SA).
- **Staterooms / Public areas** toggle. On a deck with no cabins, "Staterooms" still looks selected while the list shows public rooms.
- **Find your stateroom**: type a cabin number to jump to its deck and highlight it.
- **Clicking a cabin** on the drawing shows its details (data from `getDeckJSON.do`).
- **Layout chooser** for ships with an upcoming refit (9 of 17 ships at crawl time).
- **Error state:** without a language header (some bots and monitors), two-layout ships return "Service temporarily unavailable". Browsers are fine.

## Links out to
Accessible route maps (PDF) · contact page · legacy navigation targets · log in / sign up.

## Notes for our build
- **Keep:** cabin search by number; deck switcher with a side-profile indicator; separate lists for cabins and public rooms; per-cabin details (size, balcony, berths, accessibility, connecting); layout versions by date.
- **Rebuild:** this is the one template still on the old platform. It has its own header, footer and navigation, and isn't responsive. Ours should use the shared header and footer and work on phones (vertical deck drawing, tap a cabin for a details sheet).
- **Fix in ours:**
  - Use real tabs (here the two buttons don't expose a selected state; the deck dropdown's text reads "undefined" to screen readers).
  - Use one source for room names: the list misspells a restaurant ("Makato Ocean") that the drawing spells correctly.
- **Data:** serve decks, rooms and cabins from one JSON API per ship and layout, instead of an XML file plus a per-deck call.
