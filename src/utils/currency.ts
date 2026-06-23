const REGION_TO_CURRENCY: Record<string, string> = {
  AE: 'AED',
  AU: 'AUD',
  CA: 'CAD',
  GB: 'GBP',
  IN: 'INR',
  MY: 'MYR',
  SG: 'SGD',
  US: 'USD',
};

const EURO_REGIONS = new Set([
  'AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT',
  'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK',
]);

const TIMEZONE_REGION_TO_CURRENCY: Record<string, string> = {
  America: 'USD',
  Asia: 'INR',
  Australia: 'AUD',
  Europe: 'EUR',
};

const getBrowserLocale = () => {
  if (typeof navigator === 'undefined') return 'en-IN';
  return navigator.languages?.[0] || navigator.language || 'en-IN';
};

export const getRegionalCurrencyCode = () => {
  const locale = getBrowserLocale();
  const region = locale.match(/[-_]([A-Z]{2})\b/i)?.[1]?.toUpperCase();

  if (region) {
    if (EURO_REGIONS.has(region)) return 'EUR';
    if (REGION_TO_CURRENCY[region]) return REGION_TO_CURRENCY[region];
  }

  const timeZone = typeof Intl !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone
    : '';
  const timeZoneRegion = timeZone?.split('/')[0];
  return TIMEZONE_REGION_TO_CURRENCY[timeZoneRegion] || 'INR';
};

export const formatRegionalCurrency = (
  value: number,
  options: Intl.NumberFormatOptions = {},
) => {
  const locale = getBrowserLocale();
  const currency = getRegionalCurrencyCode();

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
    ...options,
  }).format(Number.isFinite(value) ? value : 0);
};

export const formatRegionalCurrencyCompact = (value: number) =>
  formatRegionalCurrency(value, {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  });

// =============================================================================
// INR-specific formatters (Archdiocese of Madras-Mylapore — India only)
// Always uses en-IN locale and INR currency regardless of browser locale.
// =============================================================================

/**
 * Format as Indian Rupees: ₹1,000 / ₹10,000 / ₹1,25,000
 */
export const formatINR = (value: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(value) ? value : 0);

/**
 * Compact INR: ₹1.2L, ₹5K
 */
export const formatINRCompact = (value: number): string =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1,
  }).format(Number.isFinite(value) ? value : 0);
