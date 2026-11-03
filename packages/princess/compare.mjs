// Compares two snapshots of one section and prints a Markdown change report.
//
// Usage:
//   node compare.mjs <section>                    two newest snapshots of that section
//   node compare.mjs <section> <old.json> <new.json>
//   node compare.mjs <section> --json             machine-readable changes
//   node compare.mjs <section> --out report.md    also save the report
//   node compare.mjs <section> --words            show sentence-level wording changes (needs local text files)
//
// Sections: destinations, ships, dining, deals, help, excursions, sitemap

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(here, '../../data/sites/princess.com');
const snapDir = path.join(siteDir, 'snapshots');

const argv = process.argv.slice(2);
const section = argv[0];
const flag = (n) => argv.includes(`--${n}`);
const outIdx = argv.indexOf('--out');
const outFile = outIdx >= 0 ? argv[outIdx + 1] : null;
let files = argv.slice(1).filter((a, i) => !a.startsWith('--') && !(outIdx >= 0 && i + 1 === outIdx + 1));
if (!section) {
  console.error('Usage: node compare.mjs <section> [old.json new.json] [--json] [--out file] [--words]');
  process.exit(1);
}
if (files.length !== 2) {
  const all = (await fs.readdir(snapDir)).filter((f) => f.startsWith(`${section}-`) && f.endsWith('.json')).sort();
  if (all.length < 2) {
    console.error(`Need two "${section}" snapshots to compare; found ${all.length}. Crawl again later.`);
    process.exit(1);
  }
  files = all.slice(-2).map((f) => path.join(snapDir, f));
}
const [A, B] = await Promise.all(files.map(async (f) => JSON.parse(await fs.readFile(f, 'utf8'))));

// ---------- helpers ----------
const diffList = (a = [], b = [], key = (x) => x) => {
  const ka = new Map(a.map((x) => [key(x), x]));
  const kb = new Map(b.map((x) => [key(x), x]));
  return {
    added: [...kb.keys()].filter((k) => !ka.has(k)).map((k) => kb.get(k)),
    removed: [...ka.keys()].filter((k) => !kb.has(k)).map((k) => ka.get(k)),
    kept: [...kb.keys()].filter((k) => ka.has(k)).map((k) => [ka.get(k), kb.get(k)]),
  };
};
const short = (u) => (u || '').replace('https://www.princess.com', '');
const money = (n) => (n == null ? '—' : `$${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`);
const pct = (a, b) => Math.round(((b - a) / a) * 100);
const titleCase = (s) => s.split('-').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(' ');
// "/cruise-destinations/caribbean-cruises/eastern-caribbean" -> "Caribbean › Eastern Caribbean"
const nameOf = (url) => {
  const parts = new URL(url).pathname.split('/').filter(Boolean);
  const drop = ['cruise-destinations', 'ships-and-experience', 'cruise-dining', 'cruise-deals-promotions'];
  return (drop.includes(parts[0]) ? parts.slice(1) : parts).map((s) => titleCase(s.replace(/-cruises$|^cruises-to-/g, ''))).join(' › ') || 'Home';
};

const structural = [];
const commercial = [];
let extraSections = [];

