/**
 * ArCa Payment Service
 * 
 * Implementation of ArCa (iPay) payment gateway
 * Supports multiple Armenian banks via ArCa payment system
 */

import { BasePaymentService } from "./base-payment.service";
import {
  PaymentOrder,
  PaymentResponse,
  PaymentWebhookData,
  PaymentGatewayConfig,
  PaymentStatus,
  WebhookVerificationResult,
  ArcaConfig,
  ArcaBankId,
} from "../../types/payments";

/**
 * ArCa Payment Service
 * 
 * Handles payment processing via ArCa (iPay) payment system
 * Supports: ACBA, Ardshin, Evoca, Armswiss, Byblos, Ararat, Armeconombank, IDBank, Convers
 */
export class ArcaPaymentService extends BasePaymentService {
  private bankId: ArcaBankId;
  private accounts: ArcaConfig["accounts"];
  private testPort?: number;
  private successUrl?: string;
  private failUrl?: string;
  private resultUrl?: string;

  // ArCa API endpoints
  private readonly API_BASE_URL = "https://ipay.arca.am";
  private readonly TEST_API_BASE_URL = "https://testipay.arca.am";

  constructor(config: ArcaConfig, testMode: boolean = true) {
    super(config, testMode, "arca");
    
    const arcaConfig = config as ArcaConfig;
    this.bankId = arcaConfig.bankId;
    this.accounts = arcaConfig.accounts;
    this.testPort = arcaConfig.testPort;
    this.successUrl = arcaConfig.successUrl;
    this.failUrl = arcaConfig.failUrl;
    this.resultUrl = arcaConfig.resultUrl;
  }

  /**
   * Initiate payment
   * 
   * Calls ArCa register.do API
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

      // Prepare payment request
      let apiUrl = this.testMode
        ? `${this.TEST_API_BASE_URL}/payment/rest/register.do`
        : `${this.API_BASE_URL}/payment/rest/register.do`;

      // Add port for test mode if specified
      if (this.testMode && this.testPort) {
        const urlObj = new URL(apiUrl);
        urlObj.port = String(this.testPort);
        apiUrl = urlObj.toString();
      }

      const requestData = {
        userName: account.username,
        password: account.password,
        orderNumber: order.orderNumber,
        amount: Math.round(order.amount * 100), // Amount in minor units
        currency: this.getCurrencyCode(order.currency),
        returnUrl: this.successUrl || order.returnUrl,
        failUrl: this.failUrl || order.cancelUrl,
        description: order.description || `Order ${order.orderNumber}`,
        // Bank-specific parameters
        ...(this.bankId && { bankId: this.bankId }),
      };

      // Call register.do API
      // ArCa expects form-urlencoded format (not JSON)
      const response = await this.postRequest<any>(apiUrl, requestData, {}, true);

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

      // ArCa webhook verification
      // Based on PHP implementation: verification is done via getOrderStatusExtended.do API call
      // Webhook callback contains: orderId, currency
      // Full verification is done by calling getOrderStatusExtended.do API after receiving callback
      const requiredFields = ["orderNumber", "status", "action"];

      // For callback from gateway, check if orderId and currency are present
      if (payload.orderId && payload.currency) {
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

      // Note: ArCa doesn't send signature in webhook
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
   * Based on PHP implementation: After receiving callback with orderId,
   * we call getOrderStatusExtended.do API to verify and get full payment status
   */
  async processWebhook(data: PaymentWebhookData): Promise<PaymentStatus> {
    try {
      const verification = await this.verifyWebhook(data);
      if (!verification.valid) {
        return "failed";
      }

      const payload = data.payload;
      const orderId = payload.orderId || payload.orderNumber;

      // If we have orderId from callback, verify by calling getOrderStatusExtended API
      // This matches PHP implementation behavior
      if (orderId) {
        try {
          const status = await this.getPaymentStatus(orderId);
          return status;
        } catch (error) {
          // If API call fails, fall back to status field check
          this.logError(error, { orderId, context: "getOrderStatusExtended API call failed" });
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

      let apiUrl = this.testMode
        ? `${this.TEST_API_BASE_URL}/payment/rest/getOrderStatusExtended.do`
        : `${this.API_BASE_URL}/payment/rest/getOrderStatusExtended.do`;

      // Add port for test mode if specified
      if (this.testMode && this.testPort) {
        const urlObj = new URL(apiUrl);
        urlObj.port = String(this.testPort);
        apiUrl = urlObj.toString();
      }

      const requestData = {
        userName: account.username,
        password: account.password,
        orderId: transactionId,
      };

      // ArCa expects form-urlencoded format (not JSON)
      const response = await this.postRequest<any>(apiUrl, requestData, {}, true);

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
   * Validate ArCa configuration
   */
  protected validateConfig(config: PaymentGatewayConfig): boolean {
    const arcaConfig = config as ArcaConfig;

    // Validate bank ID (1-11, excluding 4, 10, 12)
    const validBankIds: ArcaBankId[] = ["1", "2", "3", "5", "6", "7", "8", "9", "11"];
    if (!validBankIds.includes(arcaConfig.bankId)) {
      return false;
    }

    if (!arcaConfig.accounts) {
      return false;
    }

    // At least one currency account must be configured
    const hasAccount = Object.values(arcaConfig.accounts).some(
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

  /**
   * Get bank name by ID
   */
  static getBankName(bankId: ArcaBankId): string {
    const bankNames: Record<ArcaBankId, string> = {
      "1": "ACBA Bank",
      "2": "Ardshinbank",
      "3": "Evoca Bank",
      "5": "Armswissbank",
      "6": "Byblos Bank",
      "7": "Araratbank",
      "8": "Armeconombank",
      "9": "IDBank",
      "11": "Convers Bank",
    };
    return bankNames[bankId] || `Bank ${bankId}`;
  }
}

