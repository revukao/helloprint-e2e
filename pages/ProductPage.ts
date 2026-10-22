import { expect, type Locator, type Page, type Response } from '@playwright/test';
import type { Market, StickerOrder } from '../test-data/markets';
import {
  escapeRegExp,
  extractAmountsInCents,
  extractPerPieceInCents,
  quantityPattern,
} from '../utils/money';

/** What the product page says about the configured product, read after configuration. */
export interface ConfiguredProduct {
  name: string;
  quantity: number;
  /** Price shown on the selected print-run tile (excl. VAT), in cents. */
  printRunPriceCents: number;
  /** Total shown in the price summary (excl. VAT), in cents. */
  totalCents: number;
  /** Per-piece price shown in the summary, in cents (rounded by the site). */
  perPieceCents?: number;
  /** The summary line, e.g. "250 × Square · 50 x 50 mm · White film · ...". */
  summaryLine: string;
}

/**
 * Page object for the Individual Stickers product page (PDP).
 *
 * Locators follow Playwright's recommended priority: roles and accessible names
 * first, visible text second. All text comes from the market data, so the same
 * class serves every language.
 */
export class ProductPage {
  readonly heading: Locator;
  readonly addToCartButton: Locator;
  readonly uploadLaterOption: Locator;

  constructor(
    private readonly page: Page,
    private readonly market: Market,
  ) {
    this.heading = page.getByRole('heading', { level: 1, name: market.productName });
    this.addToCartButton = page.getByRole('button', { name: market.configurator.addToCart });
    this.uploadLaterOption = page
      .getByRole('radio', { name: market.configurator.uploadLater })
      .or(page.getByRole('button', { name: market.configurator.uploadLater }))
      .or(page.getByText(market.configurator.uploadLater))
      .filter({ visible: true })
      .first();
  }

  /** Opens the product page and waits until the H1 is rendered. Returns the HTTP response. */
  async goto(): Promise<Response | null> {
    const response = await this.page.goto(this.market.productPath, { waitUntil: 'domcontentloaded' });
    await expect(this.heading).toBeVisible();
    return response;
  }

  /**
   * Returns the container of one configurator step (e.g. "Size").
   * It is the innermost element that holds both the step label and selectable options.
   * NOTE: replace with a data-testid locator if the team exposes one.
   */
  private optionGroup(label: string): Locator {
    const labelText = this.page.getByText(new RegExp(`^\\s*${escapeRegExp(label)}\\s*:?\\s*$`));
    const selectable = this.page.locator('button, [role="radio"], input[type="radio"], [role="option"]');
    return this.page
      .locator('div, section, fieldset')
      .filter({ has: labelText })
      .filter({ has: selectable })
      .filter({ visible: true }) 
      .last();
  }

  /** A visible, clickable option inside a configurator step, whatever element type the site uses. */
  private option(group: Locator, name: RegExp): Locator {
    return group
      .getByRole('radio', { name })
      .or(group.getByRole('button', { name }))
      .or(group.getByRole('option', { name }))
      .filter({ visible: true })
      .first();
  }

  /** Selects an option in a configurator step, expanding a collapsed list ("+4") if needed. */
  async selectOption(groupLabel: string, optionLabel: string): Promise<void> {
    const group = this.optionGroup(groupLabel);
    await expect(group).toBeVisible();

    const name = new RegExp(`^\\s*${escapeRegExp(optionLabel)}\\b`, 'i');

    // Options may be buttons/radios, or plain clickable cards: fall back to visible text.
    const option = this.option(group, name).or(group.getByText(name)).filter({ visible: true }).first();
    const showMore = group
      .getByRole('button', { name: /^\+\s?\d+$/ })
      .or(group.getByText(/^\+\s?\d+$/))
      .filter({ visible: true })
      .first();

    // Wait (auto-retrying) until the list has re-rendered after the previous selection:
    // either the option we want or the "+N" expander must be visible.
    await expect(option.or(showMore).first()).toBeVisible();

    if (!(await option.isVisible())) {
      await showMore.click();
    }
    await option.click();
  }

