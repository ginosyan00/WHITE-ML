/**
 * Public Payment Gateways API
 * 
 * GET /api/v1/payments/gateways - Get all enabled payment gateways (public, no auth required)
 * 
 * Returns only enabled payment gateways for use in checkout page
 */

import { NextRequest, NextResponse } from "next/server";
import { paymentGatewayService } from "@/lib/services/payments/payment-gateway.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/payments/gateways
 * Get all enabled payment gateways (public endpoint)
 * 
 * Query parameters:
 * - testMode: boolean (optional) - filter by test mode
 * 
 * Returns only enabled gateways, sorted by position
 */
export async function GET(req: NextRequest) {
  try {
    console.log("💳 [PUBLIC PAYMENTS] GET request received:", { url: req.url });

    // Extract query parameters
    const searchParams = req.nextUrl.searchParams;
    const testMode = searchParams.get("testMode");

    // Build filters - only get enabled gateways
    const filters: any = {
      enabled: true, // Only return enabled gateways
    };

    if (testMode !== null) {
      filters.testMode = testMode === "true";
    }

    console.log("💳 [PUBLIC PAYMENTS] Fetching enabled gateways with filters:", filters);

    const result = await paymentGatewayService.getAll(filters);
    
    console.log(`✅ [PUBLIC PAYMENTS] Retrieved ${result.data.length} enabled gateways`);

    // Return only necessary fields for checkout (no sensitive config data)
    const gateways = result.data.map((gateway) => ({
      id: gateway.id,
      type: gateway.type,
      bankId: gateway.bankId,
      name: gateway.name,
      testMode: gateway.testMode,
      position: gateway.position,
    }));

    return NextResponse.json({ data: gateways });
  } catch (error: any) {
    console.error("❌ [PUBLIC PAYMENTS] GET Error:", {
      message: error.message,
      stack: error.stack,
      type: error.type,
      status: error.status,
      detail: error.detail,
      url: req.url,
    });

    return NextResponse.json(
      {
        type: error.type || "https://api.shop.am/problems/internal-error",
        title: error.title || "Internal Server Error",
        status: error.status || 500,
        detail: error.detail || error.message || "An error occurred",
        instance: req.url,
      },
      { status: error.status || 500 }
    );
  }
}
