# Test notes

## Tests in this suite

| # | Test | File | Tags |
|---|------|------|------|
| 1 | should show the configured stickers with consistent prices in cart and checkout when a guest orders square stickers with upload later | `tests/e2e/checkout.spec.ts` (Part 1) | `@smoke` `@checkout` |
| 2 | should recalculate the total price when the print run is changed | `tests/e2e/part2-pricing-and-cart.spec.ts` (Part 2) | `@regression` `@pricing` |
| 3 | should keep the product and price in the cart when the cart page is reloaded | `tests/e2e/part2-pricing-and-cart.spec.ts` (Part 2) | `@regression` `@cart` |

Every test runs in two storefront languages: English (en-IE) and Italian (it-IT).

## Why did I choose these tests?

For an e-commerce site, the most important things are that **customers can buy**, that they
**pay the right price**, and that **nothing they chose gets lost** on the way to payment.
Part 1 already covers the happy path to checkout. For Part 2 I chose the two risks that sit
right next to it.

### Test 2: price recalculation (pricing integrity)

- Helloprint's prices are not fixed: they are recalculated on every change of shape,
  size, material and print run. That is complex logic, which makes it a high-risk area.
- A pricing bug has a direct business impact. Too high, and customers leave. Too low,
  and the company loses money on every order. It also damages trust if the price changes
  between the product page and checkout.
- The test changes the print run (250 → 500) and checks that:
  - the total follows the price shown on the selected tile,
  - a bigger print run costs more in total,
  - but less per sticker (volume discount logic).
- It catches regressions in the price API and in the front end showing a stale price.
  This is the kind of bug a happy-path test can miss, because the happy path only checks
  one configuration.

### Test 3: cart persistence (session reliability)

- A cart that "forgets" its items is one of the most common causes of abandoned orders.
  Customers reload pages, open new tabs, and compare products before they buy.
- The test adds a configured product, then reloads the cart page and opens the cart in a
  second tab. In both cases the product, quantity and price must still be there.
- It covers the cart/session layer (cookies, server-side cart, caching). That layer often
  breaks during infrastructure changes such as CDN, cache or session-store updates, not
  only after code changes.

### What I deliberately did not test

- **Placing a real order or entering payment details.** This is a live production shop, so
  submitting fake orders or personal data would be inappropriate. In a real project this
  would run against a test environment with test payment cards.
- **Checkout form validation.** It is valuable (it prevents bad orders), and it would be my
  next candidate. I left it out to keep the suite small and focused.

## How would I prioritize them in a real CI/CD pipeline?

| Stage | When | What runs | Goal |
|-------|------|-----------|------|
| **Pull request** | Every PR | `@smoke` (test 1), English only | Fast feedback (≈1 min); block the merge if the buying flow is broken |
| **Main branch / pre-release** | After merge, before deploy to production | Full suite (`@smoke` + `@regression`), all languages, on staging | Catch pricing and cart regressions before customers see them |
| **Post-deploy smoke** | Right after every production deploy | `@smoke`, all languages | Verify the release in the real environment; trigger a rollback if it fails |
| **Scheduled monitoring** | Every 30–60 min, and nightly | `@smoke` hourly, full suite nightly | Catch problems not caused by our code: payment/pricing services, CDN, third-party scripts |

Priority order if pipeline time is limited:

1. **Test 1, checkout flow (`@smoke`)**: if customers cannot reach checkout, nothing else
   matters. It always runs and always blocks.
2. **Test 2, pricing (`@regression`)**: wrong prices mean direct financial loss. It blocks
   a release.
3. **Test 3, cart persistence (`@regression`)**: important for conversion, but a failure
   usually means some lost orders rather than lost money on every order. It blocks a
   release, and can run in a later stage than tests 1–2.

Supporting practices:

- Tags let each stage pick its subset: `npx playwright test --grep @smoke`.
- Tests run in parallel, with retries only on CI, and keep a trace, screenshot and video
  on failure, so failures can be debugged without re-running.
- A test that becomes flaky is fixed or quarantined quickly, so the team keeps trusting a
  red build.
- New languages are added as a Playwright project plus one entry in `test-data/markets.ts`.
  Pull requests run one language; the main branch and nightly runs cover all languages.