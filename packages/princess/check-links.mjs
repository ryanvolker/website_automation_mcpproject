// Checks the HTTP status of every sitemap URL and every internal link found by the crawls.
// Usage: node check-links.mjs [--delay 250] [--limit N]
// Writes data/sites/princess.com/link-check.json. Skips anything robots.txt disallows.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(here, '../../data/sites/princess.com');
const argv = process.argv.slice(2);
const opt = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);
const DELAY = Number(opt('delay', 250));
const LIMIT = Number(opt('limit', 0));
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const readJson = async (f) => JSON.parse(await fs.readFile(path.join(siteDir, f), 'utf8'));

const sitemap = await readJson('sitemap.json');
const disallow = sitemap.robotsDisallow || [];
const blocked = (u) => {
  const p = new URL(u).pathname + new URL(u).search;
  return disallow.some((d) => d && d !== '/' && p.startsWith(d.replace(/\*.*$/, '')));
};

// url -> { inSitemap, linkedFrom: Set }
const urls = new Map();
const add = (u, from) => {
  let clean;
  try { const x = new URL(u); x.hash = ''; clean = x.toString(); } catch { return; }
  if (!/^https:\/\/(www|book)\.princess\.com\//.test(clean)) return;
  if (!urls.has(clean)) urls.set(clean, { inSitemap: false, linkedFrom: new Set() });
  const e = urls.get(clean);
  if (from) e.linkedFrom.add(from); else e.inSitemap = true;
};
for (const p of sitemap.pages) add(p.url);
for (const s of ['destinations', 'ships', 'dining', 'deals', 'help']) {
  const d = await readJson(`${s}.json`);
  for (const pg of d.pages) {
    if (pg.status !== 200) continue;
    for (const l of pg.internalLinks || []) add(l, pg.url);
  }
}

let list = [...urls.keys()].filter((u) => !blocked(u));
const skipped = urls.size - list.length;
if (LIMIT) list = list.slice(0, LIMIT);
console.log(`Checking ${list.length} URLs (${skipped} skipped by robots.txt), ${DELAY}ms apart…`);

async function check(u) {
  const t = Date.now();
  const hops = [];
  let cur = u;
  for (let i = 0; i < 5; i++) {
    let r;
    try {
      r = await fetch(cur, { redirect: 'manual', headers: { 'user-agent': UA, accept: 'text/html' }, signal: AbortSignal.timeout(30000) });
    } catch (e) {
      return { status: 'error', error: e.message, hops, ms: Date.now() - t };
    }
    r.body?.cancel().catch(() => {});
    const loc = r.headers.get('location');
    if (r.status >= 300 && r.status < 400 && loc) {
      const next = new URL(loc, cur).toString();
      hops.push({ status: r.status, to: next });
      cur = next;
      continue;
    }
    return { status: r.status, finalUrl: cur, hops, ms: Date.now() - t };
  }
  return { status: 'redirect-loop', hops, ms: Date.now() - t };
}

const CONCURRENCY = Number(opt('concurrency', 2));
const results = [];
const started = Date.now();
let next = 0;
let done = 0;
async function worker() {
  while (next < list.length) {
    const u = list[next++];
    const r = await check(u);
    const meta = urls.get(u);
    results.push({ url: u, ...r, inSitemap: meta.inSitemap, linkedFrom: [...meta.linkedFrom] });
    done++;
    if (r.status !== 200 || r.hops.length > 1) console.log(`[${done}/${list.length}] ${r.status}${r.hops.length ? ` via ${r.hops.length} redirect(s)` : ''} ${u}`);
    if (done % 250 === 0) {
      const left = ((Date.now() - started) / done) * (list.length - done) / 60000;
      console.log(`… ${done}/${list.length} checked, ~${left.toFixed(0)} min left`);
    }
    await sleep(DELAY);
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

const byStatus = {};
for (const r of results) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
const out = {
  site: 'princess.com',
  checkedAt: new Date().toISOString(),
  total: results.length,
  skippedByRobots: skipped,
  byStatus,
  redirected: results.filter((r) => r.hops.length).length,
  results,
};
await fs.writeFile(path.join(siteDir, 'link-check.json'), JSON.stringify(out, null, 2));
console.log(`\nDone in ${((Date.now() - started) / 60000).toFixed(1)} min:`, byStatus, `redirected ${out.redirected}`);
