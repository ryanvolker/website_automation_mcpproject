---
name: princess-destinations
description: Look up Princess Cruises destinations, regions, sub-regions, ports of call and departure ports, and search for cruises by destination, departure port, port of call, month, ship or length (the home page "Find a cruise" search). Use when the user asks where Princess sails, about cruising to a region or port (Alaska, Caribbean, Greece, Norway, Japan…), cruises from a port, cruises that stop somewhere, or cruises in a given month.
---

# Princess destinations and cruise search

## Data

- `data/sites/princess.com/home.json`:
  - `destinations`: the 15 search regions with `code` (A = Alaska, C = Caribbean, E = Europe, O = Asia, Z = Australia & NZ…), landing `page` and `searchUrl`
  - `ports`: 39 departure ports with codes (SEA, FLL, LAX…)
  - `searchForm`: the form's fields, selectors and every option, including the months on sale (MMYY)
- `data/sites/princess.com/destinations.json`: a crawl of all 537 `/cruise-destinations/` pages, covering regions, sub-regions (Eastern Caribbean, Greece, Norway…), country and port guides (`…/cruises-to-<port>`), departure ports, cruisetours and lodges, Alaska national parks, glaciers and wildlife, local connections, and destination videos. Each page has:
  - `h1`, `title`, `metaDescription`, `sections` (in-page menu), `headings`, `blocks` (heading, text and links: must-sees, why visit, ports, FAQ answers)
  - `portCodes`, `tradeCodes`, `portPages`, `excursionLinks`, `featuredCruises` (voyage code, card text, price at crawl time), `faqs`, `searchLinks`, `redirectsTo`
- `data/sites/princess.com/excursions.json`: port codes for about 470 ports of call (see `princess-shore-excursions`).

## Questions about a place (no browser)

`node packages/princess/princess.mjs find <place> [topic words] --section destinations`
Examples: `find santorini`, `find norway fjords ports`, `find alaska best time`, `find glacier bay`.
Answer from the top page's `blocks` and `faqs`, and link the page. Add related blog guides with `--section content`.

## Cruise search (live)

1. **Work out the filters:**
   - Region: one of the 15 `destinations`. Places that aren't regions belong to a parent, e.g. Mediterranean, Greece or Norway → Europe, Bahamas → Caribbean. Alternatively, search by **port of call**.
   - `--port`: the departure port (39 options).
   - `--visits`: any port of call by name or code, e.g. `--visits santorini` or `--visits JTR`.
   - `--month`: `2027-06`, `"June 2027"` or `0627`. Only months listed in `searchForm` have sailings.
   - `--ship <name>` and `--days 7` or `--days 10-14` narrow further.
2. **Run it:** `node packages/princess/princess.mjs search --destination alaska --port seattle --month 2027-06 --limit 10`
   Unknown names exit with an error. Run `node packages/princess/princess.mjs codes` to see valid values.
3. **Answer:** give the total count, then the best matches with title, departure, ports, date and ship, and price against the was-price. Prices are USD, average per person, for 2 guests, including taxes and fees. Link each cruise `url` and the search `url`. For stateroom prices and the full itinerary, use `princess-cruise-details`.

## Interactive option

In a real browser (Playwright MCP), use the home page form: select `#destination-select`, `#port-select` and `#date-select` by option value, then click **SEARCH CRUISES**. The link's href updates as you choose, e.g. `/cruise-search/results/?trade=A&date=0627&startPort=SEA`.

## Notes

- Crawled pages are a snapshot (`crawledAt`); use live search for prices and availability.
- Read-only. Never book or log in.
