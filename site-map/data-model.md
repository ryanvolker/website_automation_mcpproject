# Data model

Entities and fields seen so far, with where they come from. Started 2026-11-05 from the search results page's data calls; extended as each section is mapped.
Field names are the source system's, kept so they can be traced; our build can rename them.

## Itinerary (search: "product")
One bookable route. Shown as one search result card.
| Field | Example | Source |
|---|---|---|
| id | `ABC01A` | `resdb/p1.0/products` → `products[].id` |
| name | `Panama Canal - Ocean to Ocean` | `products[].name` |
| regions | `[{id: "T", subTrades: [...]}]` | `products[].trades[]` |
| sub-regions | `[{id: "TO"}]` | `products[].subTrades[]` |
| sailings | list of Sailing | `products[].cruises[]` |

## Sailing (search: "cruise", URL: `voyageCode`)
One departure of an itinerary on one date and ship.
| Field | Example | Source |
|---|---|---|
| id / voyage code | `A716A` | `cruises[].id`, `voyage.id` |
| product code | `TLF` | `cruises[].productCode` |
| start / end date | `20261106` / `20261122` | `cruises[].startDate`, `.endDate` (YYYYMMDD) |
| duration | `16` | `voyage.duration` |
| start / end port | `FLL` / `LAX` | `voyage.startPortId`, `.endPortId` |
| ship | `ST` | card text; ship list below |
| ports of call | list of Port | card links; full list on the cruise detail page |
| flags | `oceanFlag`, `oceanDine`, `sailFlag`, `upperBerthGuarFlag` | `voyage.*` (meanings unknown) |

## Price (per sailing)
| Field | Example | Source |
|---|---|---|
| currency | `USD` | `pricing/v1/cruises` → `pricing.fareCurrency` |
| fees / taxes | `86` / `36` | `pricing.rcfe`, `pricing.igvt` |
| fuel surcharge | `0` | `pricing.fuelSurcharge` |
| fare type | `BESTFARE` | `pricing.fares[].fareType` |
| cabin type (meta) | `B` | `fares[].metas[].id`, `.bestCategory`, `.status` |
| category | `BF` | `fares[].categories[].id` |
| price per guest | `245` | `categories[].averageGuestPrice` (taxes included) |
| was price | `455` | `categories[].averageGuestBrochurePrice` |
| availability | `9+`, `15` cabins | `categories[].availability`, `.availableCabins` |
| guests per cabin | `1`–`2` | `categories[].minimum`, `.maximum` |
| non-refundable flag | `D` | `categories[].nonRefFlag` |

The price request is a POST that includes guest count and booking agency. Prices change with guests and fare type.

On the cruise detail page the same price call is made for one sailing (`pricing/v1/cruises/{code}`) and returns more: every cabin category (e.g. 21), both fare types (standard and bundled), and `decks[]` / `deck-groups[]` (id, name) for the booking step.

## Itinerary day (per sailing)
| Field | Example | Source |
|---|---|---|
| port id | `FLL1` (port code + visit number) | `resdb/p1.0/itineraries` → `cruises[].itineraries[].id` |
| type | `P` (port); sea days and scenic cruising use other types | `.type` |
| day index | `0` (counts from 0; shown as Day 1) | `.dayIn` |
| arrive / depart date | `20261213` | `.arrivalDt`, `.departDt` |
| arrive / depart time | `""` / `03:00 PM` | `.arrivalTime`, `.departTime` |
| boarding time | `12:00 PM` (embark day) | `.boardingTime` |
| pier | `P` | `.pierCode` |
| port list | id, name, countryId, isEmbark, isDisembark | `itineraries` → `ports[]` |

## Port (content)
| Field | Example | Source |
|---|---|---|
| id, name, type | `CZM`, port name, `P` | GraphQL `master-data-itinerary-ports;portCode={id}` |
| page links | excursions page, destination port guide, departure port page | `.url`, `.anyPortStopURL`, `.departurePortURL` |
| gallery | images + alt texts | `.galleryImages`, `.galleryAltTexts` |
| points of interest | title, … | `.points_of_interest.details[]` |

