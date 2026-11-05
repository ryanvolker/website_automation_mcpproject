// Builds a compact HTML report of the fleet map: ships, stateroom mix, upcoming layout changes, and which ships have which venues.
// Usage: node build-fleet-report.mjs   → docs/reports/princess-fleet-map-<date>.html
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const f = JSON.parse(await fs.readFile(path.join(root, 'data/sites/princess.com/fleet-map.json'), 'utf8'));
const date = new Date(f.from.deckPlans).toLocaleDateString('en-CA'); // local date, e.g. 2026-11-04
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const n = (x) => (x == null ? '–' : Number(x).toLocaleString('en-US'));
const short = (name) => name.replace(/ Princess$/, '');
const TYPES = ['Interior', 'Oceanview', 'Balcony', 'Mini-Suite', 'Suite'];
const ships = [...f.ships].sort((a, b) => (b.layouts[0]?.counts.cabins || 0) - (a.layouts[0]?.counts.cabins || 0));
const totalCabins = ships.reduce((s, x) => s + (x.layouts[0]?.counts.cabins || 0), 0);
const totalAccessible = ships.reduce((s, x) => s + (x.layouts[0]?.counts.wheelchairCabins || 0), 0);
const layouts = ships.reduce((s, x) => s + x.layouts.length, 0);

// Fleet table
const fleetRows = ships.map((s) => {
  const l = s.layouts[0];
  const t = l.staterooms;
  const cells = TYPES.map((k) => `<td class="n">${n(t[k]?.cabins)}</td>`).join('');
  const bal = ((t.Balcony?.cabins || 0) + (t['Mini-Suite']?.cabins || 0) + (t.Suite?.cabins || 0)) / l.counts.cabins;
  return `<tr><td><a href="${esc(s.page)}">${esc(s.name)}</a></td><td class="n">${esc(s.facts.guests || '–')}</td><td class="n">${l.counts.decks}</td><td class="n"><b>${n(l.counts.cabins)}</b></td>${cells}<td class="n">${Math.round(bal * 100)}%</td><td class="n">${l.counts.wheelchairCabins}</td><td class="n">${s.venues.length}</td></tr>`;
}).join('');

// Upcoming layout changes worth noting
const changeRows = ships.flatMap((s) => s.changes.map((c) => {
  const bits = [];
  if (c.cabins) bits.push(`${c.cabins > 0 ? '+' : ''}${c.cabins} cabins`);
  const renamesOnly = c.roomsAdded.length > 15; // a layout where most rooms are renamed, not changed
  if (renamesOnly) bits.push(`most public rooms renamed (${c.roomsAdded.length} new names, ${c.roomsRemoved.length} old names)`);
  else {
    if (c.roomsAdded.length) bits.push(`adds ${c.roomsAdded.map(esc).join(', ')}`);
    if (c.roomsRemoved.length) bits.push(`removes ${c.roomsRemoved.map(esc).join(', ')}`);
  }
  return bits.length ? `<tr><td>${esc(s.name)}</td><td>${esc(c.to.replace(/^Sailing /, ''))}</td><td>${bits.join('; ')}</td></tr>` : '';
})).filter(Boolean).join('');
const sameLayout = ships.filter((s) => s.changes.length && s.changes.every((c) => !c.cabins && !c.roomsAdded.length && !c.roomsRemoved.length)).map((s) => short(s.name));

// Venue finder by section
const sections = ['Dining', 'Bars', 'Activities & Entertainment', 'Wellness', 'Kids & Family'];
const nameOf = Object.fromEntries(f.ships.map((s) => [s.code, short(s.name)]));
const venueBlocks = sections.map((sec) => {
  const rows = f.venueIndex.filter((v) => v.section === sec);
  if (!rows.length) return '';
  const tr = rows.map((v) => {
    const all = v.ships.length === f.ships.length;
    return `<tr><td>${esc(v.name)}</td><td class="n">${v.ships.length}</td><td>${all ? '<span class="chip all">All ships</span>' : v.ships.map((c) => `<span class="chip">${esc(nameOf[c])}</span>`).join(' ')}</td></tr>`;
  }).join('');
  return `<details${sec === 'Dining' ? ' open' : ''}><summary>${esc(sec)} <span class="muted">(${rows.length})</span></summary><div class="scroll"><table><thead><tr><th>Venue</th><th class="n">Ships</th><th>On</th></tr></thead><tbody>${tr}</tbody></table></div></details>`;
}).join('');

