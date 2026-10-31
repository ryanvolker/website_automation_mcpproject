// Turns the raw home page capture (home.raw.json) into a clean, organized
// map (home.json) that skills and scripts can look things up in.
//
// Usage: node build-home-map.mjs

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dir = path.resolve(here, '../../data/sites/princess.com');
const raw = JSON.parse(await fs.readFile(path.join(dir, 'home.raw.json'), 'utf8'));

const BASE = 'https://www.princess.com';
const SEARCH = `${BASE}/cruise-search/results/`;
const field = (id) => raw.fields.find((f) => f.id === id);
const opts = (id) => field(id).options.filter((o) => o.value);
const params = (href) => {
  try {
    const u = new URL(href);
    return u.pathname.startsWith('/cruise-search/results') ? Object.fromEntries(u.searchParams) : undefined;
  } catch {
    return undefined;
  }
};
const uniqBy = (arr, key) => [...new Map(arr.map((x) => [key(x), x])).values()];

// ---- Main navigation: rebuild menu > group > links from the flat link list ----
// Group headers are links with href "#". Each belongs to one of the four menus.
const GROUP_MENU = {
  'Cruise Destinations': 'Destinations',
  'Cruise Types': 'Destinations',
  'Shore Excursions': 'Destinations',
  Ships: 'Explore Ships',
  Staterooms: 'Explore Ships',
  'Onboard Experience': 'Explore Ships',
  'About Cruising': 'Discover Princess',
  'Cruise Essentials': 'Discover Princess',
  'Why Princess': 'Discover Princess',
  'Cruise Deals': 'Deals',
  Packages: 'Deals',
  Loyalty: 'Deals',
};
const mainNav = raw.navs.find((n) => n.label === 'Main navigation').links;
const start = mainNav.findIndex((l) => l.text === 'FIND A CRUISE') + 1;
const menus = { Destinations: [], 'Explore Ships': [], 'Discover Princess': [], Deals: [] };
let group = null;
for (const l of mainNav.slice(start)) {
  if (l.href.endsWith('#')) {
    if (GROUP_MENU[l.text]) {
      group = { name: l.text, links: [] };
      menus[GROUP_MENU[l.text]].push(group);
    } else if (group) {
      // A nested sub-menu such as Asia / Europe inside "Cruise Destinations".
      group.links.push({ text: `${l.text} (sub-menu)`, url: null });
    }
    continue;
  }
  if (group) group.links.push({ text: l.text, url: l.href });
}

// ---- Search form ----
const searchForm = {
  description:
    'The "Find a cruise" box under the hero banner. Choosing options updates the SEARCH CRUISES link href; clicking it opens the results page.',
  fields: [
    { key: 'destination', label: 'Cruising to', selector: '#destination-select', urlParam: 'trade', options: opts('destination-select').map((o) => ({ code: o.value, name: o.text })) },
    { key: 'port', label: 'Departing from', selector: '#port-select', urlParam: 'startPort', options: opts('port-select').map((o) => ({ code: o.value, name: o.text })) },
    { key: 'month', label: 'Leaving', selector: '#date-select', urlParam: 'date', format: 'MMYY', options: opts('date-select').map((o) => ({ code: o.value, name: o.text })) },
  ],
  submit: { text: 'SEARCH CRUISES', locator: "getByRole('link', { name: 'SEARCH CRUISES' })" },
  example: {
    choose: { destination: 'Alaska', port: 'Seattle, Washington', month: 'June 2027' },
    resultUrl: `${SEARCH}?trade=A&date=0627&startPort=SEA`,
  },
};

// ---- Destinations: search code + landing page ----
const footer = raw.navs.find((n) => n.label !== 'Main navigation').links;
const destPages = footer.filter((l) => l.href.includes('/cruise-destinations/'));
const DEST_PAGE_OVERRIDES = {
  'California Coast': '/cruise-destinations/california-coast-cruises',
  TransAtlantics: '/cruise-destinations/european-cruises/transatlantic',
};
const firstWord = (s) => s.split(/[ &]/)[0];
const destinations = searchForm.fields[0].options.map(({ code, name }) => {
  const page = DEST_PAGE_OVERRIDES[name]
    ? BASE + DEST_PAGE_OVERRIDES[name]
    : destPages.find((l) => l.text === name || firstWord(l.text) === firstWord(name))?.href ?? null;
  return { name, code, page, searchUrl: `${SEARCH}?trade=${code}` };
});

