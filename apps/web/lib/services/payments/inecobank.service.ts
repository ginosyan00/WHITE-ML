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

  // Inecobank API endpoints (ADPG - Armenian Data Processing Group)
  private readonly API_BASE_URL = "https://ipay.arca.am";
  private readonly TEST_API_BASE_URL = "https://testipay.arca.am";

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

      // Validate currency
      if (!this.validateCurrency(order.currency, ["AMD", "USD", "EUR", "RUB"])) {
        return this.createErrorResponse(
          "INVALID_CURRENCY",
          `Currency ${order.currency} is not supported`
        );
      }

      // Get account credentials for currency
      const account = this.accounts[order.currency];
      if (!account || !account.username || !account.password) {
        return this.createErrorResponse(
          "MISSING_ACCOUNT",
          `Account credentials not configured for currency ${order.currency}`
        );
      }

      // Prepare payment request
      const apiUrl = this.testMode
        ? `${this.TEST_API_BASE_URL}/payment/rest/register.do`
        : `${this.API_BASE_URL}/payment/rest/register.do`;

      const requestData = {
        userName: account.username,
        password: account.password,
        orderNumber: order.orderNumber,
        amount: Math.round(order.amount * 100), // Amount in minor units (cents/kopecks)
        currency: this.getCurrencyCode(order.currency),
        returnUrl: this.successUrl || order.returnUrl,
        failUrl: this.failUrl || order.cancelUrl,
        description: order.description || `Order ${order.orderNumber}`,
      };

      // Call register.do API
      const response = await this.postRequest<any>(apiUrl, requestData);

      // Check response
      if (response.errorCode === "0" && response.formUrl) {
        return this.createSuccessResponse(
          response.orderId,
          response.orderId,
          response.formUrl
        );
      } else {
        return this.createErrorResponse(
          response.errorCode || "PAYMENT_ERROR",
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

      // For callback from gateway, check if paymentID and currency are present
      if (payload.paymentID && payload.currency) {
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
      const account = this.accounts.AMD || this.accounts.USD || this.accounts.EUR || this.accounts.RUB;
      if (!account) {
        throw new Error("No account credentials configured");
      }

      const apiUrl = this.testMode
        ? `${this.TEST_API_BASE_URL}/payment/rest/getOrderStatusExtended.do`
        : `${this.API_BASE_URL}/payment/rest/getOrderStatusExtended.do`;

      const requestData = {
        userName: account.username,
        password: account.password,
        orderId: transactionId,
      };

      const response = await this.postRequest<any>(apiUrl, requestData);

      if (response.errorCode === "0") {
        const status = response.orderStatus;
        if (status === 1 || status === "1") {
          return "completed";
        } else if (status === 2 || status === "2") {
          return "failed";
        } else {
          return "pending";
        }
      } else {
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
   * AMD = 051, USD = 840, EUR = 978, RUB = 643
   */
  private getCurrencyCode(currency: string): string {
    const currencyMap: Record<string, string> = {
      AMD: "051",
      USD: "840",
      EUR: "978",
      RUB: "643",
    };
    return currencyMap[currency] || "051";
  }
}

