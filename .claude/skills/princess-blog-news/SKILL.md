---
name: princess-blog-news
description: Find Princess Cruises blog articles, travel guides, videos and news releases (new ships, itinerary announcements, cruise updates, fact sheets) by topic or date. Use when the user asks for Princess articles or guides about a place or theme, recent Princess news or announcements, or what Princess has published lately.
---

# Princess blog, videos and news

## Data

`data/sites/princess.com/content-index.json` is built from the sitemap. Articles aren't crawled.
- `items[]`: `type` (blog, video or news), `category` (for news: news-releases, cruise-updates, backgrounders-and-fact-sheets; for videos: the video category), `title` (taken from the URL), `url`, `published` (year and month, for news releases), `lastmod`, `topics` (tags such as alaska, europe, dining, family, celebrations, ships, excursions, first-time).
- `topicCounts`: number of items per topic.
- `deckPlans`: a deck plan URL for each ship code.

Refresh with `npm run sitemap -w @wa/princess` (one request; it also updates `sitemap.json`).

## Look it up

- By words: `node packages/princess/princess.mjs find best time alaska --section content`
- Latest news: read `items` where `type == "news"`, sorted by `published`/`lastmod` (the list is already newest first).
- By topic: filter `items` by `topics`.

## Answering

- List the most relevant 3–8 items with title, type, date and link.
- Titles come from URLs, so they may lack punctuation. To summarize an article, open it live (Playwright MCP, or `node packages/site-mapper/map-page.mjs <url> <outDir> <name>`) and read it first.
- For "what's new at Princess", combine recent news releases with `princess-site-changes` (sitemap changes).
