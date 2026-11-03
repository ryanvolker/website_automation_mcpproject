// Downloads princess.com's sitemap and robots.txt and saves an inventory of
// every page, grouped by section, with last-modified dates and robots rules.
//
// Usage: node fetch-sitemap.mjs
// Writes: data/sites/princess.com/sitemap.json
//         data/sites/princess.com/snapshots/sitemap-<stamp>.json

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(here, '../../data/sites/princess.com');
const BASE = 'https://www.princess.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36';

const get = async (url) => {
  const res = await fetch(url, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res.text();
};

// ---- robots.txt: Disallow rules for "User-agent: *" group ----
const robotsTxt = await get(`${BASE}/robots.txt`);
const disallow = [];
const sitemaps = [];
for (const line of robotsTxt.split(/\r?\n/)) {
  const [k, ...v] = line.split(':');
  const val = v.join(':').trim();
  if (/^disallow$/i.test(k.trim()) && val) disallow.push(val);
  if (/^sitemap$/i.test(k.trim())) sitemaps.push(val);
}
const toRegex = (rule) =>
  new RegExp('^' + rule.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*') + (rule.endsWith('$') ? '' : ''));
const rules = disallow.map((r) => ({ rule: r, re: toRegex(r) }));
const blockedBy = (pathname) => rules.find((r) => r.re.test(pathname))?.rule;

// ---- sitemap.xml (US English) ----
const xml = await get(`${BASE}/sitemap.xml`);
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'");
const entries = [...xml.matchAll(/<url><loc>([^<]*)<\/loc>(?:<lastmod>([^<]*)<\/lastmod>)?/g)].map((m) => {
  m[1] = decode(m[1]);
  const u = new URL(m[1]);
  const parts = u.pathname.split('/').filter(Boolean);
  return {
    url: m[1].replace(/\/$/, ''),
    path: u.pathname,
    section: parts[0] || '(home)',
    subsection: parts[1] || null,
    lastmod: m[2] || null,
    blockedBy: blockedBy(u.pathname) || undefined,
  };
});

const sections = {};
for (const e of entries) {
  const s = (sections[e.section] ??= { count: 0, blocked: 0, newest: null, subsections: {} });
  s.count++;
  if (e.blockedBy) s.blocked++;
  if (e.lastmod && (!s.newest || e.lastmod > s.newest)) s.newest = e.lastmod;
  if (e.subsection) s.subsections[e.subsection] = (s.subsections[e.subsection] || 0) + 1;
}

const fetchedAt = new Date().toISOString();
const out = {
  site: 'princess.com',
  fetchedAt,
  sitemaps,
  robotsDisallow: disallow,
  total: entries.length,
  sections: Object.fromEntries(Object.entries(sections).sort((a, b) => b[1].count - a[1].count)),
  pages: entries,
};
const body = JSON.stringify(out, null, 1) + '\n';
await fs.mkdir(path.join(siteDir, 'snapshots'), { recursive: true });
await fs.writeFile(path.join(siteDir, 'sitemap.json'), body);
await fs.writeFile(path.join(siteDir, 'snapshots', `sitemap-${fetchedAt.slice(0, 16).replace(':', '')}Z.json`), body);

console.log(`${entries.length} pages, ${disallow.length} robots rules, ${entries.filter((e) => e.blockedBy).length} sitemap URLs blocked by robots`);
for (const [name, s] of Object.entries(out.sections)) {
  console.log(`${String(s.count).padStart(5)}  /${name}${s.blocked ? `  (${s.blocked} disallowed)` : ''}  newest ${s.newest?.slice(0, 10)}`);
}
