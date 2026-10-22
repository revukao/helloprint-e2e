   import { test, expect } from '../../fixtures/test-fixtures';
   import type { ConfiguredProduct } from '../../pages/ProductPage';
/**
 * End-to-end checkout flow for "Individual Stickers".
 *
 * Runs once per storefront language (Playwright projects "en-IE" and "it-IT").
 * Setup/teardown (cookie banner, third-party blocking, clean session) is handled
 * by the auto fixture in fixtures/test-fixtures.ts.
 *
 * The flow stops on the checkout page, BEFORE any address or payment details.
 */
test.describe('Individual Stickers — checkout flow', () => {
 test('should show the configured stickers with consistent prices in cart and checkout when a guest orders square stickers with upload later', { tag: ['@smoke', '@checkout'] }, async ({
    page,
    market,
    stickerOrder,
    productPage,
    cartDrawer,
    cartPage,
    checkoutPage,
  }) => {
    let configured!: ConfiguredProduct;

    // 1. Open the product page and make sure it loaded without an HTTP error.
    await test.step('Open the Individual Stickers product page', async () => {
      const response = await productPage.goto();
      expect(response?.status(), 'product page HTTP status').toBeLessThan(400);
      await expect(page).toHaveTitle(/helloprint/i);
    });

    // 2. Configure shape, size and quantity; the price summary must update to match.
    await test.step(`Configure ${stickerOrder.quantity} × ${stickerOrder.shape} ${stickerOrder.size}`, async () => {
      configured = await productPage.configure(stickerOrder);

      // The summary total equals the price on the chosen print-run tile...
      expect(configured.totalCents).toBe(configured.printRunPriceCents);

      // ...and the per-piece price is the total divided by the quantity (site rounds to cents).
      if (configured.perPieceCents !== undefined) {
        const expectedPerPiece = configured.totalCents / configured.quantity;
        expect(Math.abs(configured.perPieceCents - expectedPerPiece)).toBeLessThanOrEqual(1);
      }
    });

    // 3. Add to cart (without uploading artwork) and verify the cart contents.
    await test.step('Add the product to the cart', async () => {
      await productPage.addToCart();
      await cartDrawer.waitForOpen();
      await cartDrawer.expectToContain(configured);
    });

   // 4. Open the full cart page and verify it shows the same product, quantity and price.
      await test.step('Open the cart page and verify its contents', async () => {
        await cartDrawer.proceedToCheckout();
        await cartPage.waitForLoad();
        await cartPage.expectToContain(configured);
      });

      // 5. Proceed to checkout and verify the order summary. Stop before payment.
      await test.step('Proceed to checkout and verify the order summary', async () => {
        await cartPage.proceedToCheckout();
        await checkoutPage.waitForLoad();
        await checkoutPage.expectOrderSummary(configured);
      });
  });
});
