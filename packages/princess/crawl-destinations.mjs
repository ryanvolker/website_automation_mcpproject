// Crawls the Princess destination pages linked from the home page and saves a
// structured snapshot of each one.
//
// Usage: node crawl-destinations.mjs [--concurrency 2] [--delay 2500] [--only alaska]
//
// Writes:
//   data/sites/princess.com/destinations.json                 latest crawl (all pages)
//   data/sites/princess.com/snapshots/destinations-<date>.json  copy kept for change reports

import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(here, '../../data/sites/princess.com');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36';

const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : def;
};
const CONCURRENCY = Number(opt('concurrency', 2));
const DELAY = Number(opt('delay', 2500));
const ONLY = opt('only', null);

// ---- Which pages: every /cruise-destinations/ link found on the home page ----
const raw = JSON.parse(await fs.readFile(path.join(siteDir, 'home.raw.json'), 'utf8'));
let urls = [
  ...new Set(
    raw.links
      .map((l) => l.href.split('#')[0].split('?')[0].replace(/\/$/, ''))
      .filter((h) => /^https:\/\/www\.princess\.com\/cruise-destinations\/.+/.test(h)),
  ),
].sort();
if (ONLY) urls = urls.filter((u) => u.includes(ONLY));

const slugOf = (u) => u.replace('https://www.princess.com/cruise-destinations/', '').replace(/\//g, '__');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- Extract one page (runs in the browser) ----
function extract() {
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const BOILER = /privacy notice|sign up and get \$50|rewards visa|^you may also like$/i;
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const inChrome = (el) => !!el.closest('header, footer, nav[aria-label="Main navigation"], [role=dialog]');
  const abs = (h) => {
    try {
      return new URL(h, location.href).href;
    } catch {
      return h;
    }
  };
  const cardText = (el) => {
    const own = clean(el.innerText);
    let c = el.parentElement;
    while (c && c !== document.body) {
      const t = clean(c.innerText);
      if (t.length > own.length + 15) return t.length > 240 ? t.slice(0, 240) + '…' : t;
      c = c.parentElement;
    }
    return null;
  };
  const uniq = (arr, key) => [...new Map(arr.map((x) => [key(x), x])).values()];

  const links = [...document.querySelectorAll('a[href]')].filter((a) => !inChrome(a));
  const main = document.querySelector('main') || document.body;

  // In-page section menu: a nav made only of #anchor links to this page
  // (skips the main menu, whose group headers are bare "#" links)
  const here = location.href.split('#')[0];
  const sectionNav = [...document.querySelectorAll('nav')]
    .filter((n) => !n.closest('header') && n.getAttribute('aria-label') !== 'Main navigation')
    .map((n) => [...n.querySelectorAll('a[href*="#"]')].filter((a) => {
      const [base, frag] = abs(a.getAttribute('href')).split('#');
      return base === here && frag && frag.length > 1;
    }))
    .find((as) => as.length >= 2);

  const headings = uniq(
    [...main.querySelectorAll('h1, h2, h3')]
      .filter((h) => !inChrome(h))
      .map((h) => ({ level: Number(h.tagName[1]), text: clean(h.innerText) }))
      .filter((h) => h.text && h.text.length > 5 && !BOILER.test(h.text)),
    (h) => h.level + h.text,
  );

  // Search links (cruise-search results). itinPort / startPort codes identify ports.
  const searchLinks = uniq(
    links
      .filter((a) => /\/cruise-search\/results|\/find\/searchResults\.do/.test(a.href))
      .map((a) => {
        const u = new URL(a.href);
        return { text: clean(a.innerText), url: a.href, params: Object.fromEntries(u.searchParams), card: cardText(a) };
      }),
    (l) => l.url,
  );

  // Featured itineraries: links to itinerary or cruise details with a voyage code
  const featuredCruises = uniq(
    links
      .filter((a) => /voyageCode=/.test(a.href))
      .map((a) => {
        const u = new URL(a.href);
        const card = cardText(a) || '';
        const prices = [...card.matchAll(/\$([\d,]+)/g)].map((m) => Number(m[1].replace(/,/g, '')));
        return {
          voyageCode: u.searchParams.get('voyageCode'),
          tourCode: u.searchParams.get('tourCode') || undefined,
          type: u.searchParams.get('resType') === 'T' ? 'cruisetour' : 'cruise',
          label: clean(a.innerText) || null,
          card,
          lowestPrice: prices.length ? Math.min(...prices) : null,
          url: a.href,
        };
      }),
    (c) => c.voyageCode + (c.tourCode || ''),
  );

  // Ports featured on the page (port pages, excursion pages, port search codes)
  const portPages = uniq(
    links
      .filter((a) => /\/cruises-to-|\/cruise-to-|\/cruises-from-/.test(a.href))
      .map((a) => ({ text: clean(a.innerText), url: abs(a.getAttribute('href')).split('#')[0] })),
    (p) => p.url,
  );
  const excursionPages = uniq(
    links.filter((a) => /\/ports-excursions\//.test(a.href)).map((a) => abs(a.getAttribute('href')).replace(/\/$/, '')),
    (x) => x,
  );
  const portCodes = [
    ...new Set(searchLinks.flatMap((l) => [l.params.itinPort, l.params.startPort, l.params.port]).filter(Boolean).flatMap((c) => c.split(','))),
  ].sort();
  const tradeCodes = [...new Set(searchLinks.flatMap((l) => [l.params.trade, l.params.subTrade]).filter(Boolean).flatMap((c) => c.split(',')))].sort();

  // Other destination pages linked from this one (sub-regions, guides)
  const relatedDestinationPages = [
    ...new Set(
      links
        .map((a) => abs(a.getAttribute('href')).split('#')[0].split('?')[0].replace(/\/$/, ''))
        .filter((h) => /princess\.com\/cruise-destinations\/.+/.test(h) && h !== location.href.split('#')[0].replace(/\/$/, '')),
    ),
  ].sort();

  // FAQs: questions in a section whose id/heading mentions FAQ
  const faqRoot =
    document.querySelector('[id*="faq" i]') ||
    [...main.querySelectorAll('h2')].find((h) => /faq/i.test(h.innerText))?.closest('section, div');
  const faqs = faqRoot
    ? [
        ...new Set(
          [...faqRoot.querySelectorAll('button, summary, h3, h4, [role=button]')]
            .map((e) => clean(e.innerText))
            .filter((t) => t.length > 12 && /\?$/.test(t)),
        ),
      ]
    : [];

  const blogPosts = uniq(
    links.filter((a) => /\/blog\//.test(a.href)).map((a) => ({ url: a.href.split('#')[0], card: cardText(a) })),
    (b) => b.url,
  );

  const h1 = clean(main.querySelector('h1')?.innerText) || null;
  // Main text, with chrome removed, for "did the page copy change" checks
  const clone = main.cloneNode(true);
  clone.querySelectorAll('header, footer, nav, script, style, [role=dialog], form').forEach((e) => e.remove());
  const mainText = clean(clone.innerText);

  return {
    finalUrl: location.href,
    title: clean(document.title),
    metaDescription: document.querySelector('meta[name=description]')?.content?.trim() || null,
    h1,
    sections: sectionNav ? sectionNav.map((a) => clean(a.innerText)).filter(Boolean) : [],
    headings,
    tradeCodes,
    portCodes,
    portPages,
    excursionPages,
    featuredCruises,
    searchLinks,
    faqs,
    relatedDestinationPages,
    blogPosts,
    mainText,
    visibleLinkCount: links.filter(visible).length,
  };
}

// ---- Crawl ----
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA, locale: 'en-US' });
const pages = [];
const errors = [];
let next = 0;

async function worker(id) {
  const page = await context.newPage();
  while (next < urls.length) {
    const url = urls[next++];
    const started = Date.now();
    try {
      const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
      await page.evaluate(async () => {
        for (let y = 0; y < document.body.scrollHeight; y += 700) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 120));
        }
      });
      await page.waitForTimeout(800);
      const data = await page.evaluate(extract);
      const { mainText, ...rest } = data;
      // Hash the copy with numbers removed, so price/countdown changes don't count as text changes
      const textHash = createHash('sha1').update(mainText.replace(/[\d$,.:]+/g, '#')).digest('hex').slice(0, 12);
      const redirectsTo = rest.finalUrl.split('#')[0].replace(/\/$/, '') !== url ? rest.finalUrl : undefined;
      pages.push({ slug: slugOf(url), url, status: res?.status() ?? null, redirectsTo, ...rest, textHash, textLength: mainText.length });
      console.log(`[w${id}] ${res?.status()} ${slugOf(url)}  (${((Date.now() - started) / 1000).toFixed(1)}s, ${data.featuredCruises.length} cruises, ${data.portCodes.length} port codes)`);
    } catch (e) {
      errors.push({ url, error: e.message.split('\n')[0] });
      console.log(`[w${id}] FAIL ${slugOf(url)}: ${e.message.split('\n')[0]}`);
    }
    await sleep(DELAY);
  }
  await page.close();
}

