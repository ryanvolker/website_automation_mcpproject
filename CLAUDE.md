# Site Mapping Project — Instructions for Claude

We are mapping princess.com as a **structural reference** for building our own cruise site.
We document patterns (layout, components, data fields, flows), never their copy, images, or branding.

## Before doing anything in a new session
1. Read `site-map/progress.md` to see what is done and what is next.
2. Read `site-map/01-page-types.md` and any files in `site-map/sections/` related to the current task.
3. Do not redo work already marked done unless asked. Build on existing files.

## Folder layout
```
site-map/
  00-sitemap.md        # sections and URL patterns
  01-page-types.md     # page templates + 2–3 sample URLs each
  progress.md          # done / in progress / next / open questions
  components.md        # shared UI components across sections
  data-model.md        # cruise, ship, port, sailing, cabin fields
  sections/
    _template.md       # every section file follows this shape
    <page-type>.md
```
If existing files use different names or locations, keep them and note the mapping in `progress.md`. Don't rename without asking.

## The phased process
Follow these phases in order. Don't start a phase until the one before it has its output file.

**Phase 1: Inventory (cheap, no clicking)**
- Fetch `sitemap.xml` (linked from `robots.txt`). It's far faster than crawling.
- Capture the main nav and footer from the home page.
- Output: `00-sitemap.md`, listing the sections and their URL patterns (e.g. `/cruise-destinations/*`, `/ships/*`).

**Phase 2: Classify page templates**
- Group URLs by pattern into types: home, destination landing, cruise search results, itinerary detail, ship detail, deals, onboard experience, and so on.
- Pick 2–3 representative pages per type, not every page.
- Output: `01-page-types.md`, a table of each type with its URL pattern and sample URLs.

**Phase 3: Deep capture, one template at a time**
For each representative page:
- Use `browser_snapshot` (the accessibility tree) as the main tool. It gives page structure as text, which reads better than screenshots.
- Use `browser_take_screenshot` only for visual layout, at desktop (~1440px) and mobile (~390px) widths via `browser_resize`.
- Use `browser_network_requests` on search and listing pages to find the JSON APIs behind the results; they show the real data model.
- Interact lightly to find hidden states: dismiss the cookie banner first, then open filters, expand accordions and open the mega-menu.

**Phase 4: Write and review**
- After each template, write its `sections/<page-type>.md` before moving on.
- Stop and ask the user to review each file before starting the next template, so a bad structure gets fixed early.

## Mapping rules (Playwright MCP)
- Map page **types**, not every page. Use 2–3 representative URLs per type.
- Prefer `browser_snapshot` (accessibility tree) for structure. Use screenshots only for visual layout.
- Capture desktop (1440px) and mobile (390px) via `browser_resize`.
- Dismiss the cookie banner first. Use `browser_wait_for` before snapshotting JS-loaded content.
- Check `browser_network_requests` on search/listing pages to find the data APIs behind them.
- Open menus, filters, tabs, and accordions to find hidden states.
- **Write findings to the section file after each page.** Don't hold large snapshots in memory.
- Work on one page type per session.

## Hard limits
- Read-only. Never log in, start a booking, or submit any form.
- Keep request volume low and respect robots.txt.
- Don't copy Princess's text, images, logos, or brand names into our files. Describe them instead (e.g. "hero image of ship at sea").

## Section file template
Every `sections/<page-type>.md` uses these headings:
- Purpose
- URL pattern & samples
- Layout (top → bottom)
- Components used (link to components.md)
- Data fields (table: field | example | source DOM/API)
- Interactions & states (filters, empty, loading, mobile differences)
- Links out to
- Notes for our build (keep / simplify / skip)

## When a section is finished
- Add any new shared components to `components.md` and new fields to `data-model.md`.
- Update `progress.md`: mark done, list the next page type, note open questions.

## Skills
- Skills live in `.claude/skills/<name>/SKILL.md`, one folder per skill, named `princess-<area>`.
- Each `SKILL.md` starts with frontmatter: `name` (same as the folder) and `description` (what it does, then "Use when…" with the words a user would say).
- Write a skill only after its section is mapped and reviewed. The skill tells Claude how to use that section's data and scripts (files, commands, how to answer); the section file describes the page structure.
- Prefer adding to an existing skill over making a new one. Update `princess-site-guide` whenever a skill is added.

## How this fits the existing repo
These notes reconcile the rules above with work done before this file existed.

- **Two kinds of output.** `site-map/` holds the structural reference for our build and follows the no-copy rule. `data/sites/princess.com/` holds crawl and test data (page text, prices, API results) used by the testing framework and the `.claude/skills/princess-*` skills. That folder is raw test data, not build material.
- **Playwright MCP often fails to connect here.** If it does, use the Node Playwright scripts in `packages/princess/` (same browser, 1440×900 desktop context). Use `browser_snapshot` when the MCP works.
- **Login exception.** The account check (`princess-account-check` skill, `check-account.mjs`) logs in with the accounts in `.env` at the user's request. It blocks PUT/PATCH/DELETE requests and never submits forms or changes settings. `create-test-account.mjs` submitted the sign-up form once to create the test account; don't run it again without asking.
- **Secrets.** Never commit `.env`, `.auth/` or `account-check*.json`, and never print or save personal values from an account.
- **Repo size.** Daily or repeat outputs (history, link checks, search scans, account checks) go in `.gitignore`. Commit a data file once as a baseline only when it's worth keeping.
- **Git.** Commit or push only when asked.
