/**
 * Ameriabank Payment Service
 * 
 * Implementation of Ameriabank payment gateway
 */

import { BasePaymentService } from "./base-payment.service";
import {
  PaymentOrder,
  PaymentResponse,
  PaymentWebhookData,
  PaymentGatewayConfig,
  PaymentStatus,
  WebhookVerificationResult,
  AmeriabankConfig,
  CurrencyCode,
} from "../../types/payments";

/**
 * Ameriabank Payment Service
 * 
 * Handles payment processing via Ameriabank payment system
 */
export class AmeriabankPaymentService extends BasePaymentService {
  private clientID: string;
  private accounts: AmeriabankConfig["accounts"];
  private minTestOrderId?: number;
  private maxTestOrderId?: number;
  private successUrl?: string;
  private failUrl?: string;
  private resultUrl?: string;

  // Ameriabank API endpoints
  private readonly API_BASE_URL = "https://api.ameriabank.am";
  private readonly TEST_API_BASE_URL = "https://testapi.ameriabank.am";

  constructor(config: AmeriabankConfig, testMode: boolean = true) {
    super(config, testMode, "ameriabank");
    
    const ameriabankConfig = config as AmeriabankConfig;
    this.clientID = ameriabankConfig.clientID;
    this.accounts = ameriabankConfig.accounts;
    this.minTestOrderId = ameriabankConfig.minTestOrderId;
    this.maxTestOrderId = ameriabankConfig.maxTestOrderId;
    this.successUrl = ameriabankConfig.successUrl;
    this.failUrl = ameriabankConfig.failUrl;
    this.resultUrl = ameriabankConfig.resultUrl;
  }

  /**
   * Initiate payment
   * 
   * Calls Ameriabank InitPayment API
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

      // Check test order ID range if in test mode
      if (this.testMode && this.minTestOrderId && this.maxTestOrderId) {
        const orderNum = parseInt(order.orderNumber);
        if (orderNum < this.minTestOrderId || orderNum > this.maxTestOrderId) {
          return this.createErrorResponse(
            "INVALID_TEST_ORDER_ID",
            `Order ID must be between ${this.minTestOrderId} and ${this.maxTestOrderId} in test mode`
          );
        }
      }

      // Prepare payment request
      const apiUrl = this.testMode 
        ? `${this.TEST_API_BASE_URL}/InitPayment`
        : `${this.API_BASE_URL}/InitPayment`;

      const requestData = {
        ClientID: this.clientID,
        Username: account.username,
        Password: account.password,
        OrderID: order.orderNumber,
        Amount: order.amount,
        Currency: order.currency,
        Description: order.description || `Order ${order.orderNumber}`,
        BackURL: this.successUrl || order.returnUrl,
        FailURL: this.failUrl || order.cancelUrl,
      };

      // Call InitPayment API
      const response = await this.postRequest<any>(apiUrl, requestData);

      // Check response
      if (response.ResponseCode === "00" && response.PaymentID) {
        // Get redirect URL
        const redirectUrl = response.PaymentURL || response.FormURL;

        return this.createSuccessResponse(
          response.PaymentID,
          response.PaymentID, // Transaction ID will be available after payment
          redirectUrl
        );
      } else {
        return this.createErrorResponse(
          response.ResponseCode || "PAYMENT_ERROR",
          response.ResponseMessage || "Failed to initiate payment"
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

      // Ameriabank webhook verification
      // Based on PHP implementation: verification is done via GetPaymentDetails API call
      // Webhook callback contains: OrderID, PaymentID, ResponseCode, currency
      // Full verification is done by calling GetPaymentDetails API after receiving callback
      const requiredFields = ["OrderID", "PaymentID", "ResponseCode"];

      for (const field of requiredFields) {
        if (!payload[field]) {
          return {
            valid: false,
            error: `Missing required field: ${field}`,
          };
        }
      }

      // Note: Ameriabank doesn't send signature in callback
      // Verification is done by calling GetPaymentDetails API with PaymentID
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
   * Based on PHP implementation: After receiving callback with PaymentID,
   * we call GetPaymentDetails API to verify and get full payment status
   */
  async processWebhook(data: PaymentWebhookData): Promise<PaymentStatus> {
    try {
      const verification = await this.verifyWebhook(data);
      if (!verification.valid) {
        return "failed";
      }

      const payload = data.payload;
      const responseCode = payload.ResponseCode;
      const paymentID = payload.PaymentID;

      // If we have PaymentID, verify by calling GetPaymentDetails API
      // This matches PHP implementation behavior
      if (paymentID && responseCode === "00") {
        try {
          const status = await this.getPaymentStatus(paymentID);
          return status;
        } catch (error) {
          // If API call fails, fall back to responseCode check
          this.logError(error, { paymentID, context: "GetPaymentDetails API call failed" });
        }
      }

      // ResponseCode "00" means success
      if (responseCode === "00") {
        return "completed";
      } else {
        return "failed";
      }
    } catch (error) {
      this.logError(error, { webhookData: this.sanitizeForLogging(data.payload) });
      return "failed";
    }
  }

  /**
   * Get payment status from provider
   * 
   * Calls GetPaymentDetails API
   */
  async getPaymentStatus(transactionId: string): Promise<PaymentStatus> {
    try {
      // Get account credentials (default to AMD)
      const account = this.accounts.AMD || this.accounts.USD || this.accounts.EUR || this.accounts.RUB;
      if (!account) {
        throw new Error("No account credentials configured");
      }

      const apiUrl = this.testMode
        ? `${this.TEST_API_BASE_URL}/GetPaymentDetails`
        : `${this.API_BASE_URL}/GetPaymentDetails`;

      const requestData = {
        ClientID: this.clientID,
        Username: account.username,
        Password: account.password,
        PaymentID: transactionId,
      };

      const response = await this.postRequest<any>(apiUrl, requestData);

      if (response.ResponseCode === "00") {
        return response.Status === "Completed" ? "completed" : "pending";
      } else {
        return "failed";
      }
    } catch (error) {
      this.logError(error, { transactionId });
      return "failed";
    }
  }

  /**
   * Validate Ameriabank configuration
   */
  protected validateConfig(config: PaymentGatewayConfig): boolean {
    const ameriabankConfig = config as AmeriabankConfig;

    if (!ameriabankConfig.clientID) {
      return false;
    }

    if (!ameriabankConfig.accounts) {
      return false;
    }

    // At least one currency account must be configured
    const hasAccount = Object.values(ameriabankConfig.accounts).some(
      (account) => account && account.username && account.password
    );

    if (!hasAccount) {
      return false;
    }

    return true;
  }
}

