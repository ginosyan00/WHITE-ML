/**
 * Payment Reverse API
 * 
 * POST /api/v1/payments/reverse
 * Reverse (cancel) a payment transaction before deposit
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateToken, requireAdmin } from "@/lib/middleware/auth";
import { paymentService } from "@/lib/services/payments/payment.service";
import { db } from "@white-shop/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/payments/reverse
 * Reverse (cancel) a payment transaction before deposit
 * 
 * Request body:
 * {
 *   paymentId: string,
 * }
 */
export async function POST(req: NextRequest) {
  try {
    console.log("💳 [PAYMENT REVERSE] POST request received");

    // Authenticate user and require admin
    const user = await authenticateToken(req);
    if (!user || !requireAdmin(user)) {
      console.log("❌ [PAYMENT REVERSE] Unauthorized or not admin");
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

    console.log(`✅ [PAYMENT REVERSE] User authenticated: ${user.id}`);

    const body = await req.json();
    console.log("💳 [PAYMENT REVERSE] Request body:", {
      paymentId: body.paymentId,
    });

    // Validate required fields
    if (!body.paymentId) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "paymentId is required",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    // Get payment from database
    const payment = await db.payment.findUnique({
      where: { id: body.paymentId },
      include: {
        paymentGateway: true,
        order: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/not-found",
          title: "Not Found",
          status: 404,
          detail: "Payment not found",
          instance: req.url,
        },
        { status: 404 }
      );
    }

    // Check if payment can be reversed (only pending or approved payments can be reversed)
    if (payment.status === "completed" || payment.status === "refunded") {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/payment-error",
          title: "Invalid Payment Status",
          status: 400,
          detail: `Cannot reverse payment with status: ${payment.status}. Only pending or approved payments can be reversed.`,
          instance: req.url,
        },
        { status: 400 }
      );
    }

    // Check if payment gateway is ArCa (only ArCa supports reverse for now)
    if (!payment.paymentGateway || payment.paymentGateway.type !== "arca") {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/payment-error",
          title: "Unsupported Gateway",
          status: 400,
          detail: "Reverse is only supported for ArCa payments",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    // Get gateway service
    const gatewayService = await paymentService.getGatewayById(payment.paymentGateway.id);

    // Check if gateway service has reverse method
    if (typeof (gatewayService as any).reverse !== "function") {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/payment-error",
          title: "Unsupported Operation",
          status: 400,
          detail: "Reverse is not supported for this payment gateway",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    // Get provider transaction ID
    if (!payment.providerTransactionId) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/payment-error",
          title: "Invalid Payment",
          status: 400,
          detail: "Payment does not have a provider transaction ID",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    // Process reverse
    console.log(`💳 [PAYMENT REVERSE] Processing reversal via ArCa API`);
    const reverseResponse = await (gatewayService as any).reverse(
      payment.providerTransactionId
    );

    if (!reverseResponse.success) {
      console.error(`❌ [PAYMENT REVERSE] Reversal failed:`, {
        errorCode: reverseResponse.errorCode,
        errorMessage: reverseResponse.errorMessage,
      });

      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/payment-error",
          title: "Reversal Failed",
          status: 400,
          detail: reverseResponse.errorMessage || "Failed to process reversal",
          errorCode: reverseResponse.errorCode,
          instance: req.url,
        },
        { status: 400 }
      );
    }

    // Update payment status
    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: "cancelled",
        providerResponse: {
          ...(payment.providerResponse as any || {}),
          reversed: true,
          reversalTimestamp: new Date().toISOString(),
          reversalId: reverseResponse.transactionId || reverseResponse.paymentId,
        },
      },
    });

    // Update order payment status
    await db.order.update({
      where: { id: payment.orderId },
      data: {
        paymentStatus: "cancelled",
      },
    });

    console.log(`✅ [PAYMENT REVERSE] Reversal processed successfully: ${payment.id}`);

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      reversalId: reverseResponse.transactionId || reverseResponse.paymentId,
    });
  } catch (error: any) {
    console.error("❌ [PAYMENT REVERSE] Error:", {
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






