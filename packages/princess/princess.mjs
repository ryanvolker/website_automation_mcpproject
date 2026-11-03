// Live lookups on princess.com. Prints JSON to stdout.
//
// Usage:
//   node princess.mjs search [--destination Alaska] [--port Seattle] [--month 2027-06]
//                            [--ship "Star Princess"] [--days 7 | --days 7-10]
//                            [--promo 2GD] [--visits Santorini | --visits JTR]
//                            [--url <results url>] [--limit 10]
//   node princess.mjs details <voyageCode>   (stateroom prices, itinerary, what's included)
//   node princess.mjs deals
//   node princess.mjs codes            (print destination / port / ship / month codes)
//
// Offline (reads the crawled data, no browser):
//   node princess.mjs find <words> [--section destinations|ships|dining|deals|help|content|all]
//   node princess.mjs excursions [<port>] [--max-price 150] [--activity easy] [--min-rating 4]
//                                [--max-hours 4] [--accessible] [--sort price|rating|reviews]
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
    if (args.visits) {
      // Ports of call: departure ports plus every port with excursions (from the excursions crawl)
      let callPorts = [...MAP.ports];
      try {
        const exc = JSON.parse(await fs.readFile(path.resolve(here, '../../data/sites/princess.com/excursions.json'), 'utf8'));
        callPorts = callPorts.concat(exc.ports.filter((p) => p.portCode).map((p) => ({ code: p.portCode, name: p.port })));
      } catch {
        /* excursions not crawled yet: codes and departure ports still work */
      }
      const v = /^[A-Z0-9]{3}$/.test(args.visits) ? { code: args.visits, name: args.visits } : resolve(callPorts, args.visits, 'port of call');
      q.set('itinPort', v.code);
      applied.visits = v.name;
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

// Cruise details page: stateroom prices, day-by-day itinerary, what's included.
async function details() {
  const code = args.voyage || args.code || rest.find((a) => !a.startsWith('--'));
  if (!code) fail('Usage: node princess.mjs details <voyageCode>   (voyage codes come from search results)');
  const url = `${BASE}/cruise-search/details/?voyageCode=${encodeURIComponent(code)}`;
  const { browser, page } = await openPage(url);
  try {
    // The page renders in stages: prices first, then the itinerary ("Loading data..." until ready).
    const dayHeading = /^DAY\s+\d+\s.+(Mon|Tue|Wed|Thu|Fri|Sat|Sun), [A-Z][a-z]{2} \d/i;
    await page
      .waitForFunction(() => [...document.querySelectorAll('h6')].some((h) => /\$\d/.test(h.parentElement.innerText)), null, { timeout: 45000 })
      .catch(() => {});
    await page
      .waitForFunction(
        (src) => [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].some((h) => new RegExp(src, 'i').test(h.innerText.replace(/\s+/g, ' ').trim())),
        dayHeading.source,
        { timeout: 30000 },
      )
      .catch(() => {});
    const data = await page.evaluate(() => {
      const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
      const money = (s) => {
        const m = (s || '').match(/\$\s?([\d,]+)/);
        return m ? Number(m[1].replace(/,/g, '')) : null;
      };
      const body = document.body.innerText;
      const lines = body.split('\n').map(clean).filter(Boolean);
      // Stateroom category prices: <h6>Balcony</h6> followed by "$2,199"
      const staterooms = [...document.querySelectorAll('h6')]
        .filter((h) => /^(Suite|Mini-Suite|Balcony|Oceanview|Interior)/i.test(clean(h.innerText)))
        .map((h) => {
          const box = h.parentElement;
          const txt = clean(box.innerText).replace(clean(h.innerText), '');
          return { category: clean(h.innerText), price: money(txt), note: /sold out|unavailable|call/i.test(txt) ? txt : undefined };
        });
      const dayRe = /^DAY\s+(\d+)\s+(.+?)\s+((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), [A-Z][a-z]{2} \d{1,2})(?:\s*•\s*(.+))?$/i;
      const days = [...new Set([...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map((h) => clean(h.innerText)))]
        .map((t) => t.match(dayRe))
        .filter(Boolean)
        .map((m) => ({ day: Number(m[1]), port: m[2], date: m[3], times: m[4] || null }));
      const fromGroup = [...document.querySelectorAll('[role=group]')].map((g) => g.getAttribute('aria-label') || '').find((l) => /current price/i.test(l)) || '';
      const dateRe = /((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), [A-Z][a-z]{2} \d{1,2}, \d{4}) - ((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), [A-Z][a-z]{2} \d{1,2}, \d{4})/;
      const dateIdx = lines.findIndex((l) => dateRe.test(l));
      const dateLine = dateIdx >= 0 ? lines[dateIdx].match(dateRe) : null;
      // The ship name is the line right after the sailing dates (skipping "Change date")
      const ship = dateIdx >= 0 ? lines.slice(dateIdx + 1, dateIdx + 4).find((l) => /Princess/.test(l)) : null;
      const offers = [...document.querySelectorAll('button')].map((b) => clean(b.innerText)).filter((t) => /% off|savings|free|deposit|onboard credit/i.test(t) && t.length < 60);
      // Excursion cards: name, "Day N Port", rating "4.1/5 (15)", duration, activity level
      const featuredExcursions = [];
      for (let i = 1; i < lines.length - 1; i++) {
        const m = lines[i].match(/^Day (\d+) (.+)$/);
        if (!m || /—/.test(lines[i])) continue;
        const rating = lines[i + 1].match(/^([\d.]+)\/5 \((\d+)\)$/);
        const after = lines.slice(i + 1, i + 6);
        featuredExcursions.push({
          name: lines[i - 1],
          day: Number(m[1]),
          port: m[2],
          rating: rating ? Number(rating[1]) : null,
          reviews: rating ? Number(rating[2]) : null,
          duration: after.find((l) => /\bhours?\b|\bminutes?\b/i.test(l)) || null,
          activity: after.find((l) => /activity$/i.test(l)) || null,
        });
      }
      return {
        title: clean(document.title).split(/ [-|] /)[0],
        sailing: dateLine ? { from: dateLine[1], to: dateLine[2] } : null,
        ship: ship ? ship.replace('®', '') : null,
        offers: [...new Set(offers)],
        staterooms,
        lowest: { category: (fromGroup.match(/From (\w[\w-]*)/) || [])[1] || null, price: money((fromGroup.match(/current price (\$[\d,]+)/) || [])[1]), wasPrice: money((fromGroup.match(/previous price (\$[\d,]+)/) || [])[1]) },
        itinerary: days,
        featuredExcursions: [...new Map(featuredExcursions.map((x) => [x.name, x])).values()].slice(0, 15),
        finalUrl: location.href,
      };
    });
    // "What's included" popup
    let included = null;
    const btn = page.getByRole('button', { name: "What's included" });
    if (await btn.count()) {
      await btn.first().click().catch(() => {});
      await page.waitForTimeout(1200);
      included = await page.locator('[role=dialog]:visible').last().innerText({ timeout: 5000 }).catch(() => null);
      included = included?.split('\n').map((s) => s.trim()).filter(Boolean) ?? null;
    }
    print({ voyageCode: code, url: data.finalUrl, ...data, finalUrl: undefined, whatsIncluded: included, priceNote: 'USD, average per person, 2 guests, includes taxes & fees' });
  } finally {
    await browser.close();
  }
}

// ---------- offline lookups in the crawled data (no browser) ----------
const DATA = path.resolve(here, '../../data/sites/princess.com');
const loadJson = async (f) => JSON.parse(await fs.readFile(path.join(DATA, f), 'utf8'));
const words = (s) => String(s).toLowerCase().split(/[^a-z0-9$]+/).filter((w) => w.length > 1);

// find <query> [--section destinations|ships|dining|deals|help|content|all] [--limit 8]
// Ranks pages by how often the query words appear in their title, headings and content blocks.
async function find() {
  const query = rest.filter((a, i) => !a.startsWith('--') && !(i > 0 && rest[i - 1].startsWith('--'))).join(' ');
  if (!query) fail('Usage: node princess.mjs find <words> [--section ships] [--limit 8]');
  const q = words(query);
  const wanted = args.section && args.section !== 'all' ? [args.section] : ['destinations', 'ships', 'dining', 'deals', 'help', 'content'];
  const limit = Number(args.limit ?? 8);
  const hits = [];
  const score = (text, weight) => q.reduce((n, w) => n + (text.toLowerCase().includes(w) ? weight : 0), 0);
  for (const sec of wanted) {
    if (sec === 'content') {
      const c = await loadJson('content-index.json').catch(() => null);
      c?.items.forEach((i) => {
        const s = score(i.title, 3) + score(i.topics.join(' '), 1);
        if (s) hits.push({ section: 'content', score: s, title: i.title, url: i.url, type: i.type, date: i.published || i.lastmod });
      });
      continue;
    }
    const snap = await loadJson(`${sec}.json`).catch(() => null);
    for (const p of snap?.pages ?? []) {
      const blocks = (p.blocks || []).map((b) => ({ ...b, s: score(b.heading, 3) + score(b.text, 1) })).filter((b) => b.s);
      const s =
        score(`${p.title} ${p.h1}`, 5) +
        score(p.url, 2) +
        score((p.headings || []).map((h) => h.text).join(' '), 1) +
        blocks.reduce((n, b) => n + b.s, 0);
      if (!s) continue;
      hits.push({
        section: sec,
        score: s,
        title: p.h1 || p.title,
        url: p.url,
        matches: blocks.sort((a, b) => b.s - a.s).slice(0, 3).map((b) => ({ heading: b.heading, text: b.text.slice(0, 300) })),
      });
    }
  }
  hits.sort((a, b) => b.score - a.score);
  print({ query, results: hits.slice(0, limit).map(({ score, ...h }) => h) });
}

// excursions <port> [--max-price 150] [--activity easy] [--min-rating 4] [--max-hours 4] [--accessible] [--sort price|rating|reviews] [--limit 15]
async function excursions() {
  const portQ = rest.filter((a, i) => !a.startsWith('--') && !(i > 0 && rest[i - 1].startsWith('--'))).join(' ');
  const data = await loadJson('excursions.json').catch(() => fail('No excursions.json yet. Run: npm run crawl:excursions -w @wa/princess'));
  if (!portQ) {
    print({ crawledAt: data.crawledAt, ports: data.ports.filter((p) => p.excursions.length).map((p) => `${p.portCode ?? '---'}  ${p.port}  (${p.excursions.length})`) });
    return;
  }
  const port = resolve(data.ports.map((p) => ({ ...p, name: p.port || p.slug, code: p.portCode || p.slug })), portQ, 'port');
  const hours = (d) => {
    const m = (d || '').match(/([\d.]+)/);
    return m ? Number(m[1]) * (/minute/i.test(d) ? 1 / 60 : 1) : null;
  };
  let list = port.excursions.filter(
    (x) =>
      (!args['max-price'] || (x.price ?? Infinity) <= Number(args['max-price'])) &&
      (!args.activity || norm(x.activity || '').startsWith(norm(args.activity))) &&
      (!args['min-rating'] || (x.rating ?? 0) >= Number(args['min-rating'])) &&
      (!args['max-hours'] || (hours(x.duration) ?? Infinity) <= Number(args['max-hours'])) &&
      (!args.accessible || x.wheelchairAccessible),
  );
  const sort = args.sort || 'rating';
  const key = { price: (x) => x.price ?? Infinity, rating: (x) => -((x.rating ?? 0) * 1000 + (x.reviews ?? 0)), reviews: (x) => -(x.reviews ?? 0) }[sort] || ((x) => 0);
  list = list.sort((a, b) => key(a) - key(b));
  print({
    port: port.port,
    portCode: port.portCode,
    portPage: port.url,
    cruisesVisitingPort: port.cruisesLink,
    crawledAt: data.crawledAt,
    total: port.excursions.length,
    matching: list.length,
    priceRange: port.facets?.Price ?? null,
    excursions: list.slice(0, Number(args.limit ?? 15)),
    note: 'Prices are "from" adult prices in USD at crawl time. Excursion pages under /shore-excursions/product/ are disallowed by robots.txt; link to them but do not open them.',
  });
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

const commands = { search, details, deals, codes, find, excursions };
if (!commands[command]) fail('Usage: node princess.mjs <search|details|deals|find|excursions|codes> [options]  (see top of file)');
await commands[command]();
