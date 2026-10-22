/**
 * Market (storefront language) test data.
 *
 * Everything that differs between languages lives here: URLs, visible UI labels,
 * number formats and the product configuration we order. Page objects never
 * hard-code text, so adding a new language means adding one object below and
 * one project in playwright.config.ts.
 *
 * Labels were taken from the live pages (Oct 2026). Locators use regular
 * expressions so small copy changes (casing, trailing text) don't break tests.
 */

export interface StickerOrder {
  /** Shape option as shown on the product page. */
  shape: string;
  /** Size option as shown on the product page (after the shape is chosen). */
  size: string;
  /** Print run (number of stickers). Must be one of the visible print-run tiles. */
  quantity: number;
  /** A second print run, used to check that prices recalculate. */
  alternativeQuantity: number;
 /** data-value attribute of the size option, e.g. "50x50mm" (same in all languages). */
  sizeValue: string;
}

export interface Market {
  /** Human-readable name, used in test titles and logs. */
  name: string;
  /** BCP-47 locale, used for number formatting. */
  locale: string;
  /** Path of the Individual Stickers product page. */
  productPath: string;
  /** Product name as shown in the H1, the cart and the checkout summary. */
  productName: string;
  /** VAT rate of the country, used to verify the checkout VAT line. */
  vatRate: number;

  cookies: {
    acceptAll: RegExp;
  };

  configurator: {
    shapeGroup: string;
    sizeGroup: string;
    printRunGroup: string;
    /** Unit shown after the per-piece price, e.g. "€0.06 / piece". */
    perPieceUnit: string;
    /** Label of the design option that lets us add to cart without uploading artwork. */
    uploadLater: RegExp;
    addToCart: RegExp;
  };

   cart: {
    title: RegExp;
    proceedToCheckout: RegExp;
    /** URL of the full cart page. */
    pageUrl: RegExp;
  };

  checkout: {
    /** URL pattern of the checkout page. */
    url: RegExp;
    /** Heading of the order summary block on the checkout page. */
    summaryHeading: RegExp;
  };

  order: StickerOrder;
}

export const markets = {
  enIE: {
    name: 'English (Ireland)',
    locale: 'en-IE',
    productPath: '/en-ie/stickers',
    productName: 'Individual Stickers',
    vatRate: 0.23,
    cookies: {
      acceptAll: /^accept all$/i,
    },
    configurator: {
      shapeGroup: 'Shape',
      sizeGroup: 'Size',
      printRunGroup: 'Print run',
      perPieceUnit: 'piece',
      uploadLater: /upload later/i,
      addToCart: /^add to cart$/i,
    },
    cart: {
      title: /your cart/i,
      pageUrl: /\/en-ie\/cart/i,
      proceedToCheckout: /proceed to checkout/i,
    },
    checkout: {
      url: /\/en-ie\/.*checkout/i,
      summaryHeading: /^\s*order summary\s*$/i,
    },
    order: {
      shape: 'Square',
      size: '50 x 50 mm',
      quantity: 250,
      alternativeQuantity: 500,
      sizeValue: '50x50mm',
    },
  },

  itIT: {
    name: 'Italiano (Italia)',
    locale: 'it-IT',
    // /it-it/stickers redirects here; we go straight to the canonical URL.
    productPath: '/it-it/adesivi',
    productName: 'Adesivi classici',
    vatRate: 0.22,
    cookies: {
      acceptAll: /^accetta tutti$/i,
    },
    configurator: {
      shapeGroup: 'Forma',
      sizeGroup: 'Formato',
      printRunGroup: 'Tiratura',
      perPieceUnit: 'pezzo',
      uploadLater: /carica più tardi/i,
      addToCart: /^aggiungi al carrello$/i,
    },
    cart: {
      title: /il tuo carrello/i,
      proceedToCheckout: /vai al checkout/i,
      pageUrl: /\/it-it\/cart/i,
    },
    checkout: {
      url: /\/it-it\/.*(checkout|cassa)/i,
      summaryHeading: /riepilogo|il tuo ordine/i,
    },
    order: {
      shape: 'Quadrato',
      size: '50 x 50 mm',
      quantity: 250,
      alternativeQuantity: 500,
      sizeValue: '50x50mm',
    },
  },
} satisfies Record<string, Market>;
