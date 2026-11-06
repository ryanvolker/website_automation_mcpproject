// Phase 3 capture for one page template: accessibility-tree snapshots (desktop 1440 and mobile 390),
// screenshots, hidden states (menus/filters opened then closed with Escape), and the data calls the page makes.
// Usage: node capture-template.mjs <name> <url> [--open "Button A,Button B"] [--wait "<css>"] [--expanders N] [--light]
// Writes to data/sites/princess.com/captures/<name>/ (not in git). Read-only: never clicks apply, submit or book.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
const [name, url] = process.argv.slice(2);
const opt = (k) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : null; };
const toOpen = (opt('open') || '').split(',').map((s) => s.trim()).filter(Boolean);
const waitFor = opt('wait');
// --light: desktop structure + one screenshot only (to confirm extra samples share the template).
// --expanders N: also open the first N collapsed accordions in main.
const light = process.argv.includes('--light');
const expanders = Number(opt('expanders') || 0);
const dir = path.resolve(here, '../../data/sites/princess.com/captures', name);
await fs.mkdir(dir, { recursive: true });
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const unsafe = /^(apply|submit|book|reserve|sign up|log ?in|buy|checkout|continue)/i;

const browser = await chromium.launch();
const summary = { name, url, capturedAt: new Date().toISOString(), views: {} };

async function capture(view, viewport, ua, mobile) {
  const ctx = await browser.newContext({ userAgent: ua, viewport, locale: 'en-US', isMobile: mobile, hasTouch: mobile });
  await ctx.route('**/*', (r) => (['PUT', 'PATCH', 'DELETE'].includes(r.request().method()) ? r.abort() : r.continue()));
  const page = await ctx.newPage();
  const calls = [];
  page.on('response', async (r) => {
    if (!['xhr', 'fetch'].includes(r.request().resourceType())) return;
    const u = new URL(r.url());
    if (!/princess\.com$/.test(u.hostname) || /smetrics|p13n|refer\.|gtm/.test(u.hostname + u.pathname)) return;
    let shape = null;
    try {
      const j = await r.json();
      const first = Array.isArray(j) ? j[0] : (Object.values(j).find(Array.isArray) || [])[0] ?? j;
      shape = { top: Array.isArray(j) ? `array(${j.length})` : Object.keys(j).slice(0, 30), item: first && typeof first === 'object' ? Object.keys(first).slice(0, 60) : null };
    } catch {}
    calls.push({ method: r.request().method(), url: (u.hostname + u.pathname).slice(0, 140), status: r.status(), shape });
  });
  const t0 = Date.now();
  const resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  if (waitFor) await page.locator(waitFor).first().waitFor({ timeout: 45000 }).catch(() => {});
  const readyMs = Date.now() - t0;
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  const cookie = await page.locator('button[aria-label="Close Cookie Banner"]').first().click({ timeout: 3000 }).then(() => true).catch(() => false);
  await page.waitForTimeout(800);
  await fs.writeFile(path.join(dir, `${view}.aria.yml`), await page.locator('body').ariaSnapshot().catch((e) => `error: ${e.message}`));
  await page.screenshot({ path: path.join(dir, `${view}.png`) });
  if (!light) await page.screenshot({ path: path.join(dir, `${view}-full.png`), fullPage: true }).catch(() => {});
  const states = [];
  for (const label of toOpen) {
    if (unsafe.test(label)) { states.push({ label, skipped: 'unsafe label' }); continue; }
    // Controls can be tabs, buttons or links, and collapsed panels prefix their name ("collapsed Filters").
    const re = new RegExp(`^(collapsed |expanded )?${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i');
    let btn = null;
    for (const role of ['tab', 'button', 'combobox', 'link']) {
      const c = page.getByRole(role, { name: re }).first();
      if (await c.isVisible().catch(() => false)) { btn = c; break; }
    }
    if (!btn) { states.push({ label, found: false }); continue; }
    const before = await page.locator('body').ariaSnapshot().catch(() => '');
    await btn.click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1200);
    const after = await page.locator('body').ariaSnapshot().catch(() => '');
    // Keep only what appeared after opening (the panel), not the whole page again.
    const seen = new Set(before.split('\n'));
    const added = after.split('\n').filter((l) => !seen.has(l)).join('\n');
    const f = `${view}.open-${slug(label)}`;
    await fs.writeFile(path.join(dir, `${f}.aria.yml`), added);
    await page.screenshot({ path: path.join(dir, `${f}.png`) });
    states.push({ label, found: true, expanded: await btn.getAttribute('aria-expanded'), addedLines: added.split('\n').length });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(500);
    if (await btn.getAttribute('aria-expanded') === 'true') await btn.click({ timeout: 3000 }).catch(() => {});
    await page.waitForTimeout(500);
  }
  // Open the first N collapsed accordions/expanders inside main (FAQ, "read more"), one at a time.
  if (expanders && !light) {
    const exp = page.locator('main [aria-expanded="false"]:visible');
    const n = Math.min(expanders, await exp.count().catch(() => 0));
    for (let i = 0; i < n; i++) {
      const el = exp.nth(0);
      const label = ((await el.innerText().catch(() => '')) || (await el.getAttribute('aria-label')) || `expander ${i + 1}`).replace(/\s+/g, ' ').trim().slice(0, 60);
      if (unsafe.test(label)) break;
      const before = await page.locator('main').ariaSnapshot().catch(() => '');
      await el.click({ timeout: 4000 }).catch(() => {});
      await page.waitForTimeout(900);
      const after = await page.locator('main').ariaSnapshot().catch(() => '');
      const seen = new Set(before.split('\n'));
      const added = after.split('\n').filter((l) => !seen.has(l)).join('\n');
      await fs.writeFile(path.join(dir, `${view}.expand-${i + 1}.aria.yml`), added);
      states.push({ label, expander: true, addedLines: added.split('\n').length });
    }
  }
  const buttons = await page.$$eval('button', (bs) => [...new Set(bs.filter((b) => b.offsetParent).map((b) => (b.innerText || b.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()).filter(Boolean))].slice(0, 120));
  await fs.writeFile(path.join(dir, `${view}.calls.json`), JSON.stringify(calls, null, 1));
  summary.views[view] = { status: resp?.status(), readyMs, cookieBanner: cookie, states, buttons, calls: calls.length };
  await ctx.close();
}

await capture('desktop', { width: 1440, height: 900 }, UA, false);
if (!light) await capture('mobile', { width: 390, height: 844 }, MOBILE_UA, true);
await browser.close();
await fs.writeFile(path.join(dir, 'summary.json'), JSON.stringify(summary, null, 1));
console.log(JSON.stringify(summary, null, 1));
