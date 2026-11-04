// Revisits every issue in data/sites/princess.com/known-issues.json and reports whether it is still there.
// Usage: node recheck-issues.mjs   → writes data/sites/princess.com/issue-recheck.json
// Read-only: page views and GET requests only, one page at a time.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(here, '../../data/sites/princess.com');
const BASE = 'https://www.princess.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let { issues } = JSON.parse(await fs.readFile(path.join(siteDir, 'known-issues.json'), 'utf8'));
// --only typos,grammar rechecks just those issues and keeps the earlier results for the rest.
const onlyArg = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1].split(',') : null;
if (onlyArg) issues = issues.filter((i) => onlyArg.includes(i.id));
const wordRe = (w) => new RegExp(`(^|[^a-z])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z]|$)`, 'i');

// Follow redirects by hand so we can see where a URL ends up.
async function resolve(url) {
  let cur = url;
  for (let i = 0; i < 6; i++) {
    const r = await fetch(cur, { redirect: 'manual', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30000) });
    r.body?.cancel().catch(() => {});
    const loc = r.headers.get('location');
    if (r.status >= 300 && r.status < 400 && loc) { cur = new URL(loc, cur).toString(); continue; }
    return { status: r.status, finalUrl: cur };
  }
  return { status: 'redirect-loop', finalUrl: cur };
}

// Load each page once in the browser and keep what the checks need.
const pageUrls = new Set();
for (const i of issues) {
  if (['blank', 'text', 'html', 'links'].includes(i.check)) i.urls.forEach((u) => pageUrls.add(u));
  if (i.check === 'typos') i.typos.forEach(([u]) => pageUrls.add(u));
}
const browser = await chromium.launch();
const context = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 }, locale: 'en-US' });
const pages = new Map();
let n = 0;
for (const u of pageUrls) {
  const page = await context.newPage();
  const rec = { status: null, text: '', allText: '', html: '', links: [], contentLength: 0 };
  try {
    const r = await page.goto(BASE + u, { waitUntil: 'domcontentloaded', timeout: 60000 });
    rec.status = r?.status() ?? null;
    rec.finalUrl = page.url();
    await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
    for (let y = 0; y < 4; y++) { await page.mouse.wheel(0, 1500); await sleep(500); }
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
    await sleep(1500);
    Object.assign(rec, await page.evaluate(() => {
      const text = document.body?.innerText || '';
      // Visible text plus text in collapsed or hidden sections (accordions, tabs, carousels), for typos.
      const allText = text + '\n' + (document.body?.textContent || '').replace(/\s+/g, ' ');
      // Visible text in <main>, minus any header, footer, dialog or signup box inside it, to spot blank pages.
      const main = document.querySelector('main') || document.body;
      let content = main.innerText || '';
      for (const e of main.querySelectorAll('header, footer, [role=dialog], [class*=newsletter], [class*=signup], [class*=sign-up]')) {
        content = content.replace(e.innerText || '', '');
      }
      return { text, allText, html: document.documentElement.outerHTML, links: [...document.querySelectorAll('a[href]')].map((a) => a.href),
        contentLength: content.replace(/\s+/g, ' ').trim().length };
    }));
  } catch (e) { rec.error = e.message.slice(0, 120); }
  await page.close();
  pages.set(u, rec);
  console.log(`${String(++n).padStart(3)}/${pageUrls.size} ${rec.status} ${u}`);
  await sleep(1200);
}
await browser.close();

// Evaluate each issue: "still" = still there, "fixed" = gone, "unknown" = couldn't tell.
const results = [];
for (const i of issues) {
  const items = [];
  if (i.check === 'blank') for (const u of i.urls) {
    const p = pages.get(u);
    items.push({ url: u, state: p.status !== 200 ? 'unknown' : p.contentLength < 250 ? 'still' : 'fixed',
      note: `HTTP ${p.status}, ${p.contentLength} characters of page content` });
  }
  if (i.check === 'text' || i.check === 'html') for (const u of i.urls) {
    const p = pages.get(u);
    const hay = i.check === 'html' ? p.html : p.text;
    items.push({ url: u, state: p.status !== 200 ? 'unknown' : hay.includes(i.find) ? 'still' : 'fixed',
      note: p.status !== 200 ? `HTTP ${p.status}` : `${hay.split(i.find).length - 1} found` });
  }
  if (i.check === 'links') for (const u of i.urls) {
    const p = pages.get(u);
    const re = i.find.startsWith('/(') ? new RegExp(i.find.slice(0)) : null;
    const hits = p.links.filter((l) => (re ? re.test(new URL(l).pathname) : new URL(l).pathname.replace(/\/$/, '') === i.find));
    items.push({ url: u, state: p.status !== 200 ? 'unknown' : hits.length ? 'still' : 'fixed',
      note: p.status !== 200 ? `HTTP ${p.status}` : `${hits.length} link${hits.length === 1 ? '' : 's'}` });
  }
  if (i.check === 'typos') for (const [u, w] of i.typos) {
    const p = pages.get(u);
    items.push({ url: u, word: w, state: p.status !== 200 ? 'unknown' : wordRe(w).test(p.allText) ? 'still' : 'fixed', note: p.status !== 200 ? `HTTP ${p.status}` : '' });
  }
  if (i.check === 'status404') for (const u of i.urls) {
    const r = await resolve(BASE + u);
    items.push({ url: u, state: r.status === 404 ? 'still' : r.status === 200 ? 'fixed' : 'unknown', note: `HTTP ${r.status}` });
  }
  if (i.check === 'redirect') for (const u of i.urls) {
    const r = await resolve(BASE + u);
    const end = new URL(r.finalUrl).pathname.replace(/\/$/, '');
    items.push({ url: u, state: end === i.find ? 'still' : r.status === 200 ? 'fixed' : 'unknown', note: `ends at ${end} (HTTP ${r.status})` });
    await sleep(300);
  }
  const count = (s) => items.filter((x) => x.state === s).length;
  const state = count('still') ? (count('fixed') ? 'partly fixed' : 'still there') : count('fixed') ? 'fixed' : 'unknown';
  results.push({ id: i.id, severity: i.severity, title: i.title, state, still: count('still'), fixed: count('fixed'), unknown: count('unknown'), items });
  console.log(`${state.toUpperCase().padEnd(13)} ${i.title} (${count('still')} still, ${count('fixed')} fixed, ${count('unknown')} unknown)`);
}
let merged = results;
if (onlyArg) {
  const prev = JSON.parse(await fs.readFile(path.join(siteDir, 'issue-recheck.json'), 'utf8').catch(() => '{"results":[]}'));
  merged = prev.results.map((r) => results.find((x) => x.id === r.id) || r);
  for (const r of results) if (!merged.some((m) => m.id === r.id)) merged.push(r);
}
await fs.writeFile(path.join(siteDir, 'issue-recheck.json'), JSON.stringify({ checkedAt: new Date().toISOString(), results: merged }, null, 2));
