// Builds a standalone HTML report from services.json (service map) and api-health.json (check results).
// Usage: node build-api-report.mjs   → docs/reports/princess-api-health-report.html
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(here, '../../data/sites/princess.com');
const outFile = path.resolve(here, '../../docs/reports/princess-api-health-report.html');
const map = JSON.parse(await fs.readFile(path.join(siteDir, 'services.json'), 'utf8'));
const health = JSON.parse(await fs.readFile(path.join(siteDir, 'api-health.json'), 'utf8'));
const notes = JSON.parse(await fs.readFile(path.join(siteDir, 'api-health-notes.json'), 'utf8').catch(() => '{}'));

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ms = (n) => (n == null ? '–' : n >= 1000 ? `${(n / 1000).toFixed(1)} s` : `${n} ms`);
const when = new Date(health.checkedAt).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
const badge = (r) => `<span class="badge ${r}">${{ pass: 'Pass', warn: 'Warning', fail: 'Fail' }[r]}</span>`;
const { pass, warn, fail } = health.summary;
const verdict = fail ? `${fail} check${fail > 1 ? 's' : ''} failed` : warn ? 'Working, with warnings' : 'All checks passed';

// Service map grouped by category
const groups = {};
for (const h of map.hosts) {
  const cat = h.category;
  groups[cat] ??= new Map();
  const g = groups[cat];
  if (!g.has(h.owner)) g.set(h.owner, { owner: h.owner, hosts: [], requests: 0, failed: 0 });
  const o = g.get(h.owner);
  o.hosts.push(h.host); o.requests += h.requests; o.failed += h.failed;
}
const CAT_ORDER = ['first-party API', 'first-party', 'images / media', 'site search', 'chat', 'consent', 'payments / financing',
  'recommendations', 'tag manager', 'analytics', 'session analytics', 'performance monitoring', 'error monitoring', 'A/B testing',
  'fonts', 'static assets', 'video', 'CDN', 'marketing', 'SMS marketing', 'email marketing', 'advertising', 'affiliate', 'other third party'];
const CAT_ROLE = {
  'first-party API': 'Cruise data, prices, deals', 'first-party': 'Pages, content API, static files', 'images / media': 'Photos and video',
  'site search': 'Search box and blog listing', chat: 'Help chat', consent: 'Cookie banner', 'payments / financing': 'Pay-monthly and card widgets',
  recommendations: 'Product recommendations', 'tag manager': 'Loads marketing tags', analytics: 'Traffic measurement',
  'session analytics': 'Session recording', 'performance monitoring': 'Speed and error monitoring', 'error monitoring': 'Error tracking',
  'A/B testing': 'Experiments', fonts: 'Web fonts', 'static assets': 'Shared scripts and fonts', video: 'Embedded video', CDN: 'Script hosting',
  marketing: 'Referral program', 'SMS marketing': 'Text-message signup', 'email marketing': 'Email personalization',
  advertising: 'Ad pixels and retargeting', affiliate: 'Affiliate tracking', 'other third party': 'Not identified',
};
const cats = Object.keys(groups).sort((a, b) => (CAT_ORDER.indexOf(a) + 99) % 99 - (CAT_ORDER.indexOf(b) + 99) % 99);
const vendorCount = cats.reduce((n, c) => n + groups[c].size, 0);

