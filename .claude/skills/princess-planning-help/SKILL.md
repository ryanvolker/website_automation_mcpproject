---
name: princess-planning-help
description: Answer Princess Cruises planning and policy questions from the site's FAQ and planning pages - travel documents and visas, what to pack and prohibited items, OceanReady check-in, cancellation and refund policy, future cruise credits, payment plans (EZpay, pay monthly), deposits, EZair flights, flight arrival guidelines by port, vacation protection, accessibility, casino and onboard charges. Use for "can I…", "what's the policy…", "how do I…" questions about a Princess cruise.
---

# Princess planning and help

## Data

- `data/sites/princess.com/help.json`: the FAQ hub plus pre-cruise, onboard, post-cruise and cruisetour FAQs, flight guidelines by port, the Mexican Riviera page, accessibility at sea, about Princess, brochures, and the shore excursions and Alaska lodge overviews.
- `data/sites/princess.com/deals.json`: also covers `/plan/` pages, including standard cancellation and refund policy, impacted and cancelled cruises, future cruise credits, EZpay, pay monthly, best price guarantee, OceanReady, EZair and vacation protection.
- In both files, each page's `blocks` hold the question or heading with the answer text (collapsed FAQ answers included, cut at 400 characters). Full text is in the local `text/` files when needed.

## Look it up (no browser)

`node packages/princess/princess.mjs find <question words> --section help`
`node packages/princess/princess.mjs find <question words> --section deals` (payments, cancellations, credits)
Example: `node packages/princess/princess.mjs find cancellation refund final payment`

## Answering

- Answer from the matching block, quoting key numbers (days before sailing, fees, limits), and link the page.
- If the answer is cut off (400-character block limit), open the page live or read the full text from `data/sites/princess.com/text/<section>-<stamp>.json` (keyed by URL).
- Policies vary by market, fare type and date booked. Say "according to princess.com as of <crawledAt>" and suggest the user confirm for their booking.
- Don't present this as legal or immigration advice. For documents and visas, point to the official requirement as well.

## Out of scope

Anything about a specific booking (balances, check-in status, documents on file) needs the user's login at book.princess.com. Never automate it.