// ---- Ships (code = first two letters of the ship page slug) ----
const ships = uniqBy(
  mainNav
    .filter((l) => /\/ships\/[a-z]{2}-/.test(l.href))
    .map((l) => {
      const slug = l.href.split('/ships/')[1];
      const code = slug.slice(0, 2).toUpperCase();
      const name = slug.slice(3).split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
      return { name, code, page: l.href, searchUrl: `${SEARCH}?ship=${code}` };
    }),
  (s) => s.code,
).sort((a, b) => a.name.localeCompare(b.name));

// ---- Home page cards (deals, featured ports, featured ship sailings) ----
const bodyLinks = uniqBy(
  raw.links.filter((l) => l.visible && l.context && !/^(header|nav|footer|form)/.test(l.region || '')),
  (l) => l.href,
);
const card = (l) => ({ text: l.context, linkText: l.text, url: l.href, searchParams: params(l.href) });
const homeDeals = bodyLinks.filter((l) => /promos=|voyages=|cruise-deals-promotions/.test(l.href)).map(card);
const featuredPorts = bodyLinks.filter((l) => /[?&](startPort|port)=/.test(l.href)).map(card);
const featuredShipSailings = bodyLinks.filter((l) => /[?&]ship=/.test(l.href)).map(card);
const dealPages = menus.Deals.find((g) => g.name === 'Cruise Deals')?.links ?? [];

// ---- Other interactions ----
const interactions = [
  { name: 'Find a cruise (search form)', how: 'Pick destination/port/month in the three dropdowns, click SEARCH CRUISES', see: 'searchForm' },
  { name: 'FIND A CRUISE button (header)', how: 'Opens a search for all cruises', url: mainNav.find((l) => l.text === 'FIND A CRUISE')?.href },
  { name: 'Main menus', how: "Click a menu button, e.g. getByRole('button', { name: 'Deals' }), to open its mega-menu", see: 'navigation.menus' },
  { name: 'Site search', how: "Click getByRole('button', { name: 'Search' }), then type in #st-overlay-search-input" },
  { name: 'Manage booking', how: "Click getByRole('button', { name: 'Manage booking' }) for check-in, payments, excursions", url: 'https://book.princess.com/manage-booking/index.page' },
  { name: 'Log in', url: `${BASE}/my-princess/login/` },
  { name: 'Create account', url: `${BASE}/my-princess/register/` },
  { name: 'Email sign-up form', how: 'Fields #sign-up-form-email, #sign-up-firstName, #sign-up-lastName, then SIGN UP', note: 'Submits real data. Do not submit in automation without permission.' },
  { name: 'Phone', value: '1-800-774-6237' },
  { name: 'Cookie banner', how: "Close with getByRole('button', { name: 'Close Cookie Banner' })" },
];

const map = {
  site: 'princess.com',
  page: 'home',
  url: raw.url,
  title: raw.title,
  capturedAt: raw.capturedAt,
  note: 'Deals, prices and featured items change often. Run "npm run map:home -w @wa/princess" to refresh.',
  searchUrl: {
    base: SEARCH,
    params: {
      trade: 'Destination code, e.g. A=Alaska, C=Caribbean (see destinations). Comma-separate for several.',
      subTrade: 'Sub-region code, e.g. EM (seen on a Mediterranean ship card)',
      startPort: 'Departure port code, e.g. SEA, FLL (see ports)',
      port: 'Port code used by some home page cards, e.g. LAX, MIA',
      date: 'Departure month(s) as MMYY, comma-separated, e.g. 0627 = June 2027',
      ship: 'Two-letter ship code, e.g. RP = Royal Princess (see ships)',
      duration: 'Length in days as min_max, e.g. 7_7, 9_12',
      promos: 'Promotion code, e.g. 2GD (flash sale), RG1 (last minute), KHS (2028 early booking)',
      voyages: 'Comma-separated voyage codes (used by curated deal lists)',
      resType: 'C = cruises only',
      mrch: 'Merchandising flag added by home page cards (safe to omit)',
    },
    detailsPage: `${BASE}/cruise-search/details/?voyageCode=<code>`,
  },
  searchForm,
  destinations,
  ports: searchForm.fields[1].options,
  ships,
  deals: { pages: dealPages, onHomePage: homeDeals },
  featured: { ports: featuredPorts, shipSailings: featuredShipSailings },
  navigation: { menus },
  interactions,
  headings: raw.headings
    .map((h) => ({ level: h.level, text: h.text }))
    .filter((h, i, a) => a.findIndex((x) => x.text === h.text) === i),
};

await fs.writeFile(path.join(dir, 'home.json'), JSON.stringify(map, null, 2) + '\n');
console.log(`Wrote ${path.join(dir, 'home.json')}`);
console.log(
  `  ${destinations.length} destinations, ${map.ports.length} ports, ${ships.length} ships, ` +
    `${dealPages.length} deal pages, ${homeDeals.length} home page deals`,
);
