/**
 * Payment Gateway Service
 * 
 * Service for managing payment gateway configurations
 */

import { db } from "@white-shop/db";
import {
  PaymentGatewayType,
  PaymentGatewayConfig,
  IdramConfig,
  AmeriabankConfig,
  InecobankConfig,
  ArcaConfig,
} from "../../types/payments";
import { encryptObject, decryptObject } from "../../utils/encryption";

/**
 * Payment Gateway Service
 * 
 * Handles CRUD operations for payment gateways
 */
export class PaymentGatewayService {
  /**
   * Get fields to encrypt based on gateway type
   */
  private getFieldsToEncrypt(type: PaymentGatewayType): string[] {
    switch (type) {
      case "idram":
        return ["idramKey", "idramTestKey"];
      case "ameriabank":
        return [
          "accounts.AMD.password",
        ];
      case "inecobank":
        return [
          "accounts.AMD.password",
        ];
      case "arca":
        return [
          "accounts.AMD.password",
        ];
      default:
        return [];
    }
  }

  /**
   * Encrypt sensitive configuration data
   * 
   * @param config - Configuration object
   * @param type - Gateway type
   * @returns Encrypted configuration
   */
  private encryptConfig(
    config: PaymentGatewayConfig,
    type: PaymentGatewayType
  ): PaymentGatewayConfig {
    try {
      const fieldsToEncrypt = this.getFieldsToEncrypt(type);
      return encryptObject(config as any, fieldsToEncrypt) as PaymentGatewayConfig;
    } catch (error) {
      console.error("[PaymentGatewayService] Encryption error:", error);
      // If encryption fails, return config as-is (fallback for development)
      if (process.env.NODE_ENV === "development") {
        console.warn("[PaymentGatewayService] Encryption failed, storing plain text (development mode)");
        return config;
      }
      throw error;
    }
  }

  /**
   * Decrypt sensitive configuration data
   * 
   * @param config - Encrypted configuration
   * @param type - Gateway type
   * @returns Decrypted configuration
   */
  private decryptConfig(
    config: PaymentGatewayConfig,
    type: PaymentGatewayType
  ): PaymentGatewayConfig {
    try {
      const fieldsToDecrypt = this.getFieldsToEncrypt(type);
      return decryptObject(config as any, fieldsToDecrypt) as PaymentGatewayConfig;
    } catch (error) {
      console.error("[PaymentGatewayService] Decryption error:", error);
      // If decryption fails, return config as-is (might be plain text in development)
      if (process.env.NODE_ENV === "development") {
        console.warn("[PaymentGatewayService] Decryption failed, returning as-is (development mode)");
        return config;
      }
      throw error;
    }
  }

  /**
   * Sanitize config for response (remove sensitive data)
   * 
   * @param config - Configuration object
   * @returns Sanitized configuration
   */
  private sanitizeConfig(config: PaymentGatewayConfig): Partial<PaymentGatewayConfig> {
    const sanitized: any = { ...config };

    // Remove sensitive fields
    if ("idramKey" in sanitized) {
      sanitized.idramKey = "***";
    }
    if ("idramTestKey" in sanitized) {
      sanitized.idramTestKey = "***";
    }

    // Remove passwords from account objects
    if ("accounts" in sanitized && sanitized.accounts) {
      const accounts = sanitized.accounts as any;
      Object.keys(accounts).forEach((currency) => {
        if (accounts[currency]?.password) {
          accounts[currency].password = "***";
        }
      });
    }

    return sanitized;
  }

  /**
   * Get all payment gateways
   * 
   * @param filters - Filter options
   * @returns List of payment gateways
   */
  async getAll(filters?: {
    type?: PaymentGatewayType;
    enabled?: boolean;
    testMode?: boolean;
  }) {
    try {
      // Check if db.paymentGateway exists
      if (!db.paymentGateway) {
        console.error("❌ [PaymentGatewayService] db.paymentGateway is undefined!");
        console.error("❌ [PaymentGatewayService] db object:", db);
        console.error("❌ [PaymentGatewayService] Available db models:", Object.keys(db).filter(key => !key.startsWith('$')));
        throw {
          status: 500,
          type: "https://api.shop.am/problems/internal-error",
          title: "Database Model Not Available",
          detail: "PaymentGateway model is not available in Prisma Client. Please run 'npx prisma generate' to regenerate the client.",
        };
      }

      const where: any = {};

      if (filters?.type) {
        where.type = filters.type;
      }

      if (filters?.enabled !== undefined) {
        where.enabled = filters.enabled;
      }

      if (filters?.testMode !== undefined) {
        where.testMode = filters.testMode;
      }

      console.log("💳 [PaymentGatewayService] Querying payment gateways with filters:", where);

      const gateways = await db.paymentGateway.findMany({
        where,
        orderBy: [
          { position: "asc" },
          { createdAt: "desc" },
        ],
      });

      console.log(`✅ [PaymentGatewayService] Found ${gateways.length} payment gateways`);

      return {
        data: gateways.map((gateway) => ({
          ...gateway,
          config: this.sanitizeConfig(
            this.decryptConfig(
              gateway.config as PaymentGatewayConfig,
              gateway.type as PaymentGatewayType
            )
          ),
        })),
      };
    } catch (error: any) {
      console.error("❌ [PaymentGatewayService] Error in getAll:", {
        message: error.message,
        stack: error.stack,
        error,
      });
      
      // If it's already a formatted error, rethrow it
      if (error.status && error.type) {
        throw error;
      }
      
      // Otherwise, wrap it
      throw {
        status: 500,
        type: "https://api.shop.am/problems/internal-error",
        title: "Internal Server Error",
        detail: error.message || "Failed to retrieve payment gateways",
      };
    }
  }

