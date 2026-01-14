/**
 * Admin Payment Gateways API
 * 
 * GET /api/v1/admin/payments - Get all payment gateways
 * POST /api/v1/admin/payments - Create new payment gateway
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateToken, requireAdmin } from "@/lib/middleware/auth";
import { paymentGatewayService } from "@/lib/services/payments/payment-gateway.service";
import { PaymentGatewayType } from "@/lib/types/payments";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/payments
 * Get all payment gateways
 * 
 * Query parameters:
 * - type: PaymentGatewayType (optional)
 * - enabled: boolean (optional)
 * - testMode: boolean (optional)
 */
export async function GET(req: NextRequest) {
  try {
    console.log("💳 [ADMIN PAYMENTS] GET request received:", { url: req.url });

    const user = await authenticateToken(req);
    if (!user || !requireAdmin(user)) {
      console.log("❌ [ADMIN PAYMENTS] Unauthorized or not admin");
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "Admin access required",
          instance: req.url,
        },
        { status: 403 }
      );
    }

    console.log(`✅ [ADMIN PAYMENTS] User authenticated: ${user.id}`);

    // Extract query parameters
    const searchParams = req.nextUrl.searchParams;
    const type = searchParams.get("type") as PaymentGatewayType | null;
    const enabled = searchParams.get("enabled");
    const testMode = searchParams.get("testMode");

    const filters: any = {};
    if (type) filters.type = type;
    if (enabled !== null) filters.enabled = enabled === "true";
    if (testMode !== null) filters.testMode = testMode === "true";

    const result = await paymentGatewayService.getAll(filters);
    console.log(`✅ [ADMIN PAYMENTS] Retrieved ${result.data.length} gateways`);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("❌ [ADMIN PAYMENTS] GET Error:", {
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

/**
 * POST /api/v1/admin/payments
 * Create new payment gateway
 * 
 * Request body:
 * {
 *   type: PaymentGatewayType,
 *   bankId?: string,
 *   name: string,
 *   enabled?: boolean,
 *   testMode?: boolean,
 *   config: PaymentGatewayConfig,
 *   position?: number
 * }
 */
export async function POST(req: NextRequest) {
  try {
    console.log("💳 [ADMIN PAYMENTS] POST request received");

    const user = await authenticateToken(req);
    if (!user || !requireAdmin(user)) {
      console.log("❌ [ADMIN PAYMENTS] Unauthorized or not admin");
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/forbidden",
          title: "Forbidden",
          status: 403,
          detail: "Admin access required",
          instance: req.url,
        },
        { status: 403 }
      );
    }

    console.log(`✅ [ADMIN PAYMENTS] User authenticated: ${user.id}`);

    const body = await req.json();
    console.log("💳 [ADMIN PAYMENTS] Request body:", {
      ...body,
      config: body.config ? "[CONFIG HIDDEN]" : undefined,
    });

    // Validate required fields
    if (!body.type || !body.name || !body.config) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "type, name, and config are required",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    const gateway = await paymentGatewayService.create({
      type: body.type,
      bankId: body.bankId,
      name: body.name,
      enabled: body.enabled ?? false,
      testMode: body.testMode ?? true,
      config: body.config,
      position: body.position ?? 0,
    });

    console.log(`✅ [ADMIN PAYMENTS] Gateway created: ${gateway.id}`);

    return NextResponse.json(gateway, { status: 201 });
  } catch (error: any) {
    console.error("❌ [ADMIN PAYMENTS] POST Error:", {
      message: error.message,
      stack: error.stack,
      type: error.type,
      status: error.status,
      detail: error.detail,
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

