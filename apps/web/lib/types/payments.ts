/**
 * Payment Gateway Types
 * 
 * Comprehensive type definitions for payment gateway integration
 * Supports: Idram, Ameriabank, Inecobank, ArCa
 */

/**
 * Payment Gateway Types
 */
export type PaymentGatewayType = "idram" | "ameriabank" | "inecobank" | "arca";

/**
 * Payment Status
 */
export type PaymentStatus = 
  | "pending" 
  | "processing" 
  | "completed" 
  | "failed" 
  | "cancelled" 
  | "refunded";

/**
 * Payment Method
 */
export type PaymentMethod = 
  | "card" 
  | "wallet" 
  | "bank_transfer" 
  | "idram_wallet" 
  | "mobile_app";

/**
 * Webhook Event Types
 */
export type WebhookEventType = 
  | "payment.completed" 
  | "payment.failed" 
  | "payment.pending" 
  | "payment.cancelled" 
  | "payment.refunded";

/**
 * Gateway Health Status
 */
export type GatewayHealthStatus = "healthy" | "degraded" | "down";

/**
 * Currency Codes
 */
export type CurrencyCode = "AMD" | "USD" | "EUR" | "RUB";

/**
 * ArCa Bank IDs
 * Valid bank IDs: 1-11 (excluding 4, 10, 12)
 */
export type ArcaBankId = "1" | "2" | "3" | "5" | "6" | "7" | "8" | "9" | "11";

/**
 * Payment Order Data
 */
export interface PaymentOrder {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: CurrencyCode;
  description?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerName?: string;
  returnUrl?: string;
  cancelUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Payment Response
 */
export interface PaymentResponse {
  success: boolean;
  paymentId?: string;
  transactionId?: string;
  redirectUrl?: string;
  formData?: Record<string, string>;
  formAction?: string;
  formMethod?: "GET" | "POST";
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Payment Webhook Data
 */
export interface PaymentWebhookData {
  eventType: WebhookEventType;
  paymentId?: string;
  transactionId?: string;
  orderId?: string;
  amount?: number;
  currency?: CurrencyCode;
  status?: PaymentStatus;
  signature?: string;
  timestamp?: string;
  payload: Record<string, any>;
  headers?: Record<string, string>;
}

/**
 * Payment Attempt Data
 */
export interface PaymentAttemptData {
  attemptNumber: number;
  status: PaymentStatus;
  errorCode?: string;
  errorMessage?: string;
  providerResponse?: Record<string, any>;
  requestData?: Record<string, any>;
  responseData?: Record<string, any>;
  durationMs?: number;
}

/**
 * Idram Configuration
 */
export interface IdramConfig {
  idramID?: string;
  idramKey?: string;
  idramTestID?: string;
  idramTestKey?: string;
  rocketLine?: boolean;
  defaultLanguage?: "en" | "hy" | "ru";
  successUrl?: string;
  failUrl?: string;
  resultUrl?: string;
}

/**
 * Ameriabank Configuration
 */
export interface AmeriabankConfig {
  clientID: string;
  accounts: {
    AMD?: {
      username: string;
      password: string;
    };
    USD?: {
      username: string;
      password: string;
    };
    EUR?: {
      username: string;
      password: string;
    };
    RUB?: {
      username: string;
      password: string;
    };
  };
  minTestOrderId?: number;
  maxTestOrderId?: number;
  successUrl?: string;
  failUrl?: string;
  resultUrl?: string;
}

/**
 * Inecobank Configuration
 */
export interface InecobankConfig {
  accounts: {
    AMD?: {
      username: string;
      password: string;
    };
    USD?: {
      username: string;
      password: string;
    };
    EUR?: {
      username: string;
      password: string;
    };
    RUB?: {
      username: string;
      password: string;
    };
  };
  successUrl?: string;
  failUrl?: string;
  resultUrl?: string;
}

/**
 * ArCa Configuration
 */
export interface ArcaConfig {
  bankId: ArcaBankId;
  accounts: {
    AMD?: {
      username: string;
      password: string;
    };
    USD?: {
      username: string;
      password: string;
    };
    EUR?: {
      username: string;
      password: string;
    };
    RUB?: {
      username: string;
      password: string;
    };
  };
  testPort?: number;
  successUrl?: string;
  failUrl?: string;
  resultUrl?: string;
}

/**
 * Payment Gateway Configuration (Union Type)
 */
export type PaymentGatewayConfig = 
  | IdramConfig 
  | AmeriabankConfig 
  | InecobankConfig 
  | ArcaConfig;

/**
 * Payment Gateway Database Model
 */
export interface PaymentGatewayModel {
  id: string;
  type: PaymentGatewayType;
  bankId?: string;
  name: string;
  enabled: boolean;
  testMode: boolean;
  config: PaymentGatewayConfig;
  position: number;
  lastHealthCheck?: Date;
  healthStatus?: GatewayHealthStatus;
  healthMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Payment Database Model
 */
export interface PaymentModel {
  id: string;
  orderId: string;
  paymentGatewayId?: string;
  provider: string;
  providerTransactionId?: string;
  method?: PaymentMethod;
  amount: number;
  currency: CurrencyCode;
  status: PaymentStatus;
  cardLast4?: string;
  cardBrand?: string;
  errorCode?: string;
  errorMessage?: string;
  providerResponse?: Record<string, any>;
  idempotencyKey?: string;
  retryCount: number;
  maxRetries: number;
  nextRetryAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Payment Webhook Log Model
 */
export interface PaymentWebhookLogModel {
  id: string;
  paymentGatewayId: string;
  paymentId?: string;
  eventType: WebhookEventType;
  payload: Record<string, any>;
  headers?: Record<string, any>;
  signature?: string;
  signatureValid?: boolean;
  processed: boolean;
  processingError?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  processedAt?: Date;
}

/**
 * Payment Initiation Request
 */
export interface PaymentInitiationRequest {
  orderId: string;
  gatewayId?: string;
  gatewayType?: PaymentGatewayType;
  bankId?: ArcaBankId;
  returnUrl?: string;
  cancelUrl?: string;
}

/**
 * Payment Initiation Response
 */
export interface PaymentInitiationResponse {
  success: boolean;
  paymentId: string;
  redirectUrl?: string;
  formData?: Record<string, string>;
  formAction?: string;
  formMethod?: "GET" | "POST";
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Payment Status Response
 */
export interface PaymentStatusResponse {
  paymentId: string;
  orderId: string;
  status: PaymentStatus;
  amount: number;
  currency: CurrencyCode;
  transactionId?: string;
  completedAt?: Date;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Gateway Health Check Response
 */
export interface GatewayHealthCheckResponse {
  gatewayId: string;
  status: GatewayHealthStatus;
  message?: string;
  lastCheck: Date;
  responseTime?: number;
}

/**
 * Payment Retry Configuration
 */
export interface PaymentRetryConfig {
  maxRetries: number;
  retryDelayMs: number;
  exponentialBackoff: boolean;
  retryableErrors?: string[];
}

/**
 * Webhook Verification Result
 */
export interface WebhookVerificationResult {
  valid: boolean;
  error?: string;
  payload?: Record<string, any>;
}

