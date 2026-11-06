# Destination pages (region, sub-region, port guide, departure port)

Captured 2026-11-05 (desktop 1440, mobile 390). Raw: `data/sites/princess.com/captures/destination-*`, `port-guide*`, `departure-port*` (not in git). Crawl data for all 537 pages: `destinations.json`.
Covers page types 6–9 in `01-page-types.md`. **One section file**, because they're one modular page builder (confirmed: same header, sticky section menu, module set and footer; only the choice and order of modules differ).

Samples:
- Region: `/alaska-cruises` (full), `/caribbean-cruises`, `/european-cruises`
- Sub-region / theme: `/caribbean-cruises/eastern-caribbean` (full), `/alaska-cruises/cruisetour-options`, `/alaska-cruises/glaciers`
- Port guide: `/alaska-cruises/cruise-to-juneau` (full), `/caribbean-cruises/cruises-to-freeport`, `/asia-cruises/cruises-to-thailand`
- Departure port: `/departure-ports/cruises-from-southampton` (full), `/departure-ports` (hub), `/departure-ports/cruises-from-fort-lauderdale`

(All under `/cruise-destinations`.)

## Purpose
Landing pages for search engines and browsing: sell a place (region, area, port or home port), answer common questions, and push visitors into pre-filtered search results and featured cruises.

## URL pattern & samples
- Region: `/cruise-destinations/{region}-cruises` (37)
- Sub-region / theme: `/cruise-destinations/{region}/{topic}` (~69)
- Port guide: `/cruise-destinations/{region}/cruise(s)-to-{port}` (~320)
- Departure port: `/cruise-destinations/{region-or-departure-ports}/cruises-from-{port}` (37) + hub `/cruise-destinations/departure-ports`

## Layout (top → bottom)
Fixed parts:
1. Full global header.
2. **Hero**: image or video, h1 (a place name, or a marketing line on the biggest regions), optional "why cruise {place}?" button.
3. **Sticky section menu**: a row of buttons that jump to page sections (7–8 on regions). On mobile it becomes a dropdown ("Must-sees ▾").
4. Modules (chosen per page, see below).
5. "Let us get you there": carousel of travel add-ons (cruise + hotel, flights, transfers).
6. "Cruise deals and promotions" and "You may also like" link rows.
7. Global footer.

Modules (how often each appears, from the 537-page crawl):
| Module | What it is | Seen on |
|---|---|---|
| Deal carousel | Featured cruises / deals with "view cruises" buttons | regions, sub-regions, most port guides |
| Email sign-up | Same three-field form as home | most pages |
| Intro | Heading + paragraph(s) + image | all |
| Ports tabs | Tabs or carousel of port cards ("featured ports") | regions, sub-regions, departure hub |
| Activities | Tabs (wildlife, outdoor, history, food…) over a card carousel | regions, sub-regions, port guides |
| Spotlight / day in port | Feature block with image and text | regions |
| Lodges / cruisetours tabs | Tabs per lodge or tour length | Alaska pages |
| Reviews carousel | Guest quotes | some sub-regions |
| Ships table / "discover our ships" | Ship cards for ships sailing here | port guides, departure ports |
| Excursions carousel | Excursion cards with ratings | port guides |
| FAQ accordion | 3–13 questions (FAQ markup) | 80% of pages |
| Featured cruises | Cards with price (crawl found them on 365 pages) | port guides, regions |

## Components used
See [components.md](../components.md): full global header · hero · sticky section menu · deal carousel · email sign-up form · content carousel · tab set · card grid · FAQ accordion · travel add-ons carousel · link rows · global footer.

## Data fields
| Field | Example | Source (DOM / API) |
|---|---|---|
| Place name, h1, intro | | page HTML (CMS) |
| Region / port codes | `A`, `JNU` | search links in the page (`trade=`, `itinPort=`, `startPort=`); `destinations.json` → `tradeCodes`, `portCodes` |
| Featured cruises | voyage code, title, "from" price | `resdb/p1.0/deals` + `pricing/v1/cruises` (POST) |
| FAQs | question, answer | page HTML (`destinations.json` → `faqs`) |
| Excursions | name, rating, price | excursion links (`excursionLinks`) |
| Ships | ship cards | page HTML |

## Interactions & states
- Sticky section menu scrolls to sections; on mobile it's a select.
- Tabs switch module content (activities, ports, lodges); on mobile tabs collapse into a "toggle tabs" dropdown.
- FAQ accordion: one question opens at a time.
- Carousels: prev / next; cloned slides are exposed to screen readers.
- Load: first content in 1.5–2.6 s.

## Links out to
Search results (pre-filtered by region, port or departure port) · cruise detail (featured cruises) · excursion pages · ship pages · deal pages · related destination pages.

## Notes for our build
- **Keep:** one page builder with optional modules for all four place types; a sticky section menu; FAQ blocks (good for search engines); every page ends in a pre-filtered search.
- **Simplify:** pick modules from data (if a port has excursions, show the excursions module) instead of hand-building each page.
- **Fix in ours:**
  - Copy mistakes slip through: "Why cruise **to** Southampton?" on a cruises-**from** page; "before its gone".
  - Duplicate FAQ question on the Alaska page ("How early should I book…" appears twice).
  - Ship names used as h2 headings in a list (port guide).
  - Carousel clones read out twice.
- **Departure ports hub** (`/departure-ports`): the same builder with port groups by continent (tabs and carousels).
