# Cruise detail (itinerary)

Captured 2026-11-05 (desktop 1440 × 900, mobile 390 × 844). Raw captures: `data/sites/princess.com/captures/cruise-detail/` and `cruise-detail-world/` (not in git).
Samples: `U648` (7-day Caribbean, on sale, 5 sailing dates) · `N726` (11-day Europe) · `6702A` (129-day world cruise, one date) · `6630N` (sailing with cheaper cabins sold out) · `ZZZ99` (invalid code).

## Purpose
The page for one sailing: what it costs in each cabin type, the day-by-day route, excursions at each port, the ship, and the step into booking. Every search card, deal page and featured-cruise link leads here.

## URL pattern & samples
- `/cruise-search/details/?voyageCode={code}` redirects to `/itinerary-details/?voyageCode={code}`. Both forms are linked from the site.
- Optional `#days-and-ports` anchor (search card port links). Search links can also carry `fareType` and `meta` (cabin type).
- The sitemap lists 85 of these; about 2,170 sailings exist live.

## Layout (top → bottom)
**Desktop**
1. Global header **with** the full mega-menu (unlike search results): utility row (subscribe, phone, search, manage booking, log in / create account) and main row (logo, 4 menus, "find a cruise" button).
2. "Back to search results" link.
3. Itinerary title as the h1 (large display serif).
4. Two columns: hero image (left) | booking panel (right):
   - pills: "what's included" (neutral), deal badge(s) (outlined, coloured), share
   - sailing dates + **Change date** dropdown; ship name with icon
   - **Rooms & guests** dropdown + "accessible stateroom" checkbox
   - **Cabin type selector:** 5 boxes in a row (suite → interior), each with its price or "Sold Out"; one is selected
   - "From {cabin}" price with old price struck through; price note
   - **Continue** button (starts booking; not clicked)
5. In-page jump nav: Itinerary · Excursions · Ship · Flights.
6. **Itinerary:** summary facts (departure port, days, ports, sea days, scenic cruising days, ship), a map thumbnail that opens a map dialog, then one row per day (day number, port or "At Sea", date, arrive–depart times).
7. **Port spotlight:** image, port name, departure time, short description, "learn more".
8. **Featured excursions:** a port dropdown ("Day N — Port") and a carousel of excursion cards (title, day + port, rating out of 5 with review count, duration, activity level, view details).
9. **Ship & experience:** tabs (the ship · dining · bars · activities · entertainment); each is a carousel of venue cards (image, name, short text). Counter "01 / 14" with prev/next.
10. Flights promo band (image, one line, "search for flights").
11. Footnotes (fare and price notes), then global footer.
- A sticky **booking summary** bar (guests, cabin, price, continue) appears once the booking panel scrolls out of view.

**Mobile**
- Header: logo and menu button only.
- Everything stacks in one column: title, image, pills, dates, ship, rooms & guests, cabin selector, price, continue.
- **Change date** opens a full-screen "Select date" sheet with cancel / apply.
- Ship tabs and the jump nav are shortened.

## Components used
See [components.md](../components.md): global header (full) · back link · pill buttons · deal badge + offer details dialog · "what's included" dialog · share button · date dropdown / date sheet · rooms & guests popover · cabin type selector · price block · sticky booking summary · jump nav · itinerary summary facts · day list · map dialog · port spotlight · excursion card carousel · tabbed content carousel · promo band · footnotes · global footer.

