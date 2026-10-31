---
name: princess-destinations
description: Look up Princess Cruises destinations and departure ports, and search for cruises by destination, departure port and month (the home page "Find a cruise" search). Use when the user asks where Princess sails, cruises to a region like Alaska or the Caribbean, cruises from a port, or cruises in a given month.
---

# Princess Cruises destinations and cruise search

This does what the home page "Find a cruise" box does (Cruising to / Departing from / Leaving), but returns structured results.

## Data and tools

- `data/sites/princess.com/home.json`:
  - `destinations`: the 15 search destinations, each with a `code` (A = Alaska, C = Caribbean, E = Europe…), a landing `page` and a `searchUrl`
  - `ports`: 39 departure ports with codes (SEA, FLL, LAX…)
  - `searchForm`: the form's fields, selectors and every option, including the months available (MMYY codes)
  - `navigation.menus.Destinations`: sub-regions such as Eastern Caribbean, Greece and Norway, with their pages
  - `featured.ports`: "Find cruises near you" cards
- `data/sites/princess.com/destinations.json`: a crawl of 39 destination pages (regions, sub-regions such as Greece, Norway and Eastern Caribbean, departure ports, and the all-ports index). Each entry in `pages[]` has:
  - `h1`, `title`, `metaDescription`, `sections` (the page's in-page menu)
  - `headings` (the page outline: must-sees, highlights, ports)
  - `portCodes` (port codes used in its search links, usable as `itinPort=`/`startPort=`), `portPages`, `excursionPages`
  - `featuredCruises`: voyage code, cruise or cruisetour, card text and lowest price at crawl time
  - `faqs`: question text only
  - `relatedDestinationPages`, `blogPosts`, `redirectsTo` (several old URLs redirect, e.g. `.../mediterranean-and-greek-isles` → `/mediterranean-cruises`)
  - The `ports` page lists about 320 port pages, and `notCrawledYet` holds about 445 destination and port URLs that haven't been crawled.
- Live script, run from the repo root: `node packages/princess/princess.mjs`

## Steps

0. **Questions about a place** ("what is there to do in Greece?", "which ports in Norway?"): answer from the matching page in `destinations.json` (match on `slug`, `h1` or `title`). Quote its `headings`, `portPages`, `faqs` and `featuredCruises`, and link the page. Prices there are from the crawl date (`crawledAt`); run a live search if current prices matter.

1. **Work out the filters.** Map what the user said to a destination, a port and a month.
   - Places that aren't search destinations belong to a parent region, for example Mediterranean, Greece or Norway → **Europe**, Bahamas → **Caribbean**. The sub-region pages are in `navigation.menus.Destinations`.
   - Months can be given as `2027-06`, `"June 2027"` or `0627`. Only months listed in `searchForm` have sailings.

2. **Search (live).**
   `node packages/princess/princess.mjs search --destination alaska --port seattle --month 2027-06 --limit 10`
   Every filter is optional. Add `--days 7` or `--ship <name>` to narrow further.
   An unknown name exits with an error. Run `node packages/princess/princess.mjs codes` to see valid values.

3. **Answer the user.** Give the total count and the best matches: title, departure, ports, date, ship and price next to the was-price. Prices are USD, average per person, for 2 guests, including taxes and fees. Include links to the cruise `url`, plus the search `url` so they can browse all results.

## Interactive option

To show the search working in a real browser (for example with the Playwright MCP), use the form from `searchForm`: select `#destination-select`, `#port-select` and `#date-select` by option value, then click the **SEARCH CRUISES** link. The link's href updates as you choose options, for example `/cruise-search/results/?trade=A&date=0627&startPort=SEA`.

## Notes

- `home.json` is a snapshot. Destination and port lists rarely change, but refresh them with `npm run map:home -w @wa/princess`.
- Read-only. Never book or log in.
