---
name: princess-destination-changes
description: Re-crawl the Princess Cruises destination pages and report what changed since the last crawl (pages added or removed, ports, sections, FAQs, page copy, featured cruises and prices). Use when the user asks what changed on Princess destinations, wants a destination change report, or asks to refresh the destination snapshot.
---

# Princess destination change report

## Tools (run from the repo root)

- Crawl: `npm run crawl:destinations -w @wa/princess`
  This visits the 39 destination pages, 2 at a time with pauses, and takes about 7–8 minutes. Run it in the background. It writes `data/sites/princess.com/destinations.json` and a timestamped copy in `data/sites/princess.com/snapshots/`.
- Compare: `npm run report:destinations -w @wa/princess --silent`
  This compares the two newest snapshots and prints a Markdown report. To compare specific crawls, run `node packages/princess/compare-destinations.mjs <old.json> <new.json>`. Add `--json` for machine-readable output, or `--out <file>` to save the report.

## Steps

1. Check `data/sites/princess.com/snapshots/` for the newest snapshot's time. If the user wants current changes, or the newest crawl is more than a day old, run the crawl first.
2. Run the comparison.
3. Summarize for the user, most important first:
   - **Structural changes:** pages added or removed, redirects, port codes or port pages added or removed, new or removed sections, headings and FAQs. These are the real destination changes.
   - **Page copy changed:** the text changed, with numbers ignored. Say which pages; open them if the user wants details.
   - **Featured cruises and prices:** cruises added or removed from a page, and price moves with percentages.
   - **Newly discovered pages:** destination pages linked for the first time.
4. If they ask for a shareable report, publish it as a page. Otherwise reply in chat.

## Notes

- A snapshot records what the pages showed at crawl time. Prices are "from" prices printed on the destination pages, not live search results.
- Snapshots are kept in git, so any two crawls can be compared later.
- Read-only. Don't run crawls more than a few times a day.
