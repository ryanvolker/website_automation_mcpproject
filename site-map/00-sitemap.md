# Site inventory (Phase 1)

Source: `sitemap.xml` fetched 2026-11-04 (8,018 US URLs), plus the home page's main menu and footer read on 2026-11-05.
Raw data: `data/sites/princess.com/sitemap.json` and `home.json`.
URL paths are kept as-is because they're structural. Program and product names are described, not copied.

## Hosts and locales
| Host / path | What lives there |
|---|---|
| `www.` (root) | Marketing, destinations, ships, deals, search, help (all sections below) |
| `book.` subdomain | Signed-in area: account, loyalty program, manage booking, gifting, customer care, offer sign-up |
| `gw.api.` subdomain | JSON data API behind search and booking (seen on the search page, not in the sitemap) |
| `/en-au/`, `/en-uk/`, `/en-sg/`, `/en-hk/`, `/en-int/` | Regional copies of the site, each with its own sitemap |

`robots.txt` disallows 34 paths (old `.do` popups, product detail pages under shore excursions, legacy search, disclaimer pages). See `sitemap.json` → `robotsDisallow`.

## Sections and URL patterns
Counts are US sitemap URLs.

| Section | URL pattern | URLs | Structure |
|---|---|---|---|
| Shore excursions | `/shore-excursions/{port}/{excursion}` | 5,546 | Hub → 471 port pages → 5,074 excursion pages |
| Blog | `/blog/{article}`, `/blog/video/{topic}/{video}` | 655 | Flat articles plus a video area |
| Cruise search | `/cruise-search/results/?{filters}` | 547 | One results template; the sitemap lists 545 pre-filtered links (by port of call, region, length) |
| Destinations | `/cruise-destinations/{region}-cruises[/{sub-region}][/{tips-topic}/{article}]` | 538 | 37 region pages → sub-regions and port guides → travel-tip articles (up to 5 levels deep) |
| News | `/news/{type}/[{year}/{month}/]{release}` | 396 | Press releases by date, plus fact sheets |
| Ships & onboard | `/ships-and-experience/ships/{code}-{ship}`, `/ships-and-experience/onboard-experience/{topic}[/…]`, `/ships-and-experience/celebrations/…`, `/ships-and-experience/{guest-tech}/…` | 88 | Fleet list → 17 ship pages; onboard topics (activities, entertainment, wellness, kids, dining, casino promos); celebrations and gifts; guest app and wi-fi |
| Deals | `/cruise-deals-promotions/{deal}[/{detail}]` | 68 | Landing → 34 deal pages → some with sub-pages |
| Dining | `/cruise-dining/{venue}` | 66 | Landing → 62 venue pages |
| Legal | `/legal/{document}` | 26 | Contracts, terms, privacy |
| Deck plans | `/deckPlans.do?shipCode={XX}` | 18 | One interactive template per ship |
| Plan / policies | `/plan/{topic}` | 15 | Flights, insurance, check-in, upgrades, price guarantee, cancellations |
| Careers | `/careers/{area}[/…]` | 9 | |
| FAQ | `/faq/{category}[/…]` | 9 | |
| Staterooms | `/staterooms/{type}` | 8 | Overview → 7 cabin-type pages |
| Why us | `/why-princess/{topic}` | 5 | New-to-cruising, awards, top FAQ |
| Company | `/company-information/{topic}` | 3 | |
| Private sales | `/private-sale/{sale}` | 3 | Time-limited sale pages |
| Account entry | `/my-princess/account-login/`, `/my-princess/create-account/` | 2 | Hand off to the `book.` subdomain |
| Site search | `/search`, `/search/editorial-search` | 2 | |
| Single pages | `/brochures`, `/find-travel-agents/`, `/accessibility-at-sea`, `/alaska-lodge-directory`, `/shore-excursions-overview`, `/about-princess`, casino voucher and mobility forms | 14 | One-off pages |

Not in the sitemap but linked: `/cruise-search/details/?voyageCode=` → `/itinerary-details/?voyageCode=` (cruise detail), `/ports-excursions/` (excursion hub).

## Main menu (header)
Four mega-menus, each with three columns:

| Menu | Columns (links) |
|---|---|
| Destinations | Destinations (39, with fly-out sub-menus for Asia, Australia, Caribbean, Europe), Cruise types (5), Shore excursions (5) |
| Ships | Ships (18), Staterooms (8), Onboard experience (9) |
| Discover | About cruising (4), Cruise essentials (6), Why us (8) |
| Deals | Deals (10), Packages (6), Loyalty (6) |

Header utilities (from `home.json` → `interactions`): a "find a cruise" button, site search (overlay), manage booking, log in / create account, and a phone number. The cookie banner shows first.

The header "find a cruise" button opens `/cruise-search/results/?trade=E,C,A,M,T,N&duration=1,2,3&mrch=1`. That's 6 regions and a length limit, so it shows 577 of the 1,010 sailings on sale (scan of 2026-11-05).

## Footer
About 80 links in a multi-column footer. The groups below are inferred from link order, because the footer has no visible group headings in the page structure.

| Group | Links to |
|---|---|
| Plan & book | Cruise search, flights add-on, travel insurance, groups, find a travel agent |
| Deals | Deals landing, deal terms, offer sign-up, military, refer-a-friend, standby |
| New to cruising | New-to-cruising, why us, loyalty tiers, blog, top 10 FAQ, help & contact, price guarantee |
| Destinations | Destination overview, 16 regions, shore excursions, departure ports & hotels, brochures |
| Ships & onboard | Ships, deck plans, bridge cams, onboard overview, dining, drinks packages, activities, entertainment, kids |
| Celebrations & gifts | Celebrations, gifts & services, gift a guest, gift cards, credit card |
| Already booked | Manage booking, get ready (check-in), upgrades, reserve excursions, book gifts, FAQ, flights, cruise & hotel packages, prohibited items |
| Guest tech | Guest app overview, onboard wi-fi, app store badges (iOS, Android) |
| Company & legal | About, careers, news, passage contract, legal & privacy, parent company, accessibility, health data notice, privacy choices |
| Partner logins | Corporate affiliates, travel agent portal, credit card application |

## Notes for our build
- The site is split three ways: a public content site, a signed-in booking/account app on its own subdomain, and a JSON API. Our build can use the same split.
- Almost 70% of URLs are shore excursions, and most of the rest are blog, destination articles and news. The core booking flow is only a handful of templates: search results, cruise detail, deck plan and checkout.
- The footer repeats most of the main menu and adds an "already booked" group. That's a useful pattern: one footer group for planning and one for guests who have already booked.
