# Page types (Phase 2)

URLs from `00-sitemap.md` grouped into templates, with 2–3 representative pages each for Phase 3.
Counts are US sitemap URLs (2026-11-04). "~" means the count comes from a URL pattern and isn't confirmed.
How templates were grouped: by URL pattern, then checked against the destinations crawl (537 pages), which shows which content modules each page has.

**Phase 3 order:** priority 1 is the booking path, 2 is browsing that leads into it, 3 is supporting content.

## Section files (Phase 3, done 2026-11-05)
| Types | Section file |
|---|---|
| 1 | `sections/home.md` |
| 2 | `sections/search-results.md` |
| 3 | `sections/cruise-detail.md` |
| 4 | `sections/deck-plan.md` |
| 5 | `sections/destinations-hub.md` |
| 6–9 | `sections/destination-pages.md` |
| 10, 21, 22 | `sections/article.md` |
| 11 | `sections/land-tour.md` |
| 12–13 | `sections/ship-pages.md` |
| 14 | `sections/stateroom-type.md` |
| 15 | `sections/onboard-topic.md` |
| 16 | `sections/dining.md` |
| 17–18 | `sections/deals.md` |
| 19–20 | `sections/excursions.md` |
| 23–24 | `sections/help-pages.md` |
| 25 | `sections/legal.md` |
| 26 | `sections/info-page.md` |
| 27 | `sections/site-search.md` |
| 28 | `sections/account.md` |

## Booking path
| # | Type | URL pattern | URLs | Samples | Priority | Status |
|---|---|---|---|---|---|---|
| 1 | Home | `/` | 1 | `/` | 1 | done |
| 2 | Search results | `/cruise-search/results/?{filters}` | 1 template (321 pre-filtered links in sitemap) | `/cruise-search/results/` · `/cruise-search/results/?trade=E,C,A,M,T,N&duration=1,2,3&mrch=1` · `/cruise-search/results/?itinPort=PPG` | 1 | done |
| 3 | Cruise detail (itinerary) | `/cruise-search/details/?voyageCode={code}` → `/itinerary-details/?voyageCode={code}` | 85 in sitemap, ~1,010 sailings live | `?voyageCode=U648` (7-day, deal) · `?voyageCode=N726` (11-day Europe) · a world cruise from the 1,010 | 1 | done |
| 4 | Deck plan | `/deckPlans.do?shipCode={XX}` | 18 | `SA` (one layout) · `GP` (two layouts, date chooser) · `SU` (newest ship) | 1 | done |
| — | Booking / checkout | `book.` subdomain | — | — | skip | Out of scope: read-only rule, no booking |

## Destinations
| # | Type | URL pattern | URLs | Samples | Priority |
|---|---|---|---|---|---|
| 5 | Destinations hub | `/cruise-destinations` | 1 | `/cruise-destinations` | 2 |
| 6 | Region landing | `/cruise-destinations/{region}-cruises` | 37 | `/alaska-cruises` · `/caribbean-cruises` · `/european-cruises` | 2 |
| 7 | Sub-region / theme landing | `/cruise-destinations/{region}/{sub-region-or-theme}` | ~69 | `/caribbean-cruises/eastern-caribbean` · `/alaska-cruises/cruisetour-options` · `/alaska-cruises/glaciers` | 2 |
| 8 | Port guide | `/cruise-destinations/{region}/cruise(s)-to-{port}` | ~320 | `/alaska-cruises/cruise-to-juneau` · `/caribbean-cruises/cruises-to-freeport` · `/asia-cruises/cruises-to-thailand` | 2 |
| 9 | Departure port | `/cruise-destinations/{region-or-departure-ports}/cruises-from-{port}` (+ hub `/departure-ports`) | 37 + hub | `/departure-ports` · `/departure-ports/cruises-from-southampton` · `/departure-ports/cruises-from-fort-lauderdale` | 2 |
| 10 | Travel tips hub + article | `/cruise-destinations/{region}/{region}-cruise-tips[/{topic}/{article}]` | 10 hubs + ~67 articles | `/alaska-cruises/alaska-cruise-tips` · `…/learn-about-alaska/inside-passage-alaska-cruise` · `/caribbean-cruises/caribbean-cruise-tips/learn-about-the-caribbean/caribbean-cruise-weather-by-month` | 3 |
| 11 | Land tour / lodge | `/cruise-destinations/alaska-cruises/cruisetour-options/{lodge-or-rail}` | ~11 | `…/denali-princess-wilderness-lodge` · `…/alaska-train-travel` | 3 |

Samples in this table drop the `/cruise-destinations` prefix.

