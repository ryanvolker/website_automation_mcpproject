# Legal / terms document

Captured 2026-11-05 (desktop 1440, mobile 390). Raw: `captures/legal*` (not in git).
Samples: `/legal` (hub, full) · `/legal/passage-contract` · `/legal/passage_contract` · `/cruise-deals-promotions/plus-premier-cruise-packages/terms-and-conditions`.

## Purpose
Contracts, terms, privacy and deal conditions.

## URL pattern & samples
`/legal[/{doc}]` (26) and `…/terms-and-conditions` under deals, dining and plan pages (~30).

## Layout (top → bottom)
**Hub**: h1 → 10 tabs (passage contract, privacy & cookies, website terms, accessibility, excursion terms, guest-tech legal, passenger bill of rights, EU regulations, coast guard, safety & security) → link table → three cruise promo cards → email sign-up → footer.
**Document**: h1 → intro h2 → body text (and tables) → cruise promo cards → email sign-up → footer.

## Components used
Full global header · tab set · link table · document body · cruise promo cards · email sign-up · global footer.

## Data fields
Document title, body, last updated: page HTML.

## Interactions & states
Tabs on the hub. Otherwise static.

## Links out to
Other legal documents · PDFs · search results (promo cards).

## Notes for our build
- **Keep:** one plain document template for all legal and terms text.
- **Fix in ours:**
  - **Duplicate URLs:** `/legal/passage-contract` and `/legal/passage_contract` both return 200 with the same page. Pick one and redirect the other.
  - Promo buttons have slug names for screen readers ("view-cruise", "learn-more").
- **Skip:** sales promos on contract pages.
