# Shared components

Components seen across page types. Each entry: what it is, where it's used, and notes for our build.
Started 2026-11-05 from the search results page; extended as each section is mapped.

| Component | What it is | Used on | Notes for our build |
|---|---|---|---|
| Global header | Two forms. **Full** (cruise detail, content pages): utility row (subscribe, phone, search, manage booking, log in / create account) + main row (logo, 4 mega-menus, "find a cruise" button). **Compact** (search results): logo, offer sign-up, log in / create account, search icon, no menus | all | Mobile: logo + menu button (search results adds a cruises shortcut) |
| Global footer | About 80 links in 10 groups, app badges, legal | all | See `00-sitemap.md` |
| Cookie banner | Bottom banner with a close button | all (first visit) | |
| Tab switch | Two text tabs with underline (Cruises / Cruise + land tours) | search results | |
| Filter pill tabs | Large rounded buttons with a chevron, each opening a filter panel | search results | On mobile, grouped into Filters and Options |
| Filter panel | "Your selections" bar + live "View N results" button + one multi-select group (image tiles, checkbox list, month grid by year, grouped list) | search results | |
| Dropdown radio menu | Small underlined label + chevron; opens a single-choice list | search results (guests, cabin, sort, sub-region) | |
| Fare-type strip | Info line plus a 2-option radio (standard / bundled) | search results | |
| Cruise result card | Image, deal badges, title link, save icon, route, ports, date dropdown, price block, View details | search results; probably destination and deal pages (to confirm) | One card per itinerary; sailings in the date dropdown |
| Deal badge | Coloured outline pill; clicking opens the offer dialog | cards | Colour and label come from sale data |
| Offer details dialog | Modal: headline, sub-headline, perks-by-cabin-type table | search results | Close button + Esc |
| Price block | "{cabin} from*", price now, struck-through old price, small price note | cards | Note: currency, per person, guest count, taxes included |
| Infinite scroll list | 10 items, more on scroll; result count in a live region | search results | |
| Empty state | Message + link back to search | search results | Same message for invalid filters (fix in ours) |
| Terms dialog | Footnote button opening a modal with terms | search results | |
| Back link | Round arrow icon + "back to search results" | cruise detail | |
| Pill buttons | Small rounded buttons for "what's included", deals, share | cruise detail | Deal pills reuse the deal badge |
| Info dialog | Modal with h2 title, then sections of h3 + short text | cruise detail (what's included) | |
| Date dropdown / date sheet | Listbox of sailings (date, ship, "from" price); full-screen sheet with cancel / apply on mobile | cruise detail; search card (simpler select) | |
| Rooms & guests popover | Per room: −/+ guest stepper (1–4), add room, apply | cruise detail | Stepper buttons have full spoken labels |
| Cabin type selector | Row of 5 boxes (type + price or "Sold Out"); one selected | cruise detail | Drives price block and sticky summary |
| Sticky booking summary | Bar with guests, cabin, price, continue; appears when the panel scrolls away | cruise detail | |
| Jump nav | Row of in-page section buttons | cruise detail | |
| Itinerary summary facts | Short facts in a row: port, days, ports, sea days, scenic days, ship | cruise detail | |
| Day list | One row per day: day number, port or "At Sea", date, arrive–depart times | cruise detail | Day headings are h3 |
| Map dialog | Thumbnail button → modal with route image + close | cruise detail | |
| Port spotlight | Image, port name, departure time, short text, learn more | cruise detail | |
| Excursion card carousel | Port dropdown + horizontal cards (title, day + port, rating with count, duration, activity level, view details) | cruise detail | Prev / next buttons |
| Tabbed content carousel | Tabs over a carousel of image cards with counter ("01 / 14") | cruise detail (ship & experience) | Content is a server-rendered fragment |
| Promo band | Wide band: image, one line, button | cruise detail (flights) | |
| Legacy header / footer | Old navigation (plan a cruise, on board, destinations, booked guests, help) and older footer | deck plan; mobile menu on excursion pages | Rebuild on the shared header / footer |
| Mega-menu | 3-column dropdown panel per main menu | full header | Deals menu lists current sales by name |
| Manage booking dropdown | Links into the signed-in booking app | full header | |
| Sign-in prompt popover | Benefits list, log in, create account; opens on load | home | Don't auto-open in ours |
| Video hero with countdown | Autoplay video (pause, mute, full screen) + overlay card with sale countdown, big numbers, button | home | |
| Quick search box | 3 dropdowns (destination, departure port, month) + search | home | Builds the results URL as you choose |
| Deal row / deal cruise card | Heading + carousel of cruise cards (title, ship, date, price, deal) with "view cruises" | home, deals, destination pages | Cards are buttons, not links (fix in ours) |
| Email sign-up form | Email, first name, last name + incentive line | almost every page (often twice) | One per page in ours |
| Hero | Full-width image or video + h1 (+ optional button) | content pages | |
| Sticky section menu | Row of jump buttons under the hero; a select on mobile | destinations, ships, staterooms, onboard, dining, deals, help, about | |
| Content carousel | Card carousel with prev / next and counter | most content pages | Cloned slides exposed to screen readers (fix in ours) |
| Tab set | Tabs over module content; "toggle tabs" dropdown on mobile | destinations, ships, staterooms, dining, legal | |
| FAQ accordion | Question buttons that expand answers | destinations, deals, help, staterooms, casino, articles | Questions also stored per page in crawl data |
| Comparison / facts table | Rows of features or facts | staterooms, ships, deals, entertainment | |
| Ship card grid | Image + ship name, 17 cards | fleet list | |
| Venue carousel | Image, venue name or descriptive heading, text, link | ship pages, dining hub | |
| Theme band | Capitalised label + heading + text + media | onboard overview, careers | Label marked as its own heading (fix in ours) |
| Travel add-ons carousel | Cruise + hotel, flights, transfers cards | destination and land-tour pages | |
| Link rows | "Cruise deals and promotions", "You may also like" | content pages | |
| Blog topic nav / on-this-page | Secondary nav for blog topics; table of contents per article | articles | |
| Key takeaways box | Short summary at the top of an article | articles | |
| Inline CTA card | "Start your {place} adventure" card inside article text | articles | |
| Media contacts table | Press contacts at the end of releases | news | |
| Breadcrumb | Home / section / port / item | excursions | Add site-wide in ours |
| Port / destination selector | Buttons opening a port or region picker | excursions | |
| Filter dropdown bar | Price, interest, duration, activity, rating + sort; "Filters" button on mobile | excursions | |
| Excursion card | Image, title, rating, duration, activity, price | excursions, cruise detail | |
| Pagination | Numbered page buttons | excursions | |
| Collapsible table section | Heading button that shows / hides a table | excursion detail | |
| Star breakdown + reviews | Count per star, review list | excursion detail | |
| Room search box | Cabin number field + find | deck plan | |
| Deck switcher | Ship side profile + deck dropdown | deck plan | |
| Deck drawing | Image map with clickable cabins and rooms | deck plan | |
| Layout chooser | "When do you plan to sail?" date links | deck plan (refit ships) | |
| Facet list | Facet values with a filter box | site search | |
| Load more | Button appending results | site search | |
| Login form | Login ID, password with show / hide, log in | account | |
| 404 page | "Page not found" + top 10 recommendations | any missing URL | |