  /** Selects a print run and returns the price shown on that tile (in cents). */
  async selectPrintRun(quantity: number): Promise<number> {
    const group = this.optionGroup(this.market.configurator.printRunGroup);
    await expect(group).toBeVisible();

    const tile = this.option(group, new RegExp(`^\\s*${quantityPattern(quantity)}`));
    await expect(tile).toBeVisible();
    const tileText = await tile.innerText();
    const [tilePrice] = extractAmountsInCents(tileText);
    expect(tilePrice, `print-run tile "${tileText}" should show a price`).toBeGreaterThan(0);

    await tile.click();
    return tilePrice;
  }

  /** The "250 × Square · 50 x 50 mm · …" line in the price summary. */
  summaryLine(quantity: number): Locator {
    return this.page
      .getByText(new RegExp(`${quantityPattern(quantity)}\\s*×`))
      .filter({ visible: true })
      .first();
  }

  /** The price summary block: innermost container holding the summary line and the per-piece price. */
  private summaryPanel(quantity: number): Locator {
    return this.page
      .locator('div, section, aside')
      .filter({ has: this.summaryLine(quantity) })
      .filter({ hasText: new RegExp(`/\\s*${this.market.configurator.perPieceUnit}`, 'i') })
      .last();
  }

/** Reads the current total: the last price shown right before the "250 × …" summary line, in cents. */
  async readTotalCents(quantity: number): Promise<number> {
    const text = await this.summaryPanel(quantity).innerText();
    const lineStart = text.search(new RegExp(`${quantityPattern(quantity)}\\s*×`));
    if (lineStart === -1) return NaN;
    const amountsBeforeLine = extractAmountsInCents(text.slice(0, lineStart));
    return amountsBeforeLine.at(-1) ?? NaN;
  }

  /**
   * Applies the whole order configuration and waits until the price summary
   * reflects it. Web-first assertions (auto-retrying) are used instead of sleeps,
   * because each selection triggers an asynchronous price recalculation.
   */
  async configure(order: StickerOrder): Promise<ConfiguredProduct> {
    const { shapeGroup, sizeGroup, perPieceUnit } = this.market.configurator;

// The first click can land before the page's JavaScript has finished loading
    // (hydration), especially when tests run in parallel. Retry the click until
    // the summary shows the new shape; size options depend on it.
    await expect(async () => {
      await this.selectOption(shapeGroup, order.shape);
      await expect(this.page.getByText(/×/).filter({ visible: true }).first()).toContainText(order.shape, {
        timeout: 3_000,
      });
    }).toPass({ timeout: 30_000 });

    await this.page.locator(`[data-value="${order.sizeValue}"]`).filter({ visible: true }).first().click();
    const printRunPriceCents = await this.selectPrintRun(order.quantity);

    const summaryLine = this.summaryLine(order.quantity);
    await expect(summaryLine).toContainText(order.shape);
    await expect(summaryLine).toContainText(order.size);

    // Wait until the recalculated total matches the selected tile price.
    await expect.poll(() => this.readTotalCents(order.quantity)).toBe(printRunPriceCents);

    const panelText = await this.summaryPanel(order.quantity).innerText();
    return {
      name: this.market.productName,
      quantity: order.quantity,
      printRunPriceCents,
      totalCents: await this.readTotalCents(order.quantity),
      perPieceCents: extractPerPieceInCents(panelText, perPieceUnit),
      summaryLine: (await summaryLine.innerText()).trim(),
    };
  }

  /** Chooses "Upload later" (no artwork needed) and adds the configured product to the cart. */
  async addToCart(): Promise<void> {
    await this.uploadLaterOption.click();
    await expect(this.addToCartButton).toBeEnabled();
    await this.addToCartButton.click();
  }
}
