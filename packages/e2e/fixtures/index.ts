import { test as base } from '@playwright/test';
import { HomePage } from '../pages/HomePage';

type Pages = {
  homePage: HomePage;
};

/** Use this `test` in spec files to get page objects injected automatically. */
export const test = base.extend<Pages>({
  homePage: async ({ page }, use) => {
    await use(new HomePage(page));
  },
});

export { expect } from '@playwright/test';