const attention = health.results.filter((r) => r.result !== 'pass').sort((a, b) => (a.result === 'fail' ? -1 : 1) - (b.result === 'fail' ? -1 : 1));
const groupNames = [...new Set(health.results.map((r) => r.group))];

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Princess API Health</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;600;700&family=Libre+Baskerville:wght@700&display=swap">
<style>
:root{--bg:#F6F4EF;--card:#FFFDF8;--ink:#1B2433;--muted:#5B6474;--line:#E2DED3;--pass:#2F7D4F;--warn:#A86500;--fail:#C2491D;--accent:#2B5F9E;--chip:#EEEAE0}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#151A23;--card:#1D2430;--ink:#E8ECF2;--muted:#A3ACBA;--line:#2F3846;--pass:#5DBB83;--warn:#E3A33B;--fail:#EF7B52;--accent:#7FA9E0;--chip:#283140}}
:root[data-theme="dark"]{--bg:#151A23;--card:#1D2430;--ink:#E8ECF2;--muted:#A3ACBA;--line:#2F3846;--pass:#5DBB83;--warn:#E3A33B;--fail:#EF7B52;--accent:#7FA9E0;--chip:#283140}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 'Public Sans',Arial,sans-serif}
main{max-width:1100px;margin:0 auto;padding:40px 16px 80px}
h1{font-family:'Libre Baskerville',Georgia,serif;font-size:clamp(28px,5vw,42px);margin:4px 0 8px;line-height:1.2}
h2{font-family:'Libre Baskerville',Georgia,serif;font-size:24px;margin:48px 0 6px}
.eyebrow{color:var(--fail);font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-size:13px}
.sub{color:var(--muted);margin:0 0 16px}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:24px 0}
.tile{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px}
.tile b{display:block;font-size:30px;line-height:1.1}.tile span{color:var(--muted);font-size:14px}
.tile.pass b{color:var(--pass)}.tile.warn b{color:var(--warn)}.tile.fail b{color:var(--fail)}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:4px 20px;margin:12px 0}
.badge{display:inline-block;font-size:12px;font-weight:700;padding:2px 9px;border-radius:99px;white-space:nowrap}
.badge.pass{background:color-mix(in srgb,var(--pass) 15%,transparent);color:var(--pass)}
.badge.warn{background:color-mix(in srgb,var(--warn) 15%,transparent);color:var(--warn)}
.badge.fail{background:color-mix(in srgb,var(--fail) 15%,transparent);color:var(--fail)}
.scroll{overflow-x:auto;max-width:100%}details.card{overflow:hidden}main{overflow-x:clip}table{width:100%;border-collapse:collapse;font-size:14px}
th,td{text-align:left;padding:9px 10px;border-bottom:1px solid var(--line);vertical-align:top}
th{color:var(--muted);font-weight:600;font-size:13px}td.num,th.num{text-align:right;white-space:nowrap}
code{font-size:12.5px;word-break:break-all;color:var(--muted)}
.issue{padding:14px 0;border-bottom:1px solid var(--line)}.issue:last-child{border:0}
.issue h3{font-size:17px;margin:0 0 4px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}
.issue p{margin:4px 0;color:var(--muted)}.issue .why{color:var(--ink)}
ul.checks{margin:6px 0 0;padding-left:18px;color:var(--muted);font-size:14px}ul.checks li.bad{color:var(--ink)}
details summary{cursor:pointer;padding:12px 0;font-weight:600}
.chips{display:flex;flex-wrap:wrap;gap:6px}.chip{background:var(--chip);border-radius:6px;padding:2px 8px;font-size:13px}
.flow{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px}
.flow .card{padding:16px 20px;margin:0}.flow h3{margin:0 0 6px;font-size:16px}.flow p{margin:0;color:var(--muted);font-size:14px}
footer{margin-top:48px;color:var(--muted);font-size:14px}
</style></head><body><main>
<p class="eyebrow">princess.com · Service map &amp; API health</p>
<h1>${esc(verdict)}</h1>
<p class="sub">Checked ${esc(when)} by loading ${health.results.filter((r) => r.group === 'Page journey' && r.endpoint).length} key pages in a real browser and calling the site's open content APIs directly.</p>

<div class="tiles">
<div class="tile pass"><b>${pass}</b><span>checks passed</span></div>
<div class="tile warn"><b>${warn}</b><span>warnings</span></div>
<div class="tile fail"><b>${fail}</b><span>failures</span></div>
<div class="tile"><b>${health.endpoints.length}</b><span>data endpoints measured</span></div>
<div class="tile"><b>${vendorCount}</b><span>services the site loads</span></div>
</div>

${notes.headline ? `<div class="card" style="padding:16px 20px">${notes.headline}</div>` : ''}

<h2>What needs attention</h2>
<p class="sub">Every check that failed or warned, most serious first.</p>
<div class="card">${attention.length ? attention.map((r) => `<div class="issue"><h3>${badge(r.result)} ${esc(r.group)} · ${esc(r.name)}</h3>
${notes.findings?.[r.name] ? `<p class="why">${notes.findings[r.name]}</p>` : ''}
<ul class="checks">${r.checks.filter((c) => !c.ok).map((c) => `<li class="bad"><b>${esc(c.name)}</b>${c.note ? ': ' + esc(c.note) : ''}</li>`).join('')}</ul></div>`).join('')
  : '<p>Nothing — every check passed.</p>'}</div>

<h2>How the site is wired</h2>
<p class="sub">What a visitor's browser talks to when it loads princess.com.</p>
<div class="flow">
<div class="card"><h3>Pages &amp; content</h3><p>www.princess.com serves the pages. Navigation, port data and packages come from its content API (<code>/graphql/execute.json/…</code>), and sale lists from static JSON files.</p></div>
<div class="card"><h3>Cruise data API</h3><p><code>gw.api.princess.com</code> supplies cruises, live prices, deals, ships, ports and visitor locale. It only answers requests from the site's own pages.</p></div>
<div class="card"><h3>Commerce &amp; search</h3><p>Shore-excursion carts run on Salesforce Commerce Cloud. Coveo powers search and the blog listing, and Swiftype the search box.</p></div>
<div class="card"><h3>Images</h3><p><code>assets.princess.com</code> (Adobe Scene7) resizes and serves photos.</p></div>
<div class="card"><h3>Marketing &amp; measurement</h3><p>Adobe Launch loads ${groups['advertising']?.size || 0} advertising services, plus analytics, session recording, A/B testing and monitoring tools.</p></div>
</div>

