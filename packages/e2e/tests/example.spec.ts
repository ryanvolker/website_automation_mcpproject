import { test, expect } from '../fixtures';

test('home page has the expected title', async ({ homePage }) => {
  await homePage.goto();
  expect(await homePage.title()).toMatch(/Playwright/);
});

test('get started link opens the installation page', async ({ homePage, page }) => {
  await homePage.goto();
  await homePage.getStartedLink.click();
  await expect(page.getByRole('heading', { name: 'Installation' })).toBeVisible();
});