const t0 = Date.now();
console.log(`Crawling ${urls.length} destination pages (concurrency ${CONCURRENCY}, ${DELAY}ms pause)…`);
await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1)));
await browser.close();

pages.sort((a, b) => a.slug.localeCompare(b.slug));
const crawledAt = new Date().toISOString();
const discovered = [...new Set(pages.flatMap((p) => p.relatedDestinationPages))].filter((u) => !urls.includes(u)).sort();
const snapshot = {
  site: 'princess.com',
  kind: 'destinations',
  crawledAt,
  pageCount: pages.length,
  errors,
  notCrawledYet: discovered,
  pages,
};

if (!ONLY) {
  await fs.mkdir(path.join(siteDir, 'snapshots'), { recursive: true });
  const body = JSON.stringify(snapshot, null, 2) + '\n';
  await fs.writeFile(path.join(siteDir, 'destinations.json'), body);
  // e.g. destinations-2026-10-31T0401Z.json (sorts by time; two crawls a day don't collide)
  const stamp = crawledAt.slice(0, 16).replace(':', '') + 'Z';
  await fs.writeFile(path.join(siteDir, 'snapshots', `destinations-${stamp}.json`), body);
}
console.log(`\nDone in ${((Date.now() - t0) / 1000).toFixed(0)}s: ${pages.length} pages, ${errors.length} errors, ${discovered.length} more destination pages discovered.`);
if (ONLY) console.log(JSON.stringify(pages, null, 2).slice(0, 4000));
