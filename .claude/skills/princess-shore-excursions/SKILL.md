---
name: princess-shore-excursions
description: Find and compare Princess Cruises shore excursions at any port (about 5,500 excursions in about 470 ports) by price, rating, duration, activity level and wheelchair accessibility, and find cruises that visit a port. Use when the user asks about things to do in a cruise port, Princess excursions, tours at a port, or which excursions are cheapest, best rated, easy or accessible.
---

# Princess shore excursions

## Data

`data/sites/princess.com/excursions.json` holds a crawl of every excursion port page (`/shore-excursions/<port>`). Its `ports[]` entries each have:
- `port` (e.g. "Juneau, Alaska"), `portCode` (e.g. `JNU`, the same code cruise search uses for "visits this port"), `url`, `intro`
- `facets.Price`: how many excursions fall in each price band
- `excursions[]`: `name`, `url`, `price` ("from" adult price, USD), `rating` (out of 5), `reviews`, `duration`, `activity` (Easy, Moderate or Strenuous), `wheelchairAccessible`, `badges`

## Look it up (no browser)

- List ports: `node packages/princess/princess.mjs excursions`
- One port: `node packages/princess/princess.mjs excursions juneau`
- Filters: `--max-price 150`, `--activity easy`, `--min-rating 4.5`, `--max-hours 4`, `--accessible`, `--sort price|rating|reviews`, `--limit 20`
  Example: `node packages/princess/princess.mjs excursions "cozumel" --activity easy --max-price 100 --sort rating`
- Ports match by name or code ("JNU", "juneau", "santorini").

## Related lookups

- Cruises that stop at the port (live): `node packages/princess/princess.mjs search --visits <port name or code>`
- The port's destination guide, if one exists: `node packages/princess/princess.mjs find <port> --section destinations`
- Blog posts such as "Things to do in …": `node packages/princess/princess.mjs find things to do <port> --section content`
- Excursions on a specific cruise's itinerary: `princess-cruise-details` (`featuredExcursions`)

## Answering

- Give a short ranked list: name, price, duration, activity level, and rating with review count. Link each excursion `url`.
- Mention how many excursions the port has in total, and the price spread from `facets.Price`.
- Ratings with very few reviews are less reliable. Say so when it matters.
- Prices are from the crawl (`crawledAt`). The live price is on the excursion page.

## Rules

- `robots.txt` disallows `/shore-excursions/product/…`, `/category/`, `/cart/`, `/checkout/` and `/pages/`. Some excursion URLs use `/shore-excursions/product/<CODE>`: give the link to the user, but don't open it.
- An excursion detail page (`/shore-excursions/<port>/<slug>`) can be opened for full details: description, schedule, special notes and adult or child price. Use the Playwright MCP or `node packages/site-mapper/map-page.mjs <url> <outDir> <name>`.
- Read-only. Never add to cart or book.
