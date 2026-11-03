# website_automation_mcpproject

Monorepo for website automation using [Playwright](https://playwright.dev) and
the [Playwright MCP server](https://github.com/microsoft/playwright-mcp).

## Structure

```
.
├── .mcp.json                 # Playwright MCP server config for Claude Code
├── package.json              # npm workspaces root
├── tsconfig.base.json        # shared TypeScript settings
├── .claude/skills/           # Claude skills (princess-deals, -ships, -destinations)
├── data/sites/               # page maps captured from websites
│   └── princess.com/
│       ├── home.json         # clean map: search form, destinations, ports, ships, deals, menus
│       ├── home.raw.json     # everything captured (all links, buttons, fields)
│       ├── home.aria.yml     # accessibility tree snapshot
│       └── home.png          # screenshot
├── docs/
│   └── using-playwright-mcp.md
└── packages/
    ├── e2e/                  # Playwright tests
    │   ├── playwright.config.ts
    │   ├── tests/            # *.spec.ts files
    │   ├── pages/            # page objects
    │   ├── fixtures/         # custom test fixtures
    │   └── test-data/        # JSON test data
    ├── princess/             # Princess Cruises lookups (search, deals, codes)
    ├── site-mapper/          # maps any page into JSON
    └── shared/               # helpers shared across packages
        └── src/
```

## Princess Cruises

```bash
# Refresh the home page map
npm run map:home -w @wa/princess

# Live lookups (print JSON)
node packages/princess/princess.mjs search --destination alaska --port seattle --month 2027-06
node packages/princess/princess.mjs search --ship "sun princess" --days 7
node packages/princess/princess.mjs search --visits santorini --month 2027-06
node packages/princess/princess.mjs details 4726          # stateroom prices + itinerary
node packages/princess/princess.mjs deals
node packages/princess/princess.mjs codes

# Offline lookups over crawled data
node packages/princess/princess.mjs find glacier bay --section destinations
node packages/princess/princess.mjs excursions juneau --max-price 100 --sort rating

# Refresh data (crawls are polite and slow; run in the background)
npm run sitemap -w @wa/princess              # all ~8,000 URLs, seconds
npm run crawl:destinations -w @wa/princess   # 537 pages, ~2.5 h
npm run crawl:ships -w @wa/princess          # also: crawl:dining, crawl:deals, crawl:help
npm run crawl:excursions -w @wa/princess     # 471 ports, ~2.5 h

# Change report: compares the two newest snapshots of a section
npm run report -w @wa/princess --silent -- destinations
```

See [docs/princess-site-map.md](docs/princess-site-map.md) for the site's sections, what each one does, and which skill covers it.

## Getting started

```bash
npm install
npm run install:browsers
cp .env.example .env   # optional: change BASE_URL
npm test
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm test` | Run all tests headless |
| `npm run test:headed` | Run tests with a visible browser |
| `npm run test:ui` | Open Playwright UI mode |
| `npm run report` | Open the last HTML report |
| `npm run codegen` | Record a test by clicking through a site |

See [docs/using-playwright-mcp.md](docs/using-playwright-mcp.md) for how to use
the MCP server to explore sites and generate tests.
