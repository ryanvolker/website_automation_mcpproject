---
name: princess-site-changes
description: Re-crawl sections of princess.com and report what changed since the last crawl - destinations, ships, dining, deals, help pages, shore excursions (added, removed, price changes) and the sitemap (new, dropped and updated pages). Use when the user asks what changed on the Princess site or a section of it, wants a change report, or asks to refresh Princess data.
---

# Princess site change reports

Each crawl saves a timestamped snapshot in `data/sites/princess.com/snapshots/`. A report compares the two newest snapshots of a section.

## Commands (repo root)

| Section | Refresh (crawl) | Time | Report |
|---|---|---|---|
| Sitemap (all ~8,000 URLs) | `npm run sitemap -w @wa/princess` | seconds | `npm run report -w @wa/princess --silent -- sitemap` |
| Destinations (537 pages) | `npm run crawl:destinations -w @wa/princess` | ~1.5–2 h | `… report … -- destinations` |
| Ships & staterooms (96) | `npm run crawl:ships -w @wa/princess` | ~25 min | `… -- ships` |
| Dining (66) | `npm run crawl:dining -w @wa/princess` | ~20 min | `… -- dining` |
| Deals & planning (52) | `npm run crawl:deals -w @wa/princess` | ~15 min | `… -- deals` |
| Help (15) | `npm run crawl:help -w @wa/princess` | ~5 min | `… -- help` |
| Shore excursions (471 ports) | `npm run crawl:excursions -w @wa/princess` | ~2–2.5 h | `… -- excursions` |

Run crawls in the background. Run at most two crawls at a time, and no more than a few times a day.
Report options: `--json` for machine-readable output, `--out <file>` to save, `--words` to show the changed sentences (needs the local `text/` files from both crawls). To compare specific crawls: `node packages/princess/compare.mjs <section> <old.json> <new.json>`.

## Steps

1. **Start with the sitemap.** It's one request. Its report shows which pages Princess added, dropped or republished in each section, so you can decide which sections are worth re-crawling.
2. Crawl the sections the user asked about, or the ones the sitemap shows changing. Check the newest snapshot time first; if it's less than a few hours old, just report.
3. Run the report for each section.
4. Summarize, most important first:
   - **Structural:** pages, ports or excursions added or removed, redirects, sections, headings, FAQs, buttons.
   - **Wording:** "page copy changed". Use `--words` to show which sentences changed.
   - **Commercial:** featured cruises added or removed, price moves with percentages, excursion price changes.
5. For a shareable report, publish it as a page. Otherwise answer in chat.

## Notes

- The sitemap's "last modified" dates miss some changes, like promo banners and featured cruises. Crawls catch them.
- The text hash ignores numbers, so price and countdown changes don't count as copy changes.
- Snapshots are committed to git; the `text/` files stay local.
