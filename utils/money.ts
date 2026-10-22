/**
 * Locale-aware helpers for reading prices and quantities from page text.
 *
 * Prices are compared as integer cents so that "€36.49" (en-IE) and "36,49 €"
 * (it-IT) are both 3649, avoiding floating-point and formatting differences.
 */

/** Matches euro amounts in both "€1,234.56" and "1.234,56 €" styles (incl. non-breaking spaces). */
const MONEY_PATTERN =
  /€\s?\d{1,3}(?:[.,\s  ]\d{3})*[.,]\d{2}|\d{1,3}(?:[.,\s  ]\d{3})*[.,]\d{2}\s?€/g;

/** Converts a single price string such as "€1,069.99" or "1 069,99 €" to cents (106999). */
export function parseMoneyToCents(raw: string): number {
  const digits = raw.replace(/[^\d.,]/g, '');
  const decimal = digits.match(/[.,](\d{2})$/);
  if (!decimal) {
    throw new Error(`Cannot parse price from "${raw}"`);
  }
  const integerPart = digits.slice(0, -3).replace(/[.,]/g, '');
  return Number(integerPart) * 100 + Number(decimal[1]);
}

/** Returns every euro amount found in a block of text, in order, as cents. */
export function extractAmountsInCents(text: string): number[] {
  return (text.match(MONEY_PATTERN) ?? []).map(parseMoneyToCents);
}

/** Returns the price directly followed by "/ <unit>" (e.g. "€0.15 / piece"), as cents. */
export function extractPerPieceInCents(text: string, unit: string): number | undefined {
  const pattern = new RegExp(`(${MONEY_PATTERN.source})\\s*/\\s*${unit}`, 'i');
  const match = text.match(pattern);
  return match ? parseMoneyToCents(match[1]) : undefined;
}

/**
 * Builds a regex source that matches a quantity with any thousands separator
 * (the site shows "1,000", "1.000" and "1 000" depending on locale and widget).
 */
export function quantityPattern(quantity: number): string {
  const groups = Math.trunc(quantity).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '|').split('|');
  return `(?<![\\d.,])${groups.join('[.,\\s\\u00a0\\u202f]?')}(?![\\d]|[.,]\\d)`;
}

/** Escapes a literal string for use inside a RegExp. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
