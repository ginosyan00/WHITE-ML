/**
 * Payment Service
 * 
 * Main service for payment gateway management and orchestration
 * Uses factory pattern to create gateway-specific services
 */

import { db } from "@white-shop/db";
import { BasePaymentService } from "./base-payment.service";
import { IdramPaymentService } from "./idram.service";
import { AmeriabankPaymentService } from "./ameriabank.service";
import { InecobankPaymentService } from "./inecobank.service";
import { ArcaPaymentService } from "./arca.service";
import { decryptObject } from "../../utils/encryption";
import {
  PaymentGatewayType,
  PaymentOrder,
  PaymentResponse,
  PaymentWebhookData,
  PaymentStatus,
  PaymentGatewayConfig,
  IdramConfig,
  AmeriabankConfig,
  InecobankConfig,
  ArcaConfig,
  ArcaBankId,
  PaymentInitiationRequest,
  PaymentInitiationResponse,
} from "../../types/payments";

/**
 * Payment Service
 * 
 * Orchestrates payment processing across multiple gateways
 */
export class PaymentService {
  /**
   * Get payment gateway service instance
   * 
   * @param type - Gateway type
   * @param config - Gateway configuration
   * @param testMode - Test mode flag
   * @param bankId - Bank ID (for ArCa)
   * @returns Payment service instance
   */
  private getGatewayService(
    type: PaymentGatewayType,
    config: PaymentGatewayConfig,
    testMode: boolean = true,
    bankId?: string
  ): BasePaymentService {
    switch (type) {
      case "idram":
        return new IdramPaymentService(config as IdramConfig, testMode);
      
      case "ameriabank":
        return new AmeriabankPaymentService(config as AmeriabankConfig, testMode);
      
      case "inecobank":
        return new InecobankPaymentService(config as InecobankConfig, testMode);
      
      case "arca":
        const arcaConfig = config as ArcaConfig;
        if (bankId) {
          arcaConfig.bankId = bankId as ArcaBankId;
        }
        return new ArcaPaymentService(arcaConfig, testMode);
      
      default:
        throw new Error(`Unsupported payment gateway type: ${type}`);
    }
  }

  /**
   * Get gateway service by gateway ID
   * 
   * @param gatewayId - Payment gateway ID from database
   * @returns Payment service instance
   */
  async getGatewayById(gatewayId: string): Promise<BasePaymentService> {
    const gateway = await db.paymentGateway.findUnique({
      where: { id: gatewayId },
    });

    if (!gateway) {
      throw new Error(`Payment gateway not found: ${gatewayId}`);
    }

    if (!gateway.enabled) {
      throw new Error(`Payment gateway is disabled: ${gatewayId}`);
    }

    // Decrypt config before using
    const decryptedConfig = this.decryptGatewayConfig(
      gateway.config as PaymentGatewayConfig,
      gateway.type as PaymentGatewayType
    );
    
    return this.getGatewayService(
      gateway.type as PaymentGatewayType,
      decryptedConfig,
      gateway.testMode,
      gateway.bankId || undefined
    );
  }

  /**
   * Get gateway service by type and bank ID
   * 
   * @param type - Gateway type
   * @param bankId - Bank ID (for ArCa)
   * @returns Payment service instance
   */
  async getGatewayByType(
    type: PaymentGatewayType,
    bankId?: string
  ): Promise<BasePaymentService> {
    const where: any = {
      type,
      enabled: true,
    };

    if (bankId) {
      where.bankId = bankId;
    }

    const gateway = await db.paymentGateway.findFirst({
      where,
      orderBy: { position: "asc" },
    });

    if (!gateway) {
      throw new Error(`No enabled payment gateway found for type: ${type}${bankId ? `, bankId: ${bankId}` : ""}`);
    }

    // Decrypt config before using
    const decryptedConfig = this.decryptGatewayConfig(
      gateway.config as PaymentGatewayConfig,
      type
    );
    
    return this.getGatewayService(
      type,
      decryptedConfig,
      gateway.testMode,
      gateway.bankId || undefined
    );
  }

  /**
   * Initiate payment
   * 
   * @param request - Payment initiation request
   * @returns Payment initiation response
   */
  async initiatePayment(
    request: PaymentInitiationRequest
  ): Promise<PaymentInitiationResponse> {
    try {
      // Get gateway service
      let gatewayService: BasePaymentService;
      
      if (request.gatewayId) {
        gatewayService = await this.getGatewayById(request.gatewayId);
      } else if (request.gatewayType) {
        gatewayService = await this.getGatewayByType(
          request.gatewayType,
          request.bankId
        );
      } else {
        throw new Error("Either gatewayId or gatewayType must be provided");
      }

      // Get order from database
      const order = await db.order.findUnique({
        where: { id: request.orderId },
        include: {
          items: true,
        },
      });

      if (!order) {
        throw new Error(`Order not found: ${request.orderId}`);
      }

      // Prepare payment order data
      const paymentOrder: PaymentOrder = {
        orderId: order.id,
        orderNumber: order.number,
        amount: order.total,
        currency: order.currency as any,
        description: `Order ${order.number}`,
        customerEmail: order.customerEmail || undefined,
        customerPhone: order.customerPhone || undefined,
        returnUrl: request.returnUrl,
        cancelUrl: request.cancelUrl,
      };

      // Initiate payment
      const response = await gatewayService.initiatePayment(paymentOrder);

      if (!response.success || !response.paymentId) {
        throw new Error(response.errorMessage || "Failed to initiate payment");
      }

      // Create payment record in database
      const payment = await db.payment.create({
        data: {
          orderId: order.id,
          paymentGatewayId: request.gatewayId || undefined,
          provider: gatewayService["gatewayType"],
          amount: order.total,
          currency: order.currency,
          status: "pending",
          idempotencyKey: gatewayService["generateIdempotencyKey"](order.id),
        },
      });

      // Update order with payment gateway
      if (request.gatewayId) {
        await db.order.update({
          where: { id: order.id },
          data: { paymentGatewayId: request.gatewayId },
        });
      }

      return {
        success: true,
        paymentId: payment.id,
        redirectUrl: response.redirectUrl,
        formData: response.formData,
        formAction: response.formAction,
        formMethod: response.formMethod,
      };
    } catch (error) {
      console.error("[PaymentService] Initiation error:", error);
      return {
        success: false,
        paymentId: "",
        errorCode: error instanceof Error ? error.name : "UNKNOWN_ERROR",
        errorMessage: error instanceof Error ? error.message : "Failed to initiate payment",
      };
    }
  }

