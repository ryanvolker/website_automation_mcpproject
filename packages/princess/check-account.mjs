// Logs in with the test account and checks every tab of the account settings section.
// Usage: node check-account.mjs [--account main|test] [--all] [--headed] [--fresh]
//   --account which login from .env to use (default main)
//   --headed  show the browser (use if the site asks for a code or challenge)
//   --fresh   ignore the saved sign-in and log in again
// Writes data/sites/princess.com/account-check.json.
// Saves the structure only: page names, section headings, field labels, whether each field is filled in,
// and the status of each request. It never saves field values, and it redacts anything that matches them.
// Look only: it opens pages and follows links, and blocks any request that would change data.
import fs from 'node:fs/promises';
import path from 'node:path';
import { signedInContext, saveSignIn, repoRoot, HOME_URL } from './princess-login.mjs';

const argv = process.argv.slice(2);
const headed = argv.includes('--headed');
const fresh = argv.includes('--fresh');
const account = argv.includes('--account') ? argv[argv.indexOf('--account') + 1] : 'main';
const outFile = path.join(repoRoot, `data/sites/princess.com/account-check-${account}.json`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const started = Date.now();

const { browser, context, page, reused, creds } = await signedInContext({ account, headed, fresh });
console.log(`${reused ? 'Reused saved sign-in' : 'Logged in'} (account: ${account}).`);

// Block anything that would change account data. The login itself has already happened.
const blocked = [];
await context.route('**/*', (route) => {
  const r = route.request();
  const host = new URL(r.url()).host;
  if (['PUT', 'PATCH', 'DELETE'].includes(r.method()) && /princess\.com$/.test(host)) {
    blocked.push(`${r.method()} ${host}${new URL(r.url()).pathname}`);
    return route.abort();
  }
  return route.continue();
});

// Values we must never save: collected in memory from the pages, used only to redact.
const secrets = new Set([creds.loginId, creds.password, creds.loginId.split('@')[0]].filter(Boolean));
const redact = (s) => {
  let out = String(s ?? '');
  for (const v of [...secrets].sort((a, b) => b.length - a.length)) if (v.length >= 3) out = out.split(v).join('•••');
  return out
    .replace(/[\w.+-]+@[\w-]+\.[\w.]+/g, '•••@•••')
    .replace(/\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/g, '••/••/••••')
    .replace(/\d{4,}/g, (d) => '#'.repeat(Math.min(d.length, 4)));
};
const cleanPath = (u) => {
  const x = new URL(u);
  return x.host + x.pathname.replace(/\/[0-9a-f-]{8,}|\/\d{3,}/gi, '/:id');
};

// Record every data request the pages make (status and time, never the body).
let requests = [];
page.on('response', async (res) => {
  const req = res.request();
  if (!['xhr', 'fetch', 'document'].includes(req.resourceType())) return;
  const host = new URL(res.url()).host;
  if (!/princess\.com$/.test(host)) return;
  requests.push({ method: req.method(), path: cleanPath(res.url()), status: res.status(), type: req.resourceType() });
});
page.on('requestfailed', (req) => {
  const f = req.failure()?.errorText || 'failed';
  if (f.includes('ERR_ABORTED')) return; // page moved on, or one of our own blocks (listed separately)
  if (/princess\.com$/.test(new URL(req.url()).host)) requests.push({ method: req.method(), path: cleanPath(req.url()), status: f, type: req.resourceType() });
});
const jsErrors = [];
page.on('pageerror', (e) => jsErrors.push(e.message.slice(0, 160)));

// Read one page: headings, fields (filled or empty), error messages, and links to other account pages.
async function readPage() {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  await sleep(1500);
  const raw = await page.evaluate(() => {
    const visible = (e) => !!(e.offsetParent || e.getClientRects().length);
    const labelOf = (e) => (e.labels?.[0]?.innerText || e.getAttribute('aria-label') || e.placeholder || e.name || e.id || '').trim().replace(/\s+/g, ' ').slice(0, 80);
    const fields = [...document.querySelectorAll('input, select, textarea')]
      .filter((e) => visible(e) && !['hidden', 'submit', 'button', 'search'].includes(e.type))
      .map((e) => ({
        label: labelOf(e),
        type: e.tagName === 'SELECT' ? 'select' : e.type || e.tagName.toLowerCase(),
        filled: e.type === 'checkbox' || e.type === 'radio' ? e.checked : !!(e.value && e.value.trim()),
        value: e.type === 'checkbox' || e.type === 'radio' ? '' : (e.value || ''), // used only for redaction
      }));
    const main = document.querySelector('main') || document.body;
    const headings = [...main.querySelectorAll('h1, h2, h3, h4, legend')].filter(visible).map((h) => h.innerText.trim().replace(/\s+/g, ' ')).filter(Boolean).slice(0, 60);
    // Label/value pairs shown as text (not inputs), e.g. "Email: value". Keep the label, note whether a value is shown.
    const shown = [...main.querySelectorAll('dt, th, [class*=label], [class*=Label]')].filter(visible).map((l) => {
      const full = l.innerText.trim().replace(/\s+/g, ' ');
      const i = full.indexOf(':');
      const label = i > 0 ? full.slice(0, i + 1) : full;
      const inline = i > 0 ? full.slice(i + 1).trim() : '';
      const sib = l.nextElementSibling?.innerText?.trim() || '';
      // Some pages put the value beside the label inside the same parent, not right after it.
      const rest = (l.parentElement?.innerText || '').replace(full, '').trim();
      const value = inline || sib || (rest.length < 120 ? rest : '');
      return { label: label.slice(0, 80), filled: !!value, value };
    }).filter((x) => x.label && x.label.length < 60).slice(0, 80);
    const errors = [...document.querySelectorAll('[role=alert], [class*=error], [class*=Error]')].filter(visible).map((e) => e.innerText.trim()).filter((t) => t && t.length < 200);
    const bodyText = main.innerText || '';
    const problems = (bodyText.match(/(something went wrong|unable to (load|retrieve)|try again later|technical difficulties|page not found|error occurred)[^.\n]*/gi) || []).slice(0, 5);
    const links = [...document.querySelectorAll('a[href]')].filter(visible).map((a) => ({ text: a.innerText.trim().replace(/\s+/g, ' ').slice(0, 60), href: a.href }));
    const nav = performance.getEntriesByType('navigation')[0];
    return { title: document.title, headings, fields, shown, errors, problems, links, contentLength: bodyText.replace(/\s+/g, ' ').length,
      usableMs: nav ? Math.round(nav.domContentLoadedEventEnd) : null, loadedMs: nav ? Math.round(nav.loadEventEnd) : null };
  });
  // Typed-in values are always personal. Shown values only when the label is a personal field.
  const personal = /name|birth|date|email|phone|mobile|address|street|city|zip|postal|passport|number|\bid\b|member|wedding|anniversary|country|state|gender|citizen|login|nationality/i;
  for (const f of raw.fields) if (f.value && f.value.trim().length >= 3) secrets.add(f.value.trim());
  // Names are also redacted word by word; other values only whole (so a nearby column header isn't hidden).
  for (const f of raw.shown) if (f.value && personal.test(f.label)) {
    const parts = /name/i.test(f.label) ? [f.value.trim(), ...f.value.split(/\s+/)] : [f.value.trim()];
    for (const part of parts) if (part.length >= 3 && !/^[A-Z][a-z]+$/.test(part) || /name/i.test(f.label) && part.length >= 2) secrets.add(part);
  }
  return raw;
}

// Links that could do something rather than show something are never followed.
const unsafe = /log-?out|sign-?out|login|register|password-reset|cancel|delete|remove|unsubscribe|checkout|cart|pay(ment)?now|submit|confirm|book-?now|addon|purchase|redeem|transfer|print|download|\.pdf/i;
const accountLink = (l) => /book\.princess\.com\/captaincircle\/|princess\.com\/my-princess\/|princess\.com\/cruise-vacation-planning-dashboard\//.test(l.href) && !unsafe.test(l.href + ' ' + l.text) && !l.href.startsWith('javascript:');
const settingsWords = /account settings|profile|personal (info|details)|contact info|my account|preferences|communication|password|security|travel documents|address/i;
// --all crawls every page in the account section (up to 60), not just the settings pages.
const crawlAll = argv.includes('--all');
const wanted = (l) => crawlAll || settingsWords.test(l.text) || settingsWords.test(l.href);

// 1. Account home: find the links into the settings section.
requests = [];
let t = Date.now();
await page.goto(HOME_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
const home = await readPage();
const homeRecord = { name: 'Account home', url: cleanPath(page.url()), ms: Date.now() - t, page: home, requests };
const menu = [...new Map(home.links.filter(accountLink).map((l) => [l.href.split('#')[0], l])).values()];
let targets = menu.filter(wanted);
console.log(`Account home loaded: ${menu.length} account links, ${targets.length} to visit.`);
const LIMIT = crawlAll ? 60 : 20;

// 2. Open the main settings page and add any tabs or sub-pages it links to.
const pages = [];
const seen = new Set([page.url().split('#')[0]]);
for (let i = 0; i < targets.length && pages.length < LIMIT; i++) {
  const l = targets[i];
  const href = l.href.split('#')[0];
  if (seen.has(href)) continue;
  seen.add(href);
  requests = [];
  t = Date.now();
  let status = null;
  try {
    const r = await page.goto(href, { waitUntil: 'domcontentloaded', timeout: 60000 });
    status = r?.status() ?? null;
  } catch (e) { status = e.message.slice(0, 80); }
  const p = await readPage();
  pages.push({ name: l.text || p.title, url: cleanPath(page.url()), status, ms: Date.now() - t, page: p, requests });
  console.log(`${String(status).padEnd(4)} ${(l.text || p.title).padEnd(30)} ${p.fields.length} fields, ${p.headings.length} headings`);
  for (const sub of p.links.filter(accountLink)) {
    if (!seen.has(sub.href.split('#')[0]) && wanted(sub) && !targets.some((x) => x.href.split('#')[0] === sub.href.split('#')[0])) targets.push(sub);
  }
  await sleep(1200);
}
await saveSignIn(context, account);
await browser.close();

// 2b. Open each page again while logged out, to see which ones really need a login.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
async function loggedOut(url) {
  let cur = url;
  for (let i = 0; i < 6; i++) {
    const r = await fetch(cur, { redirect: 'manual', headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30000) }).catch((e) => ({ status: e.message }));
    r.body?.cancel?.().catch(() => {});
    const loc = r.headers?.get('location');
    if (r.status >= 300 && r.status < 400 && loc) { cur = new URL(loc, cur).toString(); continue; }
    const toLogin = /login|account-login/i.test(new URL(cur).pathname);
    return { status: r.status, needsLogin: toLogin, endsAt: cleanPath(cur) };
  }
  return { status: 'redirect-loop', needsLogin: null, endsAt: cleanPath(cur) };
}
for (const rec of [homeRecord, ...pages]) {
  rec.loggedOut = await loggedOut('https://' + rec.url);
  await sleep(300);
}

// 3. Summarise each page and save, with every value redacted.
const summarise = (rec) => {
  const p = rec.page;
  const failed = rec.requests.filter((r) => typeof r.status !== 'number' || r.status >= 400);
  const fields = p.fields.map((f) => ({ label: redact(f.label), type: f.type, filled: f.filled }));
  const shown = p.shown.map((f) => ({ label: redact(f.label), filled: f.filled }));
  const empty = [...fields, ...shown].filter((f) => !f.filled && f.type !== 'checkbox' && f.type !== 'radio').length;
  const okStatus = rec.status == null || rec.status === 200;
  // The browser refusing a response (ORB) only breaks that one widget, so it is a warning, not a page problem.
  const serious = failed.filter((r) => (typeof r.status === 'number' && r.status >= 500) || (typeof r.status !== 'number' && !/ORB/.test(r.status)));
  const state = !okStatus || p.problems.length || serious.length || p.contentLength < 100 ? 'problem'
    : failed.length || p.errors.length ? 'warning' : 'ok';
  return {
    name: redact(rec.name), url: rec.url, status: rec.status ?? 200, state, usableMs: p.usableMs, loadedMs: p.loadedMs,
    loggedOut: rec.loggedOut,
    headings: p.headings.map(redact), fields, shown, emptyFields: empty,
    messages: [...p.problems, ...p.errors].map(redact),
    requests: { total: rec.requests.length, failed: failed.map((r) => `${r.method} ${r.path} → ${r.status}`) },
  };
};
const all = [summarise(homeRecord), ...pages.map(summarise)];
const out = {
  site: 'princess.com',
  account,
  checkedAt: new Date().toISOString(),
  reusedSignIn: reused,
  summary: { pages: all.length, ok: all.filter((p) => p.state === 'ok').length, warning: all.filter((p) => p.state === 'warning').length, problem: all.filter((p) => p.state === 'problem').length },
  menu: menu.map((l) => ({ text: redact(l.text), path: cleanPath(l.href) })),
  pages: all,
  blockedChanges: blocked,
  jsErrors: [...new Set(jsErrors.map(redact))],
};
// Last check: nothing we collected as a value may appear in the output.
let json = JSON.stringify(out, null, 2);
for (const v of secrets) if (v.length >= 3 && json.includes(v)) json = json.split(v).join('•••');
await fs.writeFile(outFile, json);

console.log(`\nDone in ${((Date.now() - started) / 1000).toFixed(0)} s: ${out.summary.ok} ok, ${out.summary.warning} warning, ${out.summary.problem} problem`);
for (const p of all) {
  const lo = p.loggedOut ? (p.loggedOut.needsLogin ? 'login required' : `open to anyone (HTTP ${p.loggedOut.status})`) : '';
  console.log(`${p.state.toUpperCase().padEnd(8)} ${p.name} (HTTP ${p.status}, usable ${p.usableMs != null ? (p.usableMs / 1000).toFixed(1) : '?'} s, ${lo}, ${p.fields.length + p.shown.length} fields, ${p.emptyFields} empty${p.requests.failed.length ? `, ${p.requests.failed.length} failed requests` : ''})`);
  for (const m of p.messages) console.log(`         ! ${m}`);
}
if (blocked.length) console.log(`Blocked ${blocked.length} request(s) that would have changed data.`);
