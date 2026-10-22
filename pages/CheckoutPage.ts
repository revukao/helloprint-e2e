import { expect, type Locator, type Page } from '@playwright/test';
import type { Market } from '../test-data/markets';
import type { ConfiguredProduct } from './ProductPage';
import { extractAmountsInCents, quantityPattern } from '../utils/money';

/**
 * Page object for checkout step 1, "Details & Shipping".
 *
 * The test deliberately STOPS here: it only reads the order summary and never
 * fills in the form or clicks "checkout-details-submit", so no order is placed
 * and no payment details are entered.
 */
export class CheckoutPage {
  readonly orderSummary: Locator;
  readonly detailsSubmitButton: Locator;

  constructor(
    private readonly page: Page,
    private readonly market: Market,
  ) {
    const summaryTitle = page.getByText(market.checkout.summaryHeading).filter({ visible: true }).first();
    // The order summary card: innermost visible block holding the title and the product name.
    this.orderSummary = page
      .locator('aside, section, div')
      .filter({ has: summaryTitle })
      .filter({ hasText: market.productName })
      .filter({ visible: true })
      .last();
    this.detailsSubmitButton = page.getByTestId('checkout-details-submit');
  }

  /** Waits for the checkout URL, the details form and the order summary. */
  async waitForLoad(): Promise<void> {
    await this.page.waitForURL(this.market.checkout.url, { waitUntil: 'domcontentloaded' });
    await expect(this.page).toHaveURL(this.market.checkout.url);
    await expect(this.detailsSubmitButton).toBeVisible();
    await expect(this.orderSummary).toBeVisible();
  }

  /** All prices in the order summary, top to bottom, in cents. */
  async summaryAmounts(): Promise<number[]> {
    return extractAmountsInCents(await this.orderSummary.innerText());
  }

  /**
   * Asserts the order summary shows the configured product and that the totals add up.
   * Summary layout (top to bottom): line items (product, extras, shipping) → subtotal → VAT → total.
   */
  async expectOrderSummary(product: ConfiguredProduct): Promise<void> {
    // Product and quantity ("× 250").
    await expect(this.orderSummary).toContainText(product.name);
    await expect(this.orderSummary).toContainText(new RegExp(`×\\s*${quantityPattern(product.quantity)}`));

    // The product price matches the product page.
    await expect.poll(() => this.summaryAmounts()).toContain(product.totalCents);

    const amounts = await this.summaryAmounts();
    expect(amounts.length, 'summary should list items, subtotal, VAT and total').toBeGreaterThanOrEqual(4);

    const total = amounts[amounts.length - 1];
    const vat = amounts[amounts.length - 2];
    const subtotal = amounts[amounts.length - 3];
    const lineItems = amounts.slice(0, -3);

    // Line items (product + extras + shipping) add up to the subtotal.
    const lineItemsSum = lineItems.reduce((sum, amount) => sum + amount, 0);
    expect(lineItemsSum, 'line items + shipping should equal the subtotal').toBe(subtotal);

    // Subtotal + VAT equals the total.
    expect(subtotal + vat, 'subtotal + VAT should equal the total').toBe(total);

    // VAT is the country rate applied to the subtotal (1 cent tolerance for rounding).
    const expectedVat = Math.round(subtotal * this.market.vatRate);
    expect(Math.abs(vat - expectedVat), `VAT should be ${this.market.vatRate * 100}% of the subtotal`).toBeLessThanOrEqual(1);
  }
}