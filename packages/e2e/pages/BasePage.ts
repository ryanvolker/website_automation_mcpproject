import { Page } from '@playwright/test';

/** Common helpers shared by every page object. */
export abstract class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(path = '/') {
    await this.page.goto(path);
  }

  async title() {
    return this.page.title();
  }
}
