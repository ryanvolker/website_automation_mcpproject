# website_automation_mcpproject

Monorepo for website automation using [Playwright](https://playwright.dev) and
the [Playwright MCP server](https://github.com/microsoft/playwright-mcp).

## Structure

```
.
├── .mcp.json                 # Playwright MCP server config for Claude Code
├── package.json              # npm workspaces root
├── tsconfig.base.json        # shared TypeScript settings
├── docs/
│   └── using-playwright-mcp.md
└── packages/
    ├── e2e/                  # Playwright tests
    │   ├── playwright.config.ts
    │   ├── tests/            # *.spec.ts files
    │   ├── pages/            # page objects
    │   ├── fixtures/         # custom test fixtures
    │   └── test-data/        # JSON test data
    └── shared/               # helpers shared across packages
        └── src/
```

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
