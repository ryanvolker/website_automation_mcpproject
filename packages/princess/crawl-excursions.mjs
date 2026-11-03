// Crawls every shore excursion port page on princess.com and records each
// excursion listed there (name, price, duration, activity level, rating).
// Port pages show 12 excursions at a time; later pages are loaded with ?offset=12, 24, ...
//
// Usage: node crawl-excursions.mjs [--concurrency 1] [--delay 2000] [--only juneau] [--limit N]
// Writes:
//   data/sites/princess.com/excursions.json
//   data/sites/princess.com/snapshots/excursions-<stamp>.json

import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(here, '../../data/sites/princess.com');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36';
const PAGE_SIZE = 12;

const argv = process.argv.slice(2);
const opt = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);
const CONCURRENCY = Number(opt('concurrency', 1));
const DELAY = Number(opt('delay', 2000));
const ONLY = opt('only', null);
const LIMIT = Number(opt('limit', 0));

const sitemap = JSON.parse(await fs.readFile(path.join(siteDir, 'sitemap.json'), 'utf8'));
// Port pages are /shore-excursions/<port>; excursion pages are one level deeper.
let ports = [...new Set(sitemap.pages.filter((p) => p.section === 'shore-excursions' && p.path.split('/').filter(Boolean).length === 2).map((p) => p.url))].sort();
const expected = {};
for (const p of sitemap.pages.filter((p) => p.section === 'shore-excursions' && p.path.split('/').filter(Boolean).length === 3)) {
  expected[p.subsection] = (expected[p.subsection] || 0) + 1;
}
if (ONLY) ports = ports.filter((u) => u.includes(ONLY));
if (LIMIT) ports = ports.slice(0, LIMIT);
const partial = Boolean(ONLY || LIMIT);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Runs in the browser: read the port header and the excursion cards on this page.
function readPage() {
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const main = document.querySelector('main') || document.body;
  const portName = clean(main.querySelector('h2')?.innerText) || null;
  const intro = clean(main.querySelector('h2 + p, h2 ~ p')?.innerText).replace(/Read more$/, '').trim() || null;
  const cruisesLink = [...main.querySelectorAll('a[href*="itinPort="]')][0]?.href || null;
  const portCode = cruisesLink ? new URL(cruisesLink).searchParams.get('itinPort') : null;

  // Facet counts, e.g. "Nature & Wildlife 16 products available"
  const facets = {};
  const nameOf = (el) =>
    clean(
      el.getAttribute('aria-label') ||
        (el.getAttribute('aria-labelledby') || '').split(' ').map((id) => document.getElementById(id)?.innerText || '').join(' ') ||
        el.labels?.[0]?.innerText ||
        '',
    );
  for (const el of main.querySelectorAll('[role=radio], [role=checkbox], input[type=radio], input[type=checkbox]')) {
    const label = nameOf(el);
    const m = label.match(/^(.*?)\s*\(?(\d+)\)?(?: products? available)?$/);
    if (!m || !m[1]) continue;
    const region = el.closest('[role=region]');
    const group = region ? nameOf(region) || 'Other' : 'Other';
    (facets[group] ??= {})[m[1].replace(/^From /, '')] = Number(m[2]);
  }

  // Cards: each card's title is an <h2> inside a link to the excursion
  const cards = [...main.querySelectorAll('a[href*="/shore-excursions/"] h2')].map((h) => {
    const a = h.closest('a');
    let card = a.parentElement;
    while (card && !/\$\s?\d/.test(card.innerText) && card !== main) card = card.parentElement;
    const lines = (card?.innerText || '').split('\n').map(clean).filter(Boolean);
    const rating = lines.find((l) => /^\d(\.\d)?\/5$/.test(l));
    const reviewsLine = lines[lines.indexOf(rating) + 1] || '';
    const priceIdx = lines.findIndex((l) => /^from$/i.test(l));
    const priceLine = priceIdx >= 0 ? lines[priceIdx + 1] : lines.find((l) => /^\$\s?[\d,.]+$/.test(l));
    const url = new URL(a.href);
    url.search = '';
    return {
      name: clean(h.innerText),
      url: url.href,
      slug: url.pathname.split('/').pop(),
      price: priceLine ? Number(priceLine.replace(/[^\d.]/g, '')) : null,
      rating: rating ? Number(rating.split('/')[0]) : null,
      reviews: rating ? Number((reviewsLine.match(/\d+/) || [0])[0]) : 0,
      duration: lines.find((l) => /\bhours?\b|\bminutes?\b/i.test(l)) || null,
      activity: (lines.find((l) => /activity$/i.test(l)) || '').replace(/ activity$/i, '') || null,
      badges: lines.filter((l) => /favorite|new|best seller|local connections|exclusive/i.test(l) && l.length < 30 && l !== clean(h.innerText)),
      wheelchairAccessible: /wheelchair accessible/i.test(h.innerText),
    };
  });
  return { portName, intro, portCode, cruisesLink, facets, cards };
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA, locale: 'en-US' });
const results = [];
const errors = [];
let next = 0;
let done = 0;
const t0 = Date.now();

