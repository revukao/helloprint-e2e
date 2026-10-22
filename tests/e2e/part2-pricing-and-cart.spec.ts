import { test, expect } from '../../fixtures/test-fixtures';
   import type { ConfiguredProduct } from '../../pages/ProductPage';
   import { CartPage } from '../../pages/CartPage';

/**
 * Part 2 — extra tests for important e-commerce risks next to the checkout flow:
 *  - pricing integrity (the total follows the selected print run)
 *  - cart persistence (the cart survives a reload and a new tab)
 *
 * Runs once per storefront language (Playwright projects "en-IE" and "it-IT").
 * See TEST-NOTES.md for why these tests were chosen and how to run them in CI/CD.
 */
test.describe('Individual Stickers — pricing and cart', () => {
  // Pricing integrity: the total must follow the selected print run.
  test('should recalculate the total price when the print run is changed', { tag: ['@regression', '@pricing'] }, async ({
    stickerOrder,
    productPage,
  }) => {
    // Setup: start from the same configuration as the checkout test.
    await productPage.goto();
    const initial = await productPage.configure(stickerOrder);

    // Change only the quantity; the summary must follow the new tile price.
    await test.step(`Change print run to ${stickerOrder.alternativeQuantity}`, async () => {
      const newTilePrice = await productPage.selectPrintRun(stickerOrder.alternativeQuantity);

      await expect(productPage.summaryLine(stickerOrder.alternativeQuantity)).toBeVisible();
      await expect
        .poll(() => productPage.readTotalCents(stickerOrder.alternativeQuantity))
        .toBe(newTilePrice);

      // A larger print run costs more in total but less per sticker.
      expect(newTilePrice).toBeGreaterThan(initial.totalCents);
      expect(newTilePrice / stickerOrder.alternativeQuantity).toBeLessThan(initial.totalCents / initial.quantity);
    });
  });

  // Cart persistence: the cart must survive a reload and a new tab.
  test('should keep the product and price in the cart when the cart page is reloaded', { tag: ['@regression', '@cart'] }, async ({
    page,
    market,
    stickerOrder,
    productPage,
    cartDrawer,
    cartPage,
  }) => {
    let configured!: ConfiguredProduct;

    // 1. Setup: put a configured product in the cart and open the cart page.
    await test.step('Add configured stickers to the cart', async () => {
      await productPage.goto();
      configured = await productPage.configure(stickerOrder);
      await productPage.addToCart();
      await cartDrawer.waitForOpen();
      await cartDrawer.proceedToCheckout();
      await cartPage.waitForLoad();
      await cartPage.expectToContain(configured);
    });

    // 2. A page reload must not empty the cart or change the price.
    await test.step('Reload the cart page', async () => {
      await page.reload({ waitUntil: 'domcontentloaded' });
      await cartPage.waitForLoad();
      await cartPage.expectToContain(configured);
    });

    // 3. A second tab shares the session, so it must show the same cart.
    await test.step('Open the cart in a new tab', async () => {
      const secondTab = await page.context().newPage();
      await secondTab.goto(page.url(), { waitUntil: 'domcontentloaded' });
      const cartInSecondTab = new CartPage(secondTab, market);
      await cartInSecondTab.waitForLoad();
      await cartInSecondTab.expectToContain(configured);
      await secondTab.close();
    });
  });
});