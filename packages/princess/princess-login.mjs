// Logs in to princess.com with the test account in .env and returns a signed-in browser context.
// The sign-in is saved in .auth/princess.json (git-ignored) and reused until it expires.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, '../..');
// Each account has its own saved sign-in: .auth/princess-<account>.json
const stateFileFor = (account) => path.join(repoRoot, '.auth', `princess-${account}.json`);
export const BASE = 'https://www.princess.com';
const LOGIN_URL = `${BASE}/my-princess/account-login/`;
export const HOME_URL = 'https://book.princess.com/captaincircle/myPrincess.page';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

// Account "main" uses PRINCESS_LOGIN_ID / PRINCESS_PASSWORD.
// Any other account, e.g. "test", uses PRINCESS_TEST_LOGIN_ID / PRINCESS_TEST_PASSWORD.
export function loadCredentials(account = 'main') {
  try { process.loadEnvFile(path.join(repoRoot, '.env')); } catch { /* no .env file */ }
  const prefix = account === 'main' ? 'PRINCESS' : `PRINCESS_${account.toUpperCase()}`;
  const loginId = process.env[`${prefix}_LOGIN_ID`];
  const password = process.env[`${prefix}_PASSWORD`];
  if (!loginId || !password) {
    throw new Error(`Missing ${prefix}_LOGIN_ID or ${prefix}_PASSWORD in .env at the repo root.`);
  }
  return { loginId, password };
}

const onLoginPage = (url) => /\/(account-login|login)(\/|\.page|$)/i.test(new URL(url).pathname);

// Opens the account home page and returns true if we are signed in.
async function isSignedIn(page) {
  await page.goto(HOME_URL, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  return !onLoginPage(page.url());
}

async function logIn(page, { loginId, password }, { headed }) {
  await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  // Close the cookie banner if it covers the form.
  await page.locator('button:has-text("Accept"), button:has-text("Got it")').first().click({ timeout: 3000 }).catch(() => {});
  await page.locator('#loginId').fill(loginId);
  await page.locator('#password').fill(password);
  await page.locator('button[type=submit]:has-text("LOG IN")').click();
  // In a visible browser, allow time to type a verification code or solve a challenge by hand.
  const wait = headed ? 180000 : 30000;
  await page.waitForURL((u) => !onLoginPage(u.toString()), { timeout: wait }).catch(() => {});
  if (onLoginPage(page.url())) {
    const msg = await page.locator('[role=alert], .error, [class*=error]').allInnerTexts().catch(() => []);
    const text = msg.map((t) => t.trim()).filter(Boolean).join(' | ').slice(0, 200);
    throw new Error(`Login did not complete. ${text ? `The page said: "${text}". ` : ''}If the site is asking for a code or a challenge, run again with --headed and finish it in the browser window.`);
  }
}

// Returns { browser, context, page, reused } with a signed-in session.
export async function signedInContext({ account = 'main', headed = false, fresh = false } = {}) {
  const creds = loadCredentials(account);
  const stateFile = stateFileFor(account);
  const browser = await chromium.launch({ headless: !headed });
  const opts = { userAgent: UA, viewport: { width: 1440, height: 900 }, locale: 'en-US' };
  const saved = !fresh && (await fs.access(stateFile).then(() => true, () => false));
  let context = await browser.newContext(saved ? { ...opts, storageState: stateFile } : opts);
  let page = await context.newPage();
  if (saved && (await isSignedIn(page))) return { browser, context, page, reused: true, creds };
  if (saved) { await context.close(); context = await browser.newContext(opts); page = await context.newPage(); }
  await logIn(page, creds, { headed });
  // Let the landing page finish setting its cookies before saving the sign-in.
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await saveSignIn(context, account);
  return { browser, context, page, reused: false, creds };
}

// Save the current sign-in so the next run can reuse it. Call again at the end of a run to keep it fresh.
export async function saveSignIn(context, account = 'main') {
  const stateFile = stateFileFor(account);
  await fs.mkdir(path.dirname(stateFile), { recursive: true });
  await context.storageState({ path: stateFile });
}
