/**
 * Base Payment Service
 * 
 * Abstract base class for all payment gateway implementations
 * Provides common functionality and enforces interface contract
 */

import {
  PaymentOrder,
  PaymentResponse,
  PaymentWebhookData,
  PaymentGatewayConfig,
  PaymentStatus,
  WebhookVerificationResult,
  PaymentAttemptData,
} from "../../types/payments";

/**
 * Abstract Base Payment Service
 * 
 * All payment gateway implementations must extend this class
 */
export abstract class BasePaymentService {
  protected config: PaymentGatewayConfig;
  protected testMode: boolean;
  protected gatewayType: string;

  constructor(config: PaymentGatewayConfig, testMode: boolean = true, gatewayType: string) {
    this.config = config;
    this.testMode = testMode;
    this.gatewayType = gatewayType;
    
    // Validate configuration on initialization
    if (!this.validateConfig(config)) {
      throw new Error(`Invalid configuration for ${gatewayType} payment gateway`);
    }
  }

  /**
   * Initiate payment process
   * 
   * @param order - Payment order data
   * @returns Payment response with redirect URL or form data
   */
  abstract initiatePayment(order: PaymentOrder): Promise<PaymentResponse>;

  /**
   * Verify webhook signature and data integrity
   * 
   * @param data - Webhook data
   * @returns Verification result
   */
  abstract verifyWebhook(data: PaymentWebhookData): Promise<WebhookVerificationResult>;

  /**
   * Process webhook notification
   * 
   * @param data - Verified webhook data
   * @returns Processed payment status
   */
  abstract processWebhook(data: PaymentWebhookData): Promise<PaymentStatus>;

  /**
   * Get payment status from provider
   * 
   * @param transactionId - Provider transaction ID
   * @returns Current payment status
   */
  abstract getPaymentStatus(transactionId: string): Promise<PaymentStatus>;

  /**
   * Validate gateway-specific configuration
   * 
   * @param config - Configuration to validate
   * @returns True if valid, false otherwise
   */
  protected abstract validateConfig(config: PaymentGatewayConfig): boolean;

