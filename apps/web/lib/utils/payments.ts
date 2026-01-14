/**
 * Payment Utility Functions
 * 
 * Helper functions for payment processing
 * Migrated from PHP apg-function.php
 */

/**
 * Generate order number
 * 
 * Creates a unique order number in format: YYMMDD-XXXXX
 * 
 * @returns Order number string
 * 
 * @example
 * generateOrderNumber() // "250113-01234"
 */
export function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = String(Math.floor(Math.random() * 10000)).padStart(5, "0");
  return `${year}${month}${day}-${random}`;
}

/**
 * Get price from JSON object by currency code
 * 
 * @param priceJson - JSON string or object with currency prices
 * @param currencyCode - Currency code (AMD, USD, EUR, RUB)
 * @returns Price value or 0 if not found
 * 
 * @example
 * getPriceFromJson('{"AMD": 1000, "USD": 2.5}', "AMD") // 1000
 */
export function getPriceFromJson(
  priceJson: string | Record<string, number>,
  currencyCode: string
): number {
  try {
    // If string, parse JSON
    const priceObject = typeof priceJson === "string" 
      ? JSON.parse(priceJson) 
      : priceJson;

    // Get price for currency by currency code
    const productPrice = (
      typeof priceObject === "object" && 
      priceObject !== null && 
      currencyCode in priceObject
    ) ? priceObject[currencyCode] : 0;

    // Return numeric value or 0
    return typeof productPrice === "number" && !isNaN(productPrice) 
      ? productPrice 
      : 0;
  } catch (error) {
    console.error("[PaymentUtils] Error parsing price JSON:", error);
    return 0;
  }
}

/**
 * Remove order number prefix
 * 
 * Removes the date prefix from order number (e.g., "250113-ABC123" -> "ABC123")
 * 
 * @param orderNumber - Order number with optional prefix
 * @returns Order number without prefix
 * 
 * @example
 * removeOrderNumberPrefix("250113-ABC123") // "ABC123"
 * removeOrderNumberPrefix("ABC123") // "ABC123"
 */
export function removeOrderNumberPrefix(orderNumber: string): string {
  if (!orderNumber) {
    return "";
  }

  const splitedOrderNumber = orderNumber.split("-");
  
  // If order number has prefix (format: "YYYYMMDD-XXXXX"), return the part after dash
  // Otherwise return the original order number
  return (
    Array.isArray(splitedOrderNumber) && 
    splitedOrderNumber.length > 1
  ) 
    ? splitedOrderNumber.slice(1).join("-") // Join in case there are multiple dashes
    : orderNumber;
}

/**
 * Format order number for payment gateway
 * 
 * Some payment gateways have restrictions on order number format
 * This function ensures the order number meets gateway requirements
 * 
 * @param orderNumber - Original order number
 * @param maxLength - Maximum length allowed (default: 50)
 * @param removePrefix - Whether to remove date prefix (default: false)
 * @returns Formatted order number
 */
export function formatOrderNumberForGateway(
  orderNumber: string,
  maxLength: number = 50,
  removePrefix: boolean = false
): string {
  let formatted = orderNumber;

  // Remove prefix if requested
  if (removePrefix) {
    formatted = removeOrderNumberPrefix(formatted);
  }

  // Truncate if too long
  if (formatted.length > maxLength) {
    formatted = formatted.substring(0, maxLength);
  }

  // Remove any invalid characters (only alphanumeric, dash, underscore)
  formatted = formatted.replace(/[^a-zA-Z0-9\-_]/g, "");

  return formatted;
}

/**
 * Validate payment amount
 * 
 * @param amount - Amount to validate
 * @param minAmount - Minimum amount (default: 0.01)
 * @param maxAmount - Maximum amount (optional)
 * @returns True if valid
 */
export function validatePaymentAmount(
  amount: number,
  minAmount: number = 0.01,
  maxAmount?: number
): boolean {
  if (typeof amount !== "number" || isNaN(amount) || !isFinite(amount)) {
    return false;
  }

  if (amount < minAmount) {
    return false;
  }

  if (maxAmount !== undefined && amount > maxAmount) {
    return false;
  }

  return true;
}

/**
 * Format amount for payment gateway
 * 
 * Some gateways require specific decimal precision
 * 
 * @param amount - Amount to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted amount string
 */
export function formatPaymentAmount(
  amount: number,
  decimals: number = 2
): string {
  return amount.toFixed(decimals);
}

