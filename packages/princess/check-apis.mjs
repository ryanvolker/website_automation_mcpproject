// Health checks for the services princess.com depends on (see map-services.mjs).
//  1. Site basics and open content APIs: called directly and checked for status, speed and data.
//  2. Princess API gateway: it only answers the site's own pages, so it is checked by loading
//     real pages in a browser and verifying every gateway response those pages receive.
//  3. Third-party services: failures and slow responses seen during those page loads.
// Usage: node check-apis.mjs [--headed]
// Writes data/sites/princess.com/api-health.json. Read-only: GET requests and page views only.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(here, '../../data/sites/princess.com');
const BASE = 'https://www.princess.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const SLOW_MS = 1000; // warn above this
const TIMEOUT_MS = 5000; // fail above this
const today = new Date().toISOString().slice(0, 10);

const results = [];
const add = (r) => { results.push(r); console.log(`${r.result.toUpperCase().padEnd(5)} ${r.group.padEnd(18)} ${r.name}${r.note ? ' — ' + r.note : ''}`); };
const worst = (checks) => (checks.some((c) => c.level === 'fail' && !c.ok) ? 'fail' : checks.some((c) => !c.ok) ? 'warn' : 'pass');
const check = (name, ok, level = 'fail', note = '') => ({ name, ok: !!ok, level, note });
const items = (j, k) => j?.data?.[k]?.items?.length ?? 0;
const hasPlaceholder = (s) => /\{\{[^}]*\}\}|\blorem ipsum\b|\bundefined\b|\bNaN\b/i.exec(s)?.[0];
const vendor = (host) => {
  const pairs = [['gw.api.princess.com', 'Princess API gateway'], ['smetrics.princess.com', 'Adobe Analytics'], ['princess.com', 'Princess'],
    ['coveo', 'Coveo search'], ['swiftype', 'Swiftype search'], ['ada.support', 'Ada chat'], ['osano', 'Osano consent'],
    ['fullstory', 'FullStory'], ['dynatrace', 'Dynatrace'], ['optimizely', 'Optimizely'], ['adobedtm', 'Adobe Launch'],
    ['demdex', 'Adobe Audience Manager'], ['go-mpulse', 'Akamai mPulse'], ['akstat', 'Akamai mPulse'], ['typekit', 'Adobe Fonts'],
    ['doubleclick', 'Google Ads'], ['google', 'Google'], ['youtube', 'YouTube'], ['tiktok', 'TikTok'], ['pinterest', 'Pinterest'],
    ['pinimg', 'Pinterest'], ['facebook', 'Meta'], ['bing', 'Microsoft Ads'], ['linkedin', 'LinkedIn'], ['licdn', 'LinkedIn'],
    ['reddit', 'Reddit'], ['rlcdn', 'LiveRamp'], ['privacymanager', 'LiveRamp ATS'], ['attn.tv', 'Attentive'],
    ['attentivemobile', 'Attentive'], ['amazon-adsystem', 'Amazon Ads'], ['flashtalking', 'Flashtalking'], ['yahoo', 'Yahoo Ads'],
    ['yimg', 'Yahoo Ads'], ['cquotient', 'Salesforce Einstein'], ['sentry', 'Sentry'], ['uplift', 'Uplift'], ['takemobi', 'Mobi chat'],
    ['coherentpath', 'Coherent Path'], ['rmtag', 'Rakuten'], ['cloudflare', 'cdnjs'], ['mastercard', 'Mastercard gateway']];
  return pairs.find(([m]) => host.includes(m))?.[1] || host;
};

// ---------- 1. Direct checks ----------
async function getDirect(url, accept = 'application/json') {
  const t = Date.now();
  try {
    const r = await fetch(url, { headers: { 'user-agent': UA, accept }, signal: AbortSignal.timeout(30000) });
    const text = await r.text();
    return { status: r.status, ms: Date.now() - t, type: r.headers.get('content-type') || '', text };
  } catch (e) {
    return { status: null, ms: Date.now() - t, error: e.message, text: '' };
  }
}