  /**
   * Log error with context
   * 
   * @param error - Error object
   * @param context - Additional context data
   */
  protected logError(error: Error | unknown, context: Record<string, any> = {}): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    console.error(`[PaymentService][${this.gatewayType}] Error:`, {
      message: errorMessage,
      stack: errorStack,
      testMode: this.testMode,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log payment attempt
   * 
   * @param attemptData - Attempt data
   */
  protected logAttempt(attemptData: PaymentAttemptData): void {
    console.log(`[PaymentService][${this.gatewayType}] Payment Attempt:`, {
      attemptNumber: attemptData.attemptNumber,
      status: attemptData.status,
      errorCode: attemptData.errorCode,
      durationMs: attemptData.durationMs,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Create standardized error response
   * 
   * @param errorCode - Error code
   * @param errorMessage - Error message
   * @param metadata - Additional metadata
   * @returns Error response
   */
  protected createErrorResponse(
    errorCode: string,
    errorMessage: string,
    metadata?: Record<string, any>
  ): PaymentResponse {
    return {
      success: false,
      errorCode,
      errorMessage,
      metadata: {
        gatewayType: this.gatewayType,
        testMode: this.testMode,
        ...metadata,
      },
    };
  }

  /**
   * Create standardized success response
   * 
   * @param paymentId - Payment ID
   * @param transactionId - Transaction ID
   * @param redirectUrl - Redirect URL (optional)
   * @param formData - Form data for POST submission (optional)
   * @param formAction - Form action URL (optional)
   * @param formMethod - Form method (GET or POST)
   * @param metadata - Additional metadata
   * @returns Success response
   */
  protected createSuccessResponse(
    paymentId?: string,
    transactionId?: string,
    redirectUrl?: string,
    formData?: Record<string, string>,
    formAction?: string,
    formMethod: "GET" | "POST" = "POST",
    metadata?: Record<string, any>
  ): PaymentResponse {
    return {
      success: true,
      paymentId,
      transactionId,
      redirectUrl,
      formData,
      formAction,
      formMethod,
      metadata: {
        gatewayType: this.gatewayType,
        testMode: this.testMode,
        ...metadata,
      },
    };
  }

  /**
   * Generate idempotency key
   * 
   * @param orderId - Order ID
   * @returns Unique idempotency key
   */
  protected generateIdempotencyKey(orderId: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `${this.gatewayType}_${orderId}_${timestamp}_${random}`;
  }

  /**
   * Validate payment amount
   * 
   * @param amount - Amount to validate
   * @param minAmount - Minimum amount (default: 0.01)
   * @param maxAmount - Maximum amount (optional)
   * @returns True if valid
   */
  protected validateAmount(
    amount: number,
    minAmount: number = 0.01,
    maxAmount?: number
  ): boolean {
    if (amount < minAmount) {
      return false;
    }
    if (maxAmount && amount > maxAmount) {
      return false;
    }
    return true;
  }

  /**
   * Validate currency code
   * 
   * @param currency - Currency code
   * @param supportedCurrencies - Array of supported currencies
   * @returns True if valid
   */
  protected validateCurrency(
    currency: string,
    supportedCurrencies: string[] = ["AMD", "USD", "EUR", "RUB"]
  ): boolean {
    return supportedCurrencies.includes(currency);
  }

  /**
   * Calculate retry delay with exponential backoff
   * 
   * @param attemptNumber - Current attempt number (1-based)
   * @param baseDelayMs - Base delay in milliseconds (default: 1000)
   * @param maxDelayMs - Maximum delay in milliseconds (default: 60000)
   * @returns Delay in milliseconds
   */
  protected calculateRetryDelay(
    attemptNumber: number,
    baseDelayMs: number = 1000,
    maxDelayMs: number = 60000
  ): number {
    const exponentialDelay = baseDelayMs * Math.pow(2, attemptNumber - 1);
    return Math.min(exponentialDelay, maxDelayMs);
  }

  /**
   * Make HTTP request with error handling
   * 
   * @param url - Request URL
   * @param options - Fetch options
   * @returns Response data
   */
  protected async makeRequest<T = any>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });

      const durationMs = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP ${response.status}: ${response.statusText}. ${errorText}`
        );
      }

      const data = await response.json();
      
      this.logAttempt({
        attemptNumber: 1,
        status: "completed",
        durationMs,
        responseData: data,
      });

      return data;
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.logError(error, { url, durationMs });
      throw error;
    }
  }

  /**
   * Make HTTP POST request
   * 
   * @param url - Request URL
   * @param data - Request body data
   * @param options - Additional fetch options
   * @returns Response data
   */
  protected async postRequest<T = any>(
    url: string,
    data: Record<string, any>,
    options: RequestInit = {}
  ): Promise<T> {
    return this.makeRequest<T>(url, {
      method: "POST",
      body: JSON.stringify(data),
      ...options,
    });
  }

  /**
   * Make HTTP GET request
   * 
   * @param url - Request URL
   * @param params - Query parameters
   * @param options - Additional fetch options
   * @returns Response data
   */
  protected async getRequest<T = any>(
    url: string,
    params?: Record<string, any>,
    options: RequestInit = {}
  ): Promise<T> {
    let requestUrl = url;
    
    if (params) {
      const queryString = new URLSearchParams(
        Object.entries(params).reduce((acc, [key, value]) => {
          acc[key] = String(value);
          return acc;
        }, {} as Record<string, string>)
      ).toString();
      requestUrl = `${url}?${queryString}`;
    }

    return this.makeRequest<T>(requestUrl, {
      method: "GET",
      ...options,
    });
  }

  /**
   * Generate MD5 hash (for Idram checksum)
   * 
   * @param data - Data to hash
   * @returns MD5 hash string
   */
  protected generateMD5Hash(data: string): string {
    // Use crypto-js for MD5 hashing
    try {
      const CryptoJS = require("crypto-js");
      return CryptoJS.MD5(data).toString();
    } catch (error) {
      // Fallback: in Node.js environment, use crypto module
      if (typeof require !== "undefined") {
        try {
          const crypto = require("crypto");
          return crypto.createHash("md5").update(data).digest("hex");
        } catch (cryptoError) {
          this.logError(cryptoError, { context: "MD5 hash generation fallback failed" });
        }
      }
      throw new Error("MD5 hash generation not available. Please install crypto-js package.");
    }
  }

  /**
   * Sanitize payment data for logging (remove sensitive information)
   * 
   * @param data - Data to sanitize
   * @returns Sanitized data
   */
  protected sanitizeForLogging(data: Record<string, any>): Record<string, any> {
    const sensitiveFields = ["password", "key", "secret", "token", "cardNumber", "cvv"];
    const sanitized = { ...data };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = "***REDACTED***";
      }
    }
    
    return sanitized;
  }
}

