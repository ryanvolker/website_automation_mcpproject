// Audits crawled princess.com content for SEO gaps, soft errors, stray characters,
// likely typos, outdated wording and inconsistent data.
// Usage: node audit-content.mjs   → writes data/sites/princess.com/content-audit.json
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(here, '../../data/sites/princess.com');
const readJson = async (f) => JSON.parse(await fs.readFile(path.join(siteDir, f), 'utf8'));
const SECTIONS = ['destinations', 'ships', 'dining', 'deals', 'help'];

// Load pages and their full text (text/ holds the newest crawl's full page text).
const textFiles = await fs.readdir(path.join(siteDir, 'text')).catch(() => []);
const pages = [];
for (const s of SECTIONS) {
  const d = await readJson(`${s}.json`);
  const tf = textFiles.filter((f) => f.startsWith(`${s}-`)).sort().at(-1);
  const text = tf ? await readJson(`text/${tf}`) : {};
  for (const p of d.pages) pages.push({ ...p, section: s, text: text[p.url] || text[p.finalUrl] || '' });
}
const live = pages.filter((p) => p.status === 200);
const excursions = await readJson('excursions.json');

const issues = {};
const flag = (kind, item) => (issues[kind] ||= []).push(item);
const ctx = (s, i, n = 70) => s.slice(Math.max(0, i - n), i + n).replace(/\s+/g, ' ').trim();

// 1. HTTP status of crawled pages
for (const p of pages) if (p.status !== 200) flag('httpError', { section: p.section, status: p.status, url: p.url });

// 2. Soft errors: page loads but looks like an error page or is nearly empty
for (const p of live) {
  if (/not found|error|unavailable/i.test(p.title || '') || /not found|went wrong/i.test(p.h1 || '')) flag('softError', { url: p.url, title: p.title, h1: p.h1 });
  else if ((p.textLength || 0) < 400) flag('thinPage', { url: p.url, title: p.title, textLength: p.textLength });
}

// 3. SEO basics
const titleCount = {};
const metaCount = {};
for (const p of live) {
  const t = (p.title || '').trim();
  const m = (p.metaDescription || '').trim();
  if (!t) flag('missingTitle', { url: p.url });
  else {
    (titleCount[t] ||= []).push(p.url);
    if (t.length > 70) flag('longTitle', { url: p.url, title: t, length: t.length });
  }
  if (!m) flag('missingMeta', { url: p.url, title: t });
  else {
    (metaCount[m] ||= []).push(p.url);
    if (m.length > 170) flag('longMeta', { url: p.url, length: m.length });
    if (m.length < 50) flag('shortMeta', { url: p.url, meta: m });
  }
  if (!(p.h1 || '').trim()) flag('missingH1', { url: p.url, title: t });
}
for (const [t, urls] of Object.entries(titleCount)) if (urls.length > 1) flag('duplicateTitle', { title: t, count: urls.length, urls });
for (const [m, urls] of Object.entries(metaCount)) if (urls.length > 1) flag('duplicateMeta', { meta: m.slice(0, 120), count: urls.length, urls });

// 4. Stray characters and template leftovers in visible labels and text
const INVISIBLE = /[​-‏⁠﻿]/;
for (const p of live) {
  for (const c of p.ctas || []) {
    const label = typeof c === 'string' ? c : c.text || '';
    if (INVISIBLE.test(label)) flag('invisibleChars', { url: p.url, label: JSON.stringify(label) });
  }
  for (const h of p.headings || []) {
    const t = typeof h === 'string' ? h : h.text || '';
    if (INVISIBLE.test(t)) flag('invisibleChars', { url: p.url, label: JSON.stringify(t) });
  }
  const tx = p.text;
  for (const re of [/\b(undefined|NaN|lorem ipsum|\[object Object\]|TBD|TODO)\b/g, /\{\{[^}]*\}\}/g, /\$\{[^}]*\}/g]) {
    for (const m of tx.matchAll(re)) flag('templateLeftover', { url: p.url, match: m[0], context: ctx(tx, m.index) });
  }
  for (const m of tx.matchAll(/\b([A-Za-z]{2,})\s+\1\b/gi)) {
    if (/^(ha|bora|no|very|so|knock|bye|tom|walla|mahi|pago)$/i.test(m[1])) continue;
    flag('repeatedWord', { url: p.url, match: m[0], context: ctx(tx, m.index) });
  }
}

