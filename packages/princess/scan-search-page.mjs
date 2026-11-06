// Scans one cruise search results page: filters and their options, sort, paging, the services the page calls,
// and every cruise card (title, voyage code, ship, dates, ports, offer, price).
// Usage: node scan-search-page.mjs "<results url>"   → prints a summary, writes data/sites/princess.com/search-scan.json
// Read-only: only loads the page and scrolls/pages through results.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(here, '../../data/sites/princess.com', process.argv[3] || 'search-scan.json');
const url = process.argv[2] || 'https://www.princess.com/cruise-search/results/?trade=E,C,A,M,T,N&duration=1,2,3&mrch=1';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch();
const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 }, locale: 'en-US' });
await ctx.route('**/*', (r) => (['PUT', 'PATCH', 'DELETE'].includes(r.request().method()) ? r.abort() : r.continue()));
const page = await ctx.newPage();
const calls = [];
page.on('response', async (r) => {
  const t = r.request().resourceType();
  if (!['xhr', 'fetch'].includes(t)) return;
  const u = new URL(r.url());
  if (!/princess\.com$/.test(u.hostname) || /smetrics|p13n|refer\./.test(u.hostname)) return;
  let size = null;
  try { size = (await r.body()).length; } catch {}
  calls.push({ method: r.request().method(), host: u.hostname, path: u.pathname, query: u.search.slice(0, 300), status: r.status(), size, postData: (r.request().postData() || '').slice(0, 600) });
});
const t0 = Date.now();
const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
const card = page.locator('[role=region][aria-label^="Search result"]');
await card.first().waitFor({ timeout: 45000 }).catch(() => {});
const firstCardMs = Date.now() - t0;
await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
await page.locator('button[aria-label="Close Cookie Banner"]').first().click({ timeout: 2000 }).catch(() => {});

const pageInfo = await page.evaluate(() => {
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const total = (document.body.innerText.match(/(\d[\d,]*) Results? Found/i) || [])[1];
  const headings = [...document.querySelectorAll('h1,h2,h3')].map((h) => `${h.tagName} ${clean(h.innerText)}`).filter((h) => h.length > 3).slice(0, 60);
  // Filter controls: buttons/fieldsets in the filter area, selects, checkboxes with labels
  const selects = [...document.querySelectorAll('select')].map((s) => ({ id: s.id, name: s.name, label: s.getAttribute('aria-label') || clean(document.querySelector(`label[for="${s.id}"]`)?.innerText), options: [...s.options].map((o) => `${o.value}=${clean(o.text)}`).slice(0, 40) }));
  const checks = [...document.querySelectorAll('input[type=checkbox], input[type=radio]')].map((i) => ({ name: i.name, value: i.value, checked: i.checked, label: clean(i.closest('label')?.innerText || document.querySelector(`label[for="${i.id}"]`)?.innerText || i.getAttribute('aria-label')) })).filter((x) => x.label);
  const buttons = [...new Set([...document.querySelectorAll('button')].filter((b) => b.offsetParent && !b.closest('header,footer,[role=region][aria-label^="Search result"]')).map((b) => clean(b.innerText || b.getAttribute('aria-label'))).filter(Boolean))].slice(0, 80);
  const paging = [...document.querySelectorAll('nav[aria-label*="agination" i] a, nav[aria-label*="agination" i] button, [class*="pagination"] a, [class*="pagination"] button')].map((a) => clean(a.innerText || a.getAttribute('aria-label')));
  const loadMore = [...document.querySelectorAll('button, a')].map((b) => clean(b.innerText)).filter((t) => /load more|show more|view more/i.test(t));
  return { title: document.title, total: total ? Number(total.replace(/,/g, '')) : null, headings, selects, checks, buttons, paging, loadMore, cardsShown: document.querySelectorAll('[role=region][aria-label^="Search result"]').length };
});

// Collect every card: keep clicking "load more"/next page, politely.
const readCards = () => page.evaluate(() => {
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  return [...document.querySelectorAll('[role=region][aria-label^="Search result"]')].map((c) => {
    const text = c.innerText;
    const lines = text.split('\n').map(clean).filter(Boolean);
    const a = [...c.querySelectorAll('a[href*="voyageCode="]')].find((x) => clean(x.innerText)) || c.querySelector('a[href*="voyageCode="]');
    const href = a?.href || null;
    const dollars = [...text.matchAll(/\$\s*([\d,]{3,})/g)].map((m) => Number(m[1].replace(/,/g, '')));
    return {
      label: c.getAttribute('aria-label'),
      title: clean(a?.innerText) || lines[0],
      voyageCode: href ? new URL(href).searchParams.get('voyageCode') : null,
      url: href,
      ship: lines.find((l) => /Princess$/.test(l) && l.length < 30) || null,
      nights: Number((text.match(/(\d+)\s*(Days?|Nights?)/i) || [])[1]) || null,
      departure: lines.find((l) => /^(roundtrip from|from |departs)/i.test(l) && !/\$/.test(l)) || null,
      dates: lines.filter((l) => /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}, \d{4}/.test(l)).slice(0, 12),
      offer: clean(c.querySelector('[data-test-id="offer-details-open"]')?.innerText).replace(/\s*-\s*$/, '') || null,
      ports: [...new Set([...c.querySelectorAll('a.port-link, [aria-label*="Ports"] a')].map((x) => clean(x.innerText)))],
      price: dollars.length ? Math.min(...dollars) : null,
      wasPrice: (text.match(/Was\s*\$?\s*([\d,]+)/i) || [])[1] ? Number(text.match(/Was\s*\$?\s*([\d,]+)/i)[1].replace(/,/g, '')) : null,
      lines: lines.slice(0, 40),
    };
  });
});
const byKey = new Map();
for (let round = 0; round < 300; round++) {
  for (const c of await readCards()) byKey.set(c.voyageCode || c.label, c);
  if (pageInfo.total && byKey.size >= pageInfo.total) break;
  const more = page.locator('button:has-text("Load More"), button:has-text("Show More"), button:has-text("View More")').first();
  const next = page.locator('button[aria-label*="next" i]:not([disabled]), a[aria-label*="next" i]').first();
  if (await more.isVisible().catch(() => false)) await more.click().catch(() => {});
  else if (await next.isVisible().catch(() => false)) await next.click().catch(() => {});
  else { await page.mouse.wheel(0, 4000); await sleep(1500); const n = (await readCards()).length; if (n <= byKey.size && round > 2) break; }
  await sleep(1500);
}
const cards = [...byKey.values()];
await browser.close();

const result = { url, scannedAt: new Date().toISOString(), status: resp?.status(), firstCardMs, query: Object.fromEntries(new URL(url).searchParams), page: pageInfo, calls, cards };
await fs.writeFile(out, JSON.stringify(result, null, 1));
console.log(JSON.stringify({ status: result.status, firstCardMs, title: pageInfo.title, total: pageInfo.total, cardsShown: pageInfo.cardsShown, cardsCollected: cards.length, paging: pageInfo.paging, loadMore: pageInfo.loadMore, selects: pageInfo.selects.length, checks: pageInfo.checks.length }, null, 1));
