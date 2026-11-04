// Maps the services princess.com depends on by recording every request the browser makes
// while it loads a set of key pages, the way an anonymous visitor would.
// Usage: node map-services.mjs [--headed]
// Writes data/sites/princess.com/services.json. Read-only: no logins, no forms, no bookings.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(here, '../../data/sites/princess.com');
const BASE = 'https://www.princess.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Pages that cover each main part of the site. Cruise details is found from the search results.
const PAGES = [
  ['Home', '/'],
  ['Destination region', '/cruise-destinations/alaska-cruises'],
  ['Destination port', '/cruise-destinations/alaska-cruises/cruises-to-sitka'],
  ['Ships overview', '/ships-and-experience/ships'],
  ['Ship', '/ships-and-experience/ships/sa-sapphire-princess'],
  ['Dining venue', '/cruise-dining/crown-grill'],
  ['Deals', '/cruise-deals-promotions'],
  ['Deal', '/cruise-deals-promotions/flash-sale'],
  ['Shore excursions port', '/shore-excursions/juneau-alaska'],
  ['Planning FAQ', '/faq'],
  ['Blog', '/blog'],
  ['Cruise search results', '/cruise-search/results/'],
];

// Known vendors by host fragment: [match, owner, category]
const VENDORS = [
  ['gw.api.princess.com', 'Princess API gateway', 'first-party API'],
  ['smetrics.princess.com', 'Adobe Analytics (Princess domain)', 'analytics'],
  ['refer.princess.com', 'Referral program (Princess domain)', 'marketing'],
  ['assets.princess.com', 'Princess image server (Adobe Scene7)', 'images / media'],
  ['princess.com', 'Princess', 'first-party'],
  ['coveo', 'Coveo', 'site search'],
  ['swiftype', 'Swiftype (Elastic)', 'site search'],
  ['fullstory', 'FullStory', 'session analytics'],
  ['osano', 'Osano', 'consent'],
  ['privacymanager.io', 'LiveRamp ATS', 'advertising'],
  ['attn.tv', 'Attentive', 'SMS marketing'],
  ['attentivemobile', 'Attentive', 'SMS marketing'],
  ['ada.support', 'Ada', 'chat'],
  ['takemobi', 'Mobi', 'chat'],
  ['cquotient', 'Salesforce Einstein', 'recommendations'],
  ['sentry.io', 'Sentry', 'error monitoring'],
  ['flashtalking', 'Flashtalking', 'advertising'],
  ['amazon-adsystem', 'Amazon Ads', 'advertising'],
  ['yahoo', 'Yahoo Ads', 'advertising'],
  ['yimg', 'Yahoo Ads', 'advertising'],
  ['rmtag', 'Rakuten Advertising', 'affiliate'],
  ['coherentpath', 'Coherent Path', 'email marketing'],
  ['ispot', 'iSpot.tv', 'advertising'],
  ['uplift', 'Uplift', 'payments / financing'],
  ['mastercard', 'Mastercard Payment Gateway', 'payments / financing'],
  ['on.aws', 'AWS-hosted event collector', 'analytics'],
  ['techlab-cdn', 'Techlab (unidentified)', 'other third party'],
  ['micpn', 'micpn.com (unidentified)', 'other third party'],
  ['arttrk', 'arttrk.com (unidentified)', 'other third party'],
  ['commercecloud.salesforce.com', 'Salesforce Commerce Cloud', 'commerce / search API'],
  ['demandware', 'Salesforce Commerce Cloud', 'commerce / search API'],
  ['contentstack', 'Contentstack', 'content'],
  ['scene7', 'Adobe Scene7', 'images / media'],
  ['cloudinary', 'Cloudinary', 'images / media'],
  ['akamai', 'Akamai', 'CDN'],
  ['cloudfront.net', 'Amazon CloudFront', 'CDN'],
  ['fastly', 'Fastly', 'CDN'],
  ['googletagmanager', 'Google Tag Manager', 'tag manager'],
  ['google-analytics', 'Google Analytics', 'analytics'],
  ['analytics.google', 'Google Analytics', 'analytics'],
  ['doubleclick', 'Google Ads', 'advertising'],
  ['googleadservices', 'Google Ads', 'advertising'],
  ['googlesyndication', 'Google Ads', 'advertising'],
  ['google.com', 'Google', 'advertising'],
  ['gstatic', 'Google', 'static assets'],
  ['googleapis', 'Google', 'static assets'],
  ['youtube', 'YouTube', 'video'],
  ['vimeo', 'Vimeo', 'video'],
  ['brightcove', 'Brightcove', 'video'],
  ['facebook', 'Meta', 'advertising'],
  ['fbcdn', 'Meta', 'advertising'],
  ['tiktok', 'TikTok', 'advertising'],
  ['pinterest', 'Pinterest', 'advertising'],
  ['pinimg', 'Pinterest', 'advertising'],
  ['bing.com', 'Microsoft Ads', 'advertising'],
  ['clarity.ms', 'Microsoft Clarity', 'analytics'],
  ['linkedin', 'LinkedIn', 'advertising'],
  ['licdn', 'LinkedIn', 'advertising'],
  ['snapchat', 'Snap', 'advertising'],
  ['twitter', 'X / Twitter', 'advertising'],
  ['ads-twitter', 'X / Twitter', 'advertising'],
  ['reddit', 'Reddit', 'advertising'],
  ['demdex', 'Adobe Audience Manager', 'analytics'],
  ['omtrdc', 'Adobe Analytics', 'analytics'],
  ['adobedtm', 'Adobe Launch', 'tag manager'],
  ['adobedc', 'Adobe Experience Platform', 'analytics'],
  ['everesttech', 'Adobe Advertising', 'advertising'],
  ['tealium', 'Tealium', 'tag manager'],
  ['tiqcdn', 'Tealium', 'tag manager'],
  ['onetrust', 'OneTrust', 'consent'],
  ['cookielaw', 'OneTrust', 'consent'],
  ['trustarc', 'TrustArc', 'consent'],
  ['quantummetric', 'Quantum Metric', 'session analytics'],
  ['dynatrace', 'Dynatrace', 'performance monitoring'],
  ['newrelic', 'New Relic', 'performance monitoring'],
  ['nr-data', 'New Relic', 'performance monitoring'],
  ['datadoghq', 'Datadog', 'performance monitoring'],
  ['go-mpulse', 'Akamai mPulse', 'performance monitoring'],
  ['akstat', 'Akamai mPulse', 'performance monitoring'],
  ['optimizely', 'Optimizely', 'A/B testing'],
  ['monetate', 'Monetate', 'personalization'],
  ['dynamicyield', 'Dynamic Yield', 'personalization'],
  ['hotjar', 'Hotjar', 'session analytics'],
  ['contentsquare', 'Contentsquare', 'session analytics'],
  ['medallia', 'Medallia', 'feedback survey'],
  ['kampyle', 'Medallia', 'feedback survey'],
  ['qualtrics', 'Qualtrics', 'feedback survey'],
  ['liveperson', 'LivePerson', 'chat'],
  ['lpsnmedia', 'LivePerson', 'chat'],
  ['salesforceliveagent', 'Salesforce', 'chat'],
  ['bazaarvoice', 'Bazaarvoice', 'reviews'],
  ['yotpo', 'Yotpo', 'reviews'],
  ['trustpilot', 'Trustpilot', 'reviews'],
  ['recaptcha', 'Google reCAPTCHA', 'security'],
  ['hcaptcha', 'hCaptcha', 'security'],
  ['px-cdn', 'HUMAN (PerimeterX)', 'bot protection'],
  ['perimeterx', 'HUMAN (PerimeterX)', 'bot protection'],
  ['px-cloud', 'HUMAN (PerimeterX)', 'bot protection'],
  ['fonts.googleapis', 'Google Fonts', 'fonts'],
  ['typekit', 'Adobe Fonts', 'fonts'],
  ['jsdelivr', 'jsDelivr', 'CDN'],
  ['cdnjs', 'cdnjs', 'CDN'],
  ['unpkg', 'unpkg', 'CDN'],
  ['mapbox', 'Mapbox', 'maps'],
  ['maps.google', 'Google Maps', 'maps'],
  ['branch.io', 'Branch', 'deep linking'],
  ['appsflyer', 'AppsFlyer', 'attribution'],
  ['impact', 'Impact', 'affiliate'],
  ['criteo', 'Criteo', 'advertising'],
  ['taboola', 'Taboola', 'advertising'],
  ['outbrain', 'Outbrain', 'advertising'],
  ['adsrvr', 'The Trade Desk', 'advertising'],
  ['rlcdn', 'LiveRamp', 'advertising'],
  ['sojern', 'Sojern', 'advertising'],
  ['cardlytics', 'Cardlytics', 'advertising'],
];
const vendorOf = (host) => {
  const v = VENDORS.find(([m]) => host.includes(m));
  return v ? { owner: v[1], category: v[2] } : { owner: host.split('.').slice(-2).join('.'), category: 'other third party' };
};