// 5. Likely typos: rare words one edit away from a common word
const words = {};
const where = {};
const allText = [
  ...live.map((p) => [p.url, [p.title, p.metaDescription, p.h1, p.text].join(' ')]),
  ...excursions.ports.flatMap((pt) => pt.excursions.map((e) => [e.url, e.name])),
  ...excursions.ports.map((pt) => [pt.url, pt.intro || '']),
];
for (const [url, t] of allText) {
  for (const w of (t || '').match(/[A-Za-z][a-z]{3,}/g) || []) {
    const lw = w.toLowerCase();
    words[lw] = (words[lw] || 0) + 1;
    if (!where[lw]) where[lw] = { url, text: t };
  }
}
const common = Object.entries(words).filter(([, n]) => n >= 15).map(([w]) => w);
const commonSet = new Set(common);
const oneEdit = (a, b) => {
  if (Math.abs(a.length - b.length) > 1 || a === b) return false;
  if (a.length === b.length) {
    const diff = [];
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) diff.push(i);
    if (diff.length === 1) return true;
    return diff.length === 2 && diff[1] === diff[0] + 1 && a[diff[0]] === b[diff[1]] && a[diff[1]] === b[diff[0]];
  }
  const [s, l] = a.length < b.length ? [a, b] : [b, a];
  let i = 0;
  while (i < s.length && s[i] === l[i]) i++;
  return s.slice(i) === l.slice(i + 1);
};
for (const [w, n] of Object.entries(words)) {
  if (n > 2 || w.length < 5 || commonSet.has(w)) continue;
  const near = common.find((c) => oneEdit(w, c) && words[c] >= n * 20 && !(w + 's' === c || c + 's' === w || w + 'd' === c || c + 'd' === w));
  if (!near) continue;
  const src = where[w];
  const i = src.text.toLowerCase().search(new RegExp(`\\b${w}\\b`));
  flag('possibleTypo', { word: w, didYouMean: near, count: n, url: src.url, context: i >= 0 ? ctx(src.text, i) : '' });
}

// 6. Outdated wording: future-tense or "new" claims tied to past years
const NOW = new Date();
const thisYear = NOW.getUTCFullYear();
const OUTDATED = new RegExp(`\\b(new (for|in)|coming( in)?|launch(es|ing)? in|debut(s|ing)? in|arriv(es|ing) in|starting in|beginning in|book now for|sailing in|season)\\s+(20(1\\d|2[0-${String(thisYear - 1).slice(-1)}]))\\b`, 'gi');
for (const p of live) {
  for (const m of p.text.matchAll(OUTDATED)) flag('outdatedWording', { url: p.url, match: m[0], context: ctx(p.text, m.index) });
  for (const m of p.text.matchAll(/\b(20(1\d|2[0-5]))[-–\/](20)?(2[0-6]|1\d)\s+(season|world cruise|cruises?)\b/gi)) flag('outdatedWording', { url: p.url, match: m[0], context: ctx(p.text, m.index) });
}

// 7. Data consistency
// 7a. Ship facts: guests should be about 2x guest cabins (double occupancy)
for (const p of live.filter((x) => x.section === 'ships' && /\/ships\/[a-z]{2}-/.test(x.url))) {
  const t = p.text;
  const g = Number((t.match(/Guests:?\s*([\d,]+)/) || [])[1]?.replace(/,/g, ''));
  const c = Number((t.match(/Guest Cabins:?\s*([\d,]+)/) || [])[1]?.replace(/,/g, ''));
  const facts = { url: p.url, ship: p.h1 || p.title, guests: g || null, cabins: c || null };
  for (const k of ['Crew', 'Number of Decks', 'Tonnage', 'Length', 'Inaugural Cruise']) {
    const m = t.match(new RegExp(`${k}:?\\s*([^A-Z]{1,30})`));
    facts[k] = m ? m[1].trim() : null;
  }
  flag('shipFacts', facts);
  if (!g || !c) flag('shipFactsMissing', facts);
  else if (Math.abs(g / (c * 2) - 1) > 0.06) flag('shipFactsInconsistent', { ...facts, note: `guests ${g} vs 2 × ${c} cabins = ${c * 2}` });
}
// 7b. Excursions
for (const pt of excursions.ports) {
  const seen = {};
  for (const e of pt.excursions) {
    if (!e.price) flag('excursionNoPrice', { port: pt.port, name: e.name, url: e.url });
    if (!e.duration) flag('excursionNoDuration', { port: pt.port, name: e.name, url: e.url });
    if (e.rating && !e.reviews) flag('excursionRatingNoReviews', { port: pt.port, name: e.name, rating: e.rating });
    const k = e.name.toLowerCase().trim();
    if (seen[k] && seen[k] !== e.url) flag('excursionDuplicateName', { port: pt.port, name: e.name, urls: [seen[k], e.url] });
    seen[k] = e.url;
    if (e.name !== e.name.trim() || /\s{2,}/.test(e.name)) flag('excursionNameSpacing', { port: pt.port, name: JSON.stringify(e.name) });
  }
  if (pt.sitemapCount > 0 && pt.excursions.length === 0) flag('portNoExcursionsButSitemap', { port: pt.port || pt.slug, url: pt.url, sitemapCount: pt.sitemapCount });
}
// 7c. Featured cruises with missing or zero prices
for (const p of live) for (const f of p.featuredCruises || []) if (!f.lowestPrice) flag('featuredCruiseNoPrice', { url: p.url, voyageCode: f.voyageCode, label: (f.label || '').slice(0, 100) });
// 7d. Redirected crawled pages (old URLs still linked or listed)
for (const p of live.filter((x) => x.redirectsTo)) flag('redirectedPage', { url: p.url, to: p.redirectsTo });

const summary = Object.fromEntries(Object.entries(issues).map(([k, v]) => [k, v.length]));
await fs.writeFile(path.join(siteDir, 'content-audit.json'), JSON.stringify({ site: 'princess.com', auditedAt: NOW.toISOString(), pages: pages.length, livePages: live.length, summary, issues }, null, 2));
console.log(summary);
