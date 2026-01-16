/**
 * Payment Refund API
 * 
 * POST /api/v1/payments/refund
 * Process refund for a payment
 */

import { NextRequest, NextResponse } from "next/server";
import { authenticateToken, requireAdmin } from "@/lib/middleware/auth";
import { paymentService } from "@/lib/services/payments/payment.service";
import { db } from "@white-shop/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/v1/payments/refund
 * Process refund for a payment
 * 
 * Request body:
 * {
 *   paymentId: string,
 *   amount?: number, // Optional - if not provided, full refund
 *   currency?: string, // Optional - defaults to payment currency
 * }
 */
export async function POST(req: NextRequest) {
  try {
    console.log("💳 [PAYMENT REFUND] POST request received");

    // Authenticate user and require admin
    const user = await authenticateToken(req);
    if (!user || !requireAdmin(user)) {
      console.log("❌ [PAYMENT REFUND] Unauthorized or not admin");
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

    console.log(`✅ [PAYMENT REFUND] User authenticated: ${user.id}`);

    const body = await req.json();
    console.log("💳 [PAYMENT REFUND] Request body:", {
      paymentId: body.paymentId,
      amount: body.amount,
      currency: body.currency,
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

    // Check if payment is completed (can only refund completed payments)
    if (payment.status !== "completed") {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/payment-error",
          title: "Invalid Payment Status",
          status: 400,
          detail: `Cannot refund payment with status: ${payment.status}. Only completed payments can be refunded.`,
          instance: req.url,
        },
        { status: 400 }
      );
    }

    // Check if payment gateway is ArCa (only ArCa supports refund for now)
    if (!payment.paymentGateway || payment.paymentGateway.type !== "arca") {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/payment-error",
          title: "Unsupported Gateway",
          status: 400,
          detail: "Refund is only supported for ArCa payments",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    // Determine refund amount
    const refundAmount = body.amount || payment.amount;
    const refundCurrency = body.currency || payment.currency || "AMD";

    // Validate refund amount
    if (refundAmount <= 0) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: "Refund amount must be greater than 0",
          instance: req.url,
        },
        { status: 400 }
      );
    }

    if (refundAmount > payment.amount) {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/validation-error",
          title: "Validation Error",
          status: 400,
          detail: `Refund amount (${refundAmount}) cannot exceed payment amount (${payment.amount})`,
          instance: req.url,
        },
        { status: 400 }
      );
    }

    // Get gateway service
    const gatewayService = await paymentService.getGatewayById(payment.paymentGateway.id);

    // Check if gateway service has refund method
    if (typeof (gatewayService as any).refund !== "function") {
      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/payment-error",
          title: "Unsupported Operation",
          status: 400,
          detail: "Refund is not supported for this payment gateway",
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

    // Process refund
    console.log(`💳 [PAYMENT REFUND] Processing refund via ArCa API`);
    const refundResponse = await (gatewayService as any).refund(
      payment.providerTransactionId,
      refundAmount,
      refundCurrency
    );

    if (!refundResponse.success) {
      console.error(`❌ [PAYMENT REFUND] Refund failed:`, {
        errorCode: refundResponse.errorCode,
        errorMessage: refundResponse.errorMessage,
      });

      return NextResponse.json(
        {
          type: "https://api.shop.am/problems/payment-error",
          title: "Refund Failed",
          status: 400,
          detail: refundResponse.errorMessage || "Failed to process refund",
          errorCode: refundResponse.errorCode,
          instance: req.url,
        },
        { status: 400 }
      );
    }

    // Update payment status
    const isFullRefund = refundAmount >= payment.amount;
    const newStatus = isFullRefund ? "refunded" : payment.status; // Keep status as "completed" for partial refunds

    await db.payment.update({
      where: { id: payment.id },
      data: {
        status: newStatus,
        // Store refund information in providerResponse
        providerResponse: {
          ...(payment.providerResponse as any || {}),
          refunds: [
            ...((payment.providerResponse as any)?.refunds || []),
            {
              amount: refundAmount,
              currency: refundCurrency,
              timestamp: new Date().toISOString(),
              refundId: refundResponse.transactionId || refundResponse.paymentId,
            },
          ],
        },
      },
    });

    // Update order payment status if full refund
    if (isFullRefund) {
      await db.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: "refunded",
        },
      });
    }

    console.log(`✅ [PAYMENT REFUND] Refund processed successfully: ${payment.id}`);

    return NextResponse.json({
      success: true,
      paymentId: payment.id,
      refundAmount,
      refundCurrency,
      isFullRefund,
      newStatus,
      refundId: refundResponse.transactionId || refundResponse.paymentId,
    });
  } catch (error: any) {
    console.error("❌ [PAYMENT REFUND] Error:", {
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