## Excursion (per port)
| Field | Example | Source |
|---|---|---|
| id | `FLL-630` | `db-excursion/p1.0/ports/{port}/excursions` → `excursions[].id` |
| name, description, short description | | `.name`, `.description`, `.shortDescription` |
| images | list | `.images[]` |
| duration (hours) | `3.5` | `.duration` |
| price, currency | `89.95`, `USD` | `.price`, `.currency` |
| type, activity level | `S`, `Easy` | `.excursionType`, `.activityLevel` |
| accessible, shopping, food | `No` | `.accessibility`, `.shopping`, `.foodService` |
| points of interest | id, title, category | `.pointsOfInterests[]` |
| rating, review count | `3.6`, `116` | shown on cards; not in this call (source not yet traced) |

## Ship
| Field | Example | Source |
|---|---|---|
| code, name | `SU` | URL slug `{code}-{name}`; `resdb/p1.0/ships` |
| layout versions | version + start / end date | `resdb/p1.0/ships` → `versionDates`; deck plan chooser |
| facts | guests, crew, tonnage, decks, length, inaugural year | ship page facts block (`fleet-map.json` → `facts`) |
| content | features, suites, venues | GraphQL `master-data-ship-list;shipCode=;shipVersion=` and page HTML |

## Deck, public room and cabin (per ship layout)
| Field | Example | Source |
|---|---|---|
| deck | number `7`, name | deck XML `<Deck number name>` |
| public room | name, deck | deck XML `<PublicRoom name>` |
| category | code, type, meta (I/O/B/M/S), name, description | deck XML `<Category>`; `getDeckJSON.do` |
| cabin | number, category, zone, sq ft, balcony sq ft, berths, wheelchair, connecting, notes | `getDeckJSON.do?shipCode=&version=&deck=` (`deck-plans.json` stores rows in this order) |

## Venue (restaurant, bar, activity)
| Field | Example | Source |
|---|---|---|
| name, section | dining / bars / activities / wellness / kids | ship pages (`fleet-map.json` → `venues`) |
| page | `/cruise-dining/{venue}` | dining pages |
| ships | list of ship codes | built by us: `fleet-map.json` → `venueIndex` |
| decks | per ship | joined from deck plans |

## Deal / sale
| Field | Example | Source |
|---|---|---|
| code, name, start / end, colour, message | `ADG`, Last Minute Deals | `sale-names.json` |
| banner, filter name, signed in / out text | | `sale-banners.json` |
| promo applied to sailings | | `resdb/p1.0/promos/sales` (7 MB) |
| deal row cruises | itineraries + sailings | `resdb/p1.0/deals` |
| page, terms | `/cruise-deals-promotions/{deal}` | deal pages |

## Content (article, FAQ, page)
| Field | Example | Source |
|---|---|---|
| title, type, date, topics, URL | article / video / release / fact sheet | `content-index.json` |
| FAQ question / answer | | page HTML (`destinations.json`, `help.json` → `faqs`) |
| site search item | title, snippet, type | external search service (7,417 items) |

## Reference lists
| List | Fields | Source |
|---|---|---|
| Region (trade) | id, name | `resdb/p1.0/trades` (15) |
| Sub-region | id, name | `resdb/p1.0/subtrades` |
| Port | id, name, countryId; continents | `resdb/p1.0/ports` |
| City | id, name | `resdb/p1.0/cities` |
| Ship | id, name, versionDates (layout version with start/end date) | `resdb/p1.0/ships` (17) |
| Cabin type (meta) | id, name, subMetas (id, name) | `resdb/p1.0/metas` (5 types, e.g. 15 suite sub-types) |
| Sale | id, code, name, startDate, endDate, desc, colour, message | `static/.../sale-names.json` (82) |
| Sale banner | code, bannerType, colour, showFilter, filterName, signed in / out text | `static/.../sale-banners.json` |

Ship `versionDates` match the deck plan layouts in `deck-plans.json` (a ship with a refit has two versions).
