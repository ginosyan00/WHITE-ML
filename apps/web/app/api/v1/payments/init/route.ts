/**
 * Payment Initiation API
 * 
 * POST /api/v1/payments/init
 * Initiate payment for an order
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateToken } from "@/lib/middleware/auth";
import { paymentService } from "@/lib/services/payments/payment.service";
import { PaymentInitiationRequest } from "@/lib/types/payments";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/payments/init
 * Initiate payment for an order
 * 
 * Request body:
 * {
 *   orderId: string,
 *   gatewayId?: string,
 *   gatewayType?: PaymentGatewayType,
 *   bankId?: string,
 *   returnUrl?: string,
 *   cancelUrl?: string
 * }
 */
export async function POST(req: NextRequest) {
  try {
    console.log("💳 [PAYMENT INIT] POST request received");

    // Authenticate user (optional - guest checkout is allowed)
    const user = await authenticateToken(req).catch(() => null);

    const body = await req.json() as PaymentInitiationRequest;
    console.log("💳 [PAYMENT INIT] Request body:", {
      orderId: body.orderId,
      gatewayId: body.gatewayId,
      gatewayType: body.gatewayType,
      bankId: body.bankId,
    });

    // Validate required fields
    if (!body.orderId) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "orderId is required",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    // Check if user owns the order (if authenticated)
    if (user) {
      const { db } = await import("@white-shop/db");
      const order = await db.order.findUnique({
        where: { id: body.orderId },
      });

      if (order && order.userId !== user.id) {
        return NextResponse.json(
          {
            type: "https://api.shop.am/problems/forbidden",
            title: "Forbidden",
            status: 403,
            detail: "You don't have access to this order",
            instance: req.url,
          },
          { status: 403 }
        );
      }
    }

    // Initiate payment
    const result = await paymentService.initiatePayment({
      orderId: body.orderId,
      gatewayId: body.gatewayId,
      gatewayType: body.gatewayType,
      bankId: body.bankId,
      returnUrl: body.returnUrl,
      cancelUrl: body.cancelUrl,
    });

    if (!result.success) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/payment-error",
          title: "Payment Initiation Failed",
          status: 400,
          detail: result.errorMessage || "Failed to initiate payment",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    console.log(`✅ [PAYMENT INIT] Payment initiated: ${result.paymentId}`);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("❌ [PAYMENT INIT] Error:", {
      message: error.message,
      stack: error.stack,
      url: req.url,
    });

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





