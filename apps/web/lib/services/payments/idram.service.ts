/**
 * Idram Payment Service
 * 
 * Implementation of Idram payment gateway
 * Based on Idram Merchant API documentation
 */

import { BasePaymentService } from "./base-payment.service";
import {
  PaymentOrder,
  PaymentResponse,
  PaymentWebhookData,
  PaymentGatewayConfig,
  PaymentStatus,
  WebhookVerificationResult,
  IdramConfig,
} from "../../types/payments";

/**
 * Idram Payment Service
 * 
 * Handles payment processing via Idram payment system
 */
export class IdramPaymentService extends BasePaymentService {
  private idramID: string;
  private idramKey: string;
  private rocketLine: boolean;
  private defaultLanguage: "en" | "hy" | "ru";
  private successUrl?: string;
  private failUrl?: string;
  private resultUrl?: string;

  constructor(config: IdramConfig, testMode: boolean = true) {
    super(config, testMode, "idram");
    
    const idramConfig = config as IdramConfig;
    
    // Use test or production credentials based on testMode
    this.idramID = testMode 
      ? (idramConfig.idramTestID || idramConfig.idramID || "")
      : (idramConfig.idramID || "");
    
    this.idramKey = testMode
      ? (idramConfig.idramTestKey || idramConfig.idramKey || "")
      : (idramConfig.idramKey || "");
    
    this.rocketLine = idramConfig.rocketLine || false;
    this.defaultLanguage = idramConfig.defaultLanguage || "en";
    this.successUrl = idramConfig.successUrl;
    this.failUrl = idramConfig.failUrl;
    this.resultUrl = idramConfig.resultUrl;
  }

