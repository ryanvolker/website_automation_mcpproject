// Live lookups on princess.com. Prints JSON to stdout.
//
// Usage:
//   node princess.mjs search [--destination Alaska] [--port Seattle] [--month 2027-06]
//                            [--ship "Star Princess"] [--days 7 | --days 7-10]
//                            [--promo 2GD] [--url <results url>] [--limit 10]
//   node princess.mjs deals
//   node princess.mjs codes            (print destination / port / ship / month codes)
//
// Names are matched loosely against data/sites/princess.com/home.json,
// so "alaska", "A", "seattle", "SEA", "star", "ST" all work.

import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const MAP = JSON.parse(await fs.readFile(path.resolve(here, '../../data/sites/princess.com/home.json'), 'utf8'));
const BASE = 'https://www.princess.com';
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36';

// ---------- argument parsing ----------
const [command, ...rest] = process.argv.slice(2);
const args = {};
for (let i = 0; i < rest.length; i++) {
  if (rest[i].startsWith('--')) args[rest[i].slice(2)] = rest[i + 1]?.startsWith('--') || rest[i + 1] === undefined ? true : rest[++i];
}

const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
function resolve(list, input, what) {
  const n = norm(input);
  const hit =
    list.find((x) => norm(x.code) === n) ||
    list.find((x) => norm(x.name) === n) ||
    list.find((x) => norm(x.name).startsWith(n)) ||
    list.find((x) => norm(x.name).includes(n));
  if (!hit) fail(`Unknown ${what} "${input}". Run "node princess.mjs codes" to see valid values.`);
  return hit;
}
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
function monthCode(input) {
  const s = String(input).trim().toLowerCase();
  let m;
  if ((m = s.match(/^(\d{4})-(\d{1,2})$/))) return m[2].padStart(2, '0') + m[1].slice(2);
  if ((m = s.match(/^(\d{2})(\d{2})$/))) return s;
  if ((m = s.match(/^([a-z]+)\s+(\d{4})$/))) {
    const i = MONTHS.indexOf(m[1].slice(0, 3));
    if (i >= 0) return String(i + 1).padStart(2, '0') + m[2].slice(2);
  }
  fail(`Can't read month "${input}". Use 2027-06, "June 2027" or 0627.`);
}
function fail(msg) {
  console.error(msg);
  process.exit(1);
}

// ---------- browser helpers ----------
async function openPage(url) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA, locale: 'en-US' });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  return { browser, page };
}

