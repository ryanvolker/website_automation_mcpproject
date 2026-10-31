// Compares two destination snapshots and prints a Markdown change report.
//
// Usage:
//   node compare-destinations.mjs                      (two newest snapshots)
//   node compare-destinations.mjs <old.json> <new.json>
//   node compare-destinations.mjs --out report.md      (also write the report to a file)
//   node compare-destinations.mjs --json               (print machine-readable changes instead)

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const snapDir = path.resolve(here, '../../data/sites/princess.com/snapshots');

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const outIdx = argv.indexOf('--out');
const outFile = outIdx >= 0 ? argv[outIdx + 1] : null;
let files = argv.filter((a, i) => !a.startsWith('--') && !(outIdx >= 0 && i === outIdx + 1));

if (files.length !== 2) {
  const all = (await fs.readdir(snapDir)).filter((f) => /^destinations-.*\.json$/.test(f)).sort();
  if (all.length < 2) {
    console.error(`Need two snapshots to compare; found ${all.length} in ${snapDir}. Run the crawl again later.`);
    process.exit(1);
  }
  files = all.slice(-2).map((f) => path.join(snapDir, f));
}
const [oldSnap, newSnap] = await Promise.all(files.map(async (f) => JSON.parse(await fs.readFile(f, 'utf8'))));

// ---- helpers ----
const diffList = (a = [], b = [], key = (x) => x) => {
  const ka = new Map(a.map((x) => [key(x), x]));
  const kb = new Map(b.map((x) => [key(x), x]));
  return {
    added: [...kb.keys()].filter((k) => !ka.has(k)).map((k) => kb.get(k)),
    removed: [...ka.keys()].filter((k) => !kb.has(k)).map((k) => ka.get(k)),
    kept: [...kb.keys()].filter((k) => ka.has(k)).map((k) => [ka.get(k), kb.get(k)]),
  };
};
const short = (u) => u.replace('https://www.princess.com', '');
// "caribbean-cruises__eastern-caribbean" -> "Caribbean › Eastern Caribbean"
const name = (p) =>
  p.slug
    .split('__')
    .map((s) => s.replace(/-cruises$|^cruises-to-/g, '').split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' '))
    .join(' › ');
const money = (n) => (n == null ? '—' : `$${n.toLocaleString('en-US')}`);
const cruiseKey = (c) => c.voyageCode + (c.tourCode ? `/${c.tourCode}` : '');
const cruiseName = (c) => (c.card || c.label || cruiseKey(c)).replace(/\s*VIEW CRUISES?\s*$/i, '').slice(0, 90);

// ---- compare ----
const pages = diffList(oldSnap.pages, newSnap.pages, (p) => p.url);
const structural = []; // { page, change }
const commercial = [];

for (const p of pages.added) structural.push({ page: p, change: `**New page** ${short(p.url)}` });
for (const p of pages.removed) structural.push({ page: p, change: `**Page gone** (was ${short(p.url)})` });