/**
 * Convert amount to smallest currency unit (cents, dirams, etc.)
 * 
 * Some payment gateways require amounts in smallest currency unit
 * 
 * @param amount - Amount in main currency unit
 * @param currency - Currency code
 * @returns Amount in smallest currency unit
 */
export function convertToSmallestUnit(
  amount: number,
  currency: string = "AMD"
): number {
  // Currency multipliers (smallest unit per main unit)
  const multipliers: Record<string, number> = {
    AMD: 1,      // 1 AMD = 1 diram (no subdivision)
    USD: 100,    // 1 USD = 100 cents
    EUR: 100,    // 1 EUR = 100 cents
    RUB: 100,    // 1 RUB = 100 kopecks
  };

  const multiplier = multipliers[currency] || 1;
  return Math.round(amount * multiplier);
}

/**
 * Convert from smallest currency unit to main currency unit
 * 
 * @param amount - Amount in smallest currency unit
 * @param currency - Currency code
 * @returns Amount in main currency unit
 */
export function convertFromSmallestUnit(
  amount: number,
  currency: string = "AMD"
): number {
  const multipliers: Record<string, number> = {
    AMD: 1,
    USD: 100,
    EUR: 100,
    RUB: 100,
  };

  const multiplier = multipliers[currency] || 1;
  return amount / multiplier;
}

/**
 * Generate payment reference number
 * 
 * Creates a unique reference number for payment tracking
 * 
 * @param orderNumber - Order number
 * @param prefix - Optional prefix
 * @returns Payment reference number
 */
export function generatePaymentReference(
  orderNumber: string,
  prefix?: string
): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  const orderPart = removeOrderNumberPrefix(orderNumber).substring(0, 8);
  
  const reference = prefix 
    ? `${prefix}-${orderPart}-${timestamp}-${random}`
    : `${orderPart}-${timestamp}-${random}`;

  return reference.substring(0, 50); // Limit length
}

/**
 * Mask sensitive payment data for logging
 * 
 * Replaces sensitive information with asterisks for safe logging
 * 
 * @param data - Data object to mask
 * @param fieldsToMask - Array of field names to mask
 * @returns Masked data object
 */
export function maskSensitiveData(
  data: Record<string, any>,
  fieldsToMask: string[] = ["password", "key", "secret", "token", "cardNumber", "cvv", "cvc"]
): Record<string, any> {
  const masked = { ...data };

  for (const field of fieldsToMask) {
    if (field in masked && masked[field]) {
      const value = String(masked[field]);
      if (value.length > 4) {
        masked[field] = `${value.substring(0, 2)}${"*".repeat(value.length - 4)}${value.substring(value.length - 2)}`;
      } else {
        masked[field] = "****";
      }
    }
  }

  return masked;
}

/**
 * Parse payment callback parameters
 * 
 * Extracts and validates payment callback parameters from query string or body
 * 
 * @param params - Query parameters or body data
 * @returns Parsed payment data
 */
export function parsePaymentCallback(
  params: Record<string, any>
): {
  orderId?: string;
  transactionId?: string;
  status?: string;
  amount?: number;
  currency?: string;
  [key: string]: any;
} {
  return {
    orderId: params.orderId || params.order_id || params.orderNumber || params.order_number,
    transactionId: params.transactionId || params.transaction_id || params.paymentId || params.payment_id,
    status: params.status || params.paymentStatus || params.payment_status,
    amount: params.amount ? parseFloat(String(params.amount)) : undefined,
    currency: params.currency || params.currencyCode || params.currency_code,
    ...params,
  };
}

/**
 * Build payment callback URL
 * 
 * Constructs callback URL for payment gateway
 * 
 * @param baseUrl - Base application URL
 * @param path - Callback path
 * @param params - Query parameters
 * @returns Complete callback URL
 */
export function buildCallbackUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, string | number>
): string {
  const url = new URL(path, baseUrl);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, String(value));
    });
  }

  return url.toString();
}

/**
 * Validate payment gateway response
 * 
 * Checks if payment gateway response is valid
 * 
 * @param response - Gateway response object
 * @param requiredFields - Array of required field names
 * @returns True if valid
 */
export function validateGatewayResponse(
  response: Record<string, any>,
  requiredFields: string[]
): boolean {
  if (!response || typeof response !== "object") {
    return false;
  }

  for (const field of requiredFields) {
    if (!(field in response) || response[field] === null || response[field] === undefined) {
      return false;
    }
  }

  return true;
}

