/**
 * Admin Payment Gateway API (by ID)
 * 
 * GET /api/v1/admin/payments/[id] - Get payment gateway by ID
 * PUT /api/v1/admin/payments/[id] - Update payment gateway
 * DELETE /api/v1/admin/payments/[id] - Delete payment gateway
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateToken, requireAdmin } from "@/lib/middleware/auth";
import { paymentGatewayService } from "@/lib/services/payments/payment-gateway.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/admin/payments/[id]
 * Get payment gateway by ID
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log("💳 [ADMIN PAYMENTS] GET by ID request:", { id: params.id });

    const user = await authenticateToken(req);
    if (!user || !requireAdmin(user)) {
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

    const gateway = await paymentGatewayService.getById(params.id);
    console.log(`✅ [ADMIN PAYMENTS] Gateway retrieved: ${params.id}`);

    return NextResponse.json(gateway);
  } catch (error: any) {
    console.error("❌ [ADMIN PAYMENTS] GET by ID Error:", error);

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
 * PUT /api/v1/admin/payments/[id]
 * Update payment gateway
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log("💳 [ADMIN PAYMENTS] PUT request:", { id: params.id });

    const user = await authenticateToken(req);
    if (!user || !requireAdmin(user)) {
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

    const body = await req.json();
    console.log("💳 [ADMIN PAYMENTS] Update body:", {
      ...body,
      config: body.config ? "[CONFIG HIDDEN]" : undefined,
    });

    const gateway = await paymentGatewayService.update(params.id, body);
    console.log(`✅ [ADMIN PAYMENTS] Gateway updated: ${params.id}`);

    return NextResponse.json(gateway);
  } catch (error: any) {
    console.error("❌ [ADMIN PAYMENTS] PUT Error:", error);

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
 * DELETE /api/v1/admin/payments/[id]
 * Delete payment gateway
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    console.log("💳 [ADMIN PAYMENTS] DELETE request:", { id: params.id });

    const user = await authenticateToken(req);
    if (!user || !requireAdmin(user)) {
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

    await paymentGatewayService.delete(params.id);
    console.log(`✅ [ADMIN PAYMENTS] Gateway deleted: ${params.id}`);

    return NextResponse.json(
      { message: "Payment gateway deleted successfully" },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("❌ [ADMIN PAYMENTS] DELETE Error:", error);

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