// Turn a URL into a stable endpoint key: ids become :id, query values are dropped.
function endpointKey(method, u) {
  const x = new URL(u);
  const p = x.pathname.split('/').map((s) =>
    /^\d+$/.test(s) || /^[0-9a-f]{8,}$/i.test(s) || /^[0-9a-f-]{32,}$/i.test(s) || /^[A-Z]{1,3}\d{3,}[A-Z]?$/.test(s) ? ':id' : s).join('/');
  const q = [...new Set([...x.searchParams.keys()])].sort().join('&');
  return `${method} ${x.host}${p}${q ? '?' + q : ''}`;
}

// Shape of a JSON value: keys and types, a couple of levels deep. No values are kept.
function shape(v, depth = 0) {
  if (Array.isArray(v)) return depth > 2 ? `array(${v.length})` : { array: v.length, item: v.length ? shape(v[0], depth + 1) : null };
  if (v && typeof v === 'object') {
    if (depth > 2) return 'object';
    return Object.fromEntries(Object.keys(v).slice(0, 25).map((k) => [k, shape(v[k], depth + 1)]));
  }
  return v === null ? 'null' : typeof v;
}

const AUTH_HEADERS = /^(authorization|x-api-key|x-auth|x-csrf|x-xsrf|apikey|api-key|x-dw-client-id|ocp-apim)/i;
const sitemap = JSON.parse(await fs.readFile(path.join(siteDir, 'sitemap.json'), 'utf8'));
const disallow = sitemap.robotsDisallow || [];
const robotsBlocked = (u) => {
  const x = new URL(u);
  if (!x.host.endsWith('princess.com')) return false;
  const p = x.pathname + x.search;
  return disallow.some((d) => d && d !== '/' && p.startsWith(d.replace(/\*.*$/, '')));
};

