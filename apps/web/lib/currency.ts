// Currency utilities and exchange rates
export const CURRENCIES = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', rate: 1 },
  AMD: { code: 'AMD', symbol: '֏', name: 'Armenian Dram', rate: 400 }, // 1 USD = 400 AMD
  RUB: { code: 'RUB', symbol: '₽', name: 'Russian Ruble', rate: 90 }, // 1 USD = 90 RUB
  GEL: { code: 'GEL', symbol: '₾', name: 'Georgian Lari', rate: 2.7 }, // 1 USD = 2.7 GEL
} as const;

export type CurrencyCode = keyof typeof CURRENCIES;

const CURRENCY_STORAGE_KEY = 'shop_currency';

export function getStoredCurrency(): CurrencyCode {
  if (typeof window === 'undefined') return 'AMD'; // Default to AMD (base currency)
  try {
    const stored = localStorage.getItem(CURRENCY_STORAGE_KEY);
    if (stored && stored in CURRENCIES) {
      return stored as CurrencyCode;
    }
  } catch {
    // Ignore errors
  }
  return 'AMD'; // Default to AMD (base currency)
}

export function setStoredCurrency(currency: CurrencyCode): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CURRENCY_STORAGE_KEY, currency);
    window.dispatchEvent(new Event('currency-updated'));
  } catch (error) {
    console.error('Failed to save currency:', error);
  }
}

/**
 * Format price for display
 * IMPORTANT: Prices in database are stored in AMD (base currency)
 * @param price - Price in AMD (from database)
 * @param currency - Target currency for display
 * @returns Formatted price string
 */
export function formatPrice(price: number, currency: CurrencyCode = 'AMD'): string {
  const currencyInfo = CURRENCIES[currency];
  
  // Prices in database are stored in AMD (base currency)
  // If displaying in AMD, use price as-is
  // If displaying in other currency, convert from AMD
  let convertedPrice: number;
  
  if (currency === 'AMD') {
    // Price is already in AMD, no conversion needed
    convertedPrice = price;
  } else {
    // Convert from AMD (base) to target currency
    // First convert AMD to USD, then to target currency
    const usdPrice = price / CURRENCIES.AMD.rate; // AMD to USD
    convertedPrice = usdPrice * currencyInfo.rate; // USD to target currency
  }
  
  // Show all currencies without decimals (remove .00)
  const minimumFractionDigits = 0;
  const maximumFractionDigits = 0;
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyInfo.code,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(convertedPrice);
}

export function convertPrice(price: number, fromCurrency: CurrencyCode, toCurrency: CurrencyCode): number {
  if (fromCurrency === toCurrency) return price;
  
  // Convert to USD first, then to target currency
  const usdPrice = price / CURRENCIES[fromCurrency].rate;
  return usdPrice * CURRENCIES[toCurrency].rate;
}