async function direct(group, name, url, validate, accept) {
  const r = await getDirect(url, accept);
  const checks = [
    check('responds with 200', r.status === 200, 'fail', r.error || `HTTP ${r.status}`),
    check(`responds in under ${TIMEOUT_MS / 1000}s`, r.ms < TIMEOUT_MS, 'fail', `${r.ms} ms`),
    check(`responds in under ${SLOW_MS / 1000}s`, r.ms < SLOW_MS, 'warn', `${r.ms} ms`),
  ];
  let json = null;
  if (r.status === 200 && (!accept || accept === 'application/json')) {
    try { json = JSON.parse(r.text); checks.push(check('returns valid JSON', true)); } catch { checks.push(check('returns valid JSON', false)); }
  }
  if (r.status === 200 && validate) {
    try { checks.push(...validate(json ?? r.text, r.text)); } catch (e) { checks.push(check('data checks', false, 'fail', e.message)); }
  }
  const failed = checks.filter((c) => !c.ok);
  add({ group, name, endpoint: url, method: 'GET', httpStatus: r.status, ms: r.ms, bytes: r.text.length,
    result: worst(checks), checks, note: failed.map((c) => `${c.name}${c.note ? ` (${c.note})` : ''}`).join('; ') });
  await sleep(400);
  return json;
}

console.log('— Site basics and content APIs (direct) —');
await direct('Site basics', 'Home page', BASE + '/', (_, t) => [
  check('page has a title', /<title>[^<]{5,}<\/title>/i.test(t)),
], 'text/html');
const robots = await getDirect(BASE + '/robots.txt', 'text/plain');
await direct('Site basics', 'robots.txt', BASE + '/robots.txt', (_, t) => [check('lists a sitemap', /sitemap:/i.test(t), 'warn')], 'text/plain');
const sitemapUrl = (/sitemap:\s*(\S+)/i.exec(robots.text) || [])[1] || BASE + '/sitemap.xml';
await direct('Site basics', 'XML sitemap', sitemapUrl, (_, t) => [check('is an XML sitemap', /<(urlset|sitemapindex)/.test(t))], 'application/xml');

const GQL = BASE + '/graphql/execute.json/princess/';
await direct('Content API', 'Global header (navigation)', GQL + 'globalheader;market=en-us', (j, t) => [
  check('has header content', items(j, 'globalNavigationHeaderList') > 0),
  check('no placeholders or "undefined" in content', !hasPlaceholder(t), 'warn', hasPlaceholder(t) || ''),
]);
await direct('Content API', 'Global footer', GQL + 'globalfooter;market=en-us', (j, t) => [
  check('has footer content', items(j, 'globalNavigationFooterList') > 0),
  check('no placeholders or "undefined" in content', !hasPlaceholder(t), 'warn', hasPlaceholder(t) || ''),
]);
await direct('Content API', 'Master metadata', GQL + 'jsonbyid;id=master-meta-data', (j) => [check('has metadata', items(j, 'jsonList') > 0)]);
await direct('Content API', 'Special packages', GQL + 'masterdata-special-packages;market=en-us', (j) => [
  check('lists packages', items(j, 'masterDataSsvSpecialMainList') > 0)]);
for (const code of ['JNU', 'KTN', 'SIT', 'FLL', 'BCN']) {
  await direct('Content API', `Port data: ${code}`, GQL + `master-data-itinerary-ports;portCode=${code}`, (j) => [
    check('returns the port', items(j, 'masterDataItineraryPortList') > 0, 'warn', 'no port record')]);
}
const STATIC = BASE + '/static/html/global/book/json/';
await direct('Content API', 'Sale names', STATIC + 'sale-names.json', (j) => {
  const sales = j.sales || [];
  const now = Date.now();
  const expired = sales.filter((s) => s.endDate && Date.parse(s.endDate.replace(' ', 'T')) < now);
  const missing = sales.filter((s) => !s.code || !s.name);
  const badDates = sales.filter((s) => s.startDate && s.endDate && s.startDate > s.endDate);
  return [
    check('lists sales', sales.length > 0, 'fail', `${sales.length} sales`),
    check('every sale has a code and name', !missing.length, 'warn', missing.map((s) => s.id).join(', ')),
    check('no expired sales still listed', !expired.length, 'warn',
      `${expired.length} expired: ${expired.slice(0, 10).map((s) => `${s.name} (${s.id}, ended ${s.endDate.slice(0, 10)})`).join('; ')}`),
    check('start dates before end dates', !badDates.length, 'warn', badDates.map((s) => s.id).join(', ')),
  ];
});
await direct('Content API', 'Sale banners', STATIC + 'sale-banners.json', (j) => [
  check('lists banners', (j.sales || []).length > 0),
  check('every shown filter has a name', (j.sales || []).every((s) => !s.showFilter || s.filterName), 'warn',
    (j.sales || []).filter((s) => s.showFilter && !s.filterName).map((s) => s.id).join(', ')),
]);
await direct('Content API', 'Hero promotion', `${BASE}/bin/princess/hero-promotion.json?v=${today}&market=en-us`, (j) => [
  check('has the expected fields', 'found' in j && Array.isArray(j.urls))]);
