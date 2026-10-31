// Maps one web page into JSON: nav, forms (with every option), buttons,
// links and content sections, plus an ARIA snapshot and a screenshot.
//
// Usage: node map-page.mjs <url> <outDir> [name]
//   e.g. node map-page.mjs https://www.princess.com/ ../../data/sites/princess.com home

import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const [url, outDirArg, name = 'home'] = process.argv.slice(2);
if (!url || !outDirArg) {
  console.error('Usage: node map-page.mjs <url> <outDir> [name]');
  process.exit(1);
}
const outDir = path.resolve(outDirArg);

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36',
  locale: 'en-US',
});
const page = await context.newPage();
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});

// Scroll to the bottom so lazy-loaded sections render.
await page.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 600) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 150));
  }
  window.scrollTo(0, 0);
});
await page.waitForTimeout(1500);

const data = await page.evaluate(() => {
  const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' && st.display !== 'none';
  };
  const labelFor = (el) => {
    if (el.id) {
      const l = document.querySelector(`label[for="${CSS.escape(el.id)}"]`);
      if (l) return clean(l.innerText);
    }
    const wrap = el.closest('label');
    if (wrap) return clean(wrap.innerText);
    return clean(el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.title);
  };
  // A CSS selector that should find this element again. Prefers stable attributes.
  const selectorFor = (el) => {
    const tag = el.tagName.toLowerCase();
    for (const a of ['data-testid', 'data-test', 'data-qa', 'id', 'name', 'aria-label']) {
      const v = el.getAttribute(a);
      if (v && !/^\d|[:\s]{2,}/.test(v) && v.length < 80) {
        return a === 'id' ? `#${CSS.escape(v)}` : `${tag}[${a}="${v.replace(/"/g, '\\"')}"]`;
      }
    }
    return null;
  };
  const section = (el) => {
    const s = el.closest('header, nav, footer, main section, [role=dialog], form, aside');
    if (!s) return null;
    return s.tagName.toLowerCase() + (s.id ? `#${s.id}` : '') + (s.getAttribute('aria-label') ? `[${s.getAttribute('aria-label')}]` : '');
  };
  const abs = (h) => { try { return new URL(h, location.href).href; } catch { return h; } };
  // Text of the smallest "card" around an element, so generic links like
  // "VIEW CRUISES" can be tied to the offer or ship they belong to.
  const context = (el) => {
    const own = clean(el.innerText);
    let c = el.parentElement;
    while (c && c !== document.body) {
      const t = clean(c.innerText);
      if (t.length > own.length + 15) return t.length > 300 ? t.slice(0, 300) + '…' : t;
      c = c.parentElement;
    }
    return null;
  };

  const links = [...document.querySelectorAll('a[href]')].map((a) => ({
    text: clean(a.innerText) || clean(a.getAttribute('aria-label')) || clean(a.title),
    href: abs(a.getAttribute('href')),
    visible: visible(a),
    region: section(a),
    selector: selectorFor(a),
    context: a.closest('nav, header, footer') ? undefined : context(a),
  })).filter((l) => l.text || l.href);

  const buttons = [...document.querySelectorAll('button, [role=button], input[type=submit], input[type=button]')].map((b) => ({
    text: clean(b.innerText || b.value) || clean(b.getAttribute('aria-label')),
    visible: visible(b),
    expanded: b.getAttribute('aria-expanded'),
    controls: b.getAttribute('aria-controls'),
    region: section(b),
    selector: selectorFor(b),
  })).filter((b) => b.text);

  const fields = [...document.querySelectorAll('select, input:not([type=hidden]), textarea')].map((f) => ({
    tag: f.tagName.toLowerCase(),
    type: f.type || null,
    label: labelFor(f),
    name: f.name || null,
    id: f.id || null,
    visible: visible(f),
    region: section(f),
    selector: selectorFor(f),
    form: f.form ? (f.form.id || f.form.getAttribute('name') || f.form.action || 'form') : null,
    options: f.tagName === 'SELECT'
      ? [...f.options].map((o) => ({ value: o.value, text: clean(o.text), group: o.parentElement.tagName === 'OPTGROUP' ? o.parentElement.label : undefined }))
      : undefined,
  }));

  const headings = [...document.querySelectorAll('h1, h2, h3')].filter(visible).map((h) => ({
    level: Number(h.tagName[1]),
    text: clean(h.innerText),
  })).filter((h) => h.text);

  const navs = [...document.querySelectorAll('nav, [role=navigation]')].map((n) => ({
    label: clean(n.getAttribute('aria-label')) || n.id || null,
    links: [...n.querySelectorAll('a[href]')].map((a) => ({ text: clean(a.innerText) || clean(a.getAttribute('aria-label')), href: abs(a.getAttribute('href')) })).filter((l) => l.text),
  })).filter((n) => n.links.length);

  return {
    title: document.title,
    finalUrl: location.href,
    metaDescription: document.querySelector('meta[name=description]')?.content || null,
    headings, navs, fields, buttons, links,
  };
});

const aria = await page.locator('body').ariaSnapshot().catch((e) => `# ariaSnapshot failed: ${e.message}`);

await fs.mkdir(outDir, { recursive: true });
await page.screenshot({ path: path.join(outDir, `${name}.png`) });
await fs.writeFile(path.join(outDir, `${name}.raw.json`), JSON.stringify({ url, capturedAt: new Date().toISOString(), ...data }, null, 2));
await fs.writeFile(path.join(outDir, `${name}.aria.yml`), aria);

console.log(`Mapped ${url}`);
console.log(`  ${data.links.length} links, ${data.buttons.length} buttons, ${data.fields.length} fields, ${data.navs.length} navs`);
console.log(`  Wrote ${path.join(outDir, name)}.{raw.json,aria.yml,png}`);
await browser.close();
