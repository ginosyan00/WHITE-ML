/**
 * Inecobank Payment Service
 * 
 * Implementation of Inecobank payment gateway
 */

import { BasePaymentService } from "./base-payment.service";
import {
  PaymentOrder,
  PaymentResponse,
  PaymentWebhookData,
  PaymentGatewayConfig,
  PaymentStatus,
  WebhookVerificationResult,
  InecobankConfig,
} from "../../types/payments";

/**
 * Inecobank Payment Service
 * 
 * Handles payment processing via Inecobank payment system
 */
export class InecobankPaymentService extends BasePaymentService {
  private accounts: InecobankConfig["accounts"];
  private successUrl?: string;
  private failUrl?: string;
  private resultUrl?: string;

  // Inecobank API endpoints
  // Production: https://pg.inecoecom.am
  // Test: Same URL, but uses test credentials
  private readonly API_BASE_URL = "https://pg.inecoecom.am";
  private readonly API_PATH = "/payment/rest";

  constructor(config: InecobankConfig, testMode: boolean = true) {
    super(config, testMode, "inecobank");
    
    const inecobankConfig = config as InecobankConfig;
    this.accounts = inecobankConfig.accounts;
    this.successUrl = inecobankConfig.successUrl;
    this.failUrl = inecobankConfig.failUrl;
    this.resultUrl = inecobankConfig.resultUrl;
  }

  /**
   * Initiate payment
   * 
   * Calls Inecobank register.do API
   */
  async initiatePayment(order: PaymentOrder): Promise<PaymentResponse> {
    try {
      // Validate amount
      if (!this.validateAmount(order.amount, 0.01)) {
        return this.createErrorResponse(
          "INVALID_AMOUNT",
          "Payment amount must be greater than 0.01"
        );
      }

      // Validate currency (only AMD supported)
      if (order.currency !== "AMD") {
        return this.createErrorResponse(
          "INVALID_CURRENCY",
          `Only AMD currency is supported. Received: ${order.currency}`
        );
      }

      // Get AMD account credentials
      const account = this.accounts.AMD;
      if (!account || !account.username || !account.password) {
        return this.createErrorResponse(
          "MISSING_ACCOUNT",
          "AMD account credentials not configured"
        );
      }

      // Validate and sanitize order number
      if (!order.orderNumber || order.orderNumber.trim().length === 0) {
        return this.createErrorResponse(
          "INVALID_ORDER_NUMBER",
          "Order number is required"
        );
      }

      // Validate amount is positive number
      if (isNaN(order.amount) || order.amount <= 0) {
        return this.createErrorResponse(
          "INVALID_AMOUNT",
          "Payment amount must be a positive number"
        );
      }

      // Validate URLs are secure (HTTPS)
      const returnUrl = this.successUrl || order.returnUrl;
      const failUrl = this.failUrl || order.cancelUrl;
      
      if (returnUrl && !returnUrl.startsWith("https://")) {
        return this.createErrorResponse(
          "INVALID_URL",
          "Return URL must use HTTPS"
        );
      }
      
      if (failUrl && !failUrl.startsWith("https://")) {
        return this.createErrorResponse(
          "INVALID_URL",
          "Fail URL must use HTTPS"
        );
      }

      // Prepare payment request
      // Note: Inecobank uses the same URL for test and production
      // Test mode is determined by using test credentials
      const apiUrl = `${this.API_BASE_URL}${this.API_PATH}/register.do`;

      // Calculate amount in minor units (cents/kopecks)
      // Ensure proper rounding to avoid floating point issues
      const amountInMinorUnits = Math.round(order.amount * 100);
      
      if (amountInMinorUnits <= 0) {
        return this.createErrorResponse(
          "INVALID_AMOUNT",
          "Payment amount must be greater than 0"
        );
      }

      const requestData = {
        userName: account.username,
        password: account.password,
        orderNumber: order.orderNumber.trim(),
        amount: amountInMinorUnits,
        currency: this.getCurrencyCode(order.currency),
        returnUrl: returnUrl,
        failUrl: failUrl,
        description: (order.description || `Order ${order.orderNumber}`).substring(0, 512), // Limit description length
      };

      // Call register.do API
      // Inecobank expects form-urlencoded format (not JSON)
      const response = await this.postRequest<any>(apiUrl, requestData, {}, true);

      // Validate response structure
      if (!response || typeof response !== "object") {
        return this.createErrorResponse(
          "INVALID_RESPONSE",
          "Invalid response format from payment gateway"
        );
      }

      // Check response
      // errorCode "0" means success
      if (response.errorCode === "0" || response.errorCode === 0) {
        // Validate required fields
        if (!response.formUrl) {
          return this.createErrorResponse(
            "MISSING_FORM_URL",
            "Payment gateway did not return form URL"
          );
        }

        if (!response.orderId) {
          return this.createErrorResponse(
            "MISSING_ORDER_ID",
            "Payment gateway did not return order ID"
          );
        }

        // Validate formUrl is HTTPS
        if (!response.formUrl.startsWith("https://")) {
          this.logError(
            new Error("Form URL is not secure (HTTPS)"),
            { formUrl: response.formUrl, orderId: order.orderId }
          );
        }

        return this.createSuccessResponse(
          String(response.orderId),
          String(response.orderId),
          response.formUrl
        );
      } else {
        // Log error details for debugging
        this.logError(
          new Error(`Payment initiation failed: ${response.errorCode || "Unknown"}`),
          {
            orderId: order.orderId,
            errorCode: response.errorCode,
            errorMessage: response.errorMessage,
          }
        );

        return this.createErrorResponse(
          String(response.errorCode || "PAYMENT_ERROR"),
          response.errorMessage || "Failed to initiate payment"
        );
      }
    } catch (error) {
      this.logError(error, { orderId: order.orderId });
      return this.createErrorResponse(
        "INITIATION_ERROR",
        error instanceof Error ? error.message : "Failed to initiate payment"
      );
    }
  }

