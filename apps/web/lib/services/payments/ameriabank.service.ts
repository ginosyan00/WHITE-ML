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
  // Production: https://services.ameriabank.am
  // Test: https://servicestest.ameriabank.am
  private readonly API_BASE_URL = "https://services.ameriabank.am";
  private readonly TEST_API_BASE_URL = "https://servicestest.ameriabank.am";
  private readonly API_PATH = "/VPOS/api/VPOS";

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
        ? `${this.TEST_API_BASE_URL}${this.API_PATH}/InitPayment`
        : `${this.API_BASE_URL}${this.API_PATH}/InitPayment`;

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
      const backUrl = this.successUrl || order.returnUrl;
      const failUrl = this.failUrl || order.cancelUrl;
      
      if (backUrl && !backUrl.startsWith("https://")) {
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

      const requestData = {
        ClientID: this.clientID,
        Username: account.username,
        Password: account.password,
        OrderID: order.orderNumber.trim(),
        Amount: Number(order.amount.toFixed(2)), // Ensure 2 decimal places
        Currency: order.currency,
        Description: (order.description || `Order ${order.orderNumber}`).substring(0, 255), // Limit description length
        BackURL: backUrl,
        FailURL: failUrl,
      };

      // Call InitPayment API
      // Ameriabank expects form-urlencoded format (not JSON)
      const response = await this.postRequest<any>(apiUrl, requestData, {}, true);

      // Validate response structure
      if (!response || typeof response !== "object") {
        return this.createErrorResponse(
          "INVALID_RESPONSE",
          "Invalid response format from payment gateway"
        );
      }

      // Ameriabank uses ResponseCode == 1 for successful registration
      // ResponseCode == "00" is used for payment completion
      if (response.ResponseCode === 1 && response.PaymentID) {
        // Build redirect URL to payment page
        // Format: https://services[test].ameriabank.am/VPOS/Payments/Pay?id={PaymentID}&lang={lang}
        const paymentBaseUrl = this.testMode 
          ? this.TEST_API_BASE_URL
          : this.API_BASE_URL;
        
        // Determine language code (hy -> am for Armenian)
        const lang = order.metadata?.language === "hy" ? "am" : (order.metadata?.language || "en");
        
        const redirectUrl = `${paymentBaseUrl}/VPOS/Payments/Pay?id=${response.PaymentID}&lang=${lang}`;

        // Validate PaymentID format (should be UUID)
        if (!/^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i.test(response.PaymentID)) {
          this.logError(
            new Error("Invalid PaymentID format"),
            { paymentID: response.PaymentID, orderId: order.orderId }
          );
        }

        return this.createSuccessResponse(
          response.PaymentID,
          response.PaymentID, // Transaction ID will be available after payment
          redirectUrl
        );
      } else {
        // Log error details for debugging
        this.logError(
          new Error(`Payment initiation failed: ${response.ResponseCode || "Unknown"}`),
          {
            orderId: order.orderId,
            responseCode: response.ResponseCode,
            responseMessage: response.ResponseMessage,
          }
        );

        return this.createErrorResponse(
          String(response.ResponseCode || "PAYMENT_ERROR"),
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

      // ResponseCode "00" means payment success
      // Validate responseCode format
      if (responseCode === "00" || responseCode === 0) {
        return "completed";
      } else {
        // Log failed payment
        this.logError(
          new Error(`Payment failed with response code: ${responseCode}`),
          { paymentID, responseCode, orderId: payload.OrderID }
        );
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
      const account = this.accounts.AMD;
      if (!account) {
        throw new Error("No account credentials configured");
      }

      // Validate transaction ID
      if (!transactionId || transactionId.trim().length === 0) {
        throw new Error("Transaction ID is required");
      }

      const apiUrl = this.testMode
        ? `${this.TEST_API_BASE_URL}${this.API_PATH}/GetPaymentDetails`
        : `${this.API_BASE_URL}${this.API_PATH}/GetPaymentDetails`;

      const requestData = {
        Username: account.username,
        Password: account.password,
        paymentID: transactionId.trim(), // Note: lowercase 'p' in paymentID for GetPaymentDetails
      };

      // Ameriabank expects form-urlencoded format (not JSON)
      const response = await this.postRequest<any>(apiUrl, requestData, {}, true);

      // Validate response structure
      if (!response || typeof response !== "object") {
        this.logError(
          new Error("Invalid response format from GetPaymentDetails"),
          { transactionId }
        );
        return "failed";
      }

      // ResponseCode "00" means success
      if (response.ResponseCode === "00" || response.ResponseCode === 0) {
        // Check payment state
        const paymentState = response.paymentAmountInfo?.paymentState || response.Status;
        if (paymentState === "Completed" || paymentState === "COMPLETED") {
          return "completed";
        } else if (paymentState === "Failed" || paymentState === "FAILED") {
          return "failed";
        } else {
          return "pending";
        }
      } else {
        this.logError(
          new Error(`GetPaymentDetails failed: ${response.ResponseCode}`),
          { transactionId, responseCode: response.ResponseCode }
        );
        return "failed";
      }
    } catch (error) {
      this.logError(error, { transactionId });
      return "failed";
    }
  }

  /**
   * Refund payment
   * 
   * Calls Ameriabank RefundPayment API
   * Supports partial and full refunds
   * 
   * @param transactionId - PaymentID from gateway
   * @param amount - Refund amount (in major currency units, e.g., AMD)
   * @param currency - Currency code (default: AMD)
   * @returns Payment response with refund status
   */
  async refund(transactionId: string, amount: number, currency: string = "AMD"): Promise<PaymentResponse> {
    try {
      console.log(`💳 [AMERIABANK REFUND] Starting refund for transactionId: ${transactionId}, amount: ${amount} ${currency}`);

      // Validate amount
      if (!this.validateAmount(amount, 0.01)) {
        return this.createErrorResponse(
          "INVALID_AMOUNT",
          "Refund amount must be greater than 0.01"
        );
      }

      // Validate currency (only AMD supported)
      if (currency !== "AMD") {
        return this.createErrorResponse(
          "INVALID_CURRENCY",
          `Only AMD currency is supported. Received: ${currency}`
        );
      }

      // Get account credentials (default to AMD)
      const account = this.accounts.AMD;
      if (!account || !account.username || !account.password) {
        return this.createErrorResponse(
          "MISSING_ACCOUNT",
          "AMD account credentials not configured"
        );
      }

      // Validate transaction ID
      if (!transactionId || transactionId.trim().length === 0) {
        return this.createErrorResponse(
          "INVALID_TRANSACTION_ID",
          "Transaction ID is required"
        );
      }

      // Prepare refund request
      const apiUrl = this.testMode
        ? `${this.TEST_API_BASE_URL}${this.API_PATH}/RefundPayment`
        : `${this.API_BASE_URL}${this.API_PATH}/RefundPayment`;

      const requestData = {
        PaymentID: transactionId.trim(),
        Username: account.username,
        Password: account.password,
        Amount: amount,
      };

      console.log(`💳 [AMERIABANK REFUND] Calling RefundPayment API: ${apiUrl}`);

      // Ameriabank expects form-urlencoded format (not JSON)
      const response = await this.postRequest<any>(apiUrl, requestData, {}, true);

      // Check response
      if (response.ResponseCode === "00" || response.ResponseCode === 0) {
        console.log(`✅ [AMERIABANK REFUND] Refund successful for transactionId: ${transactionId}`);
        
        return {
          success: true,
          status: "refunded",
          transactionId: transactionId,
          message: response.ResponseMessage || "Refund processed successfully",
          data: {
            refundAmount: amount,
            refundCurrency: currency,
            refundTimestamp: new Date().toISOString(),
          },
        };
      } else {
        const errorCode = response.ResponseCode || "UNKNOWN";
        const errorMessage = response.ResponseMessage || "Failed to process refund";
        console.error(`❌ [AMERIABANK REFUND] Refund failed: ${errorCode} - ${errorMessage}`);
        
        return this.createErrorResponse(
          errorCode,
          errorMessage,
          {
            refundAmount: amount,
            refundCurrency: currency,
            refundTimestamp: new Date().toISOString(),
          }
        );
      }
    } catch (error) {
      this.logError(error, { transactionId, amount, currency, operation: "refund" });
      return this.createErrorResponse(
        "REFUND_ERROR",
        error instanceof Error ? error.message : "Failed to process refund",
        {
          refundAmount: amount,
          refundCurrency: currency,
        }
      );
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