<h2>Check results</h2>
${groupNames.map((g) => `<details class="card" ${g === 'Page journey' ? 'open' : ''}><summary>${esc(g)} · ${health.results.filter((r) => r.group === g).length} checks</summary>
<div class="scroll"><table><tr><th>Check</th><th>Result</th><th class="num">HTTP</th><th class="num">Time</th><th>Details</th></tr>
${health.results.filter((r) => r.group === g).map((r) => `<tr><td><b>${esc(r.name)}</b>${r.endpoint ? `<br><code>${esc(r.endpoint.replace('https://', '').slice(0, 110))}</code>` : ''}</td>
<td>${badge(r.result)}</td><td class="num">${r.httpStatus ?? '–'}</td><td class="num">${ms(r.ms)}</td>
<td><ul class="checks">${r.checks.map((c) => `<li class="${c.ok ? '' : 'bad'}">${c.ok ? '✓' : c.level === 'fail' ? '✗' : '!'} ${esc(c.name)}${!c.ok && c.note ? ': ' + esc(c.note.slice(0, 300)) : ''}</li>`).join('')}</ul></td></tr>`).join('')}
</table></div></details>`).join('')}

<h2>Data endpoints</h2>
<p class="sub">Every data call the checked pages made, excluding analytics beacons. Times are measured in the browser.</p>
<div class="card scroll"><table><tr><th>Endpoint</th><th>Service</th><th class="num">Calls</th><th>Responses</th><th class="num">Median</th><th class="num">Slowest</th></tr>
${health.endpoints.map((e) => `<tr><td><code>${esc(e.endpoint.slice(0, 120))}</code></td><td>${esc(e.vendor)}</td><td class="num">${e.calls}</td>
<td>${Object.entries(e.statuses).map(([s, n]) => `<span class="badge ${Number(s) >= 200 && Number(s) < 400 ? 'pass' : 'fail'}">${esc(s)}${n > 1 ? ' ×' + n : ''}</span>`).join(' ')}</td>
<td class="num">${ms(e.medianMs)}</td><td class="num">${ms(e.maxMs)}</td></tr>`).join('')}
</table></div>

<h2>Third-party services</h2>
<p class="sub">Requests seen during the page checks, grouped by company. Failures here rarely affect visitors, but each service adds weight and risk to every page.</p>
<div class="card scroll"><table><tr><th>Service</th><th class="num">Requests</th><th class="num">Failed</th><th class="num">Median</th><th>Errors</th></tr>
${health.vendors.map((v) => `<tr><td>${esc(v.vendor)}</td><td class="num">${v.requests}</td><td class="num">${v.failed ? `<b style="color:var(--fail)">${v.failed}</b>` : 0}</td><td class="num">${ms(v.medianMs)}</td><td>${esc(v.errors.join(', '))}</td></tr>`).join('')}
</table></div>

<h2>Service map</h2>
<p class="sub">${map.totals.hosts} domains from ${vendorCount} companies, seen across ${map.pages.length} pages on ${esc(new Date(map.mappedAt).toLocaleDateString('en-US', { dateStyle: 'long' }))}.</p>
<div class="card scroll"><table><tr><th>Type</th><th>What it does</th><th>Services</th><th class="num">Requests</th></tr>
${cats.map((c) => `<tr><td><b>${esc(c)}</b></td><td>${esc(CAT_ROLE[c] || '')}</td><td><div class="chips">${[...groups[c].values()].map((o) => `<span class="chip" title="${esc(o.hosts.join(', '))}">${esc(o.owner)}</span>`).join('')}</div></td>
<td class="num">${[...groups[c].values()].reduce((n, o) => n + o.requests, 0)}</td></tr>`).join('')}
</table></div>

<h2>How this was checked</h2>
<div class="card" style="padding:12px 20px"><ul>
<li><b>Discovery:</b> ${map.pages.length} pages were loaded in Chromium and every request was recorded (${map.totals.requests.toLocaleString()} in total).</li>
<li><b>Direct checks:</b> the open content APIs, sale lists, robots.txt and sitemap were called with plain GET requests and checked for status, speed (warning over 1 s, failure over 5 s) and expected data.</li>
<li><b>Page journeys:</b> the cruise data API refuses calls from outside the site (401/403), so it was checked the way a visitor uses it: each page was loaded and every API response verified, including that live prices are above $0.</li>
<li><b>Read-only:</b> no logins, forms, carts or bookings. Pages were loaded one at a time with pauses, and robots.txt rules were respected.</li>
<li><b>Limits:</b> one run from one location (US). Booking, account and payment APIs were not tested. Times include the test machine's network.</li>
</ul></div>
<footer>Re-run with <code>node packages/princess/check-apis.mjs</code> then <code>node packages/princess/build-api-report.mjs</code>. Raw results: <code>data/sites/princess.com/api-health.json</code>.</footer>
</main></body></html>`;
await fs.writeFile(outFile, html);
console.log('wrote', outFile);
