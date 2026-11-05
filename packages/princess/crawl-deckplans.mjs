// Maps the deck plans of every Princess ship: decks, public rooms on each deck, stateroom categories,
// and every cabin with its size, balcony, berths, location and accessibility.
// Some ships have two layouts (for example before and after a refit). The deck plan page then asks
// "when do you plan to sail?"; we choose each option and map every layout.
// Usage: node crawl-deckplans.mjs [--ships SA,YP]   → writes data/sites/princess.com/deck-plans.json
// Read-only and polite: one ship at a time, about 1 second between deck requests.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(here, '../../data/sites/princess.com');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const BASE = 'https://www.princess.com';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const argv = process.argv.slice(2);

// The fleet comes from the ship pages we already crawled (slug "sa-sapphire-princess" → code SA).
const ships = JSON.parse(await fs.readFile(path.join(siteDir, 'ships.json'), 'utf8')).pages
  .map((p) => new URL(p.url).pathname.match(/\/ships\/([a-z]{2})-([a-z-]+)$/))
  .filter(Boolean)
  .map((m) => ({ code: m[1].toUpperCase(), name: m[2].split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ') }));
const only = argv.includes('--ships') ? argv[argv.indexOf('--ships') + 1].toUpperCase().split(',') : null;
const fleet = only ? ships.filter((s) => only.includes(s.code)) : ships;

const attr = (s, n) => (s.match(new RegExp(`${n}="([^"]*)"`)) || [])[1] ?? '';
// Parse a ship's deck file: <Deck name number> holding <PublicRoom name>, <Category code stateRoomType metaName>
// and (older ships only) <cabin cabin_no="L244">BC</cabin> tagged with their category code.
function parseDeckXml(xml) {
  const decks = [];
  for (const m of xml.matchAll(/<Deck\b([^>]*)>([\s\S]*?)<\/Deck>/g)) {
    const body = m[2];
    const byCat = {};
    for (const c of body.matchAll(/<cabin\b[^>]*cabin_no="([^"]+)"[^>]*>([^<]*)<\/cabin>/g)) (byCat[c[2].trim()] ||= []).push(c[1]);
    decks.push({
      number: Number(attr(m[1], 'number')),
      name: attr(m[1], 'name'),
      publicRooms: [...body.matchAll(/<PublicRoom\b([^>]*)\/?>/g)].map((r) => attr(r[1], 'name')).filter(Boolean),
      categories: [...body.matchAll(/<Category\b([^>]*)>/g)].map((c) => ({
        code: attr(c[1], 'code'), type: attr(c[1], 'stateRoomType'), meta: attr(c[1], 'metaName'), cabins: byCat[attr(c[1], 'code')] || [],
      })),
    });
  }
  return decks;
}

// Map one layout: read its deck file, then ask the cabin service about every deck
// (newer ships list cabins only in the cabin service, not in the deck file).
async function mapLayout(ship, xmlUrl, label, referer) {
  const version = Number((xmlUrl.match(/\/v(\d+)\//) || [])[1] ?? 0);
  const xml = await (await fetch(xmlUrl, { headers: { 'user-agent': UA } })).text();
  const decks = parseDeckXml(xml);
  const categories = {};
  for (const deck of decks) {
    const url = `${BASE}/getDeckJSON.do?&shipCode=${ship.code}&version=${version}&deck=${deck.number}`;
    const r = await fetch(url, { headers: { 'user-agent': UA, 'X-Requested-With': 'XMLHttpRequest', referer } }).catch(() => null);
    const body = r?.ok ? await r.json().catch(() => null) : null;
    deck.detailStatus = r?.status ?? 'error';
    // Compact cabin rows: [number, category, zone, sq ft, balcony sq ft, berths, wheelchair, connecting, notes]
    deck.cabins = (body?.cabins || []).map((c) => {
      if (!categories[c.categoryCode]) {
        categories[c.categoryCode] = { name: c.cmsCategoryName || c.category?.name || '', meta: c.metaCode, description: c.cmsCategoryShortDescription || c.category?.description || '' };
      }
      const connecting = (c.connectingRoom || '').trim().split(/\s+/).filter((x) => x && x !== c.number).join(' ');
      return [c.number, c.categoryCode, c.zoneName || '', c.areaInSqft || null, c.balconyAreaInSqft || 0, c.numberOfBerths || null,
        !!c.wheelchairAccessible, connecting, (c.specialNotes || []).join('; ')];
    });
    await sleep(1000);
  }
  const counts = {
    decks: decks.length,
    publicRooms: decks.reduce((n, d) => n + d.publicRooms.length, 0),
    categories: Object.keys(categories).length,
    cabins: decks.reduce((n, d) => n + d.cabins.length, 0),
    wheelchairCabins: decks.reduce((n, d) => n + d.cabins.filter((c) => c[6]).length, 0),
  };
  return { label, version, dataFile: xmlUrl, counts, categories, decks };
}

const browser = await chromium.launch();
const context = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 }, locale: 'en-US' });

// Open a deck plan page; optionally click a choice first. Returns the deck file the page loads and its text.
async function openPlan(url, choice) {
  const page = await context.newPage();
  let xmlUrl = null;
  page.on('response', (r) => { if (r.status() === 200 && /_deck\.xml/.test(r.url())) xmlUrl = r.url().split('?')[0]; });
  const r = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  if (choice) await page.getByText(choice, { exact: true }).first().click({ timeout: 10000 }).catch(() => {});
  for (let i = 0; i < (choice ? 30 : 10) && !xmlUrl; i++) await sleep(500);
  const title = (await page.locator('h1, h2').first().innerText().catch(() => '')).trim();
  const text = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ');
  // Ships with two layouts show "when do you plan to sail?" links: <a class="date-button" data-version="3">.
  const choices = xmlUrl ? [] : await page.$$eval('a.date-button[data-version]', (as) => as.map((a) => ({
    label: a.textContent.replace(/\s+/g, ' ').trim(), version: Number(a.dataset.version), from: a.dataset.dateFormat || '',
  }))).catch(() => []);
  await page.close();
  return { status: r?.status() ?? null, title, text, xmlUrl, choices };
}
const deckFile = (code, v) => `${BASE}/static/learn/ships/${code.toLowerCase()}/deck_plans/v${v}/${code.toLowerCase()}_deck.xml`;

const started = Date.now();
const out = [];
for (const ship of fleet) {
  const rec = { code: ship.code, name: ship.name, url: `${BASE}/deckPlans.do?shipCode=${ship.code}` };
  try {
    let first = await openPlan(rec.url);
    // "Service temporarily unavailable" is often momentary: try once more after a pause.
    if (!first.xmlUrl && !first.choices.length) { await sleep(8000); first = await openPlan(rec.url); rec.retried = true; }
    Object.assign(rec, { status: first.status, title: first.title, chooser: first.choices.length > 0 });
    let found = [];
    if (first.xmlUrl) found = [{ label: 'Current', xmlUrl: first.xmlUrl }];
    for (const c of first.choices) found.push({ label: c.label, xmlUrl: deckFile(ship.code, c.version), sailingFrom: c.from });
    if (!found.length) { rec.pageError = first.text.slice(0, 200); throw new Error(`deck plan did not load: ${rec.pageError}`); }
    rec.layouts = [];
    for (const l of found) {
      if (!l.xmlUrl) { rec.layouts.push({ label: l.label, error: 'deck plan did not load after choosing this option' }); continue; }
      rec.layouts.push({ ...(await mapLayout(ship, l.xmlUrl, l.label, rec.url)), ...(l.sailingFrom ? { sailingFrom: l.sailingFrom } : {}) });
    }
    for (const l of rec.layouts) {
      const c = l.counts;
      const line = c
        ? `v${l.version} ${String(c.decks).padStart(2)} decks, ${String(c.publicRooms).padStart(3)} public rooms, ${String(c.categories).padStart(2)} categories, ${String(c.cabins).padStart(4)} cabins, ${c.wheelchairCabins} accessible`
        : `ERROR ${l.error}`;
      console.log(`${ship.code} ${ship.name.padEnd(20)} ${l.label.slice(0, 44).padEnd(44)} ${line}`);
    }
  } catch (e) {
    rec.error = e.message.slice(0, 220);
    console.log(`${ship.code} ${ship.name} ERROR ${rec.error}`);
  }
  out.push(rec);
  await sleep(2000);
}
await browser.close();

const result = {
  site: 'princess.com', kind: 'deck-plans', crawledAt: new Date().toISOString(),
  cabinFields: ['number', 'category', 'zone', 'sqft', 'balconySqft', 'berths', 'wheelchair', 'connecting', 'notes'],
  ships: out,
};
if (only) {
  const prev = JSON.parse(await fs.readFile(path.join(siteDir, 'deck-plans.json'), 'utf8').catch(() => 'null'));
  if (prev) result.ships = [...prev.ships.filter((s) => !only.includes(s.code)), ...out];
}
await fs.writeFile(path.join(siteDir, 'deck-plans.json'), JSON.stringify(result));
console.log(`\nDone in ${((Date.now() - started) / 60000).toFixed(1)} min: ${out.filter((s) => !s.error).length}/${out.length} ships mapped.`);