await direct('Content API', 'Free 3rd & 4th guest voyages', `${BASE}/content/dam/princess/target/promo/free-3rd-4th-voyages.json?v=${today}`, (j) => {
  const vals = Object.values(j);
  return [check('lists voyages', vals.length > 0, 'fail', `${vals.length} voyages`),
    check('every voyage has numeric category values', vals.every((v) => v && Object.values(v).every((n) => typeof n === 'number')), 'warn')];
});
await direct('Third-party config', 'Swiftype site search config', 'https://s.swiftypecdn.com/install/v2/config/YUBJbxt5D9bRzdbcLiFr.json');
await direct('Third-party config', 'Ada chat config', 'https://rollout.ada.support/princesscruises-gr/client.json');

// ---------- 2 & 3. Page journeys ----------
// Each journey loads a page as a visitor and checks the data calls it makes.
// expect: [label, url regex, validator(json) -> checks]
const JOURNEYS = [
  { name: 'Home page', url: '/', expect: [
    ['Visitor locale', /\/guest\/p1\.0\/locale/, (j) => [check('returns a country', j?.locale?.country)]],
    ['Deals', /\/resdb\/p1\.0\/deals\?/, (j) => [check('returns products', Array.isArray(j?.products), 'fail')]],
    ['Ports list', /\/resdb\/p1\.0\/ports$/, (j) => [check('lists 100+ ports', (j?.ports?.length || 0) >= 100, 'fail', `${j?.ports?.length} ports`)]],
    ['Cruise products', /\/resdb\/p1\.0\/products\?/, (j) => [check('lists 100+ cruises', (j?.products?.length || 0) >= 100, 'fail', `${j?.products?.length} products`)]],
    ['Destinations (trades)', /\/resdb\/p1\.0\/trades/, (j) => [check('lists 5+ destinations', (j?.trades?.length || 0) >= 5, 'fail', `${j?.trades?.length}`)]],
    ['Coveo search', /coveo\.com\/rest\/search\/v2/, (j) => [check('search answers', typeof j?.totalCount === 'number')]],
  ] },
  { name: 'Cruise search results', url: '/cruise-search/results/', waitFor: 'a[href*="voyageCode="]', findDetail: true, expect: [
    ['Cruise products', /\/resdb\/p1\.0\/products\?/, (j) => [check('lists 100+ cruises', (j?.products?.length || 0) >= 100, 'fail', `${j?.products?.length}`)]],
    ['Ships list', /\/resdb\/p1\.0\/ships$/, (j) => [check('lists 10+ ships', (j?.ships?.length || 0) >= 10, 'fail', `${j?.ships?.length} ships`)]],
    ['Cabin types (metas)', /\/resdb\/p1\.0\/metas$/, (j) => [check('lists cabin types', (j?.metas?.length || 0) >= 3)]],
    ['Home cities', /\/resdb\/p1\.0\/cities$/, (j) => [check('lists cities', (j?.cities?.length || 0) > 10)]],
    ['Sub-destinations', /\/resdb\/p1\.0\/subtrades$/, (j) => [check('lists sub-destinations', (j?.subtrades?.length || 0) > 10)]],
    ['Sales (promos)', /\/resdb\/p1\.0\/promos\/sales/, (j) => [check('lists sales', (j?.sales?.length || 0) > 0)]],
    ['Live pricing', /\/pricing\/v1\/cruises/, (j) => pricingChecks(j)],
    ['Booking engine settings', /\/ube\/p1\.0\/ube/, (j) => [check('returns settings', j?.ube?.settings)]],
  ] },
  { name: 'Cruise details', url: null, expect: [] },
  { name: 'Deals page', url: '/cruise-deals-promotions', expect: [
    ['Deals', /\/resdb\/p1\.0\/deals\?/, (j) => [check('returns products', Array.isArray(j?.products))]]] },
  { name: 'Alaska destination', url: '/cruise-destinations/alaska-cruises', expect: [
    ['Live pricing', /\/pricing\/v1\/cruises/, (j) => pricingChecks(j)],
    ['Deals', /\/resdb\/p1\.0\/deals\?/, (j) => [check('returns products', Array.isArray(j?.products))]]] },
  { name: 'Juneau shore excursions', url: '/shore-excursions/juneau-alaska', visible: 'excursions', expect: [
    ['Port data (content API)', /master-data-itinerary-ports/, (j) => [check('returns the port', items(j, 'masterDataItineraryPortList') > 0)]]] },
  { name: 'Ship: Sapphire Princess', url: '/ships-and-experience/ships/sa-sapphire-princess', expect: [] },
  { name: 'Planning FAQ', url: '/faq', expect: [['Ada chat', /ada\.support\/.*client\.json/, null]] },
  { name: 'Blog', url: '/blog', expect: [
    ['Coveo search', /coveo\.com\/rest\/search\/v2/, (j) => [check('returns articles', (j?.totalCount || 0) > 0, 'fail', `${j?.totalCount} results`)]]] },
];

