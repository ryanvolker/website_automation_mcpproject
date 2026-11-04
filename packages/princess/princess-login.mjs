// Logs in to princess.com with the test account in .env and returns a signed-in browser context.
// The sign-in is saved in .auth/princess.json (git-ignored) and reused until it expires.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const here = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(here, '../..');
const stateFile = path.join(repoRoot, '.auth', 'princess.json');
export const BASE = 'https://www.princess.com';
const LOGIN_URL = `${BASE}/my-princess/account-login/`;
export const HOME_URL = 'https://book.princess.com/captaincircle/myPrincess.page';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

export function loadCredentials() {
  try { process.loadEnvFile(path.join(repoRoot, '.env')); } catch { /* no .env file */ }
  const loginId = process.env.PRINCESS_LOGIN_ID;
  const password = process.env.PRINCESS_PASSWORD;
  if (!loginId || !password) {
    throw new Error('Missing PRINCESS_LOGIN_ID or PRINCESS_PASSWORD. Copy .env.example to .env at the repo root and fill them in.');
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
export async function signedInContext({ headed = false, fresh = false } = {}) {
  const creds = loadCredentials();
  const browser = await chromium.launch({ headless: !headed });
  const opts = { userAgent: UA, viewport: { width: 1440, height: 900 }, locale: 'en-US' };
  const saved = !fresh && (await fs.access(stateFile).then(() => true, () => false));
  let context = await browser.newContext(saved ? { ...opts, storageState: stateFile } : opts);
  let page = await context.newPage();
  if (saved && (await isSignedIn(page))) return { browser, context, page, reused: true };
  if (saved) { await context.close(); context = await browser.newContext(opts); page = await context.newPage(); }
  await logIn(page, creds, { headed });
  // Let the landing page finish setting its cookies before saving the sign-in.
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {});
  await saveSignIn(context);
  return { browser, context, page, reused: false };
}

// Save the current sign-in so the next run can reuse it. Call again at the end of a run to keep it fresh.
export async function saveSignIn(context) {
  await fs.mkdir(path.dirname(stateFile), { recursive: true });
  await context.storageState({ path: stateFile });
}