const browser = await chromium.launch({ headless: !process.argv.includes('--headed') });
const context = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 }, locale: 'en-US' });
const requests = [];
const pageResults = [];

async function visit(name, url) {
  const page = await context.newPage();
  const seen = [];
  page.on('requestfinished', async (req) => {
    if (!/^https?:/.test(req.url())) return; // inline data: and blob: URLs
    const res = await req.response().catch(() => null);
    const t = req.timing();
    const rec = {
      page: name, url: req.url(), method: req.method(), type: req.resourceType(),
      status: res?.status() ?? null, ms: t.responseEnd > 0 ? Math.round(t.responseEnd) : null,
      contentType: res?.headers()['content-type']?.split(';')[0] || null,
      authHeaders: Object.keys(await req.allHeaders().catch(() => ({}))).filter((h) => AUTH_HEADERS.test(h)),
      hasBody: !!req.postData(),
    };
    if (res && (rec.type === 'xhr' || rec.type === 'fetch')) {
      const body = await res.body().catch(() => null);
      rec.bytes = body?.length ?? null;
      if (body && /json/.test(rec.contentType || '')) {
        try { rec.shape = shape(JSON.parse(body.toString('utf8'))); } catch { rec.shape = 'invalid JSON'; }
      }
    }
    seen.push(rec);
  });
  page.on('requestfailed', (req) => {
    seen.push({ page: name, url: req.url(), method: req.method(), type: req.resourceType(), status: null,
      failure: req.failure()?.errorText || 'failed' });
  });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));
  const t0 = Date.now();
  let status = null;
  try {
    const r = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    status = r?.status() ?? null;
    await page.waitForLoadState('load', { timeout: 30000 }).catch(() => {});
    // Scroll to trigger lazy-loaded content, then let background calls settle.
    for (let y = 0; y < 6; y++) { await page.mouse.wheel(0, 1200); await sleep(700); }
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await sleep(2000);
  } catch (e) {
    errors.push('navigation: ' + e.message.slice(0, 200));
  }
  const loadMs = Date.now() - t0;
  let detailUrl = null;
  if (name === 'Cruise search results') {
    await page.waitForSelector('a[href*="voyageCode="]', { timeout: 20000 }).catch(() => {});
    detailUrl = await page.$$eval('a[href*="voyageCode="]', (as) => as[0]?.href || null).catch(() => null);
  }
  await page.close();
  requests.push(...seen);
  const failed = seen.filter((r) => r.failure || (r.status && r.status >= 400));
  pageResults.push({ name, url, status, loadMs, requests: seen.length, failed: failed.length, jsErrors: errors });
  console.log(`${name.padEnd(24)} ${status} ${String(seen.length).padStart(4)} requests ${failed.length} failed ${(loadMs / 1000).toFixed(1)}s`);
  return detailUrl;
}

