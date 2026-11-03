---
name: princess-deals
description: Look up current Princess Cruises deals and promotions (flash sales, last-minute deals, free 3rd & 4th guests, early booking, destination deals, military/teacher/resident rates, standby) and Princess Plus/Premier packages, list the cruises a deal applies to, and explain deal programs and payment options. Use when the user asks about Princess deals, sales, discounts, promotions, packages or cheap cruises.
---

# Princess Cruises deals

## Data and tools

- **Live deals on the home page:** `node packages/princess/princess.mjs deals`. Each deal card comes with its text and `searchParams` (e.g. `{ promos: "2GD", duration: "6_8" }`).
- **Deal and program pages (crawled):** `data/sites/princess.com/deals.json` covers `/cruise-deals-promotions/` (flash sale, last minute, early booking bonus, Europe, Alaska and Caribbean sailings, world cruise, standby program, military, teachers, resident rates, Plus and Premier packages, compare packages, payment plans) and `/plan/` (EZpay, pay monthly, best price guarantee, EZair, vacation protection, cancellation policy). Each page's `blocks` explain the offer, `searchLinks` hold the promo codes it uses, and `prices` lists the dollar amounts mentioned.
- **Deal fine print** lives on `/cruise-deals-promotions/disclaimers/`, which `robots.txt` disallows. Don't crawl it; link the deal page instead.

## Steps

1. **What's on now:** run `deals` (live), then read the matching program pages:
   `node packages/princess/princess.mjs find flash sale --section deals`
2. **Cruises under a deal:**
   - `node packages/princess/princess.mjs search --url "<deal url>" --limit 10`
   - or `node packages/princess/princess.mjs search --promo 2GD --days 6-8 --destination caribbean`
   Known promo codes (they change): `2GD` flash sale, `RG1` last minute, `KHS` 2028 early booking. Other codes appear in `deals.json` → `searchLinks[].params.promos`.
3. **Program questions** ("is there a military discount?", "what's in Princess Plus?"): use `find` in the deals section and answer from the blocks.
4. **Compare stateroom prices** for a deal cruise: `princess-cruise-details`.

## Answering

- One line per deal: what it is, the savings, any conditions, and when it ends if shown.
- Then the cheapest few cruises: title, departure, date and ship, and price against the was-price, with links.
- Prices are USD, average per person, for 2 guests, including taxes and fees, and change constantly. Run live lookups instead of quoting crawl data.
- Read-only. Never book or sign up.