// Data checks
const checks = [];
for (const s of ships) {
  const page = Number(String(s.facts.guestCabins || '').replace(/[^\d]/g, ''));
  const plan = s.layouts[0].counts.cabins;
  if (page && Math.abs(page - plan) / plan > 0.05) checks.push(`<li><b>${esc(s.name)}</b>: the ship page says <b>${n(page)}</b> guest cabins, but the deck plan lists <b>${n(plan)}</b>. The page fact looks out of date.</li>`);
}
const misspelt = f.ships.flatMap((s) => s.layouts[0].publicRooms.filter((r) => /makato/i.test(r.name)).map(() => short(s.name)));
if (misspelt.length) checks.push(`<li><b>"Makato Ocean"</b> is misspelled in the deck plan (the restaurant is Makoto Ocean) on ${[...new Set(misspelt)].join(', ')}.</li>`);
checks.push(`<li><b>Deck plan pages for ships with two layouts</b> return "Service temporarily unavailable" if a request has no language setting. Normal browsers always send one, so visitors aren't affected, but simple monitoring tools and some bots get an error page.</li>`);

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Princess Fleet Map</title>
<style>
:root { --bg:#f6f5f2; --card:#fff; --text:#1c1c1e; --muted:#6a6a70; --line:#e4e2dc; --accent:#0b5f8a; --chip:#eef3f6; --chipall:#e6f4ea; --chipalltext:#1f7a3f; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg:#131416; --card:#1c1d20; --text:#ececee; --muted:#a2a2aa; --line:#33343a; --accent:#7cc3ea; --chip:#23282d; --chipall:#173322; --chipalltext:#6fd08f; } }
:root[data-theme="dark"] { --bg:#131416; --card:#1c1d20; --text:#ececee; --muted:#a2a2aa; --line:#33343a; --accent:#7cc3ea; --chip:#23282d; --chipall:#173322; --chipalltext:#6fd08f; }
* { box-sizing:border-box; } body { margin:0; background:var(--bg); color:var(--text); font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif; }
main { max-width:1000px; margin:0 auto; padding:28px 16px 48px; overflow-x:clip; }
h1 { font-size:25px; margin:0 0 4px; } h2 { font-size:17px; margin:30px 0 10px; } .sub { color:var(--muted); margin:0 0 18px; }
.card { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:14px 16px; margin-bottom:14px; }
.stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:12px; margin-bottom:14px; }
.stat { background:var(--card); border:1px solid var(--line); border-radius:10px; padding:12px 14px; } .stat b { display:block; font-size:22px; } .stat span { color:var(--muted); font-size:13px; }
.scroll { max-width:100%; overflow-x:auto; } table { width:100%; border-collapse:collapse; font-size:14px; }
th, td { text-align:left; padding:7px 8px; border-bottom:1px solid var(--line); vertical-align:top; } th { color:var(--muted); font-weight:600; font-size:12.5px; white-space:nowrap; }
td.n, th.n { text-align:right; white-space:nowrap; } a { color:var(--accent); }
.chip { display:inline-block; background:var(--chip); border-radius:99px; padding:0 8px; font-size:12.5px; margin:1px 0; white-space:nowrap; }
.chip.all { background:var(--chipall); color:var(--chipalltext); font-weight:600; }
details { background:var(--card); border:1px solid var(--line); border-radius:10px; margin-bottom:10px; overflow:hidden; }
summary { cursor:pointer; padding:12px 16px; font-weight:600; } details .scroll { padding:0 10px 10px; }
ul { margin:6px 0 0; padding-left:20px; } li { margin:4px 0; } .muted { color:var(--muted); font-size:13px; font-weight:400; }
</style></head><body><main>
<h1>Princess fleet map</h1>
<p class="sub">All ${f.ships.length} ships: deck plans, staterooms and onboard venues · deck plans crawled ${date}</p>
<div class="stats">
  <div class="stat"><b>${f.ships.length}</b><span>ships mapped</span></div>
  <div class="stat"><b>${n(totalCabins)}</b><span>cabins, each with size and location</span></div>
  <div class="stat"><b>${n(totalAccessible)}</b><span>wheelchair-accessible cabins</span></div>
  <div class="stat"><b>${f.venueIndex.length}</b><span>distinct venues</span></div>
  <div class="stat"><b>${layouts - f.ships.length}</b><span>upcoming layout changes</span></div>
</div>

<h2>The fleet</h2>
<div class="card scroll"><table>
<thead><tr><th>Ship</th><th class="n">Guests</th><th class="n">Decks</th><th class="n">Cabins</th>${TYPES.map((t) => `<th class="n">${t}</th>`).join('')}<th class="n">Balcony or better</th><th class="n">Accessible</th><th class="n">Venues</th></tr></thead>
<tbody>${fleetRows}</tbody></table>
<p class="muted">Decks are the guest decks on the deck plan. Venues are those named on each ship's page.</p></div>

<h2>Upcoming layout changes</h2>
<div class="card scroll"><table><thead><tr><th>Ship</th><th>For sailings</th><th>What changes</th></tr></thead><tbody>${changeRows}</tbody></table>
${sameLayout.length ? `<p class="muted">${sameLayout.join(', ')} also show a new layout from the dates given, with no change to cabins or public rooms.</p>` : ''}</div>

<h2>Which ships have what</h2>
${venueBlocks}

<h2>Data issues found</h2>
<div class="card"><ul>${checks.join('')}</ul></div>
</main></body></html>`;
const out = path.join(root, `docs/reports/princess-fleet-map-${date}.html`);
await fs.writeFile(out, html);
console.log('Wrote', path.relative(root, out));