// notFirst: the first card title of page 1. Later pages can briefly show page 1's
// cards before switching, so wait until the first card is different.
async function load(page, url, notFirst = null) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const firstCard = page.locator('main a[href*="/shore-excursions/"] h2').first();
  await firstCard.waitFor({ timeout: 30000 }).catch(() => {});
  if (notFirst) {
    await page
      .waitForFunction((t) => document.querySelector('main a[href*="/shore-excursions/"] h2')?.innerText.trim() !== t, notFirst, { timeout: 10000 })
      .catch(() => {});
  }
  await page.waitForTimeout(800);
  return page.evaluate(readPage);
}

async function worker() {
  const page = await context.newPage();
  while (next < ports.length) {
    const url = ports[next++];
    const slug = url.split('/').pop();
    try {
      const first = await load(page, url);
      const excursions = new Map(first.cards.map((c) => [c.slug, c]));
      const total = Object.values(first.facets.Price || {}).reduce((a, b) => a + b, 0) || null;
      // Page through with ?offset= up to the listed total. Without a total, stop
      // after two pages in a row add nothing new.
      const firstName = first.cards[0]?.name ?? null;
      let emptyRuns = 0;
      for (let offset = PAGE_SIZE; offset < 600; offset += PAGE_SIZE) {
        if (total ? offset >= total : first.cards.length < PAGE_SIZE || emptyRuns >= 2) break;
        await sleep(DELAY);
        const more = await load(page, `${url}?offset=${offset}`, firstName);
        const before = excursions.size;
        more.cards.forEach((c) => excursions.set(c.slug, c));
        emptyRuns = excursions.size === before ? emptyRuns + 1 : 0;
      }
      const list = [...excursions.values()];
      results.push({
        port: first.portName,
        slug,
        portCode: first.portCode,
        url,
        intro: first.intro,
        cruisesLink: first.cruisesLink,
        priceFilterTotal: total, // sum of the Price filter counts; can exceed the true count
        sitemapCount: expected[slug] || 0,
        facets: first.facets,
        excursions: list,
      });
      done++;
      const eta = (((Date.now() - t0) / done) * (ports.length - done)) / 60000;
      console.log(`[${done}/${ports.length}] ${slug}: ${list.length} excursions (price filter ${total ?? '?'}, sitemap ${expected[slug] || 0}) ~${eta.toFixed(0)} min left`);
    } catch (e) {
      done++;
      errors.push({ url, error: e.message.split('\n')[0] });
      console.log(`[${done}/${ports.length}] FAIL ${slug}: ${e.message.split('\n')[0]}`);
    }
    await sleep(DELAY);
  }
  await page.close();
}

console.log(`Crawling ${ports.length} excursion port pages (concurrency ${CONCURRENCY})â€¦`);
await Promise.all(Array.from({ length: CONCURRENCY }, worker));
await browser.close();

results.sort((a, b) => a.slug.localeCompare(b.slug));
const crawledAt = new Date().toISOString();
const all = results.flatMap((r) => r.excursions);
const snapshot = {
  site: 'princess.com',
  kind: 'excursions',
  crawledAt,
  portCount: results.length,
  excursionCount: all.length,
  errors,
  ports: results,
};
const body = JSON.stringify(snapshot, null, 1) + '\n';
const outDir = partial ? path.join(siteDir, 'samples') : siteDir;
await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(path.join(outDir, 'excursions.json'), body);
if (!partial) {
  const stamp = crawledAt.slice(0, 16).replace(':', '') + 'Z';
  await fs.writeFile(path.join(siteDir, 'snapshots', `excursions-${stamp}.json`), body);
}
console.log(`\nDone in ${((Date.now() - t0) / 60000).toFixed(1)} min: ${results.length} ports, ${all.length} excursions, ${errors.length} errors`);