for (const [a, b] of pages.kept) {
  const s = (change) => structural.push({ page: b, change });
  const c = (change) => commercial.push({ page: b, change });

  if (a.status !== b.status) s(`Status ${a.status} → ${b.status}`);
  if ((a.redirectsTo || '') !== (b.redirectsTo || '')) s(`Redirect changed: ${a.redirectsTo ? short(a.redirectsTo) : 'none'} → ${b.redirectsTo ? short(b.redirectsTo) : 'none'}`);
  for (const f of ['title', 'h1', 'metaDescription']) if (a[f] !== b[f]) s(`${f}: "${a[f]}" → "${b[f]}"`);

  const listChecks = [
    ['Section', 'sections'],
    ['Port code', 'portCodes'],
    ['Destination code', 'tradeCodes'],
    ['FAQ', 'faqs'],
  ];
  for (const [label, f] of listChecks) {
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

  const rel = diffList(a.relatedDestinationPages, b.relatedDestinationPages);
  rel.added.forEach((x) => s(`Now links to ${short(x)}`));
  rel.removed.forEach((x) => s(`No longer links to ${short(x)}`));

  if (a.textHash !== b.textHash) {
    const delta = b.textLength - a.textLength;
    s(`Page copy changed (${delta >= 0 ? '+' : ''}${delta} characters)`);
  }

  const fc = diffList(a.featuredCruises, b.featuredCruises, cruiseKey);
  fc.added.forEach((x) => c(`Featured ${x.type} added: ${cruiseName(x)} (${x.voyageCode}, from ${money(x.lowestPrice)})`));
  fc.removed.forEach((x) => c(`Featured ${x.type} removed: ${cruiseName(x)} (${x.voyageCode})`));
  fc.kept.forEach(([x, y]) => {
    if (x.lowestPrice !== y.lowestPrice && x.lowestPrice != null && y.lowestPrice != null) {
      const pct = Math.round(((y.lowestPrice - x.lowestPrice) / x.lowestPrice) * 100);
      c(`Price ${y.lowestPrice < x.lowestPrice ? '▼' : '▲'} ${cruiseName(y)} (${y.voyageCode}): ${money(x.lowestPrice)} → ${money(y.lowestPrice)} (${pct > 0 ? '+' : ''}${pct}%)`);
    }
  });
  const sl = diffList(a.searchLinks, b.searchLinks, (x) => x.url);
  if (sl.added.length || sl.removed.length) c(`Search/deal links: ${sl.added.length} added, ${sl.removed.length} removed`);
}

const newlyDiscovered = diffList(oldSnap.notCrawledYet, newSnap.notCrawledYet).added;

// ---- output ----
if (flag('json')) {
  console.log(JSON.stringify({ from: oldSnap.crawledAt, to: newSnap.crawledAt, structural, commercial, newlyDiscovered }, null, 2));
  process.exit(0);
}

const byPage = (items) => {
  const m = new Map();
  for (const { page, change } of items) {
    const k = page.url;
    if (!m.has(k)) m.set(k, { page, changes: [] });
    m.get(k).changes.push(change);
  }
  return [...m.values()].sort((x, y) => name(x.page).localeCompare(name(y.page)));
};
const section = (title, items) => {
  if (!items.length) return [`## ${title}`, '', '_No changes._', ''];
  return [
    `## ${title}`,
    '',
    ...byPage(items).flatMap(({ page, changes }) => [`### ${name(page)}`, `<${page.url}>`, '', ...changes.map((c) => `- ${c}`), '']),
  ];
};

const d = (s) => s.slice(0, 16).replace('T', ' ');
const touched = new Set([...structural, ...commercial].map((x) => x.page.url));
const lines = [
  `# Princess destinations: change report`,
  '',
  `Compared **${d(oldSnap.crawledAt)}** (${oldSnap.pageCount} pages) with **${d(newSnap.crawledAt)}** (${newSnap.pageCount} pages), UTC.`,
  '',
  `| | Count |`,
  `|---|---|`,
  `| Pages with changes | ${touched.size} |`,
  `| Pages added / removed | ${pages.added.length} / ${pages.removed.length} |`,
  `| Structural changes | ${structural.length} |`,
  `| Cruise & price changes | ${commercial.length} |`,
  `| Crawl errors (new snapshot) | ${newSnap.errors.length} |`,
  '',
  ...section('Structural changes (pages, ports, sections, copy)', structural),
  ...section('Featured cruises & prices', commercial),
];
if (newlyDiscovered.length) {
  lines.push('## Newly discovered destination pages (not crawled yet)', '', ...newlyDiscovered.map((u) => `- ${short(u)}`), '');
}
if (newSnap.errors.length) {
  lines.push('## Crawl errors', '', ...newSnap.errors.map((e) => `- ${short(e.url)}: ${e.error}`), '');
}

const report = lines.join('\n');
console.log(report);
if (outFile) {
  await fs.writeFile(outFile, report);
  console.error(`\nReport written to ${outFile}`);
}