  /**
   * Initiate payment
   * 
   * Generates HTML form with hidden fields for Idram payment
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

      // Validate currency (Idram supports AMD)
      if (order.currency !== "AMD") {
        return this.createErrorResponse(
          "INVALID_CURRENCY",
          "Idram only supports AMD currency"
        );
      }

      // Validate required fields
      if (!this.idramID || !this.idramKey) {
        return this.createErrorResponse(
          "MISSING_CREDENTIALS",
          "Idram ID and Key are required"
        );
      }

      // Prepare form data
      const formData: Record<string, string> = {
        EDP_LANGUAGE: this.defaultLanguage.toUpperCase(),
        EDP_REC_ACCOUNT: this.idramID,
        EDP_AMOUNT: order.amount.toFixed(2),
        EDP_BILL_NO: order.orderNumber,
      };

      // Add description if provided
      if (order.description) {
        formData.EDP_DESCRIPTION = order.description;
      }

      // Add email if provided
      if (order.customerEmail) {
        formData.EDP_EMAIL = order.customerEmail;
      }

      // Add custom metadata fields (without EDP_ prefix)
      if (order.metadata) {
        Object.entries(order.metadata).forEach(([key, value]) => {
          if (!key.startsWith("EDP_")) {
            formData[key] = String(value);
          }
        });
      }

      // Idram payment form action URL
      const formAction = "https://banking.idram.am/Payment/GetPayment";

      return this.createSuccessResponse(
        undefined, // paymentId will be set after webhook
        undefined, // transactionId will be set after webhook
        undefined, // no redirect URL, use form submission
        formData,
        formAction,
        "POST"
      );
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
   * 
   * Verifies MD5 checksum for payment confirmation requests
   */
  async verifyWebhook(data: PaymentWebhookData): Promise<WebhookVerificationResult> {
    try {
      const payload = data.payload;
      
      // Check if this is a precheck request
      if (payload.EDP_PRECHECK === "YES") {
        // Precheck request - verify order exists and amount matches
        return {
          valid: true,
          payload: payload,
        };
      }

      // Payment confirmation request - verify checksum
      const requiredFields = [
        "EDP_BILL_NO",
        "EDP_REC_ACCOUNT",
        "EDP_PAYER_ACCOUNT",
        "EDP_AMOUNT",
        "EDP_TRANS_ID",
        "EDP_TRANS_DATE",
        "EDP_CHECKSUM",
      ];

      // Check all required fields are present
      for (const field of requiredFields) {
        if (!payload[field]) {
          return {
            valid: false,
            error: `Missing required field: ${field}`,
          };
        }
      }

      // Calculate checksum
      // Checksum = MD5(EDP_REC_ACCOUNT:EDP_AMOUNT:SECRET_KEY:EDP_BILL_NO:EDP_PAYER_ACCOUNT:EDP_TRANS_ID:EDP_TRANS_DATE)
      // Fields are concatenated with colon (":")
      const checksumString = [
        payload.EDP_REC_ACCOUNT,
        payload.EDP_AMOUNT,
        this.idramKey,
        payload.EDP_BILL_NO,
        payload.EDP_PAYER_ACCOUNT,
        payload.EDP_TRANS_ID,
        payload.EDP_TRANS_DATE,
      ].join(":");

      const calculatedChecksum = this.generateMD5Hash(checksumString).toUpperCase();
      const receivedChecksum = String(payload.EDP_CHECKSUM).toUpperCase();

      if (calculatedChecksum !== receivedChecksum) {
        this.logError(
          new Error("Checksum mismatch"),
          {
            calculated: calculatedChecksum,
            received: receivedChecksum,
            billNo: payload.EDP_BILL_NO,
          }
        );

        return {
          valid: false,
          error: "Checksum verification failed",
        };
      }

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
   * Processes precheck and payment confirmation requests
   */
  async processWebhook(data: PaymentWebhookData): Promise<PaymentStatus> {
    try {
      const payload = data.payload;

      // Handle precheck request
      if (payload.EDP_PRECHECK === "YES") {
        // Precheck: verify order exists and amount matches
        // This should be handled by the webhook handler to check order in database
        // Return pending status - actual payment hasn't happened yet
        return "pending";
      }

      // Handle payment confirmation request
      // Verify webhook first
      const verification = await this.verifyWebhook(data);
      if (!verification.valid) {
        return "failed";
      }

      // Payment is confirmed
      return "completed";
    } catch (error) {
      this.logError(error, { webhookData: this.sanitizeForLogging(data.payload) });
      return "failed";
    }
  }

  /**
   * Get payment status from provider
   * 
   * Note: Idram doesn't provide a status check API
   * Status is only available via webhook callbacks
   */
  async getPaymentStatus(transactionId: string): Promise<PaymentStatus> {
    // Idram doesn't have a status check endpoint
    // Payment status is only communicated via webhooks
    this.logError(
      new Error("Idram doesn't support payment status queries"),
      { transactionId }
    );
    
    return "pending";
  }

  /**
   * Validate Idram configuration
   */
  protected validateConfig(config: PaymentGatewayConfig): boolean {
    const idramConfig = config as IdramConfig;

    // In test mode, test credentials are required
    if (this.testMode) {
      if (!idramConfig.idramTestID && !idramConfig.idramID) {
        return false;
      }
      if (!idramConfig.idramTestKey && !idramConfig.idramKey) {
        return false;
      }
    } else {
      // In production mode, production credentials are required
      if (!idramConfig.idramID) {
        return false;
      }
      if (!idramConfig.idramKey) {
        return false;
      }
    }

    // Validate language
    if (idramConfig.defaultLanguage) {
      const validLanguages = ["en", "hy", "ru"];
      if (!validLanguages.includes(idramConfig.defaultLanguage)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Extract payment data from webhook payload
   */
  extractPaymentData(payload: Record<string, any>): {
    orderNumber: string;
    transactionId: string;
    amount: number;
    payerAccount: string;
    transactionDate: string;
  } | null {
    try {
      return {
        orderNumber: payload.EDP_BILL_NO,
        transactionId: payload.EDP_TRANS_ID,
        amount: parseFloat(payload.EDP_AMOUNT),
        payerAccount: payload.EDP_PAYER_ACCOUNT,
        transactionDate: payload.EDP_TRANS_DATE,
      };
    } catch (error) {
      this.logError(error, { payload });
      return null;
    }
  }
}

