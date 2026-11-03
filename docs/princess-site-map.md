# princess.com site map

How princess.com is organized, what each section is for, what we've captured from it, and which Claude skill uses it.

Source: `robots.txt` lists 6 sitemaps. The main one, `sitemap.xml`, has **8,016 URLs**. Crawls ran 2026-11-02/03 and were read-only and polite: 1–2 tabs, 2.5–3 s between pages, and nothing `robots.txt` disallows.

## Sections at a glance

| Section | URL prefix | Sitemap pages | What it's for | Our data | Skill |
|---|---|---|---|---|---|
| Home | `/` | 1 | Cruise search form, featured deals, destinations, ships | `home.json` | `princess-site-guide` |
| Cruise search | `/cruise-search/`, `/itinerary-details/` | 547 | Results lists (459 saved searches) and cruise detail pages | live only | `princess-destinations`, `princess-cruise-details` |
| Destinations | `/cruise-destinations/` | 537 | Regions, sub-regions, port guides, departure ports, cruisetours, Alaska parks, world-cruise tips | `destinations.json` (515 live, 22 dead) | `princess-destinations` |
| Shore excursions | `/shore-excursions/` | 5,546 | One page per port of call (471), listing bookable tours | `excursions.json` (5,109 tours at 317 ports) | `princess-shore-excursions` |
| Ships & onboard | `/ships-and-experience/`, `/staterooms/` | 96 | Ship profiles, staterooms, entertainment, MedallionClass, celebrations | `ships.json` (94 live) | `princess-ships` |
| Dining | `/cruise-dining/` | 66 | Every restaurant, bar and dining program | `dining.json` (64 live) | `princess-dining` |
| Deals & planning | `/cruise-deals-promotions/`, `/plan/` | 83 (31 off-limits) | Promotions, packages, payment plans, policies | `deals.json` (50 live) | `princess-deals` |
| Help & about | `/faq/`, `/why-princess/`, `/about-princess/`, etc. | 22 | FAQs, first-timer guides, accessibility, company info | `help.json` | `princess-planning-help` |
| Blog, video & news | `/blog/`, `/news/` | 1,050 | Travel articles, videos, press releases | `content-index.json` (1,048 items, not crawled) | `princess-blog-news` |
| Deck plans | `/deckPlans.do` | 18 | Interactive deck plan per ship | `content-index.json` → `deckPlans` | `princess-ships` |
| Account, legal, careers | `/my-princess/`, `/legal/`, `/careers/` | ~40 | Login, terms, jobs | not crawled | — |

The change-report skill `princess-site-changes` covers every section above.

## The sections in more detail

### Cruise search and cruise details
- **Search results**: `/cruise-search/results/?trade=A&startPort=SEA&date=0627&ship=RP&duration=6_8&promos=2GD&itinPort=JTR`. Filters are region (15 trade codes), departure port (39), month (MMYY), ship (17 two-letter codes), length, promo code, and port of call.
- **Cruise details**: `/itinerary-details/?voyageCode=4726` has prices for each stateroom type, a day-by-day itinerary with port times, featured excursions, and what's included.
- Prices change constantly, so we always look them up live (`princess.mjs search`, `details`).

### Destinations (537 pages)
- 15 regions, each with sub-regions (e.g. Europe → Mediterranean, Greece, Norway) and a page per port (`…/cruises-to-<port>`).
- Pages hold must-see attractions, "why visit", ports, FAQs (on 404 pages), and featured cruises with prices (1,086 captured).
- 73 old URLs redirect elsewhere. 22 URLs in the sitemap return 404, mostly getaway, Panama Canal, Tahiti and world-cruise tip pages.

### Shore excursions (471 ports)
- `/shore-excursions/<port-slug>` lists tours 12 at a time. Each tour has a price, rating, review count, duration, activity level and wheelchair access.
- 317 ports currently list tours (5,109 in all; median price $150, top $4,700). The other 154 show "No excursions found". 18 of those, mostly in Australia and the South Pacific, still have tour URLs in the sitemap, so the sitemap is behind the site.
- Individual tour pages (`/shore-excursions/product/`) are off-limits under `robots.txt`, so we use the port listing pages.

### Ships and onboard experience (96 pages)
- One page per ship, with a "by numbers" box (guests, crew, decks, tonnage, inaugural date), venues, highlights and FAQs.
- Stateroom types run from interior to the Sanctuary and Reserve Collections. Also covers entertainment, casino, celebrations and MedallionClass.

### Dining (66 pages)
- A page per venue (Crown Grill, Sabatini's, The Catch by Rudi…) plus dining programs and packages. 41 pages have FAQs.

### Deals and planning (83 pages)
- Promotions (flash sale, last minute, early booking, military, teacher, resident rates, standby), Princess Plus/Premier packages, EZpay, best price guarantee, EZair, vacation protection and cancellation policy.
- The 31 deal fine-print pages (`/cruise-deals-promotions/disclaimers/`) are off-limits.

### Help and about (22 pages)
- FAQs (pre-cruise, onboard, post-cruise, cruisetours), new to cruising, top FAQs, awards, accessibility, brochures, Alaska lodges, sustainability.

### Blog, videos and news (1,050 pages)
- 550 blog posts, 103 videos and 395 news releases, tagged by topic. The most common topics are excursions (176), ships (154), Alaska (124), Europe (114), dining (99) and Caribbean (93).

## Stale links found
Some URLs are still in the sitemap but return 404: 22 destination pages, plus `love-boat-celebration`, `red-barrel-lounge`, `kai-sushi`, `silverado-winemakers`, `2026-world-cruise` and `princess-promise`.

## Keeping it fresh
See the `princess-site-changes` skill. Start with `npm run sitemap -w @wa/princess` (seconds), then re-crawl only the sections that changed.
