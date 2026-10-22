import { expect, type Locator, type Page } from '@playwright/test';
import type { Market } from '../test-data/markets';
import type { ConfiguredProduct } from './ProductPage';
import { extractAmountsInCents, quantityPattern } from '../utils/money';

/**
 * Page object for the slide-in cart ("Your Cart" / "Il tuo carrello") that opens
 * after "Add to cart". The drawer markup is in the DOM from page load (empty and
 * hidden), so every locator is filtered to the *visible* instance.
 */
export class CartDrawer {
  readonly root: Locator;
  readonly proceedToCheckoutButton: Locator;

  constructor(
    private readonly page: Page,
    private readonly market: Market,
  ) {
    this.root = page
      .getByRole('dialog')
      .or(page.locator('aside'))
      .filter({ hasText: market.cart.title })
      .filter({ visible: true })
      .first();

    this.proceedToCheckoutButton = this.root
      .getByRole('button', { name: market.cart.proceedToCheckout })
      .or(this.root.getByRole('link', { name: market.cart.proceedToCheckout }))
      .first();
  }

  /** Waits for the drawer to open after adding to cart. */
  async waitForOpen(): Promise<void> {
    await expect(this.root).toBeVisible();
  }

  /** Asserts the cart shows the product we configured, with the right quantity and price. */
  async expectToContain(product: ConfiguredProduct): Promise<void> {
    await expect(this.root).toContainText(product.name);
    await expect(this.root).toContainText(new RegExp(quantityPattern(product.quantity)));

    // The cart is rendered asynchronously; poll until the product price appears.
    await expect
      .poll(async () => extractAmountsInCents(await this.root.innerText()), {
        message: 'cart should show the product price from the product page',
      })
      .toContain(product.totalCents);
  }

  /** Goes to checkout from the drawer. */
  async proceedToCheckout(): Promise<void> {
    await this.proceedToCheckoutButton.click();
  }
}
