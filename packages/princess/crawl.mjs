// Crawls one section of princess.com (page list from the sitemap) and saves a
// structured snapshot of every page.
//
// Usage: node crawl.mjs <section> [--concurrency 2] [--delay 2500] [--limit N] [--only text]
//   Sections: see SECTIONS below (destinations, ships, dining, deals, help, excursions)
//   Run "node fetch-sitemap.mjs" first so the page list is current.
//
// Writes:
//   data/sites/princess.com/<section>.json                    latest crawl
//   data/sites/princess.com/snapshots/<section>-<stamp>.json  copy kept for change reports
//   data/sites/princess.com/text/<section>-<stamp>.json       full page text (git-ignored, for wording diffs)

import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(here, '../../data/sites/princess.com');
const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36';

// Which sitemap pages belong to each crawlable section.
const SECTIONS = {
  destinations: (p) => p.section === 'cruise-destinations',
  ships: (p) => ['ships-and-experience', 'staterooms'].includes(p.section),
  dining: (p) => p.section === 'cruise-dining',
  deals: (p) => ['cruise-deals-promotions', 'plan'].includes(p.section),
  help: (p) =>
    ['faq', 'why-princess', 'about-princess', 'accessibility-at-sea', 'brochures', 'shore-excursions-overview', 'alaska-lodge-directory', 'company-information'].includes(p.section),
  // Port index pages only (/shore-excursions/<port>); each lists that port's excursions.
  excursions: (p) => p.section === 'shore-excursions' && p.path.split('/').filter(Boolean).length <= 2,
};

const argv = process.argv.slice(2);
const section = argv[0];
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : def;
};
if (!SECTIONS[section]) {
  console.error(`Usage: node crawl.mjs <${Object.keys(SECTIONS).join('|')}> [--concurrency 2] [--delay 2500] [--limit N] [--only text]`);
  process.exit(1);
}
const CONCURRENCY = Number(opt('concurrency', 2));
const DELAY = Number(opt('delay', 2500));
const LIMIT = Number(opt('limit', 0));
const ONLY = opt('only', null);

const sitemap = JSON.parse(await fs.readFile(path.join(siteDir, 'sitemap.json'), 'utf8'));
let urls = [...new Set(sitemap.pages.filter((p) => !p.blockedBy && SECTIONS[section](p)).map((p) => p.url))].sort();
if (ONLY) urls = urls.filter((u) => u.includes(ONLY));
if (LIMIT) urls = urls.slice(0, LIMIT);
const partial = Boolean(ONLY || LIMIT);

