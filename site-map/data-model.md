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
