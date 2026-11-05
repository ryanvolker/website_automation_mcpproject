// Combines the ship pages (ships.json) and deck plans (deck-plans.json) into one map of the fleet:
// per ship, its facts, stateroom mix, and every venue with the deck it is on; plus which ships have each venue.
// Usage: node build-fleet-map.mjs   → writes data/sites/princess.com/fleet-map.json
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(here, '../../data/sites/princess.com');
const read = async (f) => JSON.parse(await fs.readFile(path.join(siteDir, f), 'utf8'));
const shipsData = await read('ships.json');
const deckData = await read('deck-plans.json');
const dining = await read('dining.json');

// Real venue names, used when a ship page heading is a description ("A signature steakhouse at sea").
const knownVenues = [...new Set(dining.pages.map((p) => (p.h1 || '').replace(/\s+/g, ' ').trim())
  .filter((n) => n && n.length < 40 && !/^(a |our |discover|eats|whoops|all |personalized|24-hour|rail:)/i.test(n))),
  'Sterling Steakhouse'].sort((a, b) => b.length - a.length);

const norm = (s) => s.toLowerCase().replace(/[®™℠]/g, '').replace(/['’]s\b/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const SECTION = { 'dining options': 'Dining', 'activities entertainment': 'Activities & Entertainment', bars: 'Bars', wellness: 'Wellness', 'kids teens family': 'Kids & Family', 'ship highlights': 'Activities & Entertainment' };
const skip = /^(cruises? on|casual, specialty|(fun )?facts about|family$|casual dining$|book |take your journey|princess (premier|plus)|ticket booth|backstage|the promenade and more)/i;
// Newer ship pages (Sun, Star) use descriptive section headings, so sort them by keyword.
const sectionFor = (h2) => {
  const n = norm(h2).replace(/ and /g, ' ');
  if (SECTION[n]) return SECTION[n];
  if (/package|sanctuary|suite|stateroom|accommodation|cabana|plan a vacation|by the numbers|designed to shine/.test(n)) return null;
  if (/dining|restaurant|flavor|eats/.test(n)) return 'Dining';
  if (/\bbars?\b|sips|lounge/.test(n)) return 'Bars';
  if (/spa|wellness/.test(n)) return 'Wellness';
  if (/kids|family|teen/.test(n)) return 'Kids & Family';
  if (/activit|casino|sport|spellbound|show|arena|entertain/.test(n)) return 'Activities & Entertainment';
  return null;
};
// Venue names on the ship page that the deck plan calls something else.
const ALIAS = {
  'main dining room': /dining room/, 'vegas style casino': /casino/, 'our largest ever casino': /casino/, 'princess theater': /theat(er|re)/,
  'pools hot tubs': /pool/, 'world fresh marketplace': /horizon court|world fresh/, 'the eatery': /eatery|world fresh/,
  'just for kids 3 7': /treehouse|youth|kids|camp|pelican/, 'just for kids 8 12': /treehouse|youth|kids|camp|shipmates/,
  'just for teens 13 17': /teen|remix|beach house/, 'movies under the stars': /movies under the stars/, 'the lotus spa': /lotus spa/,
};
// Small spelling differences (the deck plan has "Makato Ocean" for "Makoto Ocean").
const close = (a, b) => {
  if (Math.abs(a.length - b.length) > 2 || a.length < 8) return false;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length] <= 2;
};

// Stateroom types by the cabin service's meta code.
const META = { I: 'Interior', O: 'Oceanview', B: 'Balcony', M: 'Mini-Suite', S: 'Suite' };

const ships = [];
for (const plan of deckData.ships) {
  const page = shipsData.pages.find((p) => new RegExp(`/ships/${plan.code.toLowerCase()}-`).test(p.url));
  // Venues: h3 items under each h2 section of the ship page.
  const venues = [];
  let section = null;
  for (const b of page?.blocks || []) {
    if (b.level === 2) { section = sectionFor(b.heading); continue; }
    if (b.level !== 3 || !section || skip.test(b.heading)) continue;
    let name = b.heading.replace(/[®™℠]/g, '').trim();
    if (/^(a|an|the ultimate|ultimate)\s/i.test(name) && !/ultimate balcony/i.test(name)) {
      // Compare without trademark symbols and with straight apostrophes ("Sabatini’s℠ Italian Trattoria").
      const plain = (s) => s.replace(/[®™℠]/g, '').replace(/[’‘]/g, "'");
      const hit = knownVenues.find((v) => plain(b.text).includes(plain(v)));
      if (hit) name = hit; else continue;
    }
    venues.push({ name, section, link: b.links?.[0]?.url || null });
  }
  // Facts from the "by numbers" block.
  const factsText = ((page?.blocks || []).find((b) => /^(Fun )?facts about/i.test(b.heading))?.text || '').replace(/:\s*/g, ': ');
  const fact = (label) => (factsText.match(new RegExp(`${label}:?\\s*([^A-Z]*?\\d[\\d,.]*[^A-Z]*?)(?=\\s[A-Z][a-z]+(\\s[A-Z][a-z]+)?:|\\s[A-Z][a-z]+\\s\\d|$)`)) || [])[1]?.trim() || null;
  const facts = {
    guests: fact('Guests'), crew: fact('Crew'), tonnage: fact('Tonnage'), guestCabins: fact('Guest Cabins'),
    decks: fact('Number of Decks'), length: fact('Length'), inaugural: (factsText.match(/Inaugural Cruise:?\s*([A-Z][a-z]+ \d{1,2}, \d{4}|\d{4})/) || [])[1] || null,
  };

  // Layouts: the current one first.
  const layouts = (plan.layouts || []).map((l) => {
    const rooms = l.decks.flatMap((d) => d.publicRooms.map((r) => ({ name: r.replace(/&amp;/g, '&').trim(), deck: d.number, deckName: d.name })));
    const byType = {};
    for (const d of l.decks) for (const c of d.cabins) {
      const meta = META[l.categories[c[1]]?.meta] || 'Other';
      const t = (byType[meta] ||= { cabins: 0, accessible: 0, minSqft: Infinity, maxSqft: 0, withBalcony: 0, categories: new Set() });
      t.cabins++; if (c[6]) t.accessible++; if (c[4] > 0) t.withBalcony++;
      if (c[3]) { t.minSqft = Math.min(t.minSqft, c[3]); t.maxSqft = Math.max(t.maxSqft, c[3]); }
      t.categories.add(l.categories[c[1]]?.name || c[1]);
    }
    for (const t of Object.values(byType)) { t.categories = [...t.categories].sort(); if (t.minSqft === Infinity) t.minSqft = null; }
    return { label: l.label, version: l.version, sailingFrom: l.sailingFrom || null, counts: l.counts, staterooms: byType, publicRooms: rooms };
  });
  const current = layouts[0];
  // Place each venue on a deck by matching its name to the deck plan's public rooms.
  // A venue can be on several decks (e.g. several dining rooms, pools).
  const rooms = current?.publicRooms || [];
  const words = (s) => norm(s).split(' ').filter((w) => w.length > 3 && !['princess', 'room', 'cafe', 'café'].includes(w));
  for (const v of venues) {
    const n = norm(v.name);
    let hits = rooms.filter((r) => norm(r.name) === n);
    if (!hits.length) hits = rooms.filter((r) => { const m = norm(r.name); return m.length > 3 && (m.includes(n) || n.includes(m)); });
    if (!hits.length) hits = rooms.filter((r) => close(norm(r.name), n));
    if (!hits.length && ALIAS[n]) hits = rooms.filter((r) => ALIAS[n].test(norm(r.name)));
    if (!hits.length) { const w = words(v.name); hits = rooms.filter((r) => { const m = words(r.name); return w.length && m.length && w.length >= 2 && w.filter((x) => m.includes(x)).length >= 2; }); }
    const decks = [...new Set(hits.map((r) => r.deck))].sort((a, b) => b - a);
    v.decks = decks;
    v.deckRooms = [...new Set(hits.map((r) => r.name))];
  }
  // What changes between layouts (public rooms added or removed, cabin count).
  const changes = layouts.slice(1).map((l, i) => {
    const prev = new Set(layouts[i].publicRooms.map((r) => r.name));
    const next = new Set(l.publicRooms.map((r) => r.name));
    return { from: layouts[i].label, to: l.label, cabins: l.counts.cabins - layouts[i].counts.cabins,
      roomsAdded: [...next].filter((r) => !prev.has(r)), roomsRemoved: [...prev].filter((r) => !next.has(r)) };
  });
  ships.push({ code: plan.code, name: plan.name, page: page?.url || null, deckPlan: plan.url, facts, venues, layouts, changes });
}

// Which ships have each venue.
const matrix = {};
for (const s of ships) for (const v of s.venues) {
  // Merge spelling variants: accents, "Wines"/"Wine", and a trailing "Bar" ("Crooners" = "Crooners Bar").
  const key = norm(v.name.normalize('NFD').replace(/[̀-ͯ]/g, '')).replace(/\bwines\b/g, 'wine').replace(/ bar$/, '');
  (matrix[key] ||= { name: v.name, section: v.section, ships: [] }).ships.push(s.code);
}
const venueIndex = Object.values(matrix).sort((a, b) => a.section.localeCompare(b.section) || b.ships.length - a.ships.length || a.name.localeCompare(b.name));

await fs.writeFile(path.join(siteDir, 'fleet-map.json'), JSON.stringify({ site: 'princess.com', builtAt: new Date().toISOString(), from: { ships: shipsData.crawledAt, deckPlans: deckData.crawledAt }, ships, venueIndex }, null, 1));
for (const s of ships) {
  const c = s.layouts[0]?.counts;
  const placed = s.venues.filter((v) => v.decks.length).length;
  console.log(`${s.code} ${s.name.padEnd(20)} ${String(s.venues.length).padStart(2)} venues (${placed} placed on a deck) · ${c?.cabins} cabins (page says ${s.facts.guestCabins}) · ${s.layouts.length} layout(s) · guests ${s.facts.guests}`);
}
console.log(`\n${venueIndex.length} distinct venues across ${ships.length} ships.`);
