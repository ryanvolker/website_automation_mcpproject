// One-time setup: creates the reusable princess.com test account and saves its login in .env.
// Usage: node create-test-account.mjs [--dry-run]
// Copies date of birth and address from the main account's profile (in memory only, never printed or saved),
// uses the name "Ryan Test", leaves all marketing and SMS boxes unticked, and does not copy phone numbers.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { chromium } from 'playwright';
import { signedInContext, repoRoot } from './princess-login.mjs';

const dryRun = process.argv.includes('--dry-run');
const envFile = path.join(repoRoot, '.env');
const TEST_EMAIL = (await fs.readFile(path.join(repoRoot, '.env'), 'utf8')).match(/^PRINCESS_TEST_LOGIN_ID=(.+)$/m)?.[1]?.trim();
if (!TEST_EMAIL) throw new Error('Set PRINCESS_TEST_LOGIN_ID in .env first (the email to sign up with).');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

const env = await fs.readFile(envFile, 'utf8');
// If an earlier attempt saved a login but the sign-up failed, --retry reuses that same login.
const retry = process.argv.includes('--retry');
const savedPw = env.match(/^PRINCESS_TEST_PASSWORD=(.+)$/m)?.[1]?.trim();
if (savedPw && !retry) throw new Error('A test account is already saved in .env. Use --retry only if the earlier sign-up failed.');

// 1. Read the details we need from the main account's profile.
const main = await signedInContext({ account: 'main' });
await main.page.goto('https://book.princess.com/captaincircle/contactDetails.page', { waitUntil: 'domcontentloaded' });
await main.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
const p = await main.page.evaluate(() => {
  const v = (id) => document.getElementById(id)?.value?.trim() || '';
  return { title: v('prefix'), month: v('dobMonth'), day: v('dobDay'), year: v('dobYear'), address1: v('address1'), city: v('city'), state: v('stateselect') || v('state'), zip: v('zip') };
});
await main.browser.close();
const missing = Object.entries(p).filter(([, x]) => !x).map(([k]) => k);
if (missing.length) throw new Error(`Could not read from the profile: ${missing.join(', ')}`);
console.log('Read title, date of birth and address from the main profile (values not shown).');

// 2. Make a strong password and save the login before submitting, so it can't be lost.
const password = savedPw || `Pt${crypto.randomBytes(9).toString('base64url').replace(/[-_]/g, 'x')}!7a`;
if (!dryRun && !savedPw) {
  await fs.writeFile(envFile, env.replace(/\s*$/, '') + `\n\n# princess.com reusable test account (created ${new Date().toISOString().slice(0, 10)})\nPRINCESS_TEST_LOGIN_ID=${TEST_EMAIL}\nPRINCESS_TEST_PASSWORD=${password}\n`);
  console.log('Saved the test login in .env.');
}

// 3. Fill in the sign-up form in a fresh, logged-out browser.
const browser = await chromium.launch();
const ctx = await browser.newContext({ userAgent: UA, viewport: { width: 1440, height: 900 }, locale: 'en-US' });
const page = await ctx.newPage();
await page.goto('https://www.princess.com/my-princess/create-account/', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
await page.locator('button[aria-label="Close Cookie Banner"], button:has-text("Close Cookie Banner")').first().click({ timeout: 3000 }).catch(() => {});

// Pick a dropdown option whose value or text matches (numbers compared as numbers).
async function pick(select, want) {
  const opts = await select.locator('option').evaluateAll((os) => os.map((o) => ({ value: o.value, text: o.textContent.trim() })));
  const norm = (s) => String(s).toLowerCase().replace(/\.$/, '').trim();
  const hit = opts.find((o) => o.value && (norm(o.value) === norm(want) || norm(o.text) === norm(want) || (/^\d+$/.test(want) && Number(o.value) === Number(want)) || (/^\d+$/.test(want) && Number(o.text) === Number(want))));
  if (!hit) throw new Error(`No dropdown option matches the profile value for ${await select.getAttribute('aria-label') || await select.getAttribute('name')}`);
  await select.selectOption(hit.value);
}
const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];