function pricingChecks(j) {
  const cruises = (j?.products || []).flatMap((p) => p.cruises || []);
  const prices = cruises.flatMap((c) => (c.pricing?.fares || []).flatMap((f) => (f.categories || []).map((cat) => cat.averageGuestPrice ?? cat.guests?.[0]?.fare)));
  const bad = prices.filter((p) => typeof p !== 'number' || !(p > 0));
  return [check('returns cruises', cruises.length > 0, 'fail', `${cruises.length} cruises`),
    check('every fare has a price above $0', prices.length && !bad.length, 'fail', `${bad.length} of ${prices.length} fares missing or zero`)];
}

const browser = await chromium.launch({ headless: !process.argv.includes('--headed') });
const context = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 }, locale: 'en-US' });
const calls = []; // every data call seen, for the endpoint table
const vendors = new Map();
let detailUrl = null;
const allJsErrors = new Map(); // message -> pages

console.log('\n— Page journeys (browser) —');
for (const j of JOURNEYS) {
  const url = j.url ? BASE + j.url : detailUrl;
  if (!url) { add({ group: 'Page journey', name: j.name, result: 'fail', checks: [], note: 'no cruise found to open' }); continue; }
  const page = await context.newPage();
  const seen = [];
  const pending = [];
  page.on('response', (res) => pending.push((async () => {
    const req = res.request();
    const u = res.url();
    if (!/^https?:/.test(u)) return;
    const host = new URL(u).host;
    // Some responses stream and never finish, so don't wait more than 10 seconds.
    await Promise.race([res.finished().catch(() => {}), sleep(10000)]);
    const t = req.timing();
    const rec = { url: u, host, method: req.method(), type: req.resourceType(), status: res.status(), ms: t.responseEnd > 0 ? Math.round(t.responseEnd) : null };
    if ((rec.type === 'xhr' || rec.type === 'fetch') && /json/.test(res.headers()['content-type'] || '')) {
      rec.json = await res.json().catch(() => undefined);
    }
    seen.push(rec);
  })()));
  page.on('requestfailed', (req) => {
    const u = req.url();
    if (!/^https?:/.test(u)) return;
    const err = req.failure()?.errorText || 'failed';
    // Videos and beacons are cut off when the page closes; that is not a service failure.
    if (err === 'net::ERR_ABORTED') return;
    seen.push({ url: u, host: new URL(u).host, method: req.method(), type: req.resourceType(), status: null, error: err });
  });
  const jsErrors = [];
  page.on('pageerror', (e) => {
    const at = (/https?:\/\/[^\s)]+/.exec(e.stack || '')?.[0] || 'unknown script').split('?')[0].replace(/^https?:\/\//, '');
    jsErrors.push(`${e.message.slice(0, 120)} (in ${at.slice(0, 80)})`);
  });
  const t0 = Date.now();
  let status = null;
  try {
    const r = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    status = r?.status() ?? null;
    await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
    if (j.waitFor) await page.waitForSelector(j.waitFor, { timeout: 25000 }).catch(() => {});
    for (let y = 0; y < 5; y++) { await page.mouse.wheel(0, 1200); await sleep(600); }
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await sleep(2000);
  } catch (e) { jsErrors.push('navigation: ' + e.message.slice(0, 160)); }
  // Browser's own timing: when the page became usable and when it finished loading.
  const nav = await page.evaluate(() => {
    const n = performance.getEntriesByType('navigation')[0];
    return n ? { dcl: Math.round(n.domContentLoadedEventEnd), load: Math.round(n.loadEventEnd) } : null;
  }).catch(() => null);
  const loadMs = nav?.load || Date.now() - t0;
  const text = await page.evaluate(() => document.body?.innerText || '').catch(() => '');
  if (j.findDetail) detailUrl = await page.$$eval('a[href*="voyageCode="]', (as) => as[0]?.href?.split('#')[0] || null).catch(() => null);
  await Promise.race([Promise.all(pending), sleep(20000)]);
  await page.close();

  const checks = [
    check('page returns 200', status === 200, 'fail', `HTTP ${status}`),
    check('page loads in under 8s', loadMs < 8000, 'warn',
      `loaded in ${(loadMs / 1000).toFixed(1)}s, usable at ${((nav?.dcl || 0) / 1000).toFixed(1)}s`),
  ];
  const ph = /\{\{[^}]*\}\}|\$\s?(undefined|NaN)/.exec(text)?.[0];
  checks.push(check('no template placeholders on the page', !ph, 'fail', ph || ''));
  if (j.name === 'Cruise search results' || j.name === 'Cruise details') {
    checks.push(check('shows prices', /\$\s?\d/.test(text), 'fail'));
  }
  if (j.visible === 'excursions') checks.push(check('lists excursions', /excursion/i.test(text) && /\$\s?\d/.test(text), 'warn'));

  for (const [label, re, validate] of j.expect) {
    const hits = seen.filter((s) => re.test(s.url));
    if (!hits.length) { checks.push(check(`${label}: call made`, false, 'fail', 'the page never requested it')); continue; }
    const badHits = hits.filter((h) => !h.status || h.status >= 400);
    checks.push(check(`${label}: responds OK`, !badHits.length, 'fail', badHits.map((h) => h.status || h.error).join(', ')));
    const okJson = hits.find((h) => h.json !== undefined);
    if (validate && okJson) checks.push(...validate(okJson.json).map((c) => ({ ...c, name: `${label}: ${c.name}` })));
  }
  // Any gateway call that failed, even ones we didn't list
  const gwBad = seen.filter((s) => s.host === 'gw.api.princess.com' && (!s.status || s.status >= 400));
  checks.push(check('all API gateway calls succeed', !gwBad.length, 'fail', gwBad.map((s) => `${s.status || s.error} ${new URL(s.url).pathname}`).join('; ')));
  const fpBad = seen.filter((s) => s.host.endsWith('princess.com') && s.host !== 'gw.api.princess.com' && (!s.status || s.status >= 400));
  checks.push(check('all Princess files and calls load', !fpBad.length, 'warn',
    fpBad.slice(0, 5).map((s) => `${s.status || s.error} ${s.type} ${s.url.slice(0, 140)}`).join('; ')));
  const tpBad = seen.filter((s) => !s.host.endsWith('princess.com') && (!s.status || s.status >= 400));
  checks.push(check('third-party services respond', !tpBad.length, 'warn',
    [...new Set(tpBad.map((s) => `${vendor(s.host)} (${s.status || s.error})`))].join('; ')));
  // JavaScript errors are reported once for the whole site, after all journeys.
  for (const e of jsErrors) { if (!allJsErrors.has(e)) allJsErrors.set(e, new Set()); allJsErrors.get(e).add(j.name); }

  const failed = checks.filter((c) => !c.ok);
  add({ group: 'Page journey', name: j.name, endpoint: url, httpStatus: status, ms: loadMs, dclMs: nav?.dcl, requests: seen.length,
    result: worst(checks), checks, note: failed.map((c) => `${c.name}${c.note ? ` (${c.note})` : ''}`).join('; ') });

  for (const s of seen) {
    const v = vendor(s.host);
    if (!vendors.has(v)) vendors.set(v, { vendor: v, hosts: new Set(), requests: 0, failed: 0, ms: [], errors: new Set() });
    const e = vendors.get(v);
    e.hosts.add(s.host); e.requests++; if (s.ms) e.ms.push(s.ms);
    if (!s.status || s.status >= 400) { e.failed++; e.errors.add(`${s.status || s.error} ${s.type}`); }
    if (s.type === 'xhr' || s.type === 'fetch') calls.push({ journey: j.name, ...s, json: undefined });
  }
  await sleep(3000);
}
await browser.close();
{
  const checks = [...allJsErrors].map(([msg, pages]) => check(`JavaScript error on ${pages.size} of ${JOURNEYS.length} pages`, false, 'warn', msg));
  if (!checks.length) checks.push(check('no JavaScript errors on any page', true));
  add({ group: 'Page journey', name: 'JavaScript errors (all pages)', result: worst(checks), checks,
    note: checks.filter((c) => !c.ok).map((c) => `${c.name}: ${c.note}`).join('; ') });
}

