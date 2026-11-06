# Article (travel tips, blog, news)

Captured 2026-11-05 (desktop 1440, mobile 390). Raw: `captures/travel-tips*`, `blog*`, `news*` (not in git). Index of 1,051 articles and news items: `content-index.json`.
Covers page types 10 (travel tips), 21 (blog) and 22 (news) in `01-page-types.md`. They share one article template and one hub template, so they're one file (this settles the open question in `01-page-types.md`).

Samples:
- Tips hub: `/cruise-destinations/alaska-cruises/alaska-cruise-tips` · tip articles: `…/learn-about-alaska/inside-passage-alaska-cruise`, `/caribbean-cruises/caribbean-cruise-tips/learn-about-the-caribbean/caribbean-cruise-weather-by-month`
- Blog: `/blog` (hub), `/blog/best-time-to-see-northern-lights-on-an-alaska-cruise`, `/blog/video/onboard-experience/activities-family-cruising` (**404**)
- News: `/news` (hub), a 2026 release, a fact sheet

## Purpose
Editorial content for search traffic and trip research (tips, guides, weather, videos) and press material (releases, fact sheets). Articles end with calls to explore cruises.

## URL pattern & samples
- Tips: `/cruise-destinations/{region}/{region}-cruise-tips[/{topic}/{article}]` (10 hubs, ~67 articles)
- Blog: `/blog`, `/blog/{article}`, `/blog/video/{topic}/{video}` (655)
- News: `/news`, `/news/news-releases/{yyyy}/{mm}/{slug}`, `/news/backgrounders-and-fact-sheets/{slug}` (396)

## Layout (top → bottom)
**Hub (tips hub, blog home)**
1. Global header, then a secondary blog navigation bar (topics).
2. Featured articles (3 cards), "recent articles" grid.
3. Email sign-up block, a blog title block, podcast promo, topic rows, "browse cruises".
4. Global footer.

**Article**
1. Global header + blog navigation.
2. h1 title, optional "key takeaways" box, and (blog) an "On this page" table of contents that links to each h2.
3. Body: numbered h2 sections, h3 sub-sections, images, tables (e.g. weather by month), inline call-to-action cards ("start your {place} adventure").
4. Optional FAQ accordion (7 questions on the weather article).
5. "Ready to explore {place}?" card, "you may also like" related links.
6. Global footer.

**News** uses a simpler press layout: hub with two videos and "recent news" by date; a release is a plain article (h1, date, h2 sections, tables) ending with a "media contacts" table and a press sign-up form (first / last name). Fact sheets are the same with mostly tables.

Mobile: single column; blog navigation collapses into a menu.

## Components used
Full global header · blog topic nav · article card (image, title) · email sign-up block · key takeaways box · data table · inline CTA card · FAQ accordion · related links · global footer.

## Data fields
| Field | Example | Source |
|---|---|---|
| Title, date, topics, type (article / video / release / fact sheet) | | page HTML; `content-index.json` |
| Body sections, tables | | page HTML (CMS) |
| Related links | | page HTML |

No catalogue data is loaded.

## Interactions & states
FAQ accordion; carousels on hubs; video embeds on video pages.
**404s:** some sitemap URLs return 404 (e.g. the blog video sample). The sitemap advertises pages that no longer exist.

## Links out to
Region and port pages · search results · other articles · ship and onboard pages.

## Notes for our build
- **Keep:** one article template for tips, blog and news; key takeaways at the top; FAQ at the end; inline CTA cards; related links.
- **Fix in ours:**
  - One h1 per page. The tips hub and blog home have two (the email sign-up block and the blog title are both h1), and blog articles mark the share block as a second h1 ("SHARE").
  - Remove deleted pages from the sitemap (404s found for a blog video and a dining venue).
- **Simplify:** tip articles live under destination URLs but use the blog template. Pick one home for articles and link to them from destinations.
