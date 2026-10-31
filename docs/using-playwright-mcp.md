# Using the Playwright MCP server

The Playwright MCP server lets Claude open a real browser, click around a site,
and read the page. Use it to explore a site, then turn what it finds into
Playwright tests in `packages/e2e`.

## Setup

The server is configured in `.mcp.json` at the repo root. When you open this
folder in Claude Code, it asks you to approve the `playwright` server. Run
`/mcp` in Claude Code to check that it's connected.

## Suggested workflow

1. Ask Claude to explore a page, for example:
   "Use the Playwright MCP to open https://example.com and list the main user flows."
2. Ask Claude to write a test for one flow:
   "Write a Playwright test for the login flow in packages/e2e/tests, using a page object in packages/e2e/pages."
3. Run it: `npm test`
4. Fix anything that fails, then commit.

## Where things go

| What | Where |
| --- | --- |
| Test specs | `packages/e2e/tests/` |
| Page objects | `packages/e2e/pages/` |
| Custom fixtures | `packages/e2e/fixtures/` |
| Test data | `packages/e2e/test-data/` |
| Shared helpers (env, utils) | `packages/shared/src/` |