await page.locator('#contactEmail').fill(TEST_EMAIL);
await page.locator('#password').fill(password);
await pick(page.locator('select[name=title]'), p.title);
await page.locator('#firstName').fill('Ryan');
await page.locator('#lastName').fill('Test');
const monthSel = page.locator('select[aria-label="Birthday Month selection"]');
await pick(monthSel, p.month).catch(() => pick(monthSel, months[Number(p.month) - 1]));
await pick(page.locator('select[aria-label="Birthday Day selection"]'), p.day);
await pick(page.locator('select[aria-label="Birthday Year selection"]'), p.year);
await page.locator('#address1').fill(p.address1);
await page.locator('#city').fill(p.city);
await pick(page.locator('select[name=state]'), p.state);
await page.locator('#zip').fill(p.zip);
await page.keyboard.press('Tab');
// Close an address-suggestion popup if one appears.
await page.locator('[role=listbox]').first().waitFor({ timeout: 1500 }).then(() => page.keyboard.press('Escape')).catch(() => {});

// Required question "Have you cruised before?" (the owner has sailed with Princess).
await page.locator('input[type=radio][name="Have you cruised before?"]').first().check({ force: true });

// Make sure no marketing or SMS box is ticked.
for (const box of await page.locator('input[type=checkbox]').all()) if (await box.isChecked()) await box.uncheck({ force: true }).catch(() => {});
const ticked = await page.locator('input[type=checkbox]:checked').count();
console.log(`Form filled. Ticked boxes: ${ticked}.`);

if (dryRun) {
  const r = await page.evaluate(() => [...document.querySelectorAll('input,select')].filter((e) => e.offsetParent && (e.required || e.getAttribute('aria-required') === 'true')).map((e) => `${e.getAttribute('aria-label') || e.name || e.id}: ${e.value ? 'filled' : 'EMPTY'}`));
  console.log(r.join('\n')); console.log('Dry run: not submitting.'); await browser.close(); process.exit(0); }

// 4. Submit once and report what happened (page headings and messages only).
const before = page.url();
// Record the replies to the sign-up request (status and a short, redacted body) to see why it fails.
const replies = [];
page.on('response', async (res) => {
  const r = res.request();
  if (r.method() !== 'POST' || !/princess.com/.test(new URL(res.url()).host) || /ingest|consent|oyJJc|collect|analytics/.test(res.url())) return;
  let body = ''; try { body = (await res.text()).slice(0, 300); } catch {}
  replies.push({ url: new URL(res.url()).host + new URL(res.url()).pathname, status: res.status(), body: body.replace(/[w.+-]+@[w-]+.[w.]+/g, '•••') });
});
await page.locator('button[type=submit]:has-text("CREATE ACCOUNT")').click();
await page.waitForURL((u) => u.toString() !== before, { timeout: 45000 }).catch(() => {});
await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2000);
const result = await page.evaluate(() => ({
  url: location.href.split('?')[0],
  headings: [...document.querySelectorAll('h1,h2,h3')].filter((h) => h.offsetParent).map((h) => h.innerText.trim()).filter(Boolean).slice(0, 8),
  invalid: [...document.querySelectorAll('[aria-invalid=true], :invalid')].filter((e) => e.matches('input,select,textarea')).map((e) => e.getAttribute('aria-label') || e.name || e.id),
  errorNear: [...document.querySelectorAll('[role=alert], [class*=rror]')].filter((e) => e.offsetParent && /required/i.test(e.innerText)).map((e) => { let n = e; for (let i = 0; i < 4 && n; i++) { n = n.parentElement; const f = n?.querySelector('input,select,textarea'); if (f) return f.getAttribute('aria-label') || f.name || f.id; } return '?'; }),
  errors: [...document.querySelectorAll('[role=alert], [class*=rror]')].filter((e) => e.offsetParent).map((e) => e.innerText.trim()).filter((t) => t && t.length < 200).slice(0, 8),
}));
console.log(JSON.stringify(result, null, 2));
console.log(JSON.stringify(replies, null, 2));
await browser.close();