for (const [name, p] of PAGES) {
  const detail = await visit(name, BASE + p);
  if (detail) { await sleep(3000); await visit('Cruise details', detail); }
  await sleep(3000);
}
await browser.close();

// Group by host
const hosts = new Map();
for (const r of requests) {
  let host; try { host = new URL(r.url).host; } catch { continue; }
  if (!hosts.has(host)) hosts.set(host, { host, ...vendorOf(host), requests: 0, failed: 0, types: {}, pages: new Set(), ms: [] });
  const h = hosts.get(host);
  h.requests++; h.types[r.type] = (h.types[r.type] || 0) + 1; h.pages.add(r.page);
  if (r.failure || (r.status && r.status >= 400)) h.failed++;
  if (r.ms) h.ms.push(r.ms);
}
const median = (a) => (a.length ? [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] : null);

// Group data calls (xhr/fetch) by endpoint
const endpoints = new Map();
for (const r of requests.filter((r) => r.type === 'xhr' || r.type === 'fetch')) {
  let key; try { key = endpointKey(r.method, r.url); } catch { continue; }
  if (!endpoints.has(key)) {
    const host = new URL(r.url).host;
    endpoints.set(key, { key, method: r.method, host, ...vendorOf(host), sampleUrl: r.url, contentType: r.contentType,
      statuses: {}, ms: [], pages: new Set(), authHeaders: new Set(), hasBody: false, shape: null, bytes: null,
      robotsBlocked: robotsBlocked(r.url), failures: [] });
  }
  const e = endpoints.get(key);
  const s = r.status ?? 'failed';
  e.statuses[s] = (e.statuses[s] || 0) + 1;
  if (r.ms) e.ms.push(r.ms);
  e.pages.add(r.page);
  (r.authHeaders || []).forEach((h) => e.authHeaders.add(h));
  if (r.hasBody) e.hasBody = true;
  if (r.shape && !e.shape) e.shape = r.shape;
  if (r.bytes != null) e.bytes = r.bytes;
  if (r.failure) e.failures.push(r.failure);
  if (!e.contentType && r.contentType) e.contentType = r.contentType;
}

const out = {
  mappedAt: new Date().toISOString(),
  pages: pageResults,
  totals: { requests: requests.length, hosts: hosts.size, dataEndpoints: endpoints.size,
    failed: requests.filter((r) => r.failure || (r.status && r.status >= 400)).length },
  hosts: [...hosts.values()].map((h) => ({ ...h, pages: [...h.pages], medianMs: median(h.ms), ms: undefined }))
    .sort((a, b) => b.requests - a.requests),
  endpoints: [...endpoints.values()].map((e) => ({ ...e, pages: [...e.pages], authHeaders: [...e.authHeaders],
    medianMs: median(e.ms), ms: undefined })).sort((a, b) => a.key.localeCompare(b.key)),
  failedRequests: requests.filter((r) => r.failure || (r.status && r.status >= 400))
    .map(({ page, url, method, type, status, failure }) => ({ page, url: url.slice(0, 300), method, type, status, failure })),
};
await fs.writeFile(path.join(siteDir, 'services.json'), JSON.stringify(out, null, 2));
console.log(`\n${out.totals.requests} requests, ${out.totals.hosts} hosts, ${out.totals.dataEndpoints} data endpoints, ${out.totals.failed} failed`);