// ---------- commands ----------
async function search() {
  let url;
  const applied = {};
  if (args.url) {
    url = args.url;
  } else {
    const q = new URLSearchParams();
    if (args.destination) {
      const d = resolve(MAP.destinations, args.destination, 'destination');
      q.set('trade', d.code);
      applied.destination = d.name;
    }
    if (args.port) {
      const p = resolve(MAP.ports, args.port, 'port');
      q.set('startPort', p.code);
      applied.port = p.name;
    }
    if (args.month) {
      q.set('date', monthCode(args.month));
      applied.month = q.get('date');
    }
    if (args.ship) {
      const s = resolve(MAP.ships, args.ship, 'ship');
      q.set('ship', s.code);
      applied.ship = s.name;
    }
    if (args.days) {
      const [min, max = min] = String(args.days).split('-');
      q.set('duration', `${min}_${max}`);
      applied.days = `${min}-${max}`;
    }
    if (args.promo) {
      q.set('promos', args.promo);
      applied.promo = args.promo;
    }
    url = `${MAP.searchUrl.base}?${q}`;
  }
  const limit = Number(args.limit ?? 10);

  const { browser, page } = await openPage(url);
  try {
    const card = page.locator('[role=region][aria-label^="Search result"]');
    // \b stops "90 Results Found" from matching as "0 Results Found".
    const noResults = page.getByText(/no (cruises|results) (were )?found|\b0 results found/i);
    await Promise.race([card.first().waitFor({ timeout: 45000 }), noResults.first().waitFor({ timeout: 45000 })]).catch(() => {});

    const result = await page.evaluate((limit) => {
      const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
      const total = (document.body.innerText.match(/(\d[\d,]*) Results? Found/i) || [])[1];
      const cards = [...document.querySelectorAll('[role=region][aria-label^="Search result"]')].slice(0, limit);
      return {
        totalResults: total ? Number(total.replace(/,/g, '')) : cards.length,
        cruises: cards.map((c) => {
          const text = c.innerText;
          const lines = text.split('\n').map(clean).filter(Boolean);
          const titleLink = [...c.querySelectorAll('a[href*="/cruise-search/details/"]')].find((a) => clean(a.innerText));
          const href = titleLink?.href ?? null;
          const ports = [...new Set([...c.querySelectorAll('a.port-link, [aria-label*="Ports"] a')].map((a) => clean(a.innerText)))];
          const num = (re) => {
            const m = text.match(re);
            return m ? Number(m[1].replace(/,/g, '')) : null;
          };
          const was = num(/Was\s*\$?\s*([\d,]+)/i);
          const now = num(/Now\s*\$?\s*([\d,]+)/i);
          const dollars = [...text.matchAll(/\$\s*([\d,]{3,})/g)].map((m) => Number(m[1].replace(/,/g, '')));
          return {
            title: clean(titleLink?.innerText) || lines[0],
            voyageCode: href ? new URL(href).searchParams.get('voyageCode') : null,
            url: href,
            departure: lines.find((l) => /^(roundtrip from|from |departs|.* to .*)/i.test(l) && !/\$/.test(l)) ?? null,
            offer: clean(c.querySelector('[data-test-id="offer-details-open"]')?.innerText).replace(/\s*-\s*$/, '') || null,
            ports,
            fromLabel: lines.find((l) => /from\*?$/i.test(l)) ?? null,
            price: now ?? (dollars.length ? Math.min(...dollars) : null),
            wasPrice: was ?? (dollars.length > 1 ? Math.max(...dollars) : null),
            dates: lines.filter((l) => /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}, \d{4} - /.test(l)),
          };
        }),
      };
    }, limit);

    print({ url, filters: applied, priceNote: 'USD, average per person, 2 guests, includes taxes & fees', ...result });
  } finally {
    await browser.close();
  }
}

async function deals() {
  const { browser, page } = await openPage(BASE + '/');
  try {
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
    });
    await page.waitForTimeout(1000);
    const live = await page.evaluate(() => {
      const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
      const seen = new Set();
      return [...document.querySelectorAll('a[href]')]
        .filter((a) => !a.closest('nav, header, footer') && a.getBoundingClientRect().width > 0)
        .filter((a) => /promos=|voyages=|cruise-deals-promotions/.test(a.href))
        .filter((a) => !seen.has(a.href) && seen.add(a.href))
        .map((a) => {
          let c = a.parentElement;
          const own = clean(a.innerText);
          while (c && clean(c.innerText).length <= own.length + 15) c = c.parentElement;
          const u = new URL(a.href);
          return {
            text: clean(c?.innerText).slice(0, 300),
            url: a.href,
            searchParams: u.pathname.startsWith('/cruise-search/results') ? Object.fromEntries(u.searchParams) : undefined,
          };
        });
    });
    print({ source: BASE + '/', checkedAt: new Date().toISOString(), onHomePage: live, dealPages: MAP.deals.pages });
  } finally {
    await browser.close();
  }
}

function codes() {
  print({
    destinations: MAP.destinations.map((d) => `${d.code} = ${d.name}`),
    ports: MAP.ports.map((p) => `${p.code} = ${p.name}`),
    ships: MAP.ships.map((s) => `${s.code} = ${s.name}`),
    months: MAP.searchForm.fields.find((f) => f.key === 'month').options.map((o) => `${o.code} = ${o.name}`),
  });
}

function print(obj) {
  console.log(JSON.stringify(obj, null, 2));
}

const commands = { search, deals, codes };
if (!commands[command]) fail('Usage: node princess.mjs <search|deals|codes> [options]  (see top of file)');
await commands[command]();