  /**
   * Get payment gateway by ID
   * 
   * @param id - Gateway ID
   * @returns Payment gateway
   */
  async getById(id: string) {
    const gateway = await db.paymentGateway.findUnique({
      where: { id },
    });

    if (!gateway) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Payment Gateway Not Found",
        detail: `Payment gateway with ID ${id} not found`,
      };
    }

    return {
      ...gateway,
      config: this.sanitizeConfig(gateway.config as PaymentGatewayConfig),
    };
  }

  /**
   * Create payment gateway
   * 
   * @param data - Gateway data
   * @returns Created gateway
   */
  async create(data: {
    type: PaymentGatewayType;
    bankId?: string;
    name: string;
    enabled?: boolean;
    testMode?: boolean;
    config: PaymentGatewayConfig;
    position?: number;
  }) {
    // Validate config based on type
    this.validateGatewayConfig(data.type, data.config);

    // Check for duplicate (type + bankId)
    const existing = await db.paymentGateway.findFirst({
      where: {
        type: data.type,
        bankId: data.bankId || null,
      },
    });

    if (existing) {
      throw {
        status: 409,
        type: "https://api.shop.am/problems/conflict",
        title: "Payment Gateway Already Exists",
        detail: `Payment gateway with type ${data.type}${data.bankId ? ` and bankId ${data.bankId}` : ""} already exists`,
      };
    }

    // Encrypt sensitive config data
    const encryptedConfig = this.encryptConfig(data.config, data.type);

    const gateway = await db.paymentGateway.create({
      data: {
        type: data.type,
        bankId: data.bankId || null,
        name: data.name,
        enabled: data.enabled ?? false,
        testMode: data.testMode ?? true,
        config: encryptedConfig as any,
        position: data.position ?? 0,
      },
    });

    return {
      ...gateway,
      config: this.sanitizeConfig(gateway.config as PaymentGatewayConfig),
    };
  }

  /**
   * Update payment gateway
   * 
   * @param id - Gateway ID
   * @param data - Update data
   * @returns Updated gateway
   */
  async update(
    id: string,
    data: Partial<{
      name: string;
      enabled: boolean;
      testMode: boolean;
      config: PaymentGatewayConfig;
      position: number;
    }>
  ) {
    const gateway = await db.paymentGateway.findUnique({
      where: { id },
    });

    if (!gateway) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Payment Gateway Not Found",
        detail: `Payment gateway with ID ${id} not found`,
      };
    }

    // Validate config if provided
    if (data.config) {
      this.validateGatewayConfig(gateway.type as PaymentGatewayType, data.config);
    }

    // Encrypt sensitive config data if config is being updated
    const updateData: any = { ...data };
    if (data.config) {
      updateData.config = this.encryptConfig(
        data.config,
        gateway.type as PaymentGatewayType
      );
    }

    const updated = await db.paymentGateway.update({
      where: { id },
      data: updateData,
    });

    return {
      ...updated,
      config: this.sanitizeConfig(updated.config as PaymentGatewayConfig),
    };
  }

  /**
   * Delete payment gateway
   * 
   * @param id - Gateway ID
   */
  async delete(id: string) {
    const gateway = await db.paymentGateway.findUnique({
      where: { id },
    });

    if (!gateway) {
      throw {
        status: 404,
        type: "https://api.shop.am/problems/not-found",
        title: "Payment Gateway Not Found",
        detail: `Payment gateway with ID ${id} not found`,
      };
    }

    // Check if gateway is being used
    const paymentsCount = await db.payment.count({
      where: { paymentGatewayId: id },
    });

    if (paymentsCount > 0) {
      throw {
        status: 409,
        type: "https://api.shop.am/problems/conflict",
        title: "Payment Gateway In Use",
        detail: `Cannot delete payment gateway: ${paymentsCount} payment(s) are using this gateway`,
      };
    }

    await db.paymentGateway.delete({
      where: { id },
    });
  }

  /**
   * Validate gateway configuration
   * 
   * @param type - Gateway type
   * @param config - Configuration
   */
  private validateGatewayConfig(
    type: PaymentGatewayType,
    config: PaymentGatewayConfig
  ): void {
    switch (type) {
      case "idram":
        const idramConfig = config as IdramConfig;
        // Validation is done in service constructor
        break;

      case "ameriabank":
        const ameriabankConfig = config as AmeriabankConfig;
        if (!ameriabankConfig.clientID) {
          throw {
            status: 400,
            type: "https://api.shop.am/problems/validation-error",
            title: "Invalid Configuration",
            detail: "Ameriabank: clientID is required",
          };
        }
        break;

      case "inecobank":
        const inecobankConfig = config as InecobankConfig;
        if (!inecobankConfig.accounts) {
          throw {
            status: 400,
            type: "https://api.shop.am/problems/validation-error",
            title: "Invalid Configuration",
            detail: "Inecobank: accounts are required",
          };
        }
        break;

      case "arca":
        const arcaConfig = config as ArcaConfig;
        if (!arcaConfig.bankId) {
          throw {
            status: 400,
            type: "https://api.shop.am/problems/validation-error",
            title: "Invalid Configuration",
            detail: "ArCa: bankId is required",
          };
        }
        if (!arcaConfig.accounts) {
          throw {
            status: 400,
            type: "https://api.shop.am/problems/validation-error",
            title: "Invalid Configuration",
            detail: "ArCa: accounts are required",
          };
        }
        break;

      default:
        throw {
          status: 400,
          type: "https://api.shop.am/problems/validation-error",
          title: "Invalid Gateway Type",
          detail: `Unknown gateway type: ${type}`,
        };
    }
  }
}

// Export singleton instance
export const paymentGatewayService = new PaymentGatewayService();