  /**
   * Verify webhook signature
   */
  async verifyWebhook(data: PaymentWebhookData): Promise<WebhookVerificationResult> {
    try {
      const payload = data.payload;

      // Inecobank webhook verification
      // Based on PHP implementation: verification is done via getOrderStatusExtended.do API call
      // Webhook callback contains: paymentID, currency
      // Full verification is done by calling getOrderStatusExtended.do API after receiving callback
      const requiredFields = ["orderNumber", "status", "action"];

      // For callback from gateway, check if paymentID (or orderId) and currency are present
      const paymentId = payload.paymentID || payload.orderId;
      if (paymentId && payload.currency) {
        // Validate paymentID format (should be alphanumeric)
        if (typeof paymentId !== "string" || paymentId.trim().length === 0) {
          return {
            valid: false,
            error: "Invalid payment ID format",
          };
        }
        
        // This is a callback - verify by calling API
        return {
          valid: true,
          payload: payload,
        };
      }

      // For direct webhook, check required fields
      for (const field of requiredFields) {
        if (!payload[field]) {
          return {
            valid: false,
            error: `Missing required field: ${field}`,
          };
        }
      }

      // Note: Inecobank doesn't send signature in webhook
      // Verification is done by calling getOrderStatusExtended.do API
      // This is handled in processWebhook method

      return {
        valid: true,
        payload: payload,
      };
    } catch (error) {
      this.logError(error, { webhookData: this.sanitizeForLogging(data.payload) });
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Webhook verification failed",
      };
    }
  }

  /**
   * Process webhook notification
   * 
   * Based on PHP implementation: After receiving callback with paymentID,
   * we call getOrderStatusExtended.do API to verify and get full payment status
   */
  async processWebhook(data: PaymentWebhookData): Promise<PaymentStatus> {
    try {
      const verification = await this.verifyWebhook(data);
      if (!verification.valid) {
        return "failed";
      }

      const payload = data.payload;
      const paymentID = payload.paymentID || payload.orderId;

      // If we have paymentID from callback, verify by calling getOrderStatusExtended API
      // This matches PHP implementation behavior
      if (paymentID) {
        try {
          const status = await this.getPaymentStatus(paymentID);
          return status;
        } catch (error) {
          // If API call fails, fall back to status field check
          this.logError(error, { paymentID, context: "getOrderStatusExtended API call failed" });
        }
      }

      // Fallback: check status field directly
      const status = payload.status;

      // Status codes: 0 = pending, 1 = completed, 2 = failed
      if (status === "1" || status === 1) {
        return "completed";
      } else if (status === "2" || status === 2) {
        return "failed";
      } else {
        return "pending";
      }
    } catch (error) {
      this.logError(error, { webhookData: this.sanitizeForLogging(data.payload) });
      return "failed";
    }
  }

  /**
   * Get payment status from provider
   * 
   * Calls getOrderStatusExtended.do API
   */
  async getPaymentStatus(transactionId: string): Promise<PaymentStatus> {
    try {
      // Get account credentials (default to AMD)
      const account = this.accounts.AMD;
      if (!account) {
        throw new Error("No account credentials configured");
      }

      // Validate transaction ID
      if (!transactionId || transactionId.trim().length === 0) {
        throw new Error("Transaction ID is required");
      }

      // Inecobank uses the same URL for test and production
      const apiUrl = `${this.API_BASE_URL}${this.API_PATH}/getOrderStatusExtended.do`;

      const requestData = {
        userName: account.username,
        password: account.password,
        orderId: transactionId,
      };

      // Inecobank expects form-urlencoded format (not JSON)
      const response = await this.postRequest<any>(apiUrl, requestData, {}, true);

      // Validate response structure
      if (!response || typeof response !== "object") {
        this.logError(
          new Error("Invalid response format from getOrderStatusExtended"),
          { transactionId }
        );
        return "failed";
      }

      if (response.errorCode === "0" || response.errorCode === 0) {
        const status = response.orderStatus;
        
        // Order status codes:
        // 0 = pending/registered
        // 1 = completed/paid
        // 2 = failed/cancelled
        if (status === 1 || status === "1") {
          return "completed";
        } else if (status === 2 || status === "2") {
          return "failed";
        } else {
          return "pending";
        }
      } else {
        this.logError(
          new Error(`getOrderStatusExtended failed: ${response.errorCode}`),
          { transactionId, errorCode: response.errorCode, errorMessage: response.errorMessage }
        );
        return "failed";
      }
    } catch (error) {
      this.logError(error, { transactionId });
      return "failed";
    }
  }

  /**
   * Validate Inecobank configuration
   */
  protected validateConfig(config: PaymentGatewayConfig): boolean {
    const inecobankConfig = config as InecobankConfig;

    if (!inecobankConfig.accounts) {
      return false;
    }

    // At least one currency account must be configured
    const hasAccount = Object.values(inecobankConfig.accounts).some(
      (account) => account && account.username && account.password
    );

    if (!hasAccount) {
      return false;
    }

    return true;
  }

  /**
   * Convert currency code to numeric format
   * AMD = 051
   */
  private getCurrencyCode(currency: string): string {
    const currencyMap: Record<string, string> = {
      AMD: "051",
    };
    return currencyMap[currency] || "051";
  }
}

