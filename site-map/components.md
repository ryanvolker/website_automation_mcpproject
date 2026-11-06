# Shared components

Components seen across page types. Each entry: what it is, where it's used, and notes for our build.
Started 2026-11-05 from the search results page; extended as each section is mapped.

| Component | What it is | Used on | Notes for our build |
|---|---|---|---|
| Global header | Logo; offer sign-up; log in / create account; search icon. Mega-menu on most pages, hidden on search results | all | Mobile: menu button, logo, cruises shortcut |
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
