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
   * Register order with pre-authorization (two-stage payment)
   * 
   * Calls ArCa registerPreAuth.do API
   * This creates a pre-authorized payment that can be completed later with deposit.do
   * 
   * @param order - Payment order data
   * @returns Payment response with redirect URL
   */
  async registerPreAuth(order: PaymentOrder): Promise<PaymentResponse> {
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

      // Prepare pre-auth registration request
      let apiUrl = this.testMode
        ? `${this.TEST_API_BASE_URL}/payment/rest/registerPreAuth.do`
        : `${this.API_BASE_URL}/payment/rest/registerPreAuth.do`;

      // Add port for test mode if specified
      if (this.testMode && this.testPort) {
        const urlObj = new URL(apiUrl);
        urlObj.port = String(this.testPort);
        apiUrl = urlObj.toString();
      }

      const requestData: Record<string, any> = {
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

      // Add jsonParams support (for recurring, transaction_type, clientId, etc.)
      const jsonParams: Record<string, any> = {};
      
      // Extract clientId from metadata if present
      if (order.metadata?.clientId) {
        requestData.clientId = order.metadata.clientId;
      }
      
      // Extract transaction_type from metadata (for P2P, P2P_credit)
      if (order.metadata?.transactionType) {
        jsonParams.transaction_type = order.metadata.transactionType;
      }
      
      // Extract recurring parameters from metadata
      if (order.metadata?.recurringExpiry) {
        jsonParams.recurringExpiry = order.metadata.recurringExpiry;
      }
      if (order.metadata?.recurringFrequency) {
        jsonParams.recurringFrequency = order.metadata.recurringFrequency;
      }
      if (order.metadata?.recurringInitialize !== undefined) {
        jsonParams.recurringInitialize = order.metadata.recurringInitialize;
      }
      if (order.metadata?.recurringId) {
        jsonParams.recurringId = order.metadata.recurringId;
      }
      
      // Add any additional jsonParams from metadata
      if (order.metadata?.jsonParams) {
        Object.assign(jsonParams, order.metadata.jsonParams);
      }
      
      // Add jsonParams if any were set
      if (Object.keys(jsonParams).length > 0) {
        requestData.jsonParams = JSON.stringify(jsonParams);
      }

      console.log(`💳 [ARCA REGISTER PREAUTH] Calling registerPreAuth.do API: ${apiUrl}`);

      // Call registerPreAuth.do API
      // ArCa expects form-urlencoded format (not JSON)
      const response = await this.postRequest<any>(apiUrl, requestData, {}, true);

      console.log(`💳 [ARCA REGISTER PREAUTH] Response received:`, {
        errorCode: response.errorCode,
        orderId: response.orderId,
        formUrl: response.formUrl ? "present" : "missing",
      });

      // Check response
      if (response.errorCode === "0" && response.formUrl) {
        console.log(`✅ [ARCA REGISTER PREAUTH] Pre-auth registration successful: ${response.orderId}`);
        return this.createSuccessResponse(
          response.orderId,
          response.orderId,
          response.formUrl,
          undefined,
          undefined,
          undefined,
          {
            isPreAuth: true,
            paymentType: "two-stage",
          }
        );
      } else {
        const errorCode = response.errorCode || "PREAUTH_ERROR";
        const errorMessage = response.errorMessage || "Failed to register pre-auth payment";
        console.error(`❌ [ARCA REGISTER PREAUTH] Registration failed: ${errorCode} - ${errorMessage}`);
        return this.createErrorResponse(
          errorCode,
          errorMessage
        );
      }
    } catch (error) {
      this.logError(error, { orderId: order.orderId, operation: "registerPreAuth" });
      return this.createErrorResponse(
        "PREAUTH_ERROR",
        error instanceof Error ? error.message : "Failed to register pre-auth payment"
      );
    }
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

      const requestData: Record<string, any> = {
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

      // Add jsonParams support (for recurring, transaction_type, clientId, etc.)
      const jsonParams: Record<string, any> = {};
      
      // Extract clientId from metadata if present
      if (order.metadata?.clientId) {
        requestData.clientId = order.metadata.clientId;
      }
      
      // Extract transaction_type from metadata (for P2P, P2P_credit)
      if (order.metadata?.transactionType) {
        jsonParams.transaction_type = order.metadata.transactionType;
      }
      
      // Extract recurring parameters from metadata
      if (order.metadata?.recurringExpiry) {
        jsonParams.recurringExpiry = order.metadata.recurringExpiry;
      }
      if (order.metadata?.recurringFrequency) {
        jsonParams.recurringFrequency = order.metadata.recurringFrequency;
      }
      if (order.metadata?.recurringInitialize !== undefined) {
        jsonParams.recurringInitialize = order.metadata.recurringInitialize;
      }
      if (order.metadata?.recurringId) {
        jsonParams.recurringId = order.metadata.recurringId;
      }
      
      // Add any additional jsonParams from metadata
      if (order.metadata?.jsonParams) {
        Object.assign(jsonParams, order.metadata.jsonParams);
      }
      
      // Add jsonParams if any were set
      if (Object.keys(jsonParams).length > 0) {
        requestData.jsonParams = JSON.stringify(jsonParams);
      }

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
      console.log(`💳 [ARCA WEBHOOK] Processing webhook:`, {
        eventType: data.eventType,
        orderId: data.orderId,
        transactionId: data.transactionId,
      });

      const verification = await this.verifyWebhook(data);
      if (!verification.valid) {
        console.error(`❌ [ARCA WEBHOOK] Webhook verification failed`);
        return "failed";
      }

      const payload = data.payload;
      const orderId = payload.orderId || payload.orderNumber;

      // If we have orderId from callback, verify by calling getOrderStatusExtended API
      // This matches PHP implementation behavior
      if (orderId) {
        try {
          const status = await this.getPaymentStatus(orderId);
          console.log(`✅ [ARCA WEBHOOK] Status retrieved from API: ${status}`);
          return status;
        } catch (error) {
          // If API call fails, fall back to status field check
          this.logError(error, { orderId, context: "getOrderStatusExtended API call failed" });
        }
      }

      // Fallback: check status field directly (orderStatus from webhook)
      const orderStatus = payload.orderStatus || payload.status;

      if (orderStatus !== undefined && orderStatus !== null) {
        const mappedStatus = this.mapOrderStatusToPaymentStatus(orderStatus);
        console.log(`✅ [ARCA WEBHOOK] Status mapped from payload: ${orderStatus} -> ${mappedStatus}`);
        return mappedStatus;
      }

      // Last fallback: check status field (legacy format)
      const status = payload.status;
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
   * Parse extended status information from getOrderStatusExtended response
   * 
   * Extracts paymentAmountInfo, bankInfo, cardAuthInfo, and other extended fields
   * Available in version 02+ of getOrderStatusExtended API
   * 
   * @param response - API response from getOrderStatusExtended
   * @returns Parsed extended status information
   */
  private parseExtendedStatus(response: any): {
    paymentAmountInfo?: {
      approvedAmount?: number;
      depositedAmount?: number;
      refundedAmount?: number;
      paymentState?: number;
    };
    bankInfo?: {
      bankName?: string;
      bankCountryCode?: string;
      bankCountryName?: string;
    };
    cardAuthInfo?: {
      expiration?: string;
      pan?: string;
      approvalCode?: string;
      cardholderName?: string;
    };
    authDateTime?: string;
    authRefNum?: string;
    terminalId?: string;
  } | null {
    try {
      const extendedInfo: any = {};

      // Parse paymentAmountInfo (version 03+)
      if (response.paymentAmountInfo) {
        extendedInfo.paymentAmountInfo = {
          approvedAmount: response.paymentAmountInfo.approvedAmount
            ? Number(response.paymentAmountInfo.approvedAmount) / 100
            : undefined,
          depositedAmount: response.paymentAmountInfo.depositedAmount
            ? Number(response.paymentAmountInfo.depositedAmount) / 100
            : undefined,
          refundedAmount: response.paymentAmountInfo.refundedAmount
            ? Number(response.paymentAmountInfo.refundedAmount) / 100
            : undefined,
          paymentState: response.paymentAmountInfo.paymentState
            ? Number(response.paymentAmountInfo.paymentState)
            : undefined,
        };
      }

      // Parse bankInfo (version 03+)
      if (response.bankInfo) {
        extendedInfo.bankInfo = {
          bankName: response.bankInfo.bankName,
          bankCountryCode: response.bankInfo.bankCountryCode,
          bankCountryName: response.bankInfo.bankCountryName,
        };
      }

      // Parse cardAuthInfo (if available)
      if (response.cardAuthInfo) {
        extendedInfo.cardAuthInfo = {
          expiration: response.cardAuthInfo.expiration,
          pan: response.cardAuthInfo.pan,
          approvalCode: response.cardAuthInfo.approvalCode,
          cardholderName: response.cardAuthInfo.cardholderName,
        };
      }

      // Parse additional fields (version 02+)
      if (response.authDateTime) {
        extendedInfo.authDateTime = response.authDateTime;
      }
      if (response.authRefNum) {
        extendedInfo.authRefNum = response.authRefNum;
      }
      if (response.terminalId) {
        extendedInfo.terminalId = response.terminalId;
      }

      // Return null if no extended info found
      if (Object.keys(extendedInfo).length === 0) {
        return null;
      }

      return extendedInfo;
    } catch (error) {
      this.logError(error, { context: "parseExtendedStatus" });
      return null;
    }
  }

  /**
   * Parse actionCode and return detailed information
   * 
   * ActionCode provides detailed information about the payment result
   * Common action codes:
   * - 0: Approved - Payment successful
   * - 1-999: Various decline reasons
   * - 1000+: System errors
   * 
   * @param actionCode - ArCa actionCode value
   * @param actionCodeDescription - Description from API (if available)
   * @returns Action code information
   */
  private parseActionCode(
    actionCode: number | string | undefined,
    actionCodeDescription?: string
  ): {
    code: number | null;
    isSuccess: boolean;
    isDeclined: boolean;
    category: "approved" | "declined" | "error" | "unknown";
    description: string;
  } {
    if (actionCode === undefined || actionCode === null) {
      return {
        code: null,
        isSuccess: false,
        isDeclined: false,
        category: "unknown",
        description: "Action code not available",
      };
    }

    const code = typeof actionCode === "string" ? parseInt(actionCode, 10) : actionCode;

    // Use provided description if available
    if (actionCodeDescription) {
      const isSuccess = code === 0;
      const isDeclined = code > 0 && code < 1000;
      
      return {
        code,
        isSuccess,
        isDeclined,
        category: isSuccess ? "approved" : isDeclined ? "declined" : "error",
        description: actionCodeDescription,
      };
    }

    // Parse based on code ranges
    if (code === 0) {
      return {
        code,
        isSuccess: true,
        isDeclined: false,
        category: "approved",
        description: "Approved. Payment successful",
      };
    }

    if (code > 0 && code < 1000) {
      // Decline codes (1-999)
      return {
        code,
        isSuccess: false,
        isDeclined: true,
        category: "declined",
        description: `Declined. Action code: ${code}`,
      };
    }

    if (code >= 1000) {
      // System errors (1000+)
      return {
        code,
        isSuccess: false,
        isDeclined: false,
        category: "error",
        description: `System error. Action code: ${code}`,
      };
    }

    // Negative codes (special cases)
    if (code < 0) {
      return {
        code,
        isSuccess: false,
        isDeclined: false,
        category: "error",
        description: `Error. Action code: ${code}`,
      };
    }

    return {
      code,
      isSuccess: false,
      isDeclined: false,
      category: "unknown",
      description: `Unknown action code: ${code}`,
    };
  }

  /**
   * Map ArCa orderStatus to PaymentStatus
   * 
   * ArCa orderStatus values:
   * 0 - CREATED: Заказ зарегистрирован, но не оплачен
   * 1 - APPROVED: Деньги были захолдированы на карте (для двухстадийных платежей)
   * 2 - DEPOSITED: Проведена полная авторизация суммы заказа
   * 3 - REVERSED: Авторизация отменена
   * 4 - REFUNDED: По транзакции была проведена операция возврата
   * 5 - Authorization started: Инициирована авторизация через ACS банка-эмитента
   * 6 - DECLINED: Авторизация отклонена
   * 
   * @param orderStatus - ArCa orderStatus value
   * @returns PaymentStatus
   */
  private mapOrderStatusToPaymentStatus(orderStatus: number | string): PaymentStatus {
    const status = typeof orderStatus === "string" ? parseInt(orderStatus, 10) : orderStatus;

    switch (status) {
      case 0: // CREATED - Заказ зарегистрирован, но не оплачен
        return "pending";
      
      case 1: // APPROVED - Деньги были захолдированы на карте (pre-authorized)
        return "pending"; // Pre-authorized, but not yet completed
      
      case 2: // DEPOSITED - Проведена полная авторизация суммы заказа
        return "completed";
      
      case 3: // REVERSED - Авторизация отменена
        return "cancelled";
      
      case 4: // REFUNDED - По транзакции была проведена операция возврата
        return "refunded";
      
      case 5: // Authorization started - Инициирована авторизация через ACS банка-эмитента
        return "processing"; // Authorization in progress
      
      case 6: // DECLINED - Авторизация отклонена
        return "failed";
      
      default:
        console.warn(`[ARCA] Unknown orderStatus: ${orderStatus}, defaulting to pending`);
        return "pending";
    }
  }

  /**
   * Get payment status from provider
   * 
   * Calls getOrderStatusExtended.do API
   */
  async getPaymentStatus(transactionId: string): Promise<PaymentStatus> {
    try {
      console.log(`💳 [ARCA GET STATUS] Getting status for transactionId: ${transactionId}`);

      // Get account credentials (default to AMD)
      const account = this.accounts.AMD;
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

      // Parse action code for detailed information
      const actionCodeInfo = this.parseActionCode(
        response.actionCode,
        response.actionCodeDescription
      );

      // Parse extended status information (if available)
      const extendedInfo = this.parseExtendedStatus(response);

      console.log(`💳 [ARCA GET STATUS] Response received:`, {
        errorCode: response.errorCode,
        orderStatus: response.orderStatus,
        actionCode: response.actionCode,
        actionCodeInfo: actionCodeInfo.description,
        hasExtendedInfo: !!extendedInfo,
      });

      if (response.errorCode === "0" || response.errorCode === 0) {
        const orderStatus = response.orderStatus;
        let mappedStatus = this.mapOrderStatusToPaymentStatus(orderStatus);
        
        // If action code indicates decline but orderStatus is not DECLINED, adjust status
        if (actionCodeInfo.isDeclined && mappedStatus !== "failed" && mappedStatus !== "cancelled") {
          mappedStatus = "failed";
          console.log(`⚠️ [ARCA GET STATUS] Action code indicates decline, adjusting status to failed`);
        }
        
        console.log(`✅ [ARCA GET STATUS] Status mapped: ${orderStatus} -> ${mappedStatus} (actionCode: ${actionCodeInfo.code})`);
        
        return mappedStatus;
      } else {
        const errorMessage = response.errorMessage || "Failed to get payment status";
        console.error(`❌ [ARCA GET STATUS] API error: ${response.errorCode} - ${errorMessage}`);
        return "failed";
      }
    } catch (error) {
      this.logError(error, { transactionId, operation: "getPaymentStatus" });
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
   * AMD = 051
   */
  private getCurrencyCode(currency: string): string {
    const currencyMap: Record<string, string> = {
      AMD: "051",
    };
    return currencyMap[currency] || "051";
  }

  /**
   * Refund payment
   * 
   * Calls ArCa refund.do API
   * Supports partial and multiple refunds
   * 
   * @param orderId - Order ID in payment system
   * @param amount - Refund amount (in major currency units, e.g., AMD)
   * @param currency - Currency code (defaults to AMD)
   * @returns Payment response with refund status
   */
  async refund(orderId: string, amount: number, currency: string = "AMD"): Promise<PaymentResponse> {
    try {
      console.log(`💳 [ARCA REFUND] Starting refund for orderId: ${orderId}, amount: ${amount} ${currency}`);

      // Validate amount
      if (!this.validateAmount(amount, 0.01)) {
        return this.createErrorResponse(
          "INVALID_AMOUNT",
          "Refund amount must be greater than 0.01"
        );
      }

      // Get account credentials for the currency
      const account = this.accounts[currency as keyof typeof this.accounts];
      if (!account || !account.username || !account.password) {
        return this.createErrorResponse(
          "MISSING_ACCOUNT",
          `${currency} account credentials not configured`
        );
      }

      // Prepare refund request
      let apiUrl = this.testMode
        ? `${this.TEST_API_BASE_URL}/payment/rest/refund.do`
        : `${this.API_BASE_URL}/payment/rest/refund.do`;

      // Add port for test mode if specified
      if (this.testMode && this.testPort) {
        const urlObj = new URL(apiUrl);
        urlObj.port = String(this.testPort);
        apiUrl = urlObj.toString();
      }

      const requestData = {
        userName: account.username,
        password: account.password,
        orderId: orderId,
        amount: Math.round(amount * 100), // Amount in minor units (kopecks/cents)
        currency: this.getCurrencyCode(currency),
        language: "ru", // Default language for error messages
      };

      console.log(`💳 [ARCA REFUND] Calling refund.do API: ${apiUrl}`);

      // ArCa expects form-urlencoded format (not JSON)
      const response = await this.postRequest<any>(apiUrl, requestData, {}, true);

      console.log(`💳 [ARCA REFUND] Response received:`, {
        errorCode: response.errorCode,
        errorMessage: response.errorMessage,
      });

      // Check response
      if (response.errorCode === "0" || response.errorCode === 0) {
        console.log(`✅ [ARCA REFUND] Refund successful for orderId: ${orderId}`);
        return this.createSuccessResponse(
          orderId,
          orderId,
          undefined,
          undefined,
          undefined,
          undefined,
          {
            refundAmount: amount,
            refundCurrency: currency,
            refundTimestamp: new Date().toISOString(),
          }
        );
      } else {
        const errorCode = String(response.errorCode || "REFUND_ERROR");
        const errorMessage = response.errorMessage || "Failed to process refund";
        console.error(`❌ [ARCA REFUND] Refund failed: ${errorCode} - ${errorMessage}`);
        return this.createErrorResponse(
          errorCode,
          errorMessage,
          {
            orderId,
            refundAmount: amount,
            refundCurrency: currency,
          }
        );
      }
    } catch (error) {
      this.logError(error, { orderId, amount, currency, operation: "refund" });
      return this.createErrorResponse(
        "REFUND_ERROR",
        error instanceof Error ? error.message : "Failed to process refund",
        {
          orderId,
          refundAmount: amount,
          refundCurrency: currency,
        }
      );
    }
  }

  /**
   * Deposit (complete pre-authorized payment)
   * 
   * Calls ArCa deposit.do API
   * Completes a pre-authorized (two-stage) payment
   * 
   * @param orderId - Order ID in payment system
   * @param amount - Deposit amount (optional - if not provided, deposits full pre-authorized amount)
   * @param currency - Currency code (defaults to AMD)
   * @returns Payment response with deposit status
   */
  async deposit(orderId: string, amount?: number, currency: string = "AMD"): Promise<PaymentResponse> {
    try {
      console.log(`💳 [ARCA DEPOSIT] Starting deposit for orderId: ${orderId}${amount ? `, amount: ${amount} ${currency}` : " (full amount)"}`);

      // Get account credentials for the currency
      const account = this.accounts[currency as keyof typeof this.accounts];
      if (!account || !account.username || !account.password) {
        return this.createErrorResponse(
          "MISSING_ACCOUNT",
          `${currency} account credentials not configured`
        );
      }

      // Prepare deposit request
      let apiUrl = this.testMode
        ? `${this.TEST_API_BASE_URL}/payment/rest/deposit.do`
        : `${this.API_BASE_URL}/payment/rest/deposit.do`;

      // Add port for test mode if specified
      if (this.testMode && this.testPort) {
        const urlObj = new URL(apiUrl);
        urlObj.port = String(this.testPort);
        apiUrl = urlObj.toString();
      }

      const requestData: Record<string, any> = {
        userName: account.username,
        password: account.password,
        orderId: orderId,
        currency: this.getCurrencyCode(currency),
        language: "ru", // Default language for error messages
      };

      // Amount is optional - if not provided, deposits full pre-authorized amount
      if (amount !== undefined && amount !== null) {
        // Validate amount if provided
        if (!this.validateAmount(amount, 0.01)) {
          return this.createErrorResponse(
            "INVALID_AMOUNT",
            "Deposit amount must be greater than 0.01"
          );
        }
        requestData.amount = Math.round(amount * 100); // Amount in minor units (kopecks/cents)
      }

      console.log(`💳 [ARCA DEPOSIT] Calling deposit.do API: ${apiUrl}`);

      // ArCa expects form-urlencoded format (not JSON)
      const response = await this.postRequest<any>(apiUrl, requestData, {}, true);

      console.log(`💳 [ARCA DEPOSIT] Response received:`, {
        errorCode: response.errorCode,
        errorMessage: response.errorMessage,
      });

      // Check response
      if (response.errorCode === "0" || response.errorCode === 0) {
        console.log(`✅ [ARCA DEPOSIT] Deposit successful for orderId: ${orderId}`);
        return this.createSuccessResponse(
          orderId,
          orderId,
          undefined,
          undefined,
          undefined,
          undefined,
          {
            depositAmount: amount,
            depositCurrency: currency,
            depositTimestamp: new Date().toISOString(),
            isFullAmount: amount === undefined,
          }
        );
      } else {
        const errorCode = String(response.errorCode || "DEPOSIT_ERROR");
        const errorMessage = response.errorMessage || "Failed to process deposit";
        console.error(`❌ [ARCA DEPOSIT] Deposit failed: ${errorCode} - ${errorMessage}`);
        return this.createErrorResponse(
          errorCode,
          errorMessage,
          {
            orderId,
            depositAmount: amount,
            depositCurrency: currency,
          }
        );
      }
    } catch (error) {
      this.logError(error, { orderId, amount, currency, operation: "deposit" });
      return this.createErrorResponse(
        "DEPOSIT_ERROR",
        error instanceof Error ? error.message : "Failed to process deposit",
        {
          orderId,
          depositAmount: amount,
          depositCurrency: currency,
        }
      );
    }
  }

  /**
   * Reverse payment (cancel transaction before deposit)
   * 
   * Calls ArCa reverse.do API
   * Can only be used before deposit is completed
   * 
   * @param orderId - Order ID in payment system
   * @returns Payment response with reversal status
   */
  async reverse(orderId: string): Promise<PaymentResponse> {
    try {
      console.log(`💳 [ARCA REVERSE] Starting reversal for orderId: ${orderId}`);

      // Get account credentials (default to AMD)
      const account = this.accounts.AMD;
      if (!account || !account.username || !account.password) {
        return this.createErrorResponse(
          "MISSING_ACCOUNT",
          "No account credentials configured"
        );
      }

      // Prepare reverse request
      let apiUrl = this.testMode
        ? `${this.TEST_API_BASE_URL}/payment/rest/reverse.do`
        : `${this.API_BASE_URL}/payment/rest/reverse.do`;

      // Add port for test mode if specified
      if (this.testMode && this.testPort) {
        const urlObj = new URL(apiUrl);
        urlObj.port = String(this.testPort);
        apiUrl = urlObj.toString();
      }

      const requestData = {
        userName: account.username,
        password: account.password,
        orderId: orderId,
      };

      console.log(`💳 [ARCA REVERSE] Calling reverse.do API: ${apiUrl}`);

      // ArCa expects form-urlencoded format (not JSON)
      const response = await this.postRequest<any>(apiUrl, requestData, {}, true);

      console.log(`💳 [ARCA REVERSE] Response received:`, {
        errorCode: response.errorCode,
        errorMessage: response.errorMessage,
      });

      // Check response
      if (response.errorCode === "0" || response.errorCode === 0) {
        console.log(`✅ [ARCA REVERSE] Reversal successful for orderId: ${orderId}`);
        return this.createSuccessResponse(
          orderId,
          orderId,
          undefined,
          undefined,
          undefined,
          undefined,
          {
            reversalTimestamp: new Date().toISOString(),
          }
        );
      } else {
        const errorCode = String(response.errorCode || "REVERSE_ERROR");
        const errorMessage = response.errorMessage || "Failed to process reversal";
        console.error(`❌ [ARCA REVERSE] Reversal failed: ${errorCode} - ${errorMessage}`);
        return this.createErrorResponse(
          errorCode,
          errorMessage,
          {
            orderId,
          }
        );
      }
    } catch (error) {
      this.logError(error, { orderId, operation: "reverse" });
      return this.createErrorResponse(
        "REVERSE_ERROR",
        error instanceof Error ? error.message : "Failed to process reversal",
        {
          orderId,
        }
      );
    }
  }

  /**
   * Verify card enrollment in 3DS
   * 
   * Calls ArCa verifyEnrollment.do API
   * Checks if a card is enrolled in 3D Secure
   * 
   * @param pan - Card number (PAN - Primary Account Number)
   * @returns Enrollment verification result
   */
  async verifyEnrollment(pan: string): Promise<{
    enrolled: "Y" | "N" | "U";
    emitterName?: string;
    emitterCountryCode?: string;
    errorCode?: string;
    errorMessage?: string;
  }> {
    try {
      console.log(`💳 [ARCA VERIFY ENROLLMENT] Checking enrollment for PAN: ${pan.substring(0, 6)}****${pan.substring(pan.length - 4)}`);

      // Validate PAN (12-19 digits)
      const panDigits = pan.replace(/\s/g, ""); // Remove spaces
      if (!/^\d{12,19}$/.test(panDigits)) {
        throw new Error("PAN must be 12-19 digits");
      }

      // Get account credentials (default to AMD)
      const account = this.accounts.AMD;
      if (!account || !account.username || !account.password) {
        throw new Error("No account credentials configured");
      }

      // Prepare verify enrollment request
      let apiUrl = this.testMode
        ? `${this.TEST_API_BASE_URL}/payment/rest/verifyEnrollment.do`
        : `${this.API_BASE_URL}/payment/rest/verifyEnrollment.do`;

      // Add port for test mode if specified
      if (this.testMode && this.testPort) {
        const urlObj = new URL(apiUrl);
        urlObj.port = String(this.testPort);
        apiUrl = urlObj.toString();
      }

      const requestData = {
        userName: account.username,
        password: account.password,
        pan: panDigits,
      };

      console.log(`💳 [ARCA VERIFY ENROLLMENT] Calling verifyEnrollment.do API: ${apiUrl}`);

      // ArCa expects form-urlencoded format (not JSON)
      const response = await this.postRequest<any>(apiUrl, requestData, {}, true);

      console.log(`💳 [ARCA VERIFY ENROLLMENT] Response received:`, {
        errorCode: response.errorCode,
        enrolled: response.enrolled,
        emitterName: response.emitterName,
      });

      // Check response
      if (response.errorCode === "0" || response.errorCode === 0) {
        const enrolled = (response.enrolled || "U") as "Y" | "N" | "U";
        console.log(`✅ [ARCA VERIFY ENROLLMENT] Enrollment check successful: ${enrolled}`);
        
        return {
          enrolled,
          emitterName: response.emitterName,
          emitterCountryCode: response.emitterCountryCode,
        };
      } else {
        const errorCode = String(response.errorCode || "ENROLLMENT_ERROR");
        const errorMessage = response.errorMessage || "Failed to verify enrollment";
        console.error(`❌ [ARCA VERIFY ENROLLMENT] Verification failed: ${errorCode} - ${errorMessage}`);
        
        return {
          enrolled: "U", // Unknown on error
          errorCode,
          errorMessage,
        };
      }
    } catch (error) {
      this.logError(error, { pan: pan.substring(0, 6) + "****", operation: "verifyEnrollment" });
      return {
        enrolled: "U",
        errorCode: "ENROLLMENT_ERROR",
        errorMessage: error instanceof Error ? error.message : "Failed to verify enrollment",
      };
    }
  }

  /**
   * Payment using binding (saved card)
   * 
   * Calls ArCa paymentOrderBinding.do API
   * Processes payment using a previously saved card binding
   * 
   * @param mdOrder - Order ID in payment system (from register/registerPreAuth)
   * @param bindingId - Binding ID (saved card identifier)
   * @param cvc - CVC code (optional, may be required for some bindings)
   * @param language - Language code (optional)
   * @returns Payment response
   */
  async paymentOrderBinding(
    mdOrder: string,
    bindingId: string,
    cvc?: string,
    language: string = "ru"
  ): Promise<PaymentResponse> {
    try {
      console.log(`💳 [ARCA BINDING PAYMENT] Processing payment with binding: ${bindingId.substring(0, 8)}...`);

      // Get account credentials (default to AMD)
      const account = this.accounts.AMD;
      if (!account || !account.username || !account.password) {
        return this.createErrorResponse(
          "MISSING_ACCOUNT",
          "No account credentials configured"
        );
      }

      // Prepare payment binding request
      let apiUrl = this.testMode
        ? `${this.TEST_API_BASE_URL}/payment/rest/paymentOrderBinding.do`
        : `${this.API_BASE_URL}/payment/rest/paymentOrderBinding.do`;

      // Add port for test mode if specified
      if (this.testMode && this.testPort) {
        const urlObj = new URL(apiUrl);
        urlObj.port = String(this.testPort);
        apiUrl = urlObj.toString();
      }

      const requestData: Record<string, any> = {
        userName: account.username,
        password: account.password,
        mdOrder: mdOrder,
        bindingId: bindingId,
        language: language,
      };

      // CVC is optional but may be required for some bindings
      if (cvc) {
        requestData.cvc = cvc;
      }

      console.log(`💳 [ARCA BINDING PAYMENT] Calling paymentOrderBinding.do API: ${apiUrl}`);

      // ArCa expects form-urlencoded format (not JSON)
      const response = await this.postRequest<any>(apiUrl, requestData, {}, true);

      console.log(`💳 [ARCA BINDING PAYMENT] Response received:`, {
        success: response.success,
        errorCode: response.errorCode,
        info: response.info,
        hasRedirect: !!response.redirect,
        hasAcsUrl: !!response.acsUrl,
      });

      // Check response
      if (response.success === 0 || response.success === "0") {
        // Payment successful or requires 3DS redirect
        if (response.acsUrl && response.paReq) {
          // 3DS authentication required
          console.log(`✅ [ARCA BINDING PAYMENT] Payment requires 3DS authentication`);
          return this.createSuccessResponse(
            mdOrder,
            mdOrder,
            response.redirect,
            undefined,
            response.acsUrl,
            "POST",
            {
              is3DS: true,
              paReq: response.paReq,
              termUrl: response.termUrl,
              info: response.info,
            }
          );
        } else if (response.redirect) {
          // Payment successful, redirect to finish page
          console.log(`✅ [ARCA BINDING PAYMENT] Payment successful, redirecting`);
          return this.createSuccessResponse(
            mdOrder,
            mdOrder,
            response.redirect,
            undefined,
            undefined,
            undefined,
            {
              info: response.info,
            }
          );
        } else {
          // Payment successful
          console.log(`✅ [ARCA BINDING PAYMENT] Payment successful`);
          return this.createSuccessResponse(
            mdOrder,
            mdOrder,
            undefined,
            undefined,
            undefined,
            undefined,
            {
              info: response.info,
            }
          );
        }
      } else {
        const errorCode = String(response.errorCode || response.success || "BINDING_PAYMENT_ERROR");
        const errorMessage = response.error || response.errorMessage || "Failed to process binding payment";
        console.error(`❌ [ARCA BINDING PAYMENT] Payment failed: ${errorCode} - ${errorMessage}`);
        return this.createErrorResponse(
          errorCode,
          errorMessage,
          {
            mdOrder,
            bindingId,
            info: response.info,
          }
        );
      }
    } catch (error) {
      this.logError(error, { mdOrder, bindingId, operation: "paymentOrderBinding" });
      return this.createErrorResponse(
        "BINDING_PAYMENT_ERROR",
        error instanceof Error ? error.message : "Failed to process binding payment",
        {
          mdOrder,
          bindingId,
        }
      );
    }
  }

  /**
   * Unbind card (deactivate binding)
   * 
   * Calls ArCa unBindCard.do API
   * Deactivates a card binding
   * 
   * @param bindingId - Binding ID to deactivate
   * @returns Success/error response
   */
  async unBindCard(bindingId: string): Promise<PaymentResponse> {
    try {
      console.log(`💳 [ARCA UNBIND CARD] Deactivating binding: ${bindingId.substring(0, 8)}...`);

      // Get account credentials (default to AMD)
      const account = this.accounts.AMD;
      if (!account || !account.username || !account.password) {
        return this.createErrorResponse(
          "MISSING_ACCOUNT",
          "No account credentials configured"
        );
      }

      // Prepare unbind request
      let apiUrl = this.testMode
        ? `${this.TEST_API_BASE_URL}/payment/rest/unBindCard.do`
        : `${this.API_BASE_URL}/payment/rest/unBindCard.do`;

      // Add port for test mode if specified
      if (this.testMode && this.testPort) {
        const urlObj = new URL(apiUrl);
        urlObj.port = String(this.testPort);
        apiUrl = urlObj.toString();
      }

      const requestData = {
        userName: account.username,
        password: account.password,
        bindingId: bindingId,
      };

      console.log(`💳 [ARCA UNBIND CARD] Calling unBindCard.do API: ${apiUrl}`);

      // ArCa expects form-urlencoded format (not JSON)
      const response = await this.postRequest<any>(apiUrl, requestData, {}, true);

      console.log(`💳 [ARCA UNBIND CARD] Response received:`, {
        errorCode: response.errorCode,
        errorMessage: response.errorMessage,
      });

      // Check response
      if (response.errorCode === "0" || response.errorCode === 0) {
        console.log(`✅ [ARCA UNBIND CARD] Binding deactivated successfully`);
        return this.createSuccessResponse(
          bindingId,
          bindingId,
          undefined,
          undefined,
          undefined,
          undefined,
          {
            unbindTimestamp: new Date().toISOString(),
          }
        );
      } else {
        const errorCode = String(response.errorCode || "UNBIND_ERROR");
        const errorMessage = response.errorMessage || "Failed to deactivate binding";
        console.error(`❌ [ARCA UNBIND CARD] Deactivation failed: ${errorCode} - ${errorMessage}`);
        return this.createErrorResponse(
          errorCode,
          errorMessage,
          {
            bindingId,
          }
        );
      }
    } catch (error) {
      this.logError(error, { bindingId, operation: "unBindCard" });
      return this.createErrorResponse(
        "UNBIND_ERROR",
        error instanceof Error ? error.message : "Failed to deactivate binding",
        {
          bindingId,
        }
      );
    }
  }

  /**
   * Bind card (activate binding)
   * 
   * Calls ArCa bindCard.do API
   * Activates a previously deactivated card binding
   * 
   * @param bindingId - Binding ID to activate
   * @returns Success/error response
   */
  async bindCard(bindingId: string): Promise<PaymentResponse> {
    try {
      console.log(`💳 [ARCA BIND CARD] Activating binding: ${bindingId.substring(0, 8)}...`);

      // Get account credentials (default to AMD)
      const account = this.accounts.AMD;
      if (!account || !account.username || !account.password) {
        return this.createErrorResponse(
          "MISSING_ACCOUNT",
          "No account credentials configured"
        );
      }

      // Prepare bind request
      let apiUrl = this.testMode
        ? `${this.TEST_API_BASE_URL}/payment/rest/bindCard.do`
        : `${this.API_BASE_URL}/payment/rest/bindCard.do`;

      // Add port for test mode if specified
      if (this.testMode && this.testPort) {
        const urlObj = new URL(apiUrl);
        urlObj.port = String(this.testPort);
        apiUrl = urlObj.toString();
      }

      const requestData = {
        userName: account.username,
        password: account.password,
        bindingId: bindingId,
      };

      console.log(`💳 [ARCA BIND CARD] Calling bindCard.do API: ${apiUrl}`);

      // ArCa expects form-urlencoded format (not JSON)
      const response = await this.postRequest<any>(apiUrl, requestData, {}, true);

      console.log(`💳 [ARCA BIND CARD] Response received:`, {
        errorCode: response.errorCode,
        errorMessage: response.errorMessage,
      });

      // Check response
      if (response.errorCode === "0" || response.errorCode === 0) {
        console.log(`✅ [ARCA BIND CARD] Binding activated successfully`);
        return this.createSuccessResponse(
          bindingId,
          bindingId,
          undefined,
          undefined,
          undefined,
          undefined,
          {
            bindTimestamp: new Date().toISOString(),
          }
        );
      } else {
        const errorCode = String(response.errorCode || "BIND_ERROR");
        const errorMessage = response.errorMessage || "Failed to activate binding";
        console.error(`❌ [ARCA BIND CARD] Activation failed: ${errorCode} - ${errorMessage}`);
        return this.createErrorResponse(
          errorCode,
          errorMessage,
          {
            bindingId,
          }
        );
      }
    } catch (error) {
      this.logError(error, { bindingId, operation: "bindCard" });
      return this.createErrorResponse(
        "BIND_ERROR",
        error instanceof Error ? error.message : "Failed to activate binding",
        {
          bindingId,
        }
      );
    }
  }

  /**
   * Get bindings list for a client
   * 
   * Calls ArCa getBindings.do API
   * Returns list of card bindings for a specific client
   * 
   * @param clientId - Client ID in merchant system
   * @returns List of bindings
   */
  async getBindings(clientId: string): Promise<{
    bindings: Array<{
      bindingId: string;
      maskedPan?: string;
      cardHolderName?: string;
      expiryDate?: string;
    }>;
    errorCode?: string;
    errorMessage?: string;
  }> {
    try {
      console.log(`💳 [ARCA GET BINDINGS] Getting bindings for clientId: ${clientId}`);

      // Get account credentials (default to AMD)
      const account = this.accounts.AMD;
      if (!account || !account.username || !account.password) {
        throw new Error("No account credentials configured");
      }

      // Prepare get bindings request
      let apiUrl = this.testMode
        ? `${this.TEST_API_BASE_URL}/payment/rest/getBindings.do`
        : `${this.API_BASE_URL}/payment/rest/getBindings.do`;

      // Add port for test mode if specified
      if (this.testMode && this.testPort) {
        const urlObj = new URL(apiUrl);
        urlObj.port = String(this.testPort);
        apiUrl = urlObj.toString();
      }

      const requestData = {
        userName: account.username,
        password: account.password,
        clientId: clientId,
      };

      console.log(`💳 [ARCA GET BINDINGS] Calling getBindings.do API: ${apiUrl}`);

      // ArCa expects form-urlencoded format (not JSON)
      const response = await this.postRequest<any>(apiUrl, requestData, {}, true);

      console.log(`💳 [ARCA GET BINDINGS] Response received:`, {
        errorCode: response.errorCode,
        bindingsCount: response.bindings?.length || 0,
      });

      // Check response
      if (response.errorCode === "0" || response.errorCode === 0) {
        const bindings = Array.isArray(response.bindings) ? response.bindings : [];
        console.log(`✅ [ARCA GET BINDINGS] Retrieved ${bindings.length} bindings`);
        
        return {
          bindings: bindings.map((binding: any) => ({
            bindingId: binding.bindingId,
            maskedPan: binding.maskedPan,
            cardHolderName: binding.cardHolderName,
            expiryDate: binding.expiryDate,
          })),
        };
      } else {
        const errorCode = String(response.errorCode || "GET_BINDINGS_ERROR");
        const errorMessage = response.errorMessage || "Failed to get bindings";
        console.error(`❌ [ARCA GET BINDINGS] Failed: ${errorCode} - ${errorMessage}`);
        
        return {
          bindings: [],
          errorCode,
          errorMessage,
        };
      }
    } catch (error) {
      this.logError(error, { clientId, operation: "getBindings" });
      return {
        bindings: [],
        errorCode: "GET_BINDINGS_ERROR",
        errorMessage: error instanceof Error ? error.message : "Failed to get bindings",
      };
    }
  }

  /**
   * Get 3DS2 URLs
   * 
   * Calls ArCa threeds2/getUrls.do API
   * Gets 3DS2 authentication URLs and transaction ID
   * Must be called repeatedly until is3Ds2Eligible=true and completed=true
   * 
   * @param mdOrder - Order ID from register/registerPreAuth
   * @returns 3DS2 URLs and transaction information
   */
  async get3DS2Urls(mdOrder: string): Promise<{
    is3Ds2Eligible: boolean;
    completed: boolean;
    threeDSServerTransID?: string;
    threeDSMethodURLServer?: string;
    threeDSMethodURL?: string;
    threeDSMethodDataPacked?: string;
    errorCode?: string;
    errorMessage?: string;
  }> {
    try {
      console.log(`💳 [ARCA 3DS2 GETURLS] Getting 3DS2 URLs for mdOrder: ${mdOrder}`);

      // Get account credentials (default to AMD)
      const account = this.accounts.AMD;
      if (!account || !account.username || !account.password) {
        throw new Error("No account credentials configured");
      }

      // Prepare getUrls request
      let apiUrl = this.testMode
        ? `${this.TEST_API_BASE_URL}/payment/rest/threeds2/getUrls.do`
        : `${this.API_BASE_URL}/payment/rest/threeds2/getUrls.do`;

      // Add port for test mode if specified
      if (this.testMode && this.testPort) {
        const urlObj = new URL(apiUrl);
        urlObj.port = String(this.testPort);
        apiUrl = urlObj.toString();
      }

      const requestData = {
        mdOrder: mdOrder,
      };

      console.log(`💳 [ARCA 3DS2 GETURLS] Calling threeds2/getUrls.do API: ${apiUrl}`);

      // ArCa expects form-urlencoded format (not JSON)
      const response = await this.postRequest<any>(apiUrl, requestData, {}, true);

      console.log(`💳 [ARCA 3DS2 GETURLS] Response received:`, {
        is3Ds2Eligible: response.is3Ds2Eligible,
        completed: response.completed,
        threeDSServerTransID: response.threeDSServerTransID,
      });

      return {
        is3Ds2Eligible: response.is3Ds2Eligible === true || response.is3Ds2Eligible === "true",
        completed: response.completed === true || response.completed === "true",
        threeDSServerTransID: response.threeDSServerTransID,
        threeDSMethodURLServer: response.threeDSMethodURLServer,
        threeDSMethodURL: response.threeDSMethodURL,
        threeDSMethodDataPacked: response.threeDSMethodDataPacked,
        errorCode: response.errorCode,
        errorMessage: response.errorMessage,
      };
    } catch (error) {
      this.logError(error, { mdOrder, operation: "get3DS2Urls" });
      return {
        is3Ds2Eligible: false,
        completed: false,
        errorCode: "GETURLS_ERROR",
        errorMessage: error instanceof Error ? error.message : "Failed to get 3DS2 URLs",
      };
    }
  }

  /**
   * Process form (client-side card input)
   * 
   * Calls ArCa processform.do API
   * Processes payment with card data entered on merchant side
   * 
   * @param mdOrder - Order ID from register/registerPreAuth
   * @param cardData - Card data (PAN, expiry, CVC, cardholder name)
   * @param language - Language code (optional)
   * @param bindingNotNeeded - Whether binding is not needed (optional)
   * @returns Payment response with 3DS redirect or success
   */
  async processForm(
    mdOrder: string,
    cardData: {
      pan: string;
      expiry: string; // Format: YYYYMM (e.g., "202401")
      cvc: string;
      cardholderName: string;
      mm?: string; // Month (01-12)
      yyyy?: string; // Year (YYYY)
    },
    language: string = "ru",
    bindingNotNeeded?: boolean
  ): Promise<PaymentResponse> {
    try {
      console.log(`💳 [ARCA PROCESSFORM] Processing form for mdOrder: ${mdOrder}`);

      // Get account credentials (default to AMD)
      const account = this.accounts.AMD;
      if (!account || !account.username || !account.password) {
        return this.createErrorResponse(
          "MISSING_ACCOUNT",
          "No account credentials configured"
        );
      }

      // Prepare processform request
      let apiUrl = this.testMode
        ? `${this.TEST_API_BASE_URL}/payment/rest/processform.do`
        : `${this.API_BASE_URL}/payment/rest/processform.do`;

      // Add port for test mode if specified
      if (this.testMode && this.testPort) {
        const urlObj = new URL(apiUrl);
        urlObj.port = String(this.testPort);
        apiUrl = urlObj.toString();
      }

      // Parse expiry if needed
      let mm = cardData.mm;
      let yyyy = cardData.yyyy;
      
      if (!mm || !yyyy) {
        // Parse from expiry format YYYYMM
        if (cardData.expiry && cardData.expiry.length === 6) {
          yyyy = cardData.expiry.substring(0, 4);
          mm = cardData.expiry.substring(4, 6);
        }
      }

      const requestData: Record<string, any> = {
        MDORDER: mdOrder,
        PAN: cardData.pan,
        EXPIRY: cardData.expiry,
        MM: mm,
        YYYY: yyyy,
        TEXT: cardData.cardholderName,
        CVC: cardData.cvc,
        language: language,
      };

      if (bindingNotNeeded !== undefined) {
        requestData.bindingNotNeeded = bindingNotNeeded;
      }

      console.log(`💳 [ARCA PROCESSFORM] Calling processform.do API: ${apiUrl}`);

      // ArCa expects form-urlencoded format (not JSON)
      const response = await this.postRequest<any>(apiUrl, requestData, {}, true);

      console.log(`💳 [ARCA PROCESSFORM] Response received:`, {
        errorCode: response.errorCode,
        hasAcsUrl: !!response.acsUrl,
        hasCReq: !!response.cReq,
        info: response.info,
      });

      // Check if 3DS2 challenge is required
      if (response.acsUrl && response.cReq) {
        console.log(`✅ [ARCA PROCESSFORM] 3DS2 challenge required`);
        return this.createSuccessResponse(
          mdOrder,
          mdOrder,
          undefined,
          undefined,
          response.acsUrl,
          "POST",
          {
            is3DS2: true,
            cReq: response.cReq,
            acsUrl: response.acsUrl,
            info: response.info,
          }
        );
      }

      // Check if payment was successful
      if (response.errorCode === "0" || response.errorCode === 0) {
        console.log(`✅ [ARCA PROCESSFORM] Payment processed successfully`);
        return this.createSuccessResponse(
          mdOrder,
          mdOrder,
          response.redirect,
          undefined,
          undefined,
          undefined,
          {
            info: response.info,
          }
        );
      } else {
        const errorCode = String(response.errorCode || "PROCESSFORM_ERROR");
        const errorMessage = response.error || response.errorMessage || "Failed to process form";
        console.error(`❌ [ARCA PROCESSFORM] Processing failed: ${errorCode} - ${errorMessage}`);
        return this.createErrorResponse(
          errorCode,
          errorMessage,
          {
            mdOrder,
            info: response.info,
          }
        );
      }
    } catch (error) {
      this.logError(error, { mdOrder, operation: "processForm" });
      return this.createErrorResponse(
        "PROCESSFORM_ERROR",
        error instanceof Error ? error.message : "Failed to process form",
        {
          mdOrder,
        }
      );
    }
  }

  /**
   * Payment order (client-side card input)
   * 
   * Calls ArCa paymentorder.do API
   * Alternative to processform.do for client-side card input
   * 
   * @param mdOrder - Order ID from register/registerPreAuth
   * @param cardData - Card data (PAN, expiry, CVC, cardholder name)
   * @param language - Language code (optional)
   * @param ip - Client IP address (optional)
   * @param jsonParams - Additional JSON parameters (optional)
   * @returns Payment response with 3DS redirect or success
   */
  async paymentOrder(
    mdOrder: string,
    cardData: {
      pan: string;
      expiry: string; // Format: YYYYMM (e.g., "202401")
      cvc: string;
      cardholderName: string;
      mm?: string; // Month (01-12)
      yyyy?: string; // Year (YYYY)
    },
    language: string = "ru",
    ip?: string,
    jsonParams?: Record<string, any>
  ): Promise<PaymentResponse> {
    try {
      console.log(`💳 [ARCA PAYMENTORDER] Processing payment order for mdOrder: ${mdOrder}`);

      // Get account credentials (default to AMD)
      const account = this.accounts.AMD;
      if (!account || !account.username || !account.password) {
        return this.createErrorResponse(
          "MISSING_ACCOUNT",
          "No account credentials configured"
        );
      }

      // Prepare paymentorder request
      let apiUrl = this.testMode
        ? `${this.TEST_API_BASE_URL}/payment/rest/paymentorder.do`
        : `${this.API_BASE_URL}/payment/rest/paymentorder.do`;

      // Add port for test mode if specified
      if (this.testMode && this.testPort) {
        const urlObj = new URL(apiUrl);
        urlObj.port = String(this.testPort);
        apiUrl = urlObj.toString();
      }

      // Parse expiry if needed
      let mm = cardData.mm;
      let yyyy = cardData.yyyy;
      
      if (!mm || !yyyy) {
        // Parse from expiry format YYYYMM
        if (cardData.expiry && cardData.expiry.length === 6) {
          yyyy = cardData.expiry.substring(0, 4);
          mm = cardData.expiry.substring(4, 6);
        }
      }

      const requestData: Record<string, any> = {
        userName: account.username,
        password: account.password,
        MDORDER: mdOrder,
        $PAN: cardData.pan,
        $CVC: cardData.cvc,
        YYYY: yyyy,
        MM: mm,
        TEXT: cardData.cardholderName,
        language: language,
      };

      if (ip) {
        requestData.ip = ip;
      }

      if (jsonParams) {
        requestData.jsonParams = JSON.stringify(jsonParams);
      }

      console.log(`💳 [ARCA PAYMENTORDER] Calling paymentorder.do API: ${apiUrl}`);

      // ArCa expects form-urlencoded format (not JSON)
      const response = await this.postRequest<any>(apiUrl, requestData, {}, true);

      console.log(`💳 [ARCA PAYMENTORDER] Response received:`, {
        errorCode: response.errorCode,
        info: response.info,
        hasAcsUrl: !!response.acsUrl,
        hasPaReq: !!response.paReq,
      });

      // Check if 3DS authentication is required
      if (response.acsUrl && (response.paReq || response.cReq)) {
        console.log(`✅ [ARCA PAYMENTORDER] 3DS authentication required`);
        return this.createSuccessResponse(
          mdOrder,
          mdOrder,
          response.redirect,
          undefined,
          response.acsUrl,
          "POST",
          {
            is3DS: true,
            paReq: response.paReq,
            cReq: response.cReq,
            termUrl: response.termUrl,
            info: response.info,
          }
        );
      }

      // Check if payment was successful
      if (response.errorCode === "0" || response.errorCode === 0) {
        console.log(`✅ [ARCA PAYMENTORDER] Payment processed successfully`);
        return this.createSuccessResponse(
          mdOrder,
          mdOrder,
          response.redirect,
          undefined,
          undefined,
          undefined,
          {
            info: response.info,
          }
        );
      } else {
        const errorCode = String(response.errorCode || "PAYMENTORDER_ERROR");
        const errorMessage = response.error || response.errorMessage || "Failed to process payment order";
        console.error(`❌ [ARCA PAYMENTORDER] Processing failed: ${errorCode} - ${errorMessage}`);
        return this.createErrorResponse(
          errorCode,
          errorMessage,
          {
            mdOrder,
            info: response.info,
          }
        );
      }
    } catch (error) {
      this.logError(error, { mdOrder, operation: "paymentOrder" });
      return this.createErrorResponse(
        "PAYMENTORDER_ERROR",
        error instanceof Error ? error.message : "Failed to process payment order",
        {
          mdOrder,
        }
      );
    }
  }

  /**
   * Send client info for 3DS2
   * 
   * Sends browser/client information to ArCa for 3DS2 authentication
   * This should be called after get3DS2Urls returns eligible=true
   * 
   * @param threeDSServerTransID - Transaction ID from get3DS2Urls
   * @param clientInfo - Browser/client information
   * @returns Success/error response
   */
  async sendClientInfo(
    threeDSServerTransID: string,
    clientInfo: {
      userAgent?: string;
      colorDepth?: number;
      screenHeight?: number;
      screenWidth?: number;
      javaEnabled?: boolean;
      browserLanguage?: string;
      browserTimeZoneOffset?: number;
      browserAcceptHeader?: string;
      mobile?: boolean;
      [key: string]: any; // Allow additional fields
    }
  ): Promise<{ success: boolean; errorCode?: string; errorMessage?: string }> {
    try {
      console.log(`💳 [ARCA CLIENT INFO] Sending client info for transaction: ${threeDSServerTransID.substring(0, 8)}...`);

      // Prepare client info request
      let apiUrl = this.testMode
        ? `${this.TEST_API_BASE_URL}/api/v1/client`
        : `${this.API_BASE_URL}/api/v1/client`;

      // Add port for test mode if specified
      if (this.testMode && this.testPort) {
        const urlObj = new URL(apiUrl);
        urlObj.port = String(this.testPort);
        apiUrl = urlObj.toString();
      }

      const requestData = {
        threeDSServerTransID: threeDSServerTransID,
        clientInfo: JSON.stringify(clientInfo),
      };

      console.log(`💳 [ARCA CLIENT INFO] Calling /api/v1/client API: ${apiUrl}`);

      // ArCa expects form-urlencoded format (not JSON)
      const response = await this.postRequest<any>(apiUrl, requestData, {}, true);

      console.log(`💳 [ARCA CLIENT INFO] Response received:`, {
        errorCode: response.errorCode,
        success: response.success,
      });

      if (response.errorCode === "0" || response.errorCode === 0 || response.success === true) {
        console.log(`✅ [ARCA CLIENT INFO] Client info sent successfully`);
        return { success: true };
      } else {
        const errorCode = String(response.errorCode || "CLIENT_INFO_ERROR");
        const errorMessage = response.errorMessage || "Failed to send client info";
        console.error(`❌ [ARCA CLIENT INFO] Failed: ${errorCode} - ${errorMessage}`);
        return {
          success: false,
          errorCode,
          errorMessage,
        };
      }
    } catch (error) {
      this.logError(error, { threeDSServerTransID, operation: "sendClientInfo" });
      return {
        success: false,
        errorCode: "CLIENT_INFO_ERROR",
        errorMessage: error instanceof Error ? error.message : "Failed to send client info",
      };
    }
  }

  /**
   * Payment order recurring (recurring payment execution)
   * 
   * Calls ArCa paymentOrderRecurring.do API
   * Executes a recurring payment using recurringId from initial payment
   * 
   * @param mdOrder - Order ID from register (must include recurringId in jsonParams)
   * @param recurringId - Recurring payment ID from initial payment
   * @returns Payment response
   */
  async paymentOrderRecurring(
    mdOrder: string,
    recurringId: string
  ): Promise<PaymentResponse> {
    try {
      console.log(`💳 [ARCA RECURRING] Processing recurring payment: ${recurringId.substring(0, 8)}...`);

      // Get account credentials (default to AMD)
      const account = this.accounts.AMD;
      if (!account || !account.username || !account.password) {
        return this.createErrorResponse(
          "MISSING_ACCOUNT",
          "No account credentials configured"
        );
      }

      // Prepare recurring payment request
      let apiUrl = this.testMode
        ? `${this.TEST_API_BASE_URL}/payment/rest/paymentOrderRecurring.do`
        : `${this.API_BASE_URL}/payment/rest/paymentOrderRecurring.do`;

      // Add port for test mode if specified
      if (this.testMode && this.testPort) {
        const urlObj = new URL(apiUrl);
        urlObj.port = String(this.testPort);
        apiUrl = urlObj.toString();
      }

      const requestData = {
        userName: account.username,
        password: account.password,
        mdOrder: mdOrder,
        recurringId: recurringId,
      };

      console.log(`💳 [ARCA RECURRING] Calling paymentOrderRecurring.do API: ${apiUrl}`);

      // ArCa expects form-urlencoded format (not JSON)
      const response = await this.postRequest<any>(apiUrl, requestData, {}, true);

      console.log(`💳 [ARCA RECURRING] Response received:`, {
        errorCode: response.errorCode,
        success: response.success,
        info: response.info,
        hasRedirect: !!response.redirect,
      });

      // Check response
      if (response.success === 0 || response.success === "0" || response.errorCode === "0" || response.errorCode === 0) {
        console.log(`✅ [ARCA RECURRING] Recurring payment processed successfully`);
        return this.createSuccessResponse(
          mdOrder,
          mdOrder,
          response.redirect,
          undefined,
          undefined,
          undefined,
          {
            recurringId: recurringId,
            info: response.info,
          }
        );
      } else {
        const errorCode = String(response.errorCode || response.success || "RECURRING_ERROR");
        const errorMessage = response.error || response.errorMessage || "Failed to process recurring payment";
        console.error(`❌ [ARCA RECURRING] Payment failed: ${errorCode} - ${errorMessage}`);
        return this.createErrorResponse(
          errorCode,
          errorMessage,
          {
            mdOrder,
            recurringId,
            info: response.info,
          }
        );
      }
    } catch (error) {
      this.logError(error, { mdOrder, recurringId, operation: "paymentOrderRecurring" });
      return this.createErrorResponse(
        "RECURRING_ERROR",
        error instanceof Error ? error.message : "Failed to process recurring payment",
        {
          mdOrder,
          recurringId,
        }
      );
    }
  }

  /**
   * P2P Payment (card-to-card transfer)
   * 
   * Calls ArCa processformtransfer.do API
   * Processes P2P payment (transfer from one card to another)
   * Order must be registered with jsonParams containing "transaction_type":"transfer"
   * 
   * @param mdOrder - Order ID from register (with transaction_type: "transfer" in jsonParams)
   * @param debitCard - Debit card data (card to charge from)
   * @param creditCard - Credit card data (card to transfer to)
   * @param language - Language code (optional)
   * @returns Payment response
   */
  async processFormTransfer(
    mdOrder: string,
    debitCard: {
      pan: string;
      expiry: string; // Format: YYYYMM
      cvc: string;
      cardholderName: string;
      mm?: string;
      yyyy?: string;
    },
    creditCard: {
      pan: string;
      expiry?: string; // Format: YYYYMM (optional)
    },
    language: string = "ru"
  ): Promise<PaymentResponse> {
    try {
      console.log(`💳 [ARCA P2P] Processing P2P transfer for mdOrder: ${mdOrder}`);

      // Get account credentials (default to AMD)
      const account = this.accounts.AMD;
      if (!account || !account.username || !account.password) {
        return this.createErrorResponse(
          "MISSING_ACCOUNT",
          "No account credentials configured"
        );
      }

      // Prepare P2P transfer request
      let apiUrl = this.testMode
        ? `${this.TEST_API_BASE_URL}/payment/rest/processformtransfer.do`
        : `${this.API_BASE_URL}/payment/rest/processformtransfer.do`;

      // Add port for test mode if specified
      if (this.testMode && this.testPort) {
        const urlObj = new URL(apiUrl);
        urlObj.port = String(this.testPort);
        apiUrl = urlObj.toString();
      }

      // Parse expiry if needed
      let mm = debitCard.mm;
      let yyyy = debitCard.yyyy;
      
      if (!mm || !yyyy) {
        // Parse from expiry format YYYYMM
        if (debitCard.expiry && debitCard.expiry.length === 6) {
          yyyy = debitCard.expiry.substring(0, 4);
          mm = debitCard.expiry.substring(4, 6);
        }
      }

      const requestData: Record<string, any> = {
        MDORDER: mdOrder,
        $PAN: debitCard.pan,
        $CVC: debitCard.cvc,
        YYYY: yyyy,
        MM: mm,
        TEXT: debitCard.cardholderName,
        P2P_PAN: creditCard.pan,
        language: language,
      };

      // P2P_EXPIRY is optional
      if (creditCard.expiry) {
        requestData.P2P_EXPIRY = creditCard.expiry;
      }

      console.log(`💳 [ARCA P2P] Calling processformtransfer.do API: ${apiUrl}`);

      // ArCa expects form-urlencoded format (not JSON)
      const response = await this.postRequest<any>(apiUrl, requestData, {}, true);

      console.log(`💳 [ARCA P2P] Response received:`, {
        errorCode: response.errorCode,
        success: response.success,
        info: response.info,
        hasRedirect: !!response.redirect,
        hasAcsUrl: !!response.acsUrl,
      });

      // Check if 3DS authentication is required
      if (response.acsUrl && (response.paReq || response.cReq)) {
        console.log(`✅ [ARCA P2P] 3DS authentication required`);
        return this.createSuccessResponse(
          mdOrder,
          mdOrder,
          response.redirect,
          undefined,
          response.acsUrl,
          "POST",
          {
            is3DS: true,
            paReq: response.paReq,
            cReq: response.cReq,
            termUrl: response.termUrl,
            info: response.info,
            transactionType: "transfer",
          }
        );
      }

      // Check if payment was successful
      if (response.errorCode === "0" || response.errorCode === 0 || response.success === 0 || response.success === "0") {
        console.log(`✅ [ARCA P2P] P2P transfer processed successfully`);
        return this.createSuccessResponse(
          mdOrder,
          mdOrder,
          response.redirect,
          undefined,
          undefined,
          undefined,
          {
            info: response.info,
            transactionType: "transfer",
          }
        );
      } else {
        const errorCode = String(response.errorCode || response.success || "P2P_ERROR");
        const errorMessage = response.error || response.errorMessage || "Failed to process P2P transfer";
        console.error(`❌ [ARCA P2P] Transfer failed: ${errorCode} - ${errorMessage}`);
        return this.createErrorResponse(
          errorCode,
          errorMessage,
          {
            mdOrder,
            info: response.info,
            transactionType: "transfer",
          }
        );
      }
    } catch (error) {
      this.logError(error, { mdOrder, operation: "processFormTransfer" });
      return this.createErrorResponse(
        "P2P_ERROR",
        error instanceof Error ? error.message : "Failed to process P2P transfer",
        {
          mdOrder,
        }
      );
    }
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

