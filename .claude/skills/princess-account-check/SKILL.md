---
name: princess-account-check
description: Log in to princess.com with the reusable test account and check the account settings section (pages only visible when signed in) - whether each settings page loads, which sections and fields appear, which fields are empty, and whether the account services behind them respond. Use when the user asks to check the logged-in or account side of princess.com, account settings, My Princess, or Captain's Circle profile pages.
---

# Princess account settings check

## Setup (once)

1. Create one test account by hand on princess.com (https://www.princess.com/my-princess/register/). Reuse it for every run; don't create new accounts.
2. Copy `.env.example` to `.env` at the repo root and fill in `PRINCESS_LOGIN_ID` and `PRINCESS_PASSWORD`. `.env` is git-ignored. Never print, log or commit these values.

## Run (repo root)

`npm run check:account -w @wa/princess` checks the settings pages. `node packages/princess/check-account.mjs --all` crawls the whole account section: account home, Account/Contact Info, Circle Savings/Cruise Credits, Captain's Circle benefits and level, Membership FAQ, Terms, Saved Cruises, Deals and Cruise History.

- Takes about a minute. It logs in, or reuses the saved sign-in in `.auth/princess.json` (git-ignored), opens the account home page, follows the settings links and each settings tab, and writes `data/sites/princess.com/account-check.json` (git-ignored).
- `node packages/princess/check-account.mjs --headed` shows the browser. Use it when the login stops at a verification code or a bot challenge, then finish it by hand in the window. The saved sign-in is reused on later runs.
- Each page is also opened logged out, to record whether it really needs a login (`loggedOut.needsLogin`).
- `--fresh` ignores the saved sign-in and logs in again.

## Report

Summarize briefly, one line per page: OK, Warning or Problem, plus the HTTP status and load time. Then list any:

- Pages that are blank or show an error message.
- Failed account requests (status 400 or above).
- Fields that are empty when they should be filled in (for example, name or email).
- Known issue (2026-11-04): the "Recommended for You" box (p13n.princess.com) is blocked by the browser (ERR_BLOCKED_BY_ORB) on most account pages. It counts as a warning, not a problem.
- Changes from the last run (pages, sections or fields added or removed), if a previous result exists.

## Rules

- Look only: open pages and follow links. Never edit settings, save forms, change the password, book, cancel or pay. The script blocks PUT, PATCH and DELETE requests to princess.com.
- The output keeps structure only: page names, headings, field labels, filled or empty, and request status. It redacts values. Never repeat personal values from the account to the user or into files.
- Run at most a few times a day.