  /**
   * Process webhook notification
   * 
   * @param gatewayType - Gateway type
   * @param data - Webhook data
   * @returns Processed payment status
   */
  async processWebhook(
    gatewayType: PaymentGatewayType,
    data: PaymentWebhookData
  ): Promise<PaymentStatus> {
    try {
      // Find gateway by type
      const gateway = await db.paymentGateway.findFirst({
        where: {
          type: gatewayType,
          enabled: true,
        },
      });

      if (!gateway) {
        throw new Error(`Payment gateway not found: ${gatewayType}`);
      }

      // Get gateway service
      // Decrypt config before using
      const decryptedConfig = this.decryptGatewayConfig(
        gateway.config as PaymentGatewayConfig,
        gatewayType
      );
      
      const gatewayService = this.getGatewayService(
        gatewayType,
        decryptedConfig,
        gateway.testMode,
        gateway.bankId || undefined
      );

      // Process webhook
      const status = await gatewayService.processWebhook(data);

      // Update payment record if paymentId is provided
      if (data.paymentId) {
        await db.payment.update({
          where: { id: data.paymentId },
          data: {
            status,
            providerTransactionId: data.transactionId,
            completedAt: status === "completed" ? new Date() : undefined,
            failedAt: status === "failed" ? new Date() : undefined,
          },
        });

        // Update order payment status
        const payment = await db.payment.findUnique({
          where: { id: data.paymentId },
        });

        if (payment) {
          await db.order.update({
            where: { id: payment.orderId },
            data: {
              paymentStatus: status,
              paidAt: status === "completed" ? new Date() : undefined,
            },
          });
        }
      }

      // Log webhook
      await db.paymentWebhookLog.create({
        data: {
          paymentGatewayId: gateway.id,
          paymentId: data.paymentId,
          eventType: data.eventType,
          payload: data.payload,
          headers: data.headers,
          signature: data.signature,
          signatureValid: true, // Will be set by verification
          processed: true,
          processedAt: new Date(),
        },
      });

      return status;
    } catch (error) {
      console.error("[PaymentService] Webhook processing error:", error);
      throw error;
    }
  }

  /**
   * Get payment status
   * 
   * @param paymentId - Payment ID
   * @returns Payment status
   */
  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: {
        paymentGateway: true,
      },
    });

    if (!payment) {
      throw new Error(`Payment not found: ${paymentId}`);
    }

    if (!payment.providerTransactionId) {
      return payment.status as PaymentStatus;
    }

    // Get gateway service
    if (!payment.paymentGateway) {
      return payment.status as PaymentStatus;
    }

      // Decrypt config before using
      const decryptedConfig = this.decryptGatewayConfig(
        payment.paymentGateway.config as PaymentGatewayConfig,
        payment.paymentGateway.type as PaymentGatewayType
      );
      
      const gatewayService = this.getGatewayService(
        payment.paymentGateway.type as PaymentGatewayType,
        decryptedConfig,
        payment.paymentGateway.testMode,
        payment.paymentGateway.bankId || undefined
      );

    // Get status from provider
    try {
      const providerStatus = await gatewayService.getPaymentStatus(
        payment.providerTransactionId
      );

      // Update payment status if changed
      if (providerStatus !== payment.status) {
        await db.payment.update({
          where: { id: paymentId },
          data: {
            status: providerStatus,
            completedAt: providerStatus === "completed" ? new Date() : undefined,
            failedAt: providerStatus === "failed" ? new Date() : undefined,
          },
        });
      }

      return providerStatus;
    } catch (error) {
      console.error("[PaymentService] Status check error:", error);
      return payment.status as PaymentStatus;
    }
  }
}

  /**
   * Decrypt gateway configuration
   */
  private decryptGatewayConfig(
    config: PaymentGatewayConfig,
    type: PaymentGatewayType
  ): PaymentGatewayConfig {
    try {
      const fieldsToDecrypt: string[] = [];
      
      switch (type) {
        case "idram":
          fieldsToDecrypt.push("idramKey", "idramTestKey");
          break;
        case "ameriabank":
        case "inecobank":
        case "arca":
          fieldsToDecrypt.push(
            "accounts.AMD.password",
            "accounts.USD.password",
            "accounts.EUR.password",
            "accounts.RUB.password"
          );
          break;
      }

      return decryptObject(config as any, fieldsToDecrypt) as PaymentGatewayConfig;
    } catch (error) {
      console.error("[PaymentService] Decryption error:", error);
      // If decryption fails, return config as-is (might be plain text in development)
      if (process.env.NODE_ENV === "development") {
        console.warn("[PaymentService] Decryption failed, returning as-is (development mode)");
        return config;
      }
      throw error;
    }
  }
}

// Export singleton instance
export const paymentService = new PaymentService();

