/**
 * Public Payment Gateways API
 * 
 * GET /api/v1/payments/gateways
 * Get enabled payment gateways for checkout
 */

import { NextRequest, NextResponse } from "next/server";
import { paymentGatewayService } from "@/lib/services/payments/payment-gateway.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/payments/gateways
 * Get enabled payment gateways
 * 
 * Returns only enabled gateways for public use in checkout
 */
export async function GET(req: NextRequest) {
  try {
    console.log("💳 [PUBLIC GATEWAYS] GET request received");

    const result = await paymentGatewayService.getAll({
      enabled: true,
    });

    // Filter and format for public use (no sensitive data)
    const publicGateways = result.data.map((gateway) => ({
      id: gateway.id,
      type: gateway.type,
      bankId: gateway.bankId,
      name: gateway.name,
      testMode: gateway.testMode,
      position: gateway.position,
    }));

    console.log(`✅ [PUBLIC GATEWAYS] Returning ${publicGateways.length} enabled gateways`);

    return NextResponse.json({ data: publicGateways });
  } catch (error: any) {
    console.error("❌ [PUBLIC GATEWAYS] Error:", error);

    return NextResponse.json(
      {
        type: "https://api.shop.am/problems/internal-error",
        title: "Internal Server Error",
        status: 500,
        detail: error.message || "An error occurred",
        instance: req.url,
      },
      { status: 500 }
    );
  }
}

