import { defineConfig, devices } from '@playwright/test';
import type { TestOptions } from './fixtures/test-fixtures';
import { markets } from './test-data/markets';

/**
 * Playwright configuration.
 *
 * Each storefront language is a separate Playwright *project*. The project passes
 * the market's test data (URLs, UI labels, number formats) into the tests through
 * the `market` option fixture, so the exact same spec runs once per language.
 */
export default defineConfig<TestOptions>({
  testDir: './tests',
  // Each test gets its own browser context, so tests can safely run in parallel.
  fullyParallel: true,
  // Fail the CI build if `test.only` is left in the code.
  forbidOnly: !!process.env.CI,
  // Live third-party site: retry on CI to absorb network flakiness, never locally.
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: 'https://www.helloprint.com',
    // Debug artefacts are only kept when something goes wrong.
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
 
    // English storefront (Ireland).
    {
      name: 'en-IE',
      testDir: './tests/e2e',
      use: {
        ...devices['Desktop Chrome'],
        locale: 'en-IE',
        timezoneId: 'Europe/Dublin',
        market: markets.enIE,
      },
    },
    // Italian storefront (Italy).
    {
      name: 'it-IT',
      testDir: './tests/e2e',
      use: {
        ...devices['Desktop Chrome'],
        locale: 'it-IT',
        timezoneId: 'Europe/Rome',
        market: markets.itIT,
      },
    },
  ],
});
