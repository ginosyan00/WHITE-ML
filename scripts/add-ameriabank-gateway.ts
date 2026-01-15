/**
 * Script to add Ameriabank payment gateway for testing
 * 
 * This script creates an enabled Ameriabank gateway with test configuration
 * so it appears in checkout page for testing
 * 
 * Usage: npx tsx scripts/add-ameriabank-gateway.ts
 */

import { paymentGatewayService } from "../apps/web/lib/services/payments/payment-gateway.service";
import { AmeriabankConfig } from "../apps/web/lib/types/payments";
import { db } from "../packages/db";
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function addAmeriabankGateway() {
  console.log("🏦 [AMERIABANK] Adding Ameriabank payment gateway...\n");

  try {
    // Test configuration for Ameriabank
    // NOTE: Replace these with your actual test credentials from Ameriabank
    const testConfig: AmeriabankConfig = {
      clientID: process.env.AMERIABANK_CLIENT_ID || "test-client-id",
      accounts: {
        AMD: {
          username: process.env.AMERIABANK_TEST_USERNAME || "test-username",
          password: process.env.AMERIABANK_TEST_PASSWORD || "test-password",
        },
      },
      minTestOrderId: 1000000,
      maxTestOrderId: 9999999,
      successUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/checkout/success`,
      failUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/checkout/fail`,
      resultUrl: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/v1/payments/webhooks/ameriabank`,
    };

    // Check if gateway already exists
    const existingGateways = await paymentGatewayService.getAll({
      type: "ameriabank",
    });

    if (existingGateways.data.length > 0) {
      const existing = existingGateways.data[0];
      console.log(`⚠️  [AMERIABANK] Gateway already exists with ID: ${existing.id}`);
      console.log(`   Current status: enabled=${existing.enabled}, testMode=${existing.testMode}`);
      
      // Update existing gateway to be enabled
      if (!existing.enabled) {
        console.log("   Enabling existing gateway...");
        const updated = await paymentGatewayService.update(existing.id, {
          enabled: true,
          testMode: true,
        });
        console.log(`✅ [AMERIABANK] Gateway enabled: ${updated.id}`);
      } else {
        console.log("✅ [AMERIABANK] Gateway is already enabled!");
      }
      return;
    }

    // Create new gateway
    console.log("   Creating new Ameriabank gateway...");
    const gateway = await paymentGatewayService.create({
      type: "ameriabank",
      name: "Ameriabank (Test)",
      enabled: true, // IMPORTANT: Enabled so it appears in checkout
      testMode: true,
      config: testConfig,
      position: 10, // Position in the list (lower = higher in checkout)
    });

    console.log(`✅ [AMERIABANK] Gateway created successfully!`);
    console.log(`   ID: ${gateway.id}`);
    console.log(`   Type: ${gateway.type}`);
    console.log(`   Name: ${gateway.name}`);
    console.log(`   Enabled: ${gateway.enabled}`);
    console.log(`   Test Mode: ${gateway.testMode}`);
    console.log(`   Position: ${gateway.position}`);
    console.log(`\n💡 [AMERIABANK] Gateway is now available in checkout page!`);
    console.log(`   You can update the configuration in Admin Panel -> Payment Gateways`);
    console.log(`\n⚠️  [AMERIABANK] IMPORTANT: Replace test credentials with real ones before production!`);
  } catch (error: any) {
    console.error("❌ [AMERIABANK] Error:", {
      message: error.message,
      detail: error.detail,
      status: error.status,
    });
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Run the script
addAmeriabankGateway()
  .then(() => {
    console.log("\n✅ [AMERIABANK] Script completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ [AMERIABANK] Script failed:", error);
    process.exit(1);
  });

