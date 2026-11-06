# Account (login, signed-in pages)

Captured 2026-11-05: login page only (desktop 1440, mobile 390), not submitted. Raw: `captures/account-login/` (not in git). Signed-in structure is from the account check of 2026-11-05 (`account-check-*.json`, not in git), which records structure only, never account values.
Samples: `/my-princess/account-login/` · signed-in account home, contact details, deals, cruise days (on the `book.` subdomain).

## Purpose
Log in, create an account, and manage profile, loyalty status, saved cruises and personal offers. Booking management (check-in, payments, add-ons) is a separate signed-in app.

## URL pattern & samples
- Public: `/my-princess/account-login/`, `/my-princess/create-account/` (also linked as `/my-princess/login/`, `/my-princess/register/`)
- Signed in: `book.princess.com/captaincircle/{page}.page` (about 10 pages) and `book.princess.com/manage-booking/…`

## Layout (top → bottom)
**Login page**: slim header (logo only, marked as the page's h1) → two panels: **Log in** (login ID / email, password with show-password button, log in) | **Create an account** (embedded form in an iframe) → footer.

**Signed-in pages** (from the account check): account header with menu (9–10 links) → page content:
| Page | Shows (structure only) |
|---|---|
| Account home | links to all account pages |
| Contact details | profile, login, travel preferences, offers opt-in, passport details |
| Savings / cruise credits | credits list |
| Loyalty benefits, level, FAQ, terms | content pages, also public |
| Saved cruises | list (empty for both accounts) |
| Deals | personal offers with a countdown (existing guest only) |
| Cruise days | past cruises table: date, ship, destination, status, credits, days, onboard statement PDF (existing guest only) |

## Components used
Slim header · login form · password field with show / hide · embedded sign-up iframe · account menu · profile sections · data tables · offer countdown.

## Data fields
Login ID, password (never stored by us). Signed-in pages: profile fields, loyalty tier, cruise history, credits, offers. Our checks record only whether each field is filled.

## Interactions & states
Show / hide password; login errors ("confirm that you are using the correct login ID and password"); signed-out visitors to account pages are sent to the login page. A new account sees fewer pages (no cruise days) and no personal offers.

## Links out to
Booking site (manage booking) · loyalty pages · deals.

## Notes for our build
- **Keep:** login and create account side by side; a cruise history table; personal offers for returning guests.
- **Fix in ours:**
  - The login page's only h1 is the logo; the form headings are h2.
  - Sign-up failed silently when we tried it (the form returned an empty error), and the "personalized recommendations" block is blocked by the browser on most account pages (see the account check report).
- **Skip:** the iframe-embedded sign-up; build the form in the page.
