// Builds a short, plain-language daily status page for princess.com from the latest runs:
//   api-health.json (check-apis.mjs), link-check.json (check-links.mjs), issue-recheck.json (recheck-issues.mjs)
// and compares links with the newest folder in data/sites/princess.com/history/.
// Usage: node build-daily-report.mjs   → docs/reports/princess-daily-check-<date>.html
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const siteDir = path.resolve(here, '../../data/sites/princess.com');
const read = async (f) => JSON.parse(await fs.readFile(path.join(siteDir, f), 'utf8'));
const api = await read('api-health.json');
const links = await read('link-check.json');
const recheck = await read('issue-recheck.json').catch(() => null);
const histDirs = (await fs.readdir(path.join(siteDir, 'history')).catch(() => [])).sort();
const prevDir = histDirs.filter((d) => d < api.checkedAt.slice(0, 10)).pop();
const prevLinks = prevDir ? await read(`history/${prevDir}/link-check.json`).catch(() => null) : null;

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const short = (u) => u.replace('https://www.princess.com', '') || '/';
const sec = (ms) => (ms == null ? '–' : `${(ms / 1000).toFixed(1)}s`);
const day = new Date(api.checkedAt).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
const prevDay = prevDir ? new Date(prevDir + 'T12:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : null;
const dot = (s) => `<span class="dot ${s}"></span>`;
const label = { ok: 'OK', warn: 'Warning', bad: 'Problem' };

// Plain-language wording for a failed check.
function plain(c) {
  if (/placeholders/.test(c.name)) return `placeholder text found ("${c.note}")`;
  if (/expired sales/.test(c.name)) return `${c.note.split(':')[0].replace('expired', 'expired sales')} still listed`;
  if (/responds in under/.test(c.name)) return `slow to respond (${(parseInt(c.note) / 1000).toFixed(1)}s)`;
  if (/JavaScript error/.test(c.name)) return `script error on ${(c.name.match(/\d+ of \d+/)?.[0] || 'some')} pages, from ${/gtmfp|googletag/.test(c.note) ? 'Google Tag Manager (tracking only, not visible to visitors)' : c.note.slice(0, 80)}`;
  return c.name + (c.note ? ` (${c.note.slice(0, 80)})` : '');
}

// ---- Services: group endpoints into plain names ----
const SERVICES = [
  ['Princess cruise data', [
    ['Live cruise prices', /pricing\/v1\/cruises/], ['Cruise list', /resdb\/p1\.0\/products/], ['Deals', /resdb\/p1\.0\/deals/],
    ['Itineraries', /resdb\/p1\.0\/itineraries/], ['Ships', /resdb\/p1\.0\/ships/], ['Ports', /resdb\/p1\.0\/ports/],
    ['Shore excursions', /db-excursion/], ['Sales & promotions', /promos\/sales/], ['Destinations', /resdb\/p1\.0\/(sub)?trades/],
    ['Cabin types', /resdb\/p1\.0\/metas/], ['Home cities & air', /resdb\/p1\.0\/(cities|air-discount)/],
    ['Visitor location', /guest\/p1\.0\/locale/], ['Booking settings', /ube\/p1\.0|resmf|dbtoken/]]],
  ['Princess content', [
    ['Navigation menus', /globalheader|globalfooter/], ['Port information', /master-data-itinerary-ports/],
    ['Packages', /masterdata-special-packages/], ['Sale lists', /sale-names|sale-banners/], ['Promotions', /hero-promotion|free-3rd-4th/]]],
  ['Outside services', [
    ['Site search (Coveo)', /coveo\.com\/rest\/search/], ['Search box (Swiftype)', /swiftype/], ['Help chat (Ada)', /ada\.support/]]],
];
// Each service's status comes from the endpoints the browser saw plus the direct checks.
const direct = api.results.filter((r) => r.endpoint && r.group !== 'Page journey');
function serviceStatus(re) {
  const eps = api.endpoints.filter((e) => re.test(e.endpoint));
  const dir = direct.filter((r) => re.test(r.endpoint));
  if (!eps.length && !dir.length) return null;
  const codes = {};
  for (const e of eps) for (const [s, n] of Object.entries(e.statuses)) codes[s] = (codes[s] || 0) + n;
  for (const r of dir) codes[r.httpStatus ?? 'error'] = (codes[r.httpStatus ?? 'error'] || 0) + 1;
  const bad = Object.keys(codes).some((s) => !(Number(s) >= 200 && Number(s) < 400));
  const warnings = dir.filter((r) => r.result !== 'pass').map((r) => plain(r.checks.find((c) => !c.ok)));
  const times = eps.map((e) => e.medianMs).filter(Boolean).concat(dir.map((r) => r.ms).filter(Boolean));
  return { state: bad ? 'bad' : warnings.length ? 'warn' : 'ok', codes: Object.keys(codes).join(', '),
    ms: times.length ? Math.max(...times) : null, note: warnings.join('; ') };
}
const serviceRows = SERVICES.map(([g, list]) => [g, list.map(([name, re]) => ({ name, ...serviceStatus(re) })).filter((s) => s.state)]);
const allServices = serviceRows.flatMap(([, l]) => l);
const servicesOk = allServices.filter((s) => s.state !== 'bad').length;

// ---- Pages ----
const pageRows = api.results.filter((r) => r.group === 'Page journey' && r.endpoint).map((r) => {
  const bad = r.checks.filter((c) => !c.ok && c.level === 'fail');
  const warn = r.checks.filter((c) => !c.ok && c.level !== 'fail');
  return { name: r.name, status: r.httpStatus, usable: r.dclMs, loaded: r.ms,
    state: bad.length ? 'bad' : warn.length ? 'warn' : 'ok', note: [...bad, ...warn].map((c) => c.name).join('; ') };
});
const pagesOk = pageRows.filter((p) => p.state !== 'bad').length;

// ---- Links ----
const bucket = (s, r) => (s === 200 ? 'ok' : s === 404 || s === 410 ? 'missing'
  : typeof s === 'number' && s >= 500 ? (r?.retry?.status === 200 ? 'temporary' : 'server') : 'other');
const countBuckets = (l) => l.results.reduce((m, r) => ((m[bucket(r.status, r)] = (m[bucket(r.status, r)] || 0) + 1), m), {});
const today = countBuckets(links);
const before = prevLinks ? countBuckets(prevLinks) : null;
const brokenSet = (l) => new Set(l.results.filter((r) => !['ok', 'temporary'].includes(bucket(r.status, r))).map((r) => r.url));
const nowBroken = brokenSet(links);
const wasBroken = prevLinks ? brokenSet(prevLinks) : new Set();
const prevUrls = prevLinks ? new Set(prevLinks.results.map((r) => r.url)) : new Set();
const newBroken = links.results.filter((r) => nowBroken.has(r.url) && !wasBroken.has(r.url));
const fixedLinks = prevLinks ? prevLinks.results.filter((r) => wasBroken.has(r.url) && !nowBroken.has(r.url)) : [];
const newPages = prevLinks ? links.results.filter((r) => r.inSitemap && !prevUrls.has(r.url)).length : 0;
const brokenRefs = links.results.filter((r) => bucket(r.status) === 'missing').reduce((n, r) => n + (r.linkedFrom?.length || 0), 0);
const delta = (k) => {
  if (!before) return '';
  const d = (today[k] || 0) - (before[k] || 0);
  return d === 0 ? '<span class="same">no change</span>' : `<span class="${(k === 'ok') === d > 0 ? 'better' : 'worse'}">${d > 0 ? '+' : ''}${d.toLocaleString()}</span>`;
};

// ---- Known issues ----
const issues = recheck?.results || [];
const open = issues.filter((i) => i.state !== 'fixed' && i.state !== 'unknown');
const fixedIssues = issues.filter((i) => i.state === 'fixed');
const stateClass = { 'still there': 'bad', 'partly fixed': 'warn', fixed: 'ok', unknown: 'warn' };

// ---- Other warnings from the API run ----
// Anything not already shown in the services or pages tables (one line per check).
const shownInServices = (r) => SERVICES.some(([, list]) => list.some(([, re]) => r.endpoint && re.test(r.endpoint)));
const otherWarnings = api.results.filter((r) => r.result !== 'pass' && !(r.group === 'Page journey' && r.endpoint) && !shownInServices(r))
  .map((r) => ({ where: r.name.replace('JavaScript errors (all pages)', 'All pages'), what: plain(r.checks.find((c) => !c.ok)) }));

// ---- Headline ----
const apiDown = allServices.filter((s) => s.state === 'bad');
const headline = [
  apiDown.length ? `${apiDown.length} service${apiDown.length > 1 ? 's' : ''} returning errors` : 'All services responding',
  `${pagesOk} of ${pageRows.length} key pages working`,
  `${(today.missing || 0).toLocaleString()} broken URLs${before ? ` (${(today.missing || 0) - (before.missing || 0) === 0 ? 'same as' : (today.missing || 0) > (before.missing || 0) ? 'up from' : 'down from'} ${before.missing || 0} on ${prevDay})` : ''}`,
  recheck ? `${fixedIssues.length} of ${issues.length} known issues fixed` : null,
].filter(Boolean);
const overall = apiDown.length || pagesOk < pageRows.length || today.server ? 'bad' : 'ok';

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Princess Daily Check</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@400;600;700&display=swap">
<style>
:root{--bg:#F6F4EF;--card:#FFFDF8;--ink:#1B2433;--muted:#5B6474;--line:#E6E2D8;--ok:#2F7D4F;--warn:#B06A00;--bad:#C2491D}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#151A23;--card:#1D2430;--ink:#E8ECF2;--muted:#A3ACBA;--line:#2F3846;--ok:#5DBB83;--warn:#E3A33B;--bad:#EF7B52}}
:root[data-theme="dark"]{--bg:#151A23;--card:#1D2430;--ink:#E8ECF2;--muted:#A3ACBA;--line:#2F3846;--ok:#5DBB83;--warn:#E3A33B;--bad:#EF7B52}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 'Public Sans',Arial,sans-serif}
main{max-width:860px;margin:0 auto;padding:36px 16px 64px;overflow-x:clip}
.eyebrow{color:var(--muted);font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;margin:0}
h1{font-size:clamp(24px,4.5vw,32px);margin:4px 0 12px;line-height:1.2}
h2{font-size:18px;margin:32px 0 8px}
.summary{list-style:none;padding:0;margin:0 0 8px;display:grid;gap:6px}
.summary li{display:flex;gap:10px;align-items:center}
.dot{display:inline-block;width:10px;height:10px;border-radius:50%;flex:none}
.dot.ok{background:var(--ok)}.dot.warn{background:var(--warn)}.dot.bad{background:var(--bad)}
.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:4px 16px}
table{width:100%;border-collapse:collapse}td,th{padding:8px 6px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
tr:last-child td{border-bottom:0}th{font-size:12px;color:var(--muted);font-weight:600;text-transform:uppercase;letter-spacing:.04em}
td.r,th.r{text-align:right;white-space:nowrap}td.s{white-space:nowrap}
.state{font-weight:600}.state.ok{color:var(--ok)}.state.warn{color:var(--warn)}.state.bad{color:var(--bad)}
.group td{font-weight:700;padding-top:14px;color:var(--muted);font-size:13px}
.note{color:var(--muted);font-size:13px}
.better{color:var(--ok);font-weight:600}.worse{color:var(--bad);font-weight:600}.same{color:var(--muted)}
ul.plain{margin:6px 0;padding-left:18px}ul.plain li{margin:3px 0}
code{font-size:12.5px;word-break:break-all}
footer{margin-top:36px;color:var(--muted);font-size:13px}
@media (max-width:560px){.hide-sm{display:none}}
</style></head><body><main>
<p class="eyebrow">princess.com daily check</p>
<h1>${esc(day)}</h1>
<ul class="summary">${headline.map((h, i) => `<li>${dot(i === 0 ? (apiDown.length ? 'bad' : 'ok') : i === 1 ? (pagesOk === pageRows.length ? 'ok' : 'bad') : i === 2 ? ((today.missing || 0) > (before?.missing ?? Infinity) ? 'bad' : 'warn') : (open.length ? 'warn' : 'ok'))}${esc(h)}</li>`).join('')}</ul>

<h2>Services</h2>
<div class="card"><table><tr><th>Service</th><th>Status</th><th class="r">Response</th><th class="r hide-sm">Slowest</th></tr>
${serviceRows.map(([g, list]) => `<tr class="group"><td colspan="4">${esc(g)}</td></tr>` + list.map((s) => `<tr><td>${esc(s.name)}${s.note ? `<div class="note">${esc(s.note)}</div>` : ''}</td>
<td class="s">${dot(s.state)} <span class="state ${s.state}">${label[s.state]}</span></td><td class="r">${esc(s.codes)}</td><td class="r hide-sm">${sec(s.ms)}</td></tr>`).join('')).join('')}
</table></div>

<h2>Key pages</h2>
<div class="card"><table><tr><th>Page</th><th>Status</th><th class="r">Response</th><th class="r">Usable in</th></tr>
${pageRows.map((p) => `<tr><td>${esc(p.name)}${p.note ? `<div class="note">${esc(p.note)}</div>` : ''}</td><td class="s">${dot(p.state)} <span class="state ${p.state}">${label[p.state]}</span></td>
<td class="r">${p.status}</td><td class="r">${sec(p.usable)}</td></tr>`).join('')}
</table></div>

<h2>Links across the site</h2>
<div class="card"><table><tr><th>Result</th><th class="r">URLs</th>${before ? `<th class="r">vs ${esc(prevDay)}</th>` : ''}</tr>
<tr><td>${dot('ok')} Working (200)</td><td class="r">${(today.ok || 0).toLocaleString()}</td>${before ? `<td class="r">${delta('ok')}</td>` : ''}</tr>
<tr><td>${dot('bad')} Page not found (404)</td><td class="r">${(today.missing || 0).toLocaleString()}</td>${before ? `<td class="r">${delta('missing')}</td>` : ''}</tr>
<tr><td>${dot(today.server ? 'bad' : 'ok')} Server errors (5xx)</td><td class="r">${(today.server || 0).toLocaleString()}</td>${before ? `<td class="r">${delta('server')}</td>` : ''}</tr>
<tr><td>${dot('ok')} Temporary errors (fine on retry)</td><td class="r">${(today.temporary || 0).toLocaleString()}</td>${before ? `<td class="r">${delta('temporary')}</td>` : ''}</tr>
<tr><td>${dot('warn')} Other (timeouts, long redirect chains)</td><td class="r">${(today.other || 0).toLocaleString()}</td>${before ? `<td class="r">${delta('other')}</td>` : ''}</tr>
</table></div>
<p class="note">${links.total.toLocaleString()} URLs checked from the sitemap and site links. Missing pages are still linked ${brokenRefs.toLocaleString()} times from live pages.${prevLinks ? ` ${newPages.toLocaleString()} pages are new in the sitemap since ${esc(prevDay)}.` : ''}</p>
${prevLinks ? `<div class="card" style="padding:10px 16px">
<b>Newly broken since ${esc(prevDay)}: ${newBroken.length}</b>${newBroken.length ? `<ul class="plain">${newBroken.slice(0, 12).map((r) => `<li><code>${esc(short(r.url))}</code> <span class="note">${esc(r.status)}${r.linkedFrom?.length ? `, linked from ${r.linkedFrom.length} page${r.linkedFrom.length > 1 ? 's' : ''}` : ''}</span></li>`).join('')}${newBroken.length > 12 ? `<li class="note">and ${newBroken.length - 12} more</li>` : ''}</ul>` : ''}
<br><b>Fixed since ${esc(prevDay)}: ${fixedLinks.length}</b>${fixedLinks.length ? `<ul class="plain">${fixedLinks.slice(0, 12).map((r) => `<li><code>${esc(short(r.url))}</code></li>`).join('')}${fixedLinks.length > 12 ? `<li class="note">and ${fixedLinks.length - 12} more</li>` : ''}</ul>` : ''}
</div>` : ''}

${recheck ? `<h2>Issues found yesterday</h2>
<div class="card"><table><tr><th>Issue</th><th>Today</th></tr>
${issues.map((i) => `<tr><td>${esc(i.title)}<div class="note">${esc(i.severity)} severity${i.items.length > 1 ? ` · ${i.still} of ${i.items.length} still affected` : ''}</div>
${i.items[0]?.word && i.still ? `<div class="note">Still there: ${esc(i.items.filter((x) => x.state === 'still').map((x) => x.word).join(', '))}${i.fixed ? ` · Fixed: ${esc(i.items.filter((x) => x.state === 'fixed').map((x) => x.word).join(', '))}` : ''}</div>` : ''}</td>
<td class="s">${dot(stateClass[i.state])} <span class="state ${stateClass[i.state]}">${esc(i.state[0].toUpperCase() + i.state.slice(1))}</span></td></tr>`).join('')}
</table></div>` : ''}

${otherWarnings.length ? `<h2>Other warnings</h2>
<div class="card" style="padding:8px 16px"><ul class="plain">${otherWarnings.map((w) => `<li><b>${esc(w.where)}:</b> ${esc(w.what)}</li>`).join('')}</ul></div>` : ''}

<footer>Checked ${esc(new Date(api.checkedAt).toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }))}. Read-only checks: page views and GET requests only. Re-run with <code>npm run daily -w @wa/princess</code>.</footer>
</main></body></html>`;

const outFile = path.resolve(here, `../../docs/reports/princess-daily-check-${api.checkedAt.slice(0, 10)}.html`);
await fs.writeFile(outFile, html);
console.log('wrote', outFile);

// Keep today's results so the next run can compare against them.
const histDir = path.join(siteDir, 'history', api.checkedAt.slice(0, 10));
await fs.mkdir(histDir, { recursive: true });
for (const f of ['link-check.json', 'api-health.json', 'issue-recheck.json', 'sitemap.json']) {
  await fs.copyFile(path.join(siteDir, f), path.join(histDir, f)).catch(() => {});
}