// ---------- page-based sections ----------
function comparePages() {
  const pages = diffList(A.pages, B.pages, (p) => p.url);
  pages.added.forEach((p) => structural.push({ url: p.url, change: '**New page**' }));
  pages.removed.forEach((p) => structural.push({ url: p.url, change: '**Page gone**' }));
  for (const [a, b] of pages.kept) {
    const s = (change) => structural.push({ url: b.url, change });
    const c = (change) => commercial.push({ url: b.url, change });
    if (a.status !== b.status) s(`Status ${a.status} → ${b.status}`);
    if ((a.redirectsTo || '') !== (b.redirectsTo || '')) s(`Redirect: ${short(a.redirectsTo) || 'none'} → ${short(b.redirectsTo) || 'none'}`);
    for (const f of ['title', 'h1', 'metaDescription']) if (a[f] !== b[f]) s(`${f}: "${a[f]}" → "${b[f]}"`);
    for (const [label, f] of [['Section', 'sections'], ['Port code', 'portCodes'], ['Destination code', 'tradeCodes'], ['Ship code', 'shipCodes'], ['FAQ', 'faqs'], ['Button', 'ctas']]) {
      const d = diffList(a[f], b[f]);
      d.added.forEach((x) => s(`${label} added: ${x}`));
      d.removed.forEach((x) => s(`${label} removed: ${x}`));
    }
    const h = diffList(a.headings, b.headings, (x) => `${x.level}:${x.text}`);
    h.added.filter((x) => x.level <= 2).forEach((x) => s(`Heading added: "${x.text}"`));
    h.removed.filter((x) => x.level <= 2).forEach((x) => s(`Heading removed: "${x.text}"`));
    const pp = diffList(a.portPages, b.portPages, (x) => x.url);
    pp.added.forEach((x) => s(`Port page linked: ${short(x.url)}`));
    pp.removed.forEach((x) => s(`Port page unlinked: ${short(x.url)}`));
    if (a.textHash !== b.textHash) {
      const delta = (b.textLength ?? 0) - (a.textLength ?? 0);
      s(`Page copy changed (${delta >= 0 ? '+' : ''}${delta} characters)`);
    }
    const fc = diffList(a.featuredCruises, b.featuredCruises, (x) => x.voyageCode + (x.tourCode ? `/${x.tourCode}` : ''));
    const label = (x) => (x.card || x.label || x.voyageCode).replace(/\s*VIEW CRUISES?\s*$/i, '').slice(0, 80);
    fc.added.forEach((x) => c(`Featured ${x.type} added: ${label(x)} (${x.voyageCode}, from ${money(x.lowestPrice)})`));
    fc.removed.forEach((x) => c(`Featured ${x.type} removed: ${label(x)} (${x.voyageCode})`));
    fc.kept.forEach(([x, y]) => {
      if (x.lowestPrice != null && y.lowestPrice != null && x.lowestPrice !== y.lowestPrice) {
        c(`Price ${y.lowestPrice < x.lowestPrice ? '▼' : '▲'} ${label(y)} (${y.voyageCode}): ${money(x.lowestPrice)} → ${money(y.lowestPrice)} (${pct(x.lowestPrice, y.lowestPrice)}%)`);
      }
    });
    const sl = diffList(a.searchLinks, b.searchLinks, (x) => x.url);
    if (sl.added.length || sl.removed.length) c(`Search/deal links: ${sl.added.length} added, ${sl.removed.length} removed`);
  }
}

// ---------- excursions ----------
function compareExcursions() {
  const ports = diffList(A.ports, B.ports, (p) => p.slug);
  ports.added.forEach((p) => structural.push({ url: p.url, change: `**New port** with ${p.excursions.length} excursions` }));
  ports.removed.forEach((p) => structural.push({ url: p.url, change: '**Port gone**' }));
  for (const [a, b] of ports.kept) {
    const ex = diffList(a.excursions, b.excursions, (x) => x.slug);
    ex.added.forEach((x) => structural.push({ url: b.url, change: `Excursion added: ${x.name} (${money(x.price)}, ${x.duration ?? '?'}, ${x.activity ?? '?'})` }));
    ex.removed.forEach((x) => structural.push({ url: b.url, change: `Excursion removed: ${x.name}` }));
    ex.kept.forEach(([x, y]) => {
      if (x.price != null && y.price != null && x.price !== y.price) {
        commercial.push({ url: b.url, change: `Price ${y.price < x.price ? '▼' : '▲'} ${y.name}: ${money(x.price)} → ${money(y.price)} (${pct(x.price, y.price)}%)` });
      }
    });
  }
}

// ---------- sitemap ----------
function compareSitemap() {
  const pages = diffList(A.pages, B.pages, (p) => p.url);
  const bySection = (list) => list.reduce((m, p) => ((m[p.section] = (m[p.section] || 0) + 1), m), {});
  pages.added.forEach((p) => structural.push({ url: p.url, change: `New in sitemap (${p.section})` }));
  pages.removed.forEach((p) => structural.push({ url: p.url, change: `Dropped from sitemap (${p.section})` }));
  pages.kept.filter(([a, b]) => a.lastmod !== b.lastmod).forEach(([a, b]) => commercial.push({ url: b.url, change: `Updated ${a.lastmod?.slice(0, 10)} → ${b.lastmod?.slice(0, 10)}` }));
  extraSections.push(
    '## Sitemap counts by section',
    '',
    '| Section | Added | Removed | Updated |',
    '|---|---|---|---|',
    ...Object.keys({ ...bySection(pages.added), ...bySection(pages.removed), ...bySection(pages.kept.filter(([a, b]) => a.lastmod !== b.lastmod).map(([, b]) => b)) }).map(
      (s) =>
        `| ${s} | ${bySection(pages.added)[s] || 0} | ${bySection(pages.removed)[s] || 0} | ${bySection(pages.kept.filter(([a, b]) => a.lastmod !== b.lastmod).map(([, b]) => b))[s] || 0} |`,
    ),
    '',
  );
}

