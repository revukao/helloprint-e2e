# Helloprint – Individual Stickers E2E tests

End-to-end tests for the **Individual Stickers** checkout flow on
[helloprint.com](https://www.helloprint.com/en-ie/stickers), written with **Playwright + TypeScript**.

Every test runs in **two storefront languages**:

| Playwright project | Storefront | Product page |
|---|---|---|
| `en-IE` | English (Ireland) | `/en-ie/stickers` |
| `it-IT` | Italian (Italy) | `/it-it/adesivi` (where `/it-it/stickers` redirects) |

## Tests

| File | Test | Tags |
|---|---|---|
| `tests/e2e/checkout.spec.ts` | should show the configured stickers with consistent prices in cart and checkout when a guest orders square stickers with upload later | `@smoke` `@checkout` |
| `tests/e2e/part2-pricing-and-cart.spec.ts` | should recalculate the total price when the print run is changed | `@regression` `@pricing` |
| `tests/e2e/part2-pricing-and-cart.spec.ts` | should keep the product and price in the cart when the cart page is reloaded | `@regression` `@cart` |

3 tests × 2 languages = **6 test runs**. Why I chose the Part 2 tests, and how I would run the
suite in CI/CD, is explained in [TEST-NOTES.md](TEST-NOTES.md).

### Part 1 – checkout flow

1. Open the product page and check it loaded (HTTP status < 400, product heading visible).
2. Configure **Square · 50 x 50 mm · 250 pcs**. The test waits until the price summary shows
   the new configuration, and checks that:
   - the total equals the price on the selected print-run tile,
   - the per-piece price ≈ total ÷ quantity.
3. Choose **Upload later** and add the product to the cart.
4. In the **cart drawer**, check the product name, quantity and price.
5. Open the **cart page** (`/cart`) and check the product, quantity and price again.
6. Go to **checkout** (`/checkout/details`, step "Details & Shipping") and check the
   **order summary**:
   - product name, quantity and product price match the product page,
   - line items + shipping = subtotal,
   - subtotal + VAT = total,
   - VAT is the country rate (23% IE, 22% IT) of the subtotal.
7. **Stop.** No contact, address or payment details are entered, and the
   "Details & Shipping" form is never submitted, so no order is placed.

### Part 2 – extra tests

- **Price recalculation:** configure 250 pcs, change to 500 pcs, and check that the total
  follows the new tile price, is higher in total, and is cheaper per sticker.
- **Cart persistence:** add the product to the cart, then reload the cart page and open it in a
  second tab. Product, quantity and price must still be there.

## Project structure

```
playwright.config.ts          one project per language; retries, traces, screenshots, video
fixtures/test-fixtures.ts     language option, page-object fixtures, setup/teardown
test-data/markets.ts          all language-specific data: URLs, labels, VAT rate, order configuration
pages/ProductPage.ts          configurator, price summary, add to cart
pages/CartDrawer.ts           cart drawer checks, go to cart page
pages/CartPage.ts             cart page checks, go to checkout
pages/CheckoutPage.ts         checkout load and order-summary / totals checks
utils/money.ts                reads prices and quantities in any format (€36.49, 36,49 €, 1.000)
tests/e2e/                    Part 1 and Part 2 specs
TEST-NOTES.md                 Part 2: why these tests, and CI/CD prioritisation
```

## Playwright best practices

- **Stable, user-facing locators:** roles and visible text from the test data, plus
  `data-testid` / `data-value` attributes where the site provides them
  (`proceed-to-checkout`, `checkout-details-submit`, size and print-run options).
  No CSS classes or XPath.
- **No arbitrary sleeps:** web-first assertions, `expect.poll` for asynchronous price updates,
  and `expect(...).toPass()` to retry the first configurator click until the page has finished
  loading its JavaScript.
- **Setup and teardown in fixtures:** the cookie banner is dismissed automatically with
  `page.addLocatorHandler`, third-party analytics and chat scripts are blocked, and cookies and
  storage are cleared after each test.
- **Isolation and parallelism:** every test gets its own browser context, and the languages run
  in parallel as separate projects.
- **Page Object Model:** tests describe *what* happens, and page objects contain *how*.
  Locators are fixed in one place.
- **Debugging:** trace on retry, screenshot and video on failure.
- **Reliable price checks:** prices are compared as whole cents, so different formats
  (€36.49 / 36,49 €) and rounding never cause false results.

## Setup

Requires **Node.js 18+**.

```bash
npm install
npx playwright install chromium
```

## Run

```bash
npm test                  # all tests, both languages
npm run test:en           # English only
npm run test:it           # Italian only
npm run test:smoke        # @smoke: checkout flow (Part 1)
npm run test:regression   # @regression: pricing and cart (Part 2)
npm run test:headed       # with a visible browser
npm run report            # open the HTML report of the last run
```

Interactive mode, useful for debugging:

```bash
npx playwright test --ui
```

**Windows PowerShell:** when you use `--grep` directly, put the tag in quotes, because `@` has a
special meaning in PowerShell:

```powershell
npx playwright test --grep "@smoke"
```

The `npm run` scripts work without quotes.

## HTML report

The Playwright HTML reporter is enabled in `playwright.config.ts`
(`reporter: [['list'], ['html', { open: 'never' }]]`). Every run writes a report to
`playwright-report/`. Open it with:

```bash
npm run report
```

For failed tests, the report includes the error, the failing step, a screenshot and a video,
and a trace on retries.

## Adding a language

1. Add an entry to `test-data/markets.ts` with that storefront's URLs, labels and VAT rate.
2. Add a project to `playwright.config.ts` that passes the new market.

The page objects and specs don't change.

## Notes

- The tests run against the **live production site**, so they depend on its content, prices and
  availability. In a real project they would run against a staging environment.
- Prices on the product page are shown **excluding VAT**. The checkout summary shows the
  subtotal excluding VAT, the VAT, and the total including VAT.