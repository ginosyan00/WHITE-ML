/**
 * Payment Fail Callback
 * 
 * GET /api/v1/payments/callback/fail
 * Handle failed payment redirect
 */

import { NextRequest, NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { db } from "@white-shop/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/payments/callback/fail
 * Handle failed payment redirect
 * 
 * Query parameters:
 * - orderId: string (optional)
 * - paymentId: string (optional)
 * - error: string (optional)
 */
export async function GET(req: NextRequest) {
  try {
    console.log("💳 [PAYMENT CALLBACK FAIL] GET request received");

    const searchParams = req.nextUrl.searchParams;
    const orderId = searchParams.get("orderId");
    const paymentId = searchParams.get("paymentId");
    const error = searchParams.get("error");

    console.log("💳 [PAYMENT CALLBACK FAIL] Parameters:", {
      orderId,
      paymentId,
      error,
    });

    // If paymentId is provided, update payment status
    if (paymentId) {
      const payment = await db.payment.findUnique({
        where: { id: paymentId },
        include: {
          order: true,
        },
      });

      if (payment && payment.status !== "failed") {
        await db.payment.update({
          where: { id: paymentId },
          data: {
            status: "failed",
            failedAt: new Date(),
            errorMessage: error || "Payment failed",
          },
        });

        // Update order payment status
        await db.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: "failed",
          },
        });

        // Redirect to order page
        const orderNumber = payment.order.number;
        redirect(`/orders/${orderNumber}?payment=failed&error=${encodeURIComponent(error || "Payment failed")}`);
      }
    }

    // If orderId is provided, redirect to order page
    if (orderId) {
      const order = await db.order.findUnique({
        where: { id: orderId },
      });

      if (order) {
        redirect(`/orders/${order.number}?payment=failed&error=${encodeURIComponent(error || "Payment failed")}`);
      }
    }

    // Default redirect to checkout page with error
    redirect(`/checkout?error=${encodeURIComponent(error || "Payment failed")}`);
  } catch (error: any) {
    console.error("❌ [PAYMENT CALLBACK FAIL] Error:", error);
    // Redirect to checkout page with error
    redirect(`/checkout?error=${encodeURIComponent(error.message || "An error occurred")}`);
  }
}