if (section === 'excursions') compareExcursions();
else if (section === 'sitemap') compareSitemap();
else comparePages();

// ---------- optional wording diff from local full-text files ----------
async function wordingDiffs() {
  const textFile = (f) => path.join(siteDir, 'text', path.basename(f));
  let ta, tb;
  try {
    [ta, tb] = await Promise.all(files.map(async (f) => JSON.parse(await fs.readFile(textFile(f), 'utf8'))));
  } catch {
    return ['## Wording changes', '', '_Full text for one of these crawls isn\'t saved locally, so exact wording can\'t be shown._', ''];
  }
  const sentences = (t) => (t || '').split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 25);
  const out = ['## Wording changes', ''];
  const changed = [...new Set(structural.filter((x) => /Page copy changed/.test(x.change)).map((x) => x.url))];
  for (const url of changed) {
    const a = new Set(sentences(ta[url]));
    const b = new Set(sentences(tb[url]));
    const gone = [...a].filter((s) => !b.has(s)).slice(0, 5);
    const added = [...b].filter((s) => !a.has(s)).slice(0, 5);
    out.push(`### ${nameOf(url)}`, ...gone.map((s) => `- ~~${s.slice(0, 200)}~~`), ...added.map((s) => `- **${s.slice(0, 200)}**`), '');
  }
  return changed.length ? out : [];
}

// ---------- output ----------
const when = (s) => (s.crawledAt || s.fetchedAt).slice(0, 16).replace('T', ' ');
const count = (s) => s.pageCount ?? s.portCount ?? s.total;
if (flag('json')) {
  console.log(JSON.stringify({ section, from: when(A), to: when(B), structural, commercial }, null, 2));
  process.exit(0);
}
const group = (items) => {
  const m = new Map();
  items.forEach(({ url, change }) => (m.get(url) ?? m.set(url, []).get(url)).push(change));
  return [...m.entries()].sort((x, y) => nameOf(x[0]).localeCompare(nameOf(y[0])));
};
const block = (title, items, cap = 400) => {
  if (!items.length) return [`## ${title}`, '', '_No changes._', ''];
  const groups = group(items);
  const lines = [`## ${title}`, ''];
  for (const [url, changes] of groups.slice(0, cap)) lines.push(`### ${nameOf(url)}`, `<${url}>`, '', ...changes.map((c) => `- ${c}`), '');
  if (groups.length > cap) lines.push(`_…and ${groups.length - cap} more pages._`, '');
  return lines;
};
const labels = {
  excursions: ['Ports & excursions added or removed', 'Excursion price changes'],
  sitemap: ['Pages added to or dropped from the sitemap', 'Pages with a new last-modified date'],
};
const [sTitle, cTitle] = labels[section] || ['Structural changes (pages, ports, sections, copy)', 'Featured cruises & prices'];
const touched = new Set([...structural, ...commercial].map((x) => x.url));
const lines = [
  `# Princess ${section}: change report`,
  '',
  `Compared **${when(A)}** (${count(A)}) with **${when(B)}** (${count(B)}), UTC.`,
  '',
  '| | Count |',
  '|---|---|',
  `| Pages/ports with changes | ${touched.size} |`,
  `| ${sTitle} | ${structural.length} |`,
  `| ${cTitle} | ${commercial.length} |`,
  `| Crawl errors (new crawl) | ${(B.errors || []).length} |`,
  '',
  ...extraSections,
  ...block(sTitle, structural),
  ...(flag('words') ? await wordingDiffs() : []),
  ...block(cTitle, commercial, section === 'sitemap' ? 60 : 400),
];
if ((B.errors || []).length) lines.push('## Crawl errors', '', ...B.errors.map((e) => `- ${short(e.url)}: ${e.error}`), '');
const report = lines.join('\n');
console.log(report);
if (outFile) {
  await fs.writeFile(outFile, report);
  console.error(`\nReport written to ${outFile}`);
}
