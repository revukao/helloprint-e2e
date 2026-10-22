import { expect, type Locator, type Page } from '@playwright/test';
import type { Market } from '../test-data/markets';
import type { ConfiguredProduct } from './ProductPage';
import { extractAmountsInCents, quantityPattern } from '../utils/money';

/**
 * Page object for the cart page (/en-ie/cart), shown after
 * "Proceed to Checkout" in the cart drawer.
 */
export class CartPage {
  readonly content: Locator;
  readonly proceedToCheckoutButton: Locator;

  constructor(
    private readonly page: Page,
    private readonly market: Market,
  ) {
    this.content = page.locator('body');
    this.proceedToCheckoutButton = page.getByTestId('proceed-to-checkout').filter({ visible: true }).first();
  }

  /** Waits for the cart page URL and the checkout button. */
  async waitForLoad(): Promise<void> {
    await this.page.waitForURL(this.market.cart.pageUrl);
    await expect(this.proceedToCheckoutButton).toBeVisible();
  }

  /** Asserts the cart page shows the configured product, quantity and price. */
  async expectToContain(product: ConfiguredProduct): Promise<void> {
    await expect(this.content).toContainText(product.name);
    await expect(this.content).toContainText(new RegExp(quantityPattern(product.quantity)));
    await expect
      .poll(async () => extractAmountsInCents(await this.content.innerText()), {
        message: 'cart page should show the product price from the product page',
      })
      .toContain(product.totalCents);
  }

  /** Continues from the cart page to checkout. */
  async proceedToCheckout(): Promise<void> {
    await this.proceedToCheckoutButton.click();
  }
}