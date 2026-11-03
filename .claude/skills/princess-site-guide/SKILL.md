---
name: princess-site-guide
description: Overview of princess.com (Princess Cruises) and its sections, the data we have mapped for each, and which Princess skill to use. Use first when a Princess Cruises question doesn't clearly match one skill, when the user asks what the Princess site has or how it is organized, or to pick between Princess skills.
---

# Princess Cruises site guide

princess.com has about 8,000 public pages, listed in its sitemap (`robots.txt` → `/sitemap.xml`). Every section below is mapped in `data/sites/princess.com/`. Lookups are run from the repo root with `node packages/princess/princess.mjs`.

## Sections and skills

| Section (URL path) | What it does | Pages | Skill |
|---|---|---|---|
| Home `/` | Hero deals, the "Find a cruise" box, menus | 1 | `princess-destinations` (search box) |
| Cruise search `/cruise-search/results/` | Filterable list of cruises (destination, port, month, ship, length, promo, port of call) | live | `princess-destinations`, `princess-ships` |
| Cruise details `/cruise-search/details/?voyageCode=` → `/itinerary-details/` | One cruise: price for every stateroom type, day-by-day itinerary with port times, excursions, what's included | live | `princess-cruise-details` |
| Destinations `/cruise-destinations/` | Region, sub-region and port guides; departure ports; cruisetours; local connections | 537 | `princess-destinations` |
| Shore excursions `/shore-excursions/<port>` | About 5,500 excursions across about 470 ports, with price, duration, activity level and rating | 471 ports | `princess-shore-excursions` |
| Ships & experience `/ships-and-experience/` + `/staterooms/` | 17 ships (facts, venues, highlights), onboard activities, entertainment, casino, celebrations, MedallionClass, stateroom types | 96 | `princess-ships` |
| Dining `/cruise-dining/` | About 60 restaurants, bars and beverage packages | 66 | `princess-dining` |
| Deals `/cruise-deals-promotions/` + `/plan/` | Current sales, standing programs (military, standby, resident rates), packages, payment plans, EZair, price guarantee, cancellation policy | 52 | `princess-deals`, `princess-planning-help` |
| Help `/faq/` and similar | Pre-cruise, onboard and post-cruise FAQs; flight guidelines; accessibility; about Princess | 15 | `princess-planning-help` |
| Blog, video, news `/blog/`, `/news/` | About 1,050 articles, indexed by title, date and topic (not crawled) | 1,048 | `princess-blog-news` |
| Booking `book.princess.com` | Manage booking, check-in, payments, Captain's Circle | — | Out of scope: needs login, never automate |

To track changes on any section, use `princess-site-changes`.

## Data files (`data/sites/princess.com/`)

- `home.json`: home page map. Search form options with codes for 15 destinations, 39 departure ports, 17 ships and the months on sale; menus; deals.
- `sitemap.json`: every sitemap URL with section, last-modified date and robots status.
- `destinations.json`, `ships.json`, `dining.json`, `deals.json`, `help.json`: one entry per page in `pages[]`, each with `title`, `h1`, `sections`, `headings`, `blocks` (each heading plus its text and links), `ctas`, `faqs`, `featuredCruises`, `searchLinks`, `portCodes`, `shipCodes`, `prices` and `internalLinks`.
- `excursions.json`: `ports[]`, each with `port`, `portCode`, `url`, `intro`, price facets and `excursions[]` (name, url, price, rating, reviews, duration, activity, accessible).
- `content-index.json`: blog, video and news items (title, url, date, topics), plus deck plan URLs per ship.
- `snapshots/`: dated copies used for change reports. `text/` (local only) holds the full page text.

## Quick lookups (no browser)

- `node packages/princess/princess.mjs find <words> [--section ships]`: best-matching pages and the passages that match, across every crawled section and the blog and news index. **Start here for "what does Princess say about X?"**
- `node packages/princess/princess.mjs excursions <port> [filters]`
- `node packages/princess/princess.mjs codes`: destination, port, ship and month codes.

## Rules

- Read-only. Never log in, book, submit forms or sign up.
- Respect `robots.txt`: don't open `/shore-excursions/product/…`, `/find/searchResults.do`, `/cruise-deals-promotions/disclaimers/` or the other disallowed paths listed in `sitemap.json` → `robotsDisallow`.
- Crawled data is a snapshot, so check `crawledAt`. For prices or availability, run a live lookup (`search`, `details`, `deals`).
- Prices on princess.com are USD, average per person, for 2 guests, including taxes and fees, unless a page says otherwise.
