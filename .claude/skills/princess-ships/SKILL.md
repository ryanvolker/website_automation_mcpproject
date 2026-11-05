---
name: princess-ships
description: Look up Princess Cruises ships - facts (guests, crew, decks, year), dining venues, bars, entertainment, kids clubs, Sanctuary Collection, stateroom types, deck plans, onboard activities, casino, celebrations and MedallionClass - and find cruises sailing on a specific ship. Use when the user asks about a Princess ship, compares ships, asks what's on board, or wants cruises on a named ship.
---

# Princess ships and onboard experience

## Data

- `data/sites/princess.com/home.json` → `ships`: 17 ships with `name`, two-letter `code` (e.g. `RP` for Royal Princess), `page` and `searchUrl`.
- `data/sites/princess.com/ships.json`: a crawl of `/ships-and-experience/` and `/staterooms/` (96 pages):
  - **Ship pages** `/ships-and-experience/ships/<code>-<name>`. `sections` is the in-page menu (Staterooms, Dining options, Ship highlights, Wellness, Family, FAQs). `blocks` hold every venue and highlight with its description. The "<Ship> by numbers" block gives guests, crew, inaugural cruise, decks and christener. `faqs` are the ship's FAQs.
  - **Staterooms** `/staterooms/…`: interior, oceanview, balcony, mini-suites, suites, Sanctuary Collection, Reserve Collection.
  - **Onboard experience** (activities, entertainment, production shows, casino), **celebrations** (birthdays, weddings, group program), **MedallionClass** and MedallionNet Wi-Fi, and special events.
- `data/sites/princess.com/content-index.json` → `deckPlans`: deck plan URL per ship code.

## Look it up

- Ship facts and features (no browser): `node packages/princess/princess.mjs find royal princess by numbers --section ships`, or read that ship's page in `ships.json`.
- Which ships have a feature: `node packages/princess/princess.mjs find sanctuary collection --section ships`
- Cruises on a ship (live): `node packages/princess/princess.mjs search --ship "Sun Princess" --limit 10`
  Add `--destination`, `--month 2027-06`, `--days 7` or `--days 10-14`, `--port`, `--visits`.
- Full details and stateroom prices for one sailing: `princess-cruise-details`.

## Answering

- For a ship profile: give the facts (by numbers), 4–6 highlights, dining and bars (`princess-dining` has more on each venue), family facilities, and stateroom types. Link the ship page.
- For comparisons, use a table: guests, decks, inaugural year, notable venues, Sanctuary Collection yes or no.
- For sailings: give the total count, then the cheapest few (title, date, port, price).

## Notes

- Venues and features differ by ship; always check that ship's page.
- Crawled content is a snapshot (`crawledAt`); use live search for prices.
- Read-only.

## Deck plans, staterooms and venues by ship (fleet map)

- `data/sites/princess.com/deck-plans.json`: every ship's decks, public rooms on each deck, and every cabin as `[number, category, zone, sqft, balconySqft, berths, wheelchair, connecting, notes]` (field names in `cabinFields`). Ships with an upcoming refit have several `layouts`, each labelled with the sailing dates it applies to.
- `data/sites/princess.com/fleet-map.json`: for each ship, its facts, cabin counts and size range by type (Interior, Oceanview, Balcony, Mini-Suite, Suite), venues with the decks they're on, and layout changes. `venueIndex` lists which ships have each venue; use it for "which ships have X?".
- Refresh: `npm run crawl:deckplans -w @wa/princess` (about 12 minutes), then `npm run build:fleet -w @wa/princess`, which also writes `docs/reports/princess-fleet-map-<date>.html`.
- For "which cabins are accessible / biggest balcony / connecting rooms on ship X", filter that ship's cabins in `deck-plans.json`.
