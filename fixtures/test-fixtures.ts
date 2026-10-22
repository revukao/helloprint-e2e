import { test as base, expect } from '@playwright/test';
import { markets, type Market, type StickerOrder } from '../test-data/markets';
import { ProductPage } from '../pages/ProductPage';
import { CartDrawer } from '../pages/CartDrawer';
import { CheckoutPage } from '../pages/CheckoutPage';
import { CartPage } from '../pages/CartPage';

/** Options set per project in playwright.config.ts. */
export type TestOptions = {
  /** Storefront language under test. */
  market: Market;
  /** Abort analytics/ads/chat requests to make the live site faster and less flaky. */
  blockThirdParty: boolean;
};

type Fixtures = {
  /** Product configuration to order for the current market. */
  stickerOrder: StickerOrder;
  productPage: ProductPage;
  cartDrawer: CartDrawer;
  cartPage: CartPage;
  checkoutPage: CheckoutPage;
  /** Automatic setup/teardown that runs for every test. */
  sessionSetup: void;
};

/** Third-party hosts that don't affect the checkout flow. */
const THIRD_PARTY_HOSTS = [
  'googletagmanager.com',
  'google-analytics.com',
  'doubleclick.net',
  'facebook.net',
  'hotjar.com',
  'clarity.ms',
  'bing.com',
  'tiktok.com',
  'linkedin.com',
  'trustpilot.com',
  'sentry.io',
];

export const test = base.extend<TestOptions & Fixtures>({
  // Option fixtures: overridden per project, defaults keep `npx playwright test file` usable.
  market: [markets.enIE, { option: true }],
  blockThirdParty: [true, { option: true }],

  stickerOrder: async ({ market }, use) => {
    // Copy so a test can't accidentally mutate shared test data.
    await use({ ...market.order });
  },

  /**
   * SETUP (before each test):
   *  1. Block noisy third-party requests.
   *  2. Register a locator handler that dismisses the cookie banner whenever it
   *     appears and blocks an action — no fixed waits or "if visible" checks needed.
   *
   * TEARDOWN (after each test):
   *  - Clear cookies and storage so the server-side cart session is dropped.
   *    Playwright already gives every test a fresh browser context; this makes
   *    the clean state explicit. No order is ever placed by these tests.
   */
  sessionSetup: [
    async ({ page, context, market, blockThirdParty }, use) => {
      if (blockThirdParty) {
        await context.route(
          (url) => THIRD_PARTY_HOSTS.some((host) => url.hostname.endsWith(host)),
          (route) => route.abort(),
        );
      }

      await page.addLocatorHandler(
        page.getByRole('button', { name: market.cookies.acceptAll }),
        async (acceptButton) => {
          await acceptButton.click();
        },
      );

      await use();

      await context.clearCookies();
      await page.evaluate(() => {
        try {
          window.localStorage.clear();
          window.sessionStorage.clear();
        } catch {
          /* page may already be closed or on about:blank */
        }
      }).catch(() => undefined);
    },
    { auto: true },
  ],

  productPage: async ({ page, market }, use) => {
    await use(new ProductPage(page, market));
  },

  cartDrawer: async ({ page, market }, use) => {
    await use(new CartDrawer(page, market));
  },

  cartPage: async ({ page, market }, use) => {
    await use(new CartPage(page, market));
  },

  checkoutPage: async ({ page, market }, use) => {
    await use(new CheckoutPage(page, market));
  },
});

export { expect };