## Ships & onboard
| # | Type | URL pattern | URLs | Samples | Priority |
|---|---|---|---|---|---|
| 12 | Fleet list | `/ships-and-experience/ships` | 1 | `/ships-and-experience/ships` | 2 |
| 13 | Ship detail | `/ships-and-experience/ships/{code}-{ship}` | 17 | `su-sun-princess` (newest, different section layout) · `gp-regal-princess` · `co-coral-princess` (older, smaller) | 2 |
| 14 | Stateroom type | `/staterooms[/{type}]` (+ 2 under `/ships/staterooms/`) | 10 | `/staterooms` · `/staterooms/suites` · `/staterooms/mini-suites` | 2 |
| 15 | Onboard topic | `/ships-and-experience/onboard-experience/{topic}[/…]`, `/celebrations/…`, guest-tech pages | ~85 | `/onboard-experience` · `/onboard-experience/entertainment` · `/onboard-experience/activities/casino` | 3 |
| 16 | Dining hub + venue | `/cruise-dining[/{venue}]` | 66 | `/cruise-dining` · `/cruise-dining/kai-sushi` · `/cruise-dining/specialty-restaurants/sabatinis-italian-trattoria` | 3 |

## Deals
| # | Type | URL pattern | URLs | Samples | Priority |
|---|---|---|---|---|---|
| 17 | Deals landing | `/cruise-deals-promotions` | 1 | `/cruise-deals-promotions` | 2 |
| 18 | Deal detail | `/cruise-deals-promotions/{deal}` (+ `/private-sale/{sale}`) | 34 + 3 | `/early-booking-bonus` · `/last-minute-cruise-deals` · `/plus-premier-cruise-packages` | 2 |

## Shore excursions
| # | Type | URL pattern | URLs | Samples | Priority |
|---|---|---|---|---|---|
| 19 | Excursion port listing | `/shore-excursions/{port}` (hub: `/ports-excursions/`) | 471 + hub | `/shore-excursions/barcelona-spain` · `/shore-excursions/gibraltar` · `/shore-excursions/aarhus-denmark` | 2 |
| 20 | Excursion detail | `/shore-excursions/{port}/{excursion}` | 5,074 | `/gibraltar/panoramic-gibraltar-gin-tasting` · `/new-york-city-manhattan-or-brooklyn-new-york/downtown-manhattan-walk-the-911-memorial` · one wheelchair-accessible tour | 3 |

## Content, help and account
| # | Type | URL pattern | URLs | Samples | Priority |
|---|---|---|---|---|---|
| 21 | Blog hub + article (+ video) | `/blog[/{article}]`, `/blog/video/{topic}/{video}` | 655 | `/blog` · `/blog/best-time-to-see-northern-lights-on-an-alaska-cruise` · `/blog/video/onboard-experience/activities-family-cruising` | 3 |
| 22 | News release / fact sheet | `/news/news-releases/{yyyy}/{mm}/{slug}`, `/news/backgrounders-and-fact-sheets/{slug}` | 396 | `/news` · a 2026 release · `/news/backgrounders-and-fact-sheets/alaska-fun-facts` | 3 |
| 23 | FAQ | `/faq[/{category}]` | 9 | `/faq` · `/faq/pre-cruise` · `/faq/additional-faq` | 3 |
| 24 | Plan / policy page | `/plan/{topic}`, `/why-princess/{topic}` | 20 | `/plan/ezair` · `/plan/best-price-guarantee` · `/why-princess/new-to-cruising` | 3 |
| 25 | Legal / terms document | `/legal/{doc}`, `…/terms-and-conditions` under deals and dining | ~55 | `/legal` · `/legal/passage-contract` · `/cruise-deals-promotions/plus-premier-cruise-packages/terms-and-conditions` | 3 |
| 26 | Simple info page | `/company-information/…`, `/careers/…`, `/brochures`, `/find-travel-agents/`, `/accessibility-at-sea` | ~20 | `/company-information/about-princess` · `/careers` · `/find-travel-agents/` | 3 |
| 27 | Site search | `/search` (overlay from the header) | 2 | `/search` · header overlay | 3 |
| 28 | Account (signed in) | `/my-princess/account-login/` → `book.` subdomain pages | 2 public + ~10 signed in | Login page · account home · contact details | 3 |

Account pages are covered by the account check (the login exception in `CLAUDE.md`). Their section file describes structure only, never account values.

## Notes for our build
- **Fewer templates than URLs:** about 28 templates cover 8,000+ URLs. The four destination types (6–9) look like one page builder with optional modules: featured cruises, FAQ, port list, excursions, search link. Confirm in Phase 3, because one flexible template would be simpler for our build.
- **Booking core:** 4 templates (search, cruise detail, deck plan, checkout). Everything else is content that funnels into search.
- **Legal and terms pages** are spread across sections but look like one plain document template.
- **Answered in Phase 3:** blog articles and destination tip articles use the same article template (`sections/article.md`), and destination types 6–9 are one page builder (`sections/destination-pages.md`).