const slugOf = (u) => new URL(u).pathname.split('/').filter(Boolean).join('__') || 'home';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- Extract one page (runs in the browser) ----
function extract() {
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const BOILER = /privacy notice|sign up and get \$50|rewards visa|^you may also like$/i;
  const inChrome = (el) => !!el.closest('header, footer, nav[aria-label="Main navigation"], [role=dialog]');
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
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
  const strip = (u) => abs(u).split('#')[0].split('?')[0].replace(/\/$/, '');

  const main = document.querySelector('main') || document.body;
  const links = [...document.querySelectorAll('a[href]')].filter((a) => !inChrome(a));
  const here = location.href.split('#')[0];

  // In-page section menu (anchor links to this page; skips the main menu's bare "#" links)
  const sectionNav = [...document.querySelectorAll('nav')]
    .filter((n) => !n.closest('header') && n.getAttribute('aria-label') !== 'Main navigation')
    .map((n) =>
      [...n.querySelectorAll('a[href*="#"]')].filter((a) => {
        const [base, frag] = abs(a.getAttribute('href')).split('#');
        return base === here && frag && frag.length > 1;
      }),
    )
    .find((as) => as.length >= 2);

  const headings = uniq(
    [...main.querySelectorAll('h1, h2, h3')]
      .filter((h) => !inChrome(h))
      .map((h) => ({ level: Number(h.tagName[1]), text: clean(h.innerText) }))
      .filter((h) => h.text && h.text.length > 5 && !BOILER.test(h.text)),
    (h) => h.level + h.text,
  );

  // Content blocks: each h2/h3 with the text that follows it, so a reader can
  // understand what the page says without opening it.
  const blocks = uniq(
    [...main.querySelectorAll('h2, h3')]
      .filter((h) => !inChrome(h) && visible(h) && clean(h.innerText).length > 3 && !BOILER.test(clean(h.innerText)))
      .map((h) => {
        // Collapsed accordion answers are hidden, so innerText is empty; fall back to textContent.
        const txt = (el) => clean(el.innerText) || clean(el.textContent);
        let text = '';
        let n = h.nextElementSibling;
        let box = h.parentElement;
        // Prefer siblings; fall back to the parent block's text minus the heading.
        while (n && text.length < 400 && !/^H[1-3]$/.test(n.tagName)) {
          text += ' ' + txt(n);
          n = n.nextElementSibling;
        }
        if (text.trim().length < 20 && box) {
          text = txt(box).replace(clean(h.innerText), '');
          // Accordion: the heading sits in a button; the answer is the next sibling of the button's wrapper
          if (text.trim().length < 20 && box.nextElementSibling) text = txt(box.nextElementSibling);
        }
        const blockLinks = box
          ? [...box.querySelectorAll('a[href]')]
              .map((a) => ({ text: clean(a.innerText) || clean(a.getAttribute('aria-label')), url: abs(a.getAttribute('href')) }))
              .filter((l) => l.text && !/^#/.test(l.url))
              .slice(0, 6)
          : [];
        return { level: Number(h.tagName[1]), heading: clean(h.innerText), text: clean(text).slice(0, 400), links: blockLinks };
      }),
    (b) => b.heading,
  );

  const searchLinks = uniq(
    links
      .filter((a) => /\/cruise-search\/results|\/find\/searchResults\.do/.test(a.href))
      .map((a) => {
        const u = new URL(a.href);
        return { text: clean(a.innerText), url: a.href, params: Object.fromEntries(u.searchParams), card: cardText(a) };
      }),
    (l) => l.url,
  );

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

  const portPages = uniq(
    links.filter((a) => /\/cruises-to-|\/cruise-to-|\/cruises-from-/.test(a.href)).map((a) => ({ text: clean(a.innerText), url: strip(a.getAttribute('href')) })),
    (p) => p.url,
  );
  const excursionLinks = uniq(
    links
      .filter((a) => /\/(shore-excursions|ports-excursions)\//.test(a.href))
      .map((a) => ({ text: clean(a.innerText) || clean(a.getAttribute('aria-label')), url: strip(a.getAttribute('href')), card: cardText(a) })),
    (x) => x.url,
  );
  const portCodes = [
    ...new Set(searchLinks.flatMap((l) => [l.params.itinPort, l.params.startPort, l.params.port]).filter(Boolean).flatMap((c) => c.split(','))),
  ].sort();
  const tradeCodes = [...new Set(searchLinks.flatMap((l) => [l.params.trade, l.params.subTrade]).filter(Boolean).flatMap((c) => c.split(',')))].sort();
  const shipCodes = [...new Set(searchLinks.map((l) => l.params.ship).filter(Boolean).flatMap((c) => c.split(',')))].sort();

  // Internal pages this page links to (outside the site chrome), for building a link graph
  const internalLinks = [
    ...new Set(
      links
        .map((a) => strip(a.getAttribute('href')))
        .filter((h) => /^https:\/\/(www|book)\.princess\.com\/.+/.test(h) && h !== strip(here) && !/\/cruise-search\/results/.test(h)),
    ),
  ].sort();

  const faqRoot =
    document.querySelector('[id*="faq" i]') || [...main.querySelectorAll('h2')].find((h) => /faq/i.test(h.innerText))?.closest('section, div');
  const faqs = faqRoot
    ? [...new Set([...faqRoot.querySelectorAll('button, summary, h3, h4, [role=button]')].map((e) => clean(e.innerText)).filter((t) => t.length > 12 && /\?$/.test(t)))]
    : [];

  // Prices mentioned anywhere in the main content
  const clone = main.cloneNode(true);
  clone.querySelectorAll('header, footer, nav, script, style, [role=dialog], form').forEach((e) => e.remove());
  const mainText = clean(clone.innerText);
  const prices = [...new Set([...mainText.matchAll(/\$\s?([\d,]+(?:\.\d\d)?)/g)].map((m) => Number(m[1].replace(/,/g, ''))))].sort((a, b) => a - b);

  const ctas = uniq(
    [...main.querySelectorAll('a[href], button')]
      .filter((e) => !inChrome(e) && visible(e))
      .map((e) => clean(e.innerText))
      .filter((t) => t && t.length < 40 && t === t.toUpperCase() && /[A-Z]/.test(t)),
    (t) => t,
  );

  return {
    finalUrl: location.href,
    title: clean(document.title),
    metaDescription: document.querySelector('meta[name=description]')?.content?.trim() || null,
    h1: clean(main.querySelector('h1')?.innerText) || null,
    sections: sectionNav ? sectionNav.map((a) => clean(a.innerText)).filter(Boolean) : [],
    headings,
    blocks,
    ctas,
    tradeCodes,
    portCodes,
    shipCodes,
    portPages,
    excursionLinks,
    featuredCruises,
    searchLinks,
    faqs,
    prices,
    internalLinks,
    mainText,
  };
}

// ---- Crawl ----
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, userAgent: UA, locale: 'en-US' });
const pages = [];
const texts = {};
const errors = [];
let next = 0;
let done = 0;
const t0 = Date.now();

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
      const { mainText, ...rest } = await page.evaluate(extract);
      // Numbers removed so price or countdown changes don't count as text changes
      const textHash = createHash('sha1').update(mainText.replace(/[\d$,.:]+/g, '#')).digest('hex').slice(0, 12);
      const redirectsTo = rest.finalUrl.split('#')[0].replace(/\/$/, '') !== url ? rest.finalUrl : undefined;
      pages.push({ slug: slugOf(url), url, status: res?.status() ?? null, redirectsTo, ...rest, textHash, textLength: mainText.length });
      texts[url] = mainText;
      done++;
      const eta = (((Date.now() - t0) / done) * (urls.length - done)) / 60000;
      console.log(`[${done}/${urls.length}] ${res?.status()} ${slugOf(url)} (${((Date.now() - started) / 1000).toFixed(1)}s, ~${eta.toFixed(0)} min left)`);
    } catch (e) {
      errors.push({ url, error: e.message.split('\n')[0] });
      done++;
      console.log(`[${done}/${urls.length}] FAIL ${slugOf(url)}: ${e.message.split('\n')[0]}`);
    }
    await sleep(DELAY);
  }
  await page.close();
}