// ---------- Endpoint table ----------
const median = (a) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : null);
const maxOf = (a) => (a.length ? Math.max(...a) : null);
const epKey = (c) => {
  const x = new URL(c.url);
  return `${c.method} ${x.host}${x.pathname.replace(/\/\d+(?=\/|$)/g, '/:id').replace(/[0-9a-f]{20,}/gi, ':id')}`;
};
const eps = new Map();
for (const c of calls) {
  if (/gtmfp|\/b\/ss\/|\/collect|nwnW6eHY5_/.test(c.url)) continue; // analytics beacons and bot sensor
  const k = epKey(c);
  if (!eps.has(k)) eps.set(k, { endpoint: k, vendor: vendor(c.host), calls: 0, statuses: {}, ms: [], journeys: new Set() });
  const e = eps.get(k);
  e.calls++; e.statuses[c.status || c.error] = (e.statuses[c.status || c.error] || 0) + 1;
  if (c.ms) e.ms.push(c.ms); e.journeys.add(c.journey);
}
const endpoints = [...eps.values()].map((e) => ({ ...e, journeys: [...e.journeys], medianMs: median(e.ms), maxMs: maxOf(e.ms), ms: undefined,
  ok: Object.keys(e.statuses).every((s) => Number(s) >= 200 && Number(s) < 400) }))
  .sort((a, b) => (a.vendor === 'Princess API gateway' ? -1 : 0) - (b.vendor === 'Princess API gateway' ? -1 : 0) || a.endpoint.localeCompare(b.endpoint));
const thirdParty = [...vendors.values()].map((v) => ({ ...v, hosts: [...v.hosts], errors: [...v.errors], medianMs: median(v.ms), maxMs: maxOf(v.ms), ms: undefined }))
  .sort((a, b) => b.failed - a.failed || b.requests - a.requests);

const summary = { pass: 0, warn: 0, fail: 0 };
results.forEach((r) => summary[r.result]++);
const out = { checkedAt: new Date().toISOString(), summary, results, endpoints, vendors: thirdParty };
await fs.writeFile(path.join(siteDir, 'api-health.json'), JSON.stringify(out, null, 2));
console.log(`\n${summary.pass} pass, ${summary.warn} warn, ${summary.fail} fail · ${endpoints.length} endpoints · ${thirdParty.length} services`);
