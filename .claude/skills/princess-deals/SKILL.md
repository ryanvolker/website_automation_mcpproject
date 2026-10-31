---
name: princess-deals
description: Look up current Princess Cruises deals and promotions (flash sales, last-minute deals, free 3rd & 4th guests, early booking, destination deals) and list the cruises a deal applies to. Use when the user asks about Princess deals, sales, discounts, promotions or cheap cruises.
---

# Princess Cruises deals

Finds what's on sale at princess.com right now and which cruises each deal covers.

## Data and tools

- Home page map: `data/sites/princess.com/home.json`. Deal info lives in `deals.pages` (the Deals menu) and `deals.onHomePage` (deal cards, with the search parameters each one uses). This is a snapshot; check `capturedAt`.
- Live script, run from the repo root: `node packages/princess/princess.mjs <command>`

## Steps

1. **Get the current deals (live).**
   `node packages/princess/princess.mjs deals`
   Each item in `onHomePage` has the card text (offer, savings, length) and `searchParams`, for example `{ "promos": "2GD", "duration": "6_8" }`. `dealPages` lists the deal pages from the Deals menu.

2. **Show cruises for a deal.** Pass the deal's search URL, or rebuild it from filters:
   - `node packages/princess/princess.mjs search --url "<deal url>" --limit 10`
   - `node packages/princess/princess.mjs search --promo 2GD --days 6-8 --destination caribbean`

   Known promo codes (they can change): `2GD` flash sale, `RG1` last minute, `KHS` 2028 early booking. Some deals, such as Free 3rd & 4th guests, use a `voyages=` list instead. Use their URL as-is.

3. **Answer the user.** For each deal, give a one-line summary of the offer, then the cheapest few cruises: title, departure, dates and ship, then the price next to the was-price. Prices are USD, average per person, for 2 guests, including taxes and fees. Link to the cruise `url`.

## Notes

- Countdown timers and prices change constantly. Always run the live command rather than quoting `home.json`.
- For a deal page that isn't a search (for example `.../plus-premier-cruise-packages`), open the page with the Playwright MCP if it's connected, or summarize from its title.
- Read-only. Never book, sign up or log in.