console.log(`Crawling ${urls.length} "${section}" pages (concurrency ${CONCURRENCY}, ${DELAY}ms pause)…`);
await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1)));
await browser.close();

pages.sort((a, b) => a.slug.localeCompare(b.slug));
const crawledAt = new Date().toISOString();
const stamp = crawledAt.slice(0, 16).replace(':', '') + 'Z';
const snapshot = { site: 'princess.com', kind: section, crawledAt, pageCount: pages.length, errors, pages };
const body = JSON.stringify(snapshot, null, 1) + '\n';

const outDir = partial ? path.join(siteDir, 'samples') : siteDir;
await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(path.join(outDir, `${section}.json`), body);
if (!partial) {
  await fs.mkdir(path.join(siteDir, 'snapshots'), { recursive: true });
  await fs.mkdir(path.join(siteDir, 'text'), { recursive: true });
  await fs.writeFile(path.join(siteDir, 'snapshots', `${section}-${stamp}.json`), body);
  await fs.writeFile(path.join(siteDir, 'text', `${section}-${stamp}.json`), JSON.stringify(texts));
}
console.log(`\nDone in ${((Date.now() - t0) / 60000).toFixed(1)} min: ${pages.length} pages, ${errors.length} errors → ${path.join(outDir, section + '.json')}`);