## Data fields
| Field | Example | Source (DOM / API) |
|---|---|---|
| Itinerary (product) id | `CFR07O` | `pricing/v1/cruises/{code}` → `products[].id`; also the map image's alt text |
| Sailing code | `U648` | URL `voyageCode` |
| Title | `7-Day …` | h1 (`products` list → name) |
| Sail / return dates | Sun, Dec 13 – Sun, Dec 20, 2026 | `<time>` in the booking panel |
| Other dates for this itinerary | 5 dates with "from" price | Change date listbox |
| Ship | name | booking panel; `resdb/p1.0/ships` |
| Cabin type prices | suite … interior, or "Sold Out" | `pricing/v1/cruises/{code}` → `fares[].metas[]`, `.categories[]` (21 categories for a 7-day sailing) |
| Lowest price + was price | `$399` / `$1,298` | group label "From {cabin} current price … previous price …" |
| Fare types | standard and bundled | `pricing.fares[]` (2 fare types) |
| Fees, taxes | `103`, `107` | `pricing.rcfe`, `.igvt` |
| Decks with cabins | id `17`, name | `pricing … decks[]`, `deck-groups[]` (used later in booking) |
| Itinerary days | day, port id, arrive / depart date + time, boarding time, pier | `resdb/p1.0/itineraries` → `cruises[].itineraries[]` (`dayIn` starts at 0) |
| Ports | id, name, country, embark / disembark | `itineraries` → `ports[]` |
| Port content | name, page links, gallery, points of interest | GraphQL `master-data-itinerary-ports;portCode={id}` |
| Sea-day content | per ship | GraphQL `master-data-itinerary-at-sea;shipCode={code}` |
| Excursions | id, name, duration, price, activity level, accessibility, points of interest | `db-excursion/p1.0/ports/{port}/excursions` |
| What's included / add-ons | lists | `cruises/{code}/special-service`, static HTML fragments |
| Deal | name, terms, details | `sale-names.json`, `static/.../promotions/{sale}/offer_details_*.html` |
| Ship & experience tabs | venue cards | `bin/princess/experiencefragment/ship.html` (server-rendered fragment) |

## Interactions & states
- **Change date:** a listbox of every sailing of this itinerary with date, ship and "from" price. Choosing one changes the whole page. Single-sailing itineraries (world cruise) have no Change date.
- **Rooms & guests:** popover with +/− guests (1–4) per room, **Add room** and **Apply**. While it's open, Continue is disabled.
- **Cabin type selector:** choosing a box updates the price block and sticky summary ("Summary updated: 2 guests, Interior selected" is announced to screen readers).
- **Accessible stateroom** checkbox (not toggled in capture).
- **Dialogs:** what's included (included items, then optional add-ons) · deal details (perks-by-cabin table) · map (image + close).
- **Featured excursions:** port dropdown filters the carousel.
- **Sold out:** a cabin box shows "Sold Out" instead of a price, and the "From" price moves to the cheapest available cabin. Sailing `6630N` has suites to balconies on sale but oceanview and interior sold out. **The search page shows this sailing as "Sold Out"**, because search only checks the cabin type picked there (interior by default).
- **Loading:** first content in 2–5 s; prices, then itinerary, then excursions and ship content. Fully loaded about 10 s. The page also downloads the full catalogue (`products`) and sale lists again.
- **Invalid code** (`ZZZ99`): HTTP 200, empty title, empty price boxes, disabled Continue, and an unrelated ship's content in "Ship & experience". There's no "not found" message.
- **Two versions in use:** the Continue button reads "Continue with 2 guests" on some loads and "CONTINUE" on others (matches the two search page versions).

## Links out to
- Booking flow (Continue; not followed: read-only).
- Back to search results.
- Excursion detail pages (`/shore-excursions/{port}/{excursion}`) and port pages.
- Ship and venue pages (from the ship tabs).
- Flights page.
- Login (save / account), share.

## Notes for our build
- **Keep:** cabin type selector with every price visible at once; change date inside the page; rooms & guests before choosing; day list with arrive / depart times; per-port excursions; sticky booking summary; sold-out shown per cabin type.
- **Simplify:** one redirect-free URL per sailing. Load only this sailing's data; don't download the whole catalogue on a detail page.
- **Fix in ours:**
  - Return a real "sailing not found" page (404) for unknown codes.
  - Search results should say "Interior sold out" (or show the next cabin type), not "Sold Out", when other cabins are available.
  - Keep accessibility labels in step with what's shown: list items say "Day 0" while the heading says "Day 1", and the excursion port dropdown counts port visits ("Day 5") rather than cruise days (day 8).
  - The map's alt text exposes an internal code ("Land map of CFR07O"); describe the route instead.
- **Watch:** prices aren't always in cabin order (sailing `N726`: oceanview $2,424 above balcony $2,399). Our UI shouldn't assume they are.
- **Open:** what the "accessible stateroom" checkbox changes (prices, availability or both).
