---
name: princess-ships
description: Look up Princess Cruises ships, their ship codes and pages, and find cruises sailing on a specific ship (optionally filtered by destination, month or length). Use when the user asks about Princess ships, what a ship is doing, or cruises on a named ship like Sun Princess or Royal Princess.
---

# Princess Cruises ships

## Data and tools

- `data/sites/princess.com/home.json` → `ships`: 17 ships, each with `name`, two-letter `code` (for example `RP` for Royal Princess), info `page` and `searchUrl`.
- `navigation.menus["Explore Ships"]` has the Ships, Staterooms and Onboard Experience links.
- `featured.shipSailings` has the ship cards from the home page, with their "from" prices at capture time.
- Live script, run from the repo root: `node packages/princess/princess.mjs`

## Steps

1. **List ships or find one.** Read `ships` from `home.json`. You don't need a browser for this. Names match loosely: "sun", "SU" and "Sun Princess" all work in the script.

2. **Find cruises on a ship (live).**
   `node packages/princess/princess.mjs search --ship "Sun Princess" --limit 10`
   Add any filters: `--destination europe`, `--month 2027-06`, `--days 7` or `--days 10-14`, `--port "fort lauderdale"`.
   Output: `totalResults` plus `cruises[]` with title, departure, ports, dates and ship, `price` and `wasPrice`, and a details `url`.

3. **Answer the user.** Give the total count and the cheapest few sailings: title, date, departure port and price. Link to the ship's `page` for more about the ship itself.

## Notes

- Results are sorted by lowest price, and the script returns the first `--limit` cruises (default 10).
- Ship facts such as size, decks and venues aren't in the home page map. To get them, open the ship's `page` with the Playwright MCP if it's connected, or map it with `node packages/site-mapper/map-page.mjs <page> data/sites/princess.com ship-<code>`.
- The `codes` command prints every ship code: `node packages/princess/princess.mjs codes`.
- Read-only. Never book or log in.
