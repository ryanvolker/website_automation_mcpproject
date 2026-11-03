---
name: princess-dining
description: Look up Princess Cruises restaurants, bars, specialty dining, beverage packages and which ships have which venues. Use when the user asks about food or drinks on Princess, a named venue (Crown Grill, Sabatini's, The Catch, 360, Chef's Table), specialty dining, dining reservations, or drink packages.
---

# Princess dining and drinks

## Data

- `data/sites/princess.com/dining.json`: a crawl of `/cruise-dining/` (about 66 pages). One page per venue (e.g. `/cruise-dining/crown-grill`), plus the overview, specialty restaurants, dining reservations and beverages (packages). Each page has `h1`, `blocks` (heading, text, links), `ctas`, `prices` (any $ amounts on the page) and `faqs`.
- `data/sites/princess.com/ships.json`: each ship page (`/ships-and-experience/ships/<code>-<name>`) has "Dining options" and "Bars" blocks listing that ship's venues. This is the way to answer "which ships have X?".

## Look it up (no browser)

- Find a venue or topic: `node packages/princess/princess.mjs find crown grill --section dining`
- Which ships have it: `node packages/princess/princess.mjs find crown grill --section ships`. Read each ship result's `matches`.
- Drink packages and prices: `node packages/princess/princess.mjs find beverage package --section dining`. Package bundles (Plus, Premier) are also in the `deals` section.

## Answering

- Describe the venue in a sentence or two from its blocks: cuisine, setting, what's special.
- Say whether it's included in the fare or extra. Main dining rooms, the buffet (World Fresh Marketplace), International Café, pizza, grills and ice cream are included, while specialty restaurants and most drinks cost extra. If a page lists a cover charge, quote it with the page's date (`crawledAt`).
- List the ships that have the venue when asked. Venues vary by ship.
- Link the venue page.

## Notes

- Fees and menus change. For exact current prices, open the venue page live.
- To book specialty dining you have to log in to the cruise personalizer. Never automate that.
